import { useLanguage } from '../../i18n/useLanguage.js'
import PanelGroup from './PanelGroup.jsx'
import { LabeledNumber, LabeledSelect } from './controls.jsx'

const PIN_Y_OPTIONS = [
  ['top', 'Top'],
  ['bottom', 'Bottom'],
]

const PIN_X_OPTIONS = [
  ['left', 'Left'],
  ['center', 'Center'],
  ['right', 'Right'],
]

export default function PositionStackFields({ adapter }) {
  const { t } = useLanguage()
  if (!adapter.hasAny(['position', 'zIndex', 'pinPlacement'])) return null

  return (
    <PanelGroup id="position" title={t('Position & stacking')}>
      {adapter.hiddenUnderBar > 0 && (
        <p className="rounded-lg border border-[var(--studio-warning)] bg-[var(--studio-warning-soft)] px-2.5 py-2 text-[11px] leading-snug text-[var(--studio-text)]">
          {t('A pinned bar covers the top {pixels}px of this element when the page opens.', { pixels: Math.round(adapter.hiddenUnderBar) })}
        </p>
      )}
      {adapter.has('position') && (
        <LabeledSelect
          label={t('Position')}
          value={adapter.get('position')}
          onChange={(v) => adapter.set('position', v)}
          options={adapter.positionOptions(t)}
        />
      )}
      {adapter.has('zIndex') && (
        <LabeledNumber
          label={t('Stack order')}
          allowEmpty={adapter.mode === 'html'}
          subject={adapter.subject}
          value={adapter.get('zIndex')}
          onChange={(v) => adapter.set('zIndex', v)}
        />
      )}
      {adapter.has('pinPlacement') && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <LabeledSelect
              label={t('Vertical edge')}
              value={adapter.get('pinY')}
              onChange={(v) => adapter.set('pinY', v)}
              options={PIN_Y_OPTIONS.map(([val, label]) => [val, t(label)])}
            />
            <LabeledSelect
              label={t('Horizontal edge')}
              value={adapter.get('pinX')}
              onChange={(v) => adapter.set('pinX', v)}
              options={PIN_X_OPTIONS.map(([val, label]) => [val, t(label)])}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <LabeledNumber
              label={t('Y offset')}
              unit="px"
              subject={adapter.subject}
              value={adapter.get('pinOffsetY')}
              onChange={(v) => adapter.set('pinOffsetY', v)}
            />
            <LabeledNumber
              label={t('X offset')}
              unit="px"
              subject={adapter.subject}
              value={adapter.get('pinOffsetX')}
              onChange={(v) => adapter.set('pinOffsetX', v)}
            />
          </div>
          {adapter.extendedMode && (
            <p className="text-[11px] leading-snug text-[var(--studio-text-faint)]">
              {t('Sticky keeps the item in the page flow until it reaches the edge. Fixed pins it to the browser viewport.')}
            </p>
          )}
        </>
      )}
    </PanelGroup>
  )
}
