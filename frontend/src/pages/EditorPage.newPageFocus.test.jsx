import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import EditorPage from './EditorPage.jsx'
import { useEditorStore } from '../store/editorStore.js'

const state = vi.hoisted(() => ({ initialMode: 'html' }))
vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Focus review', slug: 'focus-review', published: false, category: 'other', tags: [],
    schema: { theme: {}, pages: [{ id: 'html-home', name: 'Home', mode: state.initialMode, html: state.initialMode === 'html' ? '<h1>HTML home</h1>' : '', components: [] }] },
    html: state.initialMode === 'html' ? '<h1>HTML home</h1>' : '',
  })),
  updateSite: vi.fn(async (id, payload) => ({ ...payload, id, slug: 'focus-review' })),
  patchSite: vi.fn(async () => ({})),
}))
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})
// The page list is a different panel in each editor mode, so a new page in
// the other mode mounted a fresh list and the focus meant for it was lost
// (round 10 review).
describe('a new page takes focus', () => {
  it.each([['html', 'html'], ['html', 'empty'], ['empty', 'empty'], ['empty', 'html']])('from a %s page to a new %s page', async (initialMode, pickedMode) => {
    state.initialMode = initialMode
    const user = userEvent.setup()
    render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
      <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
    </MemoryRouter></LanguageProvider></UiThemeProvider>)
    await user.click(await screen.findByRole('button', { name: '+ File', exact: true }, { timeout: 15000 }))
    screen.getByRole('button', { name: pickedMode === 'html' ? /^HTML page/ : /^Empty canvas/ }).focus()
    await user.keyboard('{Enter}')
    const added = useEditorStore.getState().schema.pages[1]
    expect(added.mode).toBe(pickedMode)
    await waitFor(() => expect(document.activeElement).toHaveAttribute('data-page-button', added.id))
  }, 30000)
})
