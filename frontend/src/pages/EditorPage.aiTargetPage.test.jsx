import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const api = vi.hoisted(() => ({
  getSite: vi.fn(),
  updateSite: vi.fn(),
  patchSite: vi.fn(),
  runAiHtmlPrompt: vi.fn(),
}))

vi.mock('../api/sites.js', () => ({
  getSite: api.getSite,
  updateSite: api.updateSite,
  patchSite: api.patchSite,
}))
vi.mock('../utils/aiAssistant.js', async (importOriginal) => ({
  ...await importOriginal(),
  runAiHtmlPrompt: api.runAiHtmlPrompt,
}))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../store/editorStore.js'
import { setApiKey, setProvider } from '../utils/aiProviders.js'

const SLOW = { timeout: 15000 }
const doc = (text) => `<!doctype html><html><head><title>${text}</title></head><body><h1>${text}</h1></body></html>`

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_htmlmode_1', 'view')
  setProvider('gemini')
  setApiKey('test-placeholder-key', 'gemini')
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
  api.getSite.mockResolvedValue({
    id: 1,
    title: 'Multi page AI',
    slug: 'multi-page-ai',
    published: false,
    category: 'other',
    tags: [],
    site_options: {},
    revision: 2,
    html: doc('Home original'),
    schema: {
      theme: {},
      pages: [
        { id: 'page_home', name: 'Home', mode: 'html', html: doc('Home original'), components: [] },
        { id: 'page_about', name: 'About', mode: 'html', html: doc('About original'), components: [] },
      ],
    },
  })
  api.updateSite.mockImplementation(async (_id, payload) => ({ ...payload, slug: 'multi-page-ai', revision: 3 }))
  api.patchSite.mockResolvedValue({})
  api.runAiHtmlPrompt.mockResolvedValue({ html: doc('Home updated by AI') })
})

afterEach(cleanup)

describe('AI HTML document application across pages', () => {
  it('writes an accepted HTML proposal to the page it was generated for, not the page switched to afterwards', async () => {
    render(
      <UiThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/editor/1']}>
            <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
          </MemoryRouter>
        </LanguageProvider>
      </UiThemeProvider>,
    )

    await waitFor(() => expect(screen.getByTitle('site').getAttribute('srcdoc')).toContain('Home original'), SLOW)

    fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant', exact: true }))
    const panel = await screen.findByRole('complementary', { name: 'AI Assistant', exact: true }, SLOW)
    const composer = within(panel).getByRole('textbox')
    fireEvent.change(composer, { target: { value: 'Update the home hero heading' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Send', exact: true }))

    const accept = await within(panel).findByRole('button', { name: 'Accept', exact: true }, SLOW)

    // Switch to another page before accepting the proposal prepared for Home.
    act(() => {
      useEditorStore.getState().selectPage('page_about')
    })
    await waitFor(() => expect(screen.getByTitle('site').getAttribute('srcdoc')).toContain('About original'), SLOW)

    fireEvent.click(accept)
    await waitFor(() => expect(within(panel).queryByRole('button', { name: 'Accept', exact: true })).toBeNull(), SLOW)

    // About must remain intact while Home receives the AI HTML.
    expect(screen.getByTitle('site').getAttribute('srcdoc')).toContain('About original')

    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }))
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(1), SLOW)
    const savedPages = api.updateSite.mock.calls[0][1].schema.pages
    const savedHome = savedPages.find((p) => p.id === 'page_home')
    const savedAbout = savedPages.find((p) => p.id === 'page_about')
    expect(savedHome.html).toContain('Home updated by AI')
    expect(savedAbout.html).toContain('About original')
    expect(savedAbout.html).not.toContain('Home updated by AI')
  }, 30000)
})
