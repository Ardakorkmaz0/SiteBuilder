// One-click theme presets: picking one replaces the palette AND re-themes
// the existing components (the panel calls applyTheme right after). New
// components always inherit the active theme via themedStyles(). A preset
// lists what it decides; presetTheme() fills the rest the way the first ten
// always had it filled. `dark` only groups them in the panel.
export const THEME_PRESETS = [
  { id: 'apple', name: 'Clean Apple', theme: { primaryColor: '#0071e3', textColor: '#1d1d1f', mutedColor: '#6e6e73', backgroundColor: '#ffffff', surfaceColor: '#ffffff', softColor: '#f5f5f7', headerColor: '#1d1d1f', headerTextColor: '#f5f5f7', fontFamily: "system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", radius: '18px', buttonRadius: '980px' } },
  { id: 'indigo', name: 'Indigo SaaS', theme: { primaryColor: '#4f46e5', textColor: '#171723', mutedColor: '#62636f', backgroundColor: '#ffffff', surfaceColor: '#ffffff', softColor: '#f4f4fb', headerColor: '#ffffff', headerTextColor: '#171723', fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', radius: '14px', buttonRadius: '10px' } },
  { id: 'coral', name: 'Warm Coral', theme: { primaryColor: '#c93d2a', textColor: '#27201e', mutedColor: '#766a66', backgroundColor: '#fffaf7', surfaceColor: '#ffffff', softColor: '#fcefe9', headerColor: '#fffaf7', headerTextColor: '#27201e', fontFamily: '"Poppins", system-ui, sans-serif', radius: '18px', buttonRadius: '999px' } },
  { id: 'forest', name: 'Forest Calm', theme: { primaryColor: '#166534', textColor: '#1a2e1f', mutedColor: '#5c6f61', backgroundColor: '#fbfdf9', surfaceColor: '#ffffff', softColor: '#eef4ec', headerColor: '#1a2e1f', headerTextColor: '#eef4ec', fontFamily: '"DM Sans", system-ui, sans-serif', radius: '10px', buttonRadius: '8px' } },
  { id: 'noir', name: 'Noir Gold', dark: true, theme: { buttonTextColor: '#121110', primaryColor: '#eab308', textColor: '#f1efe9', mutedColor: '#a6a195', backgroundColor: '#121110', surfaceColor: '#181614', softColor: '#1a1917', headerColor: '#121110', headerTextColor: '#f1efe9', fontFamily: '"DM Sans", system-ui, sans-serif', radius: '2px', buttonRadius: '2px' } },
  { id: 'ocean', name: 'Ocean Teal', theme: { primaryColor: '#0e7490', textColor: '#102a33', mutedColor: '#5b7480', backgroundColor: '#ffffff', surfaceColor: '#ffffff', softColor: '#f0f7f9', headerColor: '#0e7490', headerTextColor: '#ffffff', fontFamily: '"Open Sans", system-ui, sans-serif', radius: '12px', buttonRadius: '10px' } },
  { id: 'plum', name: 'Plum Elegant', theme: { primaryColor: '#86198f', textColor: '#241627', mutedColor: '#73637a', backgroundColor: '#fefcff', surfaceColor: '#ffffff', softColor: '#f8f0fa', headerColor: '#fefcff', headerTextColor: '#241627', fontFamily: '"Lora", Georgia, serif', radius: '16px', buttonRadius: '999px' } },
  { id: 'mono', name: 'Minimal Mono', theme: { primaryColor: '#111111', textColor: '#111111', mutedColor: '#6f6f6f', backgroundColor: '#ffffff', surfaceColor: '#ffffff', softColor: '#f5f5f5', headerColor: '#ffffff', headerTextColor: '#111111', fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', radius: '0px', buttonRadius: '0px' } },
  { id: 'slate', name: 'Slate Dark', dark: true, theme: { buttonTextColor: '#0b1220', primaryColor: '#38bdf8', textColor: '#e8edf4', mutedColor: '#94a3b8', backgroundColor: '#0b1220', surfaceColor: '#0f1828', softColor: '#101a2e', headerColor: '#0b1220', headerTextColor: '#e8edf4', fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', radius: '12px', buttonRadius: '10px' } },
  { id: 'ivory', name: 'Ivory Serif', theme: { primaryColor: '#9a6b4f', textColor: '#2c2520', mutedColor: '#7c7167', backgroundColor: '#faf7f2', surfaceColor: '#fffdf9', softColor: '#f1ebe1', headerColor: '#2c2520', headerTextColor: '#faf7f2', fontFamily: '"Playfair Display", Georgia, serif', radius: '4px', buttonRadius: '4px' } },
  { id: 'sand', name: 'Sand Terracotta', theme: { primaryColor: '#c2410c', textColor: '#2b211c', mutedColor: '#7a6a60', borderColor: '#e7dccd', backgroundColor: '#fbf7f1', surfaceColor: '#ffffff', softColor: '#f3eadf', headerColor: '#fbf7f1', headerTextColor: '#2b211c', accentColor: '#0f766e', fontFamily: '"Work Sans", system-ui, sans-serif', headingFontFamily: '"Source Serif 4", Georgia, serif', radius: '10px', buttonRadius: '8px' } },
  { id: 'mint', name: 'Fresh Mint', theme: { primaryColor: '#087a5f', textColor: '#10261f', mutedColor: '#5b6f68', borderColor: '#d5e9e1', backgroundColor: '#ffffff', surfaceColor: '#ffffff', softColor: '#eaf7f2', headerColor: '#ffffff', headerTextColor: '#10261f', accentColor: '#d97706', fontFamily: '"Nunito", system-ui, sans-serif', headingFontFamily: '"Nunito", system-ui, sans-serif', radius: '16px', buttonRadius: '999px' } },
  { id: 'editorial', name: 'Editorial Print', theme: { primaryColor: '#b91c1c', textColor: '#111111', mutedColor: '#5f5f5f', borderColor: '#dcd6ca', backgroundColor: '#fffdf8', surfaceColor: '#fffdf8', softColor: '#f3efe6', headerColor: '#fffdf8', headerTextColor: '#111111', accentColor: '#1d4ed8', fontFamily: '"Source Serif 4", Georgia, serif', headingFontFamily: '"Playfair Display", Georgia, serif', radius: '0px', buttonRadius: '0px', shadow: 'none', headingWeight: '700', bodyLineHeight: '1.7' } },
  { id: 'startup', name: 'Bright Startup', theme: { primaryColor: '#2563eb', textColor: '#0f172a', mutedColor: '#64748b', borderColor: '#e2e8f0', backgroundColor: '#ffffff', surfaceColor: '#ffffff', softColor: '#eff4ff', headerColor: '#ffffff', headerTextColor: '#0f172a', accentColor: '#e11d48', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', headingFontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', radius: '14px', buttonRadius: '10px', headingLetterSpacing: '-0.015em' } },
  { id: 'lavender', name: 'Soft Lavender', theme: { primaryColor: '#6d28d9', textColor: '#1f1633', mutedColor: '#6b6280', borderColor: '#e4def3', backgroundColor: '#fcfbff', surfaceColor: '#ffffff', softColor: '#f1edfb', headerColor: '#fcfbff', headerTextColor: '#1f1633', accentColor: '#db2777', fontFamily: '"Manrope", system-ui, sans-serif', headingFontFamily: '"Manrope", system-ui, sans-serif', radius: '18px', buttonRadius: '999px' } },
  { id: 'rose', name: 'Rose Boutique', theme: { primaryColor: '#be185d', textColor: '#2a1620', mutedColor: '#7b6470', borderColor: '#f3d9e3', backgroundColor: '#fff8fa', surfaceColor: '#ffffff', softColor: '#fdecf2', headerColor: '#fff8fa', headerTextColor: '#2a1620', accentColor: '#0f766e', fontFamily: '"Lora", Georgia, serif', headingFontFamily: '"Cormorant Garamond", Garamond, serif', radius: '14px', buttonRadius: '999px', headingWeight: '600' } },
  { id: 'sky', name: 'Clear Sky', theme: { primaryColor: '#0369a1', textColor: '#0c2233', mutedColor: '#577286', borderColor: '#d3e6f2', backgroundColor: '#f7fbfe', surfaceColor: '#ffffff', softColor: '#e6f3fb', headerColor: '#0c2233', headerTextColor: '#f7fbfe', accentColor: '#d97706', fontFamily: '"Open Sans", system-ui, sans-serif', headingFontFamily: '"Montserrat", system-ui, sans-serif', radius: '12px', buttonRadius: '8px' } },
  { id: 'olive', name: 'Olive Grove', theme: { primaryColor: '#4d7c0f', textColor: '#1f2616', mutedColor: '#666e5a', borderColor: '#dde3cc', backgroundColor: '#fbfcf6', surfaceColor: '#ffffff', softColor: '#eff3e3', headerColor: '#1f2616', headerTextColor: '#fbfcf6', accentColor: '#b45309', fontFamily: '"Lato", system-ui, sans-serif', headingFontFamily: '"Merriweather", Georgia, serif', radius: '6px', buttonRadius: '6px' } },
  { id: 'poster', name: 'Bold Poster', theme: { primaryColor: '#dc2626', textColor: '#0a0a0a', mutedColor: '#525252', borderColor: '#d4d4d4', backgroundColor: '#fafafa', surfaceColor: '#ffffff', softColor: '#f0f0f0', headerColor: '#0a0a0a', headerTextColor: '#fafafa', accentColor: '#ca8a04', fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', headingFontFamily: '"Anton", "Arial Black", sans-serif', radius: '0px', buttonRadius: '0px', shadow: 'none', headingWeight: '400', headingLetterSpacing: '0.02em' } },
  { id: 'candy', name: 'Candy Pop', theme: { primaryColor: '#db2777', textColor: '#2d1b36', mutedColor: '#6f5c7a', borderColor: '#f5e3c0', backgroundColor: '#fffaf0', surfaceColor: '#ffffff', softColor: '#fff1d6', headerColor: '#fffaf0', headerTextColor: '#2d1b36', accentColor: '#0d9488', fontFamily: '"Nunito", system-ui, sans-serif', headingFontFamily: '"Unbounded", system-ui, sans-serif', radius: '22px', buttonRadius: '999px' } },
  { id: 'corporate', name: 'Navy Corporate', theme: { primaryColor: '#1e3a8a', textColor: '#111827', mutedColor: '#4b5563', borderColor: '#e5e7eb', backgroundColor: '#ffffff', surfaceColor: '#ffffff', softColor: '#f3f5f9', headerColor: '#0f1d45', headerTextColor: '#ffffff', accentColor: '#0284c7', fontFamily: '"Roboto", system-ui, sans-serif', headingFontFamily: '"Roboto", system-ui, sans-serif', radius: '8px', buttonRadius: '6px', shadow: '0 1px 3px rgba(15,23,42,0.08)' } },
  { id: 'studio', name: 'Warm Studio', theme: { primaryColor: '#1c1917', buttonTextColor: '#fafaf9', textColor: '#1c1917', mutedColor: '#6b635c', borderColor: '#ddd4c6', backgroundColor: '#f5f1ea', surfaceColor: '#fbf8f3', softColor: '#ebe4d8', headerColor: '#f5f1ea', headerTextColor: '#1c1917', accentColor: '#c2410c', fontFamily: '"DM Sans", system-ui, sans-serif', headingFontFamily: '"Space Grotesk", system-ui, sans-serif', radius: '4px', buttonRadius: '999px', headingLetterSpacing: '-0.03em' } },
  { id: 'carbon', name: 'Carbon Lime', dark: true, theme: { primaryColor: '#a3e635', buttonTextColor: '#111a05', textColor: '#e7ece2', mutedColor: '#9aa391', borderColor: '#2a3024', backgroundColor: '#0e100c', surfaceColor: '#151812', softColor: '#1a1e16', headerColor: '#0e100c', headerTextColor: '#e7ece2', accentColor: '#38bdf8', fontFamily: '"Manrope", system-ui, sans-serif', headingFontFamily: '"Space Grotesk", system-ui, sans-serif', radius: '10px', buttonRadius: '8px', shadow: '0 18px 45px rgba(0,0,0,0.35)' } },
  { id: 'ember', name: 'Ember Night', dark: true, theme: { primaryColor: '#f97316', buttonTextColor: '#1a0d04', textColor: '#f4ece6', mutedColor: '#b1a499', borderColor: '#3a2e26', backgroundColor: '#16110e', surfaceColor: '#1e1814', softColor: '#241c17', headerColor: '#16110e', headerTextColor: '#f4ece6', accentColor: '#facc15', fontFamily: '"DM Sans", system-ui, sans-serif', headingFontFamily: '"Oswald", "Arial Narrow", sans-serif', radius: '6px', buttonRadius: '6px', shadow: '0 18px 45px rgba(0,0,0,0.35)', headingWeight: '500' } },
  { id: 'deepforest', name: 'Deep Forest', dark: true, theme: { primaryColor: '#34d399', buttonTextColor: '#04130d', textColor: '#e3efe9', mutedColor: '#97aaa1', borderColor: '#243830', backgroundColor: '#0b1411', surfaceColor: '#111d18', softColor: '#15231d', headerColor: '#0b1411', headerTextColor: '#e3efe9', accentColor: '#fbbf24', fontFamily: '"Work Sans", system-ui, sans-serif', headingFontFamily: '"Lora", Georgia, serif', radius: '12px', buttonRadius: '999px', shadow: '0 18px 45px rgba(0,0,0,0.35)' } },
]

// A preset as a complete theme. What a preset leaves out is filled as it
// always was: headings in the body font, white button text, borders in the
// muted color, the accent in the primary.
export function presetTheme(preset) {
  const theme = preset?.theme || {}
  return {
    headingFontFamily: theme.fontFamily,
    buttonTextColor: '#ffffff',
    borderColor: theme.mutedColor,
    accentColor: theme.primaryColor,
    headingWeight: '',
    headingLetterSpacing: '',
    bodyLineHeight: '',
    ...theme,
  }
}

export const DEFAULT_THEME = {
  primaryColor: '#0071e3',
  buttonTextColor: '#ffffff',
  textColor: '#1d1d1f',
  mutedColor: '#6e6e73',
  borderColor: '#d2d2d7',
  backgroundColor: '#ffffff',
  surfaceColor: '#ffffff',
  softColor: '#f5f5f7',
  headerColor: '#1d1d1f',
  headerTextColor: '#f5f5f7',
  fontFamily: "system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  headingFontFamily: "system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  radius: '18px',
  buttonRadius: '980px',
  shadow: '0 4px 20px rgba(0,0,0,0.08)',
  // Badges and icons. Follows the primary when a theme predates it.
  accentColor: '',
  // Typography overrides. Empty leaves every block as it was designed, so a
  // theme without them never flattens a page's own weights and spacing.
  headingWeight: '',
  headingLetterSpacing: '',
  bodyLineHeight: '',
}

// Fields filled from another one when missing, so an older theme keeps its look.
const THEME_FALLBACKS = { headingFontFamily: 'fontFamily', accentColor: 'primaryColor' }

// Auto-imported so we don't have to keep two lists in sync. Google fonts are
// added below in the same [stack, label] shape FONT_OPTIONS already uses.
import { GOOGLE_FONTS } from './googleFonts.js'

const SYSTEM_FONT_OPTIONS = [
  [DEFAULT_THEME.fontFamily, 'System'],
  ['Arial, Helvetica, sans-serif', 'Arial'],
  ['Georgia, serif', 'Georgia'],
  ['"Times New Roman", Times, serif', 'Times'],
  ['"Courier New", Courier, monospace', 'Monospace'],
  ['Verdana, Geneva, sans-serif', 'Verdana'],
  ['"Trebuchet MS", Helvetica, sans-serif', 'Trebuchet'],
]

const GOOGLE_FONT_OPTIONS = GOOGLE_FONTS.map((f) => [f.stack, `${f.name} · Google`])

// Every font the theme dropdown lists. System fonts first (zero network),
// curated Google Fonts after. Selecting a Google entry trips the
// auto-injection in EditorPage / PreviewPage / the HTML emitters so the
// preview matches the published page without any extra plumbing.
export const FONT_OPTIONS = [...SYSTEM_FONT_OPTIONS, ...GOOGLE_FONT_OPTIONS]

const THEME_KEYS = Object.keys(DEFAULT_THEME)

function cleanThemeValue(value, fallback) {
  if (typeof value !== 'string') return fallback
  const v = value.replace(/[;{}<>]/g, '').trim()
  if (!v) return fallback
  const low = v.toLowerCase()
  if (low.includes('javascript:') || low.includes('expression(') || low.includes('url(')) {
    return fallback
  }
  return v.slice(0, 180)
}

function cssValue(value, fallback = '') {
  return cleanThemeValue(value, fallback)
}

export function normalizeTheme(theme) {
  const input = theme && typeof theme === 'object' ? theme : {}
  const out = THEME_KEYS.reduce((acc, key) => {
    acc[key] = cleanThemeValue(input[key], DEFAULT_THEME[key])
    return acc
  }, {})
  for (const [key, source] of Object.entries(THEME_FALLBACKS)) {
    if (!String(input[key] || '').trim()) out[key] = out[source]
  }
  return out
}

// Is the site wearing this theme? The fields a reader notices first; a
// border tweak afterwards still counts as the same theme.
export function sameTheme(a, b) {
  const x = normalizeTheme(a)
  const y = normalizeTheme(b)
  return ['primaryColor', 'backgroundColor', 'textColor', 'fontFamily', 'headingFontFamily']
    .every((key) => x[key].toLowerCase() === y[key].toLowerCase())
}

// Text that stays readable on a solid color: dark on light, light on dark.
// Anything but a hex color gets the theme's button text, as before.
export function readableTextOn(color, fallback = '#ffffff') {
  const hex = String(color || '').trim().replace('#', '')
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  if (!/^[0-9a-f]{6}$/i.test(full)) return fallback
  const channel = (i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
  return luminance > 0.4 ? '#111111' : '#ffffff'
}

export function safeCustomCss(css) {
  if (typeof css !== 'string') return ''
  return css
    .replace(/<\/style/gi, '<\\/style')
    .replace(/<script/gi, '')
    .replace(/javascript:/gi, '')
    .slice(0, 20000)
}

export function themeVariablesCss(theme) {
  const t = normalizeTheme(theme)
  return `:root {
  --site-primary: ${cssValue(t.primaryColor)};
  --site-button-text: ${cssValue(t.buttonTextColor)};
  --site-text: ${cssValue(t.textColor)};
  --site-muted: ${cssValue(t.mutedColor)};
  --site-border: ${cssValue(t.borderColor)};
  --site-bg: ${cssValue(t.backgroundColor)};
  --site-surface: ${cssValue(t.surfaceColor)};
  --site-soft: ${cssValue(t.softColor)};
  --site-header: ${cssValue(t.headerColor)};
  --site-header-text: ${cssValue(t.headerTextColor)};
  --site-font: ${cssValue(t.fontFamily)};
  --site-heading-font: ${cssValue(t.headingFontFamily)};
  --site-radius: ${cssValue(t.radius)};
  --site-button-radius: ${cssValue(t.buttonRadius)};
  --site-shadow: ${cssValue(t.shadow)};
  --site-accent: ${cssValue(t.accentColor)};${
  t.headingWeight ? `\n  --site-heading-weight: ${cssValue(t.headingWeight)};` : ''}${
  t.headingLetterSpacing ? `\n  --site-heading-tracking: ${cssValue(t.headingLetterSpacing)};` : ''}${
  t.bodyLineHeight ? `\n  --site-line-height: ${cssValue(t.bodyLineHeight)};` : ''}
}`
}

export function customCssBlock(customCss) {
  const css = safeCustomCss(customCss)
  return css ? `\n/* Custom CSS */\n${css}` : ''
}

// Mirrors safeCustomCss. The published page wraps user JS in a sandboxed
// iframe, so the only literal we must escape is `</script` — otherwise a stray
// occurrence would close the script tag and break the rest of the document.
// Length-capped at 50KB to match the backend.
export function safeCustomJs(js) {
  if (typeof js !== 'string') return ''
  return js.replace(/<\/\s*script/gi, '<\\/script').slice(0, 50000)
}

export function customJsBlock(customJs) {
  const js = safeCustomJs(customJs)
  if (!js) return ''
  // Concatenated so this module's own source never contains a literal
  // `</script>` end tag (the emitted HTML still gets one).
  return `<script data-builder-custom-js>\n${js}\n</scr` + 'ipt>'
}

export function themeCss(theme, customCss = '') {
  return `${themeVariablesCss(theme)}${customCssBlock(customCss)}`
}

export function themedStyles(type, baseStyles = {}, theme = DEFAULT_THEME) {
  const t = normalizeTheme(theme)
  const styles = { ...baseStyles }
  switch (type) {
    case 'navbar':
      return {
        ...styles,
        backgroundColor: t.headerColor,
        color: t.headerTextColor,
        fontFamily: t.fontFamily,
      }
    case 'heading':
      return {
        ...styles,
        color: t.textColor,
        fontFamily: t.headingFontFamily,
        ...(t.headingWeight ? { fontWeight: t.headingWeight } : {}),
        ...(t.headingLetterSpacing ? { letterSpacing: t.headingLetterSpacing } : {}),
      }
    case 'text':
      return {
        ...styles,
        color: t.textColor,
        fontFamily: t.fontFamily,
        ...(t.bodyLineHeight ? { lineHeight: t.bodyLineHeight } : {}),
      }
    case 'badge':
      return {
        ...styles,
        backgroundColor: t.accentColor,
        color: readableTextOn(t.accentColor, t.buttonTextColor),
        fontFamily: t.fontFamily,
      }
    case 'icon':
      return {
        ...styles,
        color: t.accentColor,
      }
    case 'button':
      return {
        ...styles,
        backgroundColor: t.primaryColor,
        color: t.buttonTextColor,
        borderRadius: t.buttonRadius,
        fontFamily: t.fontFamily,
      }
    case 'linkbutton':
      return {
        ...styles,
        color: t.primaryColor,
        fontFamily: t.fontFamily,
      }
    case 'image':
      return {
        ...styles,
        borderRadius: t.radius,
      }
    case 'section':
      return {
        ...styles,
        backgroundColor: t.softColor,
        color: t.textColor,
        borderRadius: t.radius,
        fontFamily: t.fontFamily,
      }
    case 'card':
      return {
        ...styles,
        backgroundColor: t.surfaceColor,
        color: t.textColor,
        borderColor: t.borderColor,
        borderWidth: styles.borderWidth || '1px',
        borderStyle: styles.borderStyle || 'solid',
        borderRadius: t.radius,
        boxShadow: t.shadow,
        fontFamily: t.fontFamily,
      }
    case 'divider':
      return {
        ...styles,
        backgroundColor: t.borderColor,
      }
    case 'input':
    case 'select':
      return {
        ...styles,
        backgroundColor: t.surfaceColor,
        color: t.textColor,
        borderColor: t.borderColor,
        borderWidth: styles.borderWidth || '1px',
        borderStyle: styles.borderStyle || 'solid',
        borderRadius: t.radius,
        fontFamily: t.fontFamily,
      }
    default:
      return styles
  }
}

function applyThemeToComponent(component, theme) {
  return {
    ...component,
    styles: themedStyles(component.type, component.styles || {}, theme),
    ...(Array.isArray(component.children)
      ? { children: component.children.map((child) => applyThemeToComponent(child, theme)) }
      : {}),
  }
}

export function applyThemeToSchema(schema) {
  const theme = normalizeTheme(schema?.theme)
  const pages = (schema?.pages || []).map((page) => ({
    ...page,
    background: theme.backgroundColor,
    backgroundMobile: theme.backgroundColor,
    components: (page.components || []).map((component) => applyThemeToComponent(component, theme)),
  }))
  return {
    ...schema,
    theme,
    customCss: typeof schema?.customCss === 'string' ? schema.customCss : '',
    pages,
  }
}
