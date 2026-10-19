import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPublicProfile } from '../api/profile.js'
import { addFavorite, removeFavorite } from '../api/explore.js'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useAuthStore } from '../store/authStore.js'
import PublicProfilePage from './PublicProfilePage.jsx'

vi.mock('../api/profile.js', () => ({ getPublicProfile: vi.fn() }))
vi.mock('../api/explore.js', () => ({ addFavorite: vi.fn(), removeFavorite: vi.fn() }))
vi.mock('../components/dashboard/SitePreview.jsx', () => ({ default: () => <div /> }))

const site = {
  id: 7, slug: 'ada-site', title: 'Ada site', owner_display_name: 'Ada',
  view_count: 12, favorite_count: 4, is_favorited: false,
}
const profile = { id: 9, username: 'ada', display_name: 'Ada', sites: [site] }

function renderProfile() {
  return render(
    <UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/u/9']}>
      <Link to="/u/10">View Grace</Link>
      <Routes>
        <Route path="/u/:id" element={<PublicProfilePage />} />
        <Route path="/login" element={<p>Sign in screen</p>} />
      </Routes>
    </MemoryRouter></LanguageProvider></UiThemeProvider>,
  )
}

beforeEach(() => {
  localStorage.setItem('pwb_language', 'en')
  useAuthStore.setState({ user: { id: 1, username: 'visitor' }, token: 'test-session' })
  getPublicProfile.mockReset().mockResolvedValue(profile)
  addFavorite.mockReset().mockResolvedValue({})
  removeFavorite.mockReset().mockResolvedValue({})
})

describe('public profile favorite saves', () => {
  it('keeps confirmed counts, blocks overlapping toggles, reports failures and permits retry', async () => {
    let rejectSave
    addFavorite.mockImplementationOnce(() => new Promise((_, reject) => { rejectSave = reject }))
    renderProfile()
    const button = await screen.findByRole('button', { name: 'Favorite', exact: true })
    fireEvent.click(button)
    fireEvent.click(button)

    expect(addFavorite).toHaveBeenCalledTimes(1)
    expect(addFavorite).toHaveBeenCalledWith(7)
    expect(removeFavorite).not.toHaveBeenCalled()
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTitle('Favorites')).toHaveTextContent('4')
    await act(async () => rejectSave(new Error('Favorite save unavailable')))

    expect(screen.getByRole('alert')).toHaveTextContent('Favorite save unavailable')
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTitle('Favorites')).toHaveTextContent('4')
    fireEvent.click(button)
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByTitle('Favorites')).toHaveTextContent('5')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    removeFavorite.mockRejectedValueOnce(new Error('Favorite removal unavailable'))
    fireEvent.click(button)
    expect(await screen.findByRole('alert')).toHaveTextContent('Favorite removal unavailable')
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTitle('Favorites')).toHaveTextContent('5')
    fireEvent.click(button)
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'))
    expect(screen.getByTitle('Favorites')).toHaveTextContent('4')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(addFavorite).toHaveBeenCalledTimes(2)
    expect(removeFavorite).toHaveBeenCalledTimes(2)
  })

  it('does not count the star twice when a profile refresh already confirms it', async () => {
    let resolveSave
    addFavorite.mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve }))
    renderProfile()
    fireEvent.click(await screen.findByRole('button', { name: 'Favorite', exact: true }))
    getPublicProfile.mockResolvedValueOnce({ ...profile, sites: [{ ...site, is_favorited: true, favorite_count: 5 }] })

    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'tr' } })
    await waitFor(() => expect(getPublicProfile).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByTitle('Favoriler')).toHaveTextContent('5'))
    await act(async () => resolveSave({}))

    expect(screen.getByTitle('Favoriler')).toHaveTextContent('5')
    expect(screen.getByRole('button', { name: 'Favorilerden çıkar', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })

  it('takes an anonymous visitor to sign in without sending a favorite write', async () => {
    useAuthStore.setState({ user: null, token: null })
    renderProfile()
    fireEvent.click(await screen.findByRole('button', { name: 'Favorite', exact: true }))
    expect(screen.getByText('Sign in screen')).toBeInTheDocument()
    expect(addFavorite).not.toHaveBeenCalled()
    expect(removeFavorite).not.toHaveBeenCalled()
  })

  it('keeps the new profile favorite error after an old profile failure arrives', async () => {
    let rejectOld
    let rejectNew
    addFavorite.mockImplementationOnce(() => new Promise((_, reject) => { rejectOld = reject }))
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectNew = reject }))
    renderProfile()
    fireEvent.click(await screen.findByRole('button', { name: 'Favorite', exact: true }))
    getPublicProfile.mockResolvedValueOnce({
      id: 10, username: 'grace', display_name: 'Grace',
      sites: [{ ...site, id: 8, slug: 'grace-site', title: 'Grace site', favorite_count: 2 }],
    })
    fireEvent.click(screen.getByRole('link', { name: 'View Grace' }))
    await screen.findByRole('heading', { name: 'Grace', exact: true })
    fireEvent.click(screen.getByRole('button', { name: 'Favorite', exact: true }))
    await act(async () => rejectNew(new Error('Grace favorite failed')))
    expect(screen.getByRole('alert')).toHaveTextContent('Grace favorite failed')
    await act(async () => rejectOld(new Error('Ada favorite failed')))
    expect(screen.getByRole('alert')).toHaveTextContent('Grace favorite failed')
    expect(screen.queryByText('Ada favorite failed')).not.toBeInTheDocument()
    expect(addFavorite).toHaveBeenNthCalledWith(1, 7)
    expect(addFavorite).toHaveBeenNthCalledWith(2, 8)
    expect(addFavorite).toHaveBeenCalledTimes(2)
  })
})
