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
