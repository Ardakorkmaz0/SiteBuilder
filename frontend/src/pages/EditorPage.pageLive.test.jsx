// Each file goes live on its own from the file list, through the real page, and
// Ctrl+Z takes it back in the running order of every other undo step.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const api = vi.hoisted(() => ({
  getSite: vi.fn(), updateSite: vi.fn(), patchSite: vi.fn(), sendPageLive: vi.fn(), setPageHidden: vi.fn(), swapLiveChange: vi.fn(),
  liveToDraft: vi.fn(),
  loadLocalFileHandle: vi.fn(),
}))
vi.mock('../api/sites.js', () => ({
  getSite: api.getSite, updateSite: api.updateSite, patchSite: api.patchSite,
  liveToDraft: api.liveToDraft, sendVersionLive: vi.fn(),
  sendPageLive: api.sendPageLive, setPageHidden: api.setPageHidden, swapLiveChange: api.swapLiveChange,
}))
vi.mock('../api/versions.js', () => ({
  listVersions: vi.fn(async () => []), restoreVersion: vi.fn(), getVersionContent: vi.fn(),
  createCheckpoint: vi.fn(), overwriteVersion: vi.fn(), setVersionPinned: vi.fn(), deleteVersion: vi.fn(),
}))
vi.mock('../utils/localFile.js', async (importOriginal) => ({
  ...await importOriginal(), loadLocalFileHandle: api.loadLocalFileHandle, writeHtmlToHandle: vi.fn(),
}))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../store/editorStore.js'

const SLOW = { timeout: 15000 }
const doc = (text) => `<!doctype html><html><head><title>${text}</title></head><body><h1>${text}</h1></body></html>`
const clone = (value) => JSON.parse(JSON.stringify(value))
let server

function answer(changes) {
  server = { ...server, ...changes, revision: server.revision + 1 }
  return clone(server)
}

async function openEditor() {
  render(
    <UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
      <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
    </MemoryRouter></LanguageProvider></UiThemeProvider>,
  )
  await screen.findByRole('button', { name: 'about.html' }, SLOW)
}

const fileRow = (name) => screen.getByRole('button', { name, exact: true }).parentElement
const pick = (file, item, role = 'menuitem') => {
  fireEvent.contextMenu(fileRow(file), { clientX: 40, clientY: 50 })
  fireEvent.click(within(screen.getByRole('menu', { name: `Options for ${file}` })).getByRole(role, { name: item }))
}
const ctrlZ = (shiftKey = false) => fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey })
const state = (file) => fileRow(file).dataset.liveState

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  server = {
    id: 1, title: 'Files', slug: 'files', published: true, category: 'other', tags: [], site_options: {},
    revision: 4, html: doc('Home'), live_at: '2026-11-01T09:00:00Z', live_differs: true,
    page_live: { home: 'live', about: 'older' }, private_pages: [], live_undo: null,
    schema: { theme: {}, pages: [
      { id: 'home', name: 'Home', mode: 'html', html: doc('Home'), components: [] },
      { id: 'about', name: 'About', mode: 'html', html: doc('About'), components: [] },
      { id: 'team', name: 'Team', mode: 'html', html: doc('Team'), components: [] },
    ] },
  }
  api.getSite.mockImplementation(async () => clone(server))
  api.updateSite.mockImplementation(async (id, payload) => answer({ schema: payload.schema, html: payload.html, title: payload.title, live_undo: null }))
  api.patchSite.mockResolvedValue({})
  api.loadLocalFileHandle.mockResolvedValue(null)
  api.sendPageLive.mockImplementation(async (id, page) => answer({
    page_live: { ...server.page_live, [page.pageId]: 'live' }, live_undo: 11,
  }))
  api.swapLiveChange.mockImplementation(async (id, snapshot) => answer({
    page_live: { home: 'live', about: snapshot === 11 ? 'older' : 'live' }, live_undo: snapshot === 11 ? 12 : 13,
  }))
  api.setPageHidden.mockImplementation(async (id, pageId, hidden) => answer({
    private_pages: hidden ? [pageId] : [], page_live: { home: 'live' }, live_undo: 21,
  }))
})

describe('a file in the list', () => {
  it('shows what the server says of it', async () => {
    await openEditor()

    expect(state('index.html')).toBe('live')
    expect(state('about.html')).toBe('older')
    expect(state('team.html')).toBe('none')
  }, 30000)

  it('goes live alone, rendered from the draft, and turns green', async () => {
    await openEditor()

    pick('about.html', 'Go live')

    await waitFor(() => expect(api.sendPageLive).toHaveBeenCalledTimes(1), SLOW)
    const [id, page, baseRevision] = api.sendPageLive.mock.calls[0]
    expect(id).toBe('1')
    expect(page.pageId).toBe('about')
    expect(page.path).toBe('about')
    expect(page.html).toContain('<h1>About</h1>')
    expect(baseRevision).toBe(4)
    // Nothing was unsaved, so nothing else was written.
    expect(api.updateSite).not.toHaveBeenCalled()
    await waitFor(() => expect(state('about.html')).toBe('live'), SLOW)
  }, 30000)

  it('saves work on screen first, so the page sent is the page on screen', async () => {
    await openEditor()
    useEditorStore.setState({ dirty: true })

    pick('about.html', 'Go live')

    await waitFor(() => expect(api.sendPageLive).toHaveBeenCalledTimes(1), SLOW)
    expect(api.updateSite).toHaveBeenCalledTimes(1)
    expect(api.updateSite.mock.calls[0][1]).not.toHaveProperty('published_pages')
    expect(api.updateSite.mock.invocationCallOrder[0]).toBeLessThan(api.sendPageLive.mock.invocationCallOrder[0])
    // Sent from the revision that save produced.
    expect(api.sendPageLive.mock.calls[0][2]).toBe(5)
  }, 30000)

  it('warns before going live while the home page is not', async () => {
    server.page_live = {}
    window.confirm.mockReturnValue(false)
    await openEditor()

    pick('about.html', 'Go live')

    await waitFor(() => expect(window.confirm).toHaveBeenCalled(), SLOW)
    expect(window.confirm.mock.calls[0][0]).toContain('The home page is not live yet')
    expect(api.sendPageLive).not.toHaveBeenCalled()
  }, 30000)

  it('asks the existing question when another device saved first', async () => {
    api.sendPageLive.mockRejectedValueOnce({ response: { status: 409, data: { code: 'site_changed' } } })
    await openEditor()

    pick('about.html', 'Go live')

    expect(await screen.findByRole('alertdialog', { name: 'This site changed somewhere else' }, SLOW)).toBeInTheDocument()
    expect(state('about.html')).toBe('older')
  }, 30000)

  it('stays off the public site from the menu, and Ctrl+Z brings it back', async () => {
    await openEditor()

    pick('about.html', 'Do not show in public', 'menuitemcheckbox')

    await waitFor(() => expect(api.setPageHidden).toHaveBeenCalledWith('1', 'about', true, 4), SLOW)
    await waitFor(() => expect(within(fileRow('about.html')).getByText('hidden')).toBeInTheDocument(), SLOW)
    expect(state('about.html')).toBe('none')

    api.swapLiveChange.mockImplementationOnce(async () => answer({ private_pages: [], page_live: { home: 'live', about: 'older' }, live_undo: 22 }))
    ctrlZ()

    await waitFor(() => expect(api.swapLiveChange).toHaveBeenCalledWith('1', 21, 5), SLOW)
    await waitFor(() => expect(state('about.html')).toBe('older'), SLOW)
    expect(within(fileRow('about.html')).queryByText('hidden')).not.toBeInTheDocument()
  }, 30000)
})

describe('a block the server would drop', () => {
  it('is refused out loud, in the status line', async () => {
    await openEditor()

    act(() => useEditorStore.setState((state) => ({ insertRefusals: state.insertRefusals + 1 })))

    expect(await screen.findByText('This place is full or nested too deeply, so the block was not added.', {}, SLOW)).toBeInTheDocument()
  }, 30000)
})

describe('Ctrl+Z after going live', () => {
  async function sent() {
    await openEditor()
    pick('about.html', 'Go live')
    await waitFor(() => expect(state('about.html')).toBe('live'), SLOW)
  }

  it('takes it back, and Ctrl+Shift+Z brings it back with the snapshot the server handed over', async () => {
    await sent()

    ctrlZ()
    await waitFor(() => expect(api.swapLiveChange).toHaveBeenLastCalledWith('1', 11, 5), SLOW)
    await waitFor(() => expect(state('about.html')).toBe('older'), SLOW)

    ctrlZ(true)
    await waitFor(() => expect(api.swapLiveChange).toHaveBeenLastCalledWith('1', 12, 6), SLOW)
    await waitFor(() => expect(state('about.html')).toBe('live'), SLOW)

    // And the step can be undone again, with the newest snapshot.
    ctrlZ()
    await waitFor(() => expect(api.swapLiveChange).toHaveBeenLastCalledWith('1', 13, 7), SLOW)
  }, 30000)

  it('does not touch the draft', async () => {
    await sent()
    const before = useEditorStore.getState().schema

    ctrlZ()
    await waitFor(() => expect(state('about.html')).toBe('older'), SLOW)

    expect(useEditorStore.getState().schema).toBe(before)
    expect(api.updateSite).not.toHaveBeenCalled()
  }, 30000)

  it('keeps the next save on the revision the undo moved to', async () => {
    await sent()
    ctrlZ()
    await waitFor(() => expect(state('about.html')).toBe('older'), SLOW)

    useEditorStore.setState({ dirty: true })
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }))

    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(1), SLOW)
    expect(api.updateSite.mock.calls[0][1].base_revision).toBe(6)
  }, 30000)

  it('leaves a revision someone else moved for the next save to discover', async () => {
    await sent()
    api.swapLiveChange.mockImplementationOnce(async () => {
      server = { ...server, revision: server.revision + 5 }
      return clone({ ...server, page_live: { home: 'live', about: 'older' }, live_undo: 12 })
    })
    ctrlZ()
    await waitFor(() => expect(state('about.html')).toBe('older'), SLOW)

    useEditorStore.setState({ dirty: true })
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }))

    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(1), SLOW)
    expect(api.updateSite.mock.calls[0][1].base_revision).toBe(5)
  }, 30000)

  it('asks the existing question when another tab changed the site since, and takes nothing back', async () => {
    await sent()
    api.swapLiveChange.mockRejectedValueOnce({ response: { status: 409, data: { code: 'site_changed' } } })

    ctrlZ()

    expect(await screen.findByRole('alertdialog', { name: 'This site changed somewhere else' }, SLOW)).toBeInTheDocument()
    expect(api.swapLiveChange).toHaveBeenCalledWith('1', 11, 5)
    expect(state('about.html')).toBe('live')
  }, 30000)

  it('ends with taking the site offline: nothing older can bring it back', async () => {
    await sent()
    api.updateSite.mockImplementationOnce(async (id, payload) => answer({
      schema: payload.schema, html: payload.html, title: payload.title,
      published: false, page_live: {}, live_at: null, live_undo: null,
    }))

    fireEvent.click(screen.getByRole('button', { name: 'Published', exact: true }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish', exact: true })).toBeInTheDocument(), SLOW)
    expect(api.updateSite.mock.calls[0][1].published).toBe(false)

    ctrlZ()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish', exact: true })).toBeInTheDocument(), SLOW)
    expect(api.swapLiveChange).not.toHaveBeenCalled()
  }, 30000)

  it('keeps a redo when undoing the first send is what took the site offline', async () => {
    server = { ...server, published: false, page_live: {} }
    api.sendPageLive.mockImplementationOnce(async (id, page) => answer({ published: true, page_live: { [page.pageId]: 'live' }, live_undo: 11 }))
    await openEditor()
    pick('index.html', 'Go live')
    await waitFor(() => expect(state('index.html')).toBe('live'), SLOW)

    api.swapLiveChange.mockImplementationOnce(async () => answer({ published: false, page_live: {}, live_undo: 12 }))
    ctrlZ()
    await waitFor(() => expect(state('index.html')).toBe('none'), SLOW)

    // A save of the draft in between: the site was already offline.
    useEditorStore.setState({ dirty: true })
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }))
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(1), SLOW)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save', exact: true })).toBeEnabled(), SLOW)

    api.swapLiveChange.mockImplementationOnce(async () => answer({ published: true, page_live: { home: 'live' }, live_undo: 13 }))
    ctrlZ(true)

    await waitFor(() => expect(api.swapLiveChange).toHaveBeenLastCalledWith('1', 12, 7), SLOW)
    await waitFor(() => expect(state('index.html')).toBe('live'), SLOW)
  }, 30000)

  it('does not reach past copying live to draft: the last thing done was not the send', async () => {
    await sent()
    api.liveToDraft.mockImplementationOnce(async () => answer({ live_undo: null }))
    fireEvent.click(screen.getByRole('radio', { name: 'Live' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Copy live to draft' }, SLOW))
    await waitFor(() => expect(api.liveToDraft).toHaveBeenCalledTimes(1), SLOW)
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Draft' })).toHaveAttribute('aria-checked', 'true'), SLOW)

    ctrlZ()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(api.swapLiveChange).not.toHaveBeenCalled()
    expect(state('about.html')).toBe('live')
  }, 30000)

  it('undoes a page edit made after it first, and the send after that', async () => {
    await sent()
    useEditorStore.getState().renamePage('team', 'Crew')
    await screen.findByRole('button', { name: 'crew.html' }, SLOW)

    ctrlZ()
    await screen.findByRole('button', { name: 'team.html' }, SLOW)
    expect(api.swapLiveChange).not.toHaveBeenCalled()

    ctrlZ()
    await waitFor(() => expect(api.swapLiveChange).toHaveBeenCalledWith('1', 11, 5), SLOW)
  }, 30000)

  it('undoes the send before a page edit made earlier', async () => {
    await openEditor()
    useEditorStore.getState().renamePage('team', 'Crew')
    await screen.findByRole('button', { name: 'crew.html' }, SLOW)
    pick('about.html', 'Go live')
    await waitFor(() => expect(state('about.html')).toBe('live'), SLOW)

    ctrlZ()

    await waitFor(() => expect(api.swapLiveChange).toHaveBeenCalledWith('1', 11, 6), SLOW)
    expect(screen.getByRole('button', { name: 'crew.html' })).toBeInTheDocument()
  }, 30000)

  it('stops offering it when the server no longer has it, and says so', async () => {
    api.swapLiveChange.mockRejectedValueOnce({ response: { status: 404, data: { code: 'live_undo_gone', detail: 'This change can no longer be taken back.' } } })
    await sent()

    ctrlZ()
    expect(await screen.findByText('This change can no longer be taken back.', {}, SLOW)).toBeInTheDocument()

    ctrlZ()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(api.swapLiveChange).toHaveBeenCalledTimes(1)
  }, 30000)

  it('ends what could be redone when a new edit comes after the undo', async () => {
    await sent()
    ctrlZ()
    await waitFor(() => expect(state('about.html')).toBe('older'), SLOW)
    useEditorStore.getState().renamePage('team', 'Crew')
    await screen.findByRole('button', { name: 'crew.html' }, SLOW)

    ctrlZ(true)
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(api.swapLiveChange).toHaveBeenCalledTimes(1)
  }, 30000)

  it('takes back sending the whole site from the header as well', async () => {
    api.updateSite.mockImplementationOnce(async (id, payload) => answer({
      schema: payload.schema, html: payload.html, page_live: { home: 'live', about: 'live', team: 'live' }, live_undo: 31,
    }))
    await openEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Send draft live', exact: true }))
    await waitFor(() => expect(state('team.html')).toBe('live'), SLOW)
    expect(api.updateSite.mock.calls[0][1].published_pages.map((page) => page.pageId)).toEqual(['home', 'about', 'team'])

    ctrlZ()

    await waitFor(() => expect(api.swapLiveChange).toHaveBeenCalledWith('1', 31, 5), SLOW)
  }, 30000)

  it('is offered by the Undo button too', async () => {
    await sent()

    fireEvent.click(screen.getByTitle('Undo (Ctrl+Z)'))

    await waitFor(() => expect(api.swapLiveChange).toHaveBeenCalledWith('1', 11, 5), SLOW)
  }, 30000)
})
