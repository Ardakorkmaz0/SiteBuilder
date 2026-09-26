// The two moderation queues: reported sites and reported community blocks.
// Moved here unchanged from the old admin page; the console hosts them under
// "Moderation".
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listReports,
  resolveReport,
  moderateSite,
  listComponentReports,
  resolveComponentReport,
  moderateComponent,
} from '../../api/admin.js'
import { sharedBlockHtml } from '../../utils/componentExport.js'
import { STATIC_HTML_SANDBOX } from '../../utils/htmlRuntime.js'
import { apiError } from '../../utils/errors.js'
import { CheckIcon } from '../icons.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'
import { SectionHeading } from './adminUi.jsx'

// DRF may return a paginated envelope ({count, results, next}) or, if pagination
// is ever turned off, a bare array — tolerate both.
function readPage(d) {
  if (Array.isArray(d)) return { rows: d, count: d.length, hasMore: false }
  return { rows: d.results || [], count: d.count ?? (d.results || []).length, hasMore: !!d.next }
}

// ---------------------------------------------------------------------------
// Reports tab
// ---------------------------------------------------------------------------
const REPORT_FILTERS = [['open', 'Open'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed'], ['all', 'All']]

export function ReportsTab() {
  const { t, language } = useLanguage()
  const [statusFilter, setStatusFilter] = useState('open')
  // Tag the loaded list with its filter so "loading" is derived (no synchronous
  // setState in the fetch effect).
  const [data, setData] = useState({ status: null, rows: [] })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(0)

  const rows = data.status === statusFilter ? data.rows : []
  const loading = data.status !== statusFilter && !error

  useEffect(() => {
    let alive = true
    listReports(statusFilter)
      .then((d) => alive && setData({ status: statusFilter, rows: readPage(d).rows }))
      .catch((e) => alive && setError(apiError(e, t('Admin access required.'))))
    return () => { alive = false }
  }, [statusFilter, t])

  async function onResolve(report, action) {
    setBusy(report.id)
    setError('')
    try {
      await resolveReport(report.id, action)
      setData((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.id !== report.id) }))
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(0)
    }
  }

  async function onTakedown(report) {
    if (!window.confirm(t('Unpublish "{title}"? This resolves the report.', { title: report.site_title }))) return
    setBusy(report.id)
    setError('')
    try {
      await moderateSite(report.site, 'unpublish')
      setData((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.id !== report.id) }))
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(0)
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2">
        {REPORT_FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => { setError(''); setStatusFilter(id) }}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              statusFilter === id ? 'bg-[var(--studio-text)] text-[var(--studio-panel-raised)]' : 'bg-[var(--studio-panel-raised)] text-[var(--studio-text)] ring-1 ring-[var(--studio-border)] hover:bg-[var(--studio-control-hover)]'
            }`}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--studio-text-muted)]">{t('Loading…')}</p>
      ) : rows.length === 0 ? (
        <div className="ms-card border-dashed py-16 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-[var(--studio-success-soft)] text-[var(--studio-success)]"><CheckIcon size={24} /></div>
          <p className="font-medium text-[var(--studio-text)]">{statusFilter === 'all' ? t('No reports') : t('No {status} reports', { status: t(statusFilter) })}</p>
          <p className="mt-1 text-sm text-[var(--studio-text-muted)]">{t('The moderation queue is clear.')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="ms-card p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="studio-status-danger rounded-full border px-2 py-0.5 text-[11px] font-semibold">
                      {t(r.reason_label || r.reason)}
                    </span>
                    <span className="font-semibold text-[var(--studio-text)]">{r.site_title}</span>
                    <span className="text-xs text-[var(--studio-text-faint)]">{t('by')} @{r.site_owner}</span>
                    {!r.site_published && (
                      <span className="dashboard-status">{t('Not public')}</span>
                    )}
                  </div>
                  {r.detail && <p className="mt-2 text-sm text-[var(--studio-text)]">“{r.detail}”</p>}
                  <div className="mt-1 text-xs text-[var(--studio-text-faint)]">
                    {t('reported by')} @{r.reporter_username} · {new Date(r.created_at).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')}
                    {r.status !== 'open' && <span> · <span className="font-semibold capitalize">{t(r.status)}</span></span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link to={`/site/${r.site_slug}`} className="rounded-lg border border-[var(--studio-border)] px-3 py-1.5 text-xs font-semibold text-[var(--studio-text)] hover:bg-[var(--studio-control-hover)]">
                    {t('View')}
                  </Link>
                  {r.status === 'open' && (
                    <>
                      {r.site_published && (
                        <button
                          onClick={() => onTakedown(r)}
                          disabled={busy === r.id}
                          className="rounded-lg border border-[color-mix(in_srgb,var(--studio-danger)_35%,var(--studio-border))] px-3 py-1.5 text-xs font-semibold text-[var(--studio-danger)] hover:bg-[var(--studio-danger-soft)] disabled:opacity-50"
                        >
                          {t('Unpublish site')}
                        </button>
                      )}
                      <button
                        onClick={() => onResolve(r, 'resolve')}
                        disabled={busy === r.id}
                        className="rounded-[var(--studio-radius)] border border-[color-mix(in_srgb,var(--studio-success)_45%,var(--studio-border))] px-3 py-1.5 text-xs font-semibold text-[var(--studio-success)] hover:bg-[var(--studio-success-soft)] disabled:opacity-50"
                      >
                        {t('Resolve')}
                      </button>
                      <button
                        onClick={() => onResolve(r, 'dismiss')}
                        disabled={busy === r.id}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--studio-text-muted)] hover:bg-[var(--studio-control-hover)] disabled:opacity-50"
                      >
                        {t('Dismiss')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Community blocks tab
// ---------------------------------------------------------------------------

// A flagged block, shown as the block. Judging a shared component from its
// title is guesswork, and the decision here can reach other people's pages —
// so the moderator looks at the artefact, rendered the way the library renders
// it: no scripts, no same-origin.
function FlaggedBlock({ report }) {
  const source = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;font-family:system-ui}</style></head><body>${
    sharedBlockHtml({ html: report.component_html, css: report.component_css })
  }</body></html>`
  return (
    <iframe
      title={report.component_title}
      srcDoc={source}
      sandbox={STATIC_HTML_SANDBOX}
      loading="lazy"
      className="h-40 w-full max-w-xs rounded-lg border border-[var(--studio-border)] bg-[var(--studio-panel-raised)]"
    />
  )
}

export function ComponentReportsTab() {
  const { t, language } = useLanguage()
  const [statusFilter, setStatusFilter] = useState('open')
  const [data, setData] = useState({ status: null, rows: [] })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(0)

  const rows = data.status === statusFilter ? data.rows : []
  const loading = data.status !== statusFilter && !error

  useEffect(() => {
    let alive = true
    listComponentReports(statusFilter)
      .then((d) => alive && setData({ status: statusFilter, rows: readPage(d).rows }))
      .catch((e) => alive && setError(apiError(e, t('Admin access required.'))))
    return () => { alive = false }
  }, [statusFilter, t])

  const drop = (id) => setData((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.id !== id) }))

  async function onResolve(report, action) {
    setBusy(report.id)
    setError('')
    try {
      await resolveComponentReport(report.id, action)
      drop(report.id)
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(0)
    }
  }

  async function onModerate(report, action) {
    // Two different things "take it down" can mean, and the confirmation says
    // which one this is — purge edits pages that belong to other people.
    const message = action === 'purge'
      ? t('Delete “{title}” from the {count} site(s) that took it? This cannot be undone.', {
        title: report.component_title, count: report.component_use_count,
      })
      : t('Remove “{title}” from the library? Copies already taken stay where they are.', {
        title: report.component_title,
      })
    if (!window.confirm(message)) return
    setBusy(report.id)
    setError('')
    try {
      await moderateComponent(report.component, action)
      drop(report.id)
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(0)
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2">
        {REPORT_FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => { setError(''); setStatusFilter(id) }}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              statusFilter === id ? 'bg-[var(--studio-text)] text-[var(--studio-panel-raised)]' : 'bg-[var(--studio-panel-raised)] text-[var(--studio-text)] ring-1 ring-[var(--studio-border)] hover:bg-[var(--studio-control-hover)]'
            }`}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--studio-text-muted)]">{t('Loading…')}</p>
      ) : rows.length === 0 ? (
        <div className="ms-card border-dashed py-16 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-[var(--studio-success-soft)] text-[var(--studio-success)]"><CheckIcon size={24} /></div>
          <p className="font-medium text-[var(--studio-text)]">{t('No flagged blocks')}</p>
          <p className="mt-1 text-sm text-[var(--studio-text-muted)]">{t('The moderation queue is clear.')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="ms-card p-5">
              <div className="flex flex-wrap items-start gap-4">
                <FlaggedBlock report={r} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="studio-status-danger rounded-full border px-2 py-0.5 text-[11px] font-semibold">
                      {t(r.reason_label || r.reason)}
                    </span>
                    <span className="font-semibold text-[var(--studio-text)]">{r.component_title}</span>
                    <span className="text-xs text-[var(--studio-text-faint)]">{t('by')} @{r.component_author}</span>
                    {r.component_status !== 'published' && (
                      <span className="dashboard-status">
                        {t(r.component_status)}
                      </span>
                    )}
                  </div>
                  {r.detail && <p className="mt-2 text-sm text-[var(--studio-text)]">“{r.detail}”</p>}
                  <div className="mt-1 text-xs text-[var(--studio-text-faint)]">
                    {t('reported by')} @{r.reporter_username} · {new Date(r.created_at).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')}
                    {' · '}
                    {/* How far it already travelled — the number that decides
                        whether a purge is proportionate. */}
                    {t('{count} uses', { count: r.component_use_count })}
                  </div>
                </div>
                {r.status === 'open' && (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {r.component_status === 'published' && (
                      <button
                        onClick={() => onModerate(r, 'remove')}
                        disabled={busy === r.id}
                        className="rounded-lg border border-[color-mix(in_srgb,var(--studio-danger)_35%,var(--studio-border))] px-3 py-1.5 text-xs font-semibold text-[var(--studio-danger)] hover:bg-[var(--studio-danger-soft)] disabled:opacity-50"
                      >
                        {t('Unlist block')}
                      </button>
                    )}
                    <button
                      onClick={() => onModerate(r, 'purge')}
                      disabled={busy === r.id}
                      className="rounded-[var(--studio-radius)] border border-[color-mix(in_srgb,var(--studio-danger)_45%,var(--studio-border))] px-3 py-1.5 text-xs font-semibold text-[var(--studio-danger)] hover:bg-[var(--studio-danger-soft)] disabled:opacity-50"
                    >
                      {t('Delete everywhere')}
                    </button>
                    <button
                      onClick={() => onResolve(r, 'dismiss')}
                      disabled={busy === r.id}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--studio-text-muted)] hover:bg-[var(--studio-control-hover)] disabled:opacity-50"
                    >
                      {t('Dismiss')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}


export default function AdminModeration({ queue, onQueue }) {
  const { t } = useLanguage()
  return (
    <>
      <SectionHeading title={t('Moderation')} description={t('Reports people filed about sites and community blocks.')} />
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-[var(--studio-border)]" role="tablist" aria-label={t('Moderation queues')}>
        {[['sites', 'Site reports'], ['blocks', 'Block reports']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={queue === id}
            onClick={() => onQueue(id)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              queue === id ? 'border-[var(--studio-text)] text-[var(--studio-text)]' : 'border-transparent text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
            }`}
          >
            {t(label)}
          </button>
        ))}
      </div>
      {queue === 'blocks' ? <ComponentReportsTab /> : <ReportsTab />}
    </>
  )
}
