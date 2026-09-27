// Every field on the profile page has a name a screen reader can read. The
// visible labels used to sit beside their fields without naming them, so the
// form read as a row of unnamed text boxes.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import ProfilePage from './ProfilePage.jsx'
import { useAuthStore } from '../store/authStore.js'

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

    for (const name of ['Display name', 'Headline', 'Bio', 'Location', 'Website', 'New site title']) {
      expect(await screen.findByRole('textbox', { name })).toBeInTheDocument()
    }
    expect(await screen.findByRole('textbox', { name: 'Search your sites…' })).toBeInTheDocument()
  })
})
