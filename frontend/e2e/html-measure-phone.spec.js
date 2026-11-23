// The reader of an uploaded HTML page reads it at a phone's width too, where
// the page's own CSS lays it out for a phone: the converted canvas page takes
// its phone layout from that instead of guessing one.
import { test, expect } from './support.js'

test.use({ isolatedAccount: false })

const RESPONSIVE = `<!doctype html><html><head><style>
body{margin:0;font:16px sans-serif}
.cols{display:flex;gap:20px;padding:20px}
.col{flex:1;background:#eee;padding:10px}
nav a{margin-right:10px}
h1{font-size:40px;padding:0 20px}
.bar{display:none;padding:8px;background:#ddd}
@media (max-width:600px){.cols{flex-direction:column} nav .links{display:none} h1{font-size:24px;padding:0 8px} .bar{display:block}}
</style></head><body>
<nav><span class="links" id="links"><a href="#a">Home</a><a href="#b">About</a></span><span>Brand</span></nav>
<div class="bar" id="bar"><button id="toc">Contents</button></div>
<h1 id="title">Title of the page</h1>
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
async function measure(page, html, timeout = 60000) {
  return page.evaluate(async ({ source, timeout }) => {
    const { measureHtmlPage } = await import('/src/utils/htmlPageMeasure.js')
    const result = await measureHtmlPage(source, { width: 1180, timeout })
    const byId = (root) => {
      const out = {}
      const walk = (node) => {
        if (node.id) out[node.id] = { rect: node.rect, m: node.m || null, ms: node.ms || null, phoneOnly: !!node.phoneOnly }
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
  }, { source: html, timeout })
}

test('Turkish dotted capitals before the closing body preserve scripted HTML conversion', async ({ page }) => {
  await page.goto('/')
  const html = `<!doctype html><html lang="tr"><body>
    <!-- Example closing tag: </body> -->
    <h1>İçerik, İletişim, İzmir</h1><p>Hazırlanıyor</p>
    <script>document.querySelector('p').id = 'lesson-loaded'</script>
  </BoDy ></html>`
  const read = await measure(page, html, 8000)
  expect(read.ran).toBe(true)
  expect(read.nodes['lesson-loaded']).toBeDefined()
})

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
  // What the phone's CSS changes in how it is written is read too.
  expect(read.nodes.title.ms).toEqual({ fontSize: '24px', paddingRight: '8px', paddingLeft: '8px' })
  expect(left.ms).toBeNull()
  // What only the phone shows is read there, and said to be phone-only.
  const { bar, title } = read.nodes
  expect(bar.phoneOnly).toBe(true)
  expect(bar.m.w).toBeGreaterThan(300)
  expect(bar.m.y + bar.m.h).toBeLessThanOrEqual(title.m.y + 1)
  expect(title.phoneOnly).toBe(false)
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

// A tab the page hides as it opens, holding a long line of code: opened to
// be read, it made the page wider than the phone, and everything on it was
// read at that width instead of the phone's.
const HIDDEN_WIDE_TAB = `<!doctype html><html><head><style>
body{margin:0;font:16px sans-serif} main{display:grid;grid-template-columns:1fr;padding:0 18px}
.panel{display:none} .panel.on{display:block} pre{overflow-x:auto;background:#eee}
</style></head><body><main>
<p id="intro">This paragraph wraps on a phone, at the width the phone gives it and no wider.</p>
<div><button id="one">One</button><button id="two">Two</button></div>
<div class="panel on" id="p1"><pre>short</pre></div>
<div class="panel" id="p2"><pre>curl --silent --show-error --location https://example.com/a/rather/long/path/to/an/install/script.sh | sh</pre></div>
</main><script>
document.querySelectorAll('button').forEach(function(b){b.addEventListener('click',function(){
document.getElementById('p1').classList.toggle('on',b.id==='one');document.getElementById('p2').classList.toggle('on',b.id==='two')})})
</script></body></html>`

test('a hidden tab with a long line does not make the page wider than the phone when it is read', async ({ page }) => {
  await page.goto('/')
  const read = await measure(page, HIDDEN_WIDE_TAB)

  expect(read.ran).toBe(true)
  const { intro, p2 } = read.nodes
  // As wide as the phone leaves it, between the page's 18 px margins.
  expect(Math.round(intro.m.x)).toBe(18)
  expect(intro.m.x + intro.m.w).toBeLessThanOrEqual(read.phone.width - 17)
  // The tab is still read, there, for when it is opened.
  expect(p2.m.hidden).toBeUndefined()
  expect(p2.m.w).toBeLessThanOrEqual(read.phone.width)
})

// A hidden panel its parent centres (a grid's justify-items, a column's
// align-items) is as wide as what it holds: held to the width it is given
// while it was read at a phone's width, it came out 0 px wide, its words
// one under another.
for (const [kind, css] of Object.entries({ grid: 'main{display:grid;justify-items:center}', column: 'main{display:flex;flex-direction:column;align-items:center}' })) {
  test(`a hidden panel centred in a ${kind} keeps its width when it is read at a phone's width`, async ({ page }) => {
    await page.goto('/')
    const read = await measure(page, `<!doctype html><html><head><style>body{margin:0;font:16px/18px sans-serif}.panel{display:none;background:#eee}.panel.on{display:block}${css}</style></head><body><button id="show">Show</button><main><div class="panel" id="panel"><p id="words">This is a useful paragraph inside the hidden panel with several words.</p></div></main><script>document.getElementById('show').onclick=()=>document.getElementById('panel').classList.toggle('on')</script></body></html>`)

    expect(read.nodes.panel.m.w).toBe(390)
    // A few 18 px lines across the phone (two or three, as the engine's font
    // wraps them); squeezed to nothing it was a word a line, 216 px.
    expect(read.nodes.words.m.h).toBeLessThanOrEqual(54)
  })
}

// A <summary>'s disclosure triangle is carried as a block of its own: ▶ for
// a <details> the page has closed as it opens, ▼ for one it has open, though
// the reader opens them all to read them. The page names no character set:
// its letters, and the triangles, were read as Windows-1252.
test('a summary\'s triangle points the way the page shows it as it opens, on a page that names no character set', async ({ page }) => {
  await page.goto('/')
  const words = await page.evaluate(async () => {
    const { measureHtmlPage } = await import('/src/utils/htmlPageMeasure.js')
    const read = await measureHtmlPage('<!doctype html><html><body style="font:16px sans-serif"><details id="shut"><summary>Kapalı soru</summary><p>Gizli cevap</p></details><details id="wide" open><summary>Açık soru</summary><p>Görünen cevap</p></details></body></html>', { width: 1180, timeout: 60000 })
    const out = []
    const walk = (node) => {
      if (node.kind === 'text') out.push(node.text)
      for (const kid of node.kids || []) walk(kid)
    }
    walk(read.root)
    return out
  })

  expect(words).toEqual(['▶', 'Kapalı soru', 'Gizli cevap', '▼', 'Açık soru', 'Görünen cevap'])
})
