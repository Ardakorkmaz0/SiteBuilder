// Light and dark: a site whose visitors can switch between two palettes.
//
// A site is designed in one palette, its theme. Applying a theme copies its
// colours into every component as plain values, so there is no variable left
// to swap once the page is live. This module finds them again: a value that is
// one of the theme's role colours, in a place that role belongs (a background
// where the page background goes, text where the text colour goes), is written
// as var(--pwb-alt-<role>, <value>). Those variables exist only while the other
// palette is on, so the page as designed renders exactly as before; switching
// sets data-pwb-theme on the root and every role colour follows. A colour the
// owner picked for one block stays as it is, and so does the text inside a box
// with such a colour, so a yellow card keeps readable text in both palettes.

import { normalizeTheme, pageTheme, readableTextOn } from './theme.js'

// The theme's colour roles, and the name each one's variable carries.
const ROLE_VARS = {
  backgroundColor: 'bg',
  surfaceColor: 'surface',
  softColor: 'soft',
  headerColor: 'header',
  headerTextColor: 'header-text',
  textColor: 'text',
  mutedColor: 'muted',
  borderColor: 'border',
  primaryColor: 'primary',
  buttonTextColor: 'button-text',
  accentColor: 'accent',
  // Text on the accent colour (badges): not a theme field, worked out.
  onAccent: 'on-accent',
}
export const COLOR_ROLES = Object.keys(ROLE_VARS).filter((role) => role !== 'onAccent')

// The --site-* variables the page's own CSS reads, following the palette too.
const SITE_VARS = {
  primaryColor: 'primary',
  buttonTextColor: 'button-text',
  textColor: 'text',
  mutedColor: 'muted',
  borderColor: 'border',
  backgroundColor: 'bg',
  surfaceColor: 'surface',
  softColor: 'soft',
  headerColor: 'header',
  headerTextColor: 'header-text',
  accentColor: 'accent',
}

// Named colours worth knowing: the greys, which follow the palette like any
// other. A name with a hue is a colour of the owner's own.
const NAMED_GREYS = {
  white: '#ffffff', snow: '#fffafa', ghostwhite: '#f8f8ff', whitesmoke: '#f5f5f5',
  gainsboro: '#dcdcdc', lightgray: '#d3d3d3', lightgrey: '#d3d3d3', silver: '#c0c0c0',
  darkgray: '#a9a9a9', darkgrey: '#a9a9a9', gray: '#808080', grey: '#808080',
  dimgray: '#696969', dimgrey: '#696969', slategray: '#708090', slategrey: '#708090',
  black: '#000000',
}

// Every colour written in a value. A url() comes first so that a file named
// after a colour is passed over whole.
const COLOR_TOKEN = new RegExp(
  `url\\([^)]*\\)|#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})\\b|\\b(?:rgb|hsl)a?\\([^()]*\\)|(?<![-\\w#.])(?:${Object.keys(NAMED_GREYS).join('|')})(?![-\\w])`,
  'gi',
)

const toHex = (red, green, blue) => `#${[red, green, blue].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
const within = (value, max) => Math.min(max, Math.max(0, value))

function alphaOf(text) {
  if (text === undefined) return 1
  const number = parseFloat(text)
  if (Number.isNaN(number)) return null
  return within(text.endsWith('%') ? number / 100 : number, 1)
}

const HUE_UNITS = { deg: 1, grad: 0.9, rad: 180 / Math.PI, turn: 360 }

function hueOf(text) {
  const unit = /[a-z]+$/.exec(text)?.[0]
  return parseFloat(text) * (unit ? HUE_UNITS[unit] : 1)
}

function hslToHex(hue, saturation, lightness) {
  const channel = (n) => {
    const k = (n + hue / 30) % 12
    const a = saturation * Math.min(lightness, 1 - lightness)
    return (lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255
  }
  return toHex(channel(0), channel(8), channel(4))
}

// A colour as its plain hex and its opacity, or null for anything else.
export function parseColor(value) {
  const text = String(value || '').trim().toLowerCase()
  if (NAMED_GREYS[text]) return { hex: NAMED_GREYS[text], alpha: 1 }
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(text)
  if (hex) {
    const full = hex[1].length < 6 ? hex[1].split('').map((c) => c + c).join('') : hex[1]
    return { hex: `#${full.slice(0, 6)}`, alpha: full.length === 8 ? parseInt(full.slice(6), 16) / 255 : 1 }
  }
  const call = /^(rgb|hsl)a?\(([^()]*)\)$/.exec(text)
  if (!call) return null
  const parts = call[2].trim().split(/[\s,/]+/).filter(Boolean)
  if (parts.length !== 3 && parts.length !== 4) return null
  const alpha = alphaOf(parts[3])
  if (alpha === null) return null
  if (call[1] === 'rgb') {
    const channels = parts.slice(0, 3).map((part) => (part.endsWith('%') ? parseFloat(part) * 2.55 : parseFloat(part)))
    if (channels.some(Number.isNaN)) return null
    return { hex: toHex(...channels.map((v) => within(v, 255))), alpha }
  }
  const hue = hueOf(parts[0])
  const [saturation, lightness] = parts.slice(1, 3).map(parseFloat)
  if ([hue, saturation, lightness].some(Number.isNaN)) return null
  return { hex: hslToHex(((hue % 360) + 360) % 360, within(saturation, 100) / 100, within(lightness, 100) / 100), alpha }
}

export function normalizeHex(value) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value || '').trim())
  if (!match) return null
  const hex = match[1].length === 3 ? match[1].split('').map((c) => c + c).join('') : match[1]
  return `#${hex.toLowerCase()}`
}

function channels(hex) {
  const h = normalizeHex(hex)
  if (!h) return null
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
}

function luminance(hex) {
  const c = channels(hex)
  if (!c) return 1
  const lin = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

// Lightness and chroma, 0..1: enough to tell a grey from a colour. Chroma,
// not saturation: a pale slate grey has a high saturation and is still grey.
function lightChroma(hex) {
  const c = channels(hex)
  if (!c) return null
  const max = Math.max(...c)
  const min = Math.min(...c)
  return [(max + min) / 2, max - min]
}

const GREY = 0.16

function mix(hex, toward, amount) {
  const a = channels(hex)
  const b = channels(toward)
  const out = a.map((v, i) => Math.round((v + (b[i] - v) * amount) * 255))
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export function isDarkColor(value) {
  return luminance(value) < 0.18
}

// Which palette the site is designed in.
export function baseMode(theme) {
  return isDarkColor(normalizeTheme(theme).backgroundColor) ? 'dark' : 'light'
}

// A brand colour moved until it reads on the other background.
function readableOn(color, background, toward) {
  let out = normalizeHex(color) || toward
  for (let i = 0; i < 8 && contrast(out, background) < 3.2; i += 1) out = mix(out, toward, 0.18)
  return out
}

// Text on a colour in the other palette: white where it reads, then a near
// black. Between the two only pure black is sure of 4.5:1 on any colour.
function textOn(color) {
  return ['#ffffff', '#111111', '#000000'].find((text) => contrast(text, color) >= 4.5) || '#000000'
}

// The other palette, worked out from the theme: the owner can change every
// colour of it, this is where it starts.
export function suggestedAltTheme(theme) {
  const t = normalizeTheme(theme)
  if (baseMode(t) === 'light') {
    const bg = '#111317'
    const primary = readableOn(t.primaryColor, bg, '#ffffff')
    const accent = readableOn(t.accentColor, bg, '#ffffff')
    const header = isDarkColor(t.headerColor) ? normalizeHex(t.headerColor) || '#0b0c0f' : '#0b0c0f'
    return {
      backgroundColor: bg,
      surfaceColor: '#1a1d23',
      softColor: '#16191e',
      headerColor: header,
      headerTextColor: readableTextOn(header, '#eceef1') === '#111111' ? '#111111' : '#eceef1',
      textColor: '#eceef1',
      mutedColor: '#a3a9b3',
      borderColor: '#2e333b',
      primaryColor: primary,
      buttonTextColor: textOn(primary),
      accentColor: accent,
    }
  }
  const bg = '#ffffff'
  const primary = readableOn(t.primaryColor, bg, '#000000')
  const accent = readableOn(t.accentColor, bg, '#000000')
  const header = isDarkColor(t.headerColor) ? '#ffffff' : normalizeHex(t.headerColor) || '#ffffff'
  return {
    backgroundColor: bg,
    surfaceColor: '#ffffff',
    softColor: '#f4f5f7',
    headerColor: header,
    headerTextColor: readableTextOn(header) === '#111111' ? '#15171a' : '#ffffff',
    textColor: '#15171a',
    mutedColor: '#5f6670',
    borderColor: '#dfe2e7',
    primaryColor: primary,
    buttonTextColor: textOn(primary),
    accentColor: accent,
  }
}

// The other palette: the suggestion worked out from the palette the page is
// designed in, with the owner's own colours over it. Colours kept for the
// other direction (a dark palette on a page that is itself dark) are left
// out, rather than making a dark page darker.
export function altTheme(schema, designed = schema?.theme) {
  const suggested = suggestedAltTheme(designed)
  const own = schema?.colorMode?.theme || {}
  const ownBackground = normalizeHex(own.backgroundColor)
  const fits = !ownBackground || isDarkColor(ownBackground) !== (baseMode(designed) === 'dark')
  return Object.fromEntries(COLOR_ROLES.map((role) => [role, (fits && normalizeHex(own[role])) || suggested[role]]))
}

// An HTML page names its palette in its own CSS variables (--bg, --ink,
// --accent...): that, and not a site theme it may never have followed (a
// template keeps its own colours), is the palette it is designed in. What it
// does not name comes from the theme.
export function htmlPalette(html) {
  const out = {}
  for (const match of String(html || '').matchAll(/--([a-z0-9-]+)\s*:\s*([^;{}"']+)/gi)) {
    const role = VAR_ROLE.get(match[1].toLowerCase())
    const color = role && parseColor(match[2])
    if (color && color.alpha === 1 && !out[role]) out[role] = color.hex
  }
  return out
}

function designedTheme(schema, page, htmlMap = {}) {
  const html = htmlMap?.[page?.id] ?? page?.html
  const own = typeof html === 'string' && html.trim() ? htmlPalette(html) : {}
  return { ...pageTheme(schema, page), ...own }
}

function walk(components, visit) {
  for (const component of components || []) {
    if (visit(component)) return true
    if (walk(component.children, visit)) return true
  }
  return false
}

export const THEME_TOGGLE_ATTR = 'data-pwb-theme-toggle'

function pageHasThemeToggle(page, htmlMap) {
  return walk(page.components, (component) => component?.type === 'themeToggle')
    || String(htmlMap[page.id] ?? page.html ?? '').includes(THEME_TOGGLE_ATTR)
}

// A switch anywhere on the site, on a canvas page or in an HTML page.
export function hasThemeToggle(schema, htmlMap = {}) {
  return (schema?.pages || []).some((page) => pageHasThemeToggle(page, htmlMap))
}

// The pages a visitor could not change the palette on: the canvas pages, which
// can be given a switch for the owner, and the HTML pages, which cannot.
export function pagesWithoutThemeToggle(schema, htmlMap = {}) {
  const missing = (schema?.pages || []).filter((page) => !pageHasThemeToggle(page, htmlMap))
  const isHtml = (page) => page.mode === 'html' || !!String(htmlMap[page.id] ?? page.html ?? '').trim()
  return { canvas: missing.filter((page) => !isHtml(page)), html: missing.filter(isHtml) }
}

// What the owner chose the site to open in: 'light', 'dark' or 'system' (the
// visitor's device), or null for the palette it is designed in. A site saved
// before the choice existed says only whether it follows the device.
export function siteStart(schema) {
  const { start, followDevice } = schema?.colorMode || {}
  if (start === 'light' || start === 'dark' || start === 'system') return start
  return followDevice ? 'system' : null
}

// Everything a writer needs to draw one page with both palettes, or null when
// the site has only the one: no switch, and it opens in the palette it is
// designed in. `always` is the editor's preview of the other palette, before
// any switch.
export function colorModeFor(schema, page, htmlMap = {}, { always = false } = {}) {
  const start = siteStart(schema)
  const toggled = hasThemeToggle(schema, htmlMap)
  if (!always && !start && !toggled) return null
  const theme = designedTheme(schema, page, htmlMap)
  const base = baseMode(theme)
  if (!always && !toggled && start === base) return null
  const alt = altTheme(schema, theme)
  const light = Object.fromEntries(COLOR_ROLES.map((role) => [role, normalizeHex(theme[role])]))
  light.onAccent = normalizeHex(readableTextOn(theme.accentColor, theme.buttonTextColor))
  return {
    base,
    alt: base === 'light' ? 'dark' : 'light',
    followDevice: start === 'system',
    ...(start === 'light' || start === 'dark' ? { initial: start } : {}),
    light,
    other: { ...alt, onAccent: normalizeHex(alt.accentColor) ? textOn(alt.accentColor) : alt.buttonTextColor },
  }
}

// The editor's View: the page as a visitor gets it, starting in the other
// palette while the owner is looking at that one on the canvas.
export function viewColorMode(schema, page, showOther = false, htmlMap = {}) {
  const mode = colorModeFor(schema, page, htmlMap, { always: showOther })
  return mode && showOther ? { ...mode, initial: mode.alt } : mode
}

// What has to stay readable in a palette: WCAG's 4.5:1 for text, 3:1 for a
// colour that only has to be seen (a brand colour used for links and icons).
const CONTRAST_RULES = [
  { role: 'textColor', on: 'backgroundColor', min: 4.5 },
  { role: 'textColor', on: 'surfaceColor', min: 4.5 },
  { role: 'mutedColor', on: 'backgroundColor', min: 4.5 },
  { role: 'buttonTextColor', on: 'primaryColor', min: 4.5 },
  { role: 'headerTextColor', on: 'headerColor', min: 4.5 },
  { role: 'primaryColor', on: 'backgroundColor', min: 3 },
  { role: 'accentColor', on: 'backgroundColor', min: 3 },
]

export function contrastProblems(palette) {
  return CONTRAST_RULES.flatMap(({ role, on, min }) => {
    const [color, surface] = [normalizeHex(palette?.[role]), normalizeHex(palette?.[on])]
    if (!color || !surface) return []
    const ratio = contrast(color, surface)
    return ratio < min ? [{ role, on, min, ratio: Math.floor(ratio * 10) / 10 }] : []
  })
}

const altVar = (role) => `--pwb-alt-${ROLE_VARS[role]}`

// Where each role is looked for first: a value can be two roles at once
// (white is often both the page and the cards), and the place decides.
const ORDER = {
  bg: ['backgroundColor', 'surfaceColor', 'softColor', 'headerColor', 'primaryColor', 'accentColor', 'borderColor'],
  fg: ['textColor', 'mutedColor', 'primaryColor', 'accentColor', 'headerTextColor'],
  border: ['borderColor', 'mutedColor', 'primaryColor', 'accentColor', 'textColor', 'softColor'],
  solid: ['primaryColor', 'accentColor'],
}

// What each component type's theme colours are (see themedStyles), so a
// card's white goes to the card colour and not to the page's.
const TYPE_HINTS = {
  navbar: { bg: 'headerColor', fg: 'headerTextColor' },
  button: { bg: 'primaryColor', fg: 'buttonTextColor' },
  badge: { bg: 'accentColor' },
  section: { bg: 'softColor' },
  card: { bg: 'surfaceColor' },
  input: { bg: 'surfaceColor' },
  select: { bg: 'surfaceColor' },
  linkbutton: { fg: 'primaryColor' },
  icon: { fg: 'accentColor' },
  divider: { bg: 'borderColor' },
}

// The text colour that belongs on a solid role colour.
const ON = { primaryColor: 'buttonTextColor', headerColor: 'headerTextColor', accentColor: 'onAccent' }

// A grey that is not one of the theme's own colours still reads as page
// background, text or a line, and follows the palette like one.
function neutralRole(hex, context, base) {
  const lc = lightChroma(hex)
  if (!lc || lc[1] > GREY) return null
  const [l] = lc
  if (base === 'light') {
    if (context === 'bg') return l >= 0.97 ? 'backgroundColor' : l >= 0.9 ? 'softColor' : null
    if (context === 'fg') return l <= 0.3 ? 'textColor' : l <= 0.6 ? 'mutedColor' : null
    if (context === 'border') return l >= 0.6 && l < 0.97 ? 'borderColor' : null
    return null
  }
  if (context === 'bg') return l <= 0.08 ? 'backgroundColor' : l <= 0.16 ? 'softColor' : null
  if (context === 'fg') return l >= 0.75 ? 'textColor' : l >= 0.45 ? 'mutedColor' : null
  if (context === 'border') return l > 0.08 && l <= 0.4 ? 'borderColor' : null
  return null
}

function roleOf(hex, context, mode, hint) {
  if (hint && mode.light[hint] === hex) return hint
  for (const role of ORDER[context]) if (mode.light[role] === hex) return role
  return context === 'solid' ? null : neutralRole(hex, context, mode.base)
}

const NOT_A_COLOR = new Set(['transparent', 'inherit', 'initial', 'unset', 'none', 'currentcolor', 'revert'])

// Does this value paint a colour at all? (A transparent box shows the page.)
function paints(value) {
  const v = String(value || '').trim().toLowerCase()
  if (!v || NOT_A_COLOR.has(v)) return false
  if (/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/.test(v)) return true
  return /^[a-z]+$/.test(v)
}

// A colour as its variable. One with an opacity keeps it, in both palettes.
function wrap(role, token, alpha = 1) {
  if (alpha >= 1) return `var(${altVar(role)}, ${token})`
  const percent = Math.round(alpha * 1000) / 10
  return `color-mix(in srgb, var(${altVar(role)}, ${parseColor(token).hex}) ${percent}%, transparent)`
}

// Under this a background is a tint over what is behind it, not a colour of
// its own: the text on it still reads against the page. Unless it does not: a
// strong tint over the other palette's page can be too close to its text.
const FAINT = 0.5

function tintReads(color, mode) {
  const page = normalizeHex(mode.other?.backgroundColor)
  const text = normalizeHex(mode.other?.textColor)
  return !page || !text || contrast(text, mix(page, color.hex, color.alpha)) >= 4.5
}

// Every colour in `value` that is a role colour here, as its variable.
// Returns the value and the role of what it paints (null when that is a
// colour of the owner's own).
function mapValue(value, context, mode, hint) {
  if (typeof value !== 'string' || !value || value.includes('var(--pwb-alt-')) return { value, role: null, paints: paints(value) }
  let first
  let faint = false
  const out = value.replace(COLOR_TOKEN, (token) => {
    const color = parseColor(token)
    if (!color) return token
    const role = roleOf(color.hex, context, mode, hint)
    if (first === undefined) {
      first = role
      faint = color.alpha < FAINT && tintReads(color, mode)
    }
    return role ? wrap(role, token, color.alpha) : token
  })
  return { value: out, role: first || null, paints: paints(value) && !(faint && !first) }
}

// A text colour on a solid role colour (a button's white) follows that
// colour's own text role; any other one is left to the owner.
function onSolid(hex, boxRole) {
  const lc = hex && lightChroma(hex)
  return !!lc && lc[1] <= GREY && (lc[0] >= 0.85 || lc[0] <= 0.15) ? ON[boxRole] : null
}

function mapForeground(value, { boxRole, fixed, mode, hint }) {
  if (fixed || typeof value !== 'string') return value
  if (ON[boxRole]) {
    const color = parseColor(value)
    const role = color && (mode.light[ON[boxRole]] === color.hex ? ON[boxRole] : onSolid(color.hex, boxRole))
    return role ? wrap(role, value.trim(), color.alpha) : value
  }
  return mapValue(value, 'fg', mode, hint).value
}

// One block's styles. `inside` is true under a box with a colour of the
// owner's own, whose text stays as designed.
function mapStyles(styles, type, mode, inside) {
  if (!styles || typeof styles !== 'object') return { styles, fixed: inside }
  const hints = TYPE_HINTS[type] || {}
  const out = { ...styles }
  let boxRole = null
  let custom = false
  for (const key of ['backgroundColor', 'background']) {
    if (typeof styles[key] !== 'string') continue
    const mapped = mapValue(styles[key], 'bg', mode, hints.bg)
    out[key] = mapped.value
    if (mapped.role) boxRole = boxRole || mapped.role
    else if (mapped.paints) custom = true
  }
  const fixed = !boxRole && (custom || inside)
  if (typeof styles.color === 'string') {
    out.color = mapForeground(styles.color, { boxRole, fixed, mode, hint: hints.fg })
  }
  if (!fixed) {
    for (const key of ['borderColor', 'border']) {
      if (typeof styles[key] === 'string') out[key] = mapValue(styles[key], 'border', mode).value
    }
  }
  return { styles: out, fixed, boxRole }
}

const FIELD_FOREGROUNDS = ['labelColor', 'helpColor', 'choiceColor', 'revealColor']

// A form field's own colours live in its props (label, field, placeholder…).
function mapFieldProps(props, mode, fixed) {
  const out = { ...props }
  const field = mapValue(props.fieldBackgroundColor || '#ffffff', 'bg', mode, 'surfaceColor')
  // An unset field background is white; only filled in when it follows.
  if (field.role || props.fieldBackgroundColor) out.fieldBackgroundColor = field.value
  const fieldFixed = !field.role && field.paints
  const border = mapValue(props.fieldBorderColor || '#cbd5e1', 'border', mode)
  if (border.role && !fieldFixed) out.fieldBorderColor = border.value
  if (!fieldFixed) {
    for (const key of ['fieldColor', 'placeholderColor']) {
      if (typeof props[key] === 'string' && props[key]) out[key] = mapValue(props[key], 'fg', mode).value
    }
  }
  if (!fixed) {
    for (const key of FIELD_FOREGROUNDS) {
      if (typeof props[key] === 'string' && props[key]) out[key] = mapValue(props[key], 'fg', mode).value
    }
  }
  if (typeof props.accentColor === 'string' && props.accentColor) out.accentColor = mapValue(props.accentColor, 'solid', mode).value
  return out
}

// A tab row's colours live in its props too, each tab's text on its own tab.
function mapTabProps(props, mode, fixed) {
  const out = { ...props }
  const paint = (key, context, hint) => {
    if (typeof props[key] === 'string' && props[key]) out[key] = mapValue(props[key], context, mode, hint).value
  }
  if (fixed) return out
  paint('tablistBackgroundColor', 'bg', 'softColor')
  paint('tablistBorderColor', 'border')
  paint('tabBackgroundColor', 'bg', 'softColor')
  paint('tabTextColor', 'fg', 'mutedColor')
  paint('panelBackgroundColor', 'bg', 'surfaceColor')
  paint('panelBorderColor', 'border')
  paint('activeTabBorderColor', 'border')
  const active = mapValue(props.activeTabBackgroundColor || '', 'bg', mode, 'softColor')
  if (props.activeTabBackgroundColor) out.activeTabBackgroundColor = active.value
  if (typeof props.activeTabColor === 'string' && props.activeTabColor) {
    const custom = !active.role && active.paints
    out.activeTabColor = custom ? props.activeTabColor : mapForeground(props.activeTabColor, { boxRole: active.role, fixed: false, mode })
  }
  return out
}

function mapComponent(component, mode, inside = false) {
  if (!component || typeof component !== 'object') return component
  const { styles, fixed } = mapStyles(component.styles, component.type, mode, inside)
  const next = { ...component, styles }
  if (component.stylesMobile) next.stylesMobile = mapStyles(component.stylesMobile, component.type, mode, inside).styles
  if (component.type === 'input' || component.type === 'select') next.props = mapFieldProps(component.props || {}, mode, fixed)
  if (component.type === 'tabs') next.props = mapTabProps(component.props || {}, mode, fixed)
  // The writers show one of two images; each says which palette it belongs to.
  if (component.type === 'image' && component.props?.srcOther) {
    next.props = { ...component.props, _otherSrc: component.props.srcOther, _otherMode: mode.alt, _baseMode: mode.base }
  }
  // An HTML block is a document of its own: its colours are read the same
  // way, and it carries the other palette, which the page around it switches
  // on by message (see the runtime).
  if (component.type === 'html' && typeof component.props?.code === 'string' && component.props.code) {
    // The palette's CSS rides beside the code, into the block document's
    // head: inside the code it would be one more child, and a block that is a
    // single card or button would no longer be treated as one.
    next.props = {
      ...component.props,
      code: withColorModeHtml(component.props.code, mode, { embed: true }),
      _colorModeCss: embedCss(mode),
    }
  }
  if (Array.isArray(component.children)) next.children = component.children.map((child) => mapComponent(child, mode, fixed))
  return next
}

export function withColorModeComponents(components, mode) {
  if (!mode || !Array.isArray(components)) return components
  return components.map((component) => mapComponent(component, mode))
}

export function withColorModePage(page, mode) {
  if (!mode || !page) return page
  const background = (value) => (typeof value === 'string' && value ? mapValue(value, 'bg', mode, 'backgroundColor').value : value)
  return {
    ...page,
    background: background(page.background),
    backgroundMobile: background(page.backgroundMobile),
    components: withColorModeComponents(page.components, mode),
  }
}

const cssColor = (value) => String(value || '').replace(/[^#0-9a-zA-Z(),.%\s-]/g, '')

// The other palette's variables, defined only while it is on.
export function colorModeCss(mode) {
  if (!mode) return ''
  const roles = Object.keys(ROLE_VARS)
    .map((role) => `${altVar(role)}:${cssColor(mode.other[role])}`)
  const site = Object.entries(SITE_VARS).map(([role, name]) => `--site-${name}:${cssColor(mode.other[role])}`)
  return `[data-pwb-theme="${mode.alt}"]{${[...roles, ...site].join(';')}}`
}

// What the browser draws by itself (scrollbars, date pickers, a select's list)
// follows the palette too. Not inside an HTML block, and not for a frame on the
// page: a frame whose scheme differs from its document's is painted opaque, a
// white box on a dark page.
//
// An image with a version for the other palette is written twice, one of them
// on show. An HTML block opening in the palette it is not designed in stays out
// of sight until it has been told: the runtime lets it go, and the delay is for
// a page whose runtime never came.
export const COLOR_SCHEME_CSS = '[data-pwb-theme="light"]{color-scheme:light}'
  + '[data-pwb-theme="dark"]{color-scheme:dark}'
  + '[data-pwb-theme] iframe{color-scheme:normal}'
  + '[data-pwb-theme="light"] .pwb-on-dark,[data-pwb-theme="dark"] .pwb-on-light{display:none!important}'
  + '[data-pwb-theme-wait] iframe[srcdoc]{animation:pwb-frame-in 0s linear 3s both}'
  + '@keyframes pwb-frame-in{from{visibility:hidden}to{visibility:visible}}'

// An HTML block starts in the browser's black text, which no theme colour
// set; in the other palette it takes that palette's text colour. The :where()
// leaves the block's own body rule, later in its document, the last word.
function embedCss(mode) {
  return `${colorModeCss(mode)}:where([data-pwb-theme="${mode.alt}"]) body{color:var(${altVar('textColor')})}`
}

// Runs in the head, before the page paints, so a visitor who chose the other
// palette never sees a flash of this one. A published page on the builder's
// own address has no storage (its sandbox gives it no origin), so there the
// runtime keeps the choice in the address instead (?pwb-theme=dark), which a
// reload and the site's own links carry on. The server remembers an address's
// choice in a cookie the page cannot read, and on a later visit says what it
// holds on this script (data-pwb-chosen, see backend/builder/published.py).
export const COLOR_MODE_KEY = 'pwb-color-mode'
export const COLOR_MODE_PARAM = 'pwb-theme'

// A choice is 'light', 'dark' or 'system': the device, even over what the owner
// chose. data-pwb-theme is the palette on; data-pwb-theme-pick is the choice it
// came from, and data-pwb-theme-follow says the runtime keeps it to the device.
export function colorModeScript(mode) {
  if (!mode) return ''
  const initial = ['light', 'dark', 'system'].includes(mode.initial) ? mode.initial : null
  const bar = normalizeHex(mode.other?.backgroundColor)
  const cfg = JSON.stringify({ base: mode.base, alt: mode.alt, follow: mode.followDevice, initial, bar })
  return `(function(){var c=${cfg},d=document.documentElement,m=null;`
    + `function k(v){return v==='light'||v==='dark'||v==='system'}`
    + `var q=new URLSearchParams(location.search).get('${COLOR_MODE_PARAM}');if(k(q))m=q;`
    + `if(!m){try{m=localStorage.getItem('${COLOR_MODE_KEY}')}catch(e){}}`
    + `if(!k(m)&&document.currentScript)m=document.currentScript.getAttribute('data-pwb-chosen');`
    + `if(!k(m))m=c.initial;`
    + `if(!k(m))m=c.follow?'system':c.base;`
    + `var p=m;if(m==='system'){d.setAttribute('data-pwb-theme-follow','');m=window.matchMedia&&matchMedia('(prefers-color-scheme: '+c.alt+')').matches?c.alt:c.base}`
    + `d.setAttribute('data-pwb-theme-base',c.base);d.setAttribute('data-pwb-theme-alt',c.alt);d.setAttribute('data-pwb-theme-pick',p);`
    + `d.setAttribute('data-pwb-theme',m);if(m!==c.base)d.setAttribute('data-pwb-theme-wait','');`
    + `if(c.bar){d.setAttribute('data-pwb-theme-bar',c.bar);var b=document.querySelector('meta[name="theme-color"]');if(b&&m===c.alt){b.setAttribute('data-pwb-base',b.content);b.content=c.bar}}})();`
}

const SCRIPT_END = '</scr' + 'ipt>'

export function colorModeHeadTags(mode) {
  if (!mode) return ''
  return `<style data-pwb-color-mode>${colorModeCss(mode)}${COLOR_SCHEME_CSS}</style><script data-pwb-color-mode>${colorModeScript(mode)}${SCRIPT_END}`
}

// ---------------------------------------------------------------------------
// HTML pages. Their colours are in their own CSS, so the same reading is done
// on the text: each rule and style attribute, declaration by declaration.
// The page's own palette variables (--text, --bg, --primary…) name their role.

const VAR_ROLES = {
  primaryColor: ['accent', 'accent-color', 'primary', 'primary-color', 'brand', 'brand-color', 'main-color', 'color-primary', 'theme-color', 'clr-primary', 'c-primary'],
  buttonTextColor: ['button-text', 'on-primary'],
  textColor: ['ink', 'text', 'text-color', 'foreground', 'fg', 'body-color', 'color-text', 'clr-text', 'text-1'],
  mutedColor: ['muted', 'muted-color', 'text-muted', 'secondary-text', 'subtle', 'color-muted', 'text-2'],
  borderColor: ['border', 'border-color', 'line', 'divider', 'outline'],
  backgroundColor: ['bg', 'background', 'background-color', 'page-bg', 'body-bg', 'color-bg', 'clr-bg'],
  softColor: ['soft', 'soft-bg', 'surface-2', 'muted-bg', 'subtle-bg', 'alt-bg', 'bg-soft', 'bg-2'],
  surfaceColor: ['surface', 'card', 'card-bg', 'panel', 'panel-bg', 'bg-card'],
  headerColor: ['header', 'header-bg', 'nav-bg', 'navbar-bg'],
}
const VAR_ROLE = new Map(Object.entries(VAR_ROLES).flatMap(([role, names]) => names.map((name) => [name, role])))

function propertyContext(property) {
  if (/^background(-color)?$/.test(property)) return 'bg'
  if (/^(color|fill|stroke|caret-color|text-decoration-color)$/.test(property)) return 'fg'
  if (/^(border|outline)(-(top|right|bottom|left|block|inline))?(-color)?$/.test(property)) return 'border'
  return null
}

function mapDeclarations(text, mode) {
  const parts = text.split(';').map((part) => {
    const at = part.indexOf(':')
    return at === -1 ? { raw: part } : { raw: part, property: part.slice(0, at).trim().toLowerCase(), value: part.slice(at + 1) }
  })
  let boxRole = null
  let custom = false
  for (const part of parts) {
    if (propertyContext(part.property) !== 'bg') continue
    const mapped = mapValue(part.value, 'bg', mode)
    part.next = mapped.value
    if (mapped.role) boxRole = boxRole || mapped.role
    else if (mapped.paints) custom = true
  }
  const fixed = !boxRole && custom
  for (const part of parts) {
    if (part.next !== undefined || !part.property) continue
    if (part.property.startsWith('--')) {
      const role = VAR_ROLE.get(part.property.slice(2))
      part.next = role && !part.value.includes('var(--pwb-alt-')
        ? part.value.replace(COLOR_TOKEN, (token) => {
          const color = parseColor(token)
          return color ? wrap(role, token, color.alpha) : token
        })
        : part.value
      continue
    }
    const context = propertyContext(part.property)
    if (!context || fixed) continue
    const lead = part.value.match(/^\s*/)[0]
    part.next = context === 'fg'
      ? lead + mapForeground(part.value.trim(), { boxRole, fixed, mode })
      : mapValue(part.value, context, mode).value
  }
  return parts.map((part) => (part.next === undefined ? part.raw : `${part.raw.slice(0, part.raw.indexOf(':') + 1)}${part.next}`)).join(';')
}

function mapCss(css, mode) {
  return css.replace(/\{([^{}]*)\}/g, (match, body) => `{${mapDeclarations(body, mode)}}`)
}

// `embed`: an HTML block's code, only re-coloured: its palette CSS goes in
// its document's head (see mapComponent) and the page around it says which
// palette is on.
export function withColorModeHtml(html, mode, { embed = false } = {}) {
  if (!mode || typeof html !== 'string') return html
  if (html.includes('data-pwb-color-mode')) return html
  // Scripts, textareas and templates hold text, not the page's styles.
  const held = []
  let out = html.replace(/<(script|textarea|template)\b[\s\S]*?<\/\1\s*>/gi, (block) => {
    held.push(block)
    return `${held.length - 1}`
  })
  out = out
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi, (m, open, css, close) => `${open}${mapCss(css, mode)}${close}`)
    .replace(/(\sstyle=")([^"]*)(")/gi, (m, open, css, close) => `${open}${mapDeclarations(css, mode)}${close}`)
    .replace(/(\sstyle=')([^']*)(')/gi, (m, open, css, close) => `${open}${mapDeclarations(css, mode)}${close}`)
    .replace(/(\d+)/g, (m, i) => held[Number(i)])
  if (embed) return out
  const tags = colorModeHeadTags(mode)
  if (/<\/head\s*>/i.test(out)) return out.replace(/<\/head\s*>/i, (close) => `${tags}${close}`)
  if (/<body\b[^>]*>/i.test(out)) return out.replace(/<body\b[^>]*>/i, (open) => `${open}${tags}`)
  return `${tags}${out}`
}
