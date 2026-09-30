// Blocks sized by hand fit their box: which blocks, how the zoom is found, and
// that the editor and the published page get the same box, root and runtime.
import { afterEach, describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { FIT_TYPES, fitBoxContent, fitsBox, nativeFit } from './boxFit.js'
import { builderInteractiveJs } from './htmlRuntime.js'
import { htmlEmbedDocument } from './htmlEmbedDocument.js'
import { embedFitMode, htmlEmbedDocumentOptions } from './htmlSnippetSizing.js'
import { schemaToSingleHtml } from './schemaToFiles.js'

// A stand-in for a laid-out element: text that is `ink` px long on one line,
// wrapped into lines of `line` px at whatever width the root is given.
function fakeLayout({ W, H, ink = 0, line = 20, natural = null, widest = 0 }) {
  const style = {}
  const attrs = new Set()
  const width = () => parseFloat(style.width) || W
  const root = {
    style,
    setAttribute: (name) => attrs.add(name),
    removeAttribute: (name) => attrs.delete(name),
    get offsetWidth() { return natural ? natural.w : width() },
    get offsetHeight() { return natural ? natural.h : Math.ceil(ink / width()) * line },
    get clientWidth() { return width() },
    get scrollWidth() { return Math.max(width(), widest) },
    firstElementChild: null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: width(), height: 0 }),
  }
  return { box: { clientWidth: W, clientHeight: H }, root, attrs }
}

describe('which blocks fit', () => {
  it('a block sized by hand, of a kind that can', () => {
    expect(fitsBox({ type: 'heading', props: { fit: 'box' } })).toBe(true)
    expect(fitsBox({ type: 'heading', props: {} })).toBe(false)
    expect(fitsBox({ type: 'heading', props: { fit: 'off' } })).toBe(false)
    // A navbar or a section band has its own layout; it is not scaled.
    expect(fitsBox({ type: 'navbar', props: { fit: 'box' } })).toBe(false)
    expect(FIT_TYPES.has('html')).toBe(true)
  })

  it('text re-wraps; a control is scaled whole and fills its box', () => {
    expect(nativeFit({ type: 'text', props: { fit: 'box' } })).toEqual({ mode: 'reflow', fill: true })
    expect(nativeFit({ type: 'button', props: { fit: 'box' } })).toEqual({ mode: 'contain', fill: true })
    // An HTML block fits inside its own document instead.
    expect(nativeFit({ type: 'html', props: { fit: 'box' } })).toBeNull()
  })

  it('an HTML block by what it holds', () => {
    expect(embedFitMode({ type: 'html', props: { _paletteType: 'image' } })).toBe('cover')
    expect(embedFitMode({ type: 'html', props: { _paletteType: 'button' } })).toBe('contain')
    expect(embedFitMode({ type: 'html', props: { _paletteType: 'card' } })).toBe('reflow')
    // A rule stretches; zoomed, it would only get thicker.
    expect(embedFitMode({ type: 'html', props: { _paletteType: 'divider' } })).toBe('')
    expect(htmlEmbedDocumentOptions({ type: 'html', props: { _paletteType: 'divider' } }, 1, { fit: true }).fit).toBeUndefined()
  })
})

describe('the zoom', () => {
  it('grows text until the box is full, re-wrapped to its width', () => {
    const { box, root, attrs } = fakeLayout({ W: 400, H: 100, ink: 1200 })
    const z = fitBoxContent(box, root, 'reflow', true)
    // At this zoom the text, laid out at 400 / z, is as tall as the box allows.
    expect(root.offsetHeight * z).toBeLessThanOrEqual(100.5)
    expect(Math.ceil(1200 / (400 / (z * 1.02))) * 20 * z * 1.02).toBeGreaterThan(100)
    expect(root.style.transform).toBe(`scale(${z})`)
    expect(parseFloat(root.style.width)).toBeCloseTo(400 / z)
    expect(parseFloat(root.style.height)).toBeCloseTo(100 / z)
    // Long words were not allowed to break while it measured.
    expect(attrs.has('data-pwb-fit-measuring')).toBe(false)
  })

  it('shrinks it when the box is too small, and never lets a word spill', () => {
    const { box, root } = fakeLayout({ W: 120, H: 30, ink: 1200, widest: 150 })
    const z = fitBoxContent(box, root, 'reflow', true)
    expect(z).toBeLessThan(1)
    expect(150 * z).toBeLessThanOrEqual(121)
  })

  it('scales a control whole to the side that runs out first', () => {
    const { box, root } = fakeLayout({ W: 400, H: 100, natural: { w: 100, h: 40 } })
    expect(fitBoxContent(box, root, 'contain', true)).toBe(2.5)
  })

  it('leaves a photo to cover its box, unzoomed', () => {
    const { box, root } = fakeLayout({ W: 400, H: 100 })
    expect(fitBoxContent(box, root, 'cover', false)).toBe(1)
    expect([root.style.width, root.style.height, root.style.transform]).toEqual(['100%', '100%', 'none'])
  })
})

describe('on the published page', () => {
  const pages = []
  afterEach(() => pages.splice(0).forEach((page) => page.window.close()))
  const page = (components) => schemaToSingleHtml({ theme: {}, pages: [{ id: 'p', name: 'Home', background: '#ffffff', components }] }, 'Site')
  const heading = (props = {}, extra = {}) => ({
    id: 'h', type: 'heading', props: { text: 'Hello', level: 'h2', ...props },
    styles: { color: '#111111', fontSize: '32px' }, layout: { x: 10, y: 10, w: 400, h: 120 }, ...extra,
  })

  it('writes a resized block as a box around a root, its look on the inner node', () => {
    const html = page([heading({ fit: 'box' }, { stylesMobile: { fontSize: '20px' } })])
    const doc = new JSDOM(html).window.document
    const box = doc.querySelector('.c-h')
    const shell = box.querySelector('[data-pwb-fit="reflow"][data-pwb-fit-fill]')
    expect(shell.querySelector(':scope > [data-pwb-fit-root] > .ci-h h2').textContent).toBe('Hello')
    // The wrapper keeps its geometry; the heading's own look (and its phone
    // size) rides the inner node's rule.
    expect(html).toMatch(/\.ci-h \{[^}]*color: #111111/)
    expect(html).toMatch(/@media[\s\S]*\.ci-h \{ font-size: 20px; \}/)
    expect(html).not.toMatch(/\.c-h \{[^}]*color: #111111/)
  })

  it('writes a block never resized exactly as before', () => {
    const html = page([heading()])
    expect(html).not.toContain('data-pwb-fit=')
    expect(new JSDOM(html).window.document.querySelector('.c-h > h2').textContent).toBe('Hello')
  })

  it('fits a resized child of a section too, and an HTML block inside its frame', () => {
    const region = {
      id: 'r', type: 'region', props: {}, styles: {}, layout: { x: 0, y: 0, w: 1000, h: 400 },
      children: [heading({ fit: 'box' })],
    }
    const embed = { id: 'e', type: 'html', props: { code: '<p>Hi</p>', fit: 'box' }, styles: {}, layout: { x: 0, y: 420, w: 300, h: 100 } }
    const doc = new JSDOM(page([region, embed])).window.document
    expect(doc.querySelector('.region-child [data-pwb-fit="reflow"] [data-pwb-fit-root] h2')).not.toBeNull()
    const frame = new JSDOM(doc.querySelector('.c-e iframe').getAttribute('srcdoc')).window.document
    expect(frame.body.getAttribute('data-pwb-fit')).toBe('reflow')
    expect(frame.body.querySelector(':scope > [data-pwb-fit-root] > p').textContent).toBe('Hi')
  })

  it('keeps a nested button\'s link', () => {
    const region = {
      id: 'r', type: 'region', props: {}, styles: {}, layout: { x: 0, y: 0, w: 1000, h: 400 },
      children: [{ id: 'b', type: 'button', props: { text: 'Go', href: '/about' }, styles: {}, layout: { x: 0, y: 0, w: 120, h: 40 } }],
    }
    expect(new JSDOM(page([region])).window.document.querySelector('.region-child a').getAttribute('href')).toBe('/about')
  })

  it('is zoomed by the runtime the page carries', () => {
    const dom = new JSDOM(
      '<!DOCTYPE html><body><div id="box" data-pwb-fit="contain" data-pwb-fit-fill><div data-pwb-fit-root><a>Go</a></div></div></body>',
      { runScripts: 'outside-only' },
    )
    pages.push(dom)
    const { window } = dom
    const box = window.document.getElementById('box')
    const root = box.firstElementChild
    Object.defineProperties(box, { clientWidth: { value: 300 }, clientHeight: { value: 60 } })
    Object.defineProperties(root, { offsetWidth: { value: 100 }, offsetHeight: { value: 40 } })
    window.eval(builderInteractiveJs())
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'))
    expect(root.style.transform).toBe('scale(1.5)')
    expect(root.style.width).toBe('200px')
  })

  it('gives an HTML block its root, and a control its fill', () => {
    const doc = new JSDOM(htmlEmbedDocument('<a href="#">Go</a>', { fit: 'contain' })).window.document
    expect(doc.body.hasAttribute('data-pwb-fit-fill')).toBe(true)
    expect(doc.body.querySelector(':scope > [data-pwb-fit-root] > a')).not.toBeNull()
    expect(doc.head.querySelector('style[data-pwb-embed-fit]')).not.toBeNull()
  })
})
