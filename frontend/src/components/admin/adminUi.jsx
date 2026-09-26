// Shared pieces of the admin console. Everything here draws from the app
// system (DESIGN.md): neutral surfaces, ink for "where you are", the accent only
// on the primary action. Numbers come from the server as they are; nothing is
// rounded into a nicer story.
import { useLanguage } from '../../i18n/useLanguage.js'
import { formatDate, formatNumber, formatRelative, localeFor } from './adminData.js'

export function SectionHeading({ title, description, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold text-[var(--studio-text)] sm:text-2xl">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm text-[var(--studio-text-muted)]">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

const CHIP_TONES = {
  neutral: 'dashboard-status',
  success: 'dashboard-status dashboard-status-live',
  danger: 'studio-status-danger rounded-full border px-2 py-0.5 text-[11px] font-semibold',
  warning: 'studio-status-warning rounded-full border px-2 py-0.5 text-[11px] font-semibold',
  info: 'studio-status-info rounded-full border px-2 py-0.5 text-[11px] font-semibold',
}

export function Chip({ tone = 'neutral', children }) {
  return <span className={`${CHIP_TONES[tone] || CHIP_TONES.neutral} inline-flex shrink-0 items-center whitespace-nowrap`}>{children}</span>
}

export function AccountChips({ account }) {
  const { t } = useLanguage()
  return (
    <>
      {account.is_superuser && <Chip tone="info">{t('Superuser')}</Chip>}
      {!account.is_superuser && account.is_staff && <Chip tone="info">{t('Admin')}</Chip>}
      {account.is_guest && <Chip>{t('Guest')}</Chip>}
      {!account.is_active && <Chip tone="danger">{t('Suspended')}</Chip>}
    </>
  )
}

export function SiteChips({ site }) {
  const { t } = useLanguage()
  return (
    <>
      {site.moderation_blocked
        ? <Chip tone="danger">{t('Taken down')}</Chip>
        : site.public ? <Chip tone="success">{t('Public')}</Chip> : <Chip>{t('Draft')}</Chip>}
      {site.pinned && <Chip tone="info">{t('Pinned')}</Chip>}
      {site.kind === 'html' && <Chip>HTML</Chip>}
      {site.open_reports > 0 && <Chip tone="warning">{t('{count} open reports', { count: site.open_reports })}</Chip>}
    </>
  )
}

export function Avatar({ url, name, size = 36 }) {
  const letter = (name || '?').trim().charAt(0).toUpperCase()
  if (url) return <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full bg-[var(--studio-control)] font-semibold text-[var(--studio-text-muted)]"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {letter}
    </span>
  )
}

// Plain figures on a rule, the same style the home page uses.
export function Figures({ items, label }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4" aria-label={label}>
      {items.map(({ label: itemLabel, value, note }) => (
        <div key={itemLabel} className="dashboard-figure">
          <dt>
            {itemLabel}
            {note && <span className="block text-[11px] font-normal text-[var(--studio-text-faint)]">{note}</span>}
          </dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Loading() {
  const { t } = useLanguage()
  return <p role="status" className="py-10 text-sm text-[var(--studio-text-muted)]">{t('Loading…')}</p>
}

export function ErrorBox({ message, onRetry }) {
  const { t } = useLanguage()
  return (
    <div role="alert" className="studio-status-danger flex flex-wrap items-center justify-between gap-3 rounded-[var(--studio-radius-lg)] border px-4 py-3 text-sm">
      <span>{message}</span>
      {onRetry && <button type="button" onClick={onRetry} className="studio-btn studio-btn-secondary">{t('Try again')}</button>}
    </div>
  )
}

export function Empty({ title, children }) {
  return (
    <div className="dashboard-section-card border-dashed px-6 py-12 text-center">
      <p className="font-medium text-[var(--studio-text)]">{title}</p>
      {children && <div className="mt-1 text-sm text-[var(--studio-text-muted)]">{children}</div>}
    </div>
  )
}

export function FilterChips({ label, options, value, onChange }) {
  const { t } = useLanguage()
  return (
    <div role="group" aria-label={label} className="flex max-w-full gap-1.5 overflow-x-auto">
      {options.map(([id, text]) => (
        <button
          key={id || 'all'}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`shrink-0 whitespace-nowrap rounded-[var(--studio-radius)] border px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === id
              ? 'border-[var(--studio-text)] bg-[var(--studio-text)] text-[var(--studio-panel-raised)]'
              : 'border-[var(--studio-border)] bg-[var(--studio-panel-raised)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
          }`}
        >
          {t(text)}
        </button>
      ))}
    </div>
  )
}

export function SearchField({ label, value, onChange, placeholder }) {
  return (
    <label className="block min-w-0 flex-1 sm:max-w-sm">
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="studio-input w-full px-3 py-2 text-sm"
      />
    </label>
  )
}

export function SortSelect({ label, value, options, onChange }) {
  const { t } = useLanguage()
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--studio-text-muted)]">
      <span className="whitespace-nowrap">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="studio-input px-2 py-2 text-sm">
        {options.map(([id, text]) => <option key={id} value={id}>{t(text)}</option>)}
      </select>
    </label>
  )
}

export function Pager({ page, count, pageSize = 25, onPage }) {
  const { t, language } = useLanguage()
  const pages = Math.max(1, Math.ceil((count || 0) / pageSize))
  if (pages <= 1) {
    return <p className="mt-4 text-xs text-[var(--studio-text-faint)]">{t('{count} results', { count: formatNumber(count, language) })}</p>
  }
  return (
    <nav aria-label={t('Pages')} className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-[var(--studio-text-muted)]">
        {t('{count} results · page {page} of {pages}', { count: formatNumber(count, language), page, pages })}
      </span>
      <span className="flex gap-2">
        <button type="button" className="studio-btn studio-btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>{t('Previous')}</button>
        <button type="button" className="studio-btn studio-btn-secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>{t('Next')}</button>
      </span>
    </nav>
  )
}

// A chart is an answer, so its title is the question. The bars are neutral;
// the numbers are also in a table for anyone not looking at the bars.
export function DailyChart({ question, series, emptyNote }) {
  const { t, language } = useLanguage()
  const values = (series || []).map((point) => point.count)
  const total = values.reduce((sum, n) => sum + n, 0)
  const peak = Math.max(0, ...values)
  const peakDay = series?.find((point) => point.count === peak && peak > 0)
  const day = (iso) => new Intl.DateTimeFormat(localeFor(language), { day: 'numeric', month: 'short' }).format(new Date(`${iso}T00:00:00`))

  return (
    <figure className="dashboard-section-card m-0 p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold text-[var(--studio-text)]">{question}</span>
        <span className="text-sm text-[var(--studio-text-muted)]">
          {t('Total {count}', { count: formatNumber(total, language) })}
          {peakDay && <> · {t('busiest day {day} ({count})', { day: day(peakDay.date), count: formatNumber(peak, language) })}</>}
        </span>
      </figcaption>
      {total === 0 ? (
        <p className="mt-4 text-sm text-[var(--studio-text-muted)]">{emptyNote || t('Nothing recorded in this range.')}</p>
      ) : (
        <div aria-hidden="true" className="mt-4 flex h-28 items-end gap-[2px]">
          {series.map((point) => (
            <span
              key={point.date}
              title={`${day(point.date)}: ${formatNumber(point.count, language)}`}
              className="min-w-0 flex-1 rounded-t-[2px] bg-[var(--studio-text-muted)]"
              style={{ height: `${peak ? Math.max(point.count ? 4 : 1, (point.count / peak) * 100) : 1}%`, opacity: point.count ? 0.85 : 0.2 }}
            />
          ))}
        </div>
      )}
      {series?.length > 0 && total > 0 && (
        <div aria-hidden="true" className="mt-2 flex justify-between text-[11px] text-[var(--studio-text-faint)]">
          <span>{day(series[0].date)}</span>
          <span>{day(series[series.length - 1].date)}</span>
        </div>
      )}
      <table className="sr-only">
        <caption>{question}</caption>
        <thead><tr><th>{t('Day')}</th><th>{t('Count')}</th></tr></thead>
        <tbody>{(series || []).map((point) => <tr key={point.date}><td>{point.date}</td><td>{point.count}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}

// A ranked list with the share each row takes, drawn as a hairline bar.
export function BarList({ title, rows, emptyNote }) {
  const { language } = useLanguage()
  const peak = Math.max(0, ...rows.map((row) => row.value))
  return (
    <section className="dashboard-section-card p-5">
      <h3 className="font-semibold text-[var(--studio-text)]">{title}</h3>
      {rows.length === 0 || peak === 0 ? (
        <p className="mt-3 text-sm text-[var(--studio-text-muted)]">{emptyNote}</p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          {rows.map((row) => (
            <li key={row.key || row.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-[var(--studio-text)]">{row.label}</span>
                <span className="shrink-0 tabular-nums text-[var(--studio-text-muted)]">{formatNumber(row.value, language)}</span>
              </div>
              <span aria-hidden="true" className="mt-1 block h-1 rounded-full bg-[var(--studio-control)]">
                <span className="block h-full rounded-full bg-[var(--studio-text-muted)]" style={{ width: `${(row.value / peak) * 100}%` }} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export function Facts({ items }) {
  return (
    <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
      {items.filter(Boolean).map(([term, value]) => (
        <div key={term} className="flex min-w-0 flex-wrap justify-between gap-x-3 border-b border-[var(--studio-border)] pb-2">
          <dt className="text-[var(--studio-text-muted)]">{term}</dt>
          <dd className="m-0 min-w-0 text-right font-medium text-[var(--studio-text)] [overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function History({ entries }) {
  const { t, language } = useLanguage()
  if (!entries?.length) return <p className="text-sm text-[var(--studio-text-muted)]">{t('No admin actions recorded yet.')}</p>
  return (
    <ol className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="text-sm">
          <span className="font-medium text-[var(--studio-text)]">{t(entry.label)}</span>
          {entry.detail && <span className="text-[var(--studio-text-muted)]"> · {entry.detail}</span>}
          <span className="block text-xs text-[var(--studio-text-faint)]">
            @{entry.actor.username || '?'} · <time dateTime={entry.at} title={formatDate(entry.at, language, { time: true })}>{formatRelative(entry.at, language)}</time>
          </span>
        </li>
      ))}
    </ol>
  )
}
