// Extra component variants and widgets, built in English and Turkish from one
// definition each. htmlVariants.js appends the variants to each palette type;
// the block library lists the widgets in their own groups.
import { extendTranslations } from '../../i18n/translations.js'
import { collectTranslations } from '../templateCopy.js'
import { translator } from './kit.js'
import { VARIANT_SIZES } from './sizes.js'
import { ACCORDIONS, ALERTS, CARDS, CONTAINERS, INPUTS, SELECTS } from './boxes.js'
import { DIVIDERS, HEADINGS, IMAGES, LISTS, QUOTES, TEXTS } from './content.js'
import { BADGES, BUTTONS, ICONS, LINK_BUTTONS } from './controls.js'
import { WIDGET_GROUPS } from './widgets.js'

const DEFINITIONS = {
  button: BUTTONS,
  linkbutton: LINK_BUTTONS,
  badge: BADGES,
  icon: ICONS,
  heading: HEADINGS,
  text: TEXTS,
  quote: QUOTES,
  list: LISTS,
  image: IMAGES,
  divider: DIVIDERS,
  card: CARDS,
  alert: ALERTS,
  container: CONTAINERS,
  accordion: ACCORDIONS,
  input: INPUTS,
  select: SELECTS,
}

const EN = translator('en')
const TR = translator('tr')

// The palette type a dropped widget carries (`_paletteType` on the canvas).
export const WIDGET_TYPE = 'widget'

// Snippets without words (an icon, a wave divider) have one build only.
const build = (type, definition) => {
  const html = definition.render(EN).trim()
  const htmlTr = definition.render(TR).trim()
  const [w, h] = VARIANT_SIZES[type][definition.id]
  return {
    id: definition.id,
    label: definition.label.en,
    html,
    ...(htmlTr !== html ? { htmlTr } : {}),
    size: { w, h },
  }
}

export const EXTRA_VARIANTS = Object.fromEntries(
  Object.entries(DEFINITIONS).map(([type, definitions]) => [type, definitions.map((definition) => build(type, definition))]),
)

export const WIDGET_CATEGORIES = WIDGET_GROUPS.map((group) => ({ id: group.id, name: group.name }))

export const WIDGETS = WIDGET_GROUPS.flatMap((group) => group.widgets.map((widget) => ({ ...build(WIDGET_TYPE, widget), group: group.id })))

export const COMPONENT_VARIANT_TRANSLATIONS = collectTranslations([
  Object.values(DEFINITIONS).map((definitions) => definitions.map((definition) => definition.label)),
  WIDGET_GROUPS.map((group) => [group.name, group.widgets.map((widget) => widget.label)]),
])

extendTranslations(COMPONENT_VARIANT_TRANSLATIONS)
