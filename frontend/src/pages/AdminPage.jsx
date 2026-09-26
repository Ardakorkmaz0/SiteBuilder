import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listAdminUsers,
  listReports,
  resolveReport,
  suspendUser,
  moderateSite,
  getAdminStats,
  listComponentReports,
  resolveComponentReport,
  moderateComponent,
} from '../api/admin.js'
import { sharedBlockHtml } from '../utils/componentExport.js'
import { STATIC_HTML_SANDBOX } from '../utils/htmlRuntime.js'
import { apiError } from '../utils/errors.js'
import { useGoBack } from '../utils/useGoBack.js'
import { useScrollRestore } from '../utils/useScrollRestore.js'
import { useAuthStore } from '../store/authStore.js'
import { FlagIcon, EyeIcon, StarIcon, CheckIcon, CogIcon, GlobeIcon, FileIcon } from '../components/icons.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import { useLanguage } from '../i18n/useLanguage.js'

function Avatar({ url, name, size = 36 }) {
  const letter = (name || '?').trim().charAt(0).toUpperCase()
  if (url) {
    return <img src={url} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <span
      className="grid place-items-center rounded-full bg-[var(--studio-accent-soft)] font-semibold text-[var(--studio-accent-text)]"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {letter}
    </span>
  )
}

// DRF may return a paginated envelope ({count, results, next}) or, if pagination
// is ever turned off, a bare array — tolerate both.
function readPage(d) {
  if (Array.isArray(d)) return { rows: d, count: d.length, hasMore: false }
  return { rows: d.results || [], count: d.count ?? (d.results || []).length, hasMore: !!d.next }
}

// ---------------------------------------------------------------------------
// Platform stats header (totals + top sites)
// ---------------------------------------------------------------------------
function StatsHeader() {
  const { t } = useLanguage()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let alive = true
    getAdminStats().then((d) => alive && setStats(d)).catch(() => {})
    return () => { alive = false }
  }, [])

  if (!stats) return null
  const cards = [
    ['Users', stats.users, null, '#4f46e5'],
    ['Sites', stats.sites, <FileIcon key="f" size={16} />, '#6366f1'],
    ['Published', stats.published, <GlobeIcon key="g" size={16} />, '#15803d'],
    ['Total views', stats.total_views, <EyeIcon key="e" size={16} />, '#0ea5e9'],
    ['Favorites', stats.total_favorites, <StarIcon key="s" size={16} filled />, '#f59e0b'],
  ]

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(([label, value, icon, color]) => (
          <div key={label} className="ms-card flex items-center gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `${color}1a`, color }}>
              {icon || <FileIcon size={16} />}
            </span>
            <div className="min-w-0">
              <div className="text-lg font-bold leading-tight text-[var(--studio-text)]">{(value || 0).toLocaleString()}</div>
              <div className="truncate text-xs text-[var(--studio-text-muted)]">{t(label)}</div>
            </div>
          </div>
        ))}
      </div>

      {stats.top_sites?.length > 0 && (
        <div className="ms-card mt-3 p-4">
          <div className="mb-2 text-sm font-semibold text-[var(--studio-text-muted)]">{t('Top sites by views')}</div>
          <div className="space-y-1.5">
            {stats.top_sites.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 text-sm">
                <span className="w-4 shrink-0 text-right text-xs font-bold text-[var(--studio-text-faint)]">{i + 1}</span>
                <Link to={`/site/${s.slug}`} className="min-w-0 flex-1 truncate font-medium text-[var(--studio-text)] hover:text-[var(--studio-accent-text)] hover:underline">{s.title}</Link>
                <span className="shrink-0 text-xs text-[var(--studio-text-faint)]">@{s.owner}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--studio-text-faint)]"><EyeIcon size={12} /> {s.view_count.toLocaleString()}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--studio-text-faint)]"><StarIcon size={12} /> {s.favorite_count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------
function UsersTab() {
  const { t, language } = useLanguage()
  const [users, setUsers] = useState(null) // null = loading
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(0) // id currently acting on
  const [q, setQ] = useState('') // search: username / email / display name
  // Mirror of `q` readable from an in-flight request's continuation.
  const qRef = useRef(q)
  useEffect(() => { qRef.current = q }, [q])

  // Debounced search — refetch page 1 whenever the query changes (empty query
  // loads immediately on mount). `ignore` drops a stale response if the user
  // keeps typing.
  useEffect(() => {
    let ignore = false
    const handle = setTimeout(() => {
      setUsers(null)
      setError('')
      listAdminUsers(1, q)
        .then((d) => {
          if (ignore) return
          const { rows, count: total, hasMore: more } = readPage(d)
          setUsers(rows)
          setCount(total)
          setHasMore(more)
          setPage(1)
        })
        .catch((e) => !ignore && setError(apiError(e, t('Admin access required.'))))
    }, q ? 300 : 0)
    return () => { ignore = true; clearTimeout(handle) }
  }, [q, t])

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      // The search effect resets the list whenever the query changes; without
      // this guard a page-2 response for the OLD query landed in the NEW list
      // and pushed the counter past the new query's real page 2.
      const requested = q
      const d = await listAdminUsers(page + 1, requested)
      if (requested !== qRef.current) return
      const { rows, hasMore: more } = readPage(d)
      setUsers((prev) => [...(prev || []), ...rows])
      setPage((p) => p + 1)
      setHasMore(more)
    } catch (e) {
      setError(apiError(e))
    } finally {
      setLoadingMore(false)
    }
  }

  async function onSuspend(u) {
    const suspend = u.is_active
    const message = suspend
      ? t('Are you sure you want to suspend @{username}?', { username: u.username })
      : t('Are you sure you want to reinstate @{username}?', { username: u.username })
    if (!window.confirm(message)) return
    setBusy(u.id)
    setError('')
    try {
      await suspendUser(u.id, suspend)
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: !suspend } : x)))
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(0)
    }
  }

  async function onModerate(u, site, action) {
    const msg = action === 'delete'
      ? t('Permanently DELETE "{title}"? This cannot be undone.', { title: site.title })
      : action === 'reinstate'
        ? t('Reinstate "{title}"? The takedown is lifted and the owner can publish it again.', { title: site.title })
        : t('Unpublish "{title}"? It will be removed from Explore and its public URL (the owner keeps the draft).', { title: site.title })
    if (!window.confirm(msg)) return
    setBusy(site.id)
    setError('')
    try {
      await moderateSite(site.id, action)
      setUsers((prev) => prev.map((x) => {
        if (x.id !== u.id) return x
        if (action === 'delete') {
          return { ...x, sites: x.sites.filter((s) => s.id !== site.id), site_count: x.site_count - 1 }
        }
        const patch = action === 'reinstate'
          ? { moderation_blocked: false }
          : { published: false, moderation_blocked: true, open_report_count: 0 }
        return { ...x, sites: x.sites.map((s) => (s.id === site.id ? { ...s, ...patch } : s)) }
      }))
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(0)
    }
  }

  const totalSites = (users || []).reduce((n, u) => n + u.site_count, 0)

  return (
    <>
      <StatsHeader />
      <div className="mb-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('Search users by name, @username, or email…')}
          className="w-full rounded-lg border border-[var(--studio-border-strong)] bg-[var(--studio-panel-raised)] px-3.5 py-2.5 text-sm text-[var(--studio-text)] outline-none focus:border-[var(--studio-accent)] focus:ring-2 focus:ring-[var(--studio-focus-ring)]"
        />
      </div>
      {users === null && !error ? (
        <p className="text-sm text-[var(--studio-text-muted)]">{t('Loading…')}</p>
      ) : (
      <>
      {users && (
        <p className="mb-6 text-sm text-[var(--studio-text-muted)]">
          {t(count === 1 ? '{count} user' : '{count} users', { count })}
          {hasMore ? ` (${t('{count} loaded', { count: users.length })})` : ''} · {t(totalSites === 1 ? '{count} site' : '{count} sites', { count: totalSites })}
          {hasMore ? ` ${t('shown')}` : ''}
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-5">
        {(users || []).map((u) => (
          <div key={u.id} className={`ms-card p-5 ${u.is_active ? '' : 'opacity-70 ring-1 ring-red-200'}`}>
            <div className="flex flex-wrap items-center gap-3">
              <Link to={`/u/${u.id}`} title={t('Open public profile')} className="shrink-0 rounded-full ring-offset-2 hover:ring-2 hover:ring-[color-mix(in_srgb,var(--studio-accent)_35%,transparent)]">
                <Avatar url={u.avatar_url} name={u.display_name} />
              </Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/u/${u.id}`} title={t('Open public profile')} className="font-semibold text-[var(--studio-text)] hover:text-[var(--studio-accent-text)] hover:underline">
                    {u.display_name}
                  </Link>
                  <span className="text-xs text-[var(--studio-text-faint)]">@{u.username}</span>
                  {u.is_superuser ? (
                    <span className="studio-status-danger rounded-full border px-2 py-0.5 text-[11px] font-semibold">{t('Superuser')}</span>
                  ) : u.is_staff ? (
                    <span className="studio-status-success rounded-full border px-2 py-0.5 text-[11px] font-semibold">{t('Staff')}</span>
                  ) : null}
                  {!u.is_active && (
                    <span className="studio-status-danger rounded-full border px-2 py-0.5 text-[11px] font-semibold">{t('Suspended')}</span>
                  )}
                </div>
                <div className="text-xs text-[var(--studio-text-faint)]">
                  {u.email || t('no email')} · {t('joined')} {new Date(u.date_joined).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="rounded-full bg-[var(--studio-control)] px-2.5 py-0.5 text-xs font-semibold text-[var(--studio-text-muted)]">
                  {t(u.site_count === 1 ? '{count} site' : '{count} sites', { count: u.site_count })}
                </span>
                {!u.is_staff && !u.is_superuser && (
                  <button
                    onClick={() => onSuspend(u)}
                    disabled={busy === u.id}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                      u.is_active
                        ? 'border border-[color-mix(in_srgb,var(--studio-danger)_35%,var(--studio-border))] text-[var(--studio-danger)] hover:bg-[var(--studio-danger-soft)]'
                        : 'border border-[color-mix(in_srgb,var(--studio-success)_35%,var(--studio-border))] text-[var(--studio-success)] hover:bg-[var(--studio-success-soft)]'
                    }`}
                  >
                    {u.is_active ? t('Suspend') : t('Reinstate')}
                  </button>
                )}
              </div>
            </div>

            {/* overflow-x-auto, not overflow-hidden: the row of site actions is
                wider than a phone screen, and hiding it put View / Suspend /
                Delete out of reach with no way to get at them. Scrolling keeps
                every control usable without a mobile redesign. */}
            {u.sites.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--studio-border)]">
                <table className="w-full min-w-[26rem] text-sm">
                  <tbody>
                    {u.sites.map((s) => (
                      <tr key={s.id} className="border-b border-[var(--studio-border)] last:border-0">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2 font-medium text-[var(--studio-text)]">
                            {s.title}
                            {s.open_report_count > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--studio-danger-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--studio-danger)]">
                                <FlagIcon size={11} /> {s.open_report_count}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--studio-text-faint)]">/site/{s.slug}</div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {s.moderation_blocked ? (
                            <span className="studio-status-warning rounded-full border px-2 py-0.5 font-semibold">
                              {t('Taken down')}
                            </span>
                          ) : (
                            <span
                              className={`rounded-full px-2 py-0.5 font-semibold ${
                                s.published ? 'bg-[var(--studio-success-soft)] text-[var(--studio-success)]' : 'bg-[var(--studio-control)] text-[var(--studio-text-muted)]'
                              }`}
                            >
                              {s.published ? t('Published') : t('Draft')}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-[var(--studio-text-faint)]">
                          <span className="inline-flex items-center gap-3">
                            <span className="inline-flex items-center gap-1" title={t('Views')}><EyeIcon size={13} /> {(s.view_count || 0).toLocaleString()}</span>
                            <span className="inline-flex items-center gap-1" title={t('Favorites')}><StarIcon size={13} /> {(s.favorite_count || 0).toLocaleString()}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          <div className="flex items-center justify-end gap-2">
                            {s.published && (
                              <Link to={`/site/${s.slug}`} className="font-medium text-[var(--studio-accent-text)] hover:underline">{t('View')}</Link>
                            )}
                            {s.published && !s.moderation_blocked && (
                              <button
                                onClick={() => onModerate(u, s, 'unpublish')}
                                disabled={busy === s.id}
                                className="whitespace-nowrap font-medium text-[var(--studio-warning)] hover:underline disabled:opacity-50"
                              >
                                {t('Unpublish')}
                              </button>
                            )}
                            {s.moderation_blocked && (
                              <button
                                onClick={() => onModerate(u, s, 'reinstate')}
                                disabled={busy === s.id}
                                className="font-medium text-[var(--studio-accent-text)] hover:underline disabled:opacity-50"
                              >
                                {t('Reinstate')}
                              </button>
                            )}
                            <button
                              onClick={() => onModerate(u, s, 'delete')}
                              disabled={busy === s.id}
                              className="font-medium text-[var(--studio-danger)] hover:underline disabled:opacity-50"
                            >
                              {t('Delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {hasMore && (
          <div className="pt-2 text-center">
            <button onClick={loadMore} disabled={loadingMore} className="ms-btn px-6 py-2.5">
              {loadingMore ? t('Loading…') : t('Load more')}
            </button>
          </div>
        )}
        {users && users.length === 0 && (
          <p className="py-10 text-center text-sm text-[var(--studio-text-faint)]">{t('No users match “{query}”.', { query: q })}</p>
        )}
      </div>
      </>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Reports tab
// ---------------------------------------------------------------------------
const REPORT_FILTERS = [['open', 'Open'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed'], ['all', 'All']]

function ReportsTab() {
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

function ComponentReportsTab() {
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

// ---------------------------------------------------------------------------
export default function AdminPage() {
  const { t } = useLanguage()
  const [tab, setTab] = useState('users')
  const isSuperuser = useAuthStore((s) => s.user?.is_superuser)
  const goBack = useGoBack('/')
  useScrollRestore()

  return (
    <div className="studio-theme-surface min-h-screen bg-[var(--studio-shell)] text-[var(--studio-text)]">
      <header className="sticky top-0 z-10 border-b border-[var(--studio-border)] bg-[color-mix(in_srgb,var(--studio-panel-raised)_92%,transparent)] backdrop-blur">
        {/* flex-wrap + a narrower gutter below `sm`: on a phone this row was
            wider than the screen, so the Admin badge and part of the Settings
            link sat outside it — clipped, not scrollable, so unreachable. */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Link to="/" title={t('Sitebuilder home')} className="brand-mark">S</Link>
            <button type="button" onClick={goBack} className="text-sm font-medium text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]">
              &larr; {t('Back')}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
            <LanguageSwitcher />
            {isSuperuser && (
              <Link
                to="/admin/settings"
                title={t('Server settings (Google, reCAPTCHA, email)')}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--studio-accent-text)] hover:bg-[var(--studio-accent-soft)]"
              >
                <CogIcon size={15} /> {t('Settings')}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-[var(--studio-text)]">{t('Moderation')}</h1>

        <div className="mb-8 mt-4 flex gap-2 overflow-x-auto border-b border-[var(--studio-border)]">
          {[['users', 'Users & sites'], ['reports', 'Reports'], ['blocks', 'Blocks']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition ${
                tab === id ? 'border-[var(--studio-text)] text-[var(--studio-text)]' : 'border-transparent text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
              }`}
            >
              {t(label)}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'blocks' && <ComponentReportsTab />}
      </main>
    </div>
  )
}
