import { useLanguage } from '../../i18n/useLanguage.js'
import PanelGroup from './PanelGroup.jsx'
import {
  LabeledColor,
  LabeledPx,
  LabeledSelect,
  LabeledText,
} from './controls.jsx'

const BORDER_KEYS = ['borderRadius', 'borderWidth', 'borderStyle', 'borderColor', 'border']

export default function BorderFields({ adapter }) {
  const { t } = useLanguage()
  if (!adapter.hasAny(BORDER_KEYS)) return null

  const hasWidth = adapter.has('borderWidth')
  const hasStyle = adapter.has('borderStyle')

  return (
    <PanelGroup id="border" title={t('Border')}>
      {adapter.has('border') && (
        <LabeledText
          label={t('Border')}
          value={adapter.get('border')}
          placeholder="e.g. 1px solid #cbd5e1"
          onChange={(v) => adapter.set('border', v)}
        />
      )}
      {adapter.has('borderRadius') && (
        <LabeledPx
          label={t('Corner radius')}
          value={adapter.get('borderRadius')}
          subject={adapter.subject}
          onChange={(v) => adapter.set('borderRadius', v)}
        />
      )}
      {(hasWidth || hasStyle) && (
        <div className={hasWidth && hasStyle ? 'grid grid-cols-2 gap-2' : undefined}>
          {hasWidth && (
            <LabeledPx
              label={t('Border width')}
              value={adapter.get('borderWidth')}
              subject={adapter.subject}
              onChange={(v) => adapter.set('borderWidth', v)}
            />
          )}
          {hasStyle && (
            <LabeledSelect
              label={t('Border style')}
              value={adapter.get('borderStyle')}
              onChange={(v) => adapter.set('borderStyle', v)}
              options={adapter.borderStyleOptions(t)}
            />
          )}
        </div>
      )}
      {adapter.has('borderColor') && (
        <LabeledColor
          label={t('Border color')}
          value={adapter.get('borderColor')}
          accepts={adapter.colorAccepts}
          subject={adapter.subject}
          onChange={(v) => adapter.set('borderColor', v)}
        />
      )}
    </PanelGroup>
  )
}
