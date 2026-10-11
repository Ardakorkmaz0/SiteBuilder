// What the canvas shows while an AI run is drawing its proposal is not the
// design. The automatic save, 2.5s after the "edit", wrote the proposal to the
// server — a published site went live with it — and then the canvas was put
// back and marked as saved, so even a rejected proposal stayed on the server.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const updateSite = vi.fn(async (id, payload) => ({ ...payload, slug: 'preview' }))

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Preview', slug: 'preview', published: false, category: 'other', tags: [], html: '', site_options: {},
    schema: {
      theme: {},
      pages: [{
        id: 'home',
        name: 'Home',
        components: [{ id: 'h1', type: 'heading', props: { text: 'My own heading' }, styles: {}, layout: { x: 20, y: 20, w: 400, h: 60 } }],
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
import { EDITOR_AUTO_SAVE_DELAY_MS } from '../utils/editorLeave.js'

const SLOW = { timeout: 15000 }
const s = () => useEditorStore.getState()
const savedHeading = (call) => call[1].schema.pages[0].components[0].props.text
const wait = (ms) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })

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
          <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
        </MemoryRouter>
      </LanguageProvider>
    </UiThemeProvider>,
  )
  await waitFor(() => expect(document.querySelector('[data-cid="h1"]')).toBeTruthy(), SLOW)
}

describe('while an AI proposal is on the canvas', () => {
  it('nothing is saved automatically, and Ctrl+S saves the design it was drawn over', async () => {
    await openEditor()
    // The run starts and its tool calls land on the canvas.
    await act(async () => {
      s().beginPreview()
      s().updateProps('h1', { text: 'Proposed by the model' })
    })

    await wait(EDITOR_AUTO_SAVE_DELAY_MS + 400)
    expect(updateSite).not.toHaveBeenCalled()

    await act(async () => { fireEvent.keyDown(window, { key: 's', ctrlKey: true }) })
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(1), SLOW)
    expect(savedHeading(updateSite.mock.calls[0])).toBe('My own heading')
  }, 30000)
})
