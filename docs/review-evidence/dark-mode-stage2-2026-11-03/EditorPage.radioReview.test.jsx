import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Radio review', slug: 'radio-review', published: true,
    category: 'other', tags: [], html: '', site_options: {}, revision: 1,
    published_pages: [{ path: '', title: 'Home', html: '<h1>Live</h1>' }],
    schema: { theme: {}, pages: [{ id: 'home', name: 'Home', components: [
      { id: 'h1', type: 'heading', props: { text: 'Hello' }, styles: {}, layout: { x: 20, y: 20, w: 400, h: 60 } },
    ] }] },
  })),
  updateSite: vi.fn(async (id, payload) => ({ ...payload, id, slug: 'radio-review' })),
  patchSite: vi.fn(async () => ({})),
}))
vi.mock('../api/config.js', () => ({ getPublicConfig: vi.fn(async () => ({ ai: { enabled: false } })) }))
import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../store/editorStore.js'
import { useAuthStore } from '../store/authStore.js'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_editor_tour_v1', '1')
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
  useAuthStore.setState({ user: { id: 1, username: 'owner', is_guest: false }, token: 'test-token' })
})

describe('review: radio keys stay out of the canvas arrange layer', () => {
  it('changes draft to live without nudging the selected block', async () => {
    const user = userEvent.setup()
    render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
      <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
    </MemoryRouter></LanguageProvider></UiThemeProvider>)
    await waitFor(() => expect(document.querySelector('[data-cid="h1"]')).toBeTruthy())
    await act(async () => { useEditorStore.getState().selectComponent('h1') })
    const group = screen.getByRole('radiogroup', { name: 'Version shown' })
    within(group).getByRole('radio', { name: 'Draft', exact: true }).focus()
    await user.keyboard('{ArrowRight}')
    expect(within(group).getByRole('radio', { name: 'Live', exact: true })).toHaveAttribute('aria-checked', 'true')
    expect(useEditorStore.getState().schema.pages[0].components[0].layout).toMatchObject({ x: 20, y: 20 })
  }, 30000)
})
