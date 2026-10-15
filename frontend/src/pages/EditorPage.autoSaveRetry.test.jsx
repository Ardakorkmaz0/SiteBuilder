// A failed automatic save is tried again.
//
// The server restarting or the connection dropping made the automatic save
// fail, and nothing tried again until the next edit: the header said "Save
// failed" and the work lived only in this tab.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const updateSite = vi.fn()

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Retry', slug: 'retry', published: false, category: 'other', tags: [], html: '', site_options: {},
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
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

describe('an automatic save that failed', () => {
  it('is tried again when the connection is back, without another edit', async () => {
    updateSite
      .mockRejectedValueOnce(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }))
      .mockImplementation(async (id, payload) => ({ ...payload, slug: 'retry' }))
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

    await act(async () => useEditorStore.getState().updateProps('h1', { text: 'Edited offline' }))
    expect(await screen.findByText('Save failed', {}, SLOW)).toBeInTheDocument()
    expect(updateSite).toHaveBeenCalledTimes(1)

    await act(async () => { window.dispatchEvent(new Event('online')) })

    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(2), SLOW)
    expect(JSON.stringify(updateSite.mock.calls[1][1].schema)).toContain('Edited offline')
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument(), SLOW)
  }, 30000)

  it('says why when the server refuses it for good, and does not keep asking', async () => {
    updateSite.mockRejectedValue({
      response: { status: 400, data: { code: 'validation_error', html: ['HTML is too large (max ~2MB).'], error_codes: { html: ['invalid'] } } },
    })
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

    await act(async () => useEditorStore.getState().updateProps('h1', { text: 'Too big' }))

    expect(await screen.findByRole('alert', {}, SLOW)).toHaveTextContent('HTML is too large (max ~2MB).')
    expect(updateSite).toHaveBeenCalledTimes(1)
    // Past the first retry's 5 seconds: nothing was sent again.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 6000)) })
    expect(updateSite).toHaveBeenCalledTimes(1)
  }, 30000)
})

