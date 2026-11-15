import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { measureHtmlPage } from './htmlPageMeasure.js'

function decodeSvgDataUrl(src) {
  const match = /^data:image\/svg\+xml;base64,(.+)$/.exec(src || '')
  expect(match).not.toBeNull()
  const bytes = Uint8Array.from(atob(match[1]), (ch) => ch.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function installFrameStubs(doc, win) {
  win.scrollTo = () => {}
  if (!doc.fonts) doc.fonts = { ready: Promise.resolve() }
  const defaultRect = { left: 10, top: 10, right: 310, bottom: 90, width: 300, height: 80 }
  const rangeProto = win.Range?.prototype || Range.prototype
  if (!rangeProto.getBoundingClientRect) rangeProto.getBoundingClientRect = () => defaultRect
  const proto = win.Element?.prototype || Element.prototype
  proto.checkVisibility = () => true
  proto.getBoundingClientRect = function mockRect() {
    if (this.classList?.contains('skip')) return { left: -9999, top: 0, right: -9900, bottom: 24, width: 99, height: 24 }
    const tag = this.tagName?.toUpperCase()
    if (tag === 'BODY' || tag === 'HTML') return { left: 0, top: 0, right: 1200, bottom: 900, width: 1200, height: 900 }
    if (tag === 'SVG') return { left: 20, top: 20, right: 44, bottom: 44, width: 24, height: 24 }
    return defaultRect
  }
}

describe('measureHtmlPage SVG inlining', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    // Force fallback to readWithoutScripts where jsdom exposes contentDocument.
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      throw new Error('no blob url in jsdom')
    })

    const origCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName, ...rest) => {
      const el = origCreate(tagName, ...rest)
      if (String(tagName).toLowerCase() === 'iframe') {
        el.addEventListener('load', () => {
          if (el.contentDocument && el.contentWindow) {
            installFrameStubs(el.contentDocument, el.contentWindow)
          }
        }, true)
        // jsdom does not always load srcdoc iframes asynchronously; populate contentDocument if empty.
        queueMicrotask(() => {
          if (el.isConnected && el.srcdoc && el.contentDocument) {
            el.contentDocument.open()
            el.contentDocument.write(el.srcdoc)
            el.contentDocument.close()
            installFrameStubs(el.contentDocument, el.contentWindow)
            el.dispatchEvent(new Event('load'))
          }
        })
      }
      return el
    })
  })

  it('inlines computed CSS styles onto SVG descendants inside kept HTML blocks and standalone SVG images', async () => {
    const html = `<!doctype html>
<html>
<head>
<style>
  .form-icon { color: rgb(12, 34, 56); }
  .accent { fill: rgb(200, 10, 20); stroke: rgb(1, 2, 3); stroke-width: 2px; }
</style>
</head>
<body>
  <form id="contact">
    <svg id="inside-svg" class="form-icon" viewBox="0 0 24 24">
      <path id="inside-path" class="accent" d="M0 0h10v10z" />
    </svg>
  </form>
  <svg id="standalone-svg" class="form-icon" viewBox="0 0 24 24">
    <path class="accent" d="M0 0h10v10z" />
  </svg>
</body>
</html>`

    const reading = await measureHtmlPage(html, { width: 1200, height: 900, timeout: 2000 })
    expect(reading).not.toBeNull()

    const formNode = reading.root.kids.find((node) => node.kind === 'html')
    expect(formNode).toBeTruthy()
    const parsedForm = new DOMParser().parseFromString(formNode.code, 'text/html')
    const svg = parsedForm.querySelector('svg')
    const path = parsedForm.querySelector('path')

    expect(svg.getAttribute('class')).toBeNull()
    expect(svg.getAttribute('id')).toBe('inside-svg')
    expect(path.getAttribute('class')).toBeNull()
    expect(svg.getAttribute('style') || '').toContain('width:24px')
    expect(svg.getAttribute('style') || '').toContain('color:rgb(12, 34, 56)')
    const pathStyle = path.getAttribute('style') || ''
    expect(pathStyle).toContain('fill:rgb(200, 10, 20)')
    expect(pathStyle).toContain('stroke:rgb(1, 2, 3)')
    expect(pathStyle).toContain('stroke-width:2px')

    const imgNode = reading.root.kids.find((node) => node.kind === 'image')
    expect(imgNode).toBeTruthy()
    const decodedSvg = decodeSvgDataUrl(imgNode.src)
    expect(decodedSvg).toContain('fill:rgb(200, 10, 20)')
    expect(decodedSvg).toContain('stroke:rgb(1, 2, 3)')
  })

  it.each([false, true])('preserves SVG definition references and their computed styles (inside HTML: %s)', async (insideHtml) => {
    const svg = `<svg id="art" viewBox="0 0 24 24" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="paint"><stop class="first-stop" offset="0"/><stop offset="1" stop-color="blue"/></linearGradient>
        <clipPath id="clip"><rect width="24" height="24"/></clipPath>
        <mask id="stencil"><rect width="24" height="24" fill="white"/></mask>
        <filter id="shadow"><feGaussianBlur stdDeviation="1"/></filter>
        <path id="shape" d="M0 0h24v24z"/>
      </defs>
      <g class="painted"><use href="#shape"/><use xlink:href="#shape"/></g>
    </svg>`
    const html = `<!doctype html><html><head><style>
      .painted { fill: url(#paint); clip-path: url(#clip); mask: url(#stencil); filter: url(#shadow); }
      .first-stop { stop-color: rgb(200, 10, 20); stop-opacity: 0.5; }
    </style></head><body>${insideHtml ? `<form id="contact">${svg}</form>` : svg}</body></html>`

    const reading = await measureHtmlPage(html, { width: 1200, height: 900, timeout: 2000 })
    const output = insideHtml
      ? reading.root.kids.find((node) => node.kind === 'html').code
      : decodeSvgDataUrl(reading.root.kids.find((node) => node.kind === 'image').src)
    const parsed = new DOMParser().parseFromString(output, insideHtml ? 'text/html' : 'image/svg+xml')
    expect(parsed.querySelector('parsererror')).toBeNull()
    for (const id of ['paint', 'clip', 'stencil', 'shadow', 'shape']) {
      expect(parsed.getElementById(id)).not.toBeNull()
    }
    expect(parsed.querySelector('g').style.fill).toMatch(/^url\(["']?#paint["']?\)$/)
    expect(parsed.querySelector('g').style.clipPath).toMatch(/^url\(["']?#clip["']?\)$/)
    expect(parsed.querySelector('g').style.mask).toMatch(/^url\(["']?#stencil["']?\)$/)
    expect(parsed.querySelector('g').style.filter).toMatch(/^url\(["']?#shadow["']?\)$/)
    expect(parsed.querySelector('stop').style.stopColor).toBe('rgb(200, 10, 20)')
    expect(parsed.querySelector('stop').style.stopOpacity).toBe('0.5')
    expect(parsed.querySelectorAll('use')[0].getAttribute('href')).toBe('#shape')
    expect(parsed.querySelectorAll('use')[1].getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe('#shape')
    if (insideHtml) expect(parsed.querySelector('form').hasAttribute('id')).toBe(false)
  })

  it('keeps HTML ids wired to label[for] inside kept forms while removing unreferenced ids', async () => {
    const html = `<!doctype html><html><body>
      <form id="contact">
        <label for="user-email">Email</label>
        <input id="user-email" type="email" />
      </form>
    </body></html>`
    const reading = await measureHtmlPage(html, { width: 1200, height: 900, timeout: 2000 })
    const formNode = reading.root.kids.find((node) => node.kind === 'html')
    expect(formNode).toBeTruthy()
    const parsed = new DOMParser().parseFromString(formNode.code, 'text/html')
    expect(parsed.querySelector('form').hasAttribute('id')).toBe(false)
    expect(parsed.querySelector('input').getAttribute('id')).toBe('user-email')
  })

  it('merges inline-only children in text containers into rich runs, emits list item markers, and drops off-screen skip links', async () => {
    const html = `<!doctype html><html><head><style>
      .skip { position: absolute; left: -9999px; top: 0; }
      .kalem { text-decoration-line: underline; }
    </style></head><body>
      <a class="skip" href="#main">İçeriğe geç</a>
      <p id="highlight"><mark class="kalem"><strong>Önemli</strong><span class="tex"></span> nokta</mark></p>
      <ol start="3">
        <li id="rich-item"><span>Adım</span> <strong>üç</strong></li>
      </ol>
    </body></html>`

    const reading = await measureHtmlPage(html, { width: 1280, height: 900, timeout: 2000 })
    expect(reading).not.toBeNull()
    const serialized = JSON.stringify(reading.root)
    expect(serialized).not.toContain('İçeriğe geç')

    const pNode = reading.root.kids.find((node) => node.id === 'highlight')
    expect(pNode).toMatchObject({
      tag: 'p',
      kind: 'text',
      text: 'Önemli nokta',
    })
    expect(pNode.runs).toEqual([
      expect.objectContaining({ t: 'Önemli', u: 'underline' }),
      expect.objectContaining({ t: ' nokta', u: 'underline' }),
    ])

    const olNode = reading.root.kids.find((node) => node.tag === 'ol')
    expect(olNode).toBeTruthy()
    const liNode = olNode.kids[0]
    expect(liNode.id).toBe('rich-item')
    expect(liNode.kids).toHaveLength(2)
    expect(liNode.kids[0]).toMatchObject({ tag: 'span', kind: 'text', text: '3.' })
    expect(liNode.kids[1]).toMatchObject({ tag: 'li', kind: 'text', text: 'Adım üç' })
  })
})
