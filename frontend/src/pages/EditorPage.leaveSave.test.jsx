// Leaving the editor saves what is not saved yet.
//
// An automatic save fires 2.5s after an edit. The browser's Back button
// unmounts the editor with no prompt (the "save before leaving?" dialog only
// guards the editor's own buttons), and that cancelled the pending save: the
// last couple of seconds of work were gone without a word.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'

const updateSite = vi.fn(async (id, payload) => ({ ...payload, slug: 'leave' }))

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Leave', slug: 'leave', published: false, category: 'other', tags: [], html: '', site_options: {},
    schema: {
      theme: {},
      pages: [{
        id: 'home',
        name: 'Home',
        components: [{ id: 'h1', type: 'heading', props: { text: 'Hello' }, styles: {}, layout: { x: 20, y: 20, w: 400, h: 60 } }],
      }],
    },
  })),
  updateSite: (...args) => updateSite(...args),
  patchSite: vi.fn(async () => ({})),
}))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../store/editorStore.js'

const SLOW = { timeout: 15000 }

function BrowserBack() {
  const navigate = useNavigate()
  return <button type="button" onClick={() => navigate('/elsewhere')}>back</button>
}

beforeEach(() => {
  updateSite.mockClear()
  localStorage.clear()
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

async function openEditor() {
  render(
    <UiThemeProvider>
      <LanguageProvider>
        <MemoryRouter initialEntries={['/editor/1']}>
          <BrowserBack />
          <Routes>
            <Route path="/editor/:id" element={<EditorPage />} />
            <Route path="/elsewhere" element={<p>elsewhere</p>} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </UiThemeProvider>,
  )
  await waitFor(() => expect(document.querySelector('[data-cid="h1"]')).toBeTruthy(), SLOW)
}

const leave = () => act(async () => { fireEvent.click(screen.getByText('back')) })

describe('leaving the editor without its own buttons', () => {
  it('saves an edit made a moment before', async () => {
    await openEditor()
    await act(async () => useEditorStore.getState().updateProps('h1', { text: 'Edited just now' }))

    await leave()

    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(1), SLOW)
    expect(JSON.stringify(updateSite.mock.calls[0][1].schema)).toContain('Edited just now')
  }, 30000)

  it('writes nothing when there is nothing to save', async () => {
    await openEditor()
    await leave()
    await act(async () => { await new Promise((r) => setTimeout(r, 200)) })
    expect(updateSite).not.toHaveBeenCalled()
  }, 30000)

  it('stays quiet when automatic saving is switched off', async () => {
    localStorage.setItem('pwb_autosave_on_1', '0')
    await openEditor()
    await act(async () => useEditorStore.getState().updateProps('h1', { text: 'Not auto-saved' }))
    await leave()
    await act(async () => { await new Promise((r) => setTimeout(r, 200)) })
    expect(updateSite).not.toHaveBeenCalled()
  }, 30000)
})
