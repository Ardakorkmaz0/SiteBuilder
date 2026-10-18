import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const { getSite, updateSite, listVersions, restoreVersion } = vi.hoisted(() => ({
  getSite: vi.fn(), updateSite: vi.fn(), listVersions: vi.fn(), restoreVersion: vi.fn(),
}))
vi.mock('../api/sites.js', () => ({ getSite, updateSite, patchSite: vi.fn() }))
vi.mock('../api/versions.js', () => ({
  listVersions, restoreVersion, createCheckpoint: vi.fn(), overwriteVersion: vi.fn(),
  setVersionPinned: vi.fn(), deleteVersion: vi.fn(),
}))

import EditorPage from './EditorPage.jsx'
import ProtectedRoute from '../routes/ProtectedRoute.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useAuthStore } from '../store/authStore.js'
import { useEditorStore } from '../store/editorStore.js'
import { readEditorRecovery, writeEditorRecovery } from '../utils/editorRecovery.js'
import { MOBILE_EDITOR_QUERY, NARROW_EDITOR_QUERY } from '../utils/useMediaQuery.js'
import client from '../api/client.js'

const site = {
  id: 1, title: 'Source breakpoint', slug: 'source-breakpoint', published: false,
  category: 'other', tags: [], html: '', revision: 4,
  schema: { theme: {}, pages: [{
    id: 'home', name: 'Home', components: [{
      id: 'h1', type: 'heading', props: { text: 'Server text' }, styles: {},
      layout: { x: 20, y: 20, w: 400, h: 60 },
    }],
  }] },
}
const sourceDraft = '<h1>Source survives the phone preview</h1>'
const queries = new Map()
const SLOW = { timeout: 15000 }

function mountEditor() {
  return render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
    <Routes>
      <Route path="/editor/:id" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
      <Route path="/login" element={<p>Session ended</p>} />
    </Routes>
  </MemoryRouter></LanguageProvider></UiThemeProvider>)
}

async function setMobile(mobile) {
  for (const query of [MOBILE_EDITOR_QUERY, NARROW_EDITOR_QUERY]) window.matchMedia(query).matches = mobile
  // Both snapshots change together. The rail notification may arrive first.
  for (const query of [NARROW_EDITOR_QUERY, MOBILE_EDITOR_QUERY]) {
    await act(async () => {
      const media = window.matchMedia(query)
      for (const listener of [...queries.get(query).listeners]) listener({ matches: media.matches, media: query })
    })
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_canvasmode_1', 'source')
  useAuthStore.getState().setAuth('test-token', { id: 7, username: 'ada' })
  getSite.mockResolvedValue(structuredClone(site))
  updateSite.mockImplementation(async (id, payload) => ({ ...payload, slug: site.slug, revision: 5 }))
  listVersions.mockResolvedValue([{ id: 7, source: 'manual', pinned: true, label: 'Checkpoint', created_at: '2026-10-19T10:00:00Z' }])
  restoreVersion.mockResolvedValue({ ...structuredClone(site), revision: 6 })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  queries.clear()
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
    if (!queries.has(query)) {
      const listeners = new Set()
      queries.set(query, {
        matches: false, media: query, listeners,
        addEventListener: (name, listener) => listeners.add(listener),
        removeEventListener: (name, listener) => listeners.delete(listener),
      })
    }
    return queries.get(query)
  })
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})
afterEach(async () => {
  await act(async () => useAuthStore.getState().logout())
  vi.restoreAllMocks()
})

describe('component source ownership across phone preview', () => {
  it('keeps unapplied source when desktop authoring unmounts for phone preview', async () => {
    mountEditor()
    fireEvent.change(await screen.findByLabelText('HTML source editor', {}, SLOW), { target: { value: sourceDraft } })
    await setMobile(true)
    expect(screen.queryByLabelText('HTML source editor')).not.toBeInTheDocument()
    await setMobile(false)
    expect(await screen.findByLabelText('HTML source editor', {}, SLOW)).toHaveValue(sourceDraft)
    expect(useEditorStore.getState().schema.pages[0].mode).not.toBe('html')
    expect(screen.getByRole('button', { name: 'Apply HTML' })).toBeEnabled()
  }, 30000)

  it('keeps a source-only recovered draft after saving the canvas while phone preview is active', async () => {
    localStorage.setItem('pwb_autosave_on_1', '1')
    let resolveSave
    const response = new Promise((resolve) => { resolveSave = resolve })
    updateSite.mockImplementationOnce(() => response)
    await setMobile(true)
    const draft = writeEditorRecovery(7, 1, {
      schema: structuredClone(site.schema), title: site.title, currentPageId: 'home',
      codeDrafts: { 'index.html': sourceDraft },
    })
    mountEditor()
    fireEvent.click(await screen.findByRole('button', { name: 'Restore local draft' }, SLOW))
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(1), SLOW)
    expect(updateSite.mock.calls[0][1].schema.pages[0].mode).not.toBe('html')
    await act(async () => {
      resolveSave({ ...updateSite.mock.calls[0][1], slug: site.slug, revision: 5 })
      await response
    })
    expect(readEditorRecovery(7, 1)?.id).toBe(draft.id)
    await setMobile(false)
    expect(await screen.findByLabelText('HTML source editor', {}, SLOW)).toHaveValue(sourceDraft)
  }, 30000)

  it('backs up pending component source if the session expires during phone preview', async () => {
    mountEditor()
    fireEvent.change(await screen.findByLabelText('HTML source editor', {}, SLOW), { target: { value: sourceDraft } })
    await setMobile(true)
    await act(async () => {
      await client.get('/sites/1/', { adapter: async (config) => {
        throw Object.assign(new Error('Expired'), { config, response: { status: 401 } })
      } }).catch(() => {})
    })
    expect(readEditorRecovery(7, 1)?.codeDrafts).toEqual({ 'index.html': sourceDraft })
  }, 30000)

  it('does not keep an equal source draft dirty after canvas Undo, even with its panel unmounted', async () => {
    mountEditor()
    const original = (await screen.findByLabelText('HTML source editor', {}, SLOW)).value
    await act(async () => useEditorStore.getState().updateProps('h1', { text: 'New canvas text' }))
    expect(screen.getByLabelText('HTML source editor').value).toContain('New canvas text')
    fireEvent.change(screen.getByLabelText('HTML source editor'), { target: { value: original } })
    fireEvent.click(screen.getByTitle('Undo (Ctrl+Z)'))
    expect(screen.getByRole('button', { name: 'Apply HTML' })).toBeDisabled()
    await setMobile(true)
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })))
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(1), SLOW)
    await waitFor(() => expect(useEditorStore.getState().dirty).toBe(false))
    const unload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unload)
    expect(unload.defaultPrevented).toBe(false)
  }, 30000)

  it('saves pending source before a queued history load after its panel unmounts', async () => {
    let resolveSave
    const response = new Promise((resolve) => { resolveSave = resolve })
    updateSite.mockImplementationOnce(() => response)
    mountEditor()
    const source = await screen.findByLabelText('HTML source editor', {}, SLOW)
    fireEvent.click(screen.getByRole('button', { name: 'More actions', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: 'History', exact: true }))
    const history = await screen.findByRole('complementary', { name: 'Saves & history', exact: true }, SLOW)
    const load = await within(history).findByRole('button', { name: 'Load', exact: true })
    await waitFor(() => expect(load).toBeEnabled())
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })))
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(1), SLOW)
    fireEvent.change(source, { target: { value: sourceDraft } })
    fireEvent.click(load)
    await setMobile(true)
    await act(async () => {
      resolveSave({ ...updateSite.mock.calls[0][1], slug: site.slug, revision: 5 })
      await response
    })
    await waitFor(() => expect(restoreVersion).toHaveBeenCalledTimes(1), SLOW)
    expect(updateSite).toHaveBeenCalledTimes(2)
    expect(updateSite.mock.calls[1][1].schema.pages[0].mode).toBe('html')
    expect(updateSite.mock.calls[1][1].schema.pages[0].html).toContain(sourceDraft)
  }, 30000)
})
