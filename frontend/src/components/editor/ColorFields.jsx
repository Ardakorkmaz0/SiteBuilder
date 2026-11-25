import { useLanguage } from '../../i18n/useLanguage.js'
import PanelGroup from './PanelGroup.jsx'
import {
  LabeledColor,
  LabeledImage,
  LabeledNumber,
  LabeledSelect,
} from './controls.jsx'

export default function ColorFields({ adapter }) {
  const { t } = useLanguage()
  const hasColors = adapter.hasAny(['color', 'background'])
  const hasRichBg = adapter.hasAny(['gradient', 'backgroundImage'])
  if (!hasColors && !hasRichBg) return null

  return (
    <>
      {hasColors && (
        <PanelGroup id="colors" title={t('Colors')} defaultOpen>
          {adapter.has('color') && (
            <LabeledColor
              label={t('Text color')}
              value={adapter.get('color')}
              accepts={adapter.colorAccepts}
              subject={adapter.subject}
              onChange={(v) => adapter.set('color', v)}
            />
          )}
          {adapter.has('background') && (
            <LabeledColor
              label={t('Background')}
              value={adapter.get('background')}
              accepts={adapter.colorAccepts}
              subject={adapter.subject}
              onChange={(v) => adapter.set('background', v)}
            />
          )}
        </PanelGroup>
      )}
      {hasRichBg && (
        <PanelGroup id="background" title={t('Background image & gradient')}>
          {adapter.has('gradient') && (
            <>
              <LabeledSelect
                label={t('Gradient preset')}
                value={adapter.get('gradientPreset')}
                onChange={(v) => adapter.set('gradientPreset', v)}
                options={adapter.gradientPresetOptions(t)}
              />
              <LabeledColor
                label={t('Gradient from')}
                value={adapter.get('gradientFrom')}
                accepts={adapter.gradientAccepts}
                subject={adapter.subject}
                onChange={(v) => adapter.set('gradientFrom', v)}
              />
              <LabeledColor
                label={t('Gradient to')}
                value={adapter.get('gradientTo')}
                accepts={adapter.gradientAccepts}
                subject={adapter.subject}
                onChange={(v) => adapter.set('gradientTo', v)}
              />
              <LabeledNumber
                label={t('Gradient angle')}
                unit="deg"
                allowEmpty
                subject={adapter.subject}
                value={adapter.get('gradientAngle')}
                onChange={(v) => adapter.set('gradientAngle', v)}
              />
            </>
          )}
          {adapter.has('backgroundImage') && (
            <>
              <LabeledImage
                label={t('Background image')}
                value={adapter.get('backgroundImage')}
                onChange={(v) => adapter.set('backgroundImage', v)}
              />
              <LabeledSelect
                label={t('Image fit')}
                value={adapter.get('backgroundSize')}
                onChange={(v) => adapter.set('backgroundSize', v)}
                options={adapter.backgroundSizeOptions(t)}
              />
              <p className="text-[11px] leading-relaxed text-[var(--studio-text-faint)]">
                {t('A gradient and an image share the same slot — setting one replaces the other. Clear both to fall back to the plain colour.')}
              </p>
            </>
          )}
        </PanelGroup>
      )}
    </>
  )
}
