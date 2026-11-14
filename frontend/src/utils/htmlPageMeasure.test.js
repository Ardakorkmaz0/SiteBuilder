import { afterEach, describe, expect, it, vi } from 'vitest'
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

  it('inlines computed CSS styles onto SVG descendants inside kept HTML blocks and standalone SVG images', async () => {
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
        const origAppend = document.body.appendChild.bind(document.body)
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
        void origAppend
      }
      return el
    })

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
    expect(svg.getAttribute('id')).toBeNull()
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
})
