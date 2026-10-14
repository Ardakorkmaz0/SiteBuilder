import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import CreateSiteWizard from './CreateSiteWizard.jsx'
import { useAuthStore } from '../../store/authStore.js'

function openWizard() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <CreateSiteWizard open onClose={() => {}} onCreated={() => {}} />
      </LanguageProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})

describe('CreateSiteWizard content language', () => {
  it('starts an English user\'s site in English', async () => {
    localStorage.setItem('pwb_language', 'en')
    const user = userEvent.setup()
    openWizard()
    await user.type(screen.getByPlaceholderText('e.g. My Portfolio'), 'Olive Café')
    await user.click(screen.getByRole('button', { name: 'Next →' }))
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Türkçe' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('starts a Turkish user\'s site in Turkish', async () => {
    localStorage.setItem('pwb_language', 'tr')
    const user = userEvent.setup()
    openWizard()
    await user.type(screen.getByRole('textbox'), 'Zeytin Kafe')
    await user.click(screen.getByRole('button', { name: /İleri|Next/ }))
    expect(screen.getByRole('button', { name: 'Türkçe' })).toHaveAttribute('aria-pressed', 'true')
  })
})

// A guest cannot publish: ticked, the box made the server refuse to create the
// site at all, and the wizard ended on an error.
describe('CreateSiteWizard publishing', () => {
  async function reachLastStep() {
    localStorage.setItem('pwb_language', 'en')
    const user = userEvent.setup()
    openWizard()
    await user.type(screen.getByPlaceholderText('e.g. My Portfolio'), 'Olive Café')
    await user.click(screen.getByRole('button', { name: 'Next →' }))
    await user.click(screen.getByRole('button', { name: 'Next →' }))
    expect(screen.getByRole('button', { name: 'Create and open editor' })).toBeInTheDocument()
  }

  it('offers to publish at once to an account', async () => {
    useAuthStore.setState({ user: { id: 1, username: 'ada', is_guest: false } })
    await reachLastStep()
    expect(screen.getByRole('checkbox', { name: /Publish immediately/ })).toBeInTheDocument()
  })

  it('does not offer it to a guest', async () => {
    useAuthStore.setState({ user: { id: 2, username: 'guest-abc', is_guest: true } })
    await reachLastStep()
    expect(screen.queryByRole('checkbox', { name: /Publish immediately/ })).toBeNull()
  })
})
