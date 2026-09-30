// The HTML editor: an uploaded page edited in place. Each test pins something
// that shipped broken once.
import { test, expect, createHtmlSite, openEditor, clickInFrame, inFrame, save, savedHtml, api, RED_PNG } from './support.js'

const PAGE = '<!DOCTYPE html><html><head><title>E2E</title><style>body{font-family:system-ui;margin:0;padding:16px}'
  + 'h1{font-size:40px;line-height:1.2}section{padding:24px;margin:8px 0;border:1px solid #ddd}</style></head><body>'
  + '<header id="top"><h1 id="hero">Hello world</h1><nav><a id="lnk" href="https://example.com">Docs</a></nav></header>'
  + '<section id="a"><h2>Alpha</h2><p id="para">Some paragraph text.</p></section>'
  + '<section id="contact"><h2>Contact</h2></section></body></html>'

const properties = (page) => page.locator('[data-tour="properties"]')
const field = (page, label) => properties(page).locator('label')
  .filter({ has: page.locator('span', { hasText: new RegExp(`^${label.replace(/[()×]/g, '\\$&')}$`) }) })
  .locator('input, textarea, select').first()

test.describe('editing an HTML page', () => {
  let siteId

  test.beforeEach(async ({ page, request }) => {
    siteId = await createHtmlSite(request, 'E2E html', [{ html: PAGE }])
    await openEditor(page, siteId, { edit: true })
  })

  test.afterEach(async ({ request }) => {
    await api(request, 'DELETE', `/sites/${siteId}/`)
  })

  test('the panel and typing change the page, and Save keeps it', async ({ page, request }) => {
    await clickInFrame(page, '#hero')
    await field(page, 'Text').fill('Edited heading')
    expect(await inFrame(page, (doc) => doc.querySelector('#hero').textContent)).toBe('Edited heading')

    await clickInFrame(page, '#para')
    await page.keyboard.press('End')
    await page.keyboard.type(' Typed here.')
    await save(page)
    const html = await savedHtml(request, siteId)
    expect(html).toContain('Edited heading')
    expect(html).toContain('Typed here.')
  })

  // Both were rounded to whole numbers: 1.2 read as 1 and 1.5 became 2.
  test('line height and letter spacing take fractions', async ({ page }) => {
    await clickInFrame(page, '#hero')
    await properties(page).getByRole('tab', { name: 'Design' }).click()
    const lineHeight = field(page, 'Line height (×)')
    await expect(lineHeight).toHaveValue('1.2')
    await lineHeight.fill('1.5')
    await field(page, 'Letter spacing (em)').fill('0.05')
    const style = await inFrame(page, (doc) => {
      const cs = getComputedStyle(doc.querySelector('#hero'))
      return [cs.lineHeight, cs.letterSpacing]
    })
    expect(style).toEqual(['60px', '2px'])
  })

  // "Section on this page" asked for an id the person had to know.
  test('a link can point at a section picked from the page', async ({ page }) => {
    await clickInFrame(page, '#lnk')
    await field(page, 'Link (href)').selectOption('section')
    await properties(page).locator('select[aria-label="Section on this page"]').selectOption('contact')
    expect(await inFrame(page, (doc) => doc.querySelector('#lnk').getAttribute('href'))).toBe('#contact')
  })

  // Typing was not an undo step, so undoing a later delete dropped it; and
  // Ctrl+Z in the page after × did nothing.
  test('undoing a delete keeps earlier typing, and Ctrl+Z in the page undoes it', async ({ page }) => {
    await clickInFrame(page, '#para')
    await page.keyboard.press('End')
    await page.keyboard.type(' typed first')
    await clickInFrame(page, '#contact', { x: 4, y: 4 })
    await clickInFrame(page, '[data-pwb-selection-action="delete"]')
    expect(await inFrame(page, (doc) => !!doc.querySelector('#contact'))).toBe(false)

    await page.keyboard.press('Control+z')
    // Undo draws the page again: until it is back, the frame has no #para.
    await expect.poll(() => inFrame(page, (doc) => [!!doc.querySelector('#contact'), doc.querySelector('#para')?.textContent ?? null]))
      .toEqual([true, 'Some paragraph text. typed first'])
  })

  // The picture a person chose has to be the one shown: srcset and a
  // lazy-load source used to win over the new src.
  test('an uploaded image replaces the old one and its alternatives', async ({ page }) => {
    const pixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
    await inFrame(page, (doc, src) => {
      doc.querySelector('#a').insertAdjacentHTML('beforeend', `<img id="pic" src="${src}" srcset="${src} 1x" data-src="${src}" width="120" height="90" alt="Old">`)
    }, pixel)
    await clickInFrame(page, '#pic')
    const chooser = page.waitForEvent('filechooser')
    await properties(page).getByRole('button', { name: 'Image: Upload an image' }).click()
    await (await chooser).setFiles({ name: 'red.png', mimeType: 'image/png', buffer: RED_PNG })
    await expect.poll(() => inFrame(page, (doc) => doc.querySelector('#pic')?.getAttribute('src') ?? null), { timeout: 15_000 })
      .toContain('/media/')
    const image = await inFrame(page, (doc) => {
      const img = doc.querySelector('#pic')
      return { srcset: img.getAttribute('srcset'), lazy: img.getAttribute('data-src'), shows: img.currentSrc === img.src }
    })
    expect(image).toEqual({ srcset: null, lazy: null, shows: true })
  })

  // The snapshot before a load was of the SAVED site; work on screen was lost.
  test('loading an older save keeps the work that was on screen', async ({ page, request }) => {
    await save(page)
    await clickInFrame(page, '#hero')
    await page.keyboard.press('End')
    await page.keyboard.type(' plus unsaved work')

    await page.locator('header').getByRole('button', { name: /More/i }).last().click()
    await page.getByRole('button', { name: 'History' }).first().click()
    const history = page.locator('[aria-label="Saves & history"]')
    const load = history.getByRole('button', { name: 'Load', exact: true })
    await expect(load.first()).toBeVisible()
    await load.last().click()
    // The page frame is rebuilt for the loaded save; it may be empty a moment.
    await expect.poll(() => inFrame(page, (doc) => doc.querySelector('#hero')?.textContent ?? null)).toBe('Hello world')

    // Some save now holds the work; loading one returns the site it becomes.
    const { data: versions } = await api(request, 'GET', `/sites/${siteId}/versions/`)
    const rows = Array.isArray(versions) ? versions : versions.results
    let kept = false
    for (const row of rows) {
      const { data } = await api(request, 'POST', `/sites/${siteId}/versions/${row.id}/restore/`)
      if (JSON.stringify(data).includes('plus unsaved work')) kept = true
    }
    expect(kept).toBe(true)
  })
})

// A deleted page on an HTML site could not be undone: Undo there read only
// the page's own document history.
test('a deleted HTML page comes back with Undo, content and all', async ({ page, request }) => {
  const siteId = await createHtmlSite(request, 'E2E pages', [
    { html: '<!DOCTYPE html><html><body><h1>Home page</h1></body></html>' },
    { id: 'page_pricing', name: 'Pricing', html: '<!DOCTYPE html><html><body><h1>Pricing body</h1></body></html>' },
  ])
  await openEditor(page, siteId, { edit: true })
  await page.getByRole('tab', { name: 'Files' }).first().click()
  const row = page.locator('button[title^="Open "]', { hasText: /^pricing\.html$/ })
  await row.hover()
  await row.locator('xpath=..').locator('button[title="Delete page"]').click()
  await expect(row).toHaveCount(0)

  await page.locator('header button[title="Undo (Ctrl+Z)"]').click()
  await expect(row).toHaveCount(1)
  await row.click()
  await expect.poll(() => page.evaluate(() => document.querySelector('main iframe')?.contentDocument?.body?.innerText || ''))
    .toContain('Pricing body')
  await api(request, 'DELETE', `/sites/${siteId}/`)
})
