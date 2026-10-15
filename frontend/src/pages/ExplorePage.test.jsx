import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addFavorite, listExplore, removeFavorite } from '../api/explore.js'
import { cloneSite, listSites } from '../api/sites.js'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import ExplorePage from './ExplorePage.jsx'
import { useAuthStore } from '../store/authStore.js'

vi.mock('../api/explore.js', () => ({ listExplore: vi.fn(), addFavorite: vi.fn(), removeFavorite: vi.fn() }))
vi.mock('../api/sites.js', () => ({ listSites: vi.fn(), cloneSite: vi.fn() }))
vi.mock('../components/dashboard/DashboardHeader.jsx', () => ({ default: () => <header>Dashboard</header> }))
vi.mock('../components/dashboard/CreateSiteWizard.jsx', () => ({ default: () => null }))
vi.mock('../components/dashboard/SitePreview.jsx', () => ({ default: () => <div /> }))

const site = {
  id: 7, slug: 'explore-site', title: 'Explore site', owner_display_name: 'Ada',
  view_count: 12, favorite_count: 4, is_favorited: false,
}

beforeEach(() => {
  localStorage.setItem('pwb_language', 'en')
  useAuthStore.getState().logout()
  useAuthStore.setState({ user: { id: 100, username: 'ada' }, token: 'test-session' })
  vi.mocked(listExplore).mockReset().mockResolvedValue({ results: [site], next: null })
  vi.mocked(listSites).mockReset().mockResolvedValue([])
  vi.mocked(addFavorite).mockReset()
  vi.mocked(removeFavorite).mockReset()
})

describe('ExplorePage favorite saves', () => {
  it('reloads account-specific favorite state after logging out and switching accounts', async () => {
    useAuthStore.setState({ user: { id: 200, username: 'first' }, token: 'first-session' })
    const first = render(<LanguageProvider><MemoryRouter><ExplorePage /></MemoryRouter></LanguageProvider>)
    await screen.findByRole('button', { name: 'Favorite' })
    first.unmount()
    const returned = render(<LanguageProvider><MemoryRouter><ExplorePage /></MemoryRouter></LanguageProvider>)
    expect(await screen.findByRole('button', { name: 'Favorite' })).toHaveAttribute('aria-pressed', 'false')
    expect(listExplore).toHaveBeenCalledTimes(1)
    returned.unmount()
    useAuthStore.getState().logout()
    useAuthStore.setState({ user: { id: 201, username: 'second' }, token: 'second-session' })
    vi.mocked(listExplore).mockResolvedValueOnce({ results: [{ ...site, is_favorited: true }], next: null })

    render(<LanguageProvider><MemoryRouter><ExplorePage /></MemoryRouter></LanguageProvider>)
    expect(await screen.findByRole('button', { name: 'Unfavorite' })).toHaveAttribute('aria-pressed', 'true')
    expect(listExplore).toHaveBeenCalledTimes(2)
  })

  it('keeps confirmed stars and counts on failure, prevents overlapping saves, and supports retry in both directions', async () => {
    let rejectSave
    vi.mocked(addFavorite).mockImplementationOnce(() => new Promise((_, reject) => { rejectSave = reject }))
    render(<LanguageProvider><MemoryRouter><ExplorePage /></MemoryRouter></LanguageProvider>)
    const button = await screen.findByRole('button', { name: 'Favorite' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(addFavorite).toHaveBeenCalledTimes(1)
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTitle('Favorites')).toHaveTextContent('4')
    await act(async () => rejectSave(new Error('Save unavailable')))

    expect(screen.getByRole('alert')).toHaveTextContent('Save unavailable')
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTitle('Favorites')).toHaveTextContent('4')
    vi.mocked(addFavorite).mockResolvedValueOnce({})
    fireEvent.click(button)
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByTitle('Favorites')).toHaveTextContent('5')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    vi.mocked(removeFavorite).mockRejectedValueOnce(new Error('Removal unavailable'))
    fireEvent.click(button)
    expect(await screen.findByRole('alert')).toHaveTextContent('Removal unavailable')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTitle('Favorites')).toHaveTextContent('5')
    vi.mocked(removeFavorite).mockResolvedValueOnce({})
    fireEvent.click(button)
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'))
    expect(screen.getByTitle('Favorites')).toHaveTextContent('4')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(addFavorite).toHaveBeenCalledTimes(2)
    expect(removeFavorite).toHaveBeenCalledTimes(2)
  })
})


describe('ExplorePage feed recovery', () => {
  it.each(['All', 'Try again'])('retries the failed feed using %s and settles loading after success', async (buttonName) => {
    let resolveRetry
    vi.mocked(listExplore)
      .mockRejectedValueOnce(new Error('Feed unavailable'))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRetry = resolve }))
    render(<LanguageProvider><MemoryRouter><ExplorePage /></MemoryRouter></LanguageProvider>)
    expect(await screen.findByRole('alert')).toHaveTextContent('Feed unavailable')
    fireEvent.click(screen.getByRole('button', { name: buttonName, exact: true }))
    await waitFor(() => expect(listExplore).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    await act(async () => resolveRetry({ results: [site], next: null }))
    expect(screen.getByRole('link', { name: 'Explore site' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('Nothing here yet')).not.toBeInTheDocument()
  })

  it('does not present a feed failure as an empty community', async () => {
    vi.mocked(listExplore).mockRejectedValueOnce(new Error('Feed unavailable'))
    render(<LanguageProvider><MemoryRouter><ExplorePage /></MemoryRouter></LanguageProvider>)
    expect(await screen.findByRole('alert')).toHaveTextContent('Feed unavailable')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('Nothing here yet')).not.toBeInTheDocument()
  })
})

describe('ExplorePage templates', () => {
  it('tells a guest at the site limit what an account changes, not a line of red text', async () => {
    useAuthStore.setState({ user: { id: 300, username: 'guest-x7k2m4pq', is_guest: true }, token: 'guest-session' })
    vi.mocked(cloneSite).mockReset().mockRejectedValue({
      response: { status: 403, data: { code: 'guest_forbidden', action: 'site_limit', detail: 'Create an account to make more sites — the ones you have are kept.' } },
    })
    render(<LanguageProvider><MemoryRouter><ExplorePage /></MemoryRouter></LanguageProvider>)

    fireEvent.click(await screen.findByRole('button', { name: 'Use as template' }))

    expect(await screen.findByRole('dialog', { name: 'An account is needed' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('says so before the new-site wizard when a guest already keeps three sites', async () => {
    useAuthStore.setState({ user: { id: 300, username: 'guest-x7k2m4pq', is_guest: true }, token: 'guest-session' })
    vi.mocked(listSites).mockResolvedValue([1, 2, 3].map((id) => ({ id, title: `Site ${id}`, slug: `site-${id}`, updated_at: '2026-10-01T10:00:00Z' })))
    render(<LanguageProvider><MemoryRouter><ExplorePage /></MemoryRouter></LanguageProvider>)
    await screen.findByText('Site 1')

    fireEvent.click(screen.getAllByRole('button', { name: 'Create new site' })[0])

    expect(await screen.findByRole('dialog', { name: 'An account is needed' })).toBeInTheDocument()
  })
})

describe('ExplorePage greeting', () => {
  it('welcomes a new guest without reading out the random guest handle', async () => {
    // The API fills an unset display name with the username.
    useAuthStore.setState({ user: { id: 300, username: 'guest-x7k2m4pq', display_name: 'guest-x7k2m4pq', is_guest: true }, token: 'guest-session' })
    render(<LanguageProvider><MemoryRouter><ExplorePage /></MemoryRouter></LanguageProvider>)

    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome' })).toBeInTheDocument()
    expect(screen.queryByText(/guest-x7k2m4pq/)).toBeNull()
  })

  it('welcomes an account back by name', async () => {
    useAuthStore.setState({ user: { id: 100, username: 'ada', display_name: 'Ada Studio' }, token: 'test-session' })
    render(<LanguageProvider><MemoryRouter><ExplorePage /></MemoryRouter></LanguageProvider>)

    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back, Ada Studio' })).toBeInTheDocument()
  })
})

