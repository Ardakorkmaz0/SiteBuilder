// A throwaway prototype, not product code: a flat CSS grid from a page's block
// rectangles, with plain boxes for blocks. Run from the repository root:
//   node docs/review-evidence/responsive-grid-prototype-2026-11-04/proto.cjs
// It needs frontend/node_modules and /usr/bin/chromium, and writes only to a temp folder.
const path = require('path')
const os = require('os')
const ROOT = path.resolve(__dirname, '../../..')
const EVIDENCE = path.join(ROOT, 'docs/review-evidence/responsive-plan-2026-11-04')
const OUT = require('fs').mkdtempSync(path.join(os.tmpdir(), 'grid-proto-'))
const { chromium } = require(path.join(ROOT, 'frontend/node_modules/playwright'))
const fs = require('fs')
const hero = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'hero-schema.json'), 'utf8'))
const heroPage = (hero.pages || hero.schema.pages)[0]
const pin = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'pinwheel-input.json'), 'utf8'))
const pinPage = pin.pages[0]
const LONG = 'Küçük işletmeler için hızlı, sade ve bakımı kolay web siteleri tasarlıyoruz. '
const tracks = (edges, unit) => edges.slice(1).map((e, i) => unit(e - edges[i]))
function place(blocks, key, W, H) {
  const xs = [...new Set([0, W, ...blocks.flatMap((b) => [b[key].x, b[key].x + b[key].w])])].sort((a, b) => a - b)
  const ys = [...new Set([0, H, ...blocks.flatMap((b) => [b[key].y, b[key].y + b[key].h])])].sort((a, b) => a - b)
  const cols = tracks(xs, (d) => 'minmax(0,' + d + 'fr)').join(' ')
  const rows = tracks(ys, (d) => 'minmax(min(' + d + 'px,' + +(d / W * 100).toFixed(3) + 'cqw),auto)').join(' ')
  const items = blocks.map((b) => { const l = b[key]; return '.c-' + b.id + '{grid-column:' + (xs.indexOf(l.x) + 1) + '/' + (xs.indexOf(l.x + l.w) + 1) + ';grid-row:' + (ys.indexOf(l.y) + 1) + '/' + (ys.indexOf(l.y + l.h) + 1) + '}' }).join('')
  return '.page{grid-template-columns:' + cols + ';grid-template-rows:' + rows + '}' + items
}
function doc(blocks, { W = 1000, MW = 390, sticky = null, texts = {} } = {}) {
  const H = Math.max(...blocks.map((b) => b.layout.y + b.layout.h))
  const phone = blocks.every((b) => b.mobileLayout)
  const MH = phone ? Math.max(...blocks.map((b) => b.mobileLayout.y + b.mobileLayout.h)) : 0
  const body = blocks.map((b) => {
    const text = texts[b.id] || b.id + ' ' + LONG.slice(0, 40)
    const inner = b.type === 'image' ? '' : text
    const attrs = sticky === b.id ? ' data-builder-sticky data-builder-sticky-offset="0"' : ''
    return '<div class="c c-' + b.id + (b.type === 'image' ? ' img' : '') + '" data-id="' + b.id + '"' + attrs + ' style="--r:' + b.layout.w + '/' + b.layout.h + '">' + inner + '</div>'
  }).join('')
  const css = '*{box-sizing:border-box}body{margin:0;font:16px/1.4 Arial}.stage{container-type:inline-size}.page{display:grid;position:relative;width:min(100%,' + W + 'px);margin:0 auto}.c{min-width:0;overflow-wrap:break-word;background:#eef}.img{background:#f96;aspect-ratio:var(--r);align-self:start}'
    + place(blocks, 'layout', W, H) + (phone ? '@media (max-width:768px){.page{width:100%}' + place(blocks, 'mobileLayout', MW, MH) + '}' : '')
  const js = sticky ? '<script>' + "(function(){var el=document.querySelector('[data-builder-sticky]');function u(){var page=el.offsetParent,rect=page.getBoundingClientRect(),y=el.offsetTop,ty=Math.max(0,-rect.top-y);var m=page.offsetHeight-el.offsetHeight-y;if(ty>m)ty=Math.max(0,m);el.style.transform=ty?'translateY('+ty+'px)':''}addEventListener('scroll',u,{passive:true});u()})()" + '<\/script>' : ''
  return { html: '<!doctype html><meta name=viewport content="width=device-width"><style>' + css + '</style><div class=stage><div class=page>' + body + '</div></div>' + js, css }
}
const overlap = [
  { id: 'photo', type: 'image', layout: { x: 100, y: 100, w: 400, h: 300 } },
  { id: 'over', type: 'heading', layout: { x: 140, y: 240, w: 320, h: 60 } },
  { id: 'side', type: 'text', layout: { x: 560, y: 100, w: 300, h: 300 } },
]
const many = Array.from({ length: 60 }, (_, i) => ({ id: 'm' + i, type: 'text', layout: { x: 20 + (i % 6) * 160 + (i % 7), y: 10 + Math.floor(i / 6) * 90 + (i % 5) * 3, w: 150, h: 70 } }))
const cases = {
  hero: doc(heroPage.components),
  heroLong: doc(heroPage.components, { texts: { paragraph: LONG.repeat(5), heading: 'Çok uzun bir başlık ' .repeat(4), footer: 'https://example.com/' + 'x'.repeat(200) } }),
  pinwheel: doc(pinPage.components),
  overlap: doc(overlap),
  many: doc(many),
  stickyBar: doc([{ id: 'bar', type: 'text', layout: { x: 0, y: 40, w: 1000, h: 50 } }, { id: 'tall', type: 'text', layout: { x: 100, y: 120, w: 800, h: 3000 } }], { sticky: 'bar' }),
}
const designs = { hero: heroPage.components, heroLong: heroPage.components, pinwheel: pinPage.components, overlap, many, stickyBar: null }
;(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium' }); console.log('chromium', b.version())
  const p = await (await b.newContext()).newPage()
  const WIDTHS = [320, 360, 390, 600, 767, 768, 769, 780, 900, 999, 1000, 1001, 1024, 1920]
  for (const [name, c] of Object.entries(cases)) {
    fs.writeFileSync(path.join(OUT, name + '.html'), c.html)
    await p.setContent(c.html)
    const lines = []
    for (const w of WIDTHS) {
      await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(20)
      const m = await p.evaluate(() => {
        const d = document.documentElement, els = [...document.querySelectorAll('.c')], W = innerWidth
        const rects = els.map((e) => [e, e.getBoundingClientRect()])
        let hit = 0, cut = 0, inner = 0
        for (let i = 0; i < rects.length; i++) { const a = rects[i][1]; if (a.right > W + 0.5 || a.left < -0.5) cut++; const e = rects[i][0]; if (e.scrollWidth > e.clientWidth + 1 && e.textContent) inner++
          for (let j = i + 1; j < rects.length; j++) { const o = rects[j][1], x = Math.min(a.right, o.right) - Math.max(a.left, o.left), y = Math.min(a.bottom, o.bottom) - Math.max(a.top, o.top); if (x > 0.5 && y > 0.5) hit++ } }
        return { over: d.scrollWidth - W, hit, cut, inner, H: d.scrollHeight }
      })
      lines.push(w + ':' + [m.over, m.hit, m.cut, m.inner].join('/') + ' h' + m.H)
    }
    console.log(name, 'css', c.css.length, 'B  [width:scroll/overlaps/cut/innerOverflow]'); console.log('  ' + lines.join('  '))
    if (designs[name]) {
      await p.setViewportSize({ width: 1000, height: 900 })
      const worst = await p.evaluate((ds) => { let w = 0; const off = document.querySelector('.page').getBoundingClientRect(); for (const d of ds) { const r = document.querySelector('.c-' + d.id).getBoundingClientRect(); const l = d.layout; for (const v of [Math.abs(r.left - off.left - l.x), Math.abs(r.top - off.top - l.y), Math.abs(r.width - l.w), Math.abs(r.height - l.h)]) w = Math.max(w, v) } return +w.toFixed(3) }, designs[name])
      console.log('  at design width, worst block deviation px:', worst)
    }
    if (name === 'stickyBar') { await p.setViewportSize({ width: 900, height: 600 }); await p.evaluate(() => scrollTo(0, 800)); await p.waitForTimeout(60); console.log('  sticky at scroll 800, top =', await p.evaluate(() => Math.round(document.querySelector('.c-bar').getBoundingClientRect().top))) }
    if (name === 'heroLong' || name === 'pinwheel' || name === 'overlap') for (const w of name === 'heroLong' ? [390, 768, 900] : [900]) { await p.setViewportSize({ width: w, height: 800 }); await p.screenshot({ path: path.join(OUT, name + '-' + w + '.png'), fullPage: true }) }
  }
  await b.close()
})()
