import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const api = vi.hoisted(() => ({
  getSite: vi.fn(),
  updateSite: vi.fn(),
  patchSite: vi.fn(),
}))

vi.mock('../api/sites.js', () => ({
  getSite: api.getSite,
  updateSite: api.updateSite,
  patchSite: api.patchSite,
}))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../store/editorStore.js'

const SLOW = { timeout: 15000 }
const doc = (text) => `<!doctype html><html><head><title>${text}</title></head><body><h1>${text}</h1></body></html>`

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_browser_frame', '1')
  localStorage.setItem('pwb_htmlmode_1', 'view')
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
  api.getSite.mockResolvedValue({
    id: 1,
    title: 'Mixed mode site',
    slug: 'mixed-mode',
    published: false,
    category: 'other',
    tags: [],
    site_options: {},
    revision: 1,
    html: '',
    schema: {
      theme: {},
      pages: [
        {
          id: 'page_home',
          name: 'Home',
          components: [{ id: 'h1', type: 'heading', props: { text: 'Canvas Home' }, styles: {}, layout: { x: 20, y: 20, w: 300, h: 60 } }],
        },
        {
          id: 'page_about',
          name: 'About',
          mode: 'html',
          html: doc('About HTML page'),
          components: [],
        },
      ],
    },
  })
  api.updateSite.mockResolvedValue({})
  api.patchSite.mockResolvedValue({})
})

afterEach(cleanup)

describe('editing another page from the browser frame tab strip', () => {
  it('switches into HTML edit mode when clicking an HTML page tab from a component canvas page', async () => {
    render(
      <UiThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/editor/1']}>
            <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
          </MemoryRouter>
        </LanguageProvider>
      </UiThemeProvider>,
    )

    await waitFor(() => expect(document.querySelector('[data-cid="h1"]')).toBeTruthy(), SLOW)
    expect(localStorage.getItem('pwb_htmlmode_1')).toBe('view')

    fireEvent.click(screen.getByRole('button', { name: 'Edit About', exact: true }))

    await waitFor(() => expect(useEditorStore.getState().currentPageId).toBe('page_about'), SLOW)
    expect(localStorage.getItem('pwb_htmlmode_1')).toBe('edit')
    await waitFor(() => expect(screen.getByTitle('site').getAttribute('srcdoc')).toContain('About HTML page'), SLOW)
    const sandbox = screen.getByTitle('site').getAttribute('sandbox') || ''
    expect(sandbox).toContain('allow-same-origin')
    expect(sandbox).not.toContain('allow-scripts')
  }, 30000)
})
