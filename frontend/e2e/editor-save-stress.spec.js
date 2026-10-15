// Save boundaries that span two editor revisions, different pages, a failed
// connection or a destructive page transition. Only the network timing is held;
// the editor, store and eventual requests run against the real backend.
import { test, expect, api, API, createHtmlSite, openEditor, save, savedHtml } from './support.js'

const document = (text) => `<!doctype html><html><body><h1>${text}</h1></body></html>`
const source = (page) => page.getByRole('textbox', { name: 'HTML source editor', exact: true })
const title = (page) => page.getByRole('textbox', { name: 'Site title', exact: true })
const header = (page) => page.locator('header').first()
const file = (page, name) => page.locator(`button[title=${JSON.stringify(`Open ${name}`)}], button[title^=${JSON.stringify(`${name} —`)}]`)
const fileRow = (page, name) => page.locator(`button[aria-label=${JSON.stringify(`Rename page: ${name}`)}]`).locator('../..')

async function openSource(page, siteId) {
  await openEditor(page, siteId)
  await page.getByRole('button', { name: 'Source', exact: true }).click()
  await expect(source(page)).toBeVisible()
}

for (const initiallyEmpty of [false, true]) test(`importing HTML into an inactive ${initiallyEmpty ? 'component' : 'HTML'} file preserves its previous document for Undo and Redo`, async ({ page, request }) => {
  const previous = initiallyEmpty ? '' : document('About before import')
  const siteId = await createHtmlSite(request, 'E2E inactive HTML import history', [
    { html: document('Home remains open') },
    { id: 'page_about', name: 'About', html: previous },
  ])
  try {
    if (initiallyEmpty) {
      const site = (await api(request, 'GET', `/sites/${siteId}/`)).data
      site.schema.pages[1].mode = 'empty'
      expect((await api(request, 'PATCH', `/sites/${siteId}/`, { schema: site.schema })).status).toBe(200)
    }
    await openSource(page, siteId)
    const row = fileRow(page, 'About')
    if (!initiallyEmpty) {
      await row.hover()
      await row.getByRole('button', { name: 'Delete page: About', exact: true }).click()
      await expect(file(page, 'About')).toHaveCount(0)
      await header(page).getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true }).click()
      await expect(file(page, 'About')).toBeVisible()
    }
    await row.hover()
    const chooser = page.waitForEvent('filechooser')
    await row.getByRole('button', { name: 'Import an HTML file into this page: About', exact: true }).click()
    await (await chooser).setFiles({ name: 'about.html', mimeType: 'text/html', buffer: Buffer.from(document('About imported revision')) })
    await expect(source(page)).toHaveValue(/Home remains open/)
    await save(page)
    expect((await api(request, 'GET', `/sites/${siteId}/`)).data.schema.pages[1].html).toContain('About imported revision')
    await expect(header(page).getByRole('button', { name: 'Redo (Ctrl+Shift+Z)', exact: true })).toBeDisabled()
    await page.keyboard.press('Control+Shift+z')
    await expect(file(page, 'About')).toBeVisible()
    await header(page).getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true }).click()
    await file(page, 'About').click()
    await expect(source(page)).toHaveValue(previous)
    await header(page).getByRole('button', { name: 'Redo (Ctrl+Shift+Z)', exact: true }).click()
    await expect(source(page)).toHaveValue(/About imported revision/)
    await save(page)
    await page.reload()
    await file(page, 'About').click()
    await expect(source(page)).toHaveValue(/About imported revision/)
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})

// Hold the first PATCH before it reaches Django, and record every real write.
// Call release in a finally block too, so an assertion cannot strand a request.
async function holdFirstWrite(page, siteId) {
  let release
  let started
  const gate = new Promise((resolve) => { release = resolve })
  const firstStarted = new Promise((resolve) => { started = resolve })
  const writes = []
  await page.route(`${API}/sites/${siteId}/`, async (route) => {
    if (!['PATCH', 'PUT'].includes(route.request().method())) return route.continue()
    writes.push(route.request().postDataJSON())
    if (writes.length === 1) { started(); await gate }
    await route.continue()
  })
  return { writes, firstStarted, release }
}

test('a held save keeps newer source and metadata dirty and queued Ctrl+S saves both pages', async ({ page, request }) => {
  const siteId = await createHtmlSite(request, 'E2E held save', [
    { html: document('Home initially saved') },
    { id: 'page_about', name: 'About', html: document('About initially saved') },
  ])
  await openSource(page, siteId)
  await source(page).fill(document('Home first save revision'))
  const held = await holdFirstWrite(page, siteId)
  try {
    await header(page).getByRole('button', { name: 'Save', exact: true }).click()
    await held.firstStarted
    expect(held.writes[0].schema.pages[0].html).toContain('Home first save revision')
    await source(page).fill(document('Home typed during the save'))
    await title(page).fill('Title typed during the save')
    await file(page, 'About').click()
    await expect(source(page)).toHaveValue(/About initially saved/)
    await source(page).fill(document('About typed during the save'))
    // The header button is disabled during a save; Ctrl+S intentionally queues
    // a subsequent save and must read the latest render when it starts.
    await source(page).press('Control+s')
    expect(held.writes).toHaveLength(1)
    held.release()
    await expect.poll(() => held.writes.length).toBe(2)
    await expect(header(page).getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
    await expect(header(page).getByRole('status')).toHaveText('Saved')
    const stored = (await api(request, 'GET', `/sites/${siteId}/`)).data
    expect(stored.title).toBe('Title typed during the save')
    expect(stored.schema.pages[0].html).toContain('Home typed during the save')
    expect(stored.schema.pages[1].html).toContain('About typed during the save')
    await expect(source(page)).toHaveValue(/About typed during the save/)
  } finally {
    held.release()
    await api(request, 'DELETE', `/sites/${siteId}/`)
  }
})

test('a save finishing behind a newer source draft still says unsaved until the next save', async ({ page, request }) => {
  const siteId = await createHtmlSite(request, 'E2E late acknowledgement', [{ html: document('Saved before edit') }])
  await openSource(page, siteId)
  await source(page).fill(document('Revision sent to the server'))
  const held = await holdFirstWrite(page, siteId)
  try {
    await header(page).getByRole('button', { name: 'Save', exact: true }).click()
    await held.firstStarted
    await source(page).fill(document('Newer revision still only in the tab'))
    held.release()
    await expect(header(page).getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
    await expect(header(page).getByRole('status')).toHaveText('Unsaved')
    expect(await savedHtml(request, siteId)).toContain('Revision sent to the server')
    await expect(source(page)).toHaveValue(/Newer revision still only in the tab/)
    expect(await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    })).toBe(true)
    await save(page)
    expect(await savedHtml(request, siteId)).toContain('Newer revision still only in the tab')
  } finally {
    held.release()
    await api(request, 'DELETE', `/sites/${siteId}/`)
  }
})

test('toolbar undo and redo keep the source draft typed after the last saved revision', async ({ page, request }) => {
  const siteId = await createHtmlSite(request, 'E2E pending source undo', [{ html: document('Original source revision') }])
  try {
    await openSource(page, siteId)
    await source(page).fill(document('First source draft before any recorded history'))
    const undo = header(page).getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true })
    const redo = header(page).getByRole('button', { name: 'Redo (Ctrl+Shift+Z)', exact: true })
    await expect(undo).toBeEnabled()
    await undo.click()
    await expect(source(page)).toHaveValue(/Original source revision/)
    await redo.click()
    await expect(source(page)).toHaveValue(/First source draft before any recorded history/)
    await source(page).fill(document('Second saved source revision'))
    await save(page)
    await source(page).fill(document('Third unsaved source revision'))
    await undo.click()
    await expect(source(page)).toHaveValue(/Second saved source revision/)
    await redo.click()
    await expect(source(page)).toHaveValue(/Third unsaved source revision/)
    await undo.click()
    await source(page).fill(document('New source branch after undo'))
    await expect(redo).toBeDisabled()
    // Ctrl+Y outside the field is the editor's Redo. A new source branch must
    // end that old redo path even before it has been applied or saved.
    await title(page).focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Control+y')
    await expect(source(page)).toHaveValue(/New source branch after undo/)
    await save(page)
    expect(await savedHtml(request, siteId)).toContain('New source branch after undo')
  } finally {
    await api(request, 'DELETE', `/sites/${siteId}/`)
  }
})

test('adding a page first preserves the source draft on the page being left', async ({ page, request }) => {
  const siteId = await createHtmlSite(request, 'E2E source new page boundary', [{ html: document('Home before source draft') }])
  try {
    await openSource(page, siteId)
    await source(page).fill(document('Keep home source when adding a page'))
    await page.getByRole('button', { name: '+ File', exact: true }).click()
    await page.getByRole('button', { name: /^Empty canvas/ }).click()
    await expect(file(page, 'New Page')).toBeVisible()
    await file(page, 'Home').click()
    await expect(source(page)).toHaveValue(/Keep home source when adding a page/)
    await save(page)
    expect(await savedHtml(request, siteId)).toContain('Keep home source when adding a page')
  } finally {
    await api(request, 'DELETE', `/sites/${siteId}/`)
  }
})

test('deleting the active page and undoing it restores its pending source draft', async ({ page, request }) => {
  const siteId = await createHtmlSite(request, 'E2E source delete recovery', [
    { html: document('Home stays in place') },
    { id: 'page_pricing', name: 'Pricing', html: document('Pricing saved version') },
  ])
  try {
    await openSource(page, siteId)
    await file(page, 'Pricing').click()
    await expect(source(page)).toHaveValue(/Pricing saved version/)
    await source(page).fill(document('Pricing draft recovered after undo delete'))
    const pricing = fileRow(page, 'Pricing')
    await pricing.hover()
    await pricing.getByRole('button', { name: 'Delete page: Pricing', exact: true }).click()
    await expect(file(page, 'Pricing')).toHaveCount(0)
    await header(page).getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true }).click()
    await expect(file(page, 'Pricing')).toBeVisible()
    await file(page, 'Pricing').click()
    await expect(source(page)).toHaveValue(/Pricing draft recovered after undo delete/)
    await save(page)
    expect(await savedHtml(request, siteId, 1)).toContain('Pricing draft recovered after undo delete')
  } finally {
    await api(request, 'DELETE', `/sites/${siteId}/`)
  }
})

test('a failed save-and-leave keeps the draft and lets the same dialog retry successfully', async ({ page, request }) => {
  const siteId = await createHtmlSite(request, 'E2E leave retry', [{ html: document('Saved before failed leave') }])
  try {
    await openSource(page, siteId)
    await source(page).fill(document('Source survives failed save and leave'))
    const failRoute = `${API}/sites/${siteId}/`
    await page.route(failRoute, (route) => {
      if (!['PATCH', 'PUT'].includes(route.request().method())) return route.continue()
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Storage is temporarily unavailable.' }) })
    })
    await page.getByRole('link', { name: 'Sitebuilder home', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Save before leaving?', exact: true })
    await dialog.getByRole('button', { name: 'Save and leave', exact: true }).click()
    await expect(dialog.getByRole('button', { name: 'Save and leave', exact: true })).toBeEnabled()
    await expect(page).toHaveURL(new RegExp(`/editor/${siteId}$`))
    await expect(source(page)).toHaveValue(/Source survives failed save and leave/)
    await expect(page.getByText('Storage is temporarily unavailable.', { exact: true })).toBeVisible()
    expect(await savedHtml(request, siteId)).toContain('Saved before failed leave')
    await page.unroute(failRoute)
    await dialog.getByRole('button', { name: 'Save and leave', exact: true }).click()
    await expect(page).toHaveURL('http://localhost:5173/')
    expect(await savedHtml(request, siteId)).toContain('Source survives failed save and leave')
  } finally {
    await api(request, 'DELETE', `/sites/${siteId}/`)
  }
})

test('leaving without saving cancels an automatic write that was already queued', async ({ page, request }) => {
  const siteId = await createHtmlSite(request, 'E2E discard queued automatic save', [{ html: document('Last explicitly saved document') }])
  await openSource(page, siteId)
  const held = await holdFirstWrite(page, siteId)
  try {
    await header(page).getByRole('switch', { name: 'Auto-save', exact: true }).click()
    await source(page).fill(document('Automatic revision already in flight'))
    await held.firstStarted
    await source(page).fill(document('Discard this newer queued revision'))
    await title(page).fill('Discard this newer queued site title')
    // Model switching away from the tab. This browser lifecycle event forces
    // the real automatic-save listener to queue the current revision now,
    // without depending on the debounce timer's scheduling while a write waits.
    await page.evaluate(() => {
      const previous = Object.getOwnPropertyDescriptor(document, 'visibilityState')
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
      document.dispatchEvent(new Event('visibilitychange'))
      if (previous) Object.defineProperty(document, 'visibilityState', previous)
      else delete document.visibilityState
    })
    expect(held.writes).toHaveLength(1)
    await page.getByRole('link', { name: 'Sitebuilder home', exact: true }).click()
    await page.getByRole('dialog', { name: 'Save before leaving?', exact: true })
      .getByRole('button', { name: 'Leave without saving', exact: true }).click()
    await expect(page).toHaveURL('http://localhost:5173/')
    const isWrite = (response) => response.url() === `${API}/sites/${siteId}/`
      && ['PATCH', 'PUT'].includes(response.request().method())
    const finished = page.waitForResponse(isWrite)
    held.release()
    expect((await finished).ok()).toBe(true)
    // The page may already have emitted networkidle while the route was held.
    // Observe a quiet interval after the acknowledged write instead of using
    // that earlier load state to assume the automatic-save queue has drained.
    const extraResponse = await page.waitForResponse(isWrite, { timeout: 1200 }).catch(() => null)
    expect(extraResponse?.status() ?? null).toBeNull()
    expect(held.writes).toHaveLength(1)
    const html = await savedHtml(request, siteId)
    expect(html).toContain('Automatic revision already in flight')
    expect(html).not.toContain('Discard this newer queued revision')
    expect((await api(request, 'GET', `/sites/${siteId}/`)).data.title).toBe('E2E discard queued automatic save')
  } finally {
    held.release()
    await api(request, 'DELETE', `/sites/${siteId}/`)
  }
})

for (const nextPublished of [true, false]) {
  test(`an autosave queued behind ${nextPublished ? 'publishing' : 'unpublishing'} keeps the requested publication state`, async ({ page, request }) => {
    const siteId = await createHtmlSite(request, `E2E ${nextPublished ? 'publish' : 'unpublish'} queue`, [{ html: document('Before publication state transition') }])
    await api(request, 'PATCH', `/sites/${siteId}/`, { published: !nextPublished })
    await openSource(page, siteId)
    const held = await holdFirstWrite(page, siteId)
    try {
      await header(page).getByRole('button', { name: nextPublished ? 'Publish' : 'Published', exact: true }).click()
      await held.firstStarted
      await source(page).fill(document('Typed while changing publication state'))
      await header(page).getByRole('switch', { name: 'Auto-save', exact: true }).click()
      // Wait through the real 2.5 second debounce while the first write is held.
      // The queued automatic write must not bypass it or capture its old state.
      await page.waitForTimeout(2800)
      expect(held.writes).toHaveLength(1)
      held.release()
      await expect.poll(() => held.writes.length).toBeGreaterThanOrEqual(2)
      await expect(header(page).getByRole('status')).toHaveText('Saved')
      expect(held.writes.every((body) => body.published === nextPublished)).toBe(true)
      const stored = (await api(request, 'GET', `/sites/${siteId}/`)).data
      expect(stored.published).toBe(nextPublished)
      expect(stored.schema.pages[0].html).toContain('Typed while changing publication state')
    } finally {
      held.release()
      await api(request, 'DELETE', `/sites/${siteId}/`)
    }
  })
}
