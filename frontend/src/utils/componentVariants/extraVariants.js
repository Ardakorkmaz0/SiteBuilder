// Extra component variants per palette type, built in English and Turkish from
// one definition each. Kept separate from the themed widget collections
// (everyday, study, widgets) so the editor Sidebar does not pull BlockLibrary's
// widgets into its initial bundle.
import { extendTranslations } from '../../i18n/store.js'
import { collectTranslations } from '../templateCopy.js'
import { translator } from './kit.js'
import { VARIANT_SIZES } from './sizes.js'
import { ACCORDIONS, ALERTS, CARDS, CONTAINERS, INPUTS, SELECTS } from './boxes.js'
import { DIVIDERS, HEADINGS, IMAGES, LISTS, QUOTES, TEXTS } from './content.js'
import { BADGES, BUTTONS, ICONS, LINK_BUTTONS } from './controls.js'

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

// Snippets without words (an icon, a wave divider) have one build only.
export const buildVariant = (type, definition) => {
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
  Object.entries(DEFINITIONS).map(([type, definitions]) => [type, definitions.map((definition) => buildVariant(type, definition))]),
)

export const EXTRA_VARIANT_TRANSLATIONS = collectTranslations(
  Object.values(DEFINITIONS).map((definitions) => definitions.map((definition) => definition.label)),
)

extendTranslations(EXTRA_VARIANT_TRANSLATIONS)
