import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

const { getSite, updateSite } = vi.hoisted(() => ({ getSite: vi.fn(), updateSite: vi.fn() }))
vi.mock('../api/sites.js', () => ({ getSite, updateSite, patchSite: vi.fn() }))

import EditorPage from './EditorPage.jsx'
import ProtectedRoute from '../routes/ProtectedRoute.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../store/editorStore.js'
import { useAuthStore } from '../store/authStore.js'
import { readEditorRecovery, writeEditorRecovery } from '../utils/editorRecovery.js'
import client from '../api/client.js'

const site = {
  id: 1, title: 'Recovery', slug: 'recovery', published: false, category: 'other', tags: [], html: '',
  schema: { theme: {}, pages: [
    { id: 'home', name: 'Home', components: [{ id: 'h1', type: 'heading', props: { text: 'Server text' }, styles: {}, layout: { x: 20, y: 20, w: 400, h: 60 } }] },
    { id: 'html', name: 'HTML', mode: 'html', html: '<h1>Server HTML</h1>', components: [] },
  ] },
}
const SLOW = { timeout: 15000 }
function LoginLocation() {
  const location = useLocation()
  return <p>Sign in for {location.state?.from}</p>
}
function mountEditor() {
  return render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
    <Routes>
      <Route path="/editor/:id" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
      <Route path="/login" element={<LoginLocation />} />
    </Routes>
  </MemoryRouter></LanguageProvider></UiThemeProvider>)
}
async function openEditor() {
  const view = mountEditor()
  await waitFor(() => expect(document.querySelector('[data-cid="h1"]')).toBeTruthy(), SLOW)
  return view
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  useAuthStore.getState().setAuth('token', { id: 7, username: 'ada' })
  getSite.mockResolvedValue(structuredClone(site))
  updateSite.mockImplementation(async (id, payload) => ({ ...payload, slug: 'recovery' }))
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})
afterEach(async () => { await act(async () => useAuthStore.getState().logout()); vi.restoreAllMocks() })

describe('session expiry recovery', () => {
  it('keeps an expired guest’s work open for export because it has no login credentials', async () => {
    useAuthStore.getState().setAuth('guest-token', { id: 7, is_guest: true })
    await openEditor()
    await act(async () => useEditorStore.getState().updateProps('h1', { text: 'Guest work' }))
    await act(async () => {
      await client.get('/sites/1/', { adapter: async (config) => {
        throw Object.assign(new Error('Expired'), { config, response: { status: 401 } })
      } }).catch(() => {})
    })
    expect(useAuthStore.getState().token).toBe('guest-token')
    expect(screen.getByText(/guest session expired/)).toBeInTheDocument()
    expect(JSON.stringify(readEditorRecovery(7, 1).schema)).toContain('Guest work')
  }, 30000)

  it('does not reseed an already applied source draft after switching pages', async () => {
    const schema = structuredClone(site.schema)
    schema.pages.push({ id: 'other', name: 'Other', components: [] })
    writeEditorRecovery(7, 1, {
      schema, title: 'Recovery', currentPageId: 'home',
      codeDrafts: { 'index.html': '<h1>Original recovered source</h1>' },
    })
    mountEditor()
    fireEvent.click(await screen.findByRole('button', { name: 'Restore local draft' }, SLOW))
    await waitFor(() => expect(screen.getByLabelText('HTML source editor')).toHaveValue('<h1>Original recovered source</h1>'), SLOW)
    fireEvent.click(screen.getByRole('button', { name: 'Apply HTML' }))
    await waitFor(() => expect(useEditorStore.getState().schema.pages[0].mode).toBe('html'), SLOW)
    const source = await screen.findByLabelText('HTML source editor', {}, SLOW)
    fireEvent.change(source, { target: { value: '<h1>Newer applied HTML</h1>' } })
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })))
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(1), SLOW)
    expect(updateSite.mock.calls[0][1].schema.pages[0].html).toBe('<h1>Newer applied HTML</h1>')
    await act(async () => useEditorStore.getState().selectPage('other'))
    await screen.findByText('Source workspace', {}, SLOW)
    // Revisit Home's file in the remounted component source panel.
    fireEvent.click(screen.getByRole('button', { name: /index\.html/i }))
    expect(screen.getByLabelText('HTML source editor')).toHaveValue('<h1>Newer applied HTML</h1>')
    expect(screen.getByRole('button', { name: 'Apply HTML' })).toBeDisabled()
  }, 30000)

  it('preserves unapplied source drafts separately from the component design', async () => {
    localStorage.setItem('pwb_canvasmode_1', 'source')
    const view = mountEditor()
    const source = await screen.findByLabelText('HTML source editor', {}, SLOW)
    fireEvent.change(source, { target: { value: '<h1>Unapplied source draft</h1>' } })
    await act(async () => {
      await client.get('/sites/1/', { adapter: async (config) => {
        throw Object.assign(new Error('Expired'), { config, response: { status: 401 } })
      } }).catch(() => {})
    })
    const draft = readEditorRecovery(7, 1)
    expect(Object.values(draft.codeDrafts)).toContain('<h1>Unapplied source draft</h1>')
    expect(draft.schema.pages[0].mode).not.toBe('html')
    view.unmount()
    useAuthStore.getState().setAuth('new-token', { id: 7, username: 'ada' })
    mountEditor()
    fireEvent.click(await screen.findByRole('button', { name: 'Restore local draft' }, SLOW))
    await waitFor(() => expect(screen.getByLabelText('HTML source editor')).toHaveValue('<h1>Unapplied source draft</h1>'), SLOW)
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })))
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(1), SLOW)
    // Saving the applied design must not erase pending source work.
    expect(readEditorRecovery(7, 1)?.id).toBe(draft.id)
  }, 30000)

  it('backs up the live canvas and page HTML before the 401 redirect, then restores and saves', async () => {
    const view = await openEditor()
    await act(async () => useEditorStore.getState().updateProps('h1', { text: 'Unsaved canvas' }))
    await act(async () => {
      await client.get('/sites/1/', { adapter: async (config) => {
        throw Object.assign(new Error('Expired'), { config, response: { status: 401 } })
      } }).catch(() => {})
    })
    expect(await screen.findByText('Sign in for /editor/1')).toBeInTheDocument()
    const draft = readEditorRecovery(7, 1)
    expect(JSON.stringify(draft.schema)).toContain('Unsaved canvas')
    expect(draft.schema.pages[1].html).toContain('Server HTML')
    expect(updateSite).not.toHaveBeenCalled()
    view.unmount()

    useAuthStore.getState().setAuth('new-token', { id: 7, username: 'ada' })
    await openEditor()
    fireEvent.click(await screen.findByRole('button', { name: 'Restore local draft' }, SLOW))
    await waitFor(() => expect(JSON.stringify(useEditorStore.getState().schema)).toContain('Unsaved canvas'), SLOW)
    expect(useEditorStore.getState().dirty).toBe(true)
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })))
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(1), SLOW)
    expect(updateSite.mock.calls[0][1].schema.pages[1].html).toContain('Server HTML')
    await waitFor(() => expect(readEditorRecovery(7, 1)).toBeNull(), SLOW)
  }, 30000)

  it('keeps the current work accessible when both backup stores reject writes', async () => {
    await openEditor()
    await act(async () => useEditorStore.getState().updateProps('h1', { text: 'Keep open' }))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota') })
    updateSite.mockImplementationOnce(() => client.put('/sites/1/', {}, { adapter: async (config) => {
      throw Object.assign(new Error('Expired'), { config, response: { status: 401 } })
    } }))
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }))
    })
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(1), SLOW)
    expect(useAuthStore.getState().token).toBe('token')
    expect(screen.getByText(/local draft could not be saved/)).toBeInTheDocument()
    expect(JSON.stringify(useEditorStore.getState().schema)).toContain('Keep open')
  }, 30000)

  it('does not offer a different account’s draft', async () => {
    writeEditorRecovery(8, 1, { schema: site.schema, title: 'Private draft' })
    await openEditor()
    expect(screen.queryByText('Recover your unsaved work?')).not.toBeInTheDocument()
  }, 30000)

  it('lets the user discard the local draft without overwriting the server', async () => {
    writeEditorRecovery(7, 1, { schema: site.schema, title: 'Private draft' })
    await openEditor()
    fireEvent.click(await screen.findByRole('button', { name: 'Keep server version' }, SLOW))
    expect(readEditorRecovery(7, 1)).toBeNull()
    expect(useEditorStore.getState().dirty).toBe(false)
    expect(updateSite).not.toHaveBeenCalled()
  }, 30000)
})
