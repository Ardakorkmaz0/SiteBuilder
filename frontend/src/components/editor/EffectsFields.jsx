import { useLanguage } from '../../i18n/useLanguage.js'
import PanelGroup from './PanelGroup.jsx'
import { LabeledRange, LabeledSelect } from './controls.jsx'

const EFFECT_KEYS = ['boxShadow', 'opacity', 'overflow', 'objectFit']

export default function EffectsFields({ adapter }) {
  const { t } = useLanguage()
  if (!adapter.hasAny(EFFECT_KEYS)) return null

  return (
    <PanelGroup id="effects" title={t('Effects')}>
      {adapter.has('boxShadow') && (
        <LabeledSelect
          label={t('Shadow')}
          value={adapter.get('boxShadow')}
          onChange={(v) => adapter.set('boxShadow', v)}
          options={adapter.shadowOptions(t)}
        />
      )}
      {adapter.has('opacity') && (
        <LabeledRange
          label={t('Opacity')}
          value={adapter.get('opacity')}
          onChange={(v) => adapter.set('opacity', v)}
        />
      )}
      {adapter.has('overflow') && (
        <LabeledSelect
          label={t('Overflow')}
          value={adapter.get('overflow')}
          onChange={(v) => adapter.set('overflow', v)}
          options={adapter.overflowOptions(t)}
        />
      )}
      {adapter.has('objectFit') && (
        <LabeledSelect
          label={t('Image fit')}
          value={adapter.get('objectFit')}
          onChange={(v) => adapter.set('objectFit', v)}
          options={adapter.objectFitOptions(t)}
        />
      )}
    </PanelGroup>
  )
}
