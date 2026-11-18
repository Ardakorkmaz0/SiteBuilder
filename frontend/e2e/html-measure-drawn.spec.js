// What a page's script draws once (a formula KaTeX typesets, marking the
// element so it is not typeset again) is read once. The reader takes back
// what it changed after each reading but keeps what the script drew; it took
// the mark back too, so the next part's reading typeset the drawing itself
// as a formula, and the converted page showed it three times over.
import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;font:16px sans-serif} section{display:none} section.on{display:block}
</style></head><body>
<a href="#one">One</a> <a href="#two">Two</a>
<section id="one" class="on"><h2>Chapter one</h2><p>Plain words.</p></section>
<section id="two"><h2>Chapter two</h2><div class="tex" id="formula">a+b</div></section>
<script>
// Like KaTeX, and like the owner's notes, only in the part that is shown:
// the source is cleared, then the drawing added (two changes), the source
// stays as hidden text beside what is drawn, and a mark says it is done.
function typeset(root){root.querySelectorAll('.tex').forEach(function(el){if(el.dataset.ok)return;var src=el.textContent;el.textContent='';var drawn=document.createElement('span');drawn.className='drawn';drawn.innerHTML='<span class="source" style="position:absolute;clip:rect(1px,1px,1px,1px);overflow:hidden;width:1px;height:1px">'+src+'</span><span class="shown">'+src+'</span>';el.appendChild(drawn);el.dataset.ok='1'})}
function go(){var id=(location.hash||'#one').slice(1);document.querySelectorAll('section').forEach(function(s){s.classList.toggle('on',s.id===id)});typeset(document.getElementById(id))}
addEventListener('hashchange',go);document.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();history.replaceState(null,'',a.getAttribute('href'));go()})});go()
</script></body></html>`

test('a formula the page typesets once is read once in every part', async ({ page }) => {
  await page.goto('/')
  const read = await page.evaluate(async (source) => {
    const { measureHtmlPage } = await import('/src/utils/htmlPageMeasure.js')
    const result = await measureHtmlPage(source, { width: 1180, timeout: 60000 })
    const words = (root) => {
      const out = []
      const walk = (node) => {
        if (node.kind === 'text' && /a\+b/.test(node.text || '')) out.push(node.text)
        for (const kid of node.kids || []) walk(kid)
      }
      walk(root)
      return out
    }
    return { states: result.states.length, two: result.states.map((state) => words(state.data.root)) }
  }, PAGE)

  expect(read.states).toBe(1)
  // Once, as written: not the drawing typeset again, nor the cleared source
  // put back beside the drawing ("a+ba+b").
  expect(read.two[0].join(' ')).toBe('a+b')
})

// A piece drawn as a picture in a line of text (a formula) that starts a
// wrapped line: its line's baseline was looked for just before it, where
// the line before ends, and the picture was set a whole line too low.
test('a picture that starts a wrapped line sits on that line\'s baseline', async ({ page }) => {
  await page.goto('/')
  const runs = await page.evaluate(async () => {
    const { measureHtmlPage } = await import('/src/utils/htmlPageMeasure.js')
    const result = await measureHtmlPage('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;font:16px/24px sans-serif"><p id="cell" style="width:220px">Words that fill the first line, <span style="display:inline-block;width:90px;height:20px;background:#246">x</span> then more words</p></body></html>', { width: 1180, timeout: 60000 })
    let found = null
    const walk = (node) => {
      if (node.id === 'cell') found = node
      for (const kid of node.kids || []) walk(kid)
    }
    walk(result.root)
    return (found?.runs || []).filter((run) => run.img !== undefined).map((run) => ({ va: run.va, h: run.h }))
  })

  expect(runs).toHaveLength(1)
  // On its own line: an inline block's bottom sits the letter's descent
  // (a few px) below that line's baseline. Set a line too low, it was 28.
  expect(Math.abs(runs[0].va)).toBeLessThanOrEqual(12)
})
