// Extra component variants and widgets, built in English and Turkish from one
// definition each. htmlComponentVariants.js imports EXTRA_VARIANTS directly
// from ./extraVariants.js; the block library loads the widget collections below.
import { extendTranslations } from '../../i18n/store.js'
import { collectTranslations } from '../templateCopy.js'
import { EXTRA_VARIANTS, EXTRA_VARIANT_TRANSLATIONS, buildVariant } from './extraVariants.js'
import { EVERYDAY_GROUPS } from './everyday.js'
import { STUDY_GROUPS } from './study.js'
import { WIDGET_GROUPS } from './widgets.js'

// The themed collections follow the general widgets.
const ALL_WIDGET_GROUPS = [...WIDGET_GROUPS, ...STUDY_GROUPS, ...EVERYDAY_GROUPS]

// The palette type a dropped widget carries (`_paletteType` on the canvas).
export const WIDGET_TYPE = 'widget'

export { EXTRA_VARIANTS }

export const WIDGET_CATEGORIES = ALL_WIDGET_GROUPS.map((group) => ({ id: group.id, name: group.name }))

export const WIDGETS = ALL_WIDGET_GROUPS.flatMap((group) => group.widgets.map((widget) => ({ ...buildVariant(WIDGET_TYPE, widget), group: group.id })))

const WIDGET_TRANSLATIONS = collectTranslations(
  ALL_WIDGET_GROUPS.map((group) => [group.name, group.widgets.map((widget) => widget.label)]),
)

export const COMPONENT_VARIANT_TRANSLATIONS = {
  ...EXTRA_VARIANT_TRANSLATIONS,
  ...WIDGET_TRANSLATIONS,
}

extendTranslations(WIDGET_TRANSLATIONS)
