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
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'
import { scoreFidelity } from '../src/utils/fidelityScore.js'
import { convertFidelityPage } from './convertFidelityPage.js'
import { extraFidelityPages } from './fidelityInventory.js'
import { assertFidelityJourney } from './fidelityJourneys.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const corpus = path.join(here, 'fixtures', 'fidelity')
const floors = JSON.parse(fs.readFileSync(path.join(corpus, 'floors.json'), 'utf8'))
const pages = fs.readdirSync(corpus).filter((name) => name.endsWith('.html')).sort()
  .map((name) => ({ name: name.replace(/\.html$/, ''), file: path.join(corpus, name), checked: true }))
pages.push(...extraFidelityPages(process.env.FIDELITY_EXTRA))

const WIDTHS = { desktop: { width: 1280, height: 900 }, phone: { width: 390, height: 844 } }

// The bench needs no account: it only runs the app's own modules.
test.use({ storageState: { cookies: [], origins: [] } })
// The floors were measured in Chromium; one browser is enough to see a
// conversion get worse, and the bench is the slowest spec.
test.skip(({ browserName }) => browserName !== 'chromium', 'the bench runs in Chromium only')

// Every word a reader can see, with its box on the page, and every picture.
// Words are compared in lower case: a page that shows "uppercase" by CSS is
// read with its words as written, and the converted one may carry them
// already in capitals. A picture written into the page (a data: address)
// is compared by what it holds, base64-encoded or not.
function readDrawn() {
  // What the boxes around an element cut what it holds to: those that clip
  // their overflow, and a clip-path inset. Cached per element.
  const cache = new Map()
  const length = (value, size) => (/%$/.test(value) ? (parseFloat(value) / 100) * size : parseFloat(value) || 0)
  const ownCut = (el) => {
    const look = getComputedStyle(el)
    const box = el.getBoundingClientRect()
    let cut = null
    if (look.overflowX !== 'visible' || look.overflowY !== 'visible') cut = { l: box.left, t: box.top, r: box.right, b: box.bottom }
    const inset = /^inset\(([^)]*)\)/.exec(look.clipPath || '')
    if (inset) {
      const v = inset[1].split(/\s+round\s+/)[0].trim().split(/\s+/)
      const [t, r = t, b = t, l = r] = v
      const c = { l: box.left + length(l, box.width), t: box.top + length(t, box.height), r: box.right - length(r, box.width), b: box.bottom - length(b, box.height) }
      cut = cut ? { l: Math.max(cut.l, c.l), t: Math.max(cut.t, c.t), r: Math.min(cut.r, c.r), b: Math.min(cut.b, c.b) } : c
    }
    return cut
  }
  const cutsOf = (el) => {
    if (!el || el === document.documentElement) return []
    if (cache.has(el)) return cache.get(el)
    const own = ownCut(el)
    const cuts = own ? [own, ...cutsOf(el.parentElement)] : cutsOf(el.parentElement)
    cache.set(el, cuts)
    return cuts
  }
  // More than half of it left once every cut around it is applied.
  const mostlyShown = (box, cuts) => {
    let l = box.left; let t = box.top; let r = box.right; let b = box.bottom
    for (const c of cuts) { l = Math.max(l, c.l); t = Math.max(t, c.t); r = Math.min(r, c.r); b = Math.min(b, c.b) }
    return r > l && b > t && (r - l) * (b - t) > 0.5 * box.width * box.height
  }
  const words = []
  const images = []
  const samples = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let run = 0
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|TEXTAREA|OPTION)$/.test(el.tagName)) continue
    // Not drawn: hidden, see-through, or inside a closed <details>.
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })) continue
    const cuts = cutsOf(el)
    run += 1
    const text = node.textContent
    const pattern = /\S+/g
    for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
      const range = document.createRange()
      range.setStart(node, match.index)
      range.setEnd(node, match.index + match[0].length)
      const box = range.getBoundingClientRect()
      if (box.width < 1 || box.height < 1 || !mostlyShown(box, cuts)) continue
      samples.push({ el, target: range, into: words, item: { t: match[0].toLocaleLowerCase(), x: box.left + scrollX, y: box.top + scrollY, w: box.width, h: box.height, run } })
    }
  }
  for (const img of document.images) {
    const box = img.getBoundingClientRect()
    if (box.width >= 1 && box.height >= 1 && img.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && mostlyShown(box, cutsOf(img.parentElement))) {
      samples.push({ el: img, target: img, into: images, item: { src: img.currentSrc || img.src, x: box.left + scrollX, y: box.top + scrollY, w: box.width, h: box.height } })
    }
  }
  const left = scrollX
  const top = scrollY
  const probe = document.createElement('style')
  probe.textContent = '* { pointer-events: auto !important; }'
  document.head.append(probe)
  const paints = new Map()
  const opaque = (el) => {
    if (paints.has(el)) return paints.get(el)
    const look = getComputedStyle(el)
    let answer = /^rgb\(/.test(look.backgroundColor)
    for (let parent = el; answer && parent; parent = parent.parentElement) {
      answer = getComputedStyle(parent).opacity === '1'
    }
    paints.set(el, answer)
    return answer
  }
  try {
    for (const { el, target, into, item } of samples) {
      const center = item.y + item.h / 2
      scrollTo({ top: Math.max(0, center - innerHeight / 2), behavior: 'instant' })
      const rect = target.getBoundingClientRect()
      const y = rect.top + rect.height / 2
      const xs = [0.25, 0.5, 0.75].map(ratio => rect.left + rect.width * ratio).filter(x => x >= 0 && x < innerWidth)
      const covered = xs.filter(x => {
        for (const hit of document.elementsFromPoint(x, y)) {
          if (hit === el || hit.contains(el)) return false
          if (opaque(hit)) return true
        }
        return false
      }).length
      if (!xs.length || covered <= xs.length / 2) into.push(item)
    }
  } finally {
    probe.remove()
    scrollTo({ left, top, behavior: 'instant' })
  }
  return { words, images, height: document.documentElement.scrollHeight }
}

async function drawnAt(browser, html, size, serve) {
  const context = await browser.newContext({ viewport: size, storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()
  try {
    if (serve) await serve(page)
    const identities = new Map()
    const hash = bytes => createHash('sha256').update(bytes).digest('hex')
    page.on('response', response => {
      if (response.request().resourceType() === 'image' && response.ok()) {
        identities.set(response.url(), response.body().then(hash).catch(() => response.url()))
      }
    })
    await page.setContent(html, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(150)
    const drawn = await page.evaluate(readDrawn)
    for (const image of drawn.images) {
      if (!identities.has(image.src) && /^data:image\//i.test(image.src)) {
        identities.set(image.src, fetch(image.src).then(response => response.arrayBuffer()).then(bytes => hash(Buffer.from(bytes))).catch(() => image.src))
      }
      image.src = (await identities.get(image.src)) ?? image.src
    }
    return drawn
  } finally {
    await context.close()
  }
}

test('static measurement distinguishes a painted cover from a transparent layer', async ({ browser }) => {
  const size = { width: 600, height: 300 }
  const card = '<p>One formula</p><img style="display:block;margin-top:500px" alt="Diagram" width="30" height="30" src="data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E">'
  const cover = colour => `<div style="position:fixed;inset:0;z-index:2;pointer-events:none;background:${colour}"></div>`
  const source = await drawnAt(browser, card, size)
  expect([source.words.length, source.images.length]).toEqual([2, 1])
  for (const colour of ['transparent', 'white', 'navy']) {
    const result = scoreFidelity(source, await drawnAt(browser, card + cover(colour), size))
    const expected = colour === 'transparent' ? 1 : 0
    expect([result.found, result.imagesNear], colour).toEqual([expected, expected])
  }
})

test('static measurement finds the same words behind a fixed header in either DOM order', async ({ browser }) => {
  const size = { width: 600, height: 300 }
  const header = '<header style="position:fixed;inset:0 0 auto;height:80px;background:white;z-index:2">Menu</header>'
  const badge = '<b style="position:fixed;right:20px;bottom:8px">Status</b><div style="position:fixed;right:0;top:130px;width:100px;height:40px;background:white"></div>'
  const word = (name, y) => `<p style="position:absolute;top:${y}px;left:20px;margin:0">${name}</p>`
  for (const pair of [[word('alpha', 1500), word('beta', 1420)], [word('beta', 1420), word('alpha', 1500)]]) {
    const result = await drawnAt(browser, header + '<main style="height:3000px"></main>' + pair.join('') + badge, size)
    expect(result.words.map(({ t }) => t).sort()).toEqual(['alpha', 'beta', 'menu', 'status'])
  }
})

test('static measurement counts every surplus copy of a visible formula', async ({ browser }) => {
  const size = { width: 600, height: 300 }
  const formula = '<p style="font:20px monospace">E=mc²</p>'
  const source = await drawnAt(browser, formula, size)
  const tripled = await drawnAt(browser, formula.repeat(3), size)
  const score = scoreFidelity(source, tripled)
  expect(score).toMatchObject({ found: 1, duplicateWords: 2, extraText: ['e=mc²'] })
  expect(score.duplicateArea).toBeGreaterThan(1000)
})

test('static measurement matches an embedded image to the same bytes in a site file', async ({ browser }) => {
  const size = { width: 600, height: 300 }
  const bytes = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="blue"/></svg>'
  const file = 'https://fidelity.invalid/diagram.svg'
  const image = src => `<img width="20" height="20" alt="Diagram" src="${src}">`
  const source = await drawnAt(browser, image('data:image/svg+xml;base64,' + Buffer.from(bytes).toString('base64')), size)
  expect(source.images).toHaveLength(1)
  for (const [colour, expected] of [['blue', 1], ['lime', 0]]) {
    let requests = 0
    const result = await drawnAt(browser, image(file), size, page => page.route(file, route => {
      requests += 1
      return route.fulfill({ contentType: 'image/svg+xml', body: bytes.replace('blue', colour) })
    }))
    expect(requests).toBe(1)
    expect(scoreFidelity(source, result).imagesNear, colour).toBe(expected)
  }
})

for (const entry of pages) {
  test(`fidelity: ${entry.name}`, async ({ page, browser }, testInfo) => {
    test.setTimeout(240_000)
    const source = fs.readFileSync(entry.file, 'utf8')
    const started = Date.now()
    const converted = await convertFidelityPage(page, source)
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
      expect.soft(scores[width], `${entry.name} at ${width}: duplicated text and its box area`).toMatchObject({ duplicateWords: 0, duplicateArea: 0 })
      expect.soft(scores[width].found, `${entry.name} at ${width}: share of words found`).toBeGreaterThanOrEqual(floor[width].found)
      expect.soft(scores[width].near, `${entry.name} at ${width}: share of words in place`).toBeGreaterThanOrEqual(floor[width].near)
      expect.soft(scores[width].imagesNear, `${entry.name} at ${width}: share of pictures in place`).toBeGreaterThanOrEqual(floor[width].images)
    }
    expect.soft(converted.blocks, `${entry.name}: blocks`).toBeLessThanOrEqual(floor.blocks)
    await assertFidelityJourney(browser, entry.name, source, converted.html)
  })
}
