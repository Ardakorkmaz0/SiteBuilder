import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import ForgotPasswordPage from './ForgotPasswordPage.jsx'
import { requestPasswordReset } from '../api/auth.js'

vi.mock('../api/auth.js', () => ({ requestPasswordReset: vi.fn() }))
vi.mock('../api/explore.js', () => ({ listExplore: vi.fn().mockResolvedValue({ results: [] }) }))

function open() {
  return render(<UiThemeProvider><LanguageProvider><MemoryRouter>
    <ForgotPasswordPage />
  </MemoryRouter></LanguageProvider></UiThemeProvider>)
}
function fillEmail(value) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Email', exact: true }), { target: { value } })
}
function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Send reset link', exact: true }))
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('pwb_language', 'en')
  requestPasswordReset.mockResolvedValue({ detail: 'Reset email requested.' })
})

describe('requesting a password reset email', () => {
  it('confirms the address actually submitted even if the field changes while waiting', async () => {
    let finish
    requestPasswordReset.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    open()
    fillEmail('first@example.test')
    submit()
    expect(screen.getByRole('button', { name: 'Sending…', exact: true })).toBeDisabled()
    fillEmail('second@example.test')
    await act(async () => finish({ detail: 'Reset email requested.' }))
    expect(requestPasswordReset).toHaveBeenCalledExactlyOnceWith('first@example.test')
    expect(screen.getByRole('status')).toHaveTextContent('If an account exists for first@example.test, a reset link is on its way.')
    expect(screen.getByRole('status')).not.toHaveTextContent('second@example.test')
  })
  it('shows a failed request, permits retry and confirms the retried address', async () => {
    requestPasswordReset.mockRejectedValueOnce({ response: { data: { detail: 'Email is temporarily unavailable.' } } })
    open()
    fillEmail('first@example.test')
    await act(async () => submit())
    expect(screen.getByRole('alert')).toHaveTextContent('Email is temporarily unavailable.')
    expect(screen.getByRole('button', { name: 'Send reset link', exact: true })).toBeEnabled()
    fillEmail('second@example.test')
    await act(async () => submit())
    expect(requestPasswordReset).toHaveBeenNthCalledWith(2, 'second@example.test')
    expect(screen.getByRole('status')).toHaveTextContent('If an account exists for second@example.test, a reset link is on its way.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
