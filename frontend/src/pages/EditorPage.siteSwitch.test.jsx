// Each site gets its own editor.
//
// /editor/1 and /editor/2 are the same route, so going from one straight to
// the other (the browser's history menu does it) kept the same editor mounted
// and only swapped the site id. The undo steps of the first site stayed in
// place: Undo was live on a site nobody had touched, and pressing it wrote the
// FIRST site's page over the second's — both home pages share the id
// "page_home", which is what an undo step is filed under.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'

const page = (text) => `<!doctype html><html><head><title>${text}</title></head><body><h1>${text}</h1></body></html>`

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async (id) => ({
    id: Number(id), title: `Site ${id}`, slug: `site-${id}`, published: false, category: 'other', tags: [], html: '', site_options: {},
    schema: {
      theme: {},
      pages: [{ id: 'page_home', name: 'Home', mode: 'html', html: page(`Page of site ${id}`), components: [] }],
    },
  })),
  updateSite: vi.fn(async (id, payload) => ({ ...payload, slug: `site-${id}` })),
  patchSite: vi.fn(async () => ({})),
}))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'

const SLOW = { timeout: 15000 }

function GoTo({ path }) {
  const navigate = useNavigate()
  return <button type="button" onClick={() => navigate(path)}>{`go ${path}`}</button>
}

beforeEach(() => {
  localStorage.clear()
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

const shownPage = () => screen.getByTitle('site').getAttribute('srcdoc') || ''
const undoButton = () => screen.getByTitle('Undo (Ctrl+Z)')

describe('going from one site’s editor straight to another’s', () => {
  it('leaves the first site’s undo steps behind', async () => {
    render(
      <UiThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/editor/1']}>
            <GoTo path="/editor/2" />
            <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
          </MemoryRouter>
        </LanguageProvider>
      </UiThemeProvider>,
    )
    await waitFor(() => expect(shownPage()).toContain('Page of site 1'), SLOW)

    // An undoable change on site 1: start the page over as blank HTML.
    fireEvent.click(screen.getByTitle('More actions'))
    await act(async () => { fireEvent.click(screen.getByText('Start blank HTML')) })
    await waitFor(() => expect(undoButton()).not.toBeDisabled(), SLOW)

    await act(async () => { fireEvent.click(screen.getByText('go /editor/2')) })
    await waitFor(() => expect(shownPage()).toContain('Page of site 2'), SLOW)

    expect(undoButton()).toBeDisabled()
  }, 30000)
})
