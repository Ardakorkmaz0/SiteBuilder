import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const api = vi.hoisted(() => ({
  getSite: vi.fn(), updateSite: vi.fn(), listVersions: vi.fn(), restoreVersion: vi.fn(),
}))
vi.mock('../api/sites.js', () => ({ getSite: api.getSite, updateSite: api.updateSite, patchSite: vi.fn() }))
vi.mock('../api/versions.js', () => ({
  listVersions: api.listVersions, restoreVersion: api.restoreVersion,
  createCheckpoint: vi.fn(), overwriteVersion: vi.fn(), setVersionPinned: vi.fn(), deleteVersion: vi.fn(),
}))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { MOBILE_EDITOR_QUERY, NARROW_EDITOR_QUERY } from '../utils/useMediaQuery.js'

const SLOW = { timeout: 15000 }
const authoredHtml = '<!doctype html>\n<html><head><title>Authored About</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="custom.css"></head>\n<body>  About draft with intentional spacing\n<script src="runtime.js"></script><script src="custom.js"></script></body></html>\n'
const componentHtml = '<!doctype html><html><head><title>Canvas draft</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="custom.css"></head><body><h1>Pending canvas source</h1><script src="runtime.js"></script><script src="custom.js"></script></body></html>'
const initialSite = {
  id: 1, title: 'Source document flush', slug: 'source-document-flush', revision: 4,
  published: false, category: 'other', tags: [], html: '',
  schema: {
    theme: {}, customCss: '.custom-proof { display: grid; }', customJs: 'window.customProof = 42;',
    pages: [
      { id: 'home', name: 'Home', components: [{
        id: 'heading', type: 'heading', props: { text: 'Canvas before draft' }, styles: {},
        layout: { x: 20, y: 20, w: 400, h: 60 },
      }] },
      { id: 'about', name: 'About', mode: 'html', html: '<h1>Saved authored About</h1>', components: [] },
    ],
  },
}
const clone = (value) => structuredClone(value)
const queries = new Map()
let server, backups

async function setPhonePreview() {
  for (const query of [MOBILE_EDITOR_QUERY, NARROW_EDITOR_QUERY]) window.matchMedia(query).matches = true
  for (const query of [NARROW_EDITOR_QUERY, MOBILE_EDITOR_QUERY]) {
    await act(async () => {
      const media = queries.get(query)
      for (const listener of [...media.listeners]) listener({ matches: true, media: query })
    })
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  server = clone(initialSite)
  backups = []
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_canvasmode_1', 'source')
  api.getSite.mockImplementation(async () => clone(server))
  api.updateSite.mockImplementation(async (id, payload) => {
    server = { ...server, ...clone(payload), revision: server.revision + 1 }
    return clone(server)
  })
  api.listVersions.mockResolvedValue([{
    id: 7, source: 'manual', pinned: true, label: 'Checkpoint', created_at: '2026-10-19T10:00:00Z',
  }])
  api.restoreVersion.mockImplementation(async () => {
    backups.push(clone(server))
    server = { ...clone(initialSite), title: 'Loaded checkpoint', revision: server.revision + 1 }
    return clone(server)
  })
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

afterEach(() => vi.restoreAllMocks())

describe('source document conversion with the source panel unmounted', () => {
  it('preserves authored HTML exactly and embeds canvas assets in the backup before a queued history load', async () => {
    let resolveSave
    const response = new Promise((resolve) => { resolveSave = resolve })
    api.updateSite.mockImplementationOnce(async (id, payload) => {
      server = { ...server, ...clone(payload), revision: server.revision + 1 }
      const saved = clone(server)
      await response
      return saved
    })
    render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
      <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
    </MemoryRouter></LanguageProvider></UiThemeProvider>)
    const source = await screen.findByRole('textbox', { name: 'HTML source editor', exact: true }, SLOW)
    fireEvent.click(screen.getByRole('button', { name: 'More actions', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: 'History', exact: true }))
    const history = await screen.findByRole('complementary', { name: 'Saves & history', exact: true }, SLOW)
    const load = await within(history).findByRole('button', { name: 'Load', exact: true })
    await waitFor(() => expect(load).toBeEnabled(), SLOW)
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })))
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(1), SLOW)

    fireEvent.change(source, { target: { value: componentHtml } })
    fireEvent.click(screen.getByRole('button', { name: 'HTMLabout.html', exact: true }))
    fireEvent.change(screen.getByRole('textbox', { name: 'HTML source editor', exact: true }), { target: { value: authoredHtml } })
    fireEvent.click(load)
    await setPhonePreview()
    expect(screen.queryByRole('textbox', { name: 'HTML source editor', exact: true })).not.toBeInTheDocument()
    expect(api.restoreVersion).not.toHaveBeenCalled()
    await act(async () => { resolveSave(); await response })

    await waitFor(() => expect(api.restoreVersion).toHaveBeenCalledTimes(1), SLOW)
    expect(api.getSite).toHaveBeenCalledTimes(1)
    expect(api.updateSite).toHaveBeenCalledTimes(2)
    expect(backups).toHaveLength(1)
    const payload = api.updateSite.mock.calls[1][1]
    expect(payload.base_revision).toBe(5)
    expect(payload.schema.pages[1].html).toBe(authoredHtml)
    expect(backups[0].schema.pages[1].html).toBe(authoredHtml)
    expect(backups[0].schema.pages[1].mode).toBe('html')
    const canvasHtml = backups[0].schema.pages[0].html
    expect(payload.schema.pages[0].html).toBe(canvasHtml)
    expect(canvasHtml).toContain('<h1>Pending canvas source</h1>')
    expect(canvasHtml).toContain('<style data-pwb-project-styles>')
    expect(canvasHtml).toContain('<style data-pwb-custom-styles>\n.custom-proof { display: grid; }\n</style>')
    expect(canvasHtml).toContain('<script data-pwb-project-runtime>')
    expect(canvasHtml).toContain('<script data-pwb-custom-script>\nwindow.customProof = 42;\n</script>')
    expect(canvasHtml).not.toContain('href="styles.css"')
    expect(canvasHtml).not.toContain('src="runtime.js"')
  }, 30000)
})
