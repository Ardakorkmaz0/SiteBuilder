// The light/dark switch: placed from the palette, kept by the server, and
// switching the published page for a visitor, who keeps the choice on reload
// (in the address, since the published page's sandbox gives it no storage).
import { test, expect, api, createHtmlSite, openEditor, clickInFrame, inFrame, publish, save, BACKEND } from './support.js'

async function pickSwitch(page, variant = 'Icon and text') {
  await page.getByRole('tab', { name: 'Components' }).click()
  await page.locator('[role=tabpanel]').getByRole('button', { name: /Theme switch/ }).first().click()
  await page.locator(`[title$="— ${variant}"]`).first().click()
}

async function visit(browser, slug) {
  const viewer = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const visitor = await viewer.newPage()
  await visitor.goto(`${BACKEND}/s/${slug}/`)
  return { viewer, visitor }
}

const palette = (visitor) => visitor.evaluate(() => document.documentElement.getAttribute('data-pwb-theme'))
const pageColor = (visitor) => visitor.evaluate(() => getComputedStyle(document.body).backgroundColor)

test('a switch on a canvas page turns the published site dark and back', async ({ page, request, browser }) => {
  const { data: site } = await api(request, 'POST', '/sites/', { title: 'E2E theme switch' })
  await openEditor(page, site.id)
  await pickSwitch(page)
  const area = await page.locator('main').last().boundingBox()
  await page.mouse.click(area.x + 600, area.y + 120)
  const button = page.locator('main [data-cid] button[data-pwb-theme-toggle]')
  await expect(button).toHaveAttribute('aria-label', 'Dark mode')
  await save(page)
  const { data: saved } = await api(request, 'GET', `/sites/${site.id}/`)
  expect(saved.schema.pages[0].components.map((c) => c.type)).toContain('themeToggle')

  const slug = await publish(page, request, site.id)
  const { viewer, visitor } = await visit(browser, slug)
  expect(await palette(visitor)).toBe('light')
  const light = await pageColor(visitor)
  const toggle = visitor.locator('[data-pwb-theme-toggle]')
  await toggle.click()
  expect(await palette(visitor)).toBe('dark')
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  expect(await pageColor(visitor)).not.toBe(light)

  await visitor.reload()
  expect(await palette(visitor)).toBe('dark')
  await visitor.locator('[data-pwb-theme-toggle]').click()
  expect(await palette(visitor)).toBe('light')
  expect(await pageColor(visitor)).toBe(light)
  await viewer.close()
  await api(request, 'DELETE', `/sites/${site.id}/`)
})

test('the owner chooses what the site opens in, and a visitor can still change it', async ({ page, request, browser }) => {
  const { data: site } = await api(request, 'POST', '/sites/', { title: 'E2E site opens dark' })
  await openEditor(page, site.id)
  await page.getByRole('tab', { name: 'Theme', exact: true }).click()
  await page.getByRole('radiogroup', { name: 'The site opens in' }).getByRole('radio', { name: 'Dark', exact: true }).click()
  await pickSwitch(page)
  const area = await page.locator('main').last().boundingBox()
  await page.mouse.click(area.x + 600, area.y + 120)
  await save(page)
  const { data: saved } = await api(request, 'GET', `/sites/${site.id}/`)
  expect(saved.schema.colorMode.start).toBe('dark')

  const slug = await publish(page, request, site.id)
  const { viewer, visitor } = await visit(browser, slug)
  const scheme = () => visitor.evaluate(() => getComputedStyle(document.documentElement).colorScheme)
  expect([await palette(visitor), await scheme()]).toEqual(['dark', 'dark'])
  await visitor.locator('[data-pwb-theme-toggle]').click()
  expect([await palette(visitor), await scheme()]).toEqual(['light', 'light'])
  // Going back to the designed palette is a choice too: the reload must not
  // open the site dark again.
  await visitor.reload()
  expect(await palette(visitor)).toBe('light')
  await viewer.close()
  await api(request, 'DELETE', `/sites/${site.id}/`)
})

test('a visitor\'s choice is there on the next page and on a second visit, for that visitor only', async ({ page, request, browser }) => {
  const siteId = await createHtmlSite(request, 'E2E theme memory', [
    { html: '<!DOCTYPE html><html><head><style>:root{--bg:#ffffff;--ink:#171723}body{background:var(--bg);color:var(--ink)}</style></head><body><button data-pwb-theme-toggle>Theme</button><a href="#about">About</a></body></html>' },
    { id: 'about', name: 'About', html: '<!DOCTYPE html><html><head><style>:root{--bg:#ffffff;--ink:#171723}body{background:var(--bg);color:var(--ink)}</style></head><body><h1>About us</h1></body></html>' },
  ])
  await openEditor(page, siteId)
  const slug = await publish(page, request, siteId)

  const { viewer, visitor } = await visit(browser, slug)
  expect(await palette(visitor)).toBe('light')
  await visitor.getByRole('button', { name: 'Theme' }).click()
  await visitor.getByRole('link', { name: 'About' }).click()
  await expect(visitor.getByRole('heading', { name: 'About us' })).toBeVisible()
  expect(await palette(visitor)).toBe('dark')

  // A second visit: a new tab, at the plain address.
  const again = await viewer.newPage()
  await again.goto(`${BACKEND}/s/${slug}/`)
  expect(await palette(again)).toBe('dark')
  expect(new URL(again.url()).search).toBe('')

  // Going back to light is remembered the same way.
  await again.getByRole('button', { name: 'Theme' }).click()
  await again.getByRole('link', { name: 'About' }).click()
  await expect(again.getByRole('heading', { name: 'About us' })).toBeVisible()
  const third = await viewer.newPage()
  await third.goto(`${BACKEND}/s/${slug}/`)
  expect(await palette(third)).toBe('light')
  await viewer.close()

  // Someone else starts from the site's own palette.
  const other = await visit(browser, slug)
  expect(await palette(other.visitor)).toBe('light')
  await other.viewer.close()
  await api(request, 'DELETE', `/sites/${siteId}/`)
})

test('an HTML block on a dark page is not a white box', async ({ page, request, browser }) => {
  const { data: site } = await api(request, 'POST', '/sites/', { title: 'E2E dark block' })
  const { data: full } = await api(request, 'GET', `/sites/${site.id}/`)
  const block = { id: 'block', type: 'html', props: { code: '<p>In a block</p>' }, styles: {}, layout: { x: 40, y: 40, w: 400, h: 160 } }
  await api(request, 'PATCH', `/sites/${site.id}/`, {
    schema: {
      ...full.schema,
      colorMode: { theme: { backgroundColor: '#111317' }, start: 'dark' },
      pages: [{ ...full.schema.pages[0], background: '#ffffff', components: [block] }],
    },
  })
  await openEditor(page, site.id)
  const slug = await publish(page, request, site.id)

  const { viewer, visitor } = await visit(browser, slug)
  expect(await palette(visitor)).toBe('dark')
  // A published block's frame has no name to find it by.
  const frame = visitor.locator('iframe')
  await expect(frame).toHaveCount(1)
  await expect(frame).toBeVisible()
  await visitor.waitForLoadState('networkidle')
  const box = await frame.boundingBox()
  // Read from the screen: the frame's corner, where the text is not, shows the
  // page through it. A frame in another scheme than its page's paints it white.
  const shot = await visitor.screenshot({ clip: { x: box.x + box.width - 12, y: box.y + box.height - 12, width: 4, height: 4 } })
  const reader = await viewer.newPage()
  const pixel = await reader.evaluate(async (png) => {
    const image = new Image()
    image.src = `data:image/png;base64,${png}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0)
    return [...context.getImageData(1, 1, 1, 1).data]
  }, shot.toString('base64'))
  expect(pixel).toEqual([17, 19, 23, 255])
  await viewer.close()
  await api(request, 'DELETE', `/sites/${site.id}/`)
})

test('an HTML page switches by its own palette', async ({ page, request, browser }) => {
  const siteId = await createHtmlSite(request, 'E2E theme switch html', [{
    html: '<!DOCTYPE html><html><head><style>:root{--bg:#ffffff;--ink:#171723}body{background:var(--bg);color:var(--ink)}</style></head>'
      + '<body><h1 id="title">Hello</h1><p id="para">Welcome.</p></body></html>',
  }])
  await openEditor(page, siteId, { edit: true })
  await pickSwitch(page, 'Icon button')
  await clickInFrame(page, '#para')
  expect(await inFrame(page, (doc) => !!doc.querySelector('[data-pwb-theme-toggle]'))).toBe(true)

  const slug = await publish(page, request, siteId)
  const { viewer, visitor } = await visit(browser, slug)
  const ink = () => visitor.evaluate(() => getComputedStyle(document.querySelector('#title')).color)
  expect([await pageColor(visitor), await ink()]).toEqual(['rgb(255, 255, 255)', 'rgb(23, 23, 35)'])
  await visitor.locator('[data-pwb-theme-toggle]').click()
  expect(await palette(visitor)).toBe('dark')
  expect(await pageColor(visitor)).not.toBe('rgb(255, 255, 255)')
  expect(await ink()).not.toBe('rgb(23, 23, 35)')
  await viewer.close()
  await api(request, 'DELETE', `/sites/${siteId}/`)
})
