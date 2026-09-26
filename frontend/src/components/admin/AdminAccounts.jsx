import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAccount, listAccounts, setAccountAdmin, signOutAccount, suspendUser } from '../../api/admin.js'
import { useAuthStore } from '../../store/authStore.js'
import { apiError } from '../../utils/errors.js'
import { useLanguage } from '../../i18n/useLanguage.js'
import {
  AccountChips,
  Avatar,
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
import { formatBytes, formatDate, formatNumber, formatRelative, useAdminData, useDebounced } from './adminData.js'

const STATUS = [
  ['all', 'All'], ['registered', 'Registered'], ['guests', 'Guests'],
  ['admins', 'Admins'], ['active', 'Active'], ['suspended', 'Suspended'],
]
const SORTS = [
  ['joined', 'Newest first'], ['joined_asc', 'Oldest first'], ['last_login', 'Last sign-in'],
  ['sites', 'Most sites'], ['views', 'Most views'], ['name', 'Username'],
]

function lastSignIn(value, language, translate) {
  return value ? formatRelative(value, language) : translate('No record')
}

export function AccountList({ onOpen }) {
  const { t, language } = useLanguage()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('joined')
  const [page, setPage] = useState(1)
  const q = useDebounced(query.trim())
  const key = JSON.stringify({ q, status, sort, page })
  const { data, error, loading, reload } = useAdminData(() => listAccounts({ q, status, sort, page }), key)

  const change = (setter) => (value) => { setter(value); setPage(1) }
  const rows = data?.results || []

  return (
    <>
      <SectionHeading title={t('Accounts')} description={t('Every account, including guests and suspended ones.')} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchField label={t('Search accounts')} value={query} onChange={change(setQuery)} placeholder={t('Name, @username or email')} />
        <SortSelect label={t('Sort')} value={sort} options={SORTS} onChange={change(setSort)} />
      </div>
      <div className="mb-5"><FilterChips label={t('Account filter')} options={STATUS} value={status} onChange={change(setStatus)} /></div>

      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : rows.length === 0 ? (
        <Empty title={q ? t('No account matches “{q}”.', { q }) : t('No accounts in this filter.')} />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-[var(--studio-text-muted)]">
                <tr className="border-b border-[var(--studio-border)]">
                  <th className="py-2 pr-4 font-medium">{t('Account')}</th>
                  <th className="py-2 pr-4 font-medium">{t('Status')}</th>
                  <th className="py-2 pr-4 text-right font-medium">{t('Sites')}</th>
                  <th className="py-2 pr-4 text-right font-medium">{t('Views')}</th>
                  <th className="py-2 pr-4 font-medium">{t('Joined')}</th>
                  <th className="py-2 font-medium">{t('Last sign-in')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((account) => (
                  <tr key={account.id} className="border-b border-[var(--studio-border)] align-middle">
                    <td className="py-2 pr-4">
                      <button type="button" onClick={() => onOpen(account.id)} className="flex min-w-0 items-center gap-3 text-left hover:underline">
                        <Avatar url={account.avatar_url} name={account.display_name} size={32} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-[var(--studio-text)]">{account.display_name}</span>
                          <span className="block truncate text-xs text-[var(--studio-text-muted)]">@{account.username}{account.email ? ` · ${account.email}` : ''}</span>
                        </span>
                      </button>
                    </td>
                    <td className="py-2 pr-4"><span className="flex flex-wrap gap-1"><AccountChips account={account} />{account.is_active && !account.is_staff && !account.is_superuser && !account.is_guest && <span className="text-xs text-[var(--studio-text-faint)]">{t('Member')}</span>}</span></td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(account.sites, language)}<span className="block text-xs text-[var(--studio-text-faint)]">{t('{count} public', { count: formatNumber(account.public_sites, language) })}</span></td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(account.views, language)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap text-[var(--studio-text-muted)]">{formatDate(account.date_joined, language)}</td>
                    <td className="py-2 whitespace-nowrap text-[var(--studio-text-muted)]">{lastSignIn(account.last_login, language, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
            {rows.map((account) => (
              <li key={account.id}>
                <button type="button" onClick={() => onOpen(account.id)} className="dashboard-section-card flex w-full items-center gap-3 p-3 text-left">
                  <Avatar url={account.avatar_url} name={account.display_name} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-[var(--studio-text)]">{account.display_name}</span>
                    <span className="block truncate text-xs text-[var(--studio-text-muted)]">@{account.username} · {t('{count} sites', { count: formatNumber(account.sites, language) })}</span>
                    <span className="mt-1 flex flex-wrap gap-1"><AccountChips account={account} /></span>
                  </span>
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

export function AccountDetail({ id, onBack, onOpenSite }) {
  const { t, language } = useLanguage()
  const me = useAuthStore((s) => s.user)
  const { data: account, error, loading, reload, setData } = useAdminData(() => getAccount(id), id)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')

  async function run(name, confirmText, action, apply) {
    if (confirmText && !window.confirm(confirmText)) return false
    setBusy(name)
    setNotice('')
    setActionError('')
    try {
      const result = await action()
      setData((prev) => ({ ...prev, ...apply(result) }))
      reload()
      return true
    } catch (e) {
      setActionError(apiError(e))
      return false
    } finally {
      setBusy('')
    }
  }

  const back = <button type="button" onClick={onBack} className="mb-4 text-sm font-medium text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]">&larr; {t('All accounts')}</button>
  if (loading) return <>{back}<Loading /></>
  if (error) return <>{back}<ErrorBox message={error} onRetry={reload} /></>

  const isSelf = me?.id === account.id
  const isAdmin = account.is_staff || account.is_superuser
  const n = (value) => formatNumber(value, language)
  const counts = account.counts
  const links = Object.entries(account.profile).filter(([field, value]) => value && field !== 'bio')

  return (
    <>
      {back}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar url={account.avatar_url} name={account.display_name} size={56} />
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold text-[var(--studio-text)]">{account.display_name}</h2>
            <p className="truncate text-sm text-[var(--studio-text-muted)]">@{account.username}{account.email ? ` · ${account.email}` : ''}</p>
            <div className="mt-2 flex flex-wrap gap-1.5"><AccountChips account={account} /></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!account.is_guest && <Link to={`/u/${account.id}`} className="studio-btn studio-btn-secondary">{t('Public profile')}</Link>}
          {!isSelf && !isAdmin && (
            <button
              type="button"
              disabled={busy === 'suspend'}
              onClick={() => run(
                'suspend',
                account.is_active ? t('Suspend @{name}? They are signed out and cannot sign in until reinstated.', { name: account.username }) : '',
                () => suspendUser(account.id, account.is_active),
                (result) => ({ is_active: result.is_active }),
              )}
              className={`studio-btn ${account.is_active ? 'border-[color-mix(in_srgb,var(--studio-danger)_45%,var(--studio-border))] text-[var(--studio-danger)] hover:bg-[var(--studio-danger-soft)]' : 'studio-btn-secondary'}`}
            >
              {account.is_active ? t('Suspend') : t('Reinstate')}
            </button>
          )}
          {!account.is_guest && account.signed_in && (me?.is_superuser || !isAdmin || isSelf) && (
            <button
              type="button"
              disabled={busy === 'sessions'}
              onClick={async () => {
                const done = await run(
                  'sessions',
                  t('Sign @{name} out on every device? The account stays usable.', { name: account.username }),
                  () => signOutAccount(account.id),
                  () => ({ signed_in: false }),
                )
                if (done) setNotice(t('Signed out everywhere.'))
              }}
              className="studio-btn studio-btn-secondary"
            >
              {t('Sign out everywhere')}
            </button>
          )}
          {me?.is_superuser && !isSelf && !account.is_superuser && !account.is_guest && (
            <button
              type="button"
              disabled={busy === 'role'}
              onClick={() => run(
                'role',
                account.is_staff
                  ? t('Remove admin rights from @{name}?', { name: account.username })
                  : t('Make @{name} an admin? Admins can see every account and moderate every site.', { name: account.username }),
                () => setAccountAdmin(account.id, !account.is_staff),
                (result) => ({ is_staff: result.is_staff }),
              )}
              className="studio-btn studio-btn-secondary"
            >
              {account.is_staff ? t('Remove admin rights') : t('Make admin')}
            </button>
          )}
        </div>
      </div>

      {actionError && <div className="mb-4"><ErrorBox message={actionError} /></div>}
      {notice && <p role="status" className="studio-status-success mb-4 rounded-[var(--studio-radius-lg)] border px-4 py-2 text-sm">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className="space-y-6">
          <section className="dashboard-section-card p-5">
            <h3 className="mb-4 font-semibold text-[var(--studio-text)]">{t('Standing')}</h3>
            <Facts items={[
              [t('Joined'), formatDate(account.date_joined, language, { time: true })],
              [t('Last sign-in'), account.last_login ? formatDate(account.last_login, language, { time: true }) : t('No record')],
              [t('Session'), account.signed_in ? t('Signed in on at least one device') : t('Signed out')],
              [t('Kind'), account.is_guest ? t('Guest (no password)') : t('Registered')],
            ]} />
          </section>

          <section className="dashboard-section-card p-5">
            <h3 className="mb-4 font-semibold text-[var(--studio-text)]">{t('What this account has')}</h3>
            <Figures
              label={t('What this account has')}
              items={[
                { label: t('Sites'), value: n(counts.sites), note: t('{count} public', { count: n(counts.public_sites) }) },
                { label: t('Views'), value: n(counts.views) },
                { label: t('Favorites received'), value: n(counts.favorites_received) },
                { label: t('Favorites given'), value: n(counts.favorites_given) },
                { label: t('Uploaded images'), value: n(counts.uploads), note: formatBytes(counts.upload_bytes, language) },
                { label: t('Form submissions'), value: n(counts.form_submissions) },
                { label: t('Review comments'), value: n(counts.review_comments) },
                { label: t('Shared blocks'), value: n(counts.shared_components) },
                { label: t('Reports filed'), value: n(counts.reports_filed) },
                { label: t('Reports against'), value: n(counts.reports_against) },
              ]}
            />
          </section>

          <section className="dashboard-section-card p-5">
            <h3 className="mb-3 font-semibold text-[var(--studio-text)]">{t('Sites')}</h3>
            {account.sites.length === 0 ? <p className="text-sm text-[var(--studio-text-muted)]">{t('No sites yet.')}</p> : (
              <ul className="divide-y divide-[var(--studio-border)]">
                {account.sites.map((site) => (
                  <li key={site.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="min-w-0">
                      <button type="button" onClick={() => onOpenSite(site.id)} className="font-medium text-[var(--studio-text)] hover:underline">{site.title}</button>
                      <span className="mt-1 flex flex-wrap gap-1"><SiteChips site={site} /></span>
                    </span>
                    <span className="shrink-0 text-right text-xs tabular-nums text-[var(--studio-text-muted)]">
                      {t('{count} views', { count: n(site.view_count) })} · {t('{count} visits in 30 days', { count: n(site.visits_30d) })}
                      <span className="block text-[var(--studio-text-faint)]">{t('Updated {when}', { when: formatRelative(site.updated_at, language) })}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {(account.profile.bio || links.length > 0) && (
            <section className="dashboard-section-card p-5">
              <h3 className="mb-3 font-semibold text-[var(--studio-text)]">{t('Profile')}</h3>
              {account.profile.bio && <p className="mb-3 text-sm text-[var(--studio-text)]">{account.profile.bio}</p>}
              {links.length > 0 && <Facts items={links.map(([field, value]) => [t(field.charAt(0).toUpperCase() + field.slice(1)), value])} />}
            </section>
          )}
          <section className="dashboard-section-card p-5">
            <h3 className="mb-3 font-semibold text-[var(--studio-text)]">{t('Admin history')}</h3>
            <History entries={account.history} />
          </section>
        </div>
      </div>
    </>
  )
}
