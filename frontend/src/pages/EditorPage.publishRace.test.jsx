// Publishing must not be undone by a save that was scheduled before it.
//
// Every save sent the `published` it saw when it was scheduled. An automatic
// save fires 2.5s after an edit; pressing Publish inside that window started
// the publish request, the automatic save queued behind it still holding
// "not published", and ran the moment the publish finished: the site went live
// and was taken down again within the same second, with the button flipping
// back to Publish. The same happened in reverse after an unpublish.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const pendingWrites = []
const updateSite = vi.fn((id, payload) => new Promise((resolve) => {
  pendingWrites.push(() => resolve({ ...payload, slug: 'race' }))
}))
let startsPublished = false

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Race', slug: 'race', published: startsPublished, category: 'other', tags: [], html: '', site_options: {},
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
import { EDITOR_AUTO_SAVE_DELAY_MS } from '../utils/editorLeave.js'

const SLOW = { timeout: 15000 }

beforeEach(() => {
  updateSite.mockClear()
  pendingWrites.length = 0
  localStorage.clear()
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
  // A signed-in account: the publish gate is for guests.
  useAuthStore.setState({ user: { id: 1, username: 'owner', is_guest: false }, token: 't' })
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

const publishButton = () => document.querySelector('[data-tour="publish"]')
const finishOldestWrite = () => act(async () => { pendingWrites.shift()() })

// An edit, then the publish switch pressed before the automatic save for that
// edit has fired; the automatic save then fires while the request is under way.
async function editThenPress() {
  await act(async () => useEditorStore.getState().updateProps('h1', { text: 'Edited' }))
  await act(async () => { fireEvent.click(publishButton()) })
  await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(1), SLOW)
  await act(async () => { await new Promise((r) => setTimeout(r, EDITOR_AUTO_SAVE_DELAY_MS + 300)) })
}

async function drainWrites() {
  for (let round = 0; round < 6; round += 1) {
    if (pendingWrites.length) await finishOldestWrite()
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
  }
}

describe('a save that was already waiting when the publish switch was pressed', () => {
  it('does not take a site down that was just published', async () => {
    startsPublished = false
    await openEditor()
    await editThenPress()
    expect(updateSite.mock.calls[0][1].published).toBe(true)

    await drainWrites()

    expect(updateSite.mock.calls.map((call) => call[1].published)).not.toContain(false)
  }, 30000)

  it('does not put a site back up that was just unpublished', async () => {
    startsPublished = true
    await openEditor()
    await editThenPress()
    expect(updateSite.mock.calls[0][1].published).toBe(false)

    await drainWrites()

    expect(updateSite.mock.calls.map((call) => call[1].published)).not.toContain(true)
  }, 30000)
})
