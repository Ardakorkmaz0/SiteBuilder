// The site's light/dark switch, described once for the editor, the published
// page and the responsive export (see colorMode.js for what it switches).
//
// It is a real button with aria-pressed: pressed means the dark palette is
// on, whichever palette the site was designed in. A moon offers the dark
// palette, a sun offers the light one.

import { styleText } from './formField.js'

export const THEME_TOGGLE_ICONS = {
  moon: '<svg class="pwb-tt-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.2 14.6A8.5 8.5 0 0 1 9.4 3.8a.8.8 0 0 0-1-.9A9.9 9.9 0 1 0 21.1 15.6a.8.8 0 0 0-.9-1Z"/></svg>',
  sun: '<svg class="pwb-tt-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>',
}

// On a published page both icons are written and the palette on the root
// picks one, so the right icon shows before any script has run. The base rule
// has no weight (:where), so the component's own look always wins over it.
export const THEME_TOGGLE_CSS = [
  ':where(.pwb-theme-toggle){appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:.5em;box-sizing:border-box;margin:0;padding:0;border:0;background:transparent;color:inherit;font:inherit;line-height:1;cursor:pointer}',
  '.pwb-theme-toggle svg{width:1.2em;height:1.2em;flex:0 0 auto}',
  '.pwb-theme-toggle .pwb-tt-sun{display:none}',
  '[data-pwb-theme="dark"] .pwb-theme-toggle .pwb-tt-sun{display:block}',
  '[data-pwb-theme="dark"] .pwb-theme-toggle .pwb-tt-moon{display:none}',
  '.pwb-theme-toggle:focus-visible{outline:2px solid currentColor;outline-offset:2px}',
].join('')

export function themeToggleLabel(props = {}) {
  return String(props.label || '').trim() || 'Dark mode'
}

export const showsLabel = (props = {}) => props.showLabel === 'on'

const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// What makes a button the switch: the runtime finds it by the data attribute.
export function themeToggleAttrs(props = {}) {
  return ` type="button" data-pwb-theme-toggle aria-pressed="false" aria-label="${esc(themeToggleLabel(props))}"`
}

// Both icons (the palette on the root shows one) and the text when it is on.
export function themeToggleInner(props = {}) {
  return `${THEME_TOGGLE_ICONS.moon}${THEME_TOGGLE_ICONS.sun}${showsLabel(props) ? `<span>${esc(themeToggleLabel(props))}</span>` : ''}`
}

// The whole button, for an HTML page or a writer with no tag of its own for
// it. `style` is its look (a style object or text); `attrs` any attributes
// the writer adds (an id, a class of its own).
export function themeToggleHtml(props = {}, { style = '', attrs = '', className = '' } = {}) {
  const css = typeof style === 'string' ? style : styleText(style)
  const cls = ['pwb-theme-toggle', className].filter(Boolean).join(' ')
  return `<button class="${cls}"${attrs}${themeToggleAttrs(props)}${css ? ` style="${esc(css)}"` : ''}>${themeToggleInner(props)}</button>`
}
