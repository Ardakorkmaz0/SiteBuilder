import { useLanguage } from '../../i18n/useLanguage.js'
import {
  LabeledImage,
  LabeledText,
  LabeledTextarea,
  LinkTargetControl,
} from './controls.jsx'

export default function ContentFields({ adapter }) {
  const { t } = useLanguage()
  if (!adapter.hasAny(['text', 'href', 'src', 'alt'])) return null
  return (
    <>
      {adapter.has('text') && (
        <LabeledTextarea
          label={t('Text')}
          value={adapter.get('text')}
          onChange={(v) => adapter.set('text', v)}
          rows={4}
        />
      )}
      {adapter.has('href') && (
        <LinkTargetControl
          label={t('Link (href)')}
          value={adapter.get('href')}
          onChange={(v) => adapter.set('href', v)}
          pages={adapter.pages}
          sections={adapter.sections}
          subject={adapter.subject}
        />
      )}
      {adapter.has('src') && (
        <LabeledImage
          label={t('Image')}
          value={adapter.get('src')}
          onChange={(v) => adapter.set('src', v)}
        />
      )}
      {adapter.has('alt') && (
        <LabeledText
          label={t('Alt text')}
          value={adapter.get('alt')}
          onChange={(v) => adapter.set('alt', v)}
          placeholder={t('Describe the image')}
        />
      )}
    </>
  )
}
