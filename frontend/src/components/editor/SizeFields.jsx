import { useLanguage } from '../../i18n/useLanguage.js'
import PanelGroup from './PanelGroup.jsx'
import { LabeledNumber, LabeledPx } from './controls.jsx'

const SIZE_KEYS = ['x', 'y', 'width', 'height', 'maxWidth', 'minHeight']

export default function SizeFields({ adapter, scopeLabel, children }) {
  const { t } = useLanguage()
  if (!adapter.hasAny(SIZE_KEYS) && !children) return null

  const hasX = adapter.has('x')
  const hasY = adapter.has('y')
  const hasWidth = adapter.has('width')
  const hasHeight = adapter.has('height')
  const hasMaxWidth = adapter.has('maxWidth')
  const hasMinHeight = adapter.has('minHeight')

  return (
    <PanelGroup
      id="size"
      title={t('Size')}
      defaultOpen
      aside={
        scopeLabel ? (
          <span className="ml-1 font-normal normal-case text-[var(--studio-text-faint)]">
            ({scopeLabel})
          </span>
        ) : null
      }
    >
      {(hasX || hasY) && (
        <div className={hasX && hasY ? 'grid grid-cols-2 gap-2' : undefined}>
          {hasX && (
            <LabeledNumber
              label="X"
              unit="px"
              subject={adapter.subject}
              value={adapter.get('x')}
              onChange={(v) => adapter.set('x', v)}
            />
          )}
          {hasY && (
            <LabeledNumber
              label="Y"
              unit="px"
              subject={adapter.subject}
              value={adapter.get('y')}
              onChange={(v) => adapter.set('y', v)}
            />
          )}
        </div>
      )}
      {(hasWidth || hasHeight) && (
        <div className={hasWidth && hasHeight ? 'grid grid-cols-2 gap-2' : undefined}>
          {hasWidth && (
            <LabeledNumber
              label={t('Width')}
              unit="px"
              allowEmpty={adapter.allowEmptySize}
              placeholder={adapter.allowEmptySize ? 'auto' : undefined}
              subject={adapter.subject}
              value={adapter.get('width')}
              onChange={(v) => adapter.set('width', v)}
            />
          )}
          {hasHeight && (
            <LabeledNumber
              label={t('Height')}
              unit="px"
              allowEmpty={adapter.allowEmptySize}
              placeholder={adapter.allowEmptySize ? 'auto' : undefined}
              subject={adapter.subject}
              value={adapter.get('height')}
              onChange={(v) => adapter.set('height', v)}
            />
          )}
        </div>
      )}
      {(hasMaxWidth || hasMinHeight) && (
        <div className={hasMaxWidth && hasMinHeight ? 'grid grid-cols-2 gap-2' : undefined}>
          {hasMaxWidth && (
            adapter.mode === 'canvas' && !adapter.isFlow ? (
              <LabeledPx
                label={t('Max width')}
                value={adapter.get('maxWidth')}
                subject={adapter.subject}
                onChange={(v) => adapter.set('maxWidth', v)}
              />
            ) : (
              <LabeledNumber
                label={t('Max width')}
                unit="px"
                allowEmpty={adapter.allowEmptySize}
                placeholder={adapter.allowEmptySize ? 'none' : undefined}
                subject={adapter.subject}
                value={adapter.get('maxWidth')}
                onChange={(v) => adapter.set('maxWidth', v)}
              />
            )
          )}
          {hasMinHeight && (
            <LabeledNumber
              label={t('Min height')}
              unit="px"
              subject={adapter.subject}
              value={adapter.get('minHeight')}
              onChange={(v) => adapter.set('minHeight', v)}
            />
          )}
        </div>
      )}
      {adapter.mode === 'html' && (
        <p className="text-[11px] leading-snug text-[var(--studio-text-faint)]">
          {t('0 sets auto size (or no max width); clear to inherit.')}
        </p>
      )}
      {children}
    </PanelGroup>
  )
}
