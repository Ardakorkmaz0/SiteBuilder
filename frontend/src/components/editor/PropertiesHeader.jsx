import { CornerLeftUpIcon, NodeIcon, XIcon } from '../icons.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'

// The top of the properties panel, the same for a block on a canvas page and
// for an element of an HTML page: what it is (icon, name, screen), the way up
// to its parent, and the X that lets go of the selection.
export default function PropertiesHeader({
  icon,
  title,
  badge,
  detail = null,
  detailTitle,
  actions = null,
  onDeselect,
  parentName = null,
  parentTitle,
  onSelectParent,
  trail = null,
  children = null,
}) {
  const { t } = useLanguage()
  return (
    <div className="border-b border-[var(--studio-border)] px-3 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[color-mix(in_srgb,var(--studio-accent)_18%,var(--studio-border))] bg-[var(--studio-accent-soft)] text-[var(--studio-accent-text)]"
          aria-hidden="true"
        >
          <NodeIcon name={icon} size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-[var(--studio-text)]">{title}</h2>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <span className="inline-flex shrink-0 items-center rounded-full bg-[var(--studio-control)] px-2 py-0.5 text-[10px] font-semibold text-[var(--studio-text-muted)]">
              {badge}
            </span>
            {detail && (
              <span className="min-w-0 truncate font-mono text-[10px] text-[var(--studio-text-faint)]" title={detailTitle}>
                {detail}
              </span>
            )}
          </div>
        </div>
        {actions}
        {onDeselect && (
          <button
            type="button"
            onClick={onDeselect}
            aria-label={t('Deselect (back to site settings)')}
            title={t('Deselect (back to site settings)')}
            className="studio-icon-btn h-9 w-9 shrink-0 border border-[var(--studio-border)] bg-[var(--studio-control)]"
          >
            <XIcon size={16} />
          </button>
        )}
      </div>

      {(onSelectParent || trail) && (
        <div className="mt-3 flex min-w-0 items-center gap-2">
          {onSelectParent && (
            <button
              type="button"
              onClick={onSelectParent}
              title={parentTitle}
              className="studio-btn studio-btn-secondary shrink-0 px-2 py-1 text-[11px] text-[var(--studio-accent-text)]"
            >
              <CornerLeftUpIcon size={13} className="shrink-0" />
              {t('Select parent')}{parentName ? ` ${parentName}` : ''}
            </button>
          )}
          {trail && (
            <span className="min-w-0 truncate text-[10px] text-[var(--studio-text-faint)]" title={trail}>
              {trail}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
