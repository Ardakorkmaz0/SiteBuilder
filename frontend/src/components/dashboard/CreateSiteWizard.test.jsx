import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import CreateSiteWizard from './CreateSiteWizard.jsx'

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
