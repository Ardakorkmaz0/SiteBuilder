import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminSite, listAdminSites, moderateSite, pinSite } from '../../api/admin.js'
import { useAuthStore } from '../../store/authStore.js'
import { apiError } from '../../utils/errors.js'
import { useLanguage } from '../../i18n/useLanguage.js'
import {
  BarList,
  Chip,
  DailyChart,
  Empty,
  ErrorBox,
  Facts,
  Figures,
  FilterChips,
  History,
  Loading,
  Pager,
  SearchField,
  SectionHeading,
  SiteChips,
  SortSelect,
} from './adminUi.jsx'
import { formatDate, formatNumber, formatRelative, useAdminData, useDebounced } from './adminData.js'

const STATUS = [
  ['all', 'All'], ['public', 'Public'], ['drafts', 'Drafts'], ['taken_down', 'Taken down'],
  ['pinned', 'Pinned'], ['reported', 'Reported'], ['domains', 'Custom domain'],
]
const KINDS = [['', 'Any kind'], ['visual', 'Visual editor'], ['html', 'HTML']]
const CATEGORIES = [
  ['', 'Any category'], ['portfolio', 'Portfolio'], ['business', 'Business'], ['blog', 'Blog'],
  ['landing', 'Landing'], ['shop', 'Shop'], ['personal', 'Personal'], ['other', 'Other'],
]
const SORTS = [
  ['updated', 'Recently updated'], ['created', 'Recently created'], ['views', 'Most views'],
  ['visits', 'Most visits in 30 days'], ['favorites', 'Most favorites'], ['title', 'Title'],
]
const SHARE_LABELS = { off: 'Not shared', link: 'Anyone with the link', people: 'Only invited people' }
const DOMAIN_LABELS = { not_connected: 'Not connected', pending: 'Waiting for DNS', connected: 'Connected' }
const DEVICE_LABELS = { desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet' }

export function SiteList({ onOpen }) {
  const { t, language } = useLanguage()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [kind, setKind] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('updated')
  const [page, setPage] = useState(1)
  const q = useDebounced(query.trim())
  const key = JSON.stringify({ q, status, kind, category, sort, page })
  const { data, error, loading, reload } = useAdminData(() => listAdminSites({ q, status, kind, category, sort, page }), key)
  const change = (setter) => (value) => { setter(value); setPage(1) }
  const rows = data?.results || []

  return (
    <>
      <SectionHeading title={t('Sites')} description={t('Every site on the platform, whoever owns it.')} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchField label={t('Search sites')} value={query} onChange={change(setQuery)} placeholder={t('Title, address, owner or domain')} />
        <SortSelect label={t('Kind')} value={kind} options={KINDS} onChange={change(setKind)} />
        <SortSelect label={t('Category')} value={category} options={CATEGORIES} onChange={change(setCategory)} />
        <SortSelect label={t('Sort')} value={sort} options={SORTS} onChange={change(setSort)} />
      </div>
      <div className="mb-5"><FilterChips label={t('Site filter')} options={STATUS} value={status} onChange={change(setStatus)} /></div>

      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : rows.length === 0 ? (
        <Empty title={q ? t('No site matches “{q}”.', { q }) : t('No sites in this filter.')} />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-[var(--studio-text-muted)]">
                <tr className="border-b border-[var(--studio-border)]">
                  <th className="py-2 pr-4 font-medium">{t('Site')}</th>
                  <th className="py-2 pr-4 font-medium">{t('Owner')}</th>
                  <th className="py-2 pr-4 font-medium">{t('Status')}</th>
                  <th className="py-2 pr-4 text-right font-medium">{t('Views')}</th>
                  <th className="py-2 pr-4 text-right font-medium">{t('Visits, 30 days')}</th>
                  <th className="py-2 pr-4 text-right font-medium">{t('Favorites')}</th>
                  <th className="py-2 font-medium">{t('Updated')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((site) => (
                  <tr key={site.id} className="border-b border-[var(--studio-border)] align-middle">
                    <td className="max-w-[18rem] py-2 pr-4">
                      <button type="button" onClick={() => onOpen(site.id)} className="block max-w-full truncate text-left font-medium text-[var(--studio-text)] hover:underline">{site.title}</button>
                      <span className="block truncate text-xs text-[var(--studio-text-muted)]">/site/{site.slug}{site.custom_domain ? ` · ${site.custom_domain}` : ''}</span>
                    </td>
                    <td className="py-2 pr-4 text-[var(--studio-text-muted)]">@{site.owner.username}</td>
                    <td className="py-2 pr-4"><span className="flex flex-wrap gap-1"><SiteChips site={site} /></span></td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(site.view_count, language)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(site.visits_30d, language)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(site.favorites, language)}</td>
                    <td className="py-2 whitespace-nowrap text-[var(--studio-text-muted)]">{formatRelative(site.updated_at, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
            {rows.map((site) => (
              <li key={site.id}>
                <button type="button" onClick={() => onOpen(site.id)} className="dashboard-section-card block w-full p-3 text-left">
                  <span className="block truncate font-medium text-[var(--studio-text)]">{site.title}</span>
                  <span className="block truncate text-xs text-[var(--studio-text-muted)]">@{site.owner.username} · {t('{count} views', { count: formatNumber(site.view_count, language) })}</span>
                  <span className="mt-1 flex flex-wrap gap-1"><SiteChips site={site} /></span>
                </button>
              </li>
            ))}
          </ul>
          <Pager page={page} count={data.count} onPage={setPage} />
        </>
      )}
    </>
  )
}

export function SiteDetail({ id, onBack, onOpenAccount, onDeleted }) {
  const { t, language } = useLanguage()
  const isSuperuser = useAuthStore((s) => s.user?.is_superuser)
  const { data: site, error, loading, reload } = useAdminData(() => getAdminSite(id), id)
  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')

  async function act(name, confirmText, action) {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(name)
    setActionError('')
    try {
      const result = await action()
      if (result?.deleted) onDeleted()
      else reload()
    } catch (e) {
      setActionError(apiError(e))
    } finally {
      setBusy('')
    }
  }

  const back = <button type="button" onClick={onBack} className="mb-4 text-sm font-medium text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]">&larr; {t('All sites')}</button>
  if (loading) return <>{back}<Loading /></>
  if (error) return <>{back}<ErrorBox message={error} onRetry={reload} /></>

  const n = (value) => formatNumber(value, language)
  const counts = site.counts
  const address = `/site/${site.slug}`

  return (
    <>
      {back}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-[var(--studio-text)] [overflow-wrap:anywhere]">{site.title}</h2>
          <p className="mt-1 text-sm text-[var(--studio-text-muted)]">
            {address}
            {' · '}
            <button type="button" onClick={() => onOpenAccount(site.owner.id)} className="font-medium text-[var(--studio-text)] hover:underline">@{site.owner.username}</button>
            {!site.owner.is_active && <> · <Chip tone="danger">{t('Owner suspended')}</Chip></>}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5"><SiteChips site={site} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(site.public || site.published) && <Link to={address} className="studio-btn studio-btn-secondary">{t('Open live site')}</Link>}
          {site.moderation_blocked ? (
            <button type="button" disabled={busy === 'reinstate'} onClick={() => act('reinstate', '', () => moderateSite(site.id, 'reinstate'))} className="studio-btn studio-btn-secondary">
              {t('Lift takedown')}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy === 'unpublish'}
              onClick={() => act('unpublish', t('Take “{title}” down? It leaves Explore and its address, and the owner cannot publish it again until you lift this.', { title: site.title }), () => moderateSite(site.id, 'unpublish'))}
              className="studio-btn border-[color-mix(in_srgb,var(--studio-warning)_50%,var(--studio-border))] text-[var(--studio-warning)] hover:bg-[var(--studio-warning-soft)]"
            >
              {t('Take down')}
            </button>
          )}
          {isSuperuser && site.public && (
            <button type="button" disabled={busy === 'pin'} onClick={() => act('pin', '', () => pinSite(site.id, !site.pinned))} className="studio-btn studio-btn-secondary">
              {site.pinned ? t('Unpin from the home page') : t('Pin to the home page')}
            </button>
          )}
          <button
            type="button"
            disabled={busy === 'delete'}
            onClick={() => act('delete', t('Delete “{title}” for good? Its pages, versions, form submissions and comments go with it. This cannot be undone.', { title: site.title }), () => moderateSite(site.id, 'delete'))}
            className="studio-btn border-[color-mix(in_srgb,var(--studio-danger)_45%,var(--studio-border))] text-[var(--studio-danger)] hover:bg-[var(--studio-danger-soft)]"
          >
            {t('Delete')}
          </button>
        </div>
      </div>

      {actionError && <div className="mb-4"><ErrorBox message={actionError} /></div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className="space-y-6">
          <DailyChart question={t('How many visits did this site get each day?')} series={site.traffic.series} emptyNote={t('No visits in the last 30 days.')} />
          <section className="dashboard-section-card p-5">
            <h3 className="mb-4 font-semibold text-[var(--studio-text)]">{t('Numbers')}</h3>
            <Figures
              label={t('Numbers')}
              items={[
                { label: t('Views, all time'), value: n(counts.view_count) },
                { label: t('Visits, 30 days'), value: n(counts.visits_30d) },
                { label: t('Favorites'), value: n(counts.favorites) },
                { label: t('Pages'), value: n(counts.pages), note: t('{count} published', { count: n(counts.published_pages) }) },
                { label: t('Saved versions'), value: n(counts.versions) },
                { label: t('Form submissions'), value: n(counts.form_submissions), note: t('{count} unread', { count: n(counts.form_submissions_unread) }) },
                { label: t('Review comments'), value: n(counts.review_comments), note: t('{count} open', { count: n(counts.review_comments_open) }) },
              ]}
            />
          </section>
          <div className="grid gap-4 sm:grid-cols-2">
            <BarList
              title={t('Where do visitors come from?')}
              emptyNote={t('No visits in the last 30 days.')}
              rows={site.traffic.referrers.map((row) => ({ key: row.referrer || 'direct', label: row.referrer || t('Direct or unknown'), value: row.count }))}
            />
            <BarList
              title={t('Which pages do they open?')}
              emptyNote={t('No visits in the last 30 days.')}
              rows={site.traffic.paths.map((row) => ({ key: row.path, label: row.path, value: row.count }))}
            />
          </div>
          <BarList
            title={t('Which devices do visitors use?')}
            emptyNote={t('No visits in the last 30 days.')}
            rows={Object.entries(site.traffic.devices).map(([key, value]) => ({ key, label: t(DEVICE_LABELS[key]), value }))}
          />
        </div>

        <div className="space-y-6">
          <section className="dashboard-section-card p-5">
            <h3 className="mb-4 font-semibold text-[var(--studio-text)]">{t('Details')}</h3>
            <Facts items={[
              [t('Editor'), site.kind === 'html' ? 'HTML' : t('Visual editor')],
              [t('Category'), t(CATEGORIES.find(([key]) => key === site.category)?.[1] || site.category)],
              [t('Sharing'), t(SHARE_LABELS[site.share_mode] || site.share_mode)],
              site.custom_domain && [t('Custom domain'), `${site.custom_domain} (${t(DOMAIN_LABELS[site.domain_status] || site.domain_status)})`],
              [t('Created'), formatDate(site.created_at, language, { time: true })],
              [t('Updated'), formatDate(site.updated_at, language, { time: true })],
              [t('Last published'), site.last_published_at ? formatDate(site.last_published_at, language, { time: true }) : t('Never')],
              site.moderated_at && [t('Taken down on'), formatDate(site.moderated_at, language, { time: true })],
              site.pinned_at && [t('Pinned on'), formatDate(site.pinned_at, language, { time: true })],
              site.tags?.length > 0 && [t('Tags'), site.tags.join(', ')],
            ]} />
          </section>
          <section className="dashboard-section-card p-5">
            <h3 className="mb-3 font-semibold text-[var(--studio-text)]">{t('Reports')}</h3>
            {site.reports.length === 0 ? <p className="text-sm text-[var(--studio-text-muted)]">{t('Nobody has reported this site.')}</p> : (
              <ul className="space-y-3">
                {site.reports.map((report) => (
                  <li key={report.id} className="text-sm">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Chip tone={report.status === 'open' ? 'warning' : 'neutral'}>{t(report.status)}</Chip>
                      <span className="font-medium text-[var(--studio-text)]">{t(report.reason_label || report.reason)}</span>
                    </span>
                    {report.detail && <span className="mt-1 block text-[var(--studio-text-muted)]">“{report.detail}”</span>}
                    <span className="block text-xs text-[var(--studio-text-faint)]">@{report.reporter || '?'} · {formatRelative(report.created_at, language)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="dashboard-section-card p-5">
            <h3 className="mb-3 font-semibold text-[var(--studio-text)]">{t('Admin history')}</h3>
            <History entries={site.history} />
          </section>
        </div>
      </div>
    </>
  )
}
