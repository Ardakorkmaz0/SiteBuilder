// The admin console. One page, seven sections; where you are lives in the URL
// (?section=, ?id=, ?queue=, ?days=) so a refresh, the back button and a pasted
// link all land in the same place.
import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useGoBack } from '../utils/useGoBack.js'
import { useScrollRestore } from '../utils/useScrollRestore.js'
import { useAuthStore } from '../store/authStore.js'
import { CogIcon } from '../components/icons.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import { useLanguage } from '../i18n/useLanguage.js'
import AdminOverview from '../components/admin/AdminOverview.jsx'
import { AccountDetail, AccountList } from '../components/admin/AdminAccounts.jsx'
import { SiteDetail, SiteList } from '../components/admin/AdminSites.jsx'
import AdminModeration from '../components/admin/AdminModeration.jsx'
import AdminBlocks from '../components/admin/AdminBlocks.jsx'
import AdminActivity from '../components/admin/AdminActivity.jsx'
import AdminSystem from '../components/admin/AdminSystem.jsx'

const SECTIONS = [
  ['overview', 'Overview'],
  ['accounts', 'Accounts'],
  ['sites', 'Sites'],
  ['moderation', 'Moderation'],
  ['blocks', 'Community blocks'],
  ['activity', 'Activity log'],
  ['system', 'System'],
]
const RANGES = [7, 30, 90]

export default function AdminPage() {
  const { t } = useLanguage()
  const isSuperuser = useAuthStore((s) => s.user?.is_superuser)
  const goBack = useGoBack('/')
  const [params, setParams] = useSearchParams()
  const section = SECTIONS.some(([id]) => id === params.get('section')) ? params.get('section') : 'overview'
  const id = Number(params.get('id')) || null
  const days = RANGES.includes(Number(params.get('days'))) ? Number(params.get('days')) : 30
  const queue = params.get('queue') === 'blocks' ? 'blocks' : 'sites'
  useScrollRestore(true, `${section}:${id || ''}`)

  // One way to move around the console, so every link inside it (a site in an
  // account, an account in the log) keeps the URL honest.
  const open = useCallback((next, nextId = null, extra = {}) => {
    const values = { section: next, ...(nextId ? { id: String(nextId) } : {}), ...extra }
    setParams(values)
    window.scrollTo({ top: 0 })
  }, [setParams])

  let body
  if (section === 'overview') {
    body = <AdminOverview days={days} onDays={(value) => open('overview', null, value === 30 ? {} : { days: String(value) })} onOpen={open} />
  } else if (section === 'accounts') {
    body = id
      ? <AccountDetail key={id} id={id} onBack={() => open('accounts')} onOpenSite={(siteId) => open('sites', siteId)} />
      : <AccountList onOpen={(userId) => open('accounts', userId)} />
  } else if (section === 'sites') {
    body = id
      ? <SiteDetail key={id} id={id} onBack={() => open('sites')} onOpenAccount={(userId) => open('accounts', userId)} onDeleted={() => open('sites')} />
      : <SiteList onOpen={(siteId) => open('sites', siteId)} />
  } else if (section === 'moderation') {
    body = <AdminModeration queue={queue} onQueue={(value) => open('moderation', null, value === 'blocks' ? { queue: 'blocks' } : {})} />
  } else if (section === 'blocks') {
    body = <AdminBlocks />
  } else if (section === 'activity') {
    body = <AdminActivity onOpen={open} />
  } else {
    body = <AdminSystem />
  }

  return (
    <div className="studio-theme-surface min-h-screen bg-[var(--studio-shell)] text-[var(--studio-text)]">
      <header className="sticky top-0 z-10 border-b border-[var(--studio-border)] bg-[color-mix(in_srgb,var(--studio-panel-raised)_92%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-2 px-4 py-3 sm:px-6">
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
                className="flex items-center gap-1.5 rounded-[var(--studio-radius)] px-3 py-1.5 text-sm font-semibold text-[var(--studio-accent-text)] hover:bg-[var(--studio-accent-soft)]"
              >
                <CogIcon size={15} /> {t('Settings')}
              </Link>
            )}
          </div>
        </div>
        <nav aria-label={t('Admin sections')} className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6">
          <ul className="flex gap-1">
            {SECTIONS.map(([key, label]) => (
              <li key={key}>
                <button
                  type="button"
                  aria-current={section === key ? 'page' : undefined}
                  onClick={() => open(key)}
                  className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                    section === key ? 'border-[var(--studio-text)] text-[var(--studio-text)]' : 'border-transparent text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
                  }`}
                >
                  {t(label)}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="sr-only">{t('Admin console')}</h1>
        {body}
      </main>
    </div>
  )
}
