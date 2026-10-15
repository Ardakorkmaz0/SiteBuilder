// Leaving the editor (Back) sends its last changes on the way out. When
// another tab saved the site in between, that save is refused (409) and there
// is no dialog left to ask in: the changes were gone without a word. Now they
// wait as a local draft that the site offers when it is opened again.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'

const updateSite = vi.fn()

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Stale tab', slug: 'stale-tab', published: false, category: 'other', tags: [], html: '', site_options: {}, revision: 4,
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
import { useAuthStore } from '../store/authStore.js'

const SLOW = { timeout: 15000 }

function Nav() {
  const navigate = useNavigate()
  return (
    <>
      <button type="button" onClick={() => navigate('/elsewhere')}>back</button>
      <button type="button" onClick={() => navigate('/editor/1')}>reopen</button>
    </>
  )
}

beforeEach(() => {
  updateSite.mockReset()
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  useAuthStore.getState().setAuth('token', { id: 7, username: 'ada' })
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

afterEach(async () => { await act(async () => useAuthStore.getState().logout()) })

describe('leaving a tab that another one has saved over', () => {
  it('keeps the refused changes as a draft the site offers when opened again', async () => {
    updateSite.mockRejectedValue({ response: { status: 409, data: { code: 'site_changed', detail: 'This site was saved somewhere else after it was opened here.' } } })
    render(
      <UiThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/editor/1']}>
            <Nav />
            <Routes>
              <Route path="/editor/:id" element={<EditorPage />} />
              <Route path="/elsewhere" element={<p>elsewhere</p>} />
            </Routes>
          </MemoryRouter>
        </LanguageProvider>
      </UiThemeProvider>,
    )
    await waitFor(() => expect(document.querySelector('[data-cid="h1"]')).toBeTruthy(), SLOW)
    await act(async () => useEditorStore.getState().updateProps('h1', { text: 'Left behind' }))

    await act(async () => { fireEvent.click(screen.getByText('back')) })
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(1), SLOW)
    expect(updateSite.mock.calls[0][1].base_revision).toBe(4)

    await act(async () => { fireEvent.click(screen.getByText('reopen')) })
    const dialog = await screen.findByRole('dialog', { name: 'Recover your unsaved work?' }, SLOW)
    expect(dialog).toHaveTextContent('it had been saved in another tab or on another device in the meantime')

    fireEvent.click(screen.getByRole('button', { name: 'Restore local draft' }))
    await waitFor(() => expect(JSON.stringify(useEditorStore.getState().schema)).toContain('Left behind'), SLOW)
  }, 30000)

  it('keeps no draft when the save on the way out goes through', async () => {
    updateSite.mockImplementation(async (id, payload) => ({ ...payload, slug: 'stale-tab', revision: 5 }))
    render(
      <UiThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/editor/1']}>
            <Nav />
            <Routes>
              <Route path="/editor/:id" element={<EditorPage />} />
              <Route path="/elsewhere" element={<p>elsewhere</p>} />
            </Routes>
          </MemoryRouter>
        </LanguageProvider>
      </UiThemeProvider>,
    )
    await waitFor(() => expect(document.querySelector('[data-cid="h1"]')).toBeTruthy(), SLOW)
    await act(async () => useEditorStore.getState().updateProps('h1', { text: 'Saved on leaving' }))

    await act(async () => { fireEvent.click(screen.getByText('back')) })
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(1), SLOW)

    expect(Object.keys(localStorage).some((key) => key.startsWith('pwb_editor_recovery_v1:'))).toBe(false)
  }, 30000)
})
