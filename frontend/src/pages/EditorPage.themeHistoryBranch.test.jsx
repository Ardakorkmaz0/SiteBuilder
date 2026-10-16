import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const html = '<!doctype html><html><head><style>:root{--primary:#4f46e5}h1{color:var(--primary)}</style></head><body><h1>Home</h1></body></html>'
vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Theme branch', slug: 'theme-branch', published: false,
    category: 'other', tags: [], html: '', site_options: {}, revision: 1,
    schema: { theme: { primaryColor: '#4f46e5' }, pages: [{ id: 'home', name: 'Home', mode: 'html', html, components: [] }] },
  })),
  updateSite: vi.fn(async (id, payload) => ({ ...payload, id, slug: 'theme-branch', revision: 2 })),
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

const SLOW = { timeout: 15000 }
const source = () => screen.getByRole('textbox', { name: 'HTML source editor', exact: true })
const undo = () => screen.getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true })
const redo = () => screen.getByRole('button', { name: 'Redo (Ctrl+Shift+Z)', exact: true })
const setPrimary = (color) => {
  const palette = screen.getByRole('radiogroup', { name: 'Where the theme applies', exact: true }).closest('section')
  fireEvent.change(within(palette).getByRole('textbox', { name: 'Primary color', exact: true }), { target: { value: color } })
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_editor_tour_v1', '1')
  localStorage.setItem('pwb_htmlmode_1', 'source')
  useAuthStore.setState({ user: { id: 7, username: 'owner', is_guest: false }, token: 'test-token' })
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})

afterEach(() => { vi.restoreAllMocks() })

describe('a theme edit after undoing its document application', () => {
  it('ends document redo even when the new palette value coalesces into the earlier theme step', async () => {
    render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
      <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
    </MemoryRouter></LanguageProvider></UiThemeProvider>)
    await screen.findByRole('textbox', { name: 'HTML source editor', exact: true }, SLOW)
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: 'Theme', exact: true })) })
    const clock = vi.spyOn(Date, 'now').mockReturnValue(100000)
    setPrimary('#dc2626')
    fireEvent.click(screen.getByRole('button', { name: 'Apply to pages', exact: true }))
    await waitFor(() => expect(source().value).toContain('--primary:#dc2626'), SLOW)
    fireEvent.click(undo())
    expect(source().value).toContain('--primary:#4f46e5')
    expect(redo()).toBeEnabled()
    const previousSchemaHistory = useEditorStore.getState().past

    // A quick second colour choice continues the same field edit. It still
    // starts a new branch after Undo, even though the store merges the step.
    clock.mockReturnValue(100100)
    setPrimary('#166534')
    expect(useEditorStore.getState().schema.theme.primaryColor).toBe('#166534')
    expect(useEditorStore.getState().past).toBe(previousSchemaHistory)
    expect(redo()).toBeDisabled()
    expect(source().value).toContain('--primary:#4f46e5')
  }, 30000)
})
