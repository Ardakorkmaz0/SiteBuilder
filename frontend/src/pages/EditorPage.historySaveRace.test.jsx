import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'

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
const site = (text = 'Current C', revision = 4, id = 1) => ({
  id, title: text, slug: `site-${id}`, published: false, category: 'other', tags: [], site_options: {}, revision, html: doc(text),
  schema: { theme: {}, pages: [{ id: 'page_home', name: 'Home', mode: 'html', html: doc(text), components: [] }] },
})
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
let server, backups
const shownHtml = () => screen.getByTitle('site').getAttribute('srcdoc') || ''
const titleInput = () => screen.getByRole('textbox', { name: 'Site title', exact: true })
const changeTitle = (value) => fireEvent.change(titleInput(), { target: { value } })
const saveButton = () => screen.getByRole('button', { name: 'Save', exact: true })
const loadButton = () => within(screen.getByRole('complementary', { name: 'Saves & history', exact: true })).getByRole('button', { name: 'Load', exact: true })

function GoToSecondEditor() {
  const navigate = useNavigate()
  return <button type="button" onClick={() => navigate('/editor/2')}>Open site two</button>
}

async function openEditor({ components = false } = {}) {
  if (components) {
    server.html = ''
    server.schema.pages = [{ id: 'page_home', name: 'Home', components: [{ id: 'heading', type: 'heading', props: { text: 'Current C' }, styles: {}, layout: { x: 20, y: 20, w: 400, h: 60 } }] }]
  }
  render(
    <UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
      <GoToSecondEditor />
      <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
    </MemoryRouter></LanguageProvider></UiThemeProvider>,
  )
  await waitFor(() => expect(titleInput()).toHaveValue('Current C'), SLOW)
  if (!components) await waitFor(() => expect(shownHtml()).toContain('Current C'), SLOW)
  fireEvent.click(screen.getByRole('button', { name: 'More actions', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'History', exact: true }))
  await screen.findByRole('complementary', { name: 'Saves & history', exact: true }, SLOW)
  await waitFor(() => expect(loadButton()).toBeEnabled(), SLOW)
}

function saveOnServer(payload) {
  server = { ...server, ...clone(payload), revision: server.revision + 1 }
  return clone(server)
}
function restoreOnServer() {
  backups.push(clone(server))
  server = site('Checkpoint A', server.revision + 1)
  server.schema.pages[0].id = 'checkpoint_home'
  return clone(server)
}

beforeEach(() => {
  vi.clearAllMocks()
  server = site()
  backups = []
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_autosave_on_2', '0')
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  api.getSite.mockImplementation(async (id) => id === '2' ? site('Second editor B', 12, 2) : clone(server))
  api.updateSite.mockImplementation(async (id, payload) => saveOnServer(payload))
  api.patchSite.mockResolvedValue({ revision: 5, site_options: { seo: { title: 'SEO title' } } })
  api.listVersions.mockResolvedValue([{ id: 7, source: 'manual', pinned: true, label: 'Checkpoint A', created_at: '2026-10-16T10:00:00Z' }])
  api.restoreVersion.mockImplementation(async () => restoreOnServer())
  api.loadLocalFileHandle.mockResolvedValue(null)
  api.writeHtmlToHandle.mockResolvedValue(undefined)
})

describe('history loads share the editor save queue', () => {
  it('waits for a linked-file write before loading so the old save cannot overwrite the checkpoint', async () => {
    const disk = deferred()
    api.loadLocalFileHandle.mockResolvedValue({ handle: { name: 'linked.html' }, pageId: 'page_home' })
    api.writeHtmlToHandle.mockReturnValueOnce(disk.promise)
    await openEditor()
    fireEvent.click(saveButton())
    await waitFor(() => expect(api.writeHtmlToHandle).toHaveBeenCalledTimes(1), SLOW)
    fireEvent.click(loadButton())
    await act(async () => {})
    expect(api.restoreVersion).not.toHaveBeenCalled()
    await act(async () => disk.resolve())
    await waitFor(() => expect(shownHtml()).toContain('Checkpoint A'), SLOW)
    expect(api.updateSite).toHaveBeenCalledTimes(1)
    expect(api.restoreVersion).toHaveBeenCalledTimes(1)
    expect(server.html).toContain('Checkpoint A')
    expect(backups[0].html).toContain('Current C')
  }, 30000)

  it('waits for a save whose server write finished but whose response is still held', async () => {
    const response = deferred()
    api.updateSite.mockImplementationOnce(async (id, payload) => {
      const saved = saveOnServer(payload)
      await response.promise
      return saved
    })
    await openEditor()
    fireEvent.click(saveButton())
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(1), SLOW)
    fireEvent.click(loadButton())
    await act(async () => {})
    expect(api.restoreVersion).not.toHaveBeenCalled()
    await act(async () => response.resolve())
    await waitFor(() => expect(shownHtml()).toContain('Checkpoint A'), SLOW)
    expect(server.html).toContain('Checkpoint A')
    expect(api.restoreVersion).toHaveBeenCalledTimes(1)
  }, 30000)

  it('snapshots metadata edited while the load waited behind another save', async () => {
    const response = deferred()
    api.updateSite.mockImplementationOnce(async (id, payload) => {
      const saved = saveOnServer(payload)
      await response.promise
      return saved
    })
    await openEditor()
    fireEvent.click(saveButton())
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(1), SLOW)
    fireEvent.click(loadButton())
    changeTitle('Latest queued title D')
    await act(async () => response.resolve())
    await waitFor(() => expect(shownHtml()).toContain('Checkpoint A'), SLOW)
    expect(api.updateSite).toHaveBeenCalledTimes(2)
    expect(api.updateSite.mock.calls[1][1].title).toBe('Latest queued title D')
    expect(api.updateSite.mock.calls[1][1].base_revision).toBe(5)
    expect(backups[0].title).toBe('Latest queued title D')
  }, 30000)

  it('saves again when metadata changes during the pre-load save', async () => {
    const response = deferred()
    api.updateSite.mockImplementationOnce(async (id, payload) => {
      const saved = saveOnServer(payload)
      await response.promise
      return saved
    })
    await openEditor()
    changeTitle('Pre-save D')
    fireEvent.click(loadButton())
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(1), SLOW)
    changeTitle('Typed during pre-save E')
    await act(async () => response.resolve())
    await waitFor(() => expect(shownHtml()).toContain('Checkpoint A'), SLOW)
    expect(api.updateSite).toHaveBeenCalledTimes(2)
    expect(backups).toHaveLength(1)
    expect(backups[0].title).toBe('Typed during pre-save E')
    expect(api.updateSite.mock.calls[1][1].base_revision).toBe(5)
  }, 30000)

  it('preserves an edit made during restore by saving and snapshotting it before retrying the load', async () => {
    const response = deferred()
    api.restoreVersion.mockImplementationOnce(async () => {
      const restored = restoreOnServer()
      await response.promise
      return restored
    })
    await openEditor()
    fireEvent.click(loadButton())
    await waitFor(() => expect(api.restoreVersion).toHaveBeenCalledTimes(1), SLOW)
    changeTitle('Typed during restore E')
    await act(async () => response.resolve())
    await waitFor(() => expect(api.restoreVersion).toHaveBeenCalledTimes(2), SLOW)
    await waitFor(() => expect(titleInput()).toHaveValue('Checkpoint A'), SLOW)
    expect(backups).toHaveLength(2)
    expect(backups[1].title).toBe('Typed during restore E')
    expect(api.updateSite).toHaveBeenCalledTimes(1)
    expect(api.updateSite.mock.calls[0][1].base_revision).toBe(5)
  }, 30000)

  it('stops after three changing restores and keeps the latest dirty draft with the latest server revision', async () => {
    const responses = [deferred(), deferred(), deferred()]
    api.restoreVersion.mockImplementation(async () => {
      const index = backups.length
      const restored = restoreOnServer()
      await responses[index].promise
      return restored
    })
    await openEditor()
    fireEvent.click(loadButton())
    for (let index = 0; index < 3; index += 1) {
      await waitFor(() => expect(api.restoreVersion).toHaveBeenCalledTimes(index + 1), SLOW)
      changeTitle(`Continuously typed ${index + 1}`)
      await act(async () => responses[index].resolve())
    }
    expect(await screen.findByText('Your work kept changing while the save was loading. Nothing on screen was replaced. Try loading again when you finish editing.', {}, SLOW)).toBeInTheDocument()
    expect(titleInput()).toHaveValue('Continuously typed 3')
    expect(useEditorStore.getState().dirty).toBe(true)
    expect(api.restoreVersion).toHaveBeenCalledTimes(3)
    expect(api.updateSite).toHaveBeenCalledTimes(2)
    fireEvent.click(saveButton())
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(3), SLOW)
    expect(api.updateSite.mock.calls[2][1].base_revision).toBe(9)
    expect(server.title).toBe('Continuously typed 3')
  }, 30000)

  it('flushes an unapplied component HTML draft before creating the recovery snapshot', async () => {
    await openEditor({ components: true })
    fireEvent.click(screen.getByRole('button', { name: 'Source', exact: true }))
    const source = await screen.findByRole('textbox', { name: 'HTML source editor', exact: true }, SLOW)
    fireEvent.change(source, { target: { value: doc('Pending HTML draft D') } })
    fireEvent.click(loadButton())
    await waitFor(() => expect(api.restoreVersion).toHaveBeenCalledTimes(1), SLOW)
    await waitFor(() => expect(titleInput()).toHaveValue('Checkpoint A'), SLOW)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit', exact: true }, SLOW))
    await waitFor(() => expect(shownHtml()).toContain('Checkpoint A'), SLOW)
    expect(api.updateSite).toHaveBeenCalledTimes(1)
    expect(backups[0].schema.pages[0].html).toContain('Pending HTML draft D')
    expect(backups[0].html).toContain('Pending HTML draft D')
  }, 30000)

  it.each([
    { status: 409, code: 'site_changed', detail: 'This site changed somewhere else' },
    { status: 500, code: 'save_failed', detail: 'Test server refused the pre-load save.' },
  ])('loads nothing when the pre-load save fails with $status', async ({ status, code, detail }) => {
    api.updateSite.mockRejectedValue({ response: { status, data: { code, detail } } })
    await openEditor()
    changeTitle('Keep this unsaved draft D')
    fireEvent.click(loadButton())
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(1), SLOW)
    await waitFor(() => expect(loadButton()).toBeEnabled(), SLOW)
    expect(api.restoreVersion).not.toHaveBeenCalled()
    expect(titleInput()).toHaveValue('Keep this unsaved draft D')
    expect(shownHtml()).toContain('Current C')
    if (status === 409) expect(await screen.findByRole('alertdialog', { name: detail }, SLOW)).toBeInTheDocument()
    else expect(await screen.findByText(detail, {}, SLOW)).toBeInTheDocument()
  }, 30000)

  it('keeps the revision attached to saved content during a linked disk write and an SEO update', async () => {
    const disk = deferred()
    api.loadLocalFileHandle.mockResolvedValue({ handle: { name: 'linked.html' }, pageId: 'page_home' })
    api.writeHtmlToHandle.mockReturnValueOnce(disk.promise)
    await openEditor()
    fireEvent.click(saveButton())
    await waitFor(() => expect(api.writeHtmlToHandle).toHaveBeenCalledTimes(1), SLOW)
    fireEvent.click(screen.getByRole('button', { name: 'More actions', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Site control center', exact: true }))
    const center = await screen.findByRole('dialog', { name: 'Site control center', exact: true }, SLOW)
    fireEvent.change(within(center).getByRole('textbox', { name: 'SEO title', exact: true }), { target: { value: 'SEO title' } })
    fireEvent.click(within(center).getByRole('button', { name: 'Save SEO settings', exact: true }))
    await waitFor(() => expect(api.patchSite).toHaveBeenCalledTimes(1), SLOW)
    await waitFor(() => expect(within(center).getByRole('button', { name: 'Save SEO settings', exact: true })).toBeEnabled(), SLOW)
    fireEvent.click(within(center).getByRole('button', { name: 'Close', exact: true }))
    await act(async () => disk.resolve())
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(1), SLOW)
    expect(api.updateSite.mock.calls[0][1].base_revision).toBe(4)
    expect(api.updateSite.mock.calls[0][1].html).toContain('Current C')
  }, 30000)

  it('does not apply or retry an old restore after navigating to another editor', async () => {
    const response = deferred()
    api.restoreVersion.mockImplementationOnce(async () => {
      const restored = restoreOnServer()
      await response.promise
      return restored
    })
    await openEditor()
    fireEvent.click(loadButton())
    await waitFor(() => expect(api.restoreVersion).toHaveBeenCalledTimes(1), SLOW)
    fireEvent.click(screen.getByRole('button', { name: 'Open site two', exact: true }))
    await waitFor(() => expect(shownHtml()).toContain('Second editor B'), SLOW)
    await act(async () => response.resolve())
    expect(titleInput()).toHaveValue('Second editor B')
    expect(shownHtml()).toContain('Second editor B')
    expect(useEditorStore.getState().schema.pages[0].id).toBe('page_home')
    expect(api.restoreVersion).toHaveBeenCalledTimes(1)
    expect(api.updateSite).not.toHaveBeenCalled()
  }, 30000)
})
