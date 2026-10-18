import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const { getSite, updateSite } = vi.hoisted(() => ({ getSite: vi.fn(), updateSite: vi.fn() }))
vi.mock('../api/sites.js', () => ({ getSite, updateSite, patchSite: vi.fn() }))
vi.mock('../api/config.js', () => ({ getPublicConfig: vi.fn(async () => ({ ai: { enabled: false } })) }))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useAuthStore } from '../store/authStore.js'
import { MOBILE_EDITOR_QUERY, NARROW_EDITOR_QUERY } from '../utils/useMediaQuery.js'

const source = () => screen.getByRole('textbox', { name: 'HTML source editor', exact: true })
const documentHtml = (text) => `<html><head></head><body><h1 id="t">${text}</h1></body></html>`
const savedHtml = documentHtml('Saved HTML')
let media

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_editor_tour_v1', '1')
  useAuthStore.setState({ user: { id: 7, username: 'owner' }, token: 'test-token' })
  getSite.mockResolvedValue({
    id: 1, title: 'Breakpoint HTML', slug: 'breakpoint-html', published: false,
    category: 'other', tags: [], html: '', revision: 1,
    schema: { theme: {}, pages: [{ id: 'home', name: 'Home', mode: 'html', html: savedHtml, components: [] }] },
  })
  updateSite.mockImplementation(async (id, payload) => ({ id: Number(id), ...payload, revision: 2 }))
  media = new Map()
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
    if (!media.has(query)) {
      const listeners = new Set()
      media.set(query, {
        matches: false, media: query,
        addEventListener: (_, listener) => listeners.add(listener),
        removeEventListener: (_, listener) => listeners.delete(listener),
        listeners,
      })
    }
    return media.get(query)
  })
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})
afterEach(() => vi.restoreAllMocks())

async function openEditor(mode) {
  localStorage.setItem('pwb_htmlmode_1', mode)
  render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
    <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
  </MemoryRouter></LanguageProvider></UiThemeProvider>)
  if (mode === 'source') await waitFor(() => expect(source()).toHaveValue(savedHtml), { timeout: 15000 })
  else await screen.findByTitle('site', {}, { timeout: 15000 })
}
async function setPhone(value) {
  for (const query of [MOBILE_EDITOR_QUERY, NARROW_EDITOR_QUERY]) window.matchMedia(query).matches = value
  for (const query of [NARROW_EDITOR_QUERY, MOBILE_EDITOR_QUERY]) {
    await act(async () => {
      const mql = media.get(query)
      for (const listener of [...mql.listeners]) listener({ matches: value, media: query })
    })
  }
}

describe('HTML workspace handoff to phone preview', () => {
  it('retains source typed before a phone-width transition', async () => {
    await openEditor('source')
    const pendingHtml = documentHtml('Source typed before resize')
    fireEvent.change(source(), { target: { value: pendingHtml } })
    await setPhone(true)
    expect(screen.getByRole('main', { name: 'Mobile site preview', exact: true })).toBeInTheDocument()
    expect(screen.getByTitle('Previewing Home').getAttribute('srcdoc')).toContain('Source typed before resize')
    await setPhone(false)
    expect(source()).toHaveValue(pendingHtml)
    fireEvent.click(screen.getByTitle('Undo (Ctrl+Z)'))
    expect(source()).toHaveValue(savedHtml)
    fireEvent.click(screen.getByTitle('Redo (Ctrl+Shift+Z)'))
    expect(source()).toHaveValue(pendingHtml)
  }, 30000)

  it('retains iframe typing before its dirty debounce when entering phone preview', async () => {
    await openEditor('edit')
    const iframe = screen.getByTitle('site')
    iframe.contentDocument.body.innerHTML = '<h1 id="t">Saved HTML</h1>'
    fireEvent.load(iframe)
    const doc = iframe.contentDocument
    await act(async () => {
      doc.getElementById('t').textContent = 'Live iframe typing before resize'
      doc.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await setPhone(true)
    expect(screen.getByRole('main', { name: 'Mobile site preview', exact: true })).toBeInTheDocument()
    expect(screen.getByTitle('Previewing Home').getAttribute('srcdoc')).toContain('Live iframe typing before resize')
  }, 30000)
})
