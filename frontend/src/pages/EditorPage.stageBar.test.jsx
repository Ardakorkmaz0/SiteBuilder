// The bar over a canvas page, through the real editor page and store. A bar
// under 760px wide hides its zoom and browser frame (container queries, which
// jsdom does not run) and the ⋯ menu holds them instead: there they have to
// work exactly as they do in the bar.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

let site
vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => structuredClone(site)),
  updateSite: vi.fn(async (id, payload) => ({ ...payload, id, revision: 2 })),
  patchSite: vi.fn(async () => ({})),
}))
vi.mock('../api/config.js', () => ({ getPublicConfig: vi.fn(async () => ({ ai: { enabled: false } })) }))
vi.mock('../api/profile.js', () => ({
  getSavedThemes: vi.fn(async () => ({ themes: [], limit: 20 })),
  putSavedThemes: vi.fn(async () => ({ themes: [], limit: 20 })),
}))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useAuthStore } from '../store/authStore.js'
import { useEditorStore } from '../store/editorStore.js'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_editor_tour_v1', '1')
  localStorage.setItem('pwb_canvas_zoom', '100')
  localStorage.setItem('pwb_browser_frame', '0')
  useAuthStore.setState({ user: { id: 1, username: 'owner', is_guest: false }, token: 'test-token' })
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000)
  site = {
    id: 1, title: 'Bar', slug: 'bar', published: false,
    category: 'other', tags: [], html: '', site_options: {}, revision: 1,
    schema: { theme: {}, pages: [{ id: 'home', name: 'Home', canvasWidth: 1000, components: [
      { id: 'first', type: 'text', props: { text: 'Existing' }, styles: {}, layout: { x: 0, y: 0, w: 200, h: 40 } },
    ] }] },
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('the ⋯ menu of a canvas page', () => {
  it('holds the zoom and the browser frame, which work from there as they do in the bar', async () => {
    render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
      <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
    </MemoryRouter></LanguageProvider></UiThemeProvider>)
    await screen.findByRole('textbox', { name: 'Site title', exact: true })
    await waitFor(() => expect(useEditorStore.getState().schema.pages[0].components[0]?.id).toBe('first'))

    fireEvent.click(screen.getByRole('button', { name: 'Canvas tools', exact: true }))
    const menu = screen.getByText('Custom resolution').parentElement
    expect(within(menu).getByRole('button', { name: 'Zoom: 100% — click to fit' })).toBeInTheDocument()
    fireEvent.click(within(menu).getByRole('button', { name: 'Zoom the canvas in' }))
    expect(localStorage.getItem('pwb_canvas_zoom')).not.toBe('100')
    expect(within(menu).queryByRole('button', { name: 'Zoom: 100% — click to fit' })).toBeNull()

    fireEvent.click(within(menu).getByRole('button', { name: 'Show browser frame', pressed: false }))
    expect(localStorage.getItem('pwb_browser_frame')).toBe('1')
    expect(within(menu).getByRole('button', { name: 'Hide browser frame', pressed: true })).toBeInTheDocument()
  })
})
