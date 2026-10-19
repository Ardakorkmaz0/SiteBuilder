import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import ResetPasswordPage from './ResetPasswordPage.jsx'
import { confirmPasswordReset } from '../api/auth.js'

vi.mock('../api/auth.js', () => ({ confirmPasswordReset: vi.fn() }))
vi.mock('../api/explore.js', () => ({ listExplore: vi.fn().mockResolvedValue({ results: [] }) }))

function open(search = '?uid=local-user&token=local-reset-proof') {
  return render(<UiThemeProvider><LanguageProvider>
    <MemoryRouter initialEntries={[`/reset-password${search}`]}>
      <Link to="/elsewhere">Leave reset page</Link>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/elsewhere" element={<p>Another page</p>} />
        <Route path="/login" element={<p>Sign-in destination</p>} />
      </Routes>
    </MemoryRouter>
  </LanguageProvider></UiThemeProvider>)
}
function submit() {
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Local-test-42!' } })
  fireEvent.click(screen.getByRole('button', { name: 'Reset password', exact: true }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  localStorage.setItem('pwb_language', 'en')
  confirmPasswordReset.mockResolvedValue({ detail: 'Password reset.' })
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('the password reset page lifecycle', () => {
  it('shows success and then returns to sign in while the page is still open', async () => {
    open()
    await act(async () => submit())
    expect(confirmPasswordReset).toHaveBeenCalledWith('local-user', 'local-reset-proof', 'Local-test-42!')
    expect(screen.getByRole('status')).toHaveTextContent('Your password has been reset.')
    await act(async () => vi.advanceTimersByTime(1799))
    expect(screen.queryByText('Sign-in destination')).not.toBeInTheDocument()
    await act(async () => vi.advanceTimersByTime(1))
    expect(screen.getByText('Sign-in destination')).toBeInTheDocument()
  })
  it('cancels its delayed redirect when the person leaves after success', async () => {
    open()
    await act(async () => submit())
    expect(screen.getByRole('status')).toHaveTextContent('Your password has been reset.')
    fireEvent.click(screen.getByRole('link', { name: 'Leave reset page' }))
    expect(screen.getByText('Another page')).toBeInTheDocument()
    await act(async () => vi.advanceTimersByTime(1800))
    expect(screen.getByText('Another page')).toBeInTheDocument()
    expect(screen.queryByText('Sign-in destination')).not.toBeInTheDocument()
  })
  it('does not schedule a redirect when the reset request finishes after leaving', async () => {
    let finish
    confirmPasswordReset.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    open()
    submit()
    expect(screen.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled()
    fireEvent.click(screen.getByRole('link', { name: 'Leave reset page' }))
    await act(async () => finish({ detail: 'Password reset.' }))
    await act(async () => vi.advanceTimersByTime(1800))
    expect(screen.getByText('Another page')).toBeInTheDocument()
    expect(screen.queryByText('Sign-in destination')).not.toBeInTheDocument()
  })
  it('keeps a failed reset on the form and permits a retry', async () => {
    confirmPasswordReset.mockRejectedValueOnce({ response: { data: { detail: 'The link expired; request another.' } } })
    open()
    await act(async () => submit())
    expect(screen.getByRole('alert')).toHaveTextContent('The link expired; request another.')
    expect(screen.getByRole('button', { name: 'Reset password', exact: true })).toBeEnabled()
    await act(async () => vi.advanceTimersByTime(1800))
    expect(screen.queryByText('Sign-in destination')).not.toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Reset password', exact: true })))
    expect(confirmPasswordReset).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status')).toHaveTextContent('Your password has been reset.')
  })
  it.each(['', '?uid=local-user', '?token=local-reset-proof'])('refuses the incomplete link %s before any request', (search) => {
    open(search)
    expect(screen.getByRole('alert')).toHaveTextContent('This reset link is missing its token.')
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
    expect(confirmPasswordReset).not.toHaveBeenCalled()
  })
})
