import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { test, expect, api, openEditor, save } from './support.js'

const run = promisify(execFile)
const ABOUT = '<!doctype html><html><head><title>Portable About</title></head><body><h1>Yedek 🌍</h1></body></html>'
const more = async (page, action) => {
  await page.getByRole('button', { name: 'More actions', exact: true }).click()
  await page.getByRole('button', { name: action, exact: true }).click()
}

async function seed(request, pages) {
  const created = await api(request, 'POST', '/sites/', { title: 'Round eight portability' })
  expect(created.status).toBe(201)
  const id = created.data.id
  try {
    const loaded = await api(request, 'GET', `/sites/${id}/`)
    expect(loaded.status).toBe(200)
    const schema = loaded.data.schema
    const result = await api(request, 'PATCH', `/sites/${id}/`, {
      schema: { ...schema, pages: pages.map((page) => ({ ...schema.pages[0], ...page })) },
    })
    expect(result.status).toBe(200)
    return id
  } catch (error) {
    await api(request, 'DELETE', `/sites/${id}/`)
    throw error
  }
}

async function readArchive(filename) {
  // An independent standard-library reader checks CRCs and offsets, rather
  // than sharing the application's ZIP writer or a copy of its algorithm.
  const script = `import json, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as archive:
    assert archive.testzip() is None
    print(json.dumps({
        'names': archive.namelist(),
        'schema': json.loads(archive.read('schema.json')),
        'html': {name: archive.read(name).decode('utf-8') for name in archive.namelist() if name.endswith('.html')},
    }))`
  const { stdout } = await run(process.env.E2E_PYTHON || 'python', ['-c', script, filename], { maxBuffer: 4 * 1024 * 1024 })
  return JSON.parse(stdout)
}

test('a real ZIP contains importable HTML-page backups alongside the canvas design', async ({ page, request }) => {
  const siteId = await seed(request, [
    { id: 'canvas_home', name: 'Home', mode: 'empty', components: [{
      id: 'portable_heading', type: 'heading', props: { text: 'Portable canvas' }, styles: {},
      layout: { x: 20, y: 20, w: 400, h: 70 },
    }] },
    { id: 'about_page', name: 'About', mode: 'html', html: ABOUT, components: [] },
  ])
  try {
    await openEditor(page, siteId)
    await page.getByRole('button', { name: 'Source', exact: true }).click()
    await page.getByRole('button', { name: 'Export', exact: true }).click()
    const downloading = page.waitForEvent('download')
    await page.getByRole('menuitem', { name: /Editable code project/ }).click()
    const downloaded = await downloading
    expect(downloaded.suggestedFilename()).toBe('home-project.zip')
    const archive = await readArchive(await downloaded.path())
    expect(archive.names).toEqual(['index.html', 'about.html', 'styles.css', 'custom.css', 'runtime.js', 'custom.js', 'schema.json'])
    expect(archive.html['about.html']).toBe(ABOUT)
    expect(archive.html['index.html']).toContain('Portable canvas')
    expect(archive.schema.pages[1].html).toBe(ABOUT)
    expect(archive.schema.pages[0].html).toBe('')
    expect(archive.schema.pages[0].components[0].props.text).toBe('Portable canvas')

    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    const choosing = page.waitForEvent('filechooser')
    await more(page, 'Project JSON...')
    await (await choosing).setFiles({ name: 'schema.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(archive.schema)) })
    await page.getByRole('button', { name: 'about.html', exact: true }).click()
    await expect(page.frameLocator('main iframe[title="site"]').getByRole('heading', { name: 'Yedek 🌍', exact: true })).toBeVisible()
    await save(page)
    const stored = await api(request, 'GET', `/sites/${siteId}/`)
    expect(stored.status).toBe(200)
    expect(stored.data.schema.pages[1].html).toContain('Yedek 🌍')
    expect(stored.data.schema.pages[0].components[0].props.text).toBe('Portable canvas')
  } finally {
    expect((await api(request, 'DELETE', `/sites/${siteId}/`)).status).toBe(204)
  }
})

test('a folder import resolves its base URL, CSS, script and SVG view in the browser', async ({ page, request }) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sitebuilder-round8-'))
  let siteId
  try {
    await fs.mkdir(path.join(directory, 'assets'))
    await fs.writeFile(path.join(directory, 'index.html'), '<!doctype html><html><head><base href="assets/"><link rel="stylesheet" href="theme.css"></head><body><h1 id="marker">Folder starting</h1><img alt="Local emblem" src="emblem.svg#round-view"><script src="logic.js"></script></body></html>')
    await fs.writeFile(path.join(directory, 'assets', 'theme.css'), '#marker { color: rgb(22, 150, 100); }')
    await fs.writeFile(path.join(directory, 'assets', 'logic.js'), 'document.getElementById("marker").textContent = "Imported folder 🌍 ready";')
    await fs.writeFile(path.join(directory, 'assets', 'emblem.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><view id="round-view" viewBox="0 0 10 10"/><rect width="20" height="20" fill="green"/></svg>')
    siteId = await seed(request, [{ id: 'folder_home', name: 'Home', mode: 'empty', components: [] }])
    await openEditor(page, siteId)
    const choosing = page.waitForEvent('filechooser')
    await more(page, 'Project folder...')
    await (await choosing).setFiles(directory)
    await page.getByRole('button', { name: 'View', exact: true }).click()
    const frame = page.frameLocator('main iframe[title="site"]')
    const heading = frame.getByRole('heading', { name: 'Imported folder 🌍 ready', exact: true })
    await expect(heading).toBeVisible()
    await expect(heading).toHaveCSS('color', 'rgb(22, 150, 100)')
    const emblem = frame.getByRole('img', { name: 'Local emblem', exact: true })
    await expect(emblem).toHaveAttribute('src', /^data:image\/svg\+xml;base64,[^#]+#round-view$/)
    await expect.poll(() => emblem.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0)
    await save(page)
    const stored = await api(request, 'GET', `/sites/${siteId}/`)
    expect(stored.status).toBe(200)
    expect(stored.data.schema.pages[0].html).toContain('data-inlined-from="theme.css"')
    expect(stored.data.schema.pages[0].html).toContain('#round-view')
    await page.reload()
    await page.getByRole('button', { name: 'View', exact: true }).click()
    await expect(heading).toBeVisible()
    await expect(heading).toHaveCSS('color', 'rgb(22, 150, 100)')
  } finally {
    try {
      if (siteId) expect((await api(request, 'DELETE', `/sites/${siteId}/`)).status).toBe(204)
    } finally {
      await fs.rm(directory, { recursive: true, force: true })
    }
  }
})

test('invalid JSON preserves the document and plain HTML export downloads it', async ({ page, request }) => {
  await page.addInitScript(() => {
    if (window.top !== window) return
    // Exercise the documented download fallback without an OS Save As dialog.
    Object.defineProperty(window, 'showOpenFilePicker', { configurable: true, value: undefined })
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: undefined })
  })
  const siteId = await seed(request, [{ id: 'html_home', name: 'Home', mode: 'html', html: ABOUT, components: [] }])
  try {
    await openEditor(page, siteId)
    const before = await api(request, 'GET', `/sites/${siteId}/`)
    for (const [content, message] of [['{"pages":', 'Import failed:'], ['{"pages":[]}', 'Could not import: no usable design found in those files.']]) {
      const choosing = page.waitForEvent('filechooser')
      await more(page, 'Project JSON...')
      await (await choosing).setFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(content) })
      await expect(page.getByRole('alert')).toContainText(message)
      await expect(page.frameLocator('main iframe[title="site"]').getByRole('heading', { name: 'Yedek 🌍', exact: true })).toBeVisible()
    }
    const downloading = page.waitForEvent('download')
    await more(page, 'Export HTML…')
    const downloaded = await downloading
    expect(downloaded.suggestedFilename()).toMatch(/\.html$/)
    expect(await fs.readFile(await downloaded.path(), 'utf8')).toContain('Yedek 🌍')
    const after = await api(request, 'GET', `/sites/${siteId}/`)
    expect(after.status).toBe(200)
    expect(after.data.schema).toEqual(before.data.schema)
    expect(after.data.revision).toBe(before.data.revision)
  } finally {
    expect((await api(request, 'DELETE', `/sites/${siteId}/`)).status).toBe(204)
  }
})
