// Checks for what an AI model writes into the page: a block's styles and
// props, a navbar's links, a tabs block's tabs and the site theme.
//
// The store merges whatever it is handed and the server drops what it does
// not know on the next save. A patch nobody checked is therefore a change the
// model reports as done and the page never shows: `background` instead of
// `backgroundColor`, a `label` on a button, a string where an object belongs.
// Each check returns the cleaned value and, when something in it cannot work,
// an `error` the model can act on.

import { ALLOWED_STYLE_KEYS } from './sanitize.js'
import { DEFAULT_THEME } from './theme.js'
import { registry } from '../components/registry.jsx'
import { LINKABLE_TYPES } from '../components/renderer/constants.js'

// The values sanitizeStyles drops when the page is drawn.
const UNSAFE_VALUE = /javascript:|expression\(|url\(/i

// Props every block type keeps (sanitize_shared_props on the server).
const SHARED_PROPS = [
  'dockX', 'anchor', 'fit', 'animIn', 'animSpeed', 'animDelay', 'animHover',
  'scrollBehavior', 'pinY', 'pinX', 'pinOffsetY', 'pinOffsetX', 'pinZIndex',
]

// Props the server keeps for a type that the properties panel edits through
// its own controls, so the registry does not list them.
const EXTRA_PROPS = {
  container: ['flow', 'align', 'justify', 'gap', 'cols', 'wrap'],
  html: ['shape'],
}

// Mirrors TAB_ID_RE and MAX_TABS in backend/builder/validators.py.
const TAB_ID = /^[A-Za-z0-9_-]{1,40}$/
const MAX_TABS = 12

// Models double-encode now and then: the patch arrives as the JSON text of
// the object. Spread into a block, that string became props named "0", "1"…
function asObject(raw) {
  let value = raw
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { return null }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

const camelCase = (key) => String(key).trim().replace(/-+([a-z])/g, (_, letter) => letter.toUpperCase())

const quoted = (list) => list.map((item) => JSON.stringify(item)).join(', ')

export function checkStylePatch(raw) {
  const input = asObject(raw)
  if (!input || !Object.keys(input).length) {
    return { patch: {}, error: 'patch must be an object with at least one style, for example {"backgroundColor":"#111827"}.' }
  }
  const patch = {}
  const problems = []
  let unknown = false
  for (const [rawKey, value] of Object.entries(input)) {
    let key = camelCase(rawKey)
    // The CSS shorthand is the one models reach for first.
    if (key === 'background') key = /gradient\(/i.test(String(value)) ? 'backgroundImage' : 'backgroundColor'
    if (!ALLOWED_STYLE_KEYS.has(key)) {
      problems.push(`"${rawKey}" is not a supported style`)
      unknown = true
    } else if ((typeof value !== 'string' && typeof value !== 'number') || Number.isNaN(value)) {
      problems.push(`"${rawKey}" must be a string or a number, got ${JSON.stringify(value)}`)
    } else if (UNSAFE_VALUE.test(String(value))) {
      problems.push(`"${rawKey}" cannot use url(), expression() or javascript: (for a picture, add an image component and set its src)`)
    } else {
      patch[key] = value
    }
  }
  if (!problems.length) return { patch, error: null }
  return {
    patch,
    error: `${problems.join('; ')}.${unknown ? ` Supported styles: ${[...ALLOWED_STYLE_KEYS].join(', ')}.` : ''}`,
  }
}

// The props a block of this type has: the registry's defaults and editable
// fields, plus the few the server keeps without a registry entry.
export function propKeysFor(type) {
  const def = registry[type]
  if (!def) return []
  const keys = new Set([
    ...Object.keys(def.defaultProps || {}),
    ...(def.editableProps || []).map((field) => field.key),
    ...(EXTRA_PROPS[type] || []),
  ])
  if (LINKABLE_TYPES.has(type)) keys.add('href')
  return [...keys]
}

// The values a select field offers, or null for a free field.
function optionsFor(type, key) {
  const field = (registry[type]?.editableProps || []).find((item) => item.key === key && Array.isArray(item.options))
  return field ? field.options.map((option) => (Array.isArray(option) ? option[0] : option)) : null
}

function chooseOption(key, value, options) {
  // An on/off field is stored as '' and one other value.
  if (typeof value === 'boolean' && options.length === 2 && options.includes('')) {
    return value ? options.find((option) => option !== '') : ''
  }
  const text = String(value)
  if (key === 'level' && /^[1-3]$/.test(text)) return `h${text}`
  return text
}

export function checkLinks(raw) {
  if (!Array.isArray(raw)) return { links: [], error: 'links must be an array of { "label": …, "href": … } objects.' }
  const links = []
  for (const [index, item] of raw.entries()) {
    const label = item && typeof item === 'object' && typeof item.label === 'string' ? item.label.trim() : ''
    if (!label) {
      return { links: [], error: `links[${index}] needs a label: each link is { "label": "Home", "href": "#home" }, got ${JSON.stringify(item)}.` }
    }
    links.push({ label, href: typeof item.href === 'string' ? item.href : '' })
  }
  return { links, error: null }
}

// Tabs as the server keeps them: an id of letters, digits, _ and -, unique
// in the block. An id the model left out or wrote with spaces is made from
// what it gave rather than refused; the result reports the ids that were kept.
export function checkTabs(raw) {
  if (!Array.isArray(raw) || !raw.length) {
    return { tabs: [], error: 'tabs must be an array with at least one { "id": …, "label": … } object.' }
  }
  if (raw.length > MAX_TABS) return { tabs: [], error: `A tabs block holds at most ${MAX_TABS} tabs, got ${raw.length}.` }
  const tabs = []
  const taken = new Set()
  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { tabs: [], error: `tabs[${index}] must be { "id": …, "label": … }, got ${JSON.stringify(item)}.` }
    }
    const label = typeof item.label === 'string' || typeof item.label === 'number' ? String(item.label).trim() : ''
    let id = typeof item.id === 'string' || typeof item.id === 'number' ? String(item.id).trim() : ''
    if (!TAB_ID.test(id)) {
      id = (id || label).replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
    }
    if (!id) id = `t${index + 1}`
    if (taken.has(id)) {
      return { tabs: [], error: `Two tabs share the id "${id}". Give every tab its own id.` }
    }
    taken.add(id)
    tabs.push({ id, label: (label || id).slice(0, 60) })
  }
  return { tabs, error: null }
}

export function checkPropsPatch(component, raw) {
  const input = asObject(raw)
  const type = component?.type
  if (!input || !Object.keys(input).length) {
    return { patch: {}, error: 'patch must be an object with at least one prop, for example {"text":"Hello"}.' }
  }
  const own = propKeysFor(type)
  const allowed = new Set([...own, ...SHARED_PROPS, ...Object.keys(component?.props || {})])
  const patch = {}
  const problems = []
  let unknown = false
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key)) {
      unknown = true
      problems.push(ALLOWED_STYLE_KEYS.has(camelCase(key)) || key === 'background'
        ? `"${key}" is a style, not a prop: set it with updateStyles`
        : `a ${type} has no "${key}" prop`)
      continue
    }
    if (key === 'tabs') {
      problems.push('change tabs with setTabs, which keeps the blocks inside each tab attached')
      continue
    }
    if (key === 'links') {
      const checked = checkLinks(value)
      if (checked.error) problems.push(checked.error.replace(/\.$/, ''))
      else patch.links = checked.links
      continue
    }
    if (!['string', 'number', 'boolean'].includes(typeof value) || Number.isNaN(value)) {
      problems.push(`"${key}" must be text, a number or true/false, got ${JSON.stringify(value)}`)
      continue
    }
    const options = optionsFor(type, key)
    if (options) {
      const choice = chooseOption(key, value, options)
      if (!options.includes(choice)) {
        problems.push(`"${key}" must be one of: ${quoted(options)}`)
        continue
      }
      patch[key] = choice
      continue
    }
    patch[key] = value
  }
  if (!problems.length) return { patch, error: null }
  return {
    patch,
    error: `${problems.join('; ')}.${unknown ? ` Props of a ${type}: ${own.join(', ') || '(none)'}.` : ''}`,
  }
}

export function checkThemePatch(raw) {
  const input = asObject(raw)
  const keys = Object.keys(DEFAULT_THEME)
  if (!input || !Object.keys(input).length) {
    return { patch: {}, error: `patch must be an object with at least one theme key, for example {"primaryColor":"#2563eb"}. Theme keys: ${keys.join(', ')}.` }
  }
  const patch = {}
  const problems = []
  let unknown = false
  for (const [key, value] of Object.entries(input)) {
    if (!keys.includes(key)) {
      problems.push(`"${key}" is not a theme key`)
      unknown = true
    } else if ((typeof value !== 'string' && typeof value !== 'number') || Number.isNaN(value)) {
      problems.push(`"${key}" must be a string, got ${JSON.stringify(value)}`)
    } else if (UNSAFE_VALUE.test(String(value))) {
      problems.push(`"${key}" cannot use url(), expression() or javascript:`)
    } else {
      patch[key] = String(value)
    }
  }
  if (!problems.length) return { patch, error: null }
  return { patch, error: `${problems.join('; ')}.${unknown ? ` Theme keys: ${keys.join(', ')}.` : ''}` }
}
