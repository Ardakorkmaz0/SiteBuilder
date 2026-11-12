// Turns a measured HTML page (htmlPageMeasure.js) into canvas components.
//
// Every visible piece of the page becomes a block of its own, placed where
// the browser drew it: a heading, a text, an image, a button, a link, a list,
// a line. A box with a background becomes a section or a container holding
// what is inside it. What the canvas has no block for (a table, a form, a
// video, a sentence with a link inside it) is kept as it is in an HTML block,
// which moves and resizes like any other block. Nothing is dropped silently:
// the report counts what was kept as HTML and what could not be carried.

import { ANCHOR_RE } from './anchors.js'
import { fontFacesUsedBy } from './fontFaces.js'

// Mirrors MAX_CHILDREN and MAX_HTML_EMBED in backend/builder/validators.py.
const MAX_CHILDREN = 60
const MAX_HTML_CODE = 50 * 1024
// A section holds containers, and those hold blocks: one level of boxes with
// children inside a section keeps the page inside the server's nesting limit.
const MAX_BOX_DEPTH = 2
const GROUP_SIZE = 40

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
const pictureOf = (image) => (String(image || '').match(/url\((['"]?)(.*?)\1\)/i) || [])[2] || ''

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

function radiusOf(s) {
  const corners = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map((corner) => s[`border${corner}Radius`] || '0px')
  if (corners.every((corner) => px(corner) === 0)) return ''
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
function place(rect, origin, grow = 0) {
  return {
    x: Math.max(0, Math.round(rect.x - origin.x)),
    y: Math.max(0, Math.round(rect.y - origin.y)),
    w: Math.max(8, Math.ceil(rect.w) + grow),
    h: Math.max(4, Math.ceil(rect.h)),
  }
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
  return { id: ctx.id(type), type, props, styles, layout, ...(children ? { children } : {}) }
}

// The element's id as the block's anchor, so a "#id" link on the page still
// finds it. One block per id, and only an id the canvas can keep.
function named(made, n, ctx) {
  const target = made[made.length - 1]
  if (!target || !n.id || !ANCHOR_RE.test(n.id) || ctx.anchors.has(n.id)) return made
  ctx.anchors.add(n.id)
  target.props = { ...target.props, anchor: n.id }
  return made
}

// The block for a piece of the page that has no pieces inside it, or null
// when `n` is a box to look into.
function leaf(n, origin, ctx, href) {
  const link = href ? { href } : {}
  if (n.kind === 'image') {
    if (!n.src) return []
    const radius = radiusOf(n.s)
    const fit = n.tag === 'svg' ? 'contain' : n.s.objectFit || 'fill'
    return [block(ctx, 'image', { src: n.src, alt: n.alt || '', ...link }, { objectFit: fit, ...(radius ? { borderRadius: radius } : {}) }, place(n.rect, origin))]
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
  const rich = Array.isArray(n.runs) && n.runs.length ? { rich: n.runs } : {}
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

// A parent holds at most MAX_CHILDREN blocks. More than that are gathered,
// in reading order, into plain containers the eye cannot see.
function fitChildren(children, ctx) {
  if (children.length <= MAX_CHILDREN) return children
  const ordered = [...children].sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x)
  const groups = []
  for (let start = 0; start < ordered.length; start += GROUP_SIZE) {
    const members = ordered.slice(start, start + GROUP_SIZE)
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
  return fitChildren(groups, ctx)
}

function walk(n, out, origin, depth, ctx, href) {
  const made = leaf(n, origin, ctx, href)
  if (made) {
    out.push(...named(made, n, ctx))
    return
  }
  const inside = n.tag === 'a' && n.href !== undefined ? n.href : href
  const kids = n.kids || []
  if (!isPainted(n.s) || n.rect.w < 1 || n.rect.h < 1) {
    // Nothing of its own to show: what it holds stands where it stood.
    kids.forEach((kid) => walk(kid, out, origin, depth, ctx, inside))
    return
  }
  const styles = { backgroundColor: 'transparent', ...boxStyles(n.s), padding: '0px', ...(radiusOf(n.s) ? {} : { borderRadius: '0px' }) }
  const layout = place(n.rect, origin)
  const holds = kids.length > 0 || !!pictureOf(n.s.backgroundImage)
  if (holds && depth < MAX_BOX_DEPTH && layout.h >= 16) {
    const children = [...backdrop(n, ctx)]
    kids.forEach((kid) => walk(kid, children, innerOrigin(n), depth + 1, ctx, inside))
    children.push(...edgeLines(n, ctx))
    const box = block(ctx, 'container', {}, styles, layout, fitChildren(children, ctx))
    if (depth === 0 && n.s.position === 'fixed') pin(box, n, ctx)
    out.push(...named([box], n, ctx))
    return
  }
  // Nothing inside it, or too deep (or too flat) for a box with children:
  // the box is drawn as a shape, and what it held is laid over it.
  out.push(shape(ctx, boxStyles(n.s), n.rect, origin), ...backdropOver(n, origin, ctx))
  kids.forEach((kid) => walk(kid, out, origin, depth, ctx, inside))
}

// A box the page keeps in place on the screen (position: fixed) stays there
// on the canvas too, at the same distance from the same screen edges. One
// that runs down the whole screen (a side menu) does so at any screen height
// and scrolls inside itself when it does not fit; on a phone it is hidden, as
// such a menu is on the page itself, where it would cover most of the screen.
function pin(box, n, ctx) {
  const view = ctx.viewHeight
  // Measured from the screen edges it is nearer to.
  const full = n.rect.y <= 1 && n.rect.h >= view - 2
  const right = n.rect.x - ctx.left + n.rect.w / 2 > ctx.width / 2
  const bottom = !full && n.rect.y + n.rect.h / 2 > view / 2
  box.props = {
    ...box.props,
    scrollBehavior: 'fixed',
    pinX: right ? 'right' : 'left',
    pinY: bottom ? 'bottom' : 'top',
    pinOffsetX: Math.round(right ? ctx.left + ctx.width - (n.rect.x + n.rect.w) : n.rect.x - ctx.left),
    pinOffsetY: Math.round(bottom ? view - (n.rect.y + n.rect.h) : n.rect.y),
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
  return block(ctx, 'region', { contentWidth: ctx.width }, {
    backgroundColor: 'transparent',
    ...boxStyles(n.s),
    overflow: 'hidden',
  }, { x: 0, y: Math.max(0, Math.round(n.rect.y)), w: ctx.width, h: Math.max(8, Math.ceil(n.rect.h)) }, fitChildren(children, ctx))
}

// The page from the top: full-width pieces become sections, and a wrapper
// that only holds full-width pieces is looked through.
function bands(n, out, ctx) {
  for (const kid of n.kids || []) {
    if (kid.kind || !isWide(kid, ctx)) {
      walk(kid, out, { x: ctx.left, y: 0 }, 0, ctx)
      continue
    }
    const kids = kid.kids || []
    const wrapper = !isPainted(kid.s) && !SEMANTIC.has(kid.tag) && kids.length > 0 && kids.every((inner) => !inner.kind && isWide(inner, ctx))
    if (wrapper) {
      bands(kid, out, ctx)
      continue
    }
    const navbar = navbarFrom(kid, ctx)
    if (navbar) {
      out.push(navbar)
      continue
    }
    if (!kids.length && !isPainted(kid.s)) continue
    out.push(...named([section(kid, ctx)], kid, ctx))
  }
}

const randomId = (type) => `${type}_${Math.random().toString(36).slice(2, 8)}`

export function canvasFromMeasured(measured, { makeId = randomId } = {}) {
  const page = measured?.root?.rect
  const width = Math.max(320, Math.min(4000, Math.round(page?.w || measured?.width || 1200)))
  const ctx = { width, left: page?.x || 0, viewHeight: Math.max(1, Number(measured?.viewHeight) || 900), id: makeId, anchors: new Set(), report: { native: 0, html: 0, tooLarge: 0 } }
  const components = []
  if (measured?.root) bands(measured.root, components, ctx)
  const [body, root] = measured?.background || []
  return {
    components,
    canvasWidth: width,
    background: hexOf(alphaOf(body) > 0 ? body : root),
    fonts: Array.isArray(measured?.fonts) ? measured.fonts : [],
    // The document's own font files, for the families the blocks use.
    fontFaces: fontFacesUsedBy((measured?.fontFaces || []).map((face) => face?.css || '').join('\n'), components),
    title: measured?.title || '',
    description: measured?.description || '',
    language: measured?.language || '',
    report: { ...ctx.report, scripts: measured?.scripts || 0, hidden: measured?.hiddenParts || 0 },
  }
}

const randomPageId = () => `page_${Math.random().toString(36).slice(2, 8)}`

// Where a "#id" link should lead once the page's states are pages: to the
// block on its own page when the id is there, else to the page that shows it.
function retarget(pages) {
  const owner = new Map()
  for (const page of pages) for (const id of page.ids) if (!owner.has(id)) owner.set(id, page.id)
  for (const page of pages) {
    const here = new Set(page.ids)
    const lead = (href) => {
      if (typeof href !== 'string' || !href.startsWith('#')) return href
      let id = href.slice(1)
      try { id = decodeURIComponent(id) } catch { /* as written */ }
      if (!id || here.has(id) || !owner.has(id)) return href
      return `#${owner.get(id)}`
    }
    const visit = (list) => {
      for (const c of list || []) {
        if (typeof c.props.href === 'string') c.props.href = lead(c.props.href)
        if (Array.isArray(c.props.links)) c.props.links = c.props.links.map((link) => ({ ...link, href: lead(link.href) }))
        if (Array.isArray(c.props.rich)) c.props.rich = c.props.rich.map((run) => (typeof run.href === 'string' ? { ...run, href: lead(run.href) } : run))
        if (c.type === 'html') c.props.code = c.props.code.replace(/(href=")(#[^"]*)(")/g, (all, open, href, close) => `${open}${lead(href.replace(/&amp;/g, '&'))}${close}`)
        visit(c.children)
      }
    }
    visit(page.components)
  }
}

// A page that shows its parts one at a time (chapters, tabs) becomes one
// canvas page for each of them: the one it opens on first, as the page being
// converted, and the others as new pages after it, named by their headings.
// Links between the parts become links between the pages.
export function pagesFromMeasured(measured, { makeId = randomId, makePageId = randomPageId, firstPageId = 'page_home' } = {}) {
  const states = [
    { name: '', data: measured },
    ...(measured?.states || []).map((state) => ({ name: state.label || '', data: { ...state.data, fonts: measured.fonts, fontFaces: measured.fontFaces, scripts: measured.scripts } })),
  ]
  const pages = states.map((state, index) => ({
    id: index === 0 ? firstPageId : makePageId(),
    name: state.name,
    ids: Array.isArray(state.data?.ids) ? state.data.ids : [],
    ...canvasFromMeasured(state.data, { makeId }),
  }))
  retarget(pages)
  return pages
}
