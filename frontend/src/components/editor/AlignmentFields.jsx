import { useLanguage } from '../../i18n/useLanguage.js'
import PanelGroup from './PanelGroup.jsx'
import { SegmentedIconButtons } from './controls.jsx'

const ALIGN_KEYS = ['textAlign', 'alignHorizontal', 'alignVertical', 'distribute']

export default function AlignmentFields({ adapter }) {
  const { t } = useLanguage()
  if (!adapter.hasAny(ALIGN_KEYS)) return null

  const multiCount = adapter.selectedCount || 0
  const canDistribute = multiCount >= 3

  return (
    <PanelGroup
      id="align"
      title={t('Align')}
      defaultOpen
      aside={
        multiCount > 1 ? (
          <span className="ml-1 font-normal normal-case text-[var(--studio-text-faint)]">
            ({t('{count} selected', { count: multiCount })})
          </span>
        ) : null
      }
    >
      {adapter.has('textAlign') && (
        <SegmentedIconButtons
          inline
          allowClear
          label={t('Text')}
          value={adapter.get('textAlign')}
          onChange={(v) => adapter.set('textAlign', v)}
          options={[
            ['left', t('Align text left'), 'alignLeft'],
            ['center', t('Align text center'), 'alignCenter'],
            ['right', t('Align text right'), 'alignRight'],
          ]}
        />
      )}
      {adapter.has('alignHorizontal') && (
        <SegmentedIconButtons
          inline
          allowClear={adapter.mode === 'html'}
          label={t('Element')}
          value={adapter.get('alignHorizontal')}
          onChange={(v) => adapter.set('alignHorizontal', v)}
          options={[
            ['left', t('Align left'), 'alignBoxLeft'],
            ['center', t('Align center'), 'alignBoxCenter'],
            ['right', t('Align right'), 'alignBoxRight'],
          ]}
        />
      )}
      {adapter.has('alignVertical') && (
        <SegmentedIconButtons
          inline
          label={t('Vertical')}
          value={adapter.get('alignVertical')}
          onChange={(v) => adapter.set('alignVertical', v)}
          options={[
            ['top', t('Align top'), 'alignBoxTop'],
            ['middle', t('Align middle'), 'alignBoxMiddle'],
            ['bottom', t('Align bottom'), 'alignBoxBottom'],
          ]}
        />
      )}
      {adapter.has('distribute') && (
        <SegmentedIconButtons
          inline
          label={t('Distribute')}
          value=""
          onChange={(v) => adapter.set('distribute', v)}
          options={[
            ['x', t('Distribute horizontally'), 'distributeH', !canDistribute],
            ['y', t('Distribute vertically'), 'distributeV', !canDistribute],
          ]}
        />
      )}
      {adapter.mode === 'html' ? (
        <p className="text-[11px] leading-relaxed text-[var(--studio-text-faint)]">
          {t('Element slides the whole box inside its row — e.g. push the navbar links to the left or center.')}
        </p>
      ) : adapter.extendedMode ? (
        <p className="text-[11px] leading-snug text-[var(--studio-text-faint)]">
          {multiCount > 1
            ? t('Aligns the selected items to each other.')
            : t('Aligns this item to the artboard. Shift-click on the canvas to select more.')}
        </p>
      ) : null}
    </PanelGroup>
  )
}
