// The admin console: sections reachable from the address, numbers shown as the
// server counted them, and every action that changes someone's account asking
// first and saying exactly what it does.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import AdminPage from './AdminPage.jsx'
import { useAuthStore } from '../store/authStore.js'
import {
  getAccount,
  getAdminOverview,
  getAdminSite,
  getAdminSystem,
  listAccounts,
  listAdminActivity,
  moderateSite,
  setAccountAdmin,
  suspendUser,
} from '../api/admin.js'

vi.mock('../api/admin.js', () => ({
  getAdminOverview: vi.fn(),
  listAccounts: vi.fn(),
  getAccount: vi.fn(),
  setAccountAdmin: vi.fn(),
  signOutAccount: vi.fn(),
  suspendUser: vi.fn(),
  listAdminSites: vi.fn(),
  getAdminSite: vi.fn(),
  moderateSite: vi.fn(),
  pinSite: vi.fn(),
  listAdminComponents: vi.fn(),
  moderateComponent: vi.fn(),
  listAdminActivity: vi.fn(),
  getAdminSystem: vi.fn(),
  listReports: vi.fn(() => Promise.resolve({ results: [], count: 0 })),
  resolveReport: vi.fn(),
  listComponentReports: vi.fn(() => Promise.resolve({ results: [], count: 0 })),
  resolveComponentReport: vi.fn(),
}))

const day = (offset) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10)
const series = (counts) => counts.map((count, index) => ({ date: day(counts.length - 1 - index), count }))

const OVERVIEW = {
  range_days: 30,
  since: day(29),
  accounts: {
    total: 32, registered: 30, guests: 2, suspended: 1, admins: 2,
    new_in_range: 5, new_registered_in_range: 4, signed_in_in_range: 3,
    sign_ins_recorded_since: null,
  },
  sites: { total: 61, public: 4, drafts: 57, taken_down: 0, pinned: 1, html: 12, custom_domains: 0, created_in_range: 9 },
  traffic: {
    visits_in_range: 14, views_all_time: 210,
    devices: { desktop: 12, mobile: 2, tablet: 0 },
    referrers: [{ referrer: 'google.com', count: 9 }, { referrer: '', count: 5 }],
    top_sites: [{ id: 7, title: 'Ada Bakery', slug: 'ada-bakery', owner: { id: 3, username: 'ada', display_name: 'Ada' }, visits: 11, views_all_time: 150 }],
  },
  engagement: { favorites: 6, form_submissions: 2, form_submissions_unread: 1, review_comments: 0, review_comments_open: 0, versions: 40, shared_components: 3 },
  storage: { uploads: 4, bytes: 2048 },
  waiting: { site_reports: 2, component_reports: 1 },
  series: { signups: series(Array(30).fill(0)), sites_created: series(Array(30).fill(1)), visits: series([...Array(29).fill(0), 14]) },
  categories: [{ category: 'business', count: 3 }],
  recent_users: [{ id: 3, username: 'ada', display_name: 'Ada', date_joined: day(2), is_guest: false, is_active: true }],
  recent_sites: [{ id: 7, title: 'Ada Bakery', slug: 'ada-bakery', owner: { id: 3, username: 'ada', display_name: 'Ada' }, created_at: day(1), public: true }],
  recent_actions: [],
}

const ACCOUNT = {
  id: 3, username: 'ada', display_name: 'Ada', email: 'ada@example.com', avatar_url: '',
  is_active: true, is_staff: false, is_superuser: false, is_guest: false,
  date_joined: day(40), last_login: null, signed_in: true,
  profile: { headline: '', bio: '', location: '', website: '', github: '', twitter: '', instagram: '' },
  counts: {
    sites: 1, public_sites: 1, views: 150, favorites_given: 0, favorites_received: 2, uploads: 1,
    upload_bytes: 1024, form_submissions: 0, review_comments: 0, shared_components: 0, reports_filed: 0, reports_against: 0,
  },
  sites: [{
    id: 7, title: 'Ada Bakery', slug: 'ada-bakery', kind: 'visual', public: true, published: true,
    moderation_blocked: false, pinned: false, category: 'business', view_count: 150, visits_30d: 11,
    favorites: 2, open_reports: 0, created_at: day(30), updated_at: day(1),
  }],
  history: [],
}

const SITE = {
  id: 7, title: 'Ada Bakery', slug: 'ada-bakery', kind: 'visual',
  owner: { id: 3, username: 'ada', display_name: 'Ada', is_active: true },
  category: 'business', tags: [], public: true, published: true, moderation_blocked: false, moderated_at: null,
  pinned: false, pinned_at: null, share_mode: 'link', custom_domain: '', domain_status: 'not_connected',
  created_at: day(30), updated_at: day(1), last_published_at: day(1),
  counts: { pages: 2, published_pages: 2, versions: 5, favorites: 2, view_count: 150, visits_30d: 11, form_submissions: 0, form_submissions_unread: 0, review_comments: 0, review_comments_open: 0 },
  traffic: { series: series(Array(30).fill(0)), devices: { desktop: 0, mobile: 0, tablet: 0 }, referrers: [], paths: [] },
  reports: [],
  history: [],
}

function renderAt(path, user = { id: 1, username: 'root', is_staff: true, is_superuser: true }) {
  useAuthStore.setState({ user, token: 'x' })
  localStorage.setItem('pwb_language', 'en')
  render(
    <UiThemeProvider>
      <LanguageProvider>
        <MemoryRouter initialEntries={[path]}>
          <AdminPage />
        </MemoryRouter>
      </LanguageProvider>
    </UiThemeProvider>,
  )
  return userEvent.setup()
}

describe('Admin console', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminOverview.mockResolvedValue(OVERVIEW)
    listAccounts.mockResolvedValue({ count: 1, results: [{ ...ACCOUNT, sites: 1, public_sites: 1, views: 150 }] })
    getAccount.mockResolvedValue(ACCOUNT)
    getAdminSite.mockResolvedValue(SITE)
    listAdminActivity.mockResolvedValue({ count: 0, results: [] })
  })
  afterEach(() => vi.restoreAllMocks())

  it('opens on the overview and puts what is waiting first', async () => {
    renderAt('/admin')
    expect(await screen.findByText('2 site reports and 1 block reports are waiting for review.')).toBeInTheDocument()
    expect(getAdminOverview).toHaveBeenCalledWith(30)
    expect(screen.getByRole('heading', { name: 'Accounts' })).toBeInTheDocument()
    // Each chart's numbers are also a table, named by the chart's question.
    expect(screen.getByRole('table', { name: 'How many visits did published sites get each day?' })).toBeInTheDocument()
  })

  it('says sign-in times are not recorded yet instead of showing zero history as fact', async () => {
    renderAt('/admin')
    expect(await screen.findByText('recording starts with the next sign-in')).toBeInTheDocument()
  })

  it('changes the range from the chips', async () => {
    const user = renderAt('/admin')
    await screen.findByText(/waiting for review/)
    await user.click(screen.getByRole('button', { name: 'Last 7 days' }))
    await waitFor(() => expect(getAdminOverview).toHaveBeenLastCalledWith(7))
  })

  it('goes from the account list to the account, and back', async () => {
    const user = renderAt('/admin?section=accounts')
    await user.click((await screen.findAllByRole('button', { name: /Ada/ }))[0])
    expect(await screen.findByRole('heading', { name: 'Ada' })).toBeInTheDocument()
    expect(getAccount).toHaveBeenCalledWith(3)
    expect(screen.getByText('No record')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /All accounts/ }))
    expect(await screen.findByRole('heading', { name: 'Accounts' })).toBeInTheDocument()
  })

  it('asks before suspending, and suspends', async () => {
    suspendUser.mockResolvedValue({ is_active: false })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = renderAt('/admin?section=accounts&id=3')
    await user.click(await screen.findByRole('button', { name: 'Suspend' }))
    expect(confirm.mock.calls[0][0]).toMatch(/cannot sign in until reinstated/)
    expect(suspendUser).toHaveBeenCalledWith(3, true)
  })

  it('offers admin rights only to a superuser', async () => {
    renderAt('/admin?section=accounts&id=3', { id: 2, username: 'mod', is_staff: true, is_superuser: false })
    await screen.findByRole('heading', { name: 'Ada' })
    expect(screen.queryByRole('button', { name: 'Make admin' })).not.toBeInTheDocument()
  })

  it('grants admin rights after saying what they allow', async () => {
    setAccountAdmin.mockResolvedValue({ is_staff: true })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = renderAt('/admin?section=accounts&id=3')
    await user.click(await screen.findByRole('button', { name: 'Make admin' }))
    expect(confirm.mock.calls[0][0]).toMatch(/moderate every site/)
    expect(setAccountAdmin).toHaveBeenCalledWith(3, true)
  })

  it('never offers to sign out a guest, who would have no way back in', async () => {
    getAccount.mockResolvedValue({ ...ACCOUNT, is_guest: true })
    renderAt('/admin?section=accounts&id=3')
    await screen.findByRole('heading', { name: 'Ada' })
    expect(screen.queryByRole('button', { name: 'Sign out everywhere' })).not.toBeInTheDocument()
  })

  it('does nothing when a site deletion is not confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = renderAt('/admin?section=sites&id=7')
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(moderateSite).not.toHaveBeenCalled()
  })

  it('takes a site down only after the owner consequence is spelled out', async () => {
    moderateSite.mockResolvedValue({ published: false, moderation_blocked: true })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = renderAt('/admin?section=sites&id=7')
    await user.click(await screen.findByRole('button', { name: 'Take down' }))
    expect(confirm.mock.calls[0][0]).toMatch(/owner cannot publish it again/)
    expect(moderateSite).toHaveBeenCalledWith(7, 'unpublish')
  })

  it('shows the activity log with the admin who acted and a link to the target', async () => {
    listAdminActivity.mockResolvedValue({
      count: 1,
      results: [{
        id: 1, at: new Date().toISOString(), actor: { id: 1, username: 'root' },
        action: 'user.suspend', label: 'Suspended the account', detail: '', source: 'console',
        target: { type: 'user', id: '3', repr: 'ada' },
      }],
    })
    const user = renderAt('/admin?section=activity')
    expect(await screen.findByText('Suspended the account')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'ada' }))
    expect(await screen.findByRole('heading', { name: 'Ada' })).toBeInTheDocument()
  })

  it('reports system health without printing a key', async () => {
    getAdminSystem.mockResolvedValue({
      server_time: new Date().toISOString(), timezone: 'Europe/Istanbul', debug: false,
      versions: { python: '3.13.1', django: '6.0.8', rest_framework: '3.17.2' },
      database: { engine: 'postgresql', ok: true },
      cache: { backend: 'RedisCache', shared: true, ok: true },
      features: { email: true, google_sign_in: true, recaptcha: false },
      frontend_url: 'https://sitebuilt.app',
      latest_migration: { name: '0021_one_spelling_per_person', applied: new Date().toISOString() },
      records: { users: 32, sites: 61, published_pages: 9, versions: 40, visits: 14, favorites: 6, uploads: 4, form_submissions: 2, review_comments: 0, shared_components: 3, site_reports: 2, component_reports: 1, audit_entries: 0 },
      storage: { uploads: 4, bytes: 2048 },
    })
    renderAt('/admin?section=system')
    expect(await screen.findByText('Answering')).toBeInTheDocument()
    expect(screen.getByText('0021_one_spelling_per_person', { exact: false })).toBeInTheDocument()
    expect(screen.getAllByText('On')).toHaveLength(2)
    expect(screen.getByText('Off')).toBeInTheDocument()
  })
})
