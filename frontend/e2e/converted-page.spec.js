// A design turned into an HTML page: its source is the page, without the builder's
// code, and what is added to it afterwards works once it is published.
import { test, expect, api, openEditor, publish, BACKEND } from './support.js'

test('a page converted to HTML keeps a clean source, and a form added to it afterwards works', async ({ page, request, browser }) => {
  const { data: site } = await api(request, 'POST', '/sites/', { title: 'E2E converted page' })
  const { data: full } = await api(request, 'GET', `/sites/${site.id}/`)
  const heading = { id: 'title', type: 'heading', props: { text: 'Converted', level: 'h1' }, styles: {}, layout: { x: 40, y: 40, w: 600, h: 60 } }
  await api(request, 'PATCH', `/sites/${site.id}/`, { schema: { ...full.schema, pages: [{ ...full.schema.pages[0], components: [heading] }] } })
  await openEditor(page, site.id)

  await page.locator('header').locator('[data-tour="more"]').click()
  await page.getByRole('button', { name: 'Convert to responsive HTML', exact: true }).click()
  await page.getByRole('button', { name: 'Source', exact: true }).click()
  const source = page.getByRole('textbox', { name: 'HTML source editor', exact: true })
  await expect(source).toHaveValue(/Converted/)
  const written = await source.inputValue()
  expect(written).not.toContain('data-builder-interactive')
  expect(written).not.toContain('data-builder-motion')

  await source.fill(written.replace('</body>', '<form id="contact"><label>Name <input name="name"></label><button>Send it</button></form></body>'))
  await page.getByRole('button', { name: 'Apply & Save', exact: true }).click()
  const slug = await publish(page, request, site.id)

  const viewer = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const visitor = await viewer.newPage()
  await visitor.goto(`${BACKEND}/s/${slug}/`)
  await expect(visitor.getByRole('heading', { name: 'Converted', exact: true })).toBeVisible()
  await visitor.getByRole('textbox', { name: 'Name', exact: true }).fill('Ada')
  await visitor.getByRole('button', { name: 'Send it', exact: true }).click()
  await expect(visitor.getByRole('status')).toHaveText(/sent|gönderildi/i)
  await viewer.close()
  await api(request, 'DELETE', `/sites/${site.id}/`)
})
