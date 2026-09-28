// Form fields, described once.
//
// The editor draws a field with React, a published page writes it as HTML,
// and the responsive export writes it again. All three read this module, so a
// password field or a switch cannot look one way in the editor and another on
// the live site. A field is made of parts (its label, the field itself, the
// placeholder, a help line, and whatever its kind adds), and each part has its
// own settings: the Properties panel groups them by part, and the large view
// lets you click a part to edit just that one.

export const FIELD_TYPES = [
  ['text', 'Text'],
  ['email', 'Email'],
  ['password', 'Password'],
  ['number', 'Number'],
  ['tel', 'Phone'],
  ['url', 'URL'],
  ['search', 'Search'],
  ['date', 'Date'],
  ['time', 'Time'],
  ['textarea', 'Multi-line text'],
  ['checkbox', 'Checkbox'],
  ['radio', 'Choice list'],
  ['switch', 'On/off switch'],
  ['range', 'Slider'],
]
const TYPE_SET = new Set(FIELD_TYPES.map(([value]) => value))

export function fieldType(value) {
  return TYPE_SET.has(value) ? value : 'text'
}

// How a field is drawn. A dropdown is its own component type but has the
// same parts, so it is a kind here too.
export function fieldKind(componentType, inputType) {
  if (componentType === 'select') return 'select'
  const type = fieldType(inputType)
  if (type === 'textarea') return 'area'
  if (type === 'checkbox') return 'check'
  if (type === 'switch') return 'switch'
  if (type === 'radio') return 'choice'
  if (type === 'range') return 'range'
  return 'box'
}

export const FIELD_PARTS = ['label', 'field', 'placeholder', 'reveal', 'choices', 'control', 'help']

const KIND_PARTS = {
  box: ['label', 'field', 'placeholder', 'help'],
  area: ['label', 'field', 'placeholder', 'help'],
  select: ['label', 'field', 'choices', 'placeholder', 'help'],
  check: ['label', 'control', 'help'],
  switch: ['label', 'control', 'help'],
  choice: ['label', 'choices', 'control', 'help'],
  range: ['label', 'control', 'help'],
}

export function partsFor(componentType, inputType) {
  const kind = fieldKind(componentType, inputType)
  const type = fieldType(inputType)
  if (kind === 'box' && type === 'password') return ['label', 'field', 'placeholder', 'reveal', 'help']
  // A date or time field shows its format, never a placeholder.
  if (kind === 'box' && (type === 'date' || type === 'time')) return ['label', 'field', 'help']
  return KIND_PARTS[kind]
}

// What each part is called, for the panel and the large view.
export function partLabel(part, componentType, inputType) {
  if (part === 'control') {
    const kind = fieldKind(componentType, inputType)
    if (kind === 'switch') return 'Switch'
    if (kind === 'range') return 'Slider'
    if (kind === 'choice') return 'Buttons'
    return 'Checkbox'
  }
  if (part === 'label' && fieldKind(componentType, inputType) === 'choice') return 'Question'
  return {
    label: 'Label',
    field: 'Field',
    placeholder: 'Placeholder',
    reveal: 'Show password button',
    choices: 'Choices',
    help: 'Help text',
  }[part] || part
}

const WEIGHTS = [['400', 'Regular'], ['500', 'Medium'], ['600', 'Semibold'], ['700', 'Bold']]

// Every setting a field has, tagged with the part it belongs to. `kinds`
// limits a setting to the kinds of field it means something for; `types`
// narrows it to input types.
// What a field looks like before anyone sets these: the colour swatches show
// it instead of an empty black square.
const DEFAULT_ACCENT = '#2563eb'
const DEFAULT_FIELD_BACKGROUND = '#ffffff'
const DEFAULT_FIELD_BORDER = '#cbd5e1'

export const FIELD_CONTROLS = [
  { key: 'inputType', label: 'Field type', control: 'select', options: FIELD_TYPES, part: null, componentTypes: ['input'] },
  { key: 'label', label: 'Text', control: 'textarea', part: 'label' },
  { key: 'required', label: 'Required', control: 'select', options: [['', 'No'], ['on', 'Yes (marked with *)']], part: 'label', kinds: ['box', 'area', 'select', 'check', 'switch', 'choice'] },
  { key: 'labelColor', label: 'Color', control: 'color', part: 'label' },
  { key: 'labelFontSize', label: 'Size', control: 'px', part: 'label' },
  { key: 'labelFontWeight', label: 'Weight', control: 'select', options: WEIGHTS, part: 'label' },
  { key: 'labelGap', label: 'Space below', control: 'px', part: 'label', kinds: ['box', 'area', 'select', 'choice', 'range'] },

  { key: 'fieldBackgroundColor', label: 'Background', control: 'color', fallback: DEFAULT_FIELD_BACKGROUND, part: 'field' },
  { key: 'fieldColor', label: 'Text color', control: 'color', part: 'field' },
  { key: 'fieldFontSize', label: 'Text size', control: 'px', part: 'field' },
  { key: 'fieldHeight', label: 'Height', control: 'px', part: 'field' },
  { key: 'fieldPadding', label: 'Padding', control: 'text', placeholder: 'e.g. 12px 16px', part: 'field' },
  { key: 'fieldBorderColor', label: 'Border color', control: 'color', fallback: DEFAULT_FIELD_BORDER, part: 'field' },
  { key: 'fieldBorderWidth', label: 'Border width', control: 'px', part: 'field' },
  { key: 'fieldBorderRadius', label: 'Corner radius', control: 'px', part: 'field' },
  { key: 'fieldBoxShadow', label: 'Shadow', control: 'text', placeholder: 'none', part: 'field' },
  { key: 'fieldFocusColor', label: 'Focus ring', control: 'color', part: 'field' },

  { key: 'placeholder', label: 'Text', control: 'text', part: 'placeholder' },
  { key: 'placeholderColor', label: 'Color', control: 'color', part: 'placeholder', kinds: ['box', 'area'] },

  { key: 'revealButton', label: 'Button', control: 'select', options: [['', 'Shown'], ['off', 'Hidden']], part: 'reveal' },
  { key: 'revealColor', label: 'Icon color', control: 'color', part: 'reveal' },

  { key: 'options', label: 'Choices (one per line)', control: 'textarea', part: 'choices' },
  { key: 'choicesDirection', label: 'Layout', control: 'select', options: [['', 'Stacked'], ['row', 'Side by side']], part: 'choices', kinds: ['choice'] },
  { key: 'choicesGap', label: 'Space between', control: 'px', part: 'choices', kinds: ['choice'] },
  { key: 'choiceColor', label: 'Text color', control: 'color', part: 'choices', kinds: ['choice'] },
  { key: 'choiceFontSize', label: 'Text size', control: 'px', part: 'choices', kinds: ['choice'] },

  { key: 'accentColor', label: 'Color when on', control: 'color', fallback: DEFAULT_ACCENT, part: 'control', kinds: ['check', 'switch', 'choice'] },
  { key: 'accentColor', label: 'Color', control: 'color', fallback: DEFAULT_ACCENT, part: 'control', kinds: ['range'] },
  { key: 'controlSize', label: 'Size', control: 'px', part: 'control', kinds: ['check', 'switch', 'choice'] },
  { key: 'checked', label: 'Starts', control: 'select', options: [['', 'Off'], ['on', 'On']], part: 'control', kinds: ['check', 'switch'] },
  { key: 'rangeMin', label: 'Lowest', control: 'text', part: 'control', kinds: ['range'] },
  { key: 'rangeMax', label: 'Highest', control: 'text', part: 'control', kinds: ['range'] },
  { key: 'rangeStep', label: 'Step', control: 'text', part: 'control', kinds: ['range'] },
  { key: 'rangeValue', label: 'Starts at', control: 'text', part: 'control', kinds: ['range'] },

  { key: 'helpText', label: 'Text', control: 'textarea', part: 'help' },
  { key: 'helpColor', label: 'Color', control: 'color', part: 'help' },
  { key: 'helpFontSize', label: 'Size', control: 'px', part: 'help' },
]

// The settings that apply to this field, in panel order.
export function controlsFor(componentType, inputType) {
  const kind = fieldKind(componentType, inputType)
  const parts = new Set(partsFor(componentType, inputType))
  return FIELD_CONTROLS.filter((control) => (
    (!control.componentTypes || control.componentTypes.includes(componentType))
    && (control.part === null || parts.has(control.part))
    && (!control.kinds || control.kinds.includes(kind))
    // A switch or checkbox has no field box: its field settings are the control.
    && !(control.part === 'field' && (kind === 'check' || kind === 'switch' || kind === 'choice' || kind === 'range'))
  ))
}

const has = (value) => value !== undefined && value !== null && value !== ''

function numberOr(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

// Plain CSS values for each part (camelCase keys), before any scaling.
// `size` maps a length: the editor passes its box scale, the page passes the
// value through.
export function fieldStyles(componentType, props = {}, size = (value) => value) {
  const kind = fieldKind(componentType, props.inputType)
  const type = fieldType(props.inputType)
  const reveal = type === 'password' && props.revealButton !== 'off'
  const controlSize = props.controlSize || (kind === 'switch' ? '22px' : '18px')
  const root = {
    display: 'flex',
    flexDirection: kind === 'check' || kind === 'switch' ? 'row' : 'column',
    alignItems: kind === 'check' || kind === 'switch' ? 'center' : 'stretch',
    flexWrap: kind === 'check' || kind === 'switch' ? 'wrap' : 'nowrap',
    gap: size(kind === 'check' || kind === 'switch' ? '10px' : props.labelGap || '6px'),
    minWidth: 0,
    width: '100%',
  }
  const label = {
    fontWeight: props.labelFontWeight || (kind === 'check' || kind === 'switch' ? '400' : '600'),
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    ...(has(props.labelFontSize) ? { fontSize: size(props.labelFontSize) } : {}),
    ...(has(props.labelColor) ? { color: props.labelColor } : {}),
    ...(kind === 'check' || kind === 'switch' ? { flex: '1 1 0', minWidth: 0 } : {}),
    ...(kind === 'choice' ? { padding: 0, marginBottom: size(props.labelGap || '6px') } : {}),
  }
  const field = {
    width: '100%',
    height: size(props.fieldHeight || (kind === 'area' ? '120px' : '44px')),
    padding: size(props.fieldPadding || '10px 12px'),
    borderWidth: size(props.fieldBorderWidth || '1px'),
    borderStyle: 'solid',
    borderColor: props.fieldBorderColor || DEFAULT_FIELD_BORDER,
    borderRadius: size(props.fieldBorderRadius || '8px'),
    font: 'inherit',
    ...(has(props.fieldFontSize) ? { fontSize: size(props.fieldFontSize) } : {}),
    color: props.fieldColor || 'inherit',
    background: props.fieldBackgroundColor || DEFAULT_FIELD_BACKGROUND,
    boxShadow: props.fieldBoxShadow || 'none',
    boxSizing: 'border-box',
    minWidth: 0,
    ...(kind === 'area' ? { resize: 'vertical', lineHeight: 1.5 } : {}),
    // Room for the eye button, so a long password does not run under it.
    ...(reveal ? { paddingRight: size('44px') } : {}),
    ...(has(props.placeholderColor) ? { '--pwb-placeholder': props.placeholderColor } : {}),
    ...(has(props.fieldFocusColor) ? { '--pwb-focus': props.fieldFocusColor } : {}),
  }
  const help = {
    margin: 0,
    fontSize: size(props.helpFontSize || '13px'),
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    ...(has(props.helpColor) ? { color: props.helpColor } : { opacity: 0.72 }),
    ...(kind === 'check' || kind === 'switch' ? { flexBasis: '100%' } : {}),
  }
  const accent = props.accentColor || DEFAULT_ACCENT
  const control = {
    accentColor: accent,
    width: size(controlSize),
    height: size(controlSize),
    margin: 0,
    flex: '0 0 auto',
    cursor: 'pointer',
  }
  const switchBox = {
    '--pwb-accent': accent,
    '--pwb-switch': size(controlSize),
  }
  const range = { width: '100%', margin: 0, accentColor: accent, cursor: 'pointer' }
  const choices = {
    display: 'flex',
    flexDirection: props.choicesDirection === 'row' ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: size(props.choicesGap || (props.choicesDirection === 'row' ? '16px' : '8px')),
  }
  const choice = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: size('8px'),
    cursor: 'pointer',
    ...(has(props.choiceColor) ? { color: props.choiceColor } : {}),
    ...(has(props.choiceFontSize) ? { fontSize: size(props.choiceFontSize) } : {}),
  }
  const revealButton = has(props.revealColor) ? { color: props.revealColor } : {}
  return { kind, type, reveal, root, label, field, help, control, switchBox, range, choices, choice, revealButton }
}

// The classes that carry what inline styles cannot say (a placeholder's
// colour, a focus ring): added only when the setting is used, so a field
// nobody styled keeps the browser's own look.
export function fieldClassName(props = {}) {
  return [
    'pwb-field-input',
    has(props.placeholderColor) ? 'pwb-ph' : '',
    has(props.fieldFocusColor) ? 'pwb-focus' : '',
  ].filter(Boolean).join(' ')
}

// A choice list switched to from another kind keeps something to show.
const DEFAULT_CHOICES = ['Option 1', 'Option 2', 'Option 3']

export function choiceList(props = {}, fallback = []) {
  const list = String(props.options || '').split('\n').map((option) => option.trim()).filter(Boolean)
  return list.length ? list : fallback
}

export function radioChoices(props = {}) {
  return choiceList(props, DEFAULT_CHOICES)
}

export function rangeAttrs(props = {}) {
  const min = numberOr(props.rangeMin, 0)
  const max = numberOr(props.rangeMax, 100)
  const step = numberOr(props.rangeStep, 1)
  const value = Math.min(max, Math.max(min, numberOr(props.rangeValue, (min + max) / 2)))
  return { min, max, step, value }
}

// What only a stylesheet can do, shared by the editor, published pages and
// HTML pages (through the builder runtime's style tag).
export const FORM_FIELD_CSS = [
  '.pwb-ph::placeholder{color:var(--pwb-placeholder);opacity:1}',
  '.pwb-focus:focus,.pwb-focus:focus-visible{outline:2px solid var(--pwb-focus);outline-offset:1px}',
  '.pwb-password{position:relative;display:block;width:100%}',
  '.pwb-reveal{position:absolute;top:50%;right:6px;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:0;border-radius:6px;background:transparent;color:inherit;opacity:.7;cursor:pointer}',
  '.pwb-reveal:hover{opacity:1}',
  '.pwb-reveal:focus-visible{outline:2px solid currentColor;outline-offset:1px;opacity:1}',
  '.pwb-reveal[aria-pressed="true"] .pwb-eye-open,.pwb-reveal[aria-pressed="false"] .pwb-eye-shut{display:none}',
  '.pwb-switch{position:relative;display:inline-block;flex:0 0 auto;width:calc(var(--pwb-switch,22px)*1.8);height:var(--pwb-switch,22px)}',
  '.pwb-switch input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}',
  '.pwb-switch-track{position:absolute;inset:0;border-radius:999px;background:#cbd5e1;pointer-events:none;transition:background-color .15s}',
  '.pwb-switch-track::after{content:"";position:absolute;top:2px;left:2px;width:calc(var(--pwb-switch,22px) - 4px);height:calc(var(--pwb-switch,22px) - 4px);border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}',
  '.pwb-switch input:checked+.pwb-switch-track{background:var(--pwb-accent,#2563eb)}',
  '.pwb-switch input:checked+.pwb-switch-track::after{transform:translateX(calc(var(--pwb-switch,22px)*.8))}',
  '.pwb-switch input:focus-visible+.pwb-switch-track{outline:2px solid var(--pwb-accent,#2563eb);outline-offset:2px}',
  '.pwb-choices{border:0;margin:0;padding:0;min-width:0}',
  '@media (prefers-reduced-motion:reduce){.pwb-switch-track,.pwb-switch-track::after{transition:none}}',
].join('')

// Open and shut eyes, both present; the pressed state shows one.
export const EYE_ICONS = '<svg class="pwb-eye-open" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'
  + '<svg class="pwb-eye-shut" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>'

// ---- HTML (published page, responsive export, HTML pages) --------------------

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function textHtml(value) {
  return esc(value).replace(/\r?\n/g, '<br>')
}

const kebab = (key) => (key.startsWith('--') ? key : key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`))

// Inline CSS from a style object. Values come from the owner's settings, so
// anything that could reach out of the page (url(), expression()) is dropped.
export function styleText(style = {}) {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [kebab(key), String(value).replace(/[;{}<>"]/g, '')])
    .filter(([, value]) => !/url\(|expression\(|javascript:/i.test(value))
    .map(([key, value]) => `${key}:${value}`)
    .join(';')
}

const attr = (style) => {
  const text = styleText(style)
  return text ? ` style="${esc(text)}"` : ''
}

// The inside of a field component, as HTML. `id` makes a radio group's name
// and the label's `for` unique on the page.
export function fieldHtml(componentType, props = {}, id = 'field') {
  const s = fieldStyles(componentType, props)
  const required = props.required === 'on'
  const star = required ? '<span aria-hidden="true"> *</span>' : ''
  const labelText = has(props.label) ? `${textHtml(props.label)}${star}` : ''
  const inputId = `f-${String(id).replace(/[^a-zA-Z0-9_-]/g, '')}`
  const req = required ? ' required' : ''
  const help = has(props.helpText) ? `<p${attr(s.help)}>${textHtml(props.helpText)}</p>` : ''
  const cls = fieldClassName(props)

  if (s.kind === 'check' || s.kind === 'switch') {
    const checked = props.checked === 'on' ? ' checked' : ''
    const control = s.kind === 'switch'
      ? `<span class="pwb-switch"${attr(s.switchBox)}><input id="${inputId}" type="checkbox" role="switch"${checked}${req} /><span class="pwb-switch-track"></span></span>`
      : `<input id="${inputId}" type="checkbox"${checked}${req}${attr(s.control)} />`
    const label = labelText ? `<label for="${inputId}"${attr(s.label)}>${labelText}</label>` : ''
    return `<div${attr(s.root)}>${control}${label}${help}</div>`
  }

  if (s.kind === 'choice') {
    const name = `${inputId}-choice`
    const items = radioChoices(props).map((option, index) => (
      `<label${attr(s.choice)}><input type="radio" name="${name}" value="${esc(option)}"${index === 0 && required ? req : ''}${attr(s.control)} /><span>${textHtml(option)}</span></label>`
    )).join('')
    const legend = labelText ? `<legend${attr(s.label)}>${labelText}</legend>` : ''
    return `<fieldset class="pwb-choices"${attr(s.root)}>${legend}<div${attr(s.choices)}>${items}</div>${help}</fieldset>`
  }

  const label = labelText ? `<label for="${inputId}"${attr(s.label)}>${labelText}</label>` : ''

  if (s.kind === 'range') {
    const r = rangeAttrs(props)
    return `<div${attr(s.root)}>${label}<input id="${inputId}" type="range" min="${r.min}" max="${r.max}" step="${r.step}" value="${r.value}"${attr(s.range)} />${help}</div>`
  }

  if (s.kind === 'select') {
    const options = choiceList(props)
    const placeholder = has(props.placeholder) ? `<option value="" disabled selected>${esc(props.placeholder)}</option>` : ''
    return `<div${attr(s.root)}>${label}<select id="${inputId}" class="${cls}"${req}${attr(s.field)}>${placeholder}${options.map((o) => `<option>${esc(o)}</option>`).join('')}</select>${help}</div>`
  }

  const placeholder = has(props.placeholder) && !['date', 'time'].includes(s.type) ? ` placeholder="${esc(props.placeholder)}"` : ''
  if (s.kind === 'area') {
    return `<div${attr(s.root)}>${label}<textarea id="${inputId}" class="${cls}"${placeholder}${req}${attr(s.field)}></textarea>${help}</div>`
  }
  const input = `<input id="${inputId}" type="${s.type}" class="${cls}"${placeholder}${req}${s.type === 'password' ? ' autocomplete="current-password"' : ''}${attr(s.field)} />`
  const box = s.reveal
    ? `<div class="pwb-password">${input}<button type="button" class="pwb-reveal" data-pwb-reveal aria-label="Show password" aria-pressed="false"${attr(s.revealButton)}>${EYE_ICONS}</button></div>`
    : input
  return `<div${attr(s.root)}>${label}${box}${help}</div>`
}

// A field on its own, for an HTML page: carries the stylesheet it needs,
// since the editor shows an HTML page without the builder runtime.
export function fieldSnippet(componentType, props = {}, id = 'field') {
  return `<div style="font-family:inherit;font-size:15px;max-width:420px"><style data-pwb-form-css>${FORM_FIELD_CSS}</style>${fieldHtml(componentType, props, id)}</div>`
}

// How big a new field is, so it does not drop into a box it overflows.
export function fieldSize(componentType, props = {}) {
  const kind = fieldKind(componentType, props.inputType)
  const helpRoom = has(props.helpText) ? 22 : 0
  const labelRoom = has(props.label) ? 26 : 0
  const base = {
    box: 44 + labelRoom,
    select: 44 + labelRoom,
    area: 120 + labelRoom,
    check: 28,
    switch: 30,
    choice: labelRoom + radioChoices(props).length * 28 + 4,
    range: 24 + labelRoom,
  }[kind]
  return { w: 320, h: Math.max(28, base + helpRoom) }
}
