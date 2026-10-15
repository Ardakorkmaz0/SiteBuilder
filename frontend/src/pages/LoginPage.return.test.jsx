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
