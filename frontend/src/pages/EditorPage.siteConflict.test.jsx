// Two tabs on one site. The second save, made from what the first one has
// since replaced, silently won and took the first tab's work with it. Now the
// server refuses it (409) and the editor asks which version wins.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const updateSite = vi.fn()

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Two tabs', slug: 'two-tabs', published: false, category: 'other', tags: [], html: '', site_options: {}, revision: 4,
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

beforeEach(() => {
  updateSite.mockReset()
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

describe('a save made from an older revision', () => {
  it('writes nothing until the person chooses, and "Save mine anyway" sends it without the revision', async () => {
    updateSite
      .mockRejectedValueOnce({ response: { status: 409, data: { code: 'site_changed', detail: 'This site was saved somewhere else after it was opened here.' } } })
      .mockImplementation(async (id, payload) => ({ ...payload, slug: 'two-tabs', revision: 6 }))
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
    await act(async () => useEditorStore.getState().updateProps('h1', { text: 'Mine' }))

    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0])

    const dialog = await screen.findByRole('alertdialog', { name: 'This site changed somewhere else' }, SLOW)
    expect(updateSite).toHaveBeenCalledTimes(1)
    expect(updateSite.mock.calls[0][1].base_revision).toBe(4)

    fireEvent.click(screen.getByRole('button', { name: 'Save mine anyway' }))

    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(2), SLOW)
    expect(updateSite.mock.calls[1][1]).not.toHaveProperty('base_revision')
    expect(JSON.stringify(updateSite.mock.calls[1][1].schema)).toContain('Mine')
    await waitFor(() => expect(dialog).not.toBeInTheDocument(), SLOW)

    // The next save works from the revision that save produced.
    await act(async () => useEditorStore.getState().updateProps('h1', { text: 'Mine again' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0])
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(3), SLOW)
    expect(updateSite.mock.calls[2][1].base_revision).toBe(6)
  }, 30000)
})
