// The conversion fidelity bench: each page in fixtures/fidelity/ is turned
// into a canvas page the way the editor does it (read with its scripts,
// converted, published), and the published page is compared with the
// original in the same browser, word by word and picture by picture, at a
// desktop and a phone width (src/utils/fidelityScore.js).
//
// A page's score may not fall below its floor in fixtures/fidelity/floors.json.
// The floors were set from a run of this bench, a little below what it
// measured: they catch a conversion that got worse, and are raised by hand
// when one gets better. Every run prints the scores and attaches them.
//
// FIDELITY_EXTRA=<folder> adds the .html files there to the run, reported
// but not checked: for pages that cannot be in the repository.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'
import { scoreFidelity } from '../src/utils/fidelityScore.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const corpus = path.join(here, 'fixtures', 'fidelity')
const floors = JSON.parse(fs.readFileSync(path.join(corpus, 'floors.json'), 'utf8'))
const pages = fs.readdirSync(corpus).filter((name) => name.endsWith('.html')).sort()
  .map((name) => ({ name: name.replace(/\.html$/, ''), file: path.join(corpus, name), checked: true }))
if (process.env.FIDELITY_EXTRA) {
  for (const name of fs.readdirSync(process.env.FIDELITY_EXTRA).filter((n) => n.endsWith('.html')).sort()) {
    pages.push({ name: `extra/${name.replace(/\.html$/, '')}`, file: path.join(process.env.FIDELITY_EXTRA, name), checked: false })
  }
}

const WIDTHS = { desktop: { width: 1280, height: 900 }, phone: { width: 390, height: 844 } }

// The bench needs no account: it only runs the app's own modules.
test.use({ storageState: { cookies: [], origins: [] } })
// The floors were measured in Chromium; one browser is enough to see a
// conversion get worse, and the bench is the slowest spec.
test.skip(({ browserName }) => browserName !== 'chromium', 'the bench runs in Chromium only')

// Every word a reader can see, with its box on the page, and every picture.
// Words are compared in lower case: a page that shows "uppercase" by CSS is
// read with its words as written, and the converted one may carry them
// already in capitals. A picture is compared by its address decoded: the
// same data: address can be written with its spaces escaped or not.
function readDrawn() {
  const address = (src) => {
    try { return decodeURIComponent(src).replace(/\s+/g, '') } catch { return src.replace(/\s+/g, '') }
  }
  const words = []
  const images = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let run = 0
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|TEXTAREA|OPTION)$/.test(el.tagName)) continue
    // Not drawn: hidden, see-through, or inside a closed <details>.
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })) continue
    run += 1
    const text = node.textContent
    const pattern = /\S+/g
    for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
      const range = document.createRange()
      range.setStart(node, match.index)
      range.setEnd(node, match.index + match[0].length)
      const box = range.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) continue
      words.push({ t: match[0].toLocaleLowerCase(), x: box.left + scrollX, y: box.top + scrollY, w: box.width, h: box.height, run })
    }
  }
  for (const img of document.images) {
    const box = img.getBoundingClientRect()
    if (box.width >= 1 && box.height >= 1 && img.checkVisibility({ opacityProperty: true, visibilityProperty: true })) images.push({ src: address(img.currentSrc || img.src), x: box.left + scrollX, y: box.top + scrollY, w: box.width, h: box.height })
  }
  return { words, images, height: document.documentElement.scrollHeight }
}

async function drawnAt(browser, html, size) {
  const context = await browser.newContext({ viewport: size, storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(150)
  const drawn = await page.evaluate(readDrawn)
  await context.close()
  return drawn
}

for (const entry of pages) {
  test(`fidelity: ${entry.name}`, async ({ page, browser }, testInfo) => {
    test.setTimeout(240_000)
    const source = fs.readFileSync(entry.file, 'utf8')
    await page.goto('/')
    const started = Date.now()
    const converted = await page.evaluate(async (html) => {
      const { measureHtmlPage } = await import('/src/utils/htmlPageMeasure.js')
      const { canvasPageFromMeasured } = await import('/src/utils/htmlToCanvas.js')
      const { useEditorStore } = await import('/src/store/editorStore.js')
      const { publishedPagesFor } = await import('/src/utils/publishedPages.js')
      const measured = await measureHtmlPage(html, { width: 1280, timeout: 180000 })
      const result = canvasPageFromMeasured(measured)
      const store = useEditorStore.getState()
      store.loadSchema({ theme: {}, pages: [{ id: 'page_home', name: 'Home', mode: 'html', components: [] }] })
      store.convertPageToCanvas('page_home', {
        ...result,
        htmlBackup: html,
        seoTitle: result.title,
        seoDescription: result.description,
        language: result.language,
      })
      const schema = useEditorStore.getState().schema
      const count = (list) => list.reduce((sum, c) => sum + 1 + count(c.children || []), 0)
      const kinds = {}
      const tally = (list) => list.forEach((c) => { kinds[c.type] = (kinds[c.type] || 0) + 1; tally(c.children || []) })
      tally(schema.pages[0].components)
      return {
        html: publishedPagesFor(schema, {}, 'Bench', '')[0]?.html || '',
        blocks: count(schema.pages[0].components),
        kinds,
        ranScripts: measured.ranScripts,
      }
    }, source)
    const seconds = Math.round((Date.now() - started) / 100) / 10
    expect(converted.html).toContain('<body')

    const scores = {}
    for (const [width, size] of Object.entries(WIDTHS)) {
      const original = await drawnAt(browser, source, size)
      const result = await drawnAt(browser, converted.html, size)
      scores[width] = { ...scoreFidelity(original, result), height: [original.height, result.height] }
    }
    const report = { page: entry.name, seconds, blocks: converted.blocks, kinds: converted.kinds, ranScripts: converted.ranScripts, ...scores }
    console.log(`FIDELITY ${JSON.stringify(report)}`)
    await testInfo.attach(`fidelity-${entry.name.replace(/\//g, '-')}.json`, { body: JSON.stringify(report, null, 2), contentType: 'application/json' })

    if (!entry.checked) return
    const floor = floors[entry.name]
    expect(floor, `fixtures/fidelity/floors.json has no floor for ${entry.name}`).toBeTruthy()
    for (const width of Object.keys(WIDTHS)) {
      expect.soft(scores[width].found, `${entry.name} at ${width}: share of words found`).toBeGreaterThanOrEqual(floor[width].found)
      expect.soft(scores[width].near, `${entry.name} at ${width}: share of words in place`).toBeGreaterThanOrEqual(floor[width].near)
    }
    expect.soft(converted.blocks, `${entry.name}: blocks`).toBeLessThanOrEqual(floor.blocks)
  })
}
