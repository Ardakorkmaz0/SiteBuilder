import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import PreviewPage from './PreviewPage.jsx'
import { countSiteView, getPublicSite } from '../api/sites.js'

vi.mock('../api/sites.js', () => ({
  getPublicSite: vi.fn(),
  countSiteView: vi.fn(async () => ({})),
  submitSiteForm: vi.fn(async () => ({})),
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

describe('PreviewPage draft mode', () => {
  it('requests the owner draft when ?draft=1 is present and shows the draft notice even on a published site', async () => {
    getPublicSite.mockResolvedValue({
      id: 20,
      title: 'Published Site',
      slug: 'published-site',
      published: true,
      html: '',
      site_options: {},
      schema: {
        theme: {},
        pages: [
          {
            id: 'home',
            name: 'Home',
            components: [
              { id: 'h1', type: 'heading', props: { text: 'Draft heading' }, styles: {}, layout: { x: 20, y: 20, w: 400, h: 60 } },
            ],
          },
        ],
      },
    })

    render(
      <UiThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/site/published-site?draft=1']}>
            <Routes>
              <Route path="/site/:slug" element={<PreviewPage />} />
            </Routes>
          </MemoryRouter>
        </LanguageProvider>
      </UiThemeProvider>,
    )

    await waitFor(() => expect(getPublicSite).toHaveBeenCalledWith('published-site', { draft: true }))
    expect(await screen.findByText('Draft heading')).toBeInTheDocument()
    expect(screen.getByText(/Draft preview:/i)).toBeInTheDocument()
    expect(countSiteView).not.toHaveBeenCalled()
  })
})
