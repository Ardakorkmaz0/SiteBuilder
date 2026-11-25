import { useLanguage } from '../../i18n/useLanguage.js'
import PanelGroup from './PanelGroup.jsx'
import { LabeledNumber, LabeledPx, LabeledSelect } from './controls.jsx'

const FLEX_KEYS = [
  'flexLayout',
  'display',
  'flexDirection',
  'justifyContent',
  'alignItems',
  'flexWrap',
  'gridColumns',
  'gap',
]

export default function FlexLayoutFields({ adapter }) {
  const { t } = useLanguage()
  if (!adapter.hasAny(FLEX_KEYS)) return null

  return (
    <PanelGroup id="flex-layout" title={t('Flex layout')}>
      {adapter.has('display') && (
        <LabeledSelect
          label={t('Display')}
          value={adapter.get('display')}
          onChange={(v) => adapter.set('display', v)}
          options={adapter.displayOptions(t)}
        />
      )}
      {adapter.has('flexDirection') && (
        <LabeledSelect
          label={t('Direction')}
          value={adapter.get('flexDirection')}
          onChange={(v) => adapter.set('flexDirection', v)}
          options={adapter.flexDirectionOptions(t)}
        />
      )}
      {adapter.has('justifyContent') && (
        <LabeledSelect
          label={t('Justify')}
          value={adapter.get('justifyContent')}
          onChange={(v) => adapter.set('justifyContent', v)}
          options={adapter.justifyOptions(t)}
        />
      )}
      {adapter.has('alignItems') && (
        <LabeledSelect
          label={t('Align')}
          value={adapter.get('alignItems')}
          onChange={(v) => adapter.set('alignItems', v)}
          options={adapter.flexAlignOptions(t)}
        />
      )}
      {adapter.has('flexWrap') && (
        <LabeledSelect
          label={t('Wrapping')}
          value={adapter.get('flexWrap')}
          onChange={(v) => adapter.set('flexWrap', v)}
          options={adapter.flexWrapOptions(t)}
        />
      )}
      {adapter.has('gridColumns') && (
        <LabeledNumber
          label={t('Columns')}
          subject={adapter.subject}
          value={adapter.get('gridColumns')}
          onChange={(v) => adapter.set('gridColumns', v)}
        />
      )}
      {adapter.has('gap') && (
        <LabeledPx
          label={t('Gap')}
          value={adapter.get('gap')}
          subject={adapter.subject}
          onChange={(v) => adapter.set('gap', v)}
        />
      )}
      {adapter.mode === 'html' && (
        <p className="text-[11px] leading-relaxed text-[var(--studio-text-faint)]">
          {t('Tip: set Display to “Flex” first if these do not take effect — they arrange the element direct children (e.g. a navbar links).')}
        </p>
      )}
    </PanelGroup>
  )
}
