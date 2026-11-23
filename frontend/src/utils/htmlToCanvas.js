// Turns a measured HTML page (htmlPageMeasure.js) into canvas components.
//
// Every visible piece of the page becomes a block of its own, placed where
// the browser drew it: a heading, a text, an image, a button, a link, a list,
// a line. A box with a background becomes a section or a container holding
// what is inside it. What the canvas has no block for (a table, a form, a
// video, a sentence with a link inside it) is kept as it is in an HTML block,
// which moves and resizes like any other block. Nothing is dropped silently:
// the report counts what was kept as HTML and what could not be carried.

import { ANCHOR_RE, retargetLinks } from './anchors.js'
import { fontFacesUsedBy } from './fontFaces.js'

// Mirrors MAX_CHILDREN, MAX_NESTING_DEPTH and MAX_HTML_EMBED in backend/builder/validators.py.
const MAX_CHILDREN = 60
const MAX_NESTING_DEPTH = 4
const MAX_HTML_CODE = 50 * 1024
// A section holds containers, and those hold blocks: one level of boxes with
// children inside a section keeps the page inside the server's nesting limit.
const MAX_BOX_DEPTH = 2
const GROUP_SIZE = 40
const isPinnedPos = (pos) => pos === 'fixed' || pos === 'sticky'

const SEMANTIC = new Set(['section', 'header', 'footer', 'nav', 'article', 'aside', 'main'])
const HEADINGS = { h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h3', h5: 'h3', h6: 'h3' }

const px = (value) => {
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

// How solid a computed colour is, 0 to 1.
export function alphaOf(color) {
  const value = String(color || '').trim().toLowerCase()
  if (!value || value === 'transparent') return 0
  const parts = value.match(/^rgba?\(([^)]+)\)$/)
  if (!parts) return 1
  const numbers = parts[1].split(/[\s,/]+/).filter(Boolean)
  return numbers.length >= 4 ? px(numbers[3]) : 1
}

// "rgb(15, 23, 42)" as "#0f172a": a page background is stored as a hex.
export function hexOf(color, fallback = '#ffffff') {
  const parts = String(color || '').match(/^rgba?\(([^)]+)\)$/i)
  if (!parts) return /^#[0-9a-f]{3,8}$/i.test(String(color || '').trim()) ? String(color).trim() : fallback
  const [r, g, b, a] = parts[1].split(/[\s,/]+/).filter(Boolean).map(px)
  if (a !== undefined && a < 1) return fallback
  return `#${[r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('')}`
}

const gradientOf = (image) => (/gradient\(/i.test(image || '') && !/url\(/i.test(image || '') ? image : '')
// A picture written into the page itself as a data: address, in the form
// the published page keeps: sanitizeImageSrc (and the server) take such a
// picture only base64-encoded, and pages, AI-written ones above all, often
// write an SVG as "data:image/svg+xml;utf8,<svg …>". Any other address is
// returned as it is.
function base64Picture(src) {
  if (typeof src !== 'string') return src
  const match = /^data:(image\/[a-z0-9.+-]+)((?:;[^;,]*)*),([\s\S]*)$/i.exec(src.trim())
  if (!match || /;base64/i.test(match[2])) return src
  let text = match[3]
  try { text = decodeURIComponent(text) } catch { /* not escaped: as written */ }
  let binary = ''
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte)
  return `data:${match[1].toLowerCase()};base64,${btoa(binary)}`
}

const pictureOf = (image) => base64Picture((String(image || '').match(/url\((['"]?)(.*?)\1\)/i) || [])[2] || '')

const SIDES = ['Top', 'Right', 'Bottom', 'Left']
const sideOf = (s, side) => ({
  width: s[`border${side}Style`] === 'none' || s[`border${side}Style`] === 'hidden' ? 0 : px(s[`border${side}Width`]),
  style: s[`border${side}Style`],
  color: s[`border${side}Color`],
})

// One border all the way round, or null when the sides differ.
function uniformBorder(s) {
  const [top, ...rest] = SIDES.map((side) => sideOf(s, side))
  if (!top.width || alphaOf(top.color) === 0) return null
  return rest.every((side) => side.width === top.width && side.style === top.style && side.color === top.color) ? top : null
}

function isPainted(s) {
  return alphaOf(s.backgroundColor) > 0
    || !!gradientOf(s.backgroundImage)
    || !!pictureOf(s.backgroundImage)
    || !!uniformBorder(s)
    || (!!s.boxShadow && s.boxShadow !== 'none')
}

function hasNonUniformBorder(s) {
  return !uniformBorder(s) && SIDES.some((side) => {
    const edge = sideOf(s, side)
    return edge.width > 0 && alphaOf(edge.color) > 0
  })
}

function radiusOf(s) {
  const corners = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map((corner) => String(s[`border${corner}Radius`] || '0px').trim())
  if (corners.every((corner) => px(corner) === 0)) return ''
  if (corners.some((corner) => /\s/.test(corner))) {
    const rx = []
    const ry = []
    for (const corner of corners) {
      const parts = corner.split(/\s+/)
      rx.push(parts[0])
      ry.push(parts[1] || parts[0])
    }
    const xPart = rx.every((v) => v === rx[0]) ? rx[0] : rx.join(' ')
    const yPart = ry.every((v) => v === ry[0]) ? ry[0] : ry.join(' ')
    return `${xPart} / ${yPart}`
  }
  return corners.every((corner) => corner === corners[0]) ? corners[0] : corners.join(' ')
}

function boxStyles(s) {
  const out = {}
  if (alphaOf(s.backgroundColor) > 0) out.backgroundColor = s.backgroundColor
  const gradient = gradientOf(s.backgroundImage)
  if (gradient) out.backgroundImage = gradient
  const border = uniformBorder(s)
  if (border) out.border = `${border.width}px ${border.style} ${border.color}`
  const radius = radiusOf(s)
  if (radius) out.borderRadius = radius
  if (s.boxShadow && s.boxShadow !== 'none') out.boxShadow = s.boxShadow
  const opacity = px(s.opacity)
  if (s.opacity !== undefined && opacity < 1 && opacity > 0.05) out.opacity = String(opacity)
  return out
}

const ALIGN = { start: 'left', left: 'left', end: 'right', right: 'right', center: 'center', justify: 'justify', '-webkit-center': 'center' }

function textStyles(s) {
  const out = {
    color: s.color,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    fontFamily: s.fontFamily,
    textAlign: ALIGN[s.textAlign] || 'left',
    lineHeight: s.lineHeight,
  }
  if (s.fontStyle && s.fontStyle !== 'normal') out.fontStyle = s.fontStyle
  if (s.letterSpacing && s.letterSpacing !== 'normal') out.letterSpacing = s.letterSpacing
  if (s.textTransform && s.textTransform !== 'none') out.textTransform = s.textTransform
  if (s.textDecorationLine && s.textDecorationLine !== 'none') out.textDecoration = s.textDecorationLine
  if (s.fontVariantNumeric && s.fontVariantNumeric !== 'normal') out.fontVariantNumeric = s.fontVariantNumeric
  for (const key of Object.keys(out)) if (!out[key]) delete out[key]
  return out
}

// To the hundredth: a cell padded 12.6px each side and rounded to 13 lost
// 0.8px of its line, and a line that just fitted broke in two.
const fine = (value) => Math.round(value * 100) / 100

function paddingOf(s) {
  const sides = SIDES.map((side) => fine(px(s[`padding${side}`])))
  return sides.some(Boolean) ? sides.map((side) => `${side}px`).join(' ') : '0px'
}

// A box in the coordinates of what holds it.
// Where on the page (not in its parent) each layout made here was drawn, for
// the phone layout (phoneLayouts below).
const drawnAt = new WeakMap()

function place(rect, origin, grow = 0) {
  const layout = {
    x: Math.max(0, Math.round(rect.x - origin.x)),
    y: Math.max(0, Math.round(rect.y - origin.y)),
    w: Math.max(8, Math.ceil(rect.w) + grow),
    h: Math.max(4, Math.ceil(rect.h)),
  }
  drawnAt.set(layout, { x: rect.x, y: rect.y, w: rect.w + grow, h: rect.h })
  return layout
}

// The smallest box the canvas keeps (the store and the published page both
// hold a block to these).
const MIN_W = 8
const MIN_H = 4

// A plain painted box: a line, a bar, a shape. A box thinner than the canvas
// keeps is drawn at its true thickness inside the smallest box there is, so
// a 1px line under a header stays 1px and does not become a 4px band.
function shape(ctx, look, rect, origin, corner = 'left top') {
  const w = Math.max(1, Math.round(rect.w))
  const h = Math.max(1, Math.round(rect.h))
  const layout = { x: Math.max(0, Math.round(rect.x - origin.x)), y: Math.max(0, Math.round(rect.y - origin.y)), w: Math.max(MIN_W, w), h: Math.max(MIN_H, h) }
  drawnAt.set(layout, { x: rect.x, y: rect.y, w: rect.w, h: rect.h })
  if (w >= MIN_W && h >= MIN_H) return block(ctx, 'spacer', {}, look, layout)
  const colour = look.backgroundColor || 'transparent'
  if (corner.includes('bottom')) layout.y = Math.max(0, layout.y - (layout.h - h))
  if (corner.includes('right')) layout.x = Math.max(0, layout.x - (layout.w - w))
  return block(ctx, 'spacer', {}, {
    backgroundImage: `linear-gradient(${colour}, ${colour})`,
    backgroundSize: `${w >= MIN_W ? '100%' : `${w}px`} ${h >= MIN_H ? '100%' : `${h}px`}`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: corner,
  }, layout)
}

function block(ctx, type, props, styles, layout, children) {
  ctx.report[type === 'html' ? 'html' : 'native'] += 1
  const made = { id: ctx.id(type), type, props, styles, layout, ...(children ? { children } : {}) }
  // What it was made from, for its phone layout; taken off again there.
  if (ctx.at) made._from = ctx.at
  const drawn = drawnAt.get(layout)
  if (drawn) made._drawn = drawn
  return made
}

// The node being turned into blocks, and the node it sits in.
function entering(ctx, n, run) {
  const outer = ctx.at
  if (!ctx.parentOf.has(n)) ctx.parentOf.set(n, outer)
  ctx.at = n
  try {
    return run()
  } finally {
    ctx.at = outer
  }
}

// The phone layout the page itself has. The reader read every node again at
// a phone's width (`m`, see readPhone in htmlPageMeasure.js); each block is
// put where what it was made from stood there, in its parent's phone box, and
// is hidden on the phone where that (or what holds it) is not shown there. A
// group of blocks made here, with nothing of its own on the page, spans its
// blocks. A block made from part of a node (a line on one side, the words
// inside a box) keeps its place in that node, scaled to the node's phone box.
function phoneLayouts(components, ctx, origin) {
  const hiddenUp = (node) => {
    for (let n = node; n; n = ctx.parentOf.get(n)) if (n.m?.hidden) return true
    return false
  }
  // What the page shows only on a phone is hidden on the desktop.
  const phoneOnlyUp = (node) => {
    for (let n = node; n; n = ctx.parentOf.get(n)) if (n.phoneOnly) return true
    return false
  }
  const readUp = (node) => {
    for (let n = node; n; n = ctx.parentOf.get(n)) if (n.m && !n.m.hidden) return n
    return null
  }
  const near = (a, b) => Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1 && Math.abs(a.w - b.w) <= 1.5 && Math.abs(a.h - b.h) <= 1.5
  // A piece of a node (a list's number, a line on one side, the words inside
  // a box) keeps its own size and its distance from the nearer edges of the
  // node; one that spans the node spans it on the phone too. The words of a
  // box keep its padding around them and take the rest of it.
  const mapped = (drawn, node, words) => {
    if (near(drawn, node.rect)) return node.m
    const left = drawn.x - node.rect.x
    const right = node.rect.x + node.rect.w - (drawn.x + drawn.w)
    const top = drawn.y - node.rect.y
    const bottom = node.rect.y + node.rect.h - (drawn.y + drawn.h)
    // Spanning the node means meeting both of its edges, not only being as
    // long as it: a number as tall as its one-line item does not span it.
    const across = (size, spans, room) => (spans ? room : Math.min(size, Math.max(1, room)))
    const w = words ? Math.max(MIN_W, node.m.w - Math.max(0, left) - Math.max(0, right)) : across(drawn.w, Math.abs(left) <= 1 && Math.abs(right) <= 1, node.m.w)
    const h = words ? Math.max(drawn.h, node.m.h - Math.max(0, top) - Math.max(0, bottom)) : across(drawn.h, Math.abs(top) <= 1 && Math.abs(bottom) <= 1, node.m.h)
    // A piece drawn outside its node (a list's number in the margin) stays
    // outside it by as much.
    // It goes with the far edge only when it starts in the far half: a number
    // a few pixels taller than its one-line item stays with the first line.
    const x = words || left <= node.rect.w / 2 ? node.m.x + (words ? Math.max(0, left) : left) : node.m.x + node.m.w - w - Math.max(0, right)
    const y = words || top <= node.rect.h / 2 ? node.m.y + (words ? Math.max(0, top) : top) : node.m.y + node.m.h - h - Math.max(0, bottom)
    return { x, y, w, h }
  }
  // A block's box on the page at the phone's width: a box, null where the
  // phone does not show it, undefined where nothing says.
  const phoneOf = (c) => {
    const kids = Array.isArray(c.children) ? c.children : null
    const boxes = kids ? kids.map(phoneOf) : []
    let box
    if (c._from) {
      if (hiddenUp(c._from)) box = null
      else {
        const node = readUp(c._from)
        if (node) {
          box = mapped(c._drawn || c._from.rect, node, node === c._from && WORD_TYPES.has(c.type))
          // Words made here inside a read node (a list's number) take its
          // phone styles: they inherit its font.
          if (node !== c._from && node.ms && !c._from.ms) c._styleFrom = node
        }
      }
    }
    if (box === undefined && kids) {
      const shown = boxes.filter(Boolean)
      if (shown.length) {
        const x = Math.min(...shown.map((b) => b.x))
        const y = Math.min(...shown.map((b) => b.y))
        box = { x, y, w: Math.max(...shown.map((b) => b.x + b.w)) - x, h: Math.max(...shown.map((b) => b.y + b.h)) - y }
      } else if (boxes.every((b) => b === null)) box = null
    }
    c._phone = box
    return box
  }
  const assign = (list, outer) => {
    for (const c of list) {
      const box = c._phone
      const own = !!c._from?.ms
      const styleFrom = own ? c._from : c._styleFrom
      const onPhone = box && styleFrom ? phoneLook(c, styleFrom, own) : null
      if (onPhone) c.stylesMobile = { ...(c.stylesMobile || {}), ...onPhone }
      if (box && c._from && phoneOnlyUp(c._from)) c.hidden = true
      if (box === null) c.hiddenMobile = true
      else if (box) {
        c.mobileLayout = {
          x: Math.max(0, Math.round(box.x - outer.x)),
          y: Math.max(0, Math.round(box.y - outer.y)),
          w: Math.max(MIN_W, Math.ceil(box.w)),
          h: Math.max(MIN_H, Math.ceil(box.h)),
        }
      }
      // Its blocks stand where the page put them on a phone, not at the
      // desktop drawing scaled down (containerChildKey in containerFit.js).
      if (c.type === 'container' && box && Array.isArray(c.children) && c.children.length) {
        c.props = { ...c.props, phoneLayout: true }
      }
      if (Array.isArray(c.children)) assign(c.children, box || outer)
      delete c._phone
      delete c._styleFrom
    }
  }
  components.forEach(phoneOf)
  assign(components, origin)
}

// The styles the page's CSS gives a node on a phone, for the block made from
// it: the size and spacing of its words, and its padding where the block
// took the node's whole padding.
const WORD_TYPES = new Set(['text', 'heading', 'list', 'button', 'linkbutton'])
function phoneLook(c, node, own = true) {
  const out = {}
  if (WORD_TYPES.has(c.type)) {
    for (const key of ['fontSize', 'lineHeight', 'letterSpacing']) {
      if (node.ms[key] && c.styles?.[key] !== undefined) out[key] = node.ms[key]
      else if (key === 'letterSpacing' && node.ms[key] && node.ms[key] !== 'normal') out[key] = node.ms[key]
    }
  }
  const sides = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']
  if (own && sides.some((key) => node.ms[key]) && c.styles?.padding === paddingOf(node.s)) {
    out.padding = paddingOf({ ...node.s, ...node.ms })
  }
  return Object.keys(out).length ? out : null
}

// Takes off what blocks carried only while being made.
function strip(list) {
  for (const c of list) {
    delete c._from
    delete c._drawn
    delete c._phone
    if (Array.isArray(c.children)) strip(c.children)
  }
  return list
}

// The element's id as the block's anchor, so a "#id" link on the page still
// finds it. One block per id, normalized to lowercase when an HTML token uses uppercase letters.
function named(made, n, ctx) {
  const target = made[made.length - 1]
  if (!target || !n.id) return made
  const lower = n.id.toLowerCase()
  const anchor = ANCHOR_RE.test(lower) && lower !== 'top' ? lower : ''
  if (!anchor || ctx.anchors.has(anchor)) return made
  ctx.anchors.add(anchor)
  if (anchor !== n.id && ctx.renames) ctx.renames.set(n.id, anchor)
  target.props = { ...target.props, anchor }
  return made
}

// Extract label text + sample text style from a simple <button> holding an
// SVG/image icon beside a label span, without collapsing structured cards or
// multi-part buttons (flashcards, MCQ options) that hold inner layout/states.
function readButtonContent(n, state = { parts: [], sample: null }) {
  for (const kid of n.kids || []) {
    if (kid.kind === 'field' || kid.kind === 'list' || kid.tag === 'a' || kid.tag === 'button' || kid.tag === 'table') return null
    if (kid.kind === 'html' && kid.tag !== 'svg') return null
    if (kid.keys?.length || kid.actions?.length || kid.runs?.length) return null
    if (kid.tag !== 'svg' && (isPainted(kid.s) || hasNonUniformBorder(kid.s))) return null
    if (kid.kind === 'text') {
      const words = (kid.text || '').trim()
      if (words) {
        state.parts.push(words)
        if (!state.sample) state.sample = kid.s
      }
      if (state.parts.length > 1) return null
      continue
    }
    if (kid.kind === 'image' || kid.kind === 'line' || kid.tag === 'svg') continue
    if (!readButtonContent(kid, state)) return null
  }
  return state
}

function buttonFrom(n, origin, ctx, href) {
  if (n.tag !== 'button' || n.kind) return null
  const content = readButtonContent(n)
  const label = content?.parts.join(' ').replace(/\s+/g, ' ').trim() || ''
  if (!label) return null
  const target = n.href !== undefined ? n.href : href
  return block(
    ctx,
    'button',
    { text: label, href: target || '', icon: '' },
    { backgroundColor: 'transparent', ...textStyles(content.sample || n.s), ...boxStyles(n.s), textAlign: 'center', padding: paddingOf(n.s) },
    place(n.rect, origin, 1),
  )
}

// A box that became no block of its own hands its id to the first block made
// from what it held, unless that block already answers to an id of its own.
function lendId(block, n, ctx) {
  if (block && !block.props.anchor) named([block], n, ctx)
}

// The block for a piece of the page that has no pieces inside it, or null
// when `n` is a box to look into.
function leaf(n, origin, ctx, href) {
  const link = href ? { href } : {}
  if (n.kind === 'image') {
    if (!n.src) return []
    const radius = radiusOf(n.s)
    const fit = n.tag === 'svg' ? 'contain' : n.s.objectFit || 'fill'
    return [block(ctx, 'image', { src: base64Picture(n.src), alt: n.alt || '', ...link }, { objectFit: fit, ...(radius ? { borderRadius: radius } : {}) }, place(n.rect, origin))]
  }
  if (n.kind === 'line') {
    const thick = Math.max(1, Math.min(Math.round(n.rect.h), Math.round(px(n.s.borderTopWidth)) || 1))
    return [shape(ctx, { backgroundColor: n.s.borderTopColor || n.s.color }, { ...n.rect, h: thick }, origin)]
  }
  if (n.kind === 'html') {
    if (!n.code || n.code.length > MAX_HTML_CODE) {
      ctx.report.tooLarge += 1
      return []
    }
    return [block(ctx, 'html', { code: n.code }, {}, place(n.rect, origin, 1))]
  }
  if (n.kind === 'list') {
    return [block(ctx, 'list', { text: n.items.join('\n'), ordered: n.ordered ? '1' : '', ...link }, { ...textStyles(n.s), ...boxStyles(n.s), padding: paddingOf(n.s) }, place(n.rect, origin))]
  }
  if (n.kind === 'field') {
    const f = n.field
    const s = n.s
    const border = uniformBorder(s) || sideOf(s, 'Top')
    const props = {
      label: '',
      placeholder: f.type === 'select' ? f.prompt : f.placeholder,
      fieldBackgroundColor: alphaOf(s.backgroundColor) > 0 ? s.backgroundColor : 'transparent',
      fieldColor: s.color,
      fieldBorderColor: border.width && alphaOf(border.color) > 0 ? border.color : 'transparent',
      fieldBorderWidth: `${fine(border.width)}px`,
      fieldBorderRadius: radiusOf(s) || '0px',
      fieldPadding: paddingOf(s),
      fieldHeight: `${fine(n.rect.h)}px`,
      fieldFontSize: s.fontSize,
      ...(f.type === 'select' ? { options: f.options.join('\n') } : { inputType: f.type }),
    }
    return [block(ctx, f.type === 'select' ? 'select' : 'input', props, { fontFamily: s.fontFamily, fontSize: s.fontSize, color: s.color }, place(n.rect, origin))]
  }
  if (n.kind !== 'text') return null

  const target = n.href !== undefined ? n.href : href
  // A button the page drew as one. A link, painted or not, is text that
  // leads somewhere: its words keep the alignment they were given, which a
  // button block does not (it centres them).
  const pressable = n.tag === 'button'
  // A text block shows its words in the middle of its box. Where the page
  // drew them higher or lower than that, the block is the height of the
  // words, at the height they were drawn, and the box (if it has a look of
  // its own) is drawn behind it as a shape.
  const ink = n.ink
  const offCentre = !pressable && ink && ink.h >= 1 && Math.abs((ink.y + ink.h / 2) - (n.rect.y + n.rect.h / 2)) > 2
  const under = offCentre && isPainted(n.s) ? [shape(ctx, boxStyles(n.s), n.rect, origin)] : []
  const sides = SIDES.map((side) => fine(px(n.s[`padding${side}`])))
  const styles = offCentre
    ? { ...textStyles(n.s), padding: `0px ${sides[1]}px 0px ${sides[3]}px` }
    : { ...textStyles(n.s), ...boxStyles(n.s), padding: paddingOf(n.s) }
  const layout = place(offCentre ? { ...n.rect, y: ink.y, h: ink.h } : n.rect, origin, 1)
  // A cell of a table has a line on some of its sides only.
  under.push(...edgeLines(n, ctx, origin))
  // Formatting inside the text: runs beside the plain text (richText.js).
  const rich = Array.isArray(n.runs) && n.runs.length
    ? { rich: n.runs.map((run) => (typeof run?.img === 'string' ? { ...run, img: base64Picture(run.img) } : run)) }
    : {}
  if (HEADINGS[n.tag]) {
    return [...under, block(ctx, 'heading', { text: n.text, level: HEADINGS[n.tag], ...rich, ...(target ? { href: target } : {}) }, styles, layout)]
  }
  if (pressable) {
    // A button's words sit in the middle of it.
    return [block(ctx, 'button', { text: n.text, href: target || '', icon: '' }, { backgroundColor: 'transparent', ...styles, textAlign: 'center' }, layout)]
  }
  return [...under, block(ctx, 'text', { text: n.text, ...rich, ...(target ? { href: target } : {}) }, styles, layout)]
}

// Lines for the sides of a box whose border is not the same all the way
// round: a block has one border or none, so a line under a header is drawn
// as a line.
// `inside` draws them in the box's own coordinates (for a box that holds
// its lines); without it they stand where the box stands, beside it.
function edgeLines(n, ctx, origin = null) {
  if (uniformBorder(n.s)) return []
  const lines = []
  const width = Math.ceil(n.rect.w)
  const height = Math.ceil(n.rect.h)
  const left = origin ? n.rect.x : 0
  const top = origin ? n.rect.y : 0
  const from = origin || { x: 0, y: 0 }
  for (const side of SIDES) {
    const edge = sideOf(n.s, side)
    if (!edge.width || alphaOf(edge.color) === 0) continue
    const thick = Math.max(1, Math.round(edge.width))
    const rect = side === 'Top' ? { x: left, y: top, w: width, h: thick }
      : side === 'Bottom' ? { x: left, y: top + Math.max(0, height - thick), w: width, h: thick }
        : side === 'Left' ? { x: left, y: top, w: thick, h: height }
          : { x: left + Math.max(0, width - thick), y: top, w: thick, h: height }
    const corner = side === 'Bottom' ? 'left bottom' : side === 'Right' ? 'right top' : 'left top'
    lines.push(shape(ctx, { backgroundColor: edge.color }, rect, from, corner))
  }
  return lines
}

// Where a box's children count from: inside its border, as the canvas does.
function innerOrigin(n) {
  const border = uniformBorder(n.s)
  return { x: n.rect.x + (border ? border.width : 0), y: n.rect.y + (border ? border.width : 0) }
}

// A picture drawn behind a box, as an image block under what the box holds.
function backdrop(n, ctx) {
  const src = pictureOf(n.s.backgroundImage)
  if (!src) return []
  const fit = /contain/.test(n.s.backgroundSize || '') ? 'contain' : 'cover'
  return [block(ctx, 'image', { src, alt: '' }, { objectFit: fit }, { x: 0, y: 0, w: Math.ceil(n.rect.w), h: Math.ceil(n.rect.h) })]
}

function backdropOver(n, origin, ctx) {
  return backdrop(n, ctx).map((image) => ({ ...image, layout: { ...image.layout, ...place(n.rect, origin) } }))
}

const subtreeDepth = (c) => (Array.isArray(c?.children) && c.children.length
  ? 1 + Math.max(...c.children.map(subtreeDepth))
  : 0)

// A parent holds at most MAX_CHILDREN blocks. More than that are gathered,
// in reading order, into plain containers the eye cannot see, within the
// remaining server nesting budget (`maxLevels`).
function fitChildren(children, ctx, maxLevels = 2) {
  if (children.length <= MAX_CHILDREN || maxLevels <= 0) return children
  const size = maxLevels === 1 && children.length > MAX_CHILDREN * GROUP_SIZE
    ? Math.min(MAX_CHILDREN, Math.ceil(children.length / MAX_CHILDREN))
    : GROUP_SIZE
  // What runs down most of the box (its edges, its background) stays as it
  // is: in a group it would stretch that group over all the others, and the
  // groups would lie over each other instead of one under the next.
  const top = Math.min(...children.map((c) => c.layout.y))
  const span = Math.max(...children.map((c) => c.layout.y + c.layout.h)) - top
  const left = Math.min(...children.map((c) => c.layout.x))
  const width = Math.max(...children.map((c) => c.layout.x + c.layout.w)) - left
  // ...and so do the lines across its top and bottom.
  const tall = children.filter((c) => c.layout.h >= span / 2 || (c.layout.h <= 6 && c.layout.w >= width * 0.9))
  const rest = children.filter((c) => !tall.includes(c))
  // Only when that leaves fewer pieces: sixty edges and one word would
  // come back as the same sixty-one, for ever.
  const after = tall.length + (rest.length <= MAX_CHILDREN ? rest.length : Math.ceil(rest.length / size))
  if (tall.length && rest.length && after < children.length && (after <= MAX_CHILDREN || maxLevels > 1)) {
    const groupedRest = rest.length <= MAX_CHILDREN ? rest : fitChildren(rest, ctx, Math.max(1, maxLevels - (after > MAX_CHILDREN ? 1 : 0)))
    return fitChildren([...tall, ...groupedRest], ctx, maxLevels)
  }
  const ordered = [...children].sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x)
  const groups = []
  for (let start = 0; start < ordered.length; start += size) {
    const members = ordered.slice(start, start + size)
    const x = Math.min(...members.map((c) => c.layout.x))
    const y = Math.min(...members.map((c) => c.layout.y))
    const right = Math.max(...members.map((c) => c.layout.x + c.layout.w))
    const bottom = Math.max(...members.map((c) => c.layout.y + c.layout.h))
    ctx.report.native += 1
    groups.push({
      id: ctx.id('container'),
      type: 'container',
      props: {},
      styles: { backgroundColor: 'transparent', padding: '0px', borderRadius: '0px' },
      layout: { x, y, w: right - x, h: bottom - y },
      children: members.map((c) => ({ ...c, layout: { ...c.layout, x: c.layout.x - x, y: c.layout.y - y } })),
    })
  }
  return fitChildren(groups, ctx, maxLevels - 1)
}

function pinBlocks(blocks, origin, n, ctx) {
  if (!isPinnedPos(n.s.position) || !blocks.length) return blocks
  for (const b of blocks) {
    if (b.props?.scrollBehavior) continue
    const rect = blocks.length === 1
      ? n.rect
      : {
          x: origin.x + (b.layout?.x || 0),
          y: origin.y + (b.layout?.y || 0),
          w: b.layout?.w || n.rect.w,
          h: b.layout?.h || n.rect.h,
        }
    pin(b, { ...n, rect }, ctx)
  }
  return blocks
}

// What the page shows only on a click, and what a click on it does
// (htmlPageMeasure.js explore), carried by every block made from it.
// The room the element took on the page (how far what followed it moved up
// when it was hidden, as the reading measured it) rides on the topmost of
// its blocks, counted from the element's own top; the others give up none
// of their own, as they lie inside it. See reflowLevel in utils/pageShow.js.
function marked(made, n, origin) {
  if (!made.length) return
  if (n.showEntrance && made.length === 1 && made[0].type !== 'html') {
    made[0].props = { ...made[0].props, showEntrance: n.showEntrance }
  }
  if (!n.keys?.length && !n.actions?.length) return
  const measured = n.keys?.length && typeof n.room === 'number' && origin
  const top = measured ? n.rect.y - origin.y : 0
  const first = made.reduce((high, b) => (b.layout.y < high.layout.y ? b : high), made[0])
  for (const b of made) {
    if (n.keys?.length) b.props = { ...b.props, shownBy: [...new Set([...(b.props.shownBy || []), ...n.keys])].slice(0, 16) }
    if (measured) {
      const had = new Set((b.props.rooms || []).map(([key]) => key))
      const mine = n.keys.filter((key) => !had.has(key)).map((key) => (b === first ? [key, fine(Math.max(0, b.layout.y - top)), fine(n.room)] : [key, 0, 0]))
      if (mine.length) b.props = { ...b.props, rooms: [...(b.props.rooms || []), ...mine].slice(0, 16) }
    }
    if (n.actions?.length && !b.props.onClick) b.props = { ...b.props, onClick: n.actions }
  }
}

function walk(n, out, origin, depth, ctx, href) {
  const first = out.length
  entering(ctx, n, () => walkNode(n, out, origin, depth, ctx, href))
  marked(out.slice(first), n, origin)
}

function walkNode(n, out, origin, depth, ctx, href) {
  const made = leaf(n, origin, ctx, href)
  if (made) {
    if (depth === 0) pinBlocks(made, origin, n, ctx)
    out.push(...named(made, n, ctx))
    return
  }
  const btn = buttonFrom(n, origin, ctx, href)
  if (btn) {
    if (depth === 0 && isPinnedPos(n.s.position)) pin(btn, n, ctx)
    out.push(...named([btn], n, ctx))
    return
  }
  const inside = n.tag === 'a' && n.href !== undefined ? n.href : href
  const kids = n.kids || []
  if (!isPainted(n.s) || n.rect.w < 1 || n.rect.h < 1) {
    // An unpainted fixed/sticky root wrapper must stay a pinned box around
    // its children so viewport pinning is not lost.
    if (depth === 0 && isPinnedPos(n.s.position) && n.rect.w >= 1 && n.rect.h >= 1) {
      const children = []
      kids.forEach((kid) => walk(kid, children, { x: n.rect.x, y: n.rect.y }, depth + 1, ctx, inside))
      children.push(...edgeLines(n, ctx))
      if (children.length) {
        const innerMax = children.reduce((max, c) => Math.max(max, subtreeDepth(c)), 0)
        const budget = Math.max(1, MAX_NESTING_DEPTH - 1 - innerMax)
        const box = block(ctx, 'container', {}, { backgroundColor: 'transparent', padding: '0px', borderRadius: '0px' }, place(n.rect, origin), fitChildren(children, ctx, budget))
        pin(box, n, ctx)
        out.push(...named([box], n, ctx))
      }
      return
    }
    // Nothing of its own to show: what it holds stands where it stood, and
    // the first of it takes the box's id, so a link to the box still lands.
    const first = out.length
    if (n.rect.w >= 1 && n.rect.h >= 1) out.push(...edgeLines(n, ctx, origin))
    kids.forEach((kid) => walk(kid, out, origin, depth, ctx, inside))
    lendId(out[first], n, ctx)
    return
  }
  const styles = { backgroundColor: 'transparent', ...boxStyles(n.s), padding: '0px', ...(radiusOf(n.s) ? {} : { borderRadius: '0px' }) }
  const layout = place(n.rect, origin)
  const holds = kids.length > 0 || !!pictureOf(n.s.backgroundImage)
  if (holds && depth < MAX_BOX_DEPTH && layout.h >= 16) {
    const children = [...backdrop(n, ctx)]
    kids.forEach((kid) => walk(kid, children, innerOrigin(n), depth + 1, ctx, inside))
    children.push(...edgeLines(n, ctx))
    const innerMax = children.reduce((max, c) => Math.max(max, subtreeDepth(c)), 0)
    const reservedTop = depth === 0 ? 0 : 1
    const budget = Math.max(1, MAX_NESTING_DEPTH - 1 - depth - reservedTop - innerMax)
    const box = block(ctx, 'container', {}, styles, layout, fitChildren(children, ctx, budget))
    if (depth === 0 && isPinnedPos(n.s.position)) pin(box, n, ctx)
    out.push(...named([box], n, ctx))
    return
  }
  // Nothing inside it, or too deep (or too flat) for a box with children:
  // the box is drawn as a shape, and what it held is laid over it.
  const drawn = [shape(ctx, boxStyles(n.s), n.rect, origin), ...backdropOver(n, origin, ctx), ...edgeLines(n, ctx, origin)]
  if (depth === 0) pinBlocks(drawn, origin, n, ctx)
  out.push(...named(drawn, n, ctx))
  kids.forEach((kid) => walk(kid, out, origin, depth, ctx, inside))
}

// The most a horizontal scrollbar takes from the bottom of the view.
const SCROLLBAR_ROOM = 20

// A box the page keeps in place on the screen (`position: fixed` or `sticky`)
// stays pinned on the canvas too. Fixed sidebars that fill the viewport get
// `pinHeight: 'full'` and hide on narrow mobile screens.
function pin(box, n, ctx) {
  const mode = n.s.position === 'sticky' ? 'sticky' : 'fixed'
  const view = ctx.viewHeight
  // Measured from the screen edges it is nearer to. A part with something
  // wider than the window gets a horizontal scrollbar, which takes its height
  // from the bottom of the view: a full-height side menu then measures 885px
  // of 900 and still runs to the bottom edge.
  const full = mode === 'fixed' && n.rect.y <= 1 && n.rect.h >= view - SCROLLBAR_ROOM
  const right = n.rect.x - ctx.left + n.rect.w / 2 > ctx.width / 2
  const bottom = mode === 'fixed' && !full && n.rect.y + n.rect.h / 2 > view / 2
  box.props = {
    ...box.props,
    scrollBehavior: mode,
    pinX: right ? 'right' : 'left',
    pinY: bottom ? 'bottom' : 'top',
    pinOffsetX: Math.round(right ? ctx.left + ctx.width - (n.rect.x + n.rect.w) : n.rect.x - ctx.left),
    pinOffsetY: mode === 'sticky' ? 0 : Math.round(bottom ? view - (n.rect.y + n.rect.h) : n.rect.y),
    ...(full ? { pinHeight: 'full' } : {}),
  }
  if (full) {
    box.styles = { ...box.styles, height: '100%' }
    box.hiddenMobile = true
  }
}

// As wide as the page itself (the page is its <body>, which is narrower than
// the window when the window shows a scrollbar).
const isWide = (n, ctx) => n.rect.w >= ctx.width - 4 && n.rect.x - ctx.left <= 2

// Every text and link of a bar, in reading order, or null when it holds
// anything a navbar cannot show.
function barParts(n, parts = []) {
  if (n.kind === 'text') {
    parts.push(n)
    return parts
  }
  if (n.kind || isPainted(n.s) === true && n !== parts.root) return null
  for (const kid of n.kids || []) {
    if (kid.tag === 'a' && !kid.kind) {
      // A link around something that is not plain text (a logo).
      return null
    }
    if (!barParts(kid, parts)) return null
  }
  return parts
}

// A plain bar of links at the top of the page is a navbar: the one block
// that folds its links into a menu on a phone.
function navbarFrom(n, ctx) {
  if (n.tag !== 'header' && n.tag !== 'nav') return null
  if (pictureOf(n.s.backgroundImage)) return null
  const parts = []
  parts.root = n
  if (!barParts(n, parts)) return null
  const links = parts.filter((part) => part.href !== undefined)
  const words = parts.filter((part) => part.href === undefined)
  if (links.length < 2 || words.length > 1 || links.some((link) => isPainted(link.s))) return null
  const rows = links.map((link) => link.rect.y + link.rect.h / 2)
  if (Math.max(...rows) - Math.min(...rows) > n.rect.h / 2) return null
  // A brand that is itself a link to the home page stands first, apart.
  const brandLink = !words.length && px(links[0].s.fontSize) > px(links[1].s.fontSize) ? links.shift() : null
  if (links.length < 2) return null
  const brand = words[0] || brandLink
  const sorted = [...links].sort((a, b) => a.rect.x - b.rect.x)
  const gaps = sorted.slice(1).map((link, index) => link.rect.x - (sorted[index].rect.x + sorted[index].rect.w))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const centre = (first.rect.x + last.rect.x + last.rect.w) / 2
  const inset = Math.max(0, Math.round(Math.min(brand ? brand.rect.x : first.rect.x, first.rect.x) - n.rect.x))
  const pinned = n.s.position === 'fixed' || n.s.position === 'sticky'
  return block(ctx, 'navbar', {
    brand: brand ? brand.text : '',
    links: sorted.map((link) => ({ label: link.text, href: link.href || '' })),
    navLayout: 'horizontal',
    brandAlign: 'left',
    linksAlign: centre > n.rect.x + n.rect.w * 0.6 ? 'right' : centre < n.rect.x + n.rect.w * 0.4 ? 'left' : 'center',
    linkGap: Math.max(0, Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length)),
    mobileNavMode: 'menu',
    widthMode: 'full',
    ...(pinned ? { scrollBehavior: 'sticky' } : {}),
  }, {
    backgroundColor: alphaOf(n.s.backgroundColor) > 0 ? n.s.backgroundColor : 'transparent',
    color: first.s.color,
    fontSize: first.s.fontSize,
    fontFamily: first.s.fontFamily,
    fontWeight: first.s.fontWeight,
    padding: `0px ${inset}px`,
    ...(n.s.boxShadow && n.s.boxShadow !== 'none' ? { boxShadow: n.s.boxShadow } : {}),
  }, { x: 0, y: Math.max(0, Math.round(n.rect.y)), w: ctx.width, h: Math.max(24, Math.ceil(n.rect.h)) })
}

function section(n, ctx) {
  const children = [...backdrop(n, ctx)]
  const inside = n.tag === 'a' && n.href !== undefined ? n.href : undefined
  ;(n.kids || []).forEach((kid) => walk(kid, children, innerOrigin(n), 1, ctx, inside))
  children.push(...edgeLines(n, ctx))
  const innerMax = children.reduce((max, c) => Math.max(max, subtreeDepth(c)), 0)
  const budget = Math.max(1, MAX_NESTING_DEPTH - 1 - innerMax)
  const box = block(ctx, 'region', { contentWidth: ctx.width }, {
    backgroundColor: 'transparent',
    ...boxStyles(n.s),
    overflow: 'hidden',
  }, { x: 0, y: Math.max(0, Math.round(n.rect.y)), w: ctx.width, h: Math.max(8, Math.ceil(n.rect.h)) }, fitChildren(children, ctx, budget))
  if (isPinnedPos(n.s.position)) pin(box, n, ctx)
  return box
}

// The page from the top: full-width pieces become sections, and a wrapper
// that only holds full-width pieces is looked through.
function bands(n, out, ctx) {
  for (const kid of n.kids || []) {
    const first = out.length
    entering(ctx, kid, () => band(kid, out, ctx))
    marked(out.slice(first), kid, { x: ctx.left, y: 0 })
  }
}

function band(kid, out, ctx) {
  if (kid.kind || !isWide(kid, ctx)) {
    walk(kid, out, { x: ctx.left, y: 0 }, 0, ctx)
    return
  }
  const kids = kid.kids || []
  const wrapper = !isPainted(kid.s) && !SEMANTIC.has(kid.tag) && kids.length > 0 && kids.every((inner) => !inner.kind && isWide(inner, ctx))
  if (wrapper) {
    const first = out.length
    bands(kid, out, ctx)
    lendId(out[first], kid, ctx)
    return
  }
  const navbar = navbarFrom(kid, ctx)
  if (navbar) {
    out.push(navbar)
    return
  }
  if (!kids.length && !isPainted(kid.s)) return
  out.push(...named([section(kid, ctx)], kid, ctx))
}

const randomId = (type) => `${type}_${Math.random().toString(36).slice(2, 8)}`

function retargetAll(components, renames) {
  if (!renames?.size) return components
  let out = components
  for (const [from, to] of renames) out = retargetLinks(out, from, to)
  return out
}

function buildMeasured(measured, { makeId = randomId } = {}) {
  const page = measured?.root?.rect
  const width = Math.max(320, Math.min(4000, Math.round(page?.w || measured?.width || 1200)))
  const ctx = { width, left: page?.x || 0, viewHeight: Math.max(1, Number(measured?.viewHeight) || 900), id: makeId, anchors: new Set(), renames: new Map(), report: { native: 0, html: 0, tooLarge: 0 }, at: null, parentOf: new WeakMap() }
  const components = []
  if (measured?.root) entering(ctx, measured.root, () => bands(measured.root, components, ctx))
  // The phone layout, when the reader read the page at a phone's width.
  const phone = measured?.phone && measured.root?.m && !measured.root.m.hidden ? measured.phone : null
  if (phone) phoneLayouts(components, ctx, { x: measured.root.m.x || 0, y: 0 })
  strip(components)
  const [body, root] = measured?.background || []
  return {
    renames: ctx.renames,
    page: {
      components: retargetAll(components, ctx.renames),
      canvasWidth: width,
      background: hexOf(alphaOf(body) > 0 ? body : root),
      fonts: Array.isArray(measured?.fonts) ? measured.fonts : [],
      // The document's own font files, for the families the blocks use.
      fontFaces: fontFacesUsedBy((measured?.fontFaces || []).map((face) => face?.css || '').join('\n'), components),
      // The phone's width the layouts above were read at.
      ...(phone ? { mobileWidth: Math.max(240, Math.min(1200, Math.round(phone.width))) } : {}),
      title: measured?.title || '',
      description: measured?.description || '',
      language: measured?.language || '',
      report: { ...ctx.report, scripts: measured?.scripts || 0, hidden: measured?.hiddenParts || 0 },
    },
  }
}

export function canvasFromMeasured(measured, { makeId = randomId } = {}) {
  return buildMeasured(measured, { makeId }).page
}

// A block as drawn, whatever it is called.
// The phone layout is left out: the same block in two parts is the same
// block, though the page under it is longer in one of them.
const look = (c) => JSON.stringify(c, (key, value) => (key === 'id' || key === 'mobileLayout' || key === 'hiddenMobile' ? undefined : value))

const isChrome = (c) => c?.type === 'navbar' || isPinnedPos(c?.props?.scrollBehavior)
const CHROME_PAINT_KEYS = new Set([
  'color', 'backgroundColor', 'backgroundImage', 'borderColor',
  'border', 'boxShadow', 'fontWeight', 'textDecoration', 'opacity',
])
const collectChromeHrefs = (c, out = []) => {
  if (c?.props?.href) out.push(c.props.href)
  if (Array.isArray(c?.props?.links)) {
    for (const l of c.props.links) if (l?.href) out.push(l.href)
  }
  if (Array.isArray(c?.children)) {
    for (const child of c.children) collectChromeHrefs(child, out)
  }
  return out
}

// Persistent pinned/navbar chrome often flips link colour, weight, or a chapter
// progress indicator across states; compare its navigation signature or stripped
// structure so it stays emitted once rather than duplicated per part.
const chromeLook = (c) => {
  const hrefs = collectChromeHrefs(c)
  if (hrefs.length >= 2) {
    // A menu as tall as the screen is drawn top to bottom whatever height it
    // measured at (a part with a horizontal scrollbar measures it shorter):
    // its height must not make every part look like it has a menu of its own.
    const full = c.props?.pinHeight === 'full'
    return JSON.stringify({
      type: c.type,
      scrollBehavior: c.props?.scrollBehavior,
      layout: full ? { ...c.layout, h: 'full' } : c.layout,
      hrefs,
    })
  }
  return JSON.stringify(c, (key, value) => {
    if (key === 'id') return undefined
    if (key === 'styles' && value && typeof value === 'object') {
      const stripped = {}
      for (const [k, v] of Object.entries(value)) {
        if (!CHROME_PAINT_KEYS.has(k)) stripped[k] = v
      }
      return stripped
    }
    return value
  })
}

// How many blocks of each kind a list holds, as the report counts them.
function tally(list, into) {
  for (const c of list) {
    into[c.type === 'html' ? 'html' : 'native'] += 1
    if (c.children) tally(c.children, into)
  }
  return into
}

function keepFirstAnchors(list, seen = new Set()) {
  for (const c of list) {
    const anchor = c.props?.anchor
    if (anchor) {
      if (seen.has(anchor)) {
        c.props = { ...c.props }
        delete c.props.anchor
      } else seen.add(anchor)
    }
    if (c.children) keepFirstAnchors(c.children, seen)
  }
}

// The words of the first heading in a list of blocks.
function headingOf(list) {
  const nonChrome = list.filter((c) => !isChrome(c))
  const scan = (items, tag) => {
    for (const c of items) {
      if (c.type === 'heading' && c.props.text && (!tag || c.props.level === tag)) {
        return c.props.text.replace(/\s+/g, ' ').trim().slice(0, 80)
      }
      const inside = scan(c.children || [], tag)
      if (inside) return inside
    }
    return ''
  }
  return scan(nonChrome, 'h1') || scan(nonChrome, '') || scan(list, '')
}

const withKey = (c, key) => ({ ...c, props: { ...c.props, shownBy: [...new Set([key, ...(c.props.shownBy || [])])].slice(0, 16) } })

// A page that shows its parts one at a time (chapters, tabs) stays one page,
// and shows them one at a time too (utils/pageShow.js): each part's blocks
// stand where the browser drew them with that part shown, and carry the
// part's key. What every part has, as drawn (the side menu, a header), is
// written once and always shown. The page opens on the part it opened on,
// and a "#id" link to a block of another part shows that part. The keys of
// what a click shows are off when the page opens, as they were.
export function canvasPageFromMeasured(measured, { makeId = randomId } = {}) {
  const baseBuilt = buildMeasured(measured, { makeId })
  const offOf = (data) => (Array.isArray(data?.offKeys) ? data.offKeys : [])
  const states = (measured?.states || []).filter((state) => state?.data?.root)
  if (!states.length) return { ...baseBuilt.page, parts: [], hiddenKeys: offOf(measured), partCount: 1 }
  const stateBuilt = states.map((state) => buildMeasured(state.data, { makeId }))
  const allRenames = new Map(baseBuilt.renames)
  for (const built of stateBuilt) {
    for (const [from, to] of built.renames) if (!allRenames.has(from)) allRenames.set(from, to)
  }
  const page = { ...baseBuilt.page, components: retargetAll(baseBuilt.page.components, allRenames) }
  const made = stateBuilt.map((built) => ({ ...built.page, components: retargetAll(built.page.components, allRenames) }))
  const looks = made.map((part) => new Set(part.components.map(look)))
  const chromeLooks = made.map((part) => new Set(part.components.filter(isChrome).map(chromeLook)))
  const shared = new Set(page.components.map(look).filter((drawn) => looks.every((set) => set.has(drawn))))
  const sharedChrome = new Set(
    page.components
      .filter((c) => !shared.has(look(c)) && isChrome(c))
      .map(chromeLook)
      .filter((drawn) => chromeLooks.every((set) => set.has(drawn))),
  )
  const isShared = (c) => shared.has(look(c)) || (isChrome(c) && sharedChrome.has(chromeLook(c)))
  const own = (list) => list.filter((c) => !isShared(c))
  const parts = [{ key: 'p0', label: headingOf(own(page.components)) || page.title || 'Start' }]
  const components = [
    ...page.components.filter(isShared),
    ...own(page.components).map((c) => withKey(c, 'p0')),
  ]
  const report = { ...page.report, hidden: 0 }
  made.forEach((part, index) => {
    const key = `p${index + 1}`
    const mine = own(part.components)
    parts.push({ key, label: states[index].label || headingOf(mine) || `Part ${index + 2}` })
    components.push(...mine.map((c) => withKey(c, key)))
    tally(mine, report)
    report.tooLarge += Math.max(0, part.report.tooLarge - page.report.tooLarge)
  })
  keepFirstAnchors(components)
  const hiddenKeys = [...new Set([...parts.slice(1).map((part) => part.key), offOf(measured), ...states.map((state) => offOf(state.data))].flat())]
  return {
    ...page,
    components,
    fontFaces: fontFacesUsedBy((measured?.fontFaces || []).map((face) => face?.css || '').join('\n'), components),
    report,
    parts,
    hiddenKeys,
    partCount: parts.length,
  }
}
