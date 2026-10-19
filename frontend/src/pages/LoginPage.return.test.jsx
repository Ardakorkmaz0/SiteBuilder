import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import LoginPage from './LoginPage.jsx'
import { useAuthStore } from '../store/authStore.js'
import { login } from '../api/auth.js'

vi.mock('../api/auth.js', () => ({ login: vi.fn(), googleLogin: vi.fn() }))
vi.mock('../utils/usePublicConfig.js', () => ({ usePublicConfig: () => ({}) }))
const navigate = vi.fn()
vi.mock('react-router-dom', async (original) => ({ ...(await original()), useNavigate: () => navigate }))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('pwb_language', 'en')
  useAuthStore.setState({ token: null, user: null })
  login.mockResolvedValue({ token: 'new', user: { id: 7 } })
})

describe('signing in after session expiry', () => {
  it.each([
    ['/editor/42', '/editor/42'],
    ['/editor/42?view=source', '/editor/42?view=source'],
    ['//example.test', '/'],
    ['/admin', '/'],
  ])('returns from %s to %s', async (from, target) => {
    render(<UiThemeProvider><LanguageProvider>
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from } }]}><LoginPage /></MemoryRouter>
    </LanguageProvider></UiThemeProvider>)
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ada' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(target, undefined))
  })
})

// Sent to sign in because the session ended: the page did not say why, and
// someone in the middle of editing could believe the work was gone.
describe('the sign-in page after the session ended', () => {
  function open(from) {
    render(<UiThemeProvider><LanguageProvider>
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from } }]}><LoginPage /></MemoryRouter>
    </LanguageProvider></UiThemeProvider>)
  }

  it('says so, and that editor work was kept, when coming from the editor', () => {
    useAuthStore.setState({ sessionEnded: true })
    open('/editor/42')
    expect(screen.getByRole('status')).toHaveTextContent('Your session ended. Sign in again to continue.')
    expect(screen.getByRole('status')).toHaveTextContent('Any unsaved changes in the editor were kept on this device')
  })

  it('does not mention editor work elsewhere', () => {
    useAuthStore.setState({ sessionEnded: true })
    open('/admin')
    expect(screen.getByRole('status')).toHaveTextContent('Your session ended. Sign in again to continue.')
    expect(screen.getByRole('status')).not.toHaveTextContent('editor')
  })

  it('says nothing on an ordinary visit', () => {
    useAuthStore.setState({ sessionEnded: false })
    open('/editor/42')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('forgets it once signed in', () => {
    useAuthStore.setState({ sessionEnded: true })
    useAuthStore.getState().setAuth('t', { id: 1 })
    expect(useAuthStore.getState().sessionEnded).toBe(false)
    useAuthStore.getState().logout()
  })
})
