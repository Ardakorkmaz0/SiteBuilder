import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const api = vi.hoisted(() => ({
  getSite: vi.fn(), updateSite: vi.fn(), patchSite: vi.fn(), listVersions: vi.fn(), restoreVersion: vi.fn(),
  liveToDraft: vi.fn(), sendVersionLive: vi.fn(), getVersionContent: vi.fn(),
  loadLocalFileHandle: vi.fn(), writeHtmlToHandle: vi.fn(),
}))
vi.mock('../api/sites.js', () => ({
  getSite: api.getSite, updateSite: api.updateSite, patchSite: api.patchSite,
  liveToDraft: api.liveToDraft, sendVersionLive: api.sendVersionLive,
}))
vi.mock('../api/versions.js', () => ({
  listVersions: api.listVersions, restoreVersion: api.restoreVersion, getVersionContent: api.getVersionContent,
  createCheckpoint: vi.fn(), overwriteVersion: vi.fn(), setVersionPinned: vi.fn(), deleteVersion: vi.fn(),
}))
vi.mock('../utils/localFile.js', async (importOriginal) => ({
  ...await importOriginal(), loadLocalFileHandle: api.loadLocalFileHandle, writeHtmlToHandle: api.writeHtmlToHandle,
}))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../store/editorStore.js'

const SLOW = { timeout: 15000 }
const doc = (text) => `<!doctype html><html><head><title>${text}</title></head><body><h1>${text}</h1></body></html>`
const clone = (value) => JSON.parse(JSON.stringify(value))
const savedHome = doc('Saved home content')
const savedAbout = doc('Saved about content')
const newHome = doc('New home content')
const newContact = doc('New contact content')
const titleInput = () => screen.getByRole('textbox', { name: 'Site title', exact: true })
const shownHtml = () => screen.getByTitle('site').getAttribute('srcdoc') || ''
const saveButton = () => screen.getByRole('button', { name: 'Save', exact: true })
const historyPanel = () => screen.getByRole('complementary', { name: 'Saves & history', exact: true })
const loadButton = () => within(historyPanel()).getByRole('button', { name: 'Load', exact: true })
const sendLiveRowButton = () => within(historyPanel()).getByRole('button', { name: 'Send live', exact: true })
const sendDraftLiveButton = () => screen.getByRole('button', { name: 'Send draft live', exact: true })
let server, publicDocuments

function savedSchema() {
  return { theme: {}, pages: [
    { id: 'saved_home', name: 'Home', mode: 'html', html: savedHome, components: [] },
    { id: 'saved_about', name: 'About', mode: 'html', html: savedAbout, components: [] },
  ] }
}

// The server's rule: a save changes the draft; pages sent with it make it live.
function saveOnServer(payload) {
  const { published_pages: pages, base_revision: baseRevision, ...fields } = clone(payload)
  void baseRevision
  server = { ...server, ...fields, revision: server.revision + 1 }
  if (pages) {
    publicDocuments = pages
    server.live_at = '2026-11-02T12:00:00Z'
  }
  server.live_differs = !pages
  return clone(server)
}

async function openEditor() {
  render(
    <UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
      <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
    </MemoryRouter></LanguageProvider></UiThemeProvider>,
  )
  await waitFor(() => expect(titleInput()).toHaveValue('Publication history'), SLOW)
  await waitFor(() => expect(shownHtml()).toContain('New home content'), SLOW)
  fireEvent.click(screen.getByRole('button', { name: 'More actions', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'History', exact: true }))
  await screen.findByRole('complementary', { name: 'Saves & history', exact: true }, SLOW)
  await waitFor(() => expect(loadButton()).toBeEnabled(), SLOW)
}

async function finishLoad() {
  await waitFor(() => expect(api.restoreVersion).toHaveBeenCalledTimes(1), SLOW)
  await waitFor(() => expect(loadButton()).toBeEnabled(), SLOW)
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  server = {
    id: 1, title: 'Publication history', slug: 'publication-history', published: true,
    live_at: '2026-10-30T09:00:00Z', live_differs: false,
    category: 'other', tags: [], site_options: {}, revision: 4, html: newHome,
    schema: { theme: {}, pages: [
      { id: 'current_home', name: 'Home', mode: 'html', html: newHome, components: [] },
      { id: 'current_contact', name: 'Contact', mode: 'html', html: newContact, components: [] },
    ] },
  }
  publicDocuments = [
    { path: '', title: 'New home', html: newHome },
    { path: 'contact', title: 'New contact', html: newContact },
  ]
  api.getSite.mockImplementation(async () => clone(server))
  api.updateSite.mockImplementation(async (id, payload) => saveOnServer(payload))
  api.patchSite.mockResolvedValue({})
  api.listVersions.mockResolvedValue([{ id: 7, source: 'manual', pinned: true, label: 'Public launch checkpoint', created_at: '2026-10-16T10:00:00Z' }])
  api.restoreVersion.mockImplementation(async () => {
    // The restore API replaces the document but cannot render its public pages.
    server = { ...server, schema: savedSchema(), html: savedHome, revision: server.revision + 1, live_differs: true }
    return clone(server)
  })
  api.getVersionContent.mockResolvedValue({ id: 7, schema: savedSchema(), html: savedHome })
  api.sendVersionLive.mockImplementation(async (id, versionId, pages) => {
    publicDocuments = clone(pages)
    server = { ...server, revision: server.revision + 1, live_at: '2026-11-02T12:00:00Z', live_differs: true }
    return clone(server)
  })
  api.liveToDraft.mockImplementation(async () => {
    server = { ...server, schema: savedSchema(), html: savedHome, revision: server.revision + 1, live_differs: false }
    return clone(server)
  })
  api.loadLocalFileHandle.mockResolvedValue(null)
  api.writeHtmlToHandle.mockResolvedValue(undefined)
})

describe('the history of a published site, with draft and live apart', () => {
  it('loads a version into the draft and leaves the live pages as they were', async () => {
    api.loadLocalFileHandle.mockResolvedValue({ handle: { name: 'linked.html' }, pageId: 'current_home' })
    await openEditor()

    fireEvent.click(loadButton())
    await finishLoad()

    expect(api.updateSite).not.toHaveBeenCalled()
    expect(publicDocuments.map((page) => page.path)).toEqual(['', 'contact'])
    expect(publicDocuments[0].html).toContain('New home content')
    expect(server.revision).toBe(5)
    expect(useEditorStore.getState().dirty).toBe(false)
    expect(api.writeHtmlToHandle).not.toHaveBeenCalled()
    expect(shownHtml()).toContain('Saved home content')
    // The loaded draft is ahead of the live site, so sending it is the next step.
    expect(sendDraftLiveButton()).toHaveClass('studio-btn-primary')
  }, 30000)

  it('does not send an extra save when the restored site is unpublished', async () => {
    server.published = false
    await openEditor()

    fireEvent.click(loadButton())
    await finishLoad()

    expect(api.updateSite).not.toHaveBeenCalled()
    expect(server.revision).toBe(5)
    expect(useEditorStore.getState().dirty).toBe(false)
    expect(shownHtml()).toContain('Saved home content')
  }, 30000)

  it('saves the draft without its pages, so visitors stay on the live version', async () => {
    await openEditor()
    fireEvent.change(titleInput(), { target: { value: 'Draft title' } })
    fireEvent.click(saveButton())
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(1), SLOW)

    const payload = api.updateSite.mock.calls[0][1]
    expect(payload.title).toBe('Draft title')
    expect(payload).not.toHaveProperty('published_pages')
    expect(publicDocuments[0].html).toContain('New home content')
  }, 30000)

  it('sends the loaded draft live with every page rendered from it', async () => {
    await openEditor()
    fireEvent.click(loadButton())
    await finishLoad()

    fireEvent.click(sendDraftLiveButton())
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(1), SLOW)
    const payload = api.updateSite.mock.calls[0][1]
    expect(payload.base_revision).toBe(5)
    expect(payload.published).toBe(true)
    expect(payload.published_pages.map((page) => page.path)).toEqual(['', 'about'])
    expect(publicDocuments[0].html).toContain('Saved home content')
    expect(publicDocuments[1].html).toContain('Saved about content')
    await waitFor(() => expect(sendDraftLiveButton()).toHaveClass('studio-btn-secondary'), SLOW)
  }, 30000)

  it('makes the draft live when an unpublished site is published', async () => {
    server.published = false
    await openEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Publish', exact: true }))
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(1), SLOW)
    const payload = api.updateSite.mock.calls[0][1]
    expect(payload.published).toBe(true)
    expect(payload.published_pages.map((page) => page.path)).toEqual(['', 'contact'])
    expect(await screen.findByRole('radiogroup', { name: 'Version shown' }, SLOW)).toBeInTheDocument()
  }, 30000)

  it('refreshes an open History when the header sends the draft live', async () => {
    await openEditor()
    const before = api.listVersions.mock.calls.length

    fireEvent.click(sendDraftLiveButton())

    await waitFor(() => expect(api.listVersions.mock.calls.length).toBe(before + 1), SLOW)
  }, 30000)

  it('sends one version live from History and keeps the draft on screen', async () => {
    await openEditor()

    fireEvent.click(sendLiveRowButton())
    await waitFor(() => expect(api.sendVersionLive).toHaveBeenCalledTimes(1), SLOW)

    const [id, versionId, pages, baseRevision] = api.sendVersionLive.mock.calls[0]
    expect(id).toBe('1')
    expect(versionId).toBe(7)
    expect(baseRevision).toBe(4)
    expect(pages.map((page) => page.path)).toEqual(['', 'about'])
    expect(pages[0].html).toContain('Saved home content')
    expect(pages[1].html).toContain('Saved about content')
    expect(api.getVersionContent).toHaveBeenCalledWith('1', 7)
    expect(api.updateSite).not.toHaveBeenCalled()
    expect(api.restoreVersion).not.toHaveBeenCalled()
    expect(shownHtml()).toContain('New home content')
  }, 30000)

  it('sends the draft live again from "Save mine anyway" after another device saved', async () => {
    api.updateSite.mockRejectedValueOnce({ response: { status: 409, data: { code: 'site_changed' } } })
    await openEditor()

    fireEvent.click(sendDraftLiveButton())
    expect(await screen.findByRole('alertdialog', { name: 'This site changed somewhere else' }, SLOW)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save mine anyway', exact: true }))
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(2), SLOW)

    const payload = api.updateSite.mock.calls[1][1]
    expect(payload).not.toHaveProperty('base_revision')
    expect(payload.published_pages.map((page) => page.path)).toEqual(['', 'contact'])
  }, 30000)

  it('changes between draft and live with the arrow keys', async () => {
    await openEditor()
    const versions = screen.getByRole('radiogroup', { name: 'Version shown' })
    const live = within(versions).getByRole('radio', { name: 'Live', exact: true })
    expect(live).toHaveAttribute('tabindex', '-1')

    fireEvent.keyDown(within(versions).getByRole('radio', { name: 'Draft', exact: true }), { key: 'ArrowRight' })

    expect(live).toHaveAttribute('aria-checked', 'true')
    expect(live).toHaveFocus()
    expect(screen.getByRole('region', { name: 'Live version' })).toBeInTheDocument()
  }, 30000)

  it('shows the live pages from the switch at the top and copies them into the draft', async () => {
    await openEditor()
    const versions = screen.getByRole('radiogroup', { name: 'Version shown' })
    fireEvent.click(within(versions).getByRole('radio', { name: 'Live', exact: true }))

    const live = screen.getByRole('region', { name: 'Live version' })
    expect(within(live).getByTitle('Live version').getAttribute('src')).toMatch(/\/s\/publication-history\/\?live=2026-10-30T09%3A00%3A00Z$/)
    fireEvent.click(within(live).getByRole('button', { name: 'Copy live to draft', exact: true }))

    await waitFor(() => expect(api.liveToDraft).toHaveBeenCalledWith('1'), SLOW)
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Live version' })).not.toBeInTheDocument(), SLOW)
    expect(within(versions).getByRole('radio', { name: 'Draft', exact: true })).toHaveAttribute('aria-checked', 'true')
    expect(shownHtml()).toContain('Saved home content')
    expect(api.updateSite).not.toHaveBeenCalled()
  }, 30000)
})
