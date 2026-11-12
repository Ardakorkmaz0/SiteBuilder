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
  // A painted link is text that carries its link, its words aligned as the page had them.
  expect(blocks.find((c) => c.props.text === 'Order now')).toMatchObject({ type: 'text', props: { href: '#order' }, styles: { backgroundColor: 'rgb(79, 70, 229)', borderRadius: '8px' } })
  // A table is read cell by cell: its words are text blocks, not an HTML block.
  expect(blocks.filter((c) => c.type === 'html')).toHaveLength(0)
  expect(blocks.filter((c) => c.type === 'text').map((c) => c.props.text)).toEqual(expect.arrayContaining(['Rye loaf', '4']))

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

// A page of notes that shows one part at a time, keeps its menu on the screen
// and shows the steps of a solution one press at a time. It becomes one
// canvas page that does the same, with no HTML block left: the reading
// learns what each button shows by pressing it.
const NOTES = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Notes</title>
<style>
body{margin:0;font-family:Arial,sans-serif;background:#fbf8f1}
.side{position:fixed;inset:0 auto 0 0;width:240px;background:#f2ede1;padding:20px;box-sizing:border-box}
.side a{display:block;color:#1f4e8c;line-height:28px}
main{margin-left:280px;padding:40px}
.step p{margin:8px 0}
.done{display:inline-flex;gap:6px;align-items:center}
</style></head><body>
<nav class="side"><a href="#one">Part one</a><a href="#two">Part two</a></nav>
<main>
<section id="one"><h1>Part one</h1>
<div class="step" hidden><p>Square the errors first.</p></div><div class="step" hidden><p>Then add them up.</p></div>
<button type="button" id="next">Next step</button>
<details><summary>Show the paper text</summary><p>Write your answer in ink.</p></details>
<label class="done"><input type="checkbox"> Solved</label>
<p>Below the solution.</p></section>
<section id="two" hidden><h1>Part two</h1><p>The learning rate sets the step size.</p></section>
</main>
<script>
document.getElementById('next').addEventListener('click', () => {
  const step = document.querySelector('#one .step[hidden]')
  if (step) step.hidden = false
})
const route = () => {
  const id = location.hash.slice(1) || 'one'
  document.querySelectorAll('main > section').forEach((part) => { part.hidden = part.id !== id })
}
addEventListener('hashchange', route)
</script>
</body></html>`

test('a page of notes becomes one canvas page that shows its parts and steps as the page did, no HTML block left', async ({ page, request, browser }) => {
  const siteId = await createHtmlSite(request, 'E2E notes to canvas', [{ html: NOTES }])
  await openEditor(page, siteId)

  await page.locator('header').locator('[data-tour="more"]').click()
  await page.getByRole('button', { name: 'Convert to canvas blocks', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Part one', exact: true })).toBeVisible({ timeout: 60_000 })
  await save(page)

  const { data } = await api(request, 'GET', `/sites/${siteId}/`)
  expect(data.schema.pages).toHaveLength(1)
  const home = data.schema.pages[0]
  const blocks = flat(home.components)
  expect(blocks.filter((c) => c.type === 'html')).toHaveLength(0)
  const named = (text) => blocks.find((c) => c.props.text === text)

  // The parts, each shown by its own key, the second hidden when the page opens.
  expect(home.parts.map((part) => part.label)).toEqual(['Part one', 'Part two'])
  const [first, second] = home.parts.map((part) => part.key)
  const heading = (text) => blocks.find((c) => c.type === 'heading' && c.props.text === text)
  expect(heading('Part one').props.shownBy).toContain(first)
  expect(heading('Part two').props.shownBy).toContain(second)
  // Drawn where each was drawn: in the same place, one at a time.
  expect(heading('Part two').layout.y).toBe(heading('Part one').layout.y)
  expect(home.hiddenKeys).toContain(second)

  // The steps: hidden when the page opens, shown one press at a time. (A
  // block also carries the key of its part.)
  const own = (text) => named(text).props.shownBy.find((key) => key !== first && key !== second)
  const stepKeys = ['Square the errors first.', 'Then add them up.'].map(own)
  expect(home.hiddenKeys).toEqual(expect.arrayContaining(stepKeys))
  expect(named('Next step').props.onClick).toEqual([{ do: 'next', keys: stepKeys }])

  // What the <details> holds opens and closes with its summary.
  const ink = own('Write your answer in ink.')
  expect(home.hiddenKeys).toContain(ink)
  expect(named('Show the paper text').props.onClick).toEqual([{ do: 'toggle', keys: [ink] }])

  // The tick box is a picture of itself, and the menu stays on the screen.
  expect(blocks.filter((c) => c.type === 'image' && c.props.src.startsWith('data:image/png') && c.layout.h <= 24)).toHaveLength(1)
  const menu = home.components.find((c) => c.props.scrollBehavior === 'fixed')
  expect(menu).toMatchObject({ type: 'container', props: { pinHeight: 'full', pinX: 'left' }, layout: { x: 0, y: 0, w: 240 } })

  // The published page does what the page did.
  const slug = await publish(page, request, siteId)
  const viewer = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const visitor = await viewer.newPage()
  await visitor.goto(`${BACKEND}/s/${slug}/`)
  await expect(visitor.getByText('Below the solution.', { exact: true })).toBeVisible()
  await expect(visitor.getByText('Square the errors first.', { exact: true })).toBeHidden()
  await expect(visitor.getByText('The learning rate sets the step size.', { exact: true })).toBeHidden()
  const below = await visitor.getByText('Below the solution.', { exact: true }).boundingBox()

  await visitor.getByText('Next step', { exact: true }).click()
  await expect(visitor.getByText('Square the errors first.', { exact: true })).toBeVisible()
  await expect(visitor.getByText('Then add them up.', { exact: true })).toBeHidden()
  // What followed the step moved down to make room for it.
  expect((await visitor.getByText('Below the solution.', { exact: true }).boundingBox()).y).toBeGreaterThan(below.y + 10)

  await visitor.getByText('Show the paper text', { exact: true }).click()
  await expect(visitor.getByText('Write your answer in ink.', { exact: true })).toBeVisible()

  await visitor.getByRole('link', { name: 'Part two', exact: true }).click()
  await expect(visitor.getByText('The learning rate sets the step size.', { exact: true })).toBeVisible()
  await expect(visitor.getByText('Below the solution.', { exact: true })).toBeHidden()
  await viewer.close()
  await api(request, 'DELETE', `/sites/${siteId}/`)
})
