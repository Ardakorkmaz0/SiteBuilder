import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import { useAuthStore } from '../../store/authStore.js'
import DashboardHeader from './DashboardHeader.jsx'

vi.mock('./DashboardGlobalSearch.jsx', () => ({ default: () => null }))
vi.mock('./AppInfo.jsx', () => ({ default: () => null }))

beforeEach(() => {
  localStorage.setItem('pwb_language', 'en')
  useAuthStore.setState({ user: { id: 700, username: 'tester' }, token: 'test-session' })
})

function renderHeader(current) {
  return render(<UiThemeProvider><LanguageProvider><MemoryRouter>
    <DashboardHeader current={current} />
    <input aria-label="Outside the header" />
  </MemoryRouter></LanguageProvider></UiThemeProvider>)
}

describe('DashboardHeader Escape focus', () => {
  it('returns focus to the account trigger when Escape closes its focused menu', async () => {
    const user = userEvent.setup()
    renderHeader()
    const trigger = screen.getByRole('button', { name: 'Account menu' })
    await user.click(trigger)
    await user.tab()
    // The menu's first entry, not the Profile tab in the navigation.
    const entry = document.activeElement
    expect(entry).toHaveAccessibleName('Profile')
    expect(entry.closest('nav')).toBeNull()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(entry).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('returns focus to the mobile trigger when Escape closes a focused navigation link', async () => {
    const user = userEvent.setup()
    renderHeader()
    const trigger = screen.getByRole('button', { name: 'Open menu' })
    await user.click(trigger)
    const menu = screen.getByRole('navigation', { name: 'Mobile navigation' })
    within(menu).getByRole('link', { name: 'Favorites' }).focus()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('does not steal focus from outside the header when Escape dismisses an open menu', async () => {
    const user = userEvent.setup()
    renderHeader()
    const trigger = screen.getByRole('button', { name: 'Account menu' })
    await user.click(trigger)
    const outside = screen.getByRole('textbox', { name: 'Outside the header' })
    outside.focus()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(outside).toHaveFocus()
  })
})

// The sites used to share a page with the profile (/profile#projects). Each is
// its own tab now, and the tab of the page you are on says so.
describe('DashboardHeader tabs', () => {
  it('sends My sites and Profile to their own pages', () => {
    renderHeader('profile')
    const nav = screen.getByRole('navigation', { name: 'Navigation' })
    expect(within(nav).getByRole('link', { name: 'My sites' })).toHaveAttribute('href', '/sites')
    const profile = within(nav).getByRole('link', { name: 'Profile' })
    expect(profile).toHaveAttribute('href', '/profile')
    expect(profile).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'My sites' })).not.toHaveAttribute('aria-current')
  })

  it('lists each page once in the phone menu', async () => {
    const user = userEvent.setup()
    renderHeader('projects')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    const menu = screen.getByRole('navigation', { name: 'Mobile navigation' })
    expect(within(menu).getAllByRole('link', { name: 'Profile' })).toHaveLength(1)
    expect(within(menu).getByRole('link', { name: 'My sites' })).toHaveAttribute('aria-current', 'page')
  })
})
