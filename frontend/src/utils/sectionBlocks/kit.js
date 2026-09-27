// Building blocks for the section library. A section is written once as
// render(T, p): T(en, tr) picks the copy for the language being built (and
// escapes it), p is a tone — a small palette the section paints itself with.
// Every section is built twice at load, so a Turkish page gets Turkish copy
// and an English page English copy, from the same markup.
//
// Sections are self-contained: inline styles only (no <style> tag that could
// restyle the page they are dropped into), fluid type with clamp(), and grids
// that reflow with auto-fit instead of media queries. Fonts are inherited from
// the page, so a section takes on the site's typography.

const escape = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

export const copy = (en, tr = en) => ({ en, tr })

export const translator = (language) => (en, tr = en) => escape(language === 'tr' ? tr : en)

// Tones: each is a complete palette. `line` is the hairline colour, `onAccent`
// the text colour that sits on a solid accent fill. Accent text and button
// labels clear WCAG AA on the tone's own surfaces.
export const TONES = {
  light: { bg: '#ffffff', soft: '#f8fafc', card: '#ffffff', ink: '#0f172a', muted: '#5b6678', line: '#e2e8f0', accent: '#4f46e5', accentInk: '#4338ca', accentSoft: '#eef2ff', onAccent: '#ffffff', dark: false },
  soft: { bg: '#f6f7fb', soft: '#eceff6', card: '#ffffff', ink: '#111827', muted: '#586173', line: '#e1e5ee', accent: '#2563eb', accentInk: '#1d4ed8', accentSoft: '#e0ebff', onAccent: '#ffffff', dark: false },
  dark: { bg: '#0b1120', soft: '#111a2e', card: '#131d33', ink: '#f1f5f9', muted: '#9fb0c7', line: 'rgba(148,163,184,0.22)', accent: '#818cf8', accentInk: '#a5b4fc', accentSoft: 'rgba(129,140,248,0.16)', onAccent: '#0b1120', dark: true },
  warm: { bg: '#fffaf5', soft: '#fdf1e6', card: '#ffffff', ink: '#2a1d15', muted: '#735f52', line: '#f0e0d2', accent: '#c2410c', accentInk: '#9a3412', accentSoft: '#ffedd5', onAccent: '#ffffff', dark: false },
  forest: { bg: '#f7fbf8', soft: '#eaf4ee', card: '#ffffff', ink: '#12251a', muted: '#526a5c', line: '#d6e7dc', accent: '#15803d', accentInk: '#166534', accentSoft: '#dcfce7', onAccent: '#ffffff', dark: false },
  ocean: { bg: '#f5fbff', soft: '#e6f3fb', card: '#ffffff', ink: '#0c2233', muted: '#4d6576', line: '#d1e5f0', accent: '#0369a1', accentInk: '#075985', accentSoft: '#e0f2fe', onAccent: '#ffffff', dark: false },
  rose: { bg: '#fff8fa', soft: '#fdebf2', card: '#ffffff', ink: '#2a1520', muted: '#765666', line: '#f4d5e0', accent: '#be185d', accentInk: '#9d174d', accentSoft: '#fce7f3', onAccent: '#ffffff', dark: false },
  noir: { bg: '#0a0a0a', soft: '#151515', card: '#171717', ink: '#fafafa', muted: '#a8a8a8', line: 'rgba(255,255,255,0.13)', accent: '#facc15', accentInk: '#fde047', accentSoft: 'rgba(250,204,21,0.13)', onAccent: '#0a0a0a', dark: true },
  violet: { bg: '#fbf8ff', soft: '#f3ecff', card: '#ffffff', ink: '#1f1535', muted: '#655a7e', line: '#e6dcf8', accent: '#7c3aed', accentInk: '#6d28d9', accentSoft: '#ede9fe', onAccent: '#ffffff', dark: false },
  teal: { bg: '#04181b', soft: '#082428', card: '#0a2a2f', ink: '#e6fbf8', muted: '#8fbab4', line: 'rgba(45,212,191,0.2)', accent: '#2dd4bf', accentInk: '#5eead4', accentSoft: 'rgba(45,212,191,0.14)', onAccent: '#04181b', dark: true },
}

export const FONT_BASE = 'font-family:inherit;box-sizing:border-box;'

// A full-width band with a centred content column.
export const band = (p, inner, { max = 1120, bg = p.bg, pad = 'clamp(56px,8vw,96px) 24px', align = 'left', extra = '' } = {}) => (
  `<section style="${FONT_BASE}padding:${pad};background:${bg};color:${p.ink};text-align:${align};${extra}"><div style="max-width:${max}px;margin:0 auto;">${inner}</div></section>`
)

export const eyebrow = (p, text, align = 'left') => (
  `<p style="margin:0 0 12px;color:${p.accentInk};font-weight:700;letter-spacing:0.04em;font-size:14px;text-align:${align};">${text}</p>`
)

export const h1 = (p, text, extra = '') => (
  `<h1 style="margin:0 0 18px;font-size:clamp(36px,5.6vw,64px);font-weight:800;line-height:1.05;letter-spacing:-0.025em;color:${p.ink};${extra}">${text}</h1>`
)

export const h2 = (p, text, extra = '') => (
  `<h2 style="margin:0 0 14px;font-size:clamp(28px,3.6vw,42px);font-weight:800;line-height:1.12;letter-spacing:-0.02em;color:${p.ink};${extra}">${text}</h2>`
)

export const h3 = (p, text, extra = '') => (
  `<h3 style="margin:0 0 8px;font-size:19px;font-weight:700;line-height:1.3;color:${p.ink};${extra}">${text}</h3>`
)

export const lead = (p, text, extra = '') => (
  `<p style="margin:0 0 28px;font-size:clamp(17px,1.8vw,20px);line-height:1.6;color:${p.muted};max-width:640px;${extra}">${text}</p>`
)

export const body = (p, text, extra = '') => (
  `<p style="margin:0;font-size:15.5px;line-height:1.65;color:${p.muted};${extra}">${text}</p>`
)

export const btn = (p, text, kind = 'solid', extra = '') => {
  const styles = {
    solid: `background:${p.accent};color:${p.onAccent};border:1.5px solid ${p.accent};`,
    ghost: `background:transparent;color:${p.ink};border:1.5px solid ${p.line};`,
    soft: `background:${p.accentSoft};color:${p.accentInk};border:1.5px solid transparent;`,
    light: `background:#ffffff;color:#0f172a;border:1.5px solid #ffffff;`,
    outlineLight: 'background:transparent;color:#ffffff;border:1.5px solid rgba(255,255,255,0.55);',
  }
  return `<a href="#" style="display:inline-block;padding:13px 26px;border-radius:12px;font-weight:700;font-size:15.5px;text-decoration:none;line-height:1.2;${styles[kind]}${extra}">${text}</a>`
}

export const buttons = (...items) => `<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">${items.join('')}</div>`

export const chip = (p, text, extra = '') => (
  `<span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${p.accentSoft};color:${p.accentInk};font-size:13px;font-weight:700;${extra}">${text}</span>`
)

export const grid = (min, items, gap = 20, extra = '') => (
  `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,${min}px),1fr));gap:${gap}px;${extra}">${items.join('')}</div>`
)

export const card = (p, inner, extra = '') => (
  `<div style="padding:26px;border-radius:18px;background:${p.card};border:1px solid ${p.line};${extra}">${inner}</div>`
)

// Decorative artwork: a soft gradient panel in the tone's accent. Used where a
// photo would go, so a section never shows a broken image offline.
export const art = (p, { ratio = '4/3', angle = 135, radius = 20, extra = '' } = {}) => {
  const a = p.accent
  return `<div aria-hidden="true" style="aspect-ratio:${ratio};border-radius:${radius}px;background:radial-gradient(120% 90% at 85% 10%, ${a}55, transparent 60%),linear-gradient(${angle}deg, ${a}22, ${a}aa);${extra}"></div>`
}

// A real, replaceable photo from the placeholder service, with a gradient
// behind it while it loads.
export const photo = (seed, w, h, { radius = 18, ratio = `${w}/${h}`, extra = '', alt = '' } = {}) => (
  `<img src="https://picsum.photos/seed/${seed}/${w}/${h}" alt="${alt}" loading="lazy" style="display:block;width:100%;height:auto;aspect-ratio:${ratio};object-fit:cover;border-radius:${radius}px;background:linear-gradient(135deg,#e2e8f0,#cbd5e1);${extra}" />`
)

export const avatar = (p, letter, size = 44, angle = 135) => (
  `<span aria-hidden="true" style="display:inline-grid;place-items:center;flex-shrink:0;width:${size}px;height:${size}px;border-radius:999px;background:linear-gradient(${angle}deg, ${p.accent}, ${p.accent}88);color:${p.onAccent};font-weight:800;font-size:${Math.round(size * 0.4)}px;">${letter}</span>`
)

export const icon = (p, glyph, size = 46) => (
  `<span aria-hidden="true" style="display:inline-grid;place-items:center;width:${size}px;height:${size}px;border-radius:${Math.round(size / 3.4)}px;background:${p.accentSoft};color:${p.accentInk};font-size:${Math.round(size * 0.46)}px;font-weight:800;margin-bottom:16px;">${glyph}</span>`
)

export const stars = (p, count = 5) => `<span aria-label="${count}/5" style="color:${p.dark ? '#facc15' : '#f59e0b'};letter-spacing:2px;font-size:15px;">${'★'.repeat(count)}${'☆'.repeat(5 - count)}</span>`

export const check = (p, text) => (
  `<li style="display:flex;gap:10px;align-items:flex-start;margin:0 0 10px;color:${p.ink};font-size:15.5px;line-height:1.5;"><span aria-hidden="true" style="flex-shrink:0;color:${p.accent};font-weight:900;">✓</span><span>${text}</span></li>`
)

export const checklist = (p, items, extra = '') => `<ul style="list-style:none;margin:0;padding:0;${extra}">${items.map((item) => check(p, item)).join('')}</ul>`

// Field names matter: on a published site the runtime sends any <form>
// without an action to the site's inbox, and only named fields are kept.
const FIELD_NAMES = { email: 'email', tel: 'phone', date: 'date', time: 'time', search: 'q' }

export const input = (p, placeholder, type = 'text', extra = '', name = FIELD_NAMES[type] || '') => (
  `<input type="${type}"${name ? ` name="${name}"` : ''} placeholder="${placeholder}" aria-label="${placeholder}" style="${FONT_BASE}width:100%;min-width:0;padding:13px 16px;border-radius:12px;border:1px solid ${p.line};background:${p.card};color:${p.ink};font-size:15px;${extra}" />`
)

export const textarea = (p, placeholder, rows = 4, name = 'message') => (
  `<textarea name="${name}" placeholder="${placeholder}" aria-label="${placeholder}" rows="${rows}" style="${FONT_BASE}width:100%;padding:13px 16px;border-radius:12px;border:1px solid ${p.line};background:${p.card};color:${p.ink};font-size:15px;resize:vertical;"></textarea>`
)

// A section definition. `render(T, p)` returns the markup; `tone` names its
// palette; `size` is the natural frame on a 1000px canvas.
export const section = (id, category, label, desc, tone, render, size = [1000, 460]) => ({
  id, category, label, desc, tone, render, size,
})
