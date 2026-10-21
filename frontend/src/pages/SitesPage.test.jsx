// My sites: the owner's projects on a page of their own, with the status
// filters, the order they chose, and the way to a new site.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteSite, listSites } from '../api/sites.js'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import { useAuthStore } from '../store/authStore.js'
import SitesPage from './SitesPage.jsx'

vi.mock('../api/sites.js', () => ({
  listSites: vi.fn(),
  deleteSite: vi.fn(),
  cloneSite: vi.fn(),
  getSite: vi.fn(),
}))
vi.mock('../components/dashboard/DashboardHeader.jsx', () => ({ default: () => <header>Dashboard</header> }))
vi.mock('../components/dashboard/SitePreview.jsx', () => ({ default: () => <div /> }))
vi.mock('../components/dashboard/CreateSiteWizard.jsx', () => ({
  default: ({ open }) => (open ? <div role="dialog" aria-label="Create a site" /> : null),
}))

const bakery = { id: 1, title: 'Bakery', slug: 'bakery', published: true, view_count: 40, favorite_count: 2, updated_at: '2026-10-20T09:00:00Z' }
const atelier = { id: 2, title: 'Atelier', slug: 'atelier', published: false, view_count: 5, favorite_count: 0, updated_at: '2026-10-20T11:00:00Z' }
const clinic = { id: 3, title: 'Clinic', slug: 'clinic', published: false, view_count: 0, favorite_count: 1, updated_at: '2026-10-20T10:00:00Z' }

function renderPage() {
  return render(<LanguageProvider><MemoryRouter><SitesPage /></MemoryRouter></LanguageProvider>)
}

function cardTitles() {
  return screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  useAuthStore.setState({ user: { id: 100, username: 'ada' }, token: 'test-session' })
  globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} }
  globalThis.ResizeObserver ??= class { observe() {} disconnect() {} }
  vi.mocked(listSites).mockReset().mockResolvedValue([bakery, atelier, clinic])
  vi.mocked(deleteSite).mockReset().mockResolvedValue({})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('My sites filters', () => {
  it('counts each status and shows only the chosen one', async () => {
    renderPage()
    const filters = await screen.findByRole('group', { name: 'Filter projects' })
    expect(within(filters).getByRole('button', { name: 'All 3' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(filters).getByRole('button', { name: 'Published 1' })).toBeInTheDocument()
    // Nothing is pinned, so there is no empty Pinned filter to choose.
    expect(within(filters).queryByRole('button', { name: /^Pinned/ })).toBeNull()

    fireEvent.click(within(filters).getByRole('button', { name: 'Drafts 2' }))

    expect(within(filters).getByRole('button', { name: 'Drafts 2' })).toHaveAttribute('aria-pressed', 'true')
    expect(cardTitles()).toEqual(['Atelier', 'Clinic'])
  })

  it('says why a filter came up empty and leads back to every site', async () => {
    vi.mocked(listSites).mockResolvedValue([bakery])
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Drafts 0' }))

    expect(screen.getByText('Every site of yours is published.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Show all sites' }))
    expect(screen.getByRole('button', { name: 'All 1' })).toHaveAttribute('aria-pressed', 'true')
    expect(cardTitles()).toEqual(['Bakery'])
  })

  it('puts a pinned site first and offers the Pinned filter', async () => {
    localStorage.setItem('pwb_pinned_projects', JSON.stringify([3]))
    renderPage()
    expect(await screen.findByRole('button', { name: 'Pinned 1' })).toBeInTheDocument()
    expect(cardTitles()).toEqual(['Clinic', 'Atelier', 'Bakery'])
  })
})

describe('My sites order', () => {
  it('remembers the chosen order for the next visit', async () => {
    const first = renderPage()
    fireEvent.change(await screen.findByRole('combobox', { name: 'Sort projects' }), { target: { value: 'name' } })
    expect(cardTitles()).toEqual(['Atelier', 'Bakery', 'Clinic'])
    first.unmount()

    renderPage()
    expect(await screen.findByRole('combobox', { name: 'Sort projects' })).toHaveValue('name')
    expect(cardTitles()).toEqual(['Atelier', 'Bakery', 'Clinic'])
  })
})

describe('My sites creation', () => {
  it('opens the new-site wizard from the grid', async () => {
    renderPage()
    const tile = await screen.findByRole('button', { name: 'New site' })
    expect(tile).toHaveAccessibleDescription('Choose a template, use AI, or bring your own HTML.')
    fireEvent.click(tile)
    expect(screen.getByRole('dialog', { name: 'Create a site' })).toBeInTheDocument()
  })

  it('tells a guest at the limit what an account changes instead of opening the wizard', async () => {
    useAuthStore.setState({ user: { id: 101, username: 'guest-1', is_guest: true }, token: 'guest-session' })
    renderPage()
    await screen.findByRole('group', { name: 'Filter projects' })
    fireEvent.click(screen.getByRole('button', { name: 'Create new site' }))

    expect(screen.getByRole('dialog', { name: 'An account is needed' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Create a site' })).toBeNull()
  })

  it('starts an empty account at its first site', async () => {
    vi.mocked(listSites).mockResolvedValue([])
    renderPage()
    expect(await screen.findByRole('heading', { name: 'No sites yet' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Filter projects' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Create your first project' }))
    expect(screen.getByRole('dialog', { name: 'Create a site' })).toBeInTheDocument()
  })
})

describe('My sites loading', () => {
  it('offers another try when the list does not load', async () => {
    vi.mocked(listSites).mockRejectedValueOnce({ response: { status: 500, data: {} } })
    renderPage()
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    })

    expect(listSites).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(cardTitles()).toEqual(['Atelier', 'Clinic', 'Bakery']))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('My sites deletion', () => {
  it('removes a site only after the owner confirms', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    renderPage()
    const menu = await screen.findByRole('button', { name: 'Project actions: Clinic' })

    fireEvent.click(menu)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete site' }))
    expect(deleteSite).not.toHaveBeenCalled()
    expect(cardTitles()).toContain('Clinic')

    fireEvent.click(menu)
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Delete site' }))
    })
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(deleteSite).toHaveBeenCalledWith(3)
    expect(cardTitles()).toEqual(['Atelier', 'Bakery'])
  })
})

describe('My sites view preference', () => {
  it('switches the real cards to a remembered list while keeping search and status filters', async () => {
    const first = renderPage()
    await screen.findByRole('heading', { name: 'Atelier', exact: true })
    expect(screen.getByRole('button', { name: 'Card view' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'List view' }))
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('article', { name: 'Atelier' })).toHaveClass('owner-site-card-list')
    fireEvent.click(screen.getByRole('button', { name: 'Drafts 2' }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search your sites…' }), { target: { value: 'Clinic' } })
    expect(cardTitles()).toEqual(['Clinic'])
    fireEvent.click(screen.getByRole('button', { name: 'Card view' }))
    expect(cardTitles()).toEqual(['Clinic'])
    expect(screen.getByRole('article', { name: 'Clinic' })).not.toHaveClass('owner-site-card-list')
    fireEvent.click(screen.getByRole('button', { name: 'List view' }))
    first.unmount()

    renderPage()
    expect(await screen.findByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('article', { name: 'Atelier' })).toHaveClass('owner-site-card-list')
    expect(cardTitles()).toEqual(['Atelier', 'Clinic', 'Bakery'])
  })

  it('discards an unknown saved view and still changes views when storage is blocked', async () => {
    localStorage.setItem('pwb_sites_view', 'something-else')
    const first = renderPage()
    expect(await screen.findByRole('button', { name: 'Card view' })).toHaveAttribute('aria-pressed', 'true')
    first.unmount()
    const originalGet = Storage.prototype.getItem
    const originalSet = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
      if (key === 'pwb_sites_view') throw new Error('Storage unavailable')
      return originalGet.call(this, key)
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'pwb_sites_view') throw new Error('Storage unavailable')
      return originalSet.call(this, key, value)
    })
    renderPage()
    expect(await screen.findByRole('button', { name: 'Card view' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'List view' }))
    expect(screen.getByRole('article', { name: 'Bakery' })).toHaveClass('owner-site-card-list')
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true')
  })
})

// The options sit beside the list on a wide screen and above it on a phone.
// The page's own title and its main action still come first: on a phone, and
// to a screen reader reading in order.
describe('My sites reading order', () => {
  it('puts the title and the create button before the filters', async () => {
    renderPage()
    const filters = await screen.findByRole('group', { name: 'Filter projects' })
    for (const first of [
      screen.getByRole('heading', { level: 1, name: 'My sites' }),
      screen.getByRole('button', { name: 'Create new site' }),
    ]) {
      expect(first.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })
})
