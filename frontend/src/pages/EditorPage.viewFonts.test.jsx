// View draws a page with a pinned block, motion or blocks shown by keys in a
// frame of the published page. The fonts a site carries inside itself (a
// page turned from an HTML document) were not written into it, so its text
// fell back to another font there and nowhere else.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const FACE = '@font-face{font-family:"Okul";src:url(data:font/woff2;base64,AAAA)}'

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Notes', slug: 'notes', published: false,
    category: 'other', tags: [], html: '', site_options: {}, revision: 1, published_pages: [],
    schema: { theme: {}, fontFaces: '@font-face{font-family:"Okul";src:url(data:font/woff2;base64,AAAA)}', pages: [{ id: 'home', name: 'Home', components: [
      { id: 'menu', type: 'text', props: { text: 'Chapters', scrollBehavior: 'fixed' }, styles: { fontFamily: 'Okul, serif' }, layout: { x: 0, y: 0, w: 300, h: 60 } },
      { id: 'step', type: 'text', props: { text: 'Square the errors', shownBy: ['s1'] }, styles: { fontFamily: 'Okul, serif' }, layout: { x: 320, y: 20, w: 400, h: 40 } },
    ], hiddenKeys: ['s1'] }] },
  })),
  updateSite: vi.fn(async (id, payload) => ({ ...payload, id, slug: 'notes' })),
  patchSite: vi.fn(async () => ({})),
}))
vi.mock('../api/config.js', () => ({ getPublicConfig: vi.fn(async () => ({ ai: { enabled: false } })) }))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useAuthStore } from '../store/authStore.js'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_editor_tour_v1', '1')
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
  useAuthStore.setState({ user: { id: 1, username: 'owner', is_guest: false }, token: 'test-token' })
})

describe('View of a page drawn in a frame', () => {
  it('writes the fonts the site carries into the frame, and the keys that hide a block at first', async () => {
    render(
      <UiThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/editor/1']}>
            <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
          </MemoryRouter>
        </LanguageProvider>
      </UiThemeProvider>,
    )
    await waitFor(() => expect(document.querySelector('[data-cid="step"]')).toBeTruthy())
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'View', exact: true })) })

    const frame = await screen.findByTitle('Home preview')
    const doc = frame.getAttribute('srcdoc')
    expect(doc).toContain(FACE)
    expect(doc).toContain('data-pwb-keys="s1"')
    expect(doc).toContain('data-pwb-show="s1"')
  }, 30000)
})
