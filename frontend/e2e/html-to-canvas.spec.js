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
<div class="later"><section id="two" hidden><h1>Part two</h1><p>The learning rate sets the step size.</p></section></div>
</main>
<script>
document.getElementById('next').addEventListener('click', () => {
  const step = document.querySelector('#one .step[hidden]')
  if (step) step.hidden = false
})
const route = () => {
  const id = location.hash.slice(1) || 'one'
  document.querySelectorAll('main section').forEach((part) => { part.hidden = part.id !== id })
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

// What a button shows is learnt even when a link points at it too, when it
// comes a moment after the press (with or without a "loading" look first),
// when the button rewrites its own label, and when it is a drawing; a panel
// keeps what was opened in it, and a box of steps starts over when opened.
const ANSWERS = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Answers</title>
<style>body{margin:0;font-family:Arial,sans-serif;padding:40px}</style></head><body>
<a href="#answer">Jump to answer</a> <a href="#footer">Jump to footer</a>
<button type="button" id="show">Show answer</button>
<div hidden id="answer"><h2>Hidden solution</h2><p>Answer is forty two.</p></div>
<button type="button" id="late">Open later</button>
<p hidden id="later">Shown a moment later.</p>
<button type="button" id="loading">Open after loading</button>
<p hidden id="loaded">Shown after loading.</p>
<button type="button" id="relabel">Open text</button>
<p hidden id="drawn"></p>
<button type="button" id="draw">Show drawing</button>
<canvas id="drawing" width="20" height="20" hidden></canvas>
<button type="button" id="open">Open panel</button>
<div id="panel" hidden><button type="button" id="detail">Reveal detail</button><p hidden id="kept">Kept detail</p></div>
<div id="steps"><button type="button" id="start">Start</button><button type="button" id="all">All</button>
<div id="work" hidden><p class="s" hidden>Step one</p><p class="s" hidden>Step two</p><p class="s" hidden>Step three</p>
<button type="button" id="next">Next</button><button type="button" id="over">Over</button></div></div>
<p id="footer">Footer survives.</p>
<script>
const $ = (id) => document.getElementById(id)
$('show').addEventListener('click', () => { $('answer').hidden = false })
$('late').addEventListener('click', () => { setTimeout(() => { $('later').hidden = false }, 80) })
$('loading').addEventListener('click', (event) => { event.currentTarget.classList.add('busy'); setTimeout(() => { $('loaded').hidden = false }, 80) })
$('relabel').addEventListener('click', (event) => {
  $('drawn').innerHTML = '<span>Newly drawn solution</span>'
  $('drawn').hidden = false
  event.currentTarget.innerHTML = '<span>Opened</span>'
})
$('drawing').getContext('2d').fillRect(0, 0, 20, 20)
$('draw').addEventListener('click', () => { $('drawing').hidden = false })
$('open').addEventListener('click', () => { $('panel').hidden = false })
$('detail').addEventListener('click', () => { $('kept').hidden = false })
let shown = 0
const steps = () => document.querySelectorAll('#work .s').forEach((step, index) => { step.hidden = index >= shown })
$('start').addEventListener('click', () => { $('work').hidden = false; shown = 1; steps() })
$('all').addEventListener('click', () => { $('work').hidden = false; shown = 3; steps() })
$('next').addEventListener('click', () => { shown = Math.min(3, shown + 1); steps() })
$('over').addEventListener('click', () => { $('work').hidden = true; shown = 0; steps() })
</script>
</body></html>`

test('what buttons show is learnt and plays back as on the page, links, delays, drawings and panels included', async ({ page, request, browser }) => {
  const siteId = await createHtmlSite(request, 'E2E answers to canvas', [{ html: ANSWERS }])
  await openEditor(page, siteId)

  await page.locator('header').locator('[data-tour="more"]').click()
  await page.getByRole('button', { name: 'Convert to canvas blocks', exact: true }).click()
  await expect(page.getByText('Footer survives.', { exact: true })).toBeVisible({ timeout: 60_000 })
  await save(page)

  const { data } = await api(request, 'GET', `/sites/${siteId}/`)
  const home = data.schema.pages[0]
  const blocks = flat(home.components)
  const named = (text) => blocks.find((c) => c.props.text === text)
  // A link to it does not make the answer a chapter of its own, even with another link beside it.
  expect(home.parts || []).toEqual([])
  for (const [answer, button] of [['Answer is forty two.', 'Show answer'], ['Shown a moment later.', 'Open later'], ['Shown after loading.', 'Open after loading'], ['Newly drawn solution', 'Open text']]) {
    const key = named(answer).props.shownBy[0]
    expect(home.hiddenKeys).toContain(key)
    expect(named(button).props.onClick).toEqual([{ do: 'show', keys: [key] }])
  }
  // The label the page opened with, not the one a press wrote.
  expect(named('Opened')).toBeUndefined()
  // The drawing is hidden when the page opens, as it was.
  const drawing = named('Show drawing').props.onClick[0].keys[0]
  expect(home.hiddenKeys).toContain(drawing)
  const drawn = blocks.find((c) => (c.props.shownBy || []).includes(drawing))
  expect(drawn).toBeTruthy()
  // An HTML block keeps none of the reading's own marks.
  expect(JSON.stringify(blocks.filter((c) => c.type === 'html').map((c) => c.props.code))).not.toContain('data-pwb-read-')
  // Opening the panel leaves what was opened inside it alone.
  expect(named('Open panel').props.onClick.map((action) => action.do)).toEqual(['show'])

  // On the published page: all, then start over, then start shows the first step only.
  const slug = await publish(page, request, siteId)
  const viewer = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const visitor = await viewer.newPage()
  await visitor.goto(`${BACKEND}/s/${slug}/`)
  const step = (text) => visitor.getByText(text, { exact: true })
  await expect(step('Step one')).toBeHidden()
  await visitor.getByText('All', { exact: true }).click()
  await expect(step('Step three')).toBeVisible()
  await visitor.getByText('Over', { exact: true }).click()
  await expect(step('Step one')).toBeHidden()
  await visitor.getByText('Start', { exact: true }).click()
  await expect(step('Step one')).toBeVisible()
  await expect(step('Step two')).toBeHidden()
  await expect(step('Step three')).toBeHidden()
  await visitor.getByText('Next', { exact: true }).click()
  await expect(step('Step two')).toBeVisible()
  await viewer.close()
  await api(request, 'DELETE', `/sites/${siteId}/`)
})
