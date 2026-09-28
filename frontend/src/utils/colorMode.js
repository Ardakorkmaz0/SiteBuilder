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

const HEX = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi

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
      buttonTextColor: readableTextOn(primary),
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
    buttonTextColor: readableTextOn(primary),
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
  for (const match of String(html || '').matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-f]{3,6})\b/gi)) {
    const role = VAR_ROLE.get(match[1].toLowerCase())
    const hex = normalizeHex(match[2])
    if (role && hex && !out[role]) out[role] = hex
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

// A switch anywhere on the site, on a canvas page or in an HTML page.
export function hasThemeToggle(schema, htmlMap = {}) {
  return (schema?.pages || []).some((page) => (
    walk(page.components, (component) => component?.type === 'themeToggle')
    || String(htmlMap[page.id] ?? page.html ?? '').includes(THEME_TOGGLE_ATTR)
  ))
}

// Everything a writer needs to draw one page with both palettes, or null when
// the site has only the one (no switch, and not following the device).
// `always` is the editor's preview of the other palette, before any switch.
export function colorModeFor(schema, page, htmlMap = {}, { always = false } = {}) {
  const followDevice = !!schema?.colorMode?.followDevice
  if (!always && !followDevice && !hasThemeToggle(schema, htmlMap)) return null
  const theme = designedTheme(schema, page, htmlMap)
  const base = baseMode(theme)
  const alt = altTheme(schema, theme)
  const light = Object.fromEntries(COLOR_ROLES.map((role) => [role, normalizeHex(theme[role])]))
  light.onAccent = normalizeHex(readableTextOn(theme.accentColor, theme.buttonTextColor))
  return {
    base,
    alt: base === 'light' ? 'dark' : 'light',
    followDevice,
    light,
    other: { ...alt, onAccent: readableTextOn(alt.accentColor, alt.buttonTextColor) },
  }
}

// The editor's View: the page as a visitor gets it, starting in the other
// palette while the owner is looking at that one on the canvas.
export function viewColorMode(schema, page, showOther = false) {
  const mode = colorModeFor(schema, page, {}, { always: showOther })
  return mode && showOther ? { ...mode, initial: mode.alt } : mode
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

const wrap = (role, token) => `var(${altVar(role)}, ${token})`

// Every hex colour in `value` that is a role colour here, as its variable.
// Returns the value and the role of what it paints (null when that is a
// colour of the owner's own).
function mapValue(value, context, mode, hint) {
  if (typeof value !== 'string' || !value || value.includes('var(--pwb-alt-')) return { value, role: null, paints: paints(value) }
  let first
  const out = value.replace(HEX, (token) => {
    const role = roleOf(normalizeHex(token), context, mode, hint)
    if (first === undefined) first = role
    return role ? wrap(role, token) : token
  })
  return { value: out, role: first || null, paints: paints(value) }
}

// A text colour on a solid role colour (a button's white) follows that
// colour's own text role; any other one is left to the owner.
function onSolid(value, boxRole) {
  const hex = normalizeHex(value)
  const lc = hex && lightChroma(hex)
  return !!lc && lc[1] <= GREY && (lc[0] >= 0.85 || lc[0] <= 0.15) ? ON[boxRole] : null
}

function mapForeground(value, { boxRole, fixed, mode, hint }) {
  if (fixed || typeof value !== 'string') return value
  if (ON[boxRole]) {
    const hex = normalizeHex(value)
    const role = hex && (mode.light[ON[boxRole]] === hex ? ON[boxRole] : onSolid(value, boxRole))
    return role ? wrap(role, value.trim()) : value
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

function mapComponent(component, mode, inside = false) {
  if (!component || typeof component !== 'object') return component
  const { styles, fixed } = mapStyles(component.styles, component.type, mode, inside)
  const next = { ...component, styles }
  if (component.stylesMobile) next.stylesMobile = mapStyles(component.stylesMobile, component.type, mode, inside).styles
  if (component.type === 'input' || component.type === 'select') next.props = mapFieldProps(component.props || {}, mode, fixed)
  // An HTML block is a document of its own: its colours are read the same
  // way, and it carries the other palette, which the page around it switches
  // on by message (see the runtime).
  if (component.type === 'html' && typeof component.props?.code === 'string' && component.props.code) {
    next.props = { ...component.props, code: withColorModeHtml(component.props.code, mode, { embed: true }) }
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
  // No color-scheme here: an embedded block's frame whose scheme differs
  // from the page's is painted opaque, a white box on a dark page.
  return `[data-pwb-theme="${mode.alt}"]{${[...roles, ...site].join(';')}}`
}

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
// reload and the site's own links carry on.
export const COLOR_MODE_KEY = 'pwb-color-mode'
export const COLOR_MODE_PARAM = 'pwb-theme'

export function colorModeScript(mode) {
  if (!mode) return ''
  const initial = mode.initial === mode.alt || mode.initial === mode.base ? mode.initial : null
  const cfg = JSON.stringify({ base: mode.base, alt: mode.alt, follow: mode.followDevice, initial })
  return `(function(){var c=${cfg},d=document.documentElement,m=null;`
    + `var q=/[?&]${COLOR_MODE_PARAM}=(light|dark)(?:&|$)/.exec(location.search);if(q)m=q[1];`
    + `if(!m){try{m=localStorage.getItem('${COLOR_MODE_KEY}')}catch(e){}}`
    + `if(m!==c.base&&m!==c.alt)m=c.initial;`
    + `if(m!==c.base&&m!==c.alt&&c.follow&&window.matchMedia&&matchMedia('(prefers-color-scheme: '+c.alt+')').matches)m=c.alt;`
    + `d.setAttribute('data-pwb-theme-base',c.base);d.setAttribute('data-pwb-theme-alt',c.alt);`
    + `d.setAttribute('data-pwb-theme',m===c.alt?c.alt:c.base)})();`
}

const SCRIPT_END = '</scr' + 'ipt>'

export function colorModeHeadTags(mode) {
  if (!mode) return ''
  return `<style data-pwb-color-mode>${colorModeCss(mode)}</style><script data-pwb-color-mode>${colorModeScript(mode)}${SCRIPT_END}`
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
      part.next = role ? part.value.replace(HEX, (token) => wrap(role, token)) : part.value
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

// `embed`: an HTML block's code, which gets the palette's CSS but no head
// script (the page around it says which palette is on).
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
    .replace(/(\d+)/g, (m, i) => held[Number(i)])
  const tags = embed ? `<style data-pwb-color-mode>${embedCss(mode)}</style>` : colorModeHeadTags(mode)
  if (/<\/head\s*>/i.test(out)) return out.replace(/<\/head\s*>/i, (close) => `${tags}${close}`)
  if (/<body\b[^>]*>/i.test(out)) return out.replace(/<body\b[^>]*>/i, (open) => `${open}${tags}`)
  return `${tags}${out}`
}
