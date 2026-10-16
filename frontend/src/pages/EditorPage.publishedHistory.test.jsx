import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const api = vi.hoisted(() => ({
  getSite: vi.fn(), updateSite: vi.fn(), patchSite: vi.fn(), listVersions: vi.fn(), restoreVersion: vi.fn(),
  loadLocalFileHandle: vi.fn(), writeHtmlToHandle: vi.fn(),
}))
vi.mock('../api/sites.js', () => ({ getSite: api.getSite, updateSite: api.updateSite, patchSite: api.patchSite }))
vi.mock('../api/versions.js', () => ({
  listVersions: api.listVersions, restoreVersion: api.restoreVersion,
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
const deferred = () => {
  let resolve
  const promise = new Promise((yes) => { resolve = yes })
  return { promise, resolve }
}
const titleInput = () => screen.getByRole('textbox', { name: 'Site title', exact: true })
const shownHtml = () => screen.getByTitle('site').getAttribute('srcdoc') || ''
const saveButton = () => screen.getByRole('button', { name: 'Save', exact: true })
const historyPanel = () => screen.getByRole('complementary', { name: 'Saves & history', exact: true })
const loadButton = () => within(historyPanel()).getByRole('button', { name: 'Load', exact: true })
let server, publicDocuments

function savedSchema() {
  return { theme: {}, pages: [
    { id: 'saved_home', name: 'Home', mode: 'html', html: savedHome, components: [] },
    { id: 'saved_about', name: 'About', mode: 'html', html: savedAbout, components: [] },
  ] }
}

function saveOnServer(payload) {
  server = { ...server, ...clone(payload), revision: server.revision + 1 }
  if (payload.published_pages) publicDocuments = clone(payload.published_pages)
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
    server = { ...server, schema: savedSchema(), html: savedHome, revision: server.revision + 1 }
    return clone(server)
  })
  api.loadLocalFileHandle.mockResolvedValue(null)
  api.writeHtmlToHandle.mockResolvedValue(undefined)
})

describe('loading the history of a published site', () => {
  it('replaces every public page through the save queue using the restored revision and skips a local file write', async () => {
    api.loadLocalFileHandle.mockResolvedValue({ handle: { name: 'linked.html' }, pageId: 'current_home' })
    await openEditor()

    fireEvent.click(loadButton())
    await finishLoad()

    expect(api.updateSite).toHaveBeenCalledTimes(1)
    const [id, payload, options] = api.updateSite.mock.calls[0]
    expect(id).toBe('1')
    expect(payload.base_revision).toBe(5)
    expect(payload.published).toBe(true)
    expect(payload.schema.pages.map((page) => page.id)).toEqual(['saved_home', 'saved_about'])
    expect(payload.html).toContain('Saved home content')
    expect(payload.published_pages.map((page) => page.path)).toEqual(['', 'about'])
    expect(payload.published_pages[0].html).toContain('Saved home content')
    expect(payload.published_pages[1].html).toContain('Saved about content')
    expect(options).toEqual({ saveSource: 'checkpoint' })
    expect(publicDocuments.map((page) => page.path)).toEqual(['', 'about'])
    expect(publicDocuments[0].html).not.toContain('New home content')
    expect(server.revision).toBe(6)
    expect(useEditorStore.getState().dirty).toBe(false)
    expect(api.writeHtmlToHandle).not.toHaveBeenCalled()
    expect(shownHtml()).toContain('Saved home content')
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

  it('keeps the restored document dirty after a publication failure and lets Save retry it', async () => {
    api.updateSite.mockRejectedValueOnce({ response: { status: 500, data: { code: 'save_failed', detail: 'Publication sync failed.' } } })
    await openEditor()

    fireEvent.click(loadButton())
    await finishLoad()

    expect(await screen.findByText('Publication sync failed.', {}, SLOW)).toBeInTheDocument()
    expect(useEditorStore.getState().dirty).toBe(true)
    expect(shownHtml()).toContain('Saved home content')
    expect(publicDocuments[0].html).toContain('New home content')
    fireEvent.click(saveButton())
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(2), SLOW)
    await waitFor(() => expect(useEditorStore.getState().dirty).toBe(false), SLOW)
    expect(api.updateSite.mock.calls[1][1].base_revision).toBe(5)
    expect(publicDocuments.map((page) => page.path)).toEqual(['', 'about'])
    expect(publicDocuments[0].html).toContain('Saved home content')
    expect(api.restoreVersion).toHaveBeenCalledTimes(1)
  }, 30000)

  it('opens the existing conflict choice if another device saves before the publication sync', async () => {
    api.updateSite.mockRejectedValueOnce({ response: { status: 409, data: { code: 'site_changed' } } })
    await openEditor()

    fireEvent.click(loadButton())
    await finishLoad()

    expect(await screen.findByRole('alertdialog', { name: 'This site changed somewhere else' }, SLOW)).toBeInTheDocument()
    expect(useEditorStore.getState().dirty).toBe(true)
    expect(shownHtml()).toContain('Saved home content')
    fireEvent.click(screen.getByRole('button', { name: 'Save mine anyway', exact: true }))
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(2), SLOW)
    await waitFor(() => expect(useEditorStore.getState().dirty).toBe(false), SLOW)
    expect(api.updateSite.mock.calls[1][1]).not.toHaveProperty('base_revision')
    expect(api.updateSite.mock.calls[1][1].published).toBe(true)
    expect(publicDocuments.map((page) => page.path)).toEqual(['', 'about'])
    expect(api.restoreVersion).toHaveBeenCalledTimes(1)
  }, 30000)

  it('does not acknowledge metadata typed while the publication response is held', async () => {
    const response = deferred()
    api.updateSite.mockImplementationOnce(async (id, payload) => {
      const saved = saveOnServer(payload)
      await response.promise
      return saved
    })
    await openEditor()

    fireEvent.click(loadButton())
    await waitFor(() => expect(api.restoreVersion).toHaveBeenCalledTimes(1), SLOW)
    // Waiting for this boundary also proves Load owns the publication write.
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(1), SLOW)
    expect(loadButton()).toBeDisabled()
    fireEvent.change(titleInput(), { target: { value: 'Typed during publication' } })
    await act(async () => response.resolve())
    await waitFor(() => expect(loadButton()).toBeEnabled(), SLOW)

    expect(titleInput()).toHaveValue('Typed during publication')
    expect(api.updateSite.mock.calls[0][1].title).toBe('Publication history')
    fireEvent.click(saveButton())
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(2), SLOW)
    expect(api.updateSite.mock.calls[1][1].title).toBe('Typed during publication')
    expect(api.updateSite.mock.calls[1][1].base_revision).toBe(6)
    expect(api.updateSite.mock.calls[1][1].published_pages.map((page) => page.path)).toEqual(['', 'about'])
  }, 30000)
})
