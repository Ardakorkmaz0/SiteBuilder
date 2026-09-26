// The proof beside the sign-in form has to be real: sites people actually
// published, each opening the live page. When there is nothing real to show it
// says nothing, rather than filling the space with drawn stand-ins.
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import AuthShell from './AuthShell.jsx'
import { listExplore } from '../../api/explore.js'

vi.mock('../../api/explore.js', () => ({ listExplore: vi.fn() }))
vi.mock('../dashboard/SitePreview.jsx', () => ({
  default: () => <div data-testid="site-preview" />,
}))

const site = (id, title, owner) => ({ id, slug: `site-${id}`, title, owner_display_name: owner })

function renderShell() {
  return render(
    <UiThemeProvider>
      <LanguageProvider>
        <MemoryRouter>
          <AuthShell title="Welcome back" description="Sign in.">
            <p>form</p>
          </AuthShell>
        </MemoryRouter>
      </LanguageProvider>
    </UiThemeProvider>,
  )
}

describe('AuthShell proof', () => {
  beforeEach(() => {
    localStorage.setItem('pwb_language', 'en')
    vi.mocked(listExplore).mockReset()
  })

  it('shows the first three published sites, each linking to the live page', async () => {
    vi.mocked(listExplore).mockResolvedValue({
      results: [site(1, 'Bakery', 'Ada'), site(2, 'Portfolio', 'Lin'), site(3, 'Clinic', 'Sam'), site(4, 'Fourth', 'Kim')],
    })
    renderShell()

    expect(await screen.findByRole('heading', { name: 'Made with Sitebuilder' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Bakery/ })).toHaveAttribute('href', '/site/site-1')
    expect(screen.getByRole('link', { name: /Clinic/ })).toHaveAttribute('href', '/site/site-3')
    expect(screen.queryByText('Fourth')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('site-preview')).toHaveLength(3)
  })

  it('leaves the section out when nothing is published yet', async () => {
    vi.mocked(listExplore).mockResolvedValue({ results: [] })
    renderShell()

    await waitFor(() => expect(listExplore).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Made with Sitebuilder' })).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('leaves the section out when the feed cannot be reached', async () => {
    vi.mocked(listExplore).mockRejectedValue(new Error('offline'))
    renderShell()

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Made with Sitebuilder' })).not.toBeInTheDocument())
    expect(screen.getByText('form')).toBeInTheDocument()
  })
})
