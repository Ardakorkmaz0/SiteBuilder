// Typing on an HTML page becomes an undo step when the pointer next goes down
// or focus leaves the page. A save in between (the automatic one, 2.5s after
// the last key, or Ctrl+S) took the typed document as the page's own without
// recording a step: Undo then had nothing to take back, and the typing could
// never be undone.
import { forwardRef, useImperativeHandle } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const page = (text) => `<!doctype html><html><head><title>${text}</title></head><body><p>${text}</p></body></html>`

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Typing', slug: 'typing', published: false, category: 'other', tags: [], html: '', site_options: {},
    schema: {
      theme: {},
      pages: [{ id: 'page_home', name: 'Home', mode: 'html', html: page('Typed'), components: [] }],
    },
  })),
  updateSite: vi.fn(async (id, payload) => ({ ...payload, slug: 'typing' })),
  patchSite: vi.fn(async () => ({})),
}))

// The edit surface, reduced to what the page asks of it: the live document
// runs ahead of the `html` it was given while the user types.
const surface = { live: null, seeded: [] }
vi.mock('../components/editor/HtmlWorkspace.jsx', () => ({
  default: forwardRef(function FakeWorkspace({ html }, ref) {
    useImperativeHandle(ref, () => ({
      getHtml: () => surface.live ?? html,
      setDocument: (next) => { surface.seeded.push(next); surface.live = next },
    }), [html])
    return <iframe title="site" srcDoc={html} />
  }),
}))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { updateSite } from '../api/sites.js'

const SLOW = { timeout: 15000 }
const undoButton = () => screen.getByTitle('Undo (Ctrl+Z)')

beforeEach(() => {
  localStorage.clear()
  surface.live = null
  surface.seeded = []
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

describe('a save while typing on an HTML page', () => {
  it('keeps the typing undoable', async () => {
    render(
      <UiThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/editor/1']}>
            <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
          </MemoryRouter>
        </LanguageProvider>
      </UiThemeProvider>,
    )
    await waitFor(() => expect(screen.getByTitle('site').getAttribute('srcdoc')).toContain('Typed'), SLOW)
    expect(undoButton()).toBeDisabled()

    surface.live = page('Typed and more')
    await act(async () => { fireEvent.keyDown(window, { key: 's', ctrlKey: true }) })
    await waitFor(() => expect(updateSite).toHaveBeenCalled(), SLOW)
    expect(JSON.stringify(updateSite.mock.calls.at(-1)[1])).toContain('Typed and more')

    await waitFor(() => expect(undoButton()).not.toBeDisabled(), SLOW)
    await act(async () => { fireEvent.click(undoButton()) })

    expect(surface.seeded.at(-1)).toContain('<p>Typed</p>')
    await waitFor(() => expect(screen.getByTitle('site').getAttribute('srcdoc')).not.toContain('Typed and more'), SLOW)
  }, 30000)
})
