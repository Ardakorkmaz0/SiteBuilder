// Reads an HTML page the way a browser draws it, for htmlToCanvas.js: every
// visible element with its box, its computed look and, for text, its words.
//
// The page is laid out in a hidden iframe whose sandbox grants no scripts, so
// what is measured is the page as it is written, not what its scripts would
// make of it. The result is plain data: nothing in it refers to the DOM.

import { withoutExecutableScripts } from './htmlRuntime.js'
import { MAX_PAGE_FONTS, fontSpecsFromHref } from './googleFonts.js'

// Formatting inside a line of text. An element made only of these (and text)
// is one piece of text.
const INLINE_TAGS = new Set([
  'A', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SMALL', 'MARK', 'CODE', 'SUP', 'SUB',
  'ABBR', 'CITE', 'Q', 'KBD', 'TIME', 'BR', 'WBR', 'FONT', 'DEL', 'INS',
])
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'TITLE', 'BASE', 'BR', 'WBR'])
// What the canvas has no block for: kept as it is, in an HTML block.
const KEPT_TAGS = new Set([
  'VIDEO', 'AUDIO', 'IFRAME', 'CANVAS', 'TABLE', 'FORM', 'INPUT', 'TEXTAREA', 'SELECT',
  'DETAILS', 'OBJECT', 'EMBED', 'PROGRESS', 'METER',
])
const SIZED_TAGS = new Set(['IMG', 'SVG', 'VIDEO', 'IFRAME', 'CANVAS', 'INPUT', 'TEXTAREA', 'SELECT', 'OBJECT', 'EMBED'])

// The look htmlToCanvas reads from each element.
const READ_STYLES = [
  'color', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition',
  'fontSize', 'fontWeight', 'fontFamily', 'fontStyle', 'textAlign', 'textDecorationLine',
  'textTransform', 'lineHeight', 'letterSpacing', 'boxShadow', 'opacity', 'objectFit',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
  'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius',
  'listStyleType', 'position', 'display',
]

// The part of the look that belongs to the words themselves.
const TEXT_STYLES = [
  'color', 'fontSize', 'fontWeight', 'fontFamily', 'fontStyle', 'textDecorationLine',
  'textTransform', 'lineHeight', 'letterSpacing',
]

// Written into a kept element so it looks the same on its own, away from the
// page's stylesheet. Inherited ones are written where they change.
const INHERITED = [
  'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height',
  'letter-spacing', 'text-align', 'text-transform', 'white-space', 'list-style-type',
  'border-collapse', 'border-spacing', 'cursor', 'fill', 'stroke',
]
const OWN = [
  'display', 'flex-direction', 'flex-wrap', 'align-items', 'justify-content', 'align-self',
  'flex-grow', 'flex-shrink', 'flex-basis', 'gap', 'grid-template-columns', 'grid-column',
  'grid-row', 'margin', 'padding', 'box-sizing', 'background-color', 'background-image',
  'text-decoration-line', 'text-decoration-color', 'border-top', 'border-right',
  'border-bottom', 'border-left', 'border-radius', 'box-shadow', 'opacity', 'vertical-align',
  'object-fit', 'overflow',
]

function readStyles(cs) {
  const out = {}
  for (const key of READ_STYLES) out[key] = cs[key]
  return out
}

function boxOf(rect, win) {
  return {
    x: rect.left + win.scrollX,
    y: rect.top + win.scrollY,
    w: rect.width,
    h: rect.height,
  }
}

// Where the words themselves are drawn, which is not always the middle of
// the element that holds them (a box with a fixed height, a tall grid cell).
function inkOf(el, win) {
  const range = el.ownerDocument.createRange()
  range.selectNodeContents(el)
  return boxOf(range.getBoundingClientRect(), win)
}

function hidden(cs) {
  return cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse'
}

// A copy of `el` that carries its look in style attributes.
function standaloneHtml(el, win, fill) {
  const doc = el.ownerDocument
  const plain = new Map()
  const defaults = (tag) => {
    if (!plain.has(tag)) {
      const probe = doc.createElement(tag)
      doc.body.appendChild(probe)
      const cs = win.getComputedStyle(probe)
      plain.set(tag, Object.fromEntries(OWN.map((key) => [key, cs.getPropertyValue(key)])))
      probe.remove()
    }
    return plain.get(tag)
  }
  const copy = el.cloneNode(true)
  const pairs = [[el, copy]]
  const from = [...el.querySelectorAll('*')]
  const to = [...copy.querySelectorAll('*')]
  from.forEach((node, index) => pairs.push([node, to[index]]))
  for (const [node, target] of pairs) {
    if (!target || node.namespaceURI !== 'http://www.w3.org/1999/xhtml') continue
    const cs = win.getComputedStyle(node)
    const root = node === el
    const parent = root ? null : win.getComputedStyle(node.parentElement)
    const css = []
    for (const key of INHERITED) {
      const value = cs.getPropertyValue(key)
      if (value && (root || value !== parent.getPropertyValue(key))) css.push(`${key}:${value}`)
    }
    const base = defaults(node.tagName)
    for (const key of OWN) {
      const value = cs.getPropertyValue(key)
      if (value && value !== base[key]) css.push(`${key}:${value}`)
    }
    if (root) css.push('margin:0', ...(fill ? ['width:100%', 'height:100%'] : []))
    else if (SIZED_TAGS.has(node.tagName.toUpperCase())) {
      const rect = node.getBoundingClientRect()
      css.push(`width:${Math.round(rect.width)}px`, `height:${Math.round(rect.height)}px`)
    }
    target.setAttribute('style', css.join(';'))
    target.removeAttribute('class')
  }
  return copy.outerHTML
}

function svgImage(el, cs) {
  const copy = el.cloneNode(true)
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  // `currentColor` has nothing to refer to once the drawing is a picture.
  copy.style.color = cs.color
  const text = new XMLSerializer().serializeToString(copy)
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return `data:image/svg+xml;base64,${btoa(binary)}`
}

function measureNode(el, win) {
  const tag = el.tagName.toUpperCase()
  if (SKIP_TAGS.has(tag)) return null
  const cs = win.getComputedStyle(el)
  if (hidden(cs)) return null
  const rect = boxOf(el.getBoundingClientRect(), win)
  const node = { tag: tag.toLowerCase(), rect, s: readStyles(cs) }
  if (tag === 'A') node.href = el.getAttribute('href') || ''

  if (tag === 'IMG') {
    return { ...node, kind: 'image', src: el.currentSrc || el.getAttribute('src') || '', alt: el.getAttribute('alt') || '' }
  }
  if (tag === 'PICTURE') {
    const img = el.querySelector('img')
    return img ? measureNode(img, win) : null
  }
  if (tag === 'SVG') return { ...node, kind: 'image', src: svgImage(el, cs), alt: el.getAttribute('aria-label') || '' }
  if (tag === 'HR') return { ...node, kind: 'line' }
  if (KEPT_TAGS.has(tag)) {
    return { ...node, kind: 'html', code: standaloneHtml(el, win, tag !== 'TABLE' && tag !== 'FORM' && tag !== 'DETAILS') }
  }

  const elements = [...el.children].filter((child) => !SKIP_TAGS.has(child.tagName.toUpperCase()))
  const inlineOnly = [...el.querySelectorAll('*')].every((child) => {
    const name = child.tagName.toUpperCase()
    return INLINE_TAGS.has(name) && win.getComputedStyle(child).display.startsWith('inline')
  })
  const words = (el.innerText ?? el.textContent ?? '').trim()

  if ((tag === 'UL' || tag === 'OL') && cs.listStyleType !== 'none' && elements.length
    && elements.every((item) => item.tagName === 'LI' && !item.querySelector('*'))) {
    return {
      ...node,
      kind: 'list',
      ordered: tag === 'OL',
      items: elements.map((item) => (item.innerText ?? item.textContent ?? '').trim()),
      s: { ...node.s, ...readStyles(win.getComputedStyle(elements[0])), backgroundColor: node.s.backgroundColor },
    }
  }

  const directText = [...el.childNodes].some((child) => child.nodeType === 3 && child.textContent.trim())
  if (inlineOnly && words && directText) {
    // Formatting the canvas's text block cannot hold: a link inside the
    // sentence, or a run of it in another weight, slant or colour.
    const rich = [...el.querySelectorAll('*')].some((child) => {
      if (!(child.textContent || '').trim()) return false
      if (child.tagName === 'A' && child.getAttribute('href')) return true
      const inner = win.getComputedStyle(child)
      return inner.fontWeight !== cs.fontWeight || inner.fontStyle !== cs.fontStyle
        || inner.color !== cs.color || inner.textDecorationLine !== cs.textDecorationLine
        || inner.backgroundColor !== 'rgba(0, 0, 0, 0)'
    })
    return rich
      ? { ...node, kind: 'html', code: standaloneHtml(el, win, false) }
      : { ...node, kind: 'text', text: words, ink: inkOf(el, win) }
  }
  if (inlineOnly && words && elements.length === 1) {
    // One run of formatting around all of the words (<h1><span>…</span></h1>,
    // <p><a>…</a></p>): the words take its look, the box stays this element's.
    let inner = elements[0]
    let href = node.href
    for (;;) {
      if (inner.tagName === 'A') href = href || inner.getAttribute('href') || ''
      const own = [...inner.childNodes].some((child) => child.nodeType === 3 && child.textContent.trim())
      if (own || inner.children.length !== 1) break
      inner = inner.children[0]
    }
    if (!inner.children.length) {
      const look = readStyles(win.getComputedStyle(inner))
      const text = {}
      for (const key of TEXT_STYLES) text[key] = look[key]
      return { ...node, kind: 'text', text: words, ink: inkOf(el, win), ...(href !== undefined ? { href } : {}), s: { ...node.s, ...text } }
    }
  }

  const kids = []
  for (const child of el.childNodes) {
    if (child.nodeType === 1) {
      const measured = measureNode(child, win)
      if (measured) kids.push(measured)
    } else if (child.nodeType === 3 && child.textContent.trim()) {
      // Words that sit beside elements, with no element of their own.
      const range = el.ownerDocument.createRange()
      range.selectNodeContents(child)
      const box = boxOf(range.getBoundingClientRect(), win)
      if (box.w >= 1 && box.h >= 1) {
        kids.push({
          tag: '#text',
          kind: 'text',
          text: child.textContent.trim().replace(/\s+/g, ' '),
          rect: box,
          s: { ...node.s, backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none', boxShadow: 'none', borderTopWidth: '0px', borderRightWidth: '0px', borderBottomWidth: '0px', borderLeftWidth: '0px', paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px' },
        })
      }
    }
  }
  return { ...node, kids }
}

const settle = (win, ms) => new Promise((resolve) => win.setTimeout(resolve, ms))

// Lay `html` out `width` pixels wide and read it. Resolves null when the page
// cannot be read.
export function measureHtmlPage(html, { width = 1200, height = 900, timeout = 12000 } = {}) {
  return new Promise((resolve) => {
    const win = window
    let frame
    let settled = false
    const done = (result) => {
      if (settled) return
      settled = true
      try { frame?.remove() } catch { /* already gone */ }
      resolve(result)
    }
    try {
      const source = String(html || '')
      const scripts = (source.match(/<script\b/gi) || []).length
      frame = document.createElement('iframe')
      // DOM access for reading, and no scripts under the editor's origin.
      frame.setAttribute('sandbox', 'allow-same-origin')
      frame.setAttribute('aria-hidden', 'true')
      frame.setAttribute('tabindex', '-1')
      frame.style.cssText = [
        'position:fixed', 'left:-20000px', 'top:0', `width:${width}px`, `height:${height}px`,
        'visibility:hidden', 'pointer-events:none', 'border:0',
      ].join(';')
      const timer = win.setTimeout(() => done(null), timeout)
      frame.addEventListener('load', async () => {
        try {
          const doc = frame.contentDocument
          const inner = frame.contentWindow
          if (!doc?.body || !inner) return done(null)
          // Entrance effects wait for a script that will not run here: read
          // the page as it stands once they have played.
          const still = doc.createElement('style')
          still.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'
          doc.head?.appendChild(still)
          await Promise.race([doc.fonts?.ready || Promise.resolve(), settle(win, 4000)])
          await Promise.race([
            Promise.all([...doc.images].map((img) => (img.complete ? null : new Promise((ok) => { img.onload = ok; img.onerror = ok })))),
            settle(win, 2500),
          ])
          const bodyStyle = inner.getComputedStyle(doc.body)
          const rootStyle = inner.getComputedStyle(doc.documentElement)
          const root = measureNode(doc.body, inner)
          win.clearTimeout(timer)
          done(root && {
            width,
            height: Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight),
            background: [bodyStyle.backgroundColor, rootStyle.backgroundColor],
            fontFamily: bodyStyle.fontFamily,
            title: doc.title || '',
            description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            language: doc.documentElement.getAttribute('lang') || '',
            scripts,
            // The web fonts the document asks Google Fonts for.
            fonts: [...new Set([...doc.querySelectorAll('link[rel~="stylesheet"][href]')].flatMap((link) => fontSpecsFromHref(link.getAttribute('href'))))].slice(0, MAX_PAGE_FONTS),
            root,
          })
        } catch {
          done(null)
        }
      })
      frame.srcdoc = withoutExecutableScripts(source)
      document.body.appendChild(frame)
    } catch {
      done(null)
    }
  })
}
