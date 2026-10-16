import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'

const updateSite = vi.fn()
const sites = new Map()
vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async (id) => structuredClone(sites.get(Number(id)))),
  updateSite: (...args) => updateSite(...args),
  patchSite: vi.fn(async () => ({})),
}))
vi.mock('../api/config.js', () => ({ getPublicConfig: vi.fn(async () => ({ ai: { enabled: false } })) }))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useAuthStore } from '../store/authStore.js'
import { useEditorStore } from '../store/editorStore.js'
import { readEditorRecovery } from '../utils/editorRecovery.js'
import { resetVisits } from '../utils/lastVisited.js'

const SLOW = { timeout: 15000 }
const documentHtml = (text) => `<!doctype html><html><head></head><body><p>${text}</p></body></html>`
const component = (text) => ({
  id: 'heading', type: 'heading', props: { text }, styles: {},
  layout: { x: 20, y: 20, w: 400, h: 60 },
})
const site = (id, { html = false } = {}) => ({
  id, title: `Site ${id}`, slug: `site-${id}`, published: false, category: 'other', tags: [],
  html: '', site_options: {}, revision: id === 1 ? 4 : 20,
  schema: {
    theme: {},
    pages: [{
      id: `home-${id}`, name: 'Home',
      ...(html ? { mode: 'html', html: documentHtml(`Saved HTML of site ${id}`), components: [] }
        : { components: [component(`Saved component of site ${id}`)] }),
    }],
  },
})
const response = (id, payload) => ({ ...payload, id: Number(id), slug: `site-${id}`, revision: Number(id) === 1 ? 5 : 21 })
const source = () => screen.getByRole('textbox', { name: 'HTML source editor', exact: true })

function NavigateToSiteTwo() {
  const navigate = useNavigate()
  return <button type="button" onClick={() => navigate('/editor/2')}>Open site two</button>
}

beforeEach(() => {
  updateSite.mockReset()
  sites.clear()
  sites.set(1, site(1))
  sites.set(2, site(2))
  localStorage.clear()
  sessionStorage.clear()
  resetVisits()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_editor_tour_v1', '1')
  // Site A must flush on unmount. Site B stays quiet until the test saves it.
  localStorage.setItem('pwb_autosave_on_2', '0')
  useAuthStore.setState({ user: { id: 7, username: 'owner', is_guest: false }, token: 'test-token' })
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})

async function openEditor() {
  render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
    <NavigateToSiteTwo />
    <Routes>
      <Route path="/editor/:id" element={<EditorPage />} />
      <Route path="/profile" element={<h1>Outside the editor</h1>} />
    </Routes>
  </MemoryRouter></LanguageProvider></UiThemeProvider>)
  await waitFor(() => expect(useEditorStore.getState().currentPageId).toBe('home-1'), SLOW)
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Site title', exact: true })).toHaveValue('Site 1'), SLOW)
  expect(screen.getByRole('switch', { name: /^Auto-save/ })).toBeChecked()
}

async function startHeldSave({ auto = false, refuse = false } = {}) {
  let release
  updateSite.mockImplementationOnce((id, payload) => new Promise((resolve, reject) => {
    release = () => {
      if (refuse) reject({ response: { status: 409, data: { code: 'site_changed', detail: 'Another editor saved.' } } })
      else resolve(response(id, payload))
    }
  }))
  updateSite.mockImplementation(async (id, payload) => response(id, payload))
  await act(async () => {
    if (auto) {
      const previous = Object.getOwnPropertyDescriptor(document, 'visibilityState')
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
      try { document.dispatchEvent(new Event('visibilitychange')) }
      finally {
        if (previous) Object.defineProperty(document, 'visibilityState', previous)
        else delete document.visibilityState
      }
    } else fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Save', exact: true }))
  })
  await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(1), SLOW)
  return () => act(async () => { release() })
}

async function openSiteTwo() {
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Open site two', exact: true })) })
  await waitFor(() => expect(useEditorStore.getState().currentPageId).toBe('home-2'), SLOW)
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Site title', exact: true })).toHaveValue('Site 2'), SLOW)
  expect(screen.getByRole('switch', { name: /^Auto-save/ })).not.toBeChecked()
}

describe('queued saves after an editor is unmounted', () => {
  it('saves the departing component document without borrowing or acknowledging the next site', async () => {
    await openEditor()
    await act(async () => useEditorStore.getState().updateProps('heading', { text: 'First edit of site A' }))
    const release = await startHeldSave()
    expect(updateSite.mock.calls[0][1].schema.pages[0].components[0].props.text).toBe('First edit of site A')
    await act(async () => useEditorStore.getState().updateProps('heading', { text: 'Last edit of site A' }))

    await openSiteTwo()
    await act(async () => useEditorStore.getState().updateProps('heading', { text: 'Unsaved edit of site B' }))
    const siteBHistory = useEditorStore.getState().past
    await release()
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(2), SLOW)
    const [id, payload] = updateSite.mock.calls[1]
    expect(Number(id)).toBe(1)
    expect(payload.base_revision).toBe(5)
    expect.soft(payload.schema.pages[0].id).toBe('home-1')
    expect.soft(payload.schema.pages[0].components[0].props.text).toBe('Last edit of site A')
    expect.soft(JSON.stringify(payload)).not.toContain('Unsaved edit of site B')
    expect(useEditorStore.getState().schema.pages[0].components[0].props.text).toBe('Unsaved edit of site B')
    expect(useEditorStore.getState().dirty).toBe(true)
    expect(useEditorStore.getState().past).toBe(siteBHistory)
  }, 30000)

  it('captures pending HTML source before its workspace ref disappears', async () => {
    sites.set(1, site(1, { html: true }))
    localStorage.setItem('pwb_htmlmode_1', 'source')
    await openEditor()
    await waitFor(() => expect(source()).toHaveValue(documentHtml('Saved HTML of site 1')), SLOW)
    fireEvent.change(source(), { target: { value: documentHtml('First source edit of site A') } })
    const release = await startHeldSave()
    expect(updateSite.mock.calls[0][1].html).toContain('First source edit of site A')
    fireEvent.change(source(), { target: { value: documentHtml('Last unsaved source of site A') } })

    await openSiteTwo()
    await release()
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(2), SLOW)
    const [id, payload] = updateSite.mock.calls[1]
    expect(Number(id)).toBe(1)
    expect(payload.schema.pages[0].id).toBe('home-1')
    expect(payload.schema.pages[0].html).toContain('Last unsaved source of site A')
    expect(payload.html).toContain('Last unsaved source of site A')
    expect(JSON.stringify(payload)).not.toContain('Saved component of site 2')
    expect(useEditorStore.getState().currentPageId).toBe('home-2')
    expect(useEditorStore.getState().dirty).toBe(false)
  }, 30000)

  it('keeps a refused detached save under the departing site and account', async () => {
    await openEditor()
    await act(async () => useEditorStore.getState().updateProps('heading', { text: 'First edit of site A' }))
    const release = await startHeldSave()
    await act(async () => useEditorStore.getState().updateProps('heading', { text: 'Recover this final edit of site A' }))
    updateSite.mockRejectedValueOnce({ response: { status: 409, data: { code: 'site_changed', detail: 'Another editor saved.' } } })

    await openSiteTwo()
    await release()
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(2), SLOW)
    await waitFor(() => expect(readEditorRecovery(7, 1)).not.toBeNull(), SLOW)
    const draft = readEditorRecovery(7, 1)
    expect(draft.reason).toBe('site_changed')
    expect(String(draft.siteId)).toBe('1')
    expect(draft.currentPageId).toBe('home-1')
    expect(draft.schema.pages[0].components[0].props.text).toBe('Recover this final edit of site A')
    expect(JSON.stringify(draft)).not.toContain('Saved component of site 2')
    expect(readEditorRecovery(7, 2)).toBeNull()
    expect(readEditorRecovery(8, 1)).toBeNull()
    expect(screen.queryByRole('alertdialog', { name: 'This site changed somewhere else', exact: true })).not.toBeInTheDocument()
  }, 30000)

  it('retains unapplied component source in recovery after its component save succeeds', async () => {
    await openEditor()
    await act(async () => useEditorStore.getState().updateProps('heading', { text: 'Saved component edit of site A' }))
    const release = await startHeldSave()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Source', exact: true })) })
    await waitFor(() => expect(source().value).toContain('Saved component edit of site A'), SLOW)
    const pendingSource = documentHtml('Unapplied component source of site A')
    fireEvent.change(source(), { target: { value: pendingSource } })
    expect(screen.getByRole('button', { name: 'Apply HTML', exact: true })).toBeEnabled()

    await openSiteTwo()
    await release()
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(2), SLOW)
    expect(readEditorRecovery(7, 1)?.codeDrafts?.['index.html']).toBe(pendingSource)
    const draft = readEditorRecovery(7, 1)
    expect(draft.schema.pages[0].id).toBe('home-1')
    expect(draft.schema.pages[0].components[0].props.text).toBe('Saved component edit of site A')
    expect(readEditorRecovery(7, 2)).toBeNull()
    expect(useEditorStore.getState().currentPageId).toBe('home-2')
    expect(useEditorStore.getState().dirty).toBe(false)
  }, 30000)

  it('does not resurrect explicitly discarded work when an earlier automatic save is refused', async () => {
    await openEditor()
    await act(async () => useEditorStore.getState().updateProps('heading', { text: 'Automatic edit already in flight' }))
    const release = await startHeldSave({ auto: true, refuse: true })
    await act(async () => useEditorStore.getState().updateProps('heading', { text: 'Discard this final edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back to previous page', exact: true }))
    const leave = screen.getByRole('dialog', { name: 'Save before leaving?', exact: true })
    const discard = within(leave).getByRole('button', { name: 'Leave without saving', exact: true })
    expect(discard).toBeEnabled()
    await act(async () => { fireEvent.click(discard) })
    expect(screen.getByRole('heading', { name: 'Outside the editor', exact: true })).toBeInTheDocument()

    await release()
    expect(updateSite).toHaveBeenCalledTimes(1)
    expect(readEditorRecovery(7, 1)).toBeNull()
    expect(Object.keys(localStorage).some((key) => key.startsWith('pwb_editor_recovery_v1:'))).toBe(false)
  }, 30000)
})
