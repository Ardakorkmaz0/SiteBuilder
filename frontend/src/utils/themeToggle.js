// The site's light/dark switch, described once for the editor, the published
// page and the responsive export (see colorMode.js for what it switches).
//
// It is a real button with aria-pressed: pressed means the dark palette is
// on, whichever palette the site was designed in. A moon offers the dark
// palette, a sun offers the light one.
//
// With `states: 'three'` it is a radio group instead: light, dark or whatever
// the visitor's device says. The root's data-pwb-theme-pick says which is on.

import { styleText } from './formField.js'

export const THEME_TOGGLE_ICONS = {
  moon: '<svg class="pwb-tt-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.2 14.6A8.5 8.5 0 0 1 9.4 3.8a.8.8 0 0 0-1-.9A9.9 9.9 0 1 0 21.1 15.6a.8.8 0 0 0-.9-1Z"/></svg>',
  sun: '<svg class="pwb-tt-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>',
  device: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="4.5" width="18" height="12.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M9 20.5h6M12 17v3.5"/></svg>',
}

// The three choices: what each writes, its icon, and the prop holding its name.
export const THEME_CHOICES = [
  { value: 'light', icon: 'sun', nameProp: 'lightLabel', name: 'Light' },
  { value: 'dark', icon: 'moon', nameProp: 'darkLabel', name: 'Dark' },
  { value: 'system', icon: 'device', nameProp: 'deviceLabel', name: 'Device' },
]

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
  ':where(.pwb-theme-choices){display:inline-flex;align-items:stretch;gap:2px;box-sizing:border-box;color:inherit;font:inherit;line-height:1}',
  '.pwb-theme-choices button{appearance:none;flex:1 1 0;align-self:stretch;display:inline-flex;align-items:center;justify-content:center;gap:.4em;min-width:2em;margin:0;padding:0 .4em;border:0;border-radius:inherit;background:transparent;color:inherit;font:inherit;line-height:1;cursor:pointer;opacity:.7}',
  '.pwb-theme-choices svg{width:1.2em;height:1.2em;flex:0 0 auto}',
  `${THEME_CHOICES.map(({ value }) => `[data-pwb-theme-pick="${value}"] [data-pwb-theme-choose="${value}"]`).join(',')},.pwb-theme-choices [aria-checked="true"]{opacity:1;background:color-mix(in srgb,currentColor 16%,transparent)}`,
  '.pwb-theme-choices button:focus-visible{outline:2px solid currentColor;outline-offset:1px;opacity:1}',
].join('')

export function themeToggleLabel(props = {}) {
  return String(props.label || '').trim() || 'Dark mode'
}

export const showsLabel = (props = {}) => props.showLabel === 'on'

export const hasThreeStates = (props = {}) => props.states === 'three'

export const themeChoiceName = (choice, props = {}) => String(props[choice.nameProp] || '').trim() || choice.name

const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

export const themeToggleTag = (props = {}) => (hasThreeStates(props) ? 'div' : 'button')

export const themeToggleClass = (props = {}) => (hasThreeStates(props) ? 'pwb-theme-choices' : 'pwb-theme-toggle')

// What makes an element the switch: the runtime finds it by the data attribute.
export function themeToggleAttrs(props = {}) {
  const name = `aria-label="${esc(themeToggleLabel(props))}"`
  return hasThreeStates(props)
    ? ` role="radiogroup" data-pwb-theme-toggle="choices" ${name}`
    : ` type="button" data-pwb-theme-toggle aria-pressed="false" ${name}`
}

// Both icons (the palette on the root shows one) and the text when it is on;
// or one button for each choice.
export function themeToggleInner(props = {}) {
  if (hasThreeStates(props)) {
    return THEME_CHOICES.map((choice) => {
      const name = esc(themeChoiceName(choice, props))
      return `<button type="button" role="radio" aria-checked="false" data-pwb-theme-choose="${choice.value}" aria-label="${name}" title="${name}">${THEME_TOGGLE_ICONS[choice.icon]}${showsLabel(props) ? `<span>${name}</span>` : ''}</button>`
    }).join('')
  }
  return `${THEME_TOGGLE_ICONS.moon}${THEME_TOGGLE_ICONS.sun}${showsLabel(props) ? `<span>${esc(themeToggleLabel(props))}</span>` : ''}`
}

// The whole button, for an HTML page or a writer with no tag of its own for
// it. `style` is its look (a style object or text); `attrs` any attributes
// the writer adds (an id, a class of its own).
export function themeToggleHtml(props = {}, { style = '', attrs = '', className = '' } = {}) {
  const css = typeof style === 'string' ? style : styleText(style)
  const cls = [themeToggleClass(props), className].filter(Boolean).join(' ')
  const tag = themeToggleTag(props)
  return `<${tag} class="${cls}"${attrs}${themeToggleAttrs(props)}${css ? ` style="${esc(css)}"` : ''}>${themeToggleInner(props)}</${tag}>`
}

// A page that flows has no corner: the switch just added, last in its order,
// goes to the top instead, under a bar there.
export function themeSwitchFirstInFlow(components) {
  const added = components[components.length - 1]
  const rest = components.slice(0, -1)
  const at = rest[0]?.type === 'navbar' ? 1 : 0
  return [...rest.slice(0, at), added, ...rest.slice(at)]
}

// Where a switch goes when it is added for the owner: the top right corner of
// the page, under a bar across the top of it, whose links are on that side.
export function themeSwitchSpot(page, canvasWidth, width = 44) {
  const bar = (page?.components || []).find((c) => c?.type === 'navbar' && c.props?.navLayout !== 'vertical' && (c.layout?.y || 0) < 40)
  return {
    x: Math.max(0, canvasWidth - width - 24),
    y: bar ? (bar.layout?.y || 0) + (bar.layout?.h || 0) + 16 : 24,
  }
}
