import { useState } from 'react'
import { listAdminActivity } from '../../api/admin.js'
import { useLanguage } from '../../i18n/useLanguage.js'
import { Chip, Empty, ErrorBox, Loading, Pager, SearchField, SectionHeading, SortSelect } from './adminUi.jsx'
import { formatDate, formatRelative, useAdminData, useDebounced } from './adminData.js'

const TARGETS = [
  ['', 'Everything'], ['user', 'Accounts'], ['site', 'Sites'],
  ['sharedcomponent', 'Community blocks'], ['sitesettings', 'Server settings'],
]
const TARGET_LABEL = { user: 'Account', site: 'Site', sharedcomponent: 'Block', sitesettings: 'Server settings', report: 'Report' }

export default function AdminActivity({ onOpen }) {
  const { t, language } = useLanguage()
  const [actor, setActor] = useState('')
  const [target, setTarget] = useState('')
  const [page, setPage] = useState(1)
  const who = useDebounced(actor.trim())
  const key = JSON.stringify({ who, target, page })
  const { data, error, loading, reload } = useAdminData(() => listAdminActivity({ actor: who, target, page }), key)
  const rows = data?.results || []

  const open = (entry) => {
    if (entry.target.type === 'user') onOpen('accounts', entry.target.id)
    else if (entry.target.type === 'site' && !entry.action.endsWith('.delete')) onOpen('sites', entry.target.id)
  }
  const openable = (entry) => entry.target.type === 'user' || (entry.target.type === 'site' && !entry.action.endsWith('.delete'))

  return (
    <>
      <SectionHeading title={t('Activity log')} description={t('Every admin action, from this console and from the Django admin, newest first.')} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchField label={t('Filter by admin')} value={actor} onChange={(value) => { setActor(value); setPage(1) }} placeholder={t('Admin username')} />
        <SortSelect label={t('About')} value={target} options={TARGETS} onChange={(value) => { setTarget(value); setPage(1) }} />
      </div>

      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : rows.length === 0 ? (
        <Empty title={t('No admin actions recorded yet.')}>{t('Suspensions, takedowns, pins, role changes and settings changes will appear here.')}</Empty>
      ) : (
        <>
          <ol className="divide-y divide-[var(--studio-border)] border-y border-[var(--studio-border)]">
            {rows.map((entry) => (
              <li key={entry.id} className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                <time dateTime={entry.at} className="text-xs text-[var(--studio-text-muted)] sm:pt-0.5" title={formatDate(entry.at, language, { time: true })}>
                  {formatRelative(entry.at, language)}
                  <span className="block text-[var(--studio-text-faint)]">{formatDate(entry.at, language, { time: true })}</span>
                </time>
                <div className="min-w-0 text-sm">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--studio-text)]">@{entry.actor.username || '?'}</span>
                    <span className="text-[var(--studio-text)]">{t(entry.label)}</span>
                    {entry.source === 'django-admin' && <Chip>Django admin</Chip>}
                  </p>
                  <p className="mt-0.5 text-[var(--studio-text-muted)] [overflow-wrap:anywhere]">
                    {t(TARGET_LABEL[entry.target.type] || entry.target.type)}:{' '}
                    {openable(entry)
                      ? <button type="button" onClick={() => open(entry)} className="font-medium text-[var(--studio-text)] hover:underline">{entry.target.repr}</button>
                      : <span className="font-medium text-[var(--studio-text)]">{entry.target.repr}</span>}
                    {entry.detail && <span> · {entry.detail}</span>}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <Pager page={page} count={data.count} onPage={setPage} />
        </>
      )}
    </>
  )
}
