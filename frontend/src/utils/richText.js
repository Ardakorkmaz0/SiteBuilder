// Formatting inside a text or heading block: a word in bold, a link in the
// middle of a sentence, a formula drawn as a small picture in the line.
//
// It is kept as a list of runs beside the block's plain `text`, never as
// markup: a run is a piece of text with the few marks listed below, or an
// inline picture. Runs are drawn as elements (on the canvas) or written as
// escaped HTML (on the published page), so nothing in them is ever parsed as
// code. Mirrors sanitize_rich in backend/builder/validators.py.
//
//   { t, b, i, u, c, bg, f, z, v, href }   text
//   { img, w, h, va, alt, href }           inline picture
//
// The runs belong to the text they were made from: once the owner types a
// different text in the panel, they no longer match it and the block shows
// its plain text again.

import { sanitizeImageSrc, sanitizeUrl } from './sanitize.js'

export const MAX_RICH_RUNS = 400
// An inline picture is drawn with this much room on each side for its edges
// (htmlPageMeasure.js), and set back by as much, so it takes the width in the
// line that the piece it was drawn from took.
export const PICTURE_BLEED = 1

const UNSAFE = /javascript:|expression\(|url\(|[;{}<>]/i
const clean = (value, max = 200) => {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
  return text && text.length <= max && !UNSAFE.test(text) ? text : ''
}
const SIZE = /^\d{1,3}(\.\d{1,3})?px$/
const WEIGHT = /^([1-9]00|bold|normal)$/
const LINE = new Set(['underline', 'line-through', 'none', 'underline line-through'])

// The text the runs spell: what `props.text` holds while they apply.
export function richPlainText(runs) {
  return (Array.isArray(runs) ? runs : []).map((run) => (typeof run?.t === 'string' ? run.t : '')).join('')
}

// The block's runs when they still belong to its text, else null.
export function richRuns(props) {
  const runs = props?.rich
  if (!Array.isArray(runs) || !runs.length || runs.length > MAX_RICH_RUNS) return null
  if (richPlainText(runs) !== (props.text ?? '')) return null
  return runs.filter((run) => run && typeof run === 'object' && (typeof run.t === 'string' || typeof run.img === 'string'))
}

// A text run's marks as CSS, property by property, each value checked.
function marks(run) {
  const out = []
  const weight = clean(run.b, 10)
  if (WEIGHT.test(weight)) out.push(['font-weight', weight])
  if (run.i === 'italic' || run.i === 'normal') out.push(['font-style', run.i])
  if (LINE.has(run.u)) out.push(['text-decoration', run.u])
  const colour = clean(run.c, 64)
  if (colour) out.push(['color', colour])
  const back = clean(run.bg, 64)
  if (back) out.push(['background-color', back])
  const face = clean(run.f)
  if (face) out.push(['font-family', face])
  if (SIZE.test(run.z || '')) out.push(['font-size', run.z])
  if (run.v === 'super' || run.v === 'sub') out.push(['vertical-align', run.v])
  return out
}

const camel = (name) => name.replace(/-([a-z])/g, (all, letter) => letter.toUpperCase())
const number = (value, low, high) => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(low, Math.min(high, n)) : null
}

// What to draw for one run: { kind: 'text' | 'image', … } with checked values.
export function richPiece(run) {
  const href = sanitizeUrl(run.href)
  if (typeof run.img === 'string') {
    const src = sanitizeImageSrc(run.img)
    const width = number(run.w, 1, 4000)
    const height = number(run.h, 1, 4000)
    if (!src || width === null || height === null) return null
    const left = number(run.ml, -400, 400)
    const right = number(run.mr, -400, 400)
    return {
      kind: 'image',
      src,
      width,
      height,
      shift: number(run.va, -400, 400) || 0,
      // Set back by the room around its ink (htmlPageMeasure.js), or by the
      // bleed when that was not measured.
      marginLeft: left === null ? -PICTURE_BLEED : left,
      marginRight: right === null ? -PICTURE_BLEED : right,
      alt: typeof run.alt === 'string' ? run.alt.slice(0, 300) : '',
      href,
    }
  }
  return { kind: 'text', text: run.t, css: marks(run), href }
}

// Marks as a React style object.
export function richStyle(piece) {
  return Object.fromEntries(piece.css.map(([name, value]) => [camel(name), value]))
}

const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// The runs as HTML for a published page, or '' when the block has none.
export function richHtml(props) {
  const runs = richRuns(props)
  if (!runs) return ''
  return runs.map((run) => {
    const piece = richPiece(run)
    if (!piece) return ''
    let html
    if (piece.kind === 'image') {
      html = `<img src="${esc(piece.src)}" alt="${esc(piece.alt)}" style="display:inline-block;width:${piece.width}px;height:${piece.height}px;vertical-align:${piece.shift}px;max-width:none;margin:0 ${piece.marginRight}px 0 ${piece.marginLeft}px">`
    } else {
      const text = esc(piece.text).replace(/\r?\n/g, '<br>')
      const css = piece.css.map(([name, value]) => `${name}:${esc(value)}`).join(';')
      html = css ? `<span style="${css}">${text}</span>` : text
    }
    return piece.href ? `<a href="${esc(piece.href)}" style="color:inherit">${html}</a>` : html
  }).join('')
}
