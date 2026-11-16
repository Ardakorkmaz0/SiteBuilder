// The reader of an uploaded HTML page reads it at a phone's width too, where
// the page's own CSS lays it out for a phone: the converted canvas page takes
// its phone layout from that instead of guessing one.
import { test, expect } from './support.js'

const RESPONSIVE = `<!doctype html><html><head><style>
body{margin:0;font:16px sans-serif}
.cols{display:flex;gap:20px;padding:20px}
.col{flex:1;background:#eee;padding:10px}
nav a{margin-right:10px}
@media (max-width:600px){.cols{flex-direction:column} nav .links{display:none}}
</style></head><body>
<nav><span class="links" id="links"><a href="#a">Home</a><a href="#b">About</a></span><span>Brand</span></nav>
<h1>Title of the page</h1>
<div class="cols"><div class="col" id="left">Left column</div><div class="col" id="right">Right column</div></div>
</body></html>`

const CHAPTERS = `<!doctype html><html><head><style>
body{margin:0;font:16px sans-serif} section{display:none} section.on{display:block}
.row{display:flex;gap:16px} .row div{flex:1;padding:8px;background:#ddd}
@media (max-width:600px){.row{flex-direction:column}}
</style></head><body>
<a href="#one">One</a> <a href="#two">Two</a>
<section id="one" class="on"><h2>Chapter one</h2><div class="row"><div id="a1">A</div><div id="b1">B</div></div></section>
<section id="two"><h2>Chapter two</h2><div class="row"><div id="a2">A</div><div id="b2">B</div></div></section>
<script>
function go(){var id=(location.hash||'#one').slice(1);document.querySelectorAll('section').forEach(function(s){s.classList.toggle('on',s.id===id)})}
addEventListener('hashchange',go);document.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();history.replaceState(null,'',a.getAttribute('href'));go()})})
</script></body></html>`

// Measure in the app's own page, the way the editor does, and hand back each
// node with an id as { rect, m }.
async function measure(page, html) {
  return page.evaluate(async (source) => {
    const { measureHtmlPage } = await import('/src/utils/htmlPageMeasure.js')
    const result = await measureHtmlPage(source, { width: 1180, timeout: 60000 })
    const byId = (root) => {
      const out = {}
      const walk = (node) => {
        if (node.id) out[node.id] = { rect: node.rect, m: node.m || null }
        for (const kid of node.kids || []) walk(kid)
      }
      walk(root)
      return out
    }
    return {
      ran: result.ranScripts,
      phone: result.phone,
      nodes: byId(result.root),
      states: result.states.map((state) => ({ phone: state.data.phone, width: state.data.width, nodes: byId(state.data.root) })),
    }
  }, html)
}

test('a page is read at a phone width as its own CSS lays it out there', async ({ page }) => {
  await page.goto('/')
  const read = await measure(page, RESPONSIVE)

  expect(read.ran).toBe(true)
  expect(read.phone.width).toBeGreaterThanOrEqual(360)
  expect(read.phone.width).toBeLessThanOrEqual(390)
  const { left, right, links } = read.nodes
  // Side by side on the desktop…
  expect(Math.round(right.rect.y)).toBe(Math.round(left.rect.y))
  expect(right.rect.x).toBeGreaterThan(left.rect.x + left.rect.w)
  // …one under the other on the phone, as wide as it allows.
  expect(Math.round(right.m.x)).toBe(Math.round(left.m.x))
  expect(right.m.y).toBeGreaterThanOrEqual(left.m.y + left.m.h)
  expect(left.m.w).toBeLessThan(read.phone.width)
  // What the phone does not show is said to be hidden there.
  expect(links.m).toEqual({ hidden: true })
})

test('each part shown one at a time is read at a phone width too, and the next is read at the desktop width again', async ({ page }) => {
  await page.goto('/')
  const read = await measure(page, CHAPTERS)

  expect(read.ran).toBe(true)
  expect(read.states).toHaveLength(1)
  const [two] = read.states
  expect(two.width).toBe(1180)
  expect(two.phone.width).toBeLessThanOrEqual(390)
  const { a2, b2 } = two.nodes
  expect(Math.round(b2.rect.y)).toBe(Math.round(a2.rect.y))
  expect(b2.m.y).toBeGreaterThanOrEqual(a2.m.y + a2.m.h)
})
