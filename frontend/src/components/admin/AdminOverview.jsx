import { Link } from 'react-router-dom'
import { getAdminOverview } from '../../api/admin.js'
import { useLanguage } from '../../i18n/useLanguage.js'
import {
  BarList,
  DailyChart,
  ErrorBox,
  Figures,
  FilterChips,
  History,
  Loading,
  SectionHeading,
} from './adminUi.jsx'
import { formatBytes, formatDate, formatNumber, formatRelative, useAdminData } from './adminData.js'

const RANGES = [[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days']]
const DEVICE_LABELS = { desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet' }
const CATEGORY_LABELS = {
  portfolio: 'Portfolio', business: 'Business', blog: 'Blog', landing: 'Landing',
  shop: 'Shop', personal: 'Personal', other: 'Other',
}

// What is waiting for an admin goes first: it is the one decision this screen
// asks for. When nothing is waiting it says so in a line, not a banner.
function Waiting({ waiting, onOpen }) {
  const { t, language } = useLanguage()
  const total = waiting.site_reports + waiting.component_reports
  if (!total) {
    return <p className="mb-8 text-sm text-[var(--studio-text-muted)]">{t('Nothing is waiting for review.')}</p>
  }
  return (
    <div className="studio-status-warning mb-8 flex flex-wrap items-center justify-between gap-3 rounded-[var(--studio-radius-lg)] border px-4 py-3">
      <p className="text-sm font-medium">
        {t('{sites} site reports and {blocks} block reports are waiting for review.', {
          sites: formatNumber(waiting.site_reports, language),
          blocks: formatNumber(waiting.component_reports, language),
        })}
      </p>
      <button type="button" onClick={() => onOpen('moderation')} className="studio-btn studio-btn-secondary">{t('Open moderation')}</button>
    </div>
  )
}

export default function AdminOverview({ days, onDays, onOpen }) {
  const { t, language } = useLanguage()
  const { data, error, loading, reload } = useAdminData(() => getAdminOverview(days), days)

  const header = (
    <SectionHeading title={t('Overview')} description={t('What happened on the platform, counted from its own records.')}>
      <FilterChips label={t('Range')} options={RANGES.map(([id, label]) => [id, label])} value={days} onChange={onDays} />
    </SectionHeading>
  )
  if (loading) return <>{header}<Loading /></>
  if (error) return <>{header}<ErrorBox message={error} onRetry={reload} /></>

  const { accounts, sites, traffic, engagement, storage, series } = data
  const signInNote = accounts.sign_ins_recorded_since
    ? t('recorded since {date}', { date: formatDate(accounts.sign_ins_recorded_since, language) })
    : t('recording starts with the next sign-in')
  const n = (value) => formatNumber(value, language)

  return (
    <>
      {header}
      <Waiting waiting={data.waiting} onOpen={onOpen} />

      <div className="space-y-10">
        <section aria-labelledby="overview-accounts">
          <h3 id="overview-accounts" className="mb-4 text-base font-semibold text-[var(--studio-text)]">{t('Accounts')}</h3>
          <Figures
            label={t('Accounts')}
            items={[
              { label: t('Accounts'), value: n(accounts.total) },
              { label: t('Registered'), value: n(accounts.registered) },
              { label: t('Guests'), value: n(accounts.guests) },
              { label: t('New in this range'), value: n(accounts.new_in_range), note: t('{count} registered', { count: n(accounts.new_registered_in_range) }) },
              { label: t('Signed in during this range'), value: n(accounts.signed_in_in_range), note: signInNote },
              { label: t('Admins'), value: n(accounts.admins) },
              { label: t('Suspended'), value: n(accounts.suspended) },
            ]}
          />
        </section>

        <section aria-labelledby="overview-sites">
          <h3 id="overview-sites" className="mb-4 text-base font-semibold text-[var(--studio-text)]">{t('Sites')}</h3>
          <Figures
            label={t('Sites')}
            items={[
              { label: t('Sites'), value: n(sites.total) },
              { label: t('Public'), value: n(sites.public) },
              { label: t('Drafts'), value: n(sites.drafts) },
              { label: t('Created in this range'), value: n(sites.created_in_range) },
              { label: t('Taken down'), value: n(sites.taken_down) },
              { label: t('Pinned'), value: n(sites.pinned) },
              { label: t('HTML sites'), value: n(sites.html) },
              { label: t('Custom domains'), value: n(sites.custom_domains) },
            ]}
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <DailyChart question={t('How many people joined each day?')} series={series.signups} />
          <DailyChart question={t('How many sites were started each day?')} series={series.sites_created} />
          <DailyChart question={t('How many visits did published sites get each day?')} series={series.visits} />
        </div>

        <section aria-labelledby="overview-traffic">
          <h3 id="overview-traffic" className="mb-4 text-base font-semibold text-[var(--studio-text)]">{t('Traffic')}</h3>
          <Figures
            label={t('Traffic')}
            items={[
              { label: t('Visits in this range'), value: n(traffic.visits_in_range) },
              { label: t('Views, all time'), value: n(traffic.views_all_time) },
              { label: t('Favorites'), value: n(engagement.favorites) },
              { label: t('Uploaded images'), value: n(storage.uploads), note: formatBytes(storage.bytes, language) },
            ]}
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <section className="dashboard-section-card p-5 lg:col-span-2">
              <h3 className="font-semibold text-[var(--studio-text)]">{t('Which sites were visited most in this range?')}</h3>
              {traffic.top_sites.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--studio-text-muted)]">{t('No visits in this range.')}</p>
              ) : (
                <ol className="mt-3 divide-y divide-[var(--studio-border)]">
                  {traffic.top_sites.map((site, index) => (
                    <li key={site.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="w-5 shrink-0 text-right tabular-nums text-[var(--studio-text-faint)]">{index + 1}</span>
                      <button type="button" onClick={() => onOpen('sites', site.id)} className="min-w-0 flex-1 truncate text-left font-medium text-[var(--studio-text)] hover:underline">{site.title}</button>
                      <span className="hidden shrink-0 text-[var(--studio-text-muted)] sm:inline">@{site.owner.username}</span>
                      <span className="shrink-0 tabular-nums text-[var(--studio-text)]">{t('{count} visits', { count: n(site.visits) })}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <BarList
              title={t('Which devices do visitors use?')}
              emptyNote={t('No visits in this range.')}
              rows={Object.entries(traffic.devices).map(([key, value]) => ({ key, label: t(DEVICE_LABELS[key]), value }))}
            />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <BarList
              title={t('Where do visitors come from?')}
              emptyNote={t('No visits in this range.')}
              rows={traffic.referrers.map((row) => ({ key: row.referrer || 'direct', label: row.referrer || t('Direct or unknown'), value: row.count }))}
            />
            <BarList
              title={t('Which categories are public sites in?')}
              emptyNote={t('No public sites yet.')}
              rows={data.categories.map((row) => ({ key: row.category, label: t(CATEGORY_LABELS[row.category] || row.category), value: row.count }))}
            />
          </div>
        </section>

        <section aria-labelledby="overview-engagement">
          <h3 id="overview-engagement" className="mb-4 text-base font-semibold text-[var(--studio-text)]">{t('What people leave behind')}</h3>
          <Figures
            label={t('What people leave behind')}
            items={[
              { label: t('Form submissions'), value: n(engagement.form_submissions), note: t('{count} unread', { count: n(engagement.form_submissions_unread) }) },
              { label: t('Review comments'), value: n(engagement.review_comments), note: t('{count} open', { count: n(engagement.review_comments_open) }) },
              { label: t('Saved versions'), value: n(engagement.versions) },
              { label: t('Shared blocks'), value: n(engagement.shared_components) },
            ]}
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="dashboard-section-card p-5">
            <h3 className="font-semibold text-[var(--studio-text)]">{t('Newest accounts')}</h3>
            <ul className="mt-3 divide-y divide-[var(--studio-border)]">
              {data.recent_users.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <button type="button" onClick={() => onOpen('accounts', user.id)} className="min-w-0 truncate text-left font-medium text-[var(--studio-text)] hover:underline">
                    {user.display_name}
                    <span className="ml-1 font-normal text-[var(--studio-text-muted)]">@{user.username}</span>
                  </button>
                  <span className="shrink-0 text-xs text-[var(--studio-text-faint)]">{user.is_guest ? t('Guest') : formatRelative(user.date_joined, language)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="dashboard-section-card p-5">
            <h3 className="font-semibold text-[var(--studio-text)]">{t('Newest sites')}</h3>
            <ul className="mt-3 divide-y divide-[var(--studio-border)]">
              {data.recent_sites.map((site) => (
                <li key={site.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <button type="button" onClick={() => onOpen('sites', site.id)} className="min-w-0 truncate text-left font-medium text-[var(--studio-text)] hover:underline">{site.title}</button>
                  <span className="shrink-0 text-xs text-[var(--studio-text-faint)]">{formatRelative(site.created_at, language)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="dashboard-section-card p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-semibold text-[var(--studio-text)]">{t('Latest admin actions')}</h3>
              <button type="button" onClick={() => onOpen('activity')} className="text-sm font-medium text-[var(--studio-accent-text)] hover:underline">{t('All')}</button>
            </div>
            <div className="mt-3"><History entries={data.recent_actions} /></div>
          </section>
        </div>

        <p className="text-xs text-[var(--studio-text-faint)]">
          {t('Range starts {date}.', { date: formatDate(data.since, language) })}{' '}
          <Link to="/" className="underline">{t('Back to the app')}</Link>
        </p>
      </div>
    </>
  )
}
