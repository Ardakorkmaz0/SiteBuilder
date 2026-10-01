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
import { cloneSite } from '../../api/sites.js'

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

// The source viewer had the same gaps: a box of divs, a nameless ×, and Esc
// left it open over the site.
describe('reading the source', () => {
  async function openSource(user) {
    await user.click(screen.getByTitle("View this site's source code"))
    return screen.getByRole('dialog', { name: 'Source — Bakery' })
  }

  it('is a named dialog that takes the keyboard', async () => {
    const user = userEvent.setup()
    renderToolbar()
    const dialog = await openSource(user)
    expect(dialog).toContainElement(document.activeElement)
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('closes on Esc', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await openSource(user)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Source — Bakery' })).toBeNull()
  })
})

// "Use this" swallowed every failure: the button stopped spinning and nothing
// said why. A guest at the site limit now hears it, and anyone else sees the
// reason.
describe('using a site that cannot be copied', () => {
  it('tells a guest at the limit what an account would change', async () => {
    useAuthStore.setState({ token: 'x', user: { id: 9, username: 'guest-abcd', is_guest: true } })
    cloneSite.mockRejectedValueOnce({ response: { status: 403, data: { code: 'guest_forbidden', action: 'site_limit', detail: 'Create an account to make more sites — the ones you have are kept.' } } })
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByRole('button', { name: /Use this/ }))
    expect(await screen.findByText('A guest can keep three sites at a time. An account has no limit.')).toBeInTheDocument()
  })

  it('says why for everyone else', async () => {
    useAuthStore.setState({ token: 'x', user: { id: 9, username: 'grace', is_guest: false } })
    cloneSite.mockRejectedValueOnce({ response: { status: 403, data: { detail: 'This site was taken down by a moderator.' } } })
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByRole('button', { name: /Use this/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('This site was taken down by a moderator.')
  })
})
