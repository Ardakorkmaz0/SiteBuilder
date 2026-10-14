// The editor keeps two undo lists side by side: one for an HTML page's
// document, one for everything else (pages, theme, canvas). A new edit ends
// what could be redone — but only in its own list. After undoing a page
// delete and then changing the document, Redo was still lit and deleted the
// page again, on top of the newer work.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const page = (text) => `<!doctype html><html><head><title>${text}</title></head><body><h1>${text}</h1></body></html>`

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Two pages', slug: 'two', published: false, category: 'other', tags: [], html: '', site_options: {},
    schema: {
      theme: {},
      pages: [
        { id: 'page_home', name: 'Home', mode: 'html', html: page('First page'), components: [] },
        { id: 'page_two', name: 'Second', mode: 'html', html: page('Second page'), components: [] },
      ],
    },
  })),
  updateSite: vi.fn(async (id, payload) => ({ ...payload, slug: 'two' })),
  patchSite: vi.fn(async () => ({})),
}))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../store/editorStore.js'

const SLOW = { timeout: 15000 }
const s = () => useEditorStore.getState()
const shown = () => screen.getByTitle('site').getAttribute('srcdoc') || ''
const redoButton = () => screen.getByTitle('Redo (Ctrl+Shift+Z)')

beforeEach(() => {
  localStorage.clear()
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

async function openEditor() {
  render(
    <UiThemeProvider>
      <LanguageProvider>
        <MemoryRouter initialEntries={['/editor/1']}>
          <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
        </MemoryRouter>
      </LanguageProvider>
    </UiThemeProvider>,
  )
  await waitFor(() => expect(shown()).toContain('First page'), SLOW)
}

const changeTheDocument = async () => {
  fireEvent.click(screen.getByTitle('More actions'))
  await act(async () => { fireEvent.click(screen.getByText('Start blank HTML')) })
}

describe('a new edit ends what could be redone, in both undo lists', () => {
  it('a document edit after undoing a page delete leaves nothing to redo', async () => {
    await openEditor()
    await act(async () => { s().deletePage('page_two') })
    await act(async () => { s().undo() })
    expect(s().schema.pages).toHaveLength(2)
    expect(redoButton()).not.toBeDisabled()

    await changeTheDocument()

    await waitFor(() => expect(redoButton()).toBeDisabled(), SLOW)
    expect(s().future).toHaveLength(0)
    expect(s().schema.pages).toHaveLength(2)
  }, 30000)

  it('a page-level edit after undoing a document edit leaves nothing to redo', async () => {
    await openEditor()
    await changeTheDocument()
    await waitFor(() => expect(screen.getByTitle('Undo (Ctrl+Z)')).not.toBeDisabled(), SLOW)
    await act(async () => { fireEvent.click(screen.getByTitle('Undo (Ctrl+Z)')) })
    await waitFor(() => expect(redoButton()).not.toBeDisabled(), SLOW)

    await act(async () => { s().renamePage('page_two', 'Renamed') })

    await waitFor(() => expect(redoButton()).toBeDisabled(), SLOW)
  }, 30000)
})
