// The site report was a box of divs: not announced as a dialog, the × had no
// name, Esc did nothing and focus stayed on the menu behind it.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import { useAuthStore } from '../../store/authStore.js'
import PublicToolbar from './PublicToolbar.jsx'

vi.mock('../../api/sites.js', () => ({ cloneSite: vi.fn(), reportSite: vi.fn() }))

const site = { id: 5, slug: 'bakery', title: 'Bakery', owner_id: 2, owner_username: 'ada', schema: { pages: [] } }

function renderToolbar() {
  localStorage.setItem('pwb_language', 'en')
  render(
    <MemoryRouter>
      <UiThemeProvider>
        <LanguageProvider>
          <PublicToolbar site={site} pages={[]} device="desktop" onDeviceChange={() => {}} scriptMode="off" onScriptModeChange={() => {}} />
        </LanguageProvider>
      </UiThemeProvider>
    </MemoryRouter>,
  )
}

async function openReport(user) {
  await user.click(screen.getByRole('button', { name: 'More actions' }))
  await user.click(screen.getByRole('menuitem', { name: 'Report this site' }))
}

describe('reporting a site', () => {
  beforeEach(() => useAuthStore.setState({ token: 'x', user: { id: 9, username: 'grace', is_guest: false } }))

  it('is a named dialog that takes the keyboard', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await openReport(user)

    const dialog = screen.getByRole('dialog', { name: 'Report this site' })
    expect(dialog).toContainElement(document.activeElement)
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('closes on Esc', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await openReport(user)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Report this site' })).toBeNull()
  })
})
