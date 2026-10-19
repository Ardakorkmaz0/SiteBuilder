import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const api = vi.hoisted(() => ({ getSite: vi.fn(), updateSite: vi.fn() }))
const disk = vi.hoisted(() => ({ loadLocalFileHandle: vi.fn(), writeHtmlToHandle: vi.fn() }))
vi.mock('../api/sites.js', () => ({ getSite: api.getSite, updateSite: api.updateSite, patchSite: vi.fn() }))
vi.mock('../utils/localFile.js', async (importOriginal) => ({
  ...await importOriginal(),
  loadLocalFileHandle: disk.loadLocalFileHandle,
  writeHtmlToHandle: disk.writeHtmlToHandle,
}))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../store/editorStore.js'

const SLOW = { timeout: 15000 }
const HOME = '<!doctype html><html><body><h1>Home document</h1></body></html>'
const LINKED = '<!doctype html><html><body><h1>Linked document</h1></body></html>'
const IMPORTED = '<!doctype html><html><body><h1>Imported unrelated home</h1></body></html>'
const handle = { name: 'linked.html' }

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_canvasmode_1', 'source')
  localStorage.setItem('pwb_htmlmode_1', 'source')
  disk.loadLocalFileHandle.mockResolvedValue({ handle, pageId: 'linked' })
  disk.writeHtmlToHandle.mockResolvedValue()
  api.getSite.mockResolvedValue({
    id: 1, title: 'Linked project', slug: 'linked-project', revision: 2,
    published: false, category: 'other', tags: [], html: HOME,
    schema: { theme: {}, pages: [
      { id: 'home', name: 'Home', mode: 'html', html: HOME, components: [] },
      { id: 'linked', name: 'Linked', mode: 'html', html: LINKED, components: [] },
    ] },
  })
  api.updateSite.mockImplementation(async (id, payload) => ({ ...payload, id, revision: 3, slug: 'linked-project' }))
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})

afterEach(() => vi.restoreAllMocks())

async function openEditor() {
  render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
    <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
  </MemoryRouter></LanguageProvider></UiThemeProvider>)
  fireEvent.click(await screen.findByRole('button', { name: 'Source', exact: true }, SLOW))
  await screen.findByRole('textbox', { name: 'HTML source editor', exact: true }, SLOW)
  await screen.findByText('· linked.html', { exact: true }, SLOW)
}

async function saveNow() {
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', {
    key: 's', ctrlKey: true, bubbles: true, cancelable: true,
  })))
  await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(1), SLOW)
}

describe('saving a linked local HTML file', () => {
  it('shows a mode-less legacy wrapper document after import while preserving its canvas design', async () => {
    await openEditor()
    const input = document.querySelector('input[type="file"][accept=".json,application/json"]')
    const file = new File([JSON.stringify({
      format: 'sitebuilder-project', version: 1,
      site: { html: IMPORTED, schema: { pages: [{
        id: 'legacy', name: 'Legacy', components: [{
          id: 'legacy_canvas', type: 'text', props: { text: 'Kept canvas' },
          styles: {}, layout: { x: 10, y: 10, w: 200, h: 60 },
        }],
      }] } },
    })], 'legacy.json', { type: 'application/json' })
    await act(async () => fireEvent.change(input, { target: { files: [file] } }))
    await waitFor(() => expect(useEditorStore.getState().currentPageId).toBe('legacy'), SLOW)
    expect(useEditorStore.getState().schema.pages[0].mode).toBe('html')
    expect(useEditorStore.getState().schema.pages[0].components[0].props.text).toBe('Kept canvas')
    fireEvent.click(screen.getByRole('button', { name: 'View', exact: true }))
    await waitFor(() => expect(screen.getByTitle('site').getAttribute('srcdoc')).toContain('Imported unrelated home'), SLOW)
    await saveNow()
    expect(api.updateSite.mock.calls[0][1].schema.pages[0].html).toBe(IMPORTED)
    expect(api.updateSite.mock.calls[0][1].schema.pages[0].mode).toBe('html')
    expect(disk.writeHtmlToHandle).not.toHaveBeenCalled()
  }, 30000)

  it('writes the linked page while another page is active', async () => {
    await openEditor()
    await saveNow()
    expect(disk.writeHtmlToHandle).toHaveBeenCalledExactlyOnceWith(handle, LINKED)
    expect(api.updateSite.mock.calls[0][1].html).toBe(HOME)
  }, 30000)

  it('does not overwrite the old file with a different home after a project import removes its page', async () => {
    await openEditor()
    const input = document.querySelector('input[type="file"][accept=".json,application/json"]')
    const file = new File([JSON.stringify({ pages: [
      { id: 'imported', name: 'Imported', mode: 'html', html: IMPORTED, components: [] },
    ] })], 'replacement.json', { type: 'application/json' })
    await act(async () => fireEvent.change(input, { target: { files: [file] } }))
    await waitFor(() => expect(useEditorStore.getState().schema.pages.map((page) => page.id)).toEqual(['imported']), SLOW)
    await saveNow()
    expect(api.updateSite.mock.calls[0][1].html).toBe(IMPORTED)
    expect(disk.writeHtmlToHandle).not.toHaveBeenCalled()
  }, 30000)

  it('does not empty the old HTML file when an imported project changes its linked page to a canvas', async () => {
    await openEditor()
    const input = document.querySelector('input[type="file"][accept=".json,application/json"]')
    const file = new File([JSON.stringify({ pages: [{
      id: 'linked', name: 'Canvas now', mode: 'empty', components: [{
        id: 'imported_canvas', type: 'text', props: { text: 'A component design' },
        styles: {}, layout: { x: 10, y: 10, w: 200, h: 60 },
      }],
    }] })], 'canvas.json', { type: 'application/json' })
    await act(async () => fireEvent.change(input, { target: { files: [file] } }))
    await waitFor(() => expect(useEditorStore.getState().currentPageId).toBe('linked'), SLOW)
    await saveNow()
    expect(api.updateSite.mock.calls[0][1].schema.pages[0].mode).toBe('empty')
    expect(disk.writeHtmlToHandle).not.toHaveBeenCalled()
  }, 30000)

  it('writes an intentionally emptied linked document instead of leaving stale disk contents', async () => {
    await openEditor()
    await act(async () => useEditorStore.getState().selectPage('linked'))
    const source = await screen.findByRole('textbox', { name: 'HTML source editor', exact: true }, SLOW)
    await waitFor(() => expect(source).toHaveValue(LINKED), SLOW)
    fireEvent.change(source, { target: { value: '' } })
    await saveNow()
    expect(api.updateSite.mock.calls[0][1].schema.pages.find((page) => page.id === 'linked').html).toBe('')
    expect(disk.writeHtmlToHandle).toHaveBeenCalledExactlyOnceWith(handle, '')
  }, 30000)

  it('keeps a legacy handle without a page id linked to the home page', async () => {
    disk.loadLocalFileHandle.mockResolvedValue(handle)
    await openEditor()
    await saveNow()
    expect(disk.writeHtmlToHandle).toHaveBeenCalledExactlyOnceWith(handle, HOME)
  }, 30000)
})
