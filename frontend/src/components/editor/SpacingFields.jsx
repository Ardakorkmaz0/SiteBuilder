import { useLanguage } from '../../i18n/useLanguage.js'
import PanelGroup from './PanelGroup.jsx'
import { LabeledPx } from './controls.jsx'

const SPACING_KEYS = ['padding', 'paddingSides', 'margin', 'marginVertical']

export default function SpacingFields({ adapter }) {
  const { t } = useLanguage()
  if (!adapter.hasAny(SPACING_KEYS)) return null

  return (
    <PanelGroup id="spacing" title={t('Spacing')} defaultOpen>
      {adapter.has('padding') && (
        <LabeledPx
          label={t('Padding')}
          value={adapter.get('padding')}
          subject={adapter.subject}
          onChange={(v) => adapter.set('padding', v)}
        />
      )}
      {adapter.has('paddingSides') && (
        <div className="space-y-1.5">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--studio-text-faint)]">
            {t('Padding per side')}
          </span>
          <div className="grid grid-cols-2 gap-2">
            <LabeledPx
              label={t('Top')}
              value={adapter.get('paddingTop')}
              subject={adapter.subject}
              onChange={(v) => adapter.set('paddingTop', v)}
            />
            <LabeledPx
              label={t('Right')}
              value={adapter.get('paddingRight')}
              subject={adapter.subject}
              onChange={(v) => adapter.set('paddingRight', v)}
            />
            <LabeledPx
              label={t('Bottom')}
              value={adapter.get('paddingBottom')}
              subject={adapter.subject}
              onChange={(v) => adapter.set('paddingBottom', v)}
            />
            <LabeledPx
              label={t('Left')}
              value={adapter.get('paddingLeft')}
              subject={adapter.subject}
              onChange={(v) => adapter.set('paddingLeft', v)}
            />
          </div>
        </div>
      )}
      {adapter.has('margin') && (
        <LabeledPx
          label={t('Margin')}
          value={adapter.get('margin')}
          subject={adapter.subject}
          onChange={(v) => adapter.set('margin', v)}
        />
      )}
      {adapter.has('marginVertical') && (
        <div className="grid grid-cols-2 gap-2">
          <LabeledPx
            label={t('Margin top')}
            value={adapter.get('marginTop')}
            subject={adapter.subject}
            onChange={(v) => adapter.set('marginTop', v)}
          />
          <LabeledPx
            label={t('Margin bottom')}
            value={adapter.get('marginBottom')}
            subject={adapter.subject}
            onChange={(v) => adapter.set('marginBottom', v)}
          />
        </div>
      )}
    </PanelGroup>
  )
}
