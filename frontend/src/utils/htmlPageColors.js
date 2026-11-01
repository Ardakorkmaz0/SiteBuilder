// The colours an HTML page actually uses, and a way to swap one of them
// everywhere it appears.
//
// The theme panel restyles a document through CSS variables it knows by name
// (--primary, --bg …). A page someone uploads rarely uses those names, so on
// such a page the theme changed one accent colour and the fonts, and text,
// backgrounds and cards stayed as they were. This reads the page's own colours
// instead, so any page can be recoloured one colour at a time.
//
// Only CSS is read: <style> sheets, style="" attributes and the colour
// attributes of inline SVG. A link to "#add" or the words "#fff" in a
// paragraph are not colours. Within CSS, only colour-bearing properties
// (and custom properties) are read, so a font called "Red Hat" or
// `white-space` never turns into a colour.

const COLOR_PROPERTY = /^(--[\w-]+|color|background(-color|-image)?|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?|outline(-color)?|box-shadow|text-shadow|fill|stroke|stop-color|flood-color|lighting-color|caret-color|accent-color|text-decoration(-color)?|text-emphasis(-color)?|column-rule(-color)?|scrollbar-color|-webkit-text-fill-color|-webkit-text-stroke(-color)?)$/i

const SVG_COLOR_ATTRS = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'color']

const NAMED = {
  white: '#ffffff', black: '#000000', red: '#ff0000', green: '#008000', blue: '#0000ff',
  yellow: '#ffff00', orange: '#ffa500', purple: '#800080', gray: '#808080', grey: '#808080',
  silver: '#c0c0c0', navy: '#000080', teal: '#008080', maroon: '#800000', olive: '#808000',
  lime: '#00ff00', aqua: '#00ffff', fuchsia: '#ff00ff', pink: '#ffc0cb', gold: '#ffd700',
  brown: '#a52a2a', crimson: '#dc143c', coral: '#ff7f50', tomato: '#ff6347', indigo: '#4b0082',
  violet: '#ee82ee', beige: '#f5f5dc', ivory: '#fffff0', khaki: '#f0e68c', salmon: '#fa8072',
  tan: '#d2b48c', turquoise: '#40e0d0', whitesmoke: '#f5f5f5', gainsboro: '#dcdcdc',
  lightgray: '#d3d3d3', lightgrey: '#d3d3d3', darkgray: '#a9a9a9', darkgrey: '#a9a9a9',
  dimgray: '#696969', dimgrey: '#696969', slategray: '#708090', slategrey: '#708090',
}

// One colour token inside a CSS value: hex, rgb()/rgba(), hsl()/hsla(), or a
// colour name standing as a word of its own.
const TOKEN = new RegExp(
  `#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![0-9a-z_-])|rgba?\\([^)]*\\)|hsla?\\([^)]*\\)|(?<![\\w-])(?:${Object.keys(NAMED).join('|')})(?![\\w-])`,
  'gi',
)

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const hex2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0')

function hslToRgb(h, s, l) {
  const hue = (((h % 360) + 360) % 360) / 360
  if (s === 0) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t) => {
    let x = t
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  return [channel(hue + 1 / 3) * 255, channel(hue) * 255, channel(hue - 1 / 3) * 255]
}

function alphaOf(part) {
  if (part === undefined) return 1
  const text = String(part).trim()
  const n = parseFloat(text)
  if (!Number.isFinite(n)) return 1
  return clamp(text.endsWith('%') ? n / 100 : n, 0, 1)
}

// A colour token → { rgb: '#rrggbb', alpha: 0..1 }, or null when it is not one
// we can read (a calc(), a var() inside rgb(), …).
export function parseColor(token) {
  const text = String(token || '').trim().toLowerCase()
  if (NAMED[text]) return { rgb: NAMED[text], alpha: 1 }
  if (text.startsWith('#')) {
    let h = text.slice(1)
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('')
    if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(h)) return null
    return { rgb: `#${h.slice(0, 6)}`, alpha: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 }
  }
  const fn = text.match(/^(rgba?|hsla?)\(([^)]*)\)$/)
  if (!fn) return null
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean)
  if (parts.length < 3 || parts.some((p) => /[a-z(]/i.test(p.replace(/deg$|%$/, '')))) return null
  if (fn[1].startsWith('rgb')) {
    const channel = (p) => (p.endsWith('%') ? parseFloat(p) * 2.55 : parseFloat(p))
    return { rgb: `#${hex2(channel(parts[0]))}${hex2(channel(parts[1]))}${hex2(channel(parts[2]))}`, alpha: alphaOf(parts[3]) }
  }
  const [r, g, b] = hslToRgb(parseFloat(parts[0]), parseFloat(parts[1]) / 100, parseFloat(parts[2]) / 100)
  return { rgb: `#${hex2(r)}${hex2(g)}${hex2(b)}`, alpha: alphaOf(parts[3]) }
}

// The new colour written in place of an old token: plain hex when the old one
// was opaque, its own transparency kept otherwise.
function written(rgb, alpha) {
  if (alpha >= 1) return rgb
  const r = parseInt(rgb.slice(1, 3), 16)
  const g = parseInt(rgb.slice(3, 5), 16)
  const b = parseInt(rgb.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 1000) / 1000})`
}

// Each colour-bearing value in a CSS text, through `visit(value) → value`.
function mapCss(css, visit) {
  return css.replace(/([{;\s]|^)([-\w]+)(\s*:\s*)([^;{}]+)/g, (whole, lead, prop, colon, value) => (
    COLOR_PROPERTY.test(prop) ? `${lead}${prop}${colon}${visit(value)}` : whole
  ))
}

// Tokens inside url(…) are file names and fragment ids, not colours.
function mapValue(value, visitToken) {
  return value
    .split(/(url\([^)]*\))/i)
    .map((piece) => (/^url\(/i.test(piece) ? piece : piece.replace(TOKEN, visitToken)))
    .join('')
}

// Every CSS place in a document, through `visit(css) → css`.
function mapDocument(html, visit) {
  return String(html || '')
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi, (whole, open, css, close) => `${open}${visit(css)}${close}`)
    .replace(/(<[a-z][^>]*?\sstyle\s*=\s*)(["'])([\s\S]*?)\2/gi, (whole, head, quote, css) => `${head}${quote}${visit(css)}${quote}`)
    .replace(new RegExp(`(<(?:svg|path|circle|rect|ellipse|line|polyline|polygon|g|text|stop|use|tspan)\\b[^>]*?\\s(?:${SVG_COLOR_ATTRS.join('|')})\\s*=\\s*)(["'])([^"']*)\\2`, 'gi'),
      (whole, head, quote, value) => `${head}${quote}${mapValue(value, (token) => visit.token(token))}${quote}`)
}

// The colours a page uses, most used first: [{ color: '#rrggbb', count }].
// Transparency is set aside, so black text and a soft black shadow are one
// colour to change.
export function pageColors(html, { limit = 16 } = {}) {
  const counts = new Map()
  const count = (token) => {
    const parsed = parseColor(token)
    if (parsed && parsed.alpha > 0) counts.set(parsed.rgb, (counts.get(parsed.rgb) || 0) + 1)
    return token
  }
  const visit = (css) => mapCss(css, (value) => mapValue(value, count))
  visit.token = count
  mapDocument(html, visit)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([color, n]) => ({ color, count: n }))
}

// The page with one colour swapped everywhere it appears, each place keeping
// its own transparency. Returns the html unchanged when the colour is unused.
export function replacePageColor(html, from, to) {
  const source = parseColor(from)
  const target = parseColor(to)
  if (!source || !target) return String(html || '')
  const swap = (token) => {
    const parsed = parseColor(token)
    return parsed && parsed.rgb === source.rgb ? written(target.rgb, parsed.alpha) : token
  }
  const visit = (css) => mapCss(css, (value) => mapValue(value, swap))
  visit.token = swap
  return mapDocument(html, visit)
}
