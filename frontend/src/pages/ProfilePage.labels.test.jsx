// Every field on the profile page has a name a screen reader can read. The
// visible labels used to sit beside their fields without naming them, so the
// form read as a row of unnamed text boxes.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import ProfilePage from './ProfilePage.jsx'
import { useAuthStore } from '../store/authStore.js'
import { updateProfile } from '../api/profile.js'

vi.mock('../api/profile.js', () => ({
  getProfile: vi.fn(() => Promise.resolve({ display_name: 'Ada', bio: '', headline: '', location: '', website: '', github: '', twitter: '', instagram: '' })),
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
}))
vi.mock('../api/auth.js', () => ({ fetchMe: vi.fn(() => Promise.resolve({ id: 1, username: 'ada' })) }))
vi.mock('../api/sites.js', () => ({
  listSites: vi.fn(() => Promise.resolve([{ id: 7, title: 'Portfolio', slug: 'portfolio', published: false, updated_at: '2026-09-27T10:00:00Z' }])),
  createSite: vi.fn(), deleteSite: vi.fn(), cloneSite: vi.fn(), getSite: vi.fn(() => new Promise(() => {})),
}))

beforeEach(() => {
  localStorage.setItem('pwb_language', 'en')
  useAuthStore.setState({ token: 't', user: { id: 1, username: 'ada' } })
  globalThis.IntersectionObserver = class { observe() {} disconnect() {} }
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})

describe('the profile form', () => {
  it('names every field', async () => {
    render(
      <MemoryRouter>
        <UiThemeProvider>
          <LanguageProvider>
            <ProfilePage />
          </LanguageProvider>
        </UiThemeProvider>
      </MemoryRouter>,
    )

    for (const name of ['Display name', 'Headline', 'Bio', 'Location', 'Website']) {
      expect(await screen.findByRole('textbox', { name })).toBeInTheDocument()
    }
  })
})

// The sites moved to their own page. An address kept from when they lived
// here, under #projects, still reaches them.
describe('the old address of the site list', () => {
  it('opens My sites', async () => {
    render(
      <MemoryRouter initialEntries={['/profile#projects']}>
        <UiThemeProvider>
          <LanguageProvider>
            <Routes>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/sites" element={<h1>Sites page</h1>} />
            </Routes>
          </LanguageProvider>
        </UiThemeProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: 'Sites page' })).toBeInTheDocument()
  })
})

// A website the server refused was reported at the top of the page, out of
// sight of the Save button, and nothing pointed at the field.
describe('a refused link', () => {
  it('is said under its field, which is marked and focused', async () => {
    updateProfile.mockRejectedValueOnce({
      response: { status: 400, data: { code: 'validation_error', website: ['Enter a web address, like yoursite.com.'], error_codes: { website: ['invalid'] } } },
    })
    render(
      <MemoryRouter>
        <UiThemeProvider>
          <LanguageProvider>
            <ProfilePage />
          </LanguageProvider>
        </UiThemeProvider>
      </MemoryRouter>,
    )
    const website = await screen.findByRole('textbox', { name: 'Website' })
    fireEvent.change(website, { target: { value: 'not an address' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByText('Enter a web address, like yoursite.com.')).toBeInTheDocument()
    expect(website).toHaveAttribute('aria-invalid', 'true')
    expect(website).toHaveAccessibleDescription('Enter a web address, like yoursite.com.')
    expect(website).toHaveFocus()

    fireEvent.change(website, { target: { value: 'ada.dev' } })
    expect(website).not.toHaveAttribute('aria-invalid')
  })
})

