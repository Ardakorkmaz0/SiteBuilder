// An HTML page turned into a canvas page: every piece of it becomes a block
// where the browser drew it, the published page shows them, and the document
// it was comes back, byte for byte, when the owner goes back.
// The page is read as its owner sees it, with its own scripts having run:
// the heading below is written by one.
import { test, expect, api, createHtmlSite, openEditor, save, publish, savedHtml, BACKEND } from './support.js'

const DOCUMENT = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Olive Bakery</title>
<style>
body{margin:0;font-family:Arial,sans-serif;background:#faf7f2}
.hero{background:#0f172a;color:#fff;padding:80px 100px;height:240px}
.hero h1{margin:0;font-size:48px;line-height:56px}
.hero p{margin:16px 0 0;font-size:18px;line-height:28px}
.hero a{display:inline-block;margin-top:24px;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none}
.prices{padding:40px 100px}
</style></head><body>
<section class="hero"><h1>Loading</h1><p>Baked every morning in our own oven.</p><a href="#order">Order now</a></section>
<section class="prices"><table><tr><td>Rye loaf</td><td>4</td></tr></table></section>
<script>document.querySelector('.hero h1').textContent = 'Fresh bread daily'</script>
</body></html>`

const flat = (components) => components.flatMap((c) => [c, ...flat(c.children || [])])

test('an HTML page turned into a canvas keeps its pieces, publishes them, and can go back', async ({ page, request, browser }) => {
  const siteId = await createHtmlSite(request, 'E2E html to canvas', [{ html: DOCUMENT }])
  await openEditor(page, siteId)

  await page.locator('header').locator('[data-tour="more"]').click()
  await page.getByRole('button', { name: 'Convert to canvas blocks', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Fresh bread daily', exact: true })).toBeVisible({ timeout: 20_000 })
  await save(page)

  const { data } = await api(request, 'GET', `/sites/${siteId}/`)
  const home = data.schema.pages[0]
  expect(home.mode).toBe('empty')
  expect(home.html).toBe('')
  expect(home.htmlBackup).toBe(DOCUMENT)
  expect(home.seoTitle).toBe('Olive Bakery')
  expect(home.background).toBe('#faf7f2')

  const blocks = flat(home.components)
  const hero = home.components[0]
  expect(hero).toMatchObject({ type: 'region', layout: { x: 0, y: 0, h: 400 }, styles: { backgroundColor: 'rgb(15, 23, 42)' } })
  const heading = blocks.find((c) => c.type === 'heading')
  expect(heading).toMatchObject({ props: { text: 'Fresh bread daily', level: 'h1' }, layout: { x: 100, y: 80, h: 56 }, styles: { fontSize: '48px', color: 'rgb(255, 255, 255)' } })
  expect(blocks.find((c) => c.type === 'text')).toMatchObject({ props: { text: 'Baked every morning in our own oven.' }, layout: { x: 100, y: 152, h: 28 } })
  expect(blocks.find((c) => c.type === 'button')).toMatchObject({ props: { text: 'Order now', href: '#order' }, styles: { backgroundColor: 'rgb(79, 70, 229)', borderRadius: '8px' } })
  // The canvas has no table block: it is kept as it is, in an HTML block.
  const kept = blocks.filter((c) => c.type === 'html')
  expect(kept).toHaveLength(1)
  expect(kept[0].props.code).toContain('Rye loaf')

  const slug = await publish(page, request, siteId)
  const viewer = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const visitor = await viewer.newPage()
  await visitor.goto(`${BACKEND}/s/${slug}/`)
  await expect(visitor.getByRole('heading', { name: 'Fresh bread daily', exact: true })).toBeVisible()
  await expect(visitor.getByText('Baked every morning in our own oven.', { exact: true })).toBeVisible()
  await expect(visitor.getByRole('link', { name: 'Order now', exact: true })).toHaveAttribute('href', '#order')
  await viewer.close()

  await page.locator('header').locator('[data-tour="more"]').click()
  await page.getByRole('button', { name: 'Back to the HTML page', exact: true }).click()
  // The page is a document in a frame again, no longer blocks on the canvas.
  await expect(page.getByRole('heading', { name: 'Fresh bread daily', exact: true })).toHaveCount(0)
  await save(page)

  expect(await savedHtml(request, siteId)).toBe(DOCUMENT)
  const after = await api(request, 'GET', `/sites/${siteId}/`)
  expect(after.data.schema.pages[0]).toMatchObject({ mode: 'html', htmlBackup: '' })

  // The history says which of those saves only the history can take back.
  const versions = await api(request, 'GET', `/sites/${siteId}/versions/`)
  expect(versions.data[0].summary).toMatchObject({ hard: true, pages: [{ id: home.id, kind: 'mode', hard: true }] })
  await api(request, 'DELETE', `/sites/${siteId}/`)
})
