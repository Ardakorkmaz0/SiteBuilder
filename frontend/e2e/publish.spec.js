// What a published site serves at /s/<slug>/, read the way a visitor gets it.
import { test, expect, api, createHtmlSite, openEditor, clickInFrame, inFrame, publish, BACKEND } from './support.js'

const properties = (page) => page.locator('[data-tour="properties"]')
const field = (page, label, kind = 'input, textarea, select') => properties(page).locator('label')
  .filter({ has: page.locator('span', { hasText: new RegExp(`^${label.replace(/[()×]/g, '\\$&')}$`) }) })
  .locator(kind).first()

test('a size set for phones only is served to phones only', async ({ page, request, browser }) => {
  const siteId = await createHtmlSite(request, 'E2E phone size', [{
    html: '<!DOCTYPE html><html><head><style>h1{font-size:40px}</style></head><body><h1 id="hero">Hello</h1></body></html>',
  }])
  await openEditor(page, siteId, { edit: true })
  await page.locator('.studio-segment', { hasText: 'Mobile' }).first().getByRole('button', { name: 'Mobile' }).click()
  await page.waitForTimeout(800)
  await clickInFrame(page, '#hero')
  await properties(page).getByRole('tab', { name: 'Design' }).click()
  await expect(properties(page)).toContainText('MOBILE only')
  await field(page, 'Font size (px)').fill('22')
  const slug = await publish(page, request, siteId)

  for (const [width, size] of [[375, '22px'], [1280, '40px']]) {
    const viewer = await browser.newContext({ viewport: { width, height: 800 } })
    const visitor = await viewer.newPage()
    await visitor.goto(`${BACKEND}/s/${slug}/`)
    expect(await visitor.evaluate(() => getComputedStyle(document.querySelector('#hero')).fontSize), `at ${width}px`).toBe(size)
    await viewer.close()
  }
  await api(request, 'DELETE', `/sites/${siteId}/`)
})

// Only canvas pages had their #<pageId> links turned into addresses; on an
// HTML page the link went nowhere once published.
test('a link from one HTML page to another reaches it', async ({ page, request, browser }) => {
  const siteId = await createHtmlSite(request, 'E2E page links', [
    { html: '<!DOCTYPE html><html><body><h1>Home page</h1><a id="go" href="#page_about">About us</a></body></html>' },
    { id: 'page_about', name: 'About', html: '<!DOCTYPE html><html><body><h1>About page</h1></body></html>' },
  ])
  await openEditor(page, siteId)
  const slug = await publish(page, request, siteId)

  const viewer = await browser.newContext()
  const visitor = await viewer.newPage()
  await visitor.goto(`${BACKEND}/s/${slug}/`)
  await visitor.click('#go')
  await expect(visitor.locator('h1')).toHaveText('About page')
  await expect(visitor).toHaveURL(new RegExp(`/s/${slug}/about/$`))
  await viewer.close()
  await api(request, 'DELETE', `/sites/${siteId}/`)
})

test('a page\'s own settings are in the head it is served with', async ({ page, request }) => {
  const siteId = await createHtmlSite(request, 'E2E page settings', [
    { html: '<!DOCTYPE html><html><head><title>Authored</title></head><body><h1>Hi</h1></body></html>' },
  ])
  await openEditor(page, siteId)
  await properties(page).getByRole('tab', { name: 'Page', exact: true }).click()
  await field(page, 'Page language', 'select').selectOption('tr')
  await field(page, 'Text direction', 'select').selectOption('rtl')
  await field(page, 'Canonical URL', 'input').fill('https://example.org/canonical-page')
  await field(page, 'Search title', 'input').fill('E2E search title')
  await field(page, 'Search description', 'textarea').fill('E2E search description.')
  await properties(page).getByLabel('Hide this page from search engines').check()
  const slug = await publish(page, request, siteId)

  const served = await (await request.get(`${BACKEND}/s/${slug}/`)).text()
  const head = served.slice(0, served.indexOf('</head>'))
  expect(served).toMatch(/<html[^>]*lang="tr"[^>]*dir="rtl"|<html[^>]*dir="rtl"[^>]*lang="tr"/)
  expect(head).toContain('<title>E2E search title</title>')
  expect(head).toContain('E2E search description.')
  expect(head).toContain('https://example.org/canonical-page')
  expect(head).toMatch(/<meta name="robots" content="noindex/)
  await api(request, 'DELETE', `/sites/${siteId}/`)
})

test('an animated section is there for a visitor who asked for less motion', async ({ page, request, browser }) => {
  const siteId = await createHtmlSite(request, 'E2E motion', [{
    html: '<!DOCTYPE html><html><head><style>section{min-height:900px;padding:40px}</style></head><body><section id="a"><h2>A</h2></section><section id="b"><h2>B</h2></section></body></html>',
  }])
  await openEditor(page, siteId, { edit: true })
  await clickInFrame(page, '#b', { x: 4, y: 4 })
  await page.getByRole('tab', { name: 'Animation' }).click()
  await page.getByRole('button', { name: /Fade up/ }).first().click()
  await page.getByRole('button', { name: 'Use this animation' }).click()
  expect(await inFrame(page, (doc) => doc.querySelector('#b').getAttribute('data-anim-in'))).toBe('fade-up')
  const slug = await publish(page, request, siteId)

  const calm = await browser.newContext({ reducedMotion: 'reduce' })
  const visitor = await calm.newPage()
  await visitor.goto(`${BACKEND}/s/${slug}/`)
  await expect.poll(() => visitor.evaluate(() => Number(getComputedStyle(document.querySelector('#b')).opacity))).toBe(1)
  await calm.close()
  await api(request, 'DELETE', `/sites/${siteId}/`)
})

// A form in an HTML block posts to the page around it, and the published page
// dropped that message: the visitor saw nothing and the owner got nothing.
test('a form in an HTML block on a canvas page reaches the inbox', async ({ page, request, browser }) => {
  const { data: site } = await api(request, 'POST', '/sites/', { title: 'E2E block form' })
  const { data: full } = await api(request, 'GET', `/sites/${site.id}/`)
  const code = '<form><input name="name"><textarea name="message"></textarea><button type="submit">Send</button></form>'
  const block = { id: 'form', type: 'html', props: { code }, styles: {}, layout: { x: 40, y: 40, w: 500, h: 220 } }
  await api(request, 'PATCH', `/sites/${site.id}/`, { schema: { ...full.schema, pages: [{ ...full.schema.pages[0], components: [block] }] } })
  await openEditor(page, site.id)
  const slug = await publish(page, request, site.id)

  const viewer = await browser.newContext()
  const visitor = await viewer.newPage()
  await visitor.goto(`${BACKEND}/s/${slug}/`)
  const form = visitor.frameLocator('iframe').first()
  await form.locator('input[name="name"]').fill('Ada')
  await form.locator('textarea[name="message"]').fill('Hello from a block')
  await form.getByRole('button', { name: 'Send' }).click()
  await expect(form.getByRole('status')).toHaveText('Message sent.')
  const { data: rows } = await api(request, 'GET', `/sites/${site.id}/submissions/`)
  expect(rows.map((row) => row.data.message)).toEqual(['Hello from a block'])
  await viewer.close()
  await api(request, 'DELETE', `/sites/${site.id}/`)
})
