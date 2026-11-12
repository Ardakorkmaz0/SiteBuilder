// Reads an HTML page the way a browser draws it, for htmlToCanvas.js: every
// visible element with its box, its computed look and, for text, its words.
//
// The page is laid out in a hidden iframe with its own scripts running, as it
// is in the editor's View: a page that builds or reveals its content with a
// script is read as its owner sees it, not as its bare source. The frame is
// sandboxed without allow-same-origin, so those scripts cannot reach the
// editor; the reading is done by a function written INTO the document, which
// posts plain data back.

import { MAX_PAGE_FONTS, fontSpecsFromHref } from './googleFonts.js'
import { withoutExecutableScripts } from './htmlRuntime.js'

// Reads the document it is in, or the one in `frameWindow`. It is shipped
// into the measured document as source text, so it must stand alone: nothing
// from this module may be used inside it. Resolves with the reading, and
// posts it to the parent when a `token` is given.
function readPage(token, frameWindow) {
  // Formatting inside a line of text. An element made only of these (and
  // text) is one piece of text.
  const INLINE_TAGS = new Set([
    'A', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SMALL', 'MARK', 'CODE', 'SUP', 'SUB',
    'ABBR', 'CITE', 'Q', 'KBD', 'TIME', 'BR', 'WBR', 'FONT', 'DEL', 'INS',
  ])
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'TITLE', 'BASE', 'BR', 'WBR'])
  // What the canvas has no block for: kept as it is, in an HTML block.
  const KEPT_TAGS = new Set([
    'VIDEO', 'AUDIO', 'IFRAME', 'CANVAS', 'FORM', 'INPUT', 'TEXTAREA', 'SELECT',
    'OBJECT', 'EMBED', 'PROGRESS', 'METER',
  ])
  const FLOWING = new Set(['FORM'])
  // The fields the canvas's own input and select blocks draw.
  const FIELD_TYPES = new Set(['text', 'search', 'email', 'number', 'tel', 'url', 'password', 'date', 'time', 'textarea', 'select'])
  const DRAWN_FIELDS = new Set(['checkbox', 'radio', 'range'])
  // A formula as a typesetter lays it out (KaTeX, MathJax, MathML): hundreds
  // of positioned glyph pieces that mean nothing apart. It is carried as a
  // picture of itself.
  const MATH = '.katex-display, .katex, mjx-container, .MathJax, math'
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
    'listStyleType', 'position', 'display', 'fontVariantNumeric',
  ]
  // The part of the look that belongs to the words themselves.
  const TEXT_STYLES = [
    'color', 'fontSize', 'fontWeight', 'fontFamily', 'fontStyle', 'textDecorationLine',
    'textTransform', 'lineHeight', 'letterSpacing', 'fontVariantNumeric',
  ]
  // Written into a kept element so it looks the same on its own, away from
  // the page's stylesheet. Inherited ones are written where they change.
  const INHERITED = [
    'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height',
    'letter-spacing', 'text-align', 'text-transform', 'white-space', 'list-style-type',
    'border-collapse', 'border-spacing', 'cursor', 'fill', 'stroke',
  ]
  const OWN = [
    'display', 'position', 'top', 'left', 'flex-direction', 'flex-wrap', 'align-items', 'justify-content',
    'align-self', 'flex-grow', 'flex-shrink', 'flex-basis', 'gap', 'grid-template-columns', 'grid-column',
    'grid-row', 'margin', 'padding', 'box-sizing', 'background-color', 'background-image',
    'text-decoration-line', 'text-decoration-color', 'border-top', 'border-right',
    'border-bottom', 'border-left', 'border-radius', 'box-shadow', 'opacity', 'vertical-align',
    'object-fit', 'overflow', 'min-width',
  ]
  const win = frameWindow || window
  const doc = win.document
  const stats = { hidden: 0 }
  // Pictures still to be drawn once the page has been walked.
  let jobs = []

  const readStyles = (cs) => {
    const out = {}
    for (const key of READ_STYLES) out[key] = cs[key]
    return out
  }
  const boxOf = (rect) => ({ x: rect.left + win.scrollX, y: rect.top + win.scrollY, w: rect.width, h: rect.height })
  // Where the words themselves are drawn, which is not always the middle of
  // the element that holds them (a box with a fixed height, a tall grid cell).
  const inkOf = (el) => {
    const range = doc.createRange()
    range.selectNodeContents(el)
    return boxOf(range.getBoundingClientRect())
  }
  const isHidden = (cs) => cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse'
  const ownText = (el) => [...el.childNodes].some((child) => child.nodeType === 3 && child.textContent.trim())
  const wordsOf = (el) => (el.innerText ?? el.textContent ?? '').trim()
  const inlineLevel = (el) => /^(inline|contents|ruby|math)/.test(win.getComputedStyle(el).display)

  // A copy of `el` that carries its look in style attributes.
  const plain = new Map()
  const defaultsOf = (tag) => {
    if (!plain.has(tag)) {
      const probe = doc.createElement(tag)
      doc.body.appendChild(probe)
      const cs = win.getComputedStyle(probe)
      const values = {}
      for (const key of OWN) values[key] = cs.getPropertyValue(key)
      plain.set(tag, values)
      probe.remove()
    }
    return plain.get(tag)
  }
  const standaloneHtml = (el, fill) => standaloneCopy(el, fill).outerHTML
  const standaloneCopy = (el, fill) => {
    const copy = el.cloneNode(true)
    const from = [el, ...el.querySelectorAll('*')]
    const to = [copy, ...copy.querySelectorAll('*')]
    from.forEach((node, index) => {
      const target = to[index]
      if (!target || node.namespaceURI !== 'http://www.w3.org/1999/xhtml') return
      const cs = win.getComputedStyle(node)
      const root = node === el
      const parent = root ? null : win.getComputedStyle(node.parentElement)
      const css = []
      for (const key of INHERITED) {
        const value = cs.getPropertyValue(key)
        if (value && (root || value !== parent.getPropertyValue(key))) css.push(`${key}:${value}`)
      }
      const base = defaultsOf(node.tagName)
      for (const key of OWN) {
        const value = cs.getPropertyValue(key)
        if (value && value !== base[key]) css.push(`${key}:${value}`)
      }
      if (root) css.push('margin:0', ...(fill ? ['width:100%', 'height:100%'] : []))
      else if (SIZED_TAGS.has(node.tagName.toUpperCase()) || cs.display === 'inline-block') {
        // What the page sized by itself, and what holds a line open (the
        // struts a formula is built from), keeps its measured size.
        const rect = node.getBoundingClientRect()
        css.push(`width:${Math.round(rect.width * 100) / 100}px`, `height:${Math.round(rect.height * 100) / 100}px`)
      }
      target.setAttribute('style', css.join(';'))
      target.removeAttribute('class')
      target.removeAttribute('id')
    })
    return copy
  }

  // The @font-face rules the document carries inside itself.
  let faces = null
  const fontFaces = () => {
    if (faces) return faces
    faces = []
    for (const sheet of doc.styleSheets) {
      let rules = []
      try { rules = [...sheet.cssRules] } catch { /* a stylesheet from elsewhere keeps its rules to itself */ }
      for (const rule of rules) {
        if (rule.constructor?.name !== 'CSSFontFaceRule' && rule.type !== 5) continue
        const family = (rule.style?.getPropertyValue('font-family') || '').replace(/["']/g, '').trim()
        if (family && /url\(\s*["']?data:/i.test(rule.cssText)) faces.push({ family, css: rule.cssText })
      }
    }
    return faces
  }

  // The page's own stylesheet, without its fonts (those come separately):
  // a formula is laid out by class rules, and a copy drawn without them
  // falls apart (an accent leaves its letter, a sum loses its limits).
  let sheetText = null
  const pageCss = () => {
    if (sheetText !== null) return sheetText
    const parts = []
    for (const sheet of doc.styleSheets) {
      let rules = []
      try { rules = [...sheet.cssRules] } catch { /* a stylesheet from elsewhere keeps its rules to itself */ }
      for (const rule of rules) {
        if (rule.constructor?.name === 'CSSFontFaceRule' || rule.type === 5) continue
        parts.push(rule.cssText)
      }
    }
    sheetText = parts.join('\n')
    return sheetText
  }

  // The box of everything `el` draws: an inline element's own box is one
  // line of its font, whatever stands taller or deeper inside it.
  const inkBox = (el) => {
    // A field draws its own box, whatever its parent made of it (a flex
    // item counts as a block).
    if (el.tagName === 'INPUT') {
      const rect = el.getBoundingClientRect()
      return rect.width >= 0.5 && rect.height >= 0.5 ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } : null
    }
    let box = null
    const add = (rect) => {
      if (rect.width < 0.5 || rect.height < 0.5) return
      box = box
        ? { left: Math.min(box.left, rect.left), top: Math.min(box.top, rect.top), right: Math.max(box.right, rect.right), bottom: Math.max(box.bottom, rect.bottom) }
        : { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
    }
    for (const node of [el, ...el.querySelectorAll('*')]) {
      const cs = win.getComputedStyle(node)
      // What a formula keeps for screen readers is clipped out of sight.
      if (isHidden(cs) || (cs.position === 'absolute' && cs.clip !== 'auto')) continue
      // A block's box is room, not ink: a formula set on its own line sits
      // in the middle of a box as wide as the page.
      if (/^(block|flex|grid|list-item|table|flow-root)$/.test(cs.display)) continue
      for (const rect of node.getClientRects()) add(rect)
    }
    return box
  }

  // A picture of `el` as the page draws it, as a PNG. The element is drawn
  // from a copy that carries its own look and the fonts it is set in.
  // The same formula is written many times on a page of notes: it is drawn
  // once, and each place it stands gets that drawing at its own position.
  const drawn = new Map()
  const picture = async (el) => {
    const box = inkBox(el)
    if (!box) return null
    const look = win.getComputedStyle(el)
    const key = `${el.outerHTML}|${look.fontSize}|${look.color}|${look.accentColor}|${look.width}|${look.height}`
    if (drawn.has(key)) {
      const src = await drawn.get(key)
      return src ? { src, box: { left: box.left - 1, top: box.top - 1, width: Math.ceil(box.right - box.left) + 2, height: Math.ceil(box.bottom - box.top) + 2 } } : null
    }
    let keep
    drawn.set(key, new Promise((resolve) => { keep = resolve }))
    const made = await drawPicture(el, box).catch(() => null)
    keep(made ? made.src : null)
    return made
  }
  const drawPicture = async (el, box) => {
    const width = Math.ceil(box.right - box.left) + 2
    const height = Math.ceil(box.bottom - box.top) + 2
    const host = el.parentElement
    const hostStyle = win.getComputedStyle(host)
    const context = ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'color', 'text-align', 'white-space']
      .map((key) => `${key}:${hostStyle.getPropertyValue(key)}`).join(';')
    // Laid out once more beside the page, alone, to learn where its ink
    // falls inside a box of its own.
    const stage = doc.createElement('div')
    stage.setAttribute('style', `position:absolute;left:0;top:0;opacity:0;pointer-events:none;white-space:nowrap;${context}`)
    // A copy as it is, classes and all: the page's rules lay it out here,
    // and the same rules go into the picture with it.
    const copy = el.cloneNode(true)
    // A field takes its size and colour from rules about where it stands
    // (".done input"), which do not reach a copy standing alone.
    if (el.tagName === 'INPUT') {
      const own = win.getComputedStyle(el)
      for (const name of ['width', 'height', 'accent-color', 'color', 'opacity', 'vertical-align']) copy.style.setProperty(name, own.getPropertyValue(name))
      copy.style.setProperty('margin', '0')
      if (el.checked) copy.setAttribute('checked', '')
      else copy.removeAttribute('checked')
      if (el.type === 'range') copy.setAttribute('value', el.value)
    }
    stage.appendChild(copy)
    doc.body.appendChild(stage)
    const alone = inkBox(copy)
    const origin = stage.getBoundingClientRect()
    stage.remove()
    if (!alone) return null
    const used = new Set()
    for (const node of [el, ...el.querySelectorAll('*')]) {
      for (const name of win.getComputedStyle(node).fontFamily.split(',')) used.add(name.replace(/["']/g, '').trim())
    }
    const fonts = fontFaces().filter((face) => used.has(face.family)).map((face) => face.css).join('')
    const markup = new XMLSerializer().serializeToString(copy)
    const rules = `${fonts}\n${pageCss()}`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><style>${rules.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</style>`
      + `<foreignObject x="0" y="0" width="${width}" height="${height}"><div xmlns="http://www.w3.org/1999/xhtml" style="position:absolute;left:${1 - (alone.left - origin.left)}px;top:${1 - (alone.top - origin.top)}px;white-space:nowrap;${context.replace(/"/g, '&quot;')}">${markup}</div></foreignObject></svg>`
    const image = new win.Image()
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    await Promise.race([image.decode(), settle(4000).then(() => { throw new Error('too slow') })])
    const canvas = doc.createElement('canvas')
    const scale = 2
    canvas.width = width * scale
    canvas.height = height * scale
    const pen = canvas.getContext('2d')
    pen.scale(scale, scale)
    pen.drawImage(image, 0, 0, width, height)
    return { src: canvas.toDataURL('image/png'), box: { left: box.left - 1, top: box.top - 1, width, height } }
  }

  // Where the line of text `el` sits in has its baseline.
  const baselineAt = (el) => {
    const probe = doc.createElement('span')
    probe.setAttribute('style', 'display:inline-block;width:0;height:0;padding:0;margin:0;border:0')
    el.parentNode.insertBefore(probe, el)
    const y = probe.getBoundingClientRect().bottom
    probe.remove()
    return y
  }

  // The words of a piece of running text with the formatting of each run,
  // as utils/richText.js keeps them. A piece that is not text (a formula, a
  // small picture, a box set in the line) is a picture in the line.
  const runsOf = (el, cs, node) => {
    const runs = []
    const same = (a, b) => ['b', 'i', 'u', 'c', 'bg', 'f', 'z', 'v', 'href'].every((key) => a[key] === b[key])
    const push = (run) => {
      const last = runs[runs.length - 1]
      if (last && last.t !== undefined && run.t !== undefined && same(last, run)) last.t += run.t
      else runs.push(run)
    }
    const visit = (parent, marks) => {
      for (const child of parent.childNodes) {
        if (child.nodeType === 3) {
          const words = child.textContent.replace(/\s+/g, ' ')
          if (words) push({ ...marks, t: words })
          continue
        }
        if (child.nodeType !== 1) continue
        const name = child.tagName.toUpperCase()
        if (name === 'BR') { push({ ...marks, t: '\n' }); continue }
        if (SKIP_TAGS.has(name)) continue
        const inner = win.getComputedStyle(child)
        if (isHidden(inner)) continue
        const link = marks.href !== undefined ? { href: marks.href } : {}
        if (name === 'IMG') {
          const rect = child.getBoundingClientRect()
          runs.push({ ...link, img: child.currentSrc || child.getAttribute('src') || '', w: rect.width, h: rect.height, va: baselineAt(child) - rect.bottom, alt: child.getAttribute('alt') || '' })
          continue
        }
        if (name === 'SVG' || child.matches(MATH) || /^inline-/.test(inner.display)) {
          const run = { ...link, img: '', w: 0, h: 0, va: 0, alt: (child.getAttribute('aria-label') || '').slice(0, 300) }
          runs.push(run)
          jobs.push({
            el: child,
            node,
            owner: el,
            done: (made) => {
              run.img = made.src
              run.w = made.box.width
              run.h = made.box.height
              run.va = baselineAt(child) - (made.box.top + made.box.height)
              // The room the piece took in its line, which is not the size of
              // its ink: a formula's glyphs reach past it. The picture is set
              // back so it takes that room, its ink where it was.
              const room = child.getBoundingClientRect()
              run.ml = Math.round((made.box.left - room.left) * 100) / 100
              run.mr = Math.round((room.right - (made.box.left + made.box.width)) * 100) / 100
            },
          })
          continue
        }
        const next = { ...marks }
        if (inner.fontWeight !== cs.fontWeight) next.b = inner.fontWeight
        if (inner.fontStyle !== cs.fontStyle) next.i = inner.fontStyle === 'italic' || inner.fontStyle === 'oblique' ? 'italic' : 'normal'
        if (inner.textDecorationLine !== 'none' && inner.textDecorationLine !== cs.textDecorationLine) next.u = inner.textDecorationLine
        if (inner.color !== cs.color) next.c = inner.color
        if (inner.backgroundColor !== 'rgba(0, 0, 0, 0)') next.bg = inner.backgroundColor
        if (inner.fontFamily !== cs.fontFamily) next.f = inner.fontFamily.replace(/"/g, "'")
        if (inner.fontSize !== cs.fontSize) next.z = `${Math.round(parseFloat(inner.fontSize) * 100) / 100}px`
        if (inner.verticalAlign === 'super' || inner.verticalAlign === 'sub') next.v = inner.verticalAlign
        if (name === 'A' && child.getAttribute('href')) next.href = child.getAttribute('href')
        visit(child, next)
      }
    }
    visit(el, {})
    // Space as a browser collapses it: none at the ends, one between words.
    for (let index = 0; index < runs.length; index += 1) {
      const run = runs[index]
      if (run.t === undefined) continue
      const before = runs[index - 1]
      if (index === 0 || (before && before.t !== undefined && /[ \n]$/.test(before.t))) run.t = run.t.replace(/^ +/, '')
      if (index === runs.length - 1) run.t = run.t.replace(/ +$/, '')
    }
    return runs.filter((run) => run.t === undefined || run.t !== '')
  }

  const svgImage = (el, cs) => {
    const copy = el.cloneNode(true)
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    // `currentColor` has nothing to refer to once the drawing is a picture.
    copy.style.color = cs.color
    const bytes = new TextEncoder().encode(new XMLSerializer().serializeToString(copy))
    let binary = ''
    bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
    return `data:image/svg+xml;base64,${btoa(binary)}`
  }

  const measureNode = (el) => {
    const tag = el.tagName.toUpperCase()
    if (SKIP_TAGS.has(tag)) return null
    const cs = win.getComputedStyle(el)
    if (isHidden(cs)) {
      // A part with words in it that the page is not showing now: another
      // chapter, a closed menu, an answer behind a button.
      if ((el.textContent || '').trim().length >= 40) stats.hidden += 1
      return null
    }
    const node = { tag: tag.toLowerCase(), rect: boxOf(el.getBoundingClientRect()), s: readStyles(cs) }
    if (tag === 'A') node.href = el.getAttribute('href') || ''
    if (el.id) node.id = el.id

    if (tag === 'IMG') {
      return { ...node, kind: 'image', src: el.currentSrc || el.getAttribute('src') || '', alt: el.getAttribute('alt') || '' }
    }
    if (tag === 'PICTURE') {
      const img = el.querySelector('img')
      return img ? measureNode(img) : null
    }
    if (tag === 'SVG') return { ...node, kind: 'image', src: svgImage(el, cs), alt: el.getAttribute('aria-label') || '' }
    if (tag === 'HR') return { ...node, kind: 'line' }
    if (tag === 'CANVAS') {
      // A chart a script drew: copied as it is, it would be an empty frame.
      // What it shows now is the picture.
      let src = ''
      try { src = el.toDataURL('image/png') } catch { /* drawn from elsewhere: kept below */ }
      if (src.length > 200) return { ...node, kind: 'image', src, alt: el.getAttribute('aria-label') || '', s: { ...node.s, objectFit: 'fill' } }
    }
    // A field the canvas has a block of its own for.
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      const type = tag === 'TEXTAREA' ? 'textarea' : tag === 'SELECT' ? 'select' : (el.getAttribute('type') || 'text').toLowerCase()
      // A tick box, a round choice or a slider is carried as a picture of
      // itself as the browser draws it: the canvas has no block for them.
      if (DRAWN_FIELDS.has(type)) {
        const drawn = { ...node, kind: 'image', src: '', alt: el.getAttribute('aria-label') || '', s: { ...node.s, objectFit: 'fill' } }
        jobs.push({ el, node: drawn, owner: el, done: (made) => { drawn.src = made.src; drawn.rect = { x: made.box.left + win.scrollX, y: made.box.top + win.scrollY, w: made.box.width, h: made.box.height } } })
        return drawn
      }
      if (FIELD_TYPES.has(type)) {
        const options = tag === 'SELECT' ? [...el.options] : []
        return {
          ...node,
          kind: 'field',
          field: {
            type,
            placeholder: el.getAttribute('placeholder') || '',
            options: options.filter((option) => !option.disabled).map((option) => option.textContent.trim()).filter(Boolean),
            prompt: (options.find((option) => option.disabled && !option.value) || {}).textContent?.trim() || '',
          },
        }
      }
    }
    if (el.matches(MATH)) {
      const drawn = { ...node, kind: 'image', src: '', alt: (el.getAttribute('aria-label') || '').slice(0, 300), s: { ...node.s, objectFit: 'fill' } }
      jobs.push({ el, node: drawn, owner: el, done: (made) => { drawn.src = made.src; drawn.rect = { x: made.box.left + win.scrollX, y: made.box.top + win.scrollY, w: made.box.width, h: made.box.height } } })
      return drawn
    }
    if (KEPT_TAGS.has(tag)) return { ...node, kind: 'html', code: standaloneHtml(el, !FLOWING.has(tag)) }

    const elements = [...el.children].filter((child) => !SKIP_TAGS.has(child.tagName.toUpperCase()))
    const inside = [...el.querySelectorAll('*')]
    const words = wordsOf(el)

    if ((tag === 'UL' || tag === 'OL') && cs.listStyleType !== 'none' && elements.length
      && elements.every((item) => item.tagName === 'LI' && !item.querySelector('*'))) {
      return {
        ...node,
        kind: 'list',
        ordered: tag === 'OL',
        items: elements.map(wordsOf),
        s: { ...node.s, ...readStyles(win.getComputedStyle(elements[0])), backgroundColor: node.s.backgroundColor },
      }
    }

    // Running text: words of its own, and nothing beside them but pieces that
    // sit in the line. One text block when its formatting is plain; kept as
    // it is when the canvas's text block cannot hold it (a link inside the
    // sentence, a run in another weight, slant, colour or face, a formula).
    if (words && ownText(el) && elements.every(inlineLevel)) {
      const simple = inside.every((child) => INLINE_TAGS.has(child.tagName.toUpperCase()))
      const rich = !simple || inside.some((child) => {
        if (!(child.textContent || '').trim()) return false
        if (child.tagName === 'A' && child.getAttribute('href')) return true
        const inner = win.getComputedStyle(child)
        return inner.fontWeight !== cs.fontWeight || inner.fontStyle !== cs.fontStyle
          || inner.color !== cs.color || inner.textDecorationLine !== cs.textDecorationLine
          || inner.fontFamily !== cs.fontFamily || inner.backgroundColor !== 'rgba(0, 0, 0, 0)'
      })
      if (!rich) return { ...node, kind: 'text', text: words, ink: inkOf(el) }
      const written = { ...node, kind: 'text', ink: inkOf(el) }
      written.runs = runsOf(el, cs, written)
      written.text = written.runs.map((run) => (run.t === undefined ? '' : run.t)).join('')
      return written
    }
    if (words && elements.length === 1 && inside.every((child) => INLINE_TAGS.has(child.tagName.toUpperCase()) && inlineLevel(child))) {
      // One run of formatting around all of the words (<h1><span>…</span></h1>,
      // <p><a>…</a></p>): the words take its look, the box stays this element's.
      let inner = elements[0]
      let href = node.href
      for (;;) {
        if (inner.tagName === 'A') href = href || inner.getAttribute('href') || ''
        if (ownText(inner) || inner.children.length !== 1) break
        inner = inner.children[0]
      }
      if (!inner.children.length) {
        const look = readStyles(win.getComputedStyle(inner))
        const text = {}
        for (const key of TEXT_STYLES) text[key] = look[key]
        return { ...node, kind: 'text', text: words, ink: inkOf(el), ...(href !== undefined ? { href } : {}), s: { ...node.s, ...text } }
      }
    }

    const kids = []
    for (const child of el.childNodes) {
      if (child.nodeType === 1) {
        const measured = measureNode(child)
        if (measured) kids.push(measured)
      } else if (child.nodeType === 3 && child.textContent.trim()) {
        // Words that sit beside elements, with no element of their own.
        const range = doc.createRange()
        range.selectNodeContents(child)
        const box = boxOf(range.getBoundingClientRect())
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

  // A frame read from outside has no scripts of its own, and a timer set on
  // its window would never fire: the clock is the reader's own window.
  const settle = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))
  const send = (data) => {
    if (token) {
      try { win.parent.postMessage({ type: 'pwb-page-measured', token, data }, '*') } catch { /* no one to tell */ }
    }
    return data
  }
  const read = async () => {
    try {
      // Entrance effects are read as they stand once they have played.
      const still = doc.createElement('style')
      still.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'
      doc.head?.appendChild(still)
      await Promise.race([doc.fonts?.ready || Promise.resolve(), settle(4000)])
      await Promise.race([
        Promise.all([...doc.images].map((img) => (img.complete ? null : new Promise((ok) => { img.onload = ok; img.onerror = ok })))),
        settle(2500),
      ])
      // What the page's own scripts do when it opens (draw formulas, show the
      // first chapter) has had its turn by now.
      await settle(400)
      // A page that shows its parts one at a time (chapters, tabs) links to
      // the ones it is hiding. Each hidden part some link leads to is a state
      // the page can be put in and read again. They are found before the
      // page is read, so that reading it leaves them hidden (see reveal).
      if (token) {
        const found = new Map()
        for (const link of doc.querySelectorAll('a[href^="#"]')) {
          let id = ''
          try { id = decodeURIComponent(link.getAttribute('href').slice(1)) } catch { /* not an id */ }
          const target = id ? doc.getElementById(id) : null
          const part = target ? hiddenRoot(target) : null
          if (!part) continue
          const known = found.get(part)
          if (!known || (target === part && !known.exact)) found.set(part, { part, link, exact: target === part })
        }
        states.push(...[...found.values()].slice(0, 30))
      }
      const first = await snapshot()
      if (first && token) {
        first.states = states.map(({ part, link }) => ({
          label: (part.getAttribute('data-title') || part.querySelector('h1, h2, h3')?.textContent || link.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        }))
        win.addEventListener('message', (event) => {
          if (event.source !== win.parent) return
          if (event.data?.type !== 'pwb-page-show' || event.data.token !== token) return
          show(event.data.index)
        })
      }
      return send(first)
    } catch {
      return send(null)
    }
  }

  // The outermost thing that keeps `el` from being shown, or null.
  function hiddenRoot(el) {
    let root = null
    for (let node = el; node && node !== doc.documentElement; node = node.parentElement) {
      if (isHidden(win.getComputedStyle(node))) root = node
    }
    return root
  }

  // What the page keeps hidden until a button shows it (the steps of a
  // solution, the back of a card, a closed <details>) is read shown: the
  // canvas has no button to show it with, and it would be lost. Not a part a
  // link leads to, which is read as a state of its own, nor a box with
  // nothing in it (search results yet to come), nor one that would lie over
  // the screen.
  function reveal() {
    const holdsState = (el) => states.some(({ part }) => el === part || el.contains(part))
    for (const el of doc.body.querySelectorAll('details:not([open])')) {
      if (!holdsState(el)) el.open = true
    }
    for (const el of doc.body.querySelectorAll('[hidden]')) {
      if (holdsState(el)) continue
      if (!(el.textContent || '').trim() && !el.querySelector('img, svg, canvas')) continue
      el.hidden = false
      const cs = win.getComputedStyle(el)
      if (cs.position === 'fixed' || isHidden(cs)) el.hidden = true
    }
  }

  // The page as it stands now, read whole.
  async function snapshot() {
    stats.hidden = 0
    jobs = []
    reveal()
    win.scrollTo(0, 0)
    // A box that scrolls by itself (a side menu) is read from its top: a
    // script that scrolled it to the open chapter's link would otherwise
    // leave the top of it cut off on the canvas.
    for (const el of doc.body.querySelectorAll('*')) {
      if (el.scrollTop) el.scrollTop = 0
      if (el.scrollLeft) el.scrollLeft = 0
    }
    const bodyStyle = win.getComputedStyle(doc.body)
    const rootStyle = win.getComputedStyle(doc.documentElement)
    const root = measureNode(doc.body)
    // The pictures, one after another. Where one cannot be drawn, what it
    // was part of is kept as it is instead, in an HTML block.
    for (const job of jobs) {
      if (job.node.kind === 'html') continue
      let made = null
      try { made = await picture(job.el) } catch { /* kept as HTML below */ }
      if (made) job.done(made)
      else {
        job.node.kind = 'html'
        job.node.code = standaloneHtml(job.owner, false)
        delete job.node.runs
        delete job.node.src
      }
    }
    return root && {
      width: win.innerWidth,
      viewHeight: win.innerHeight,
      height: Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight),
      background: [bodyStyle.backgroundColor, rootStyle.backgroundColor],
      fontFamily: bodyStyle.fontFamily,
      title: doc.title || '',
      description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      language: doc.documentElement.getAttribute('lang') || '',
      hiddenParts: stats.hidden,
      fontLinks: [...doc.querySelectorAll('link[rel~="stylesheet"][href]')].map((link) => link.getAttribute('href')),
      fontFaces: fontFaces(),
      // Every id that is on show: where a link to it should lead.
      ids: [...doc.querySelectorAll('[id]')].filter((el) => !hiddenRoot(el)).map((el) => el.id),
      root,
    }
  }

  // Put the page in one of its states, the way its reader would (by the
  // link), and read it. Null when the part did not come into view.
  const states = []
  async function show(index) {
    const reply = (data, why = '') => { try { win.parent.postMessage({ type: 'pwb-page-state', token, index, data, why }, '*') } catch { /* no one to tell */ } }
    try {
      const state = states[index]
      if (!state) return reply(null, 'no such state')
      state.link.click()
      await settle(350)
      if (hiddenRoot(state.part)) {
        // The frame's address is one the browser will not follow a "#" link
        // on, so a page that waits for its address to change never hears of
        // the click. The address is changed in place and the page is told.
        const before = win.location.href
        win.history.replaceState(null, '', state.link.getAttribute('href'))
        win.dispatchEvent(new win.HashChangeEvent('hashchange', { oldURL: before, newURL: win.location.href }))
        win.dispatchEvent(new win.PopStateEvent('popstate', { state: null }))
        await settle(350)
      }
      if (hiddenRoot(state.part)) return reply(null, 'still hidden')
      await Promise.race([doc.fonts?.ready || Promise.resolve(), settle(2000)])
      return reply(await snapshot())
    } catch (error) {
      return reply(null, String(error))
    }
  }
  if (doc.readyState === 'complete') return read()
  return new Promise((resolve) => win.addEventListener('load', () => resolve(read())))
}

// The document with the reader written into it, after everything of its own.
function withReader(html, token) {
  const tag = `<script>(${readPage.toString()})(${JSON.stringify(token)})</script>`
  const source = String(html || '')
  const end = source.toLowerCase().lastIndexOf('</body')
  return end >= 0 ? `${source.slice(0, end)}${tag}${source.slice(end)}` : `${source}${tag}`
}

const FRAME_CSS = (width, height) => [
  // In the window but not to be seen: a browser does not lay out a frame of
  // another origin that is off screen or hidden, and every box in it would
  // read as empty.
  'position:fixed', 'left:0', 'top:0', `width:${width}px`, `height:${height}px`,
  'opacity:0', 'z-index:-1', 'pointer-events:none', 'border:0',
].join(';')

const laidOut = (data) => !!data && typeof data === 'object' && data.root?.rect?.w >= 50

// The page with its scripts running, in a frame that is not of the editor's
// origin. Null when the browser did not lay the frame out (it does not for a
// tab in the background) or nothing came back in time.
function readWithScripts(html, { width, height, timeout, onProgress }) {
  return new Promise((resolve) => {
    const win = window
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    let frame
    let settled = false
    let timer = win.setTimeout(() => done(null), timeout)
    let first = null
    let asked = -1
    // The states of the page, one after another: each is asked for when the
    // one before it has come back (or has taken too long).
    const next = (data, why = '') => {
      if (asked >= 0 && first.states[asked]) {
        first.states[asked].data = laidOut(data) ? data : null
        if (!first.states[asked].data) first.states[asked].why = why || 'no answer'
      }
      asked += 1
      win.clearTimeout(timer)
      if (asked >= first.states.length) return done(first)
      try { onProgress?.(asked + 1, first.states.length) } catch { /* a listener's own trouble */ }
      timer = win.setTimeout(() => next(null), timeout)
      frame.contentWindow.postMessage({ type: 'pwb-page-show', token, index: asked }, '*')
      return undefined
    }
    const onMessage = (event) => {
      // Only the frame made here, and only its answers to this reading.
      if (event.source !== frame?.contentWindow || event.data?.token !== token) return
      if (event.data.type === 'pwb-page-measured' && !first) {
        if (!laidOut(event.data.data)) return done(null)
        first = { ...event.data.data, states: Array.isArray(event.data.data.states) ? event.data.data.states : [] }
        next(null)
      } else if (event.data.type === 'pwb-page-state' && first && event.data.index === asked) {
        next(event.data.data, event.data.why)
      }
    }
    let address = ''
    function done(result) {
      if (settled) return
      settled = true
      win.clearTimeout(timer)
      win.removeEventListener('message', onMessage)
      try { frame?.remove() } catch { /* already gone */ }
      if (address) URL.revokeObjectURL(address)
      resolve(result)
    }
    try {
      win.addEventListener('message', onMessage)
      frame = document.createElement('iframe')
      // The page's scripts run, as they do in View, and never under the
      // editor's origin: no allow-same-origin.
      frame.setAttribute('sandbox', 'allow-scripts')
      frame.setAttribute('aria-hidden', 'true')
      frame.setAttribute('tabindex', '-1')
      frame.style.cssText = FRAME_CSS(width, height)
      // Given an address of its own, not written in as srcdoc: a sandboxed
      // srcdoc frame goes blank when a "#chapter" link in it is followed,
      // and the reader follows those to bring each chapter into view.
      address = URL.createObjectURL(new Blob([withReader(html, token)], { type: 'text/html' }))
      frame.src = address
      document.body.appendChild(frame)
    } catch {
      done(null)
    }
  })
}

// The page as it is written, without its scripts, in a frame the editor can
// read directly: what is left when the reading above brings nothing back.
function readWithoutScripts(html, { width, height, timeout }) {
  return new Promise((resolve) => {
    const win = window
    let frame
    let settled = false
    const timer = win.setTimeout(() => done(null), timeout)
    function done(result) {
      if (settled) return
      settled = true
      win.clearTimeout(timer)
      try { frame?.remove() } catch { /* already gone */ }
      resolve(result)
    }
    try {
      frame = document.createElement('iframe')
      // DOM access for the reading, and no scripts under the editor's origin.
      frame.setAttribute('sandbox', 'allow-same-origin')
      frame.setAttribute('aria-hidden', 'true')
      frame.setAttribute('tabindex', '-1')
      frame.style.cssText = FRAME_CSS(width, height)
      frame.addEventListener('load', () => {
        Promise.resolve(readPage('', frame.contentWindow)).then((data) => done(laidOut(data) ? data : null), () => done(null))
      })
      frame.srcdoc = withoutExecutableScripts(String(html || ''))
      document.body.appendChild(frame)
    } catch {
      done(null)
    }
  })
}

// Lay `html` out `width` pixels wide and read it. Resolves null when the page
// cannot be read. `ranScripts` on the reading says which way it was read.
// `states` holds the parts the page shows one at a time, each read like the
// page itself (`data`, null for one that did not come into view) and named.
export async function measureHtmlPage(html, { width = 1200, height = 900, timeout = 15000, onProgress } = {}) {
  const options = { width, height, timeout, onProgress }
  // A browser now and then gives the frame no layout (a tab it is not
  // drawing): the reading is tried once more before going without scripts.
  const scripted = await readWithScripts(html, options) || await readWithScripts(html, options)
  const data = scripted || await readWithoutScripts(html, options)
  if (!data) return null
  return {
    ...data,
    states: (data.states || []).filter((state) => state.data),
    // The parts that could not be brought into view, and why.
    unread: (data.states || []).filter((state) => !state.data).map((state) => ({ label: state.label, why: state.why })),
    ranScripts: !!scripted,
    scripts: (String(html || '').match(/<script\b/gi) || []).length,
    fonts: [...new Set((Array.isArray(data.fontLinks) ? data.fontLinks : []).flatMap((href) => fontSpecsFromHref(href)))].slice(0, MAX_PAGE_FONTS),
  }
}
