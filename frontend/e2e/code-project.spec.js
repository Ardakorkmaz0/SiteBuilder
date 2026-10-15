// The actual /code UI with browser-facing File System Access handles. Only the
// operating-system picker and disk are faked; the editor, store, permissions,
// iframe document, file switching and save controls all run in Chromium.
import { test, expect } from './support.js'

const HOME = '<!DOCTYPE html><html><head><link rel="stylesheet" href="styles.css"></head><body><h1 id="hero">Local home</h1></body></html>'

async function installDisk(page, projects = [{ name: 'local-site', files: { 'index.html': HOME, 'styles.css': 'h1 { color: red; }' } }]) {
  await page.addInitScript((seeds) => {
    const disk = { projects: {}, picks: [], writes: [], permissions: {}, readErrors: {}, held: false, releases: [] }
    function directory(project, name, prefix = '') {
      const entries = new Map()
      const handle = {
        name, kind: 'directory',
        queryPermission: async () => disk.permissions[project] || 'granted',
        requestPermission: async () => disk.permissions[project] || 'granted',
        async *values() { yield* entries.values() },
        async getDirectoryHandle(child, options) {
          if (!entries.has(child) && options?.create) entries.set(child, directory(project, child, `${prefix}${child}/`))
          const result = entries.get(child)
          if (result?.kind !== 'directory') throw new DOMException('Missing directory', 'NotFoundError')
          return result
        },
        async getFileHandle(child, options) {
          const path = prefix + child
          if (!entries.has(child) && options?.create) {
            disk.projects[project].files[path] = ''
            entries.set(child, file(project, child, path))
          }
          const result = entries.get(child)
          if (result?.kind !== 'file') throw new DOMException('Missing file', 'NotFoundError')
          return result
        },
      }
      handle.add = (child, entry) => entries.set(child, entry)
      handle.child = (child) => entries.get(child)
      return handle
    }
    function file(project, name, path) {
      return {
        name, kind: 'file',
        queryPermission: async () => disk.permissions[project] || 'granted',
        requestPermission: async () => disk.permissions[project] || 'granted',
        async getFile() {
          if (disk.readErrors[`${project}/${path}`]) throw new DOMException('File can no longer be read', 'NotReadableError')
          return new File([disk.projects[project].files[path]], name, { type: path.endsWith('.css') ? 'text/css' : 'text/html' })
        },
        async createWritable() {
          let pending
          return {
            async write(content) { pending = typeof content === 'string' ? content : await content.text() },
            async close() {
              if (disk.held) await new Promise((resolve) => disk.releases.push(resolve))
              disk.projects[project].files[path] = pending
              disk.writes.push({ project, path, content: pending })
            },
            async abort() {},
          }
        },
      }
    }
    for (const [index, seed] of seeds.entries()) {
      const id = String(index)
      const root = directory(id, seed.name)
      disk.projects[id] = { files: { ...seed.files }, root }
      for (const path of Object.keys(seed.files)) {
        const parts = path.split('/')
        let dir = root
        for (let i = 0; i < parts.length - 1; i += 1) {
          let child = dir.child(parts[i])
          if (!child) {
            child = directory(id, parts[i], `${parts.slice(0, i + 1).join('/')}/`)
            dir.add(parts[i], child)
          }
          dir = child
        }
        dir.add(parts.at(-1), file(id, parts.at(-1), path))
      }
      disk.picks.push(id)
    }
    disk.release = () => { disk.held = false; disk.releases.splice(0).forEach((resolve) => resolve()) }
    window.__testDisk = disk
    window.showDirectoryPicker = async () => {
      const id = disk.picks.shift()
      if (id === undefined) throw new DOMException('Canceled', 'AbortError')
      return disk.projects[id].root
    }
  }, projects)
}

async function openLocal(page, projects) {
  await installDisk(page, projects)
  await page.goto('/code')
  await page.getByRole('button', { name: 'Open folder…', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeVisible()
}

const source = (page) => page.locator('main textarea')
const openSource = async (page) => {
  await page.getByRole('button', { name: 'Source', exact: true }).click()
  await expect(source(page)).toBeVisible()
}
const treeFile = (page, path) => page.locator(`button[title="${path}"]`).last()
const diskText = (page, project, path) => page.evaluate(([id, filePath]) => window.__testDisk.projects[id].files[filePath], [String(project), path])

test('local source drafts survive switching files and both header save controls', async ({ page }) => {
  await openLocal(page)
  await openSource(page)
  const edited = HOME.replace('Local home', 'Unsaved source draft')
  await source(page).fill(edited)
  await expect(page.locator('header')).toContainText('1 unsaved file')
  await expect(page.getByRole('button', { name: 'Save file', exact: true })).toBeEnabled()

  await treeFile(page, 'styles.css').click()
  await page.locator('textarea').fill('h1 { color: blue; }')
  await treeFile(page, 'index.html').click()
  await expect(source(page)).toHaveValue(edited)
  await page.getByRole('button', { name: 'Save file', exact: true }).click()
  await expect.poll(() => diskText(page, 0, 'index.html')).toBe(edited)
  expect(await diskText(page, 0, 'styles.css')).toBe('h1 { color: red; }')

  const later = edited.replace('Unsaved source draft', 'Saved together')
  await source(page).fill(later)
  await page.getByRole('button', { name: 'Save to folder', exact: true }).click()
  await expect.poll(() => diskText(page, 0, 'index.html')).toBe(later)
  expect(await diskText(page, 0, 'styles.css')).toBe('h1 { color: blue; }')
  await expect(page.locator('header')).not.toContainText('unsaved file')
})

test('declining to close keeps a source-only draft, and a copy includes it', async ({ page }) => {
  await openLocal(page, [
    { name: 'local-site', files: { 'index.html': HOME, 'styles.css': 'h1 { color: red; }' } },
    { name: 'copied-site', files: {} },
  ])
  await openSource(page)
  const edited = HOME.replace('Local home', 'Copy this source draft')
  await source(page).fill(edited)
  expect(await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    return event.defaultPrevented
  })).toBe(true)
  page.removeAllListeners('dialog')
  const messages = []
  page.on('dialog', async (dialog) => { messages.push(dialog.message()); await dialog.dismiss() })
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  expect(messages).toEqual(['Discard the unsaved changes in this local project?'])
  await expect(source(page)).toHaveValue(edited)
  await page.getByRole('button', { name: 'Save a copy…', exact: true }).click()
  await expect.poll(() => diskText(page, 1, 'index.html')).toBe(edited)
  expect(await diskText(page, 0, 'index.html')).toBe(HOME)
  await expect(page.locator('header')).toContainText('1 unsaved file')
})

test('a new folder with the same HTML path opens its own source and selection', async ({ page }) => {
  const other = HOME.replace('Local home', 'Second folder home')
  await openLocal(page, [
    { name: 'same-name', files: { 'index.html': HOME } },
    { name: 'same-name', files: { 'index.html': other } },
  ])
  await openSource(page)
  await source(page).fill(HOME.replace('Local home', 'Discarded first folder draft'))
  await page.getByRole('button', { name: 'Open folder…', exact: true }).click()
  await expect(source(page)).toHaveValue(other)
  await expect(page.locator('header')).not.toContainText('unsaved file')
})

test('denied disk permission preserves the source draft for a successful retry', async ({ page }) => {
  await openLocal(page)
  await openSource(page)
  const edited = HOME.replace('Local home', 'Keep on failed save')
  await source(page).fill(edited)
  await page.evaluate(() => { window.__testDisk.permissions['0'] = 'denied' })
  await page.getByRole('button', { name: 'Save file', exact: true }).click()
  await expect(page.getByText('Write permission for the folder was declined.', { exact: true })).toBeVisible()
  expect(await diskText(page, 0, 'index.html')).toBe(HOME)
  await expect(source(page)).toHaveValue(edited)
  await expect(page.locator('header')).toContainText('1 unsaved file')
  await page.evaluate(() => { window.__testDisk.permissions['0'] = 'granted' })
  await page.getByRole('button', { name: 'Save file', exact: true }).click()
  await expect.poll(() => diskText(page, 0, 'index.html')).toBe(edited)
  await expect(page.getByText('Write permission for the folder was declined.', { exact: true })).toHaveCount(0)
})

test('typing and changing the preview device keeps the live HTML document', async ({ page }) => {
  await openLocal(page)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const hero = page.frameLocator('iframe[title="site"]').locator('#hero')
  await expect(hero).toBeVisible()
  await hero.click()
  await page.keyboard.press('End')
  await page.keyboard.type(' typed in place')
  await page.getByRole('button', { name: 'Mobile', exact: true }).click()
  await expect(page.locator('[data-builder-phone-frame]')).toBeVisible()
  await expect(hero).toHaveText('Local home typed in place')
  await page.getByRole('button', { name: 'Save file', exact: true }).click()
  await expect.poll(() => diskText(page, 0, 'index.html')).toContain('Local home typed in place')
})

test('a slow save and a file switch keep text typed after the write started dirty', async ({ page }) => {
  await openLocal(page)
  await treeFile(page, 'styles.css').click()
  await page.locator('textarea').fill('h1 { color: blue; }')
  await page.evaluate(() => { window.__testDisk.held = true })
  await page.getByRole('button', { name: 'Save file', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__testDisk.releases.length)).toBe(1)
  await page.locator('textarea').fill('h1 { color: green; }')
  await treeFile(page, 'index.html').click()
  await page.evaluate(() => window.__testDisk.release())
  await expect.poll(() => diskText(page, 0, 'styles.css')).toBe('h1 { color: blue; }')
  await expect(page.locator('header')).toContainText('1 unsaved file')
  await treeFile(page, 'styles.css').click()
  await expect(page.locator('textarea')).toHaveValue('h1 { color: green; }')
  await page.getByRole('button', { name: 'Save file', exact: true }).click()
  await expect.poll(() => diskText(page, 0, 'styles.css')).toBe('h1 { color: green; }')
})

test('an unreadable new folder reports the file and keeps the existing draft', async ({ page }) => {
  await openLocal(page, [
    { name: 'local-site', files: { 'index.html': HOME } },
    { name: 'unreadable-site', files: { 'index.html': '<h1>Do not replace with empty text</h1>' } },
  ])
  await openSource(page)
  const edited = HOME.replace('Local home', 'Keep this draft if opening fails')
  await source(page).fill(edited)
  await page.evaluate(() => { window.__testDisk.readErrors['1/index.html'] = true })
  await page.getByRole('button', { name: 'Open folder…', exact: true }).click()
  await expect(page.getByText('Could not read index.html: File can no longer be read', { exact: true })).toBeVisible()
  await expect(source(page)).toHaveValue(edited)
  await expect(page.locator('header')).toContainText('local-site')
  await page.getByRole('button', { name: 'Save file', exact: true }).click()
  await expect.poll(() => diskText(page, 0, 'index.html')).toBe(edited)
})

test('a completed old-folder save cannot change the new folder with the same paths', async ({ page }) => {
  const second = HOME.replace('Local home', 'New folder home')
  await openLocal(page, [
    { name: 'first-site', files: { 'index.html': HOME } },
    { name: 'second-site', files: { 'index.html': second } },
  ])
  await openSource(page)
  const firstEdit = HOME.replace('Local home', 'First folder write')
  await source(page).fill(firstEdit)
  await page.evaluate(() => { window.__testDisk.held = true })
  await page.getByRole('button', { name: 'Save file', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__testDisk.releases.length)).toBe(1)
  await page.getByRole('button', { name: 'Open folder…', exact: true }).click()
  await expect(source(page)).toHaveValue(second)
  const secondEdit = second.replace('New folder home', 'New folder unsaved draft')
  await source(page).fill(secondEdit)
  await page.evaluate(() => window.__testDisk.release())
  await expect.poll(() => diskText(page, 0, 'index.html')).toBe(firstEdit)
  await expect(source(page)).toHaveValue(secondEdit)
  await expect(page.locator('header')).toContainText('1 unsaved file')
  await page.getByRole('button', { name: 'Save file', exact: true }).click()
  await expect.poll(() => diskText(page, 1, 'index.html')).toBe(secondEdit)
  await expect(page.locator('header')).not.toContainText('unsaved file')
})
