// A site with many pages in the app's viewer: the row no longer hides its start,
// the open page stays in sight, and a list reaches every page.
import { test, expect, api, openEditor, publish, APP_ORIGIN } from './support.js'

test('the viewer keeps the open page in sight and lists every page of a site with many', async ({ page, request }) => {
  const { data: site } = await api(request, 'POST', '/sites/', { title: 'E2E many pages' })
  const { data: full } = await api(request, 'GET', `/sites/${site.id}/`)
  const home = full.schema.pages[0]
  const names = Array.from({ length: 14 }, (_, i) => `Long page name ${i + 1}`)
  const pages = names.map((name, i) => ({
    ...home,
    id: i ? `page_${i}` : home.id,
    name,
    components: [{ id: `title_${i}`, type: 'heading', props: { text: `Title of ${name}` }, styles: {}, layout: { x: 40, y: 40, w: 600, h: 60 } }],
  }))
  await api(request, 'PATCH', `/sites/${site.id}/`, { schema: { ...full.schema, pages } })
  await openEditor(page, site.id)
  const slug = await publish(page, request, site.id)

  await page.goto(`${APP_ORIGIN}/site/${slug}`)
  const row = page.getByRole('navigation', { name: 'Site pages', exact: true })
  const tab = (name) => row.getByRole('button', { name, exact: true })
  const inRow = async (name) => {
    const [outer, inner] = await Promise.all([row.boundingBox(), tab(name).boundingBox()])
    return inner.x >= outer.x - 1 && inner.x + inner.width <= outer.x + outer.width + 1
  }
  // The start of the row used to be cut off, with the open page in it.
  await expect(tab(names[0])).toHaveAttribute('aria-current', 'page')
  expect(await inRow(names[0])).toBe(true)

  const all = page.getByRole('button', { name: 'All pages (14)', exact: true })
  await all.click()
  const list = page.getByRole('list').filter({ has: page.getByRole('button', { name: names[13], exact: true }) })
  await expect(list.getByRole('button')).toHaveCount(14)
  await list.getByRole('button', { name: names[11], exact: true }).click()
  await expect(page.getByRole('heading', { name: `Title of ${names[11]}`, exact: true })).toBeVisible()
  await expect(list).toHaveCount(0)
  await expect(tab(names[11])).toHaveAttribute('aria-current', 'page')
  await expect.poll(() => inRow(names[11])).toBe(true)

  await all.click()
  await page.keyboard.press('Escape')
  await expect(all).toHaveAttribute('aria-expanded', 'false')
  await api(request, 'DELETE', `/sites/${site.id}/`)
})
