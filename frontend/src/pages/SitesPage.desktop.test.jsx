// My sites from 1024px up: the desktop page, its filters a row of chips over
// the grid, with the original project cards. Phones and tablets are covered
// in SitesPage.test.jsx.
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listSites } from '../api/sites.js'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import { useAuthStore } from '../store/authStore.js'
import { setDesktopViewport } from '../test/desktopViewport.js'
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

function renderPage() {
  return render(<LanguageProvider><MemoryRouter><SitesPage /></MemoryRouter></LanguageProvider>)
}

let restoreViewport
beforeEach(() => {
  restoreViewport = setDesktopViewport()
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  useAuthStore.setState({ user: { id: 100, username: 'ada' }, token: 'test-session' })
  globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} }
  globalThis.ResizeObserver ??= class { observe() {} disconnect() {} }
  vi.mocked(listSites).mockReset().mockResolvedValue([bakery, atelier])
})

afterEach(() => {
  restoreViewport()
  vi.restoreAllMocks()
})

describe('My sites on a desktop', () => {
  it('shows the original page: chips over the grid, no view switch', async () => {
    renderPage()
    const filters = await screen.findByRole('group', { name: 'Filter projects' })
    expect(within(filters).getByRole('button', { name: 'Drafts 1' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'View mode' })).toBeNull()
    expect(screen.queryByRole('complementary')).toBeNull()

    fireEvent.click(within(filters).getByRole('button', { name: 'Drafts 1' }))
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Atelier'])
  })

  // The list choice belongs to the compact page; a desktop keeps the grid.
  it('keeps the original cards even when the list was chosen on a phone', async () => {
    localStorage.setItem('pwb_sites_view', 'list')
    renderPage()
    const card = (await screen.findByRole('heading', { level: 3, name: 'Bakery' })).closest('article')
    expect(card).not.toHaveClass('owner-site-card')
    expect(card).not.toHaveClass('owner-site-card-list')
  })

  it('opens a card menu from the keyboard on its first action and returns on Esc', async () => {
    const user = userEvent.setup()
    renderPage()
    const trigger = await screen.findByRole('button', { name: 'Project actions: Bakery' })
    trigger.focus()
    await user.keyboard('{ArrowDown}')
    const menu = screen.getByRole('menu', { name: 'Project actions: Bakery' })
    expect(within(menu).getByRole('menuitem', { name: 'Pin project' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(within(menu).getByRole('menuitem', { name: 'Delete site' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(trigger).toHaveFocus()
  })
})
