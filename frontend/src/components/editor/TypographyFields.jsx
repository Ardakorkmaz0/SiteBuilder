import { useLanguage } from '../../i18n/useLanguage.js'
import PanelGroup from './PanelGroup.jsx'
import {
  LabeledCheckbox,
  LabeledNumber,
  LabeledPx,
  LabeledSelect,
  SegmentedIconButtons,
} from './controls.jsx'

const TYPOGRAPHY_KEYS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textTransform',
  'textAlign',
  'italic',
  'underline',
]

export default function TypographyFields({ adapter }) {
  const { t } = useLanguage()
  if (!adapter.hasAny(TYPOGRAPHY_KEYS)) return null

  const hasSize = adapter.has('fontSize')
  const hasWeight = adapter.has('fontWeight')
  const hasLineHeight = adapter.has('lineHeight')
  const hasLetterSpacing = adapter.has('letterSpacing')
  const hasItalic = adapter.has('italic')
  const hasUnderline = adapter.has('underline')
  const rawLineHeight = hasLineHeight ? adapter.get('lineHeight') : ''
  const lineHeightHasCssUnit = typeof rawLineHeight === 'string' && /[a-z%]/i.test(rawLineHeight)

  return (
    <PanelGroup id="typography" title={t('Typography')} defaultOpen>
      {adapter.has('fontFamily') && (
        <LabeledSelect
          label={t('Font')}
          value={adapter.get('fontFamily')}
          onChange={(v) => adapter.set('fontFamily', v)}
          options={adapter.fontOptions(t)}
        />
      )}
      {(hasSize || hasWeight) && (
        <div className={hasSize && hasWeight ? 'grid grid-cols-2 gap-2' : undefined}>
          {hasSize && (
            <LabeledPx
              label={t('Font size')}
              value={adapter.get('fontSize')}
              subject={adapter.subject}
              onChange={(v) => adapter.set('fontSize', v)}
            />
          )}
          {hasWeight && (
            <LabeledSelect
              label={t('Font weight')}
              value={adapter.get('fontWeight')}
              onChange={(v) => adapter.set('fontWeight', v)}
              options={adapter.weightOptions(t)}
            />
          )}
        </div>
      )}
      {(hasLineHeight || hasLetterSpacing) && (
        <div className={hasLineHeight && hasLetterSpacing ? 'grid grid-cols-2 gap-2' : undefined}>
          {hasLineHeight && (
            lineHeightHasCssUnit ? (
              <LabeledPx
                label={t('Line height')}
                value={rawLineHeight}
                subject={adapter.subject}
                onChange={(v) => adapter.set('lineHeight', v)}
              />
            ) : (
              <LabeledNumber
                label={t('Line height')}
                unit="×"
                step={0.05}
                allowEmpty
                subject={adapter.subject}
                value={rawLineHeight}
                onChange={(v) => adapter.set('lineHeight', v)}
              />
            )
          )}
          {hasLetterSpacing && (
            <LabeledPx
              label={t('Letter spacing')}
              defaultUnit="em"
              value={adapter.get('letterSpacing')}
              subject={adapter.subject}
              onChange={(v) => adapter.set('letterSpacing', v)}
            />
          )}
        </div>
      )}
      {adapter.has('textTransform') && (
        <LabeledSelect
          label={t('Capitalisation')}
          value={adapter.get('textTransform')}
          onChange={(v) => adapter.set('textTransform', v)}
          options={adapter.textTransformOptions(t)}
        />
      )}
      {adapter.has('textAlign') && (
        <SegmentedIconButtons
          label={t('Text align')}
          value={adapter.get('textAlign')}
          allowClear
          onChange={(v) => adapter.set('textAlign', v)}
          options={[
            ['left', t('Align text left'), 'alignLeft'],
            ['center', t('Align text center'), 'alignCenter'],
            ['right', t('Align text right'), 'alignRight'],
          ]}
        />
      )}
      {(hasItalic || hasUnderline) && (
        <div className="grid grid-cols-2 gap-2">
          {hasItalic && (
            <LabeledCheckbox
              label={t('Italic')}
              checked={adapter.get('italic')}
              onChange={(v) => adapter.set('italic', v)}
            />
          )}
          {hasUnderline && (
            <LabeledCheckbox
              label={t('Underline')}
              checked={adapter.get('underline')}
              onChange={(v) => adapter.set('underline', v)}
            />
          )}
        </div>
      )}
    </PanelGroup>
  )
}
