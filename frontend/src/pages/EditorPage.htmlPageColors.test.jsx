// Recolouring an uploaded HTML page. Such a page rarely uses the variable
// names the theme knows, so the theme could not reach its text, backgrounds
// or cards. "Colors on this page" lists the page's own colours; changing one
// rewrites it on every page that follows the site theme, as one undo step.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

let site
const updateSite = vi.fn()
vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => structuredClone(site)),
  updateSite: (...args) => updateSite(...args),
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

// No --primary or --bg: colours written straight into the CSS, as uploads are.
const uploaded = (name) => `<!doctype html><html><head><style>body{background:#fdf6ec;color:#222222}h1{color:#e8543f}.btn{background:#e8543f;color:#fff}</style></head><body><h1>${name}</h1><a class="btn" href="#order">Order</a><p style="border-bottom:2px solid #e8543f">${name} text</p></body></html>`
const page = (id, name) => ({ id, name, mode: 'html', html: uploaded(name), components: [] })
const banner = () => screen.getByRole('banner')
const source = () => screen.getByRole('textbox', { name: 'HTML source editor', exact: true })
const undo = () => screen.getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true })
const SLOW = { timeout: 15000 }

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_editor_tour_v1', '1')
  localStorage.setItem('pwb_htmlmode_1', 'source')
  site = {
    id: 1, title: 'Bakery', slug: 'bakery', published: false,
    category: 'other', tags: [], html: '', site_options: {}, revision: 1,
    schema: { theme: {}, pages: [page('home', 'Home'), page('menu', 'Menu')] },
  }
  updateSite.mockReset()
  updateSite.mockImplementation(async (id, payload) => ({ ...payload, id, slug: 'bakery', revision: 2 }))
  useAuthStore.setState({ user: { id: 1, username: 'owner', is_guest: false }, token: 'test-token' })
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})

async function openTheme() {
  render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
    <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
  </MemoryRouter></LanguageProvider></UiThemeProvider>)
  await screen.findByRole('textbox', { name: 'HTML source editor', exact: true }, SLOW)
  await waitFor(() => expect(source().value).toContain('<h1>Home</h1>'), SLOW)
  await act(async () => { fireEvent.click(screen.getByRole('tab', { name: 'Theme', exact: true })) })
}

async function savedPages() {
  const before = updateSite.mock.calls.length
  await act(async () => { fireEvent.click(within(banner()).getByRole('button', { name: 'Save', exact: true })) })
  await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(before + 1), SLOW)
  await waitFor(() => expect(within(banner()).getByRole('button', { name: 'Save', exact: true })).toBeEnabled(), SLOW)
  return updateSite.mock.calls.at(-1)[1].schema.pages
}

describe('Colors on this page', () => {
  it('lists the uploaded page own colours and swaps one on every page, as one undo step', async () => {
    await openTheme()
    const colors = await screen.findByRole('list', { name: 'Colors on this page' })
    const accent = within(colors).getByLabelText('Change #E8543F, used 3 times')
    expect(within(colors).getByLabelText('Change #FDF6EC, used 1 times')).toBeInTheDocument()

    fireEvent.change(accent, { target: { value: '#2563eb' } })

    await waitFor(() => expect(source().value).toContain('h1{color:#2563eb}'), SLOW)
    const pages = await savedPages()
    for (const saved of pages) {
      expect(saved.html).not.toMatch(/#e8543f/i)
      expect(saved.html).toContain('.btn{background:#2563eb;color:#fff}')
      expect(saved.html).toContain('border-bottom:2px solid #2563eb')
      expect(saved.html).toContain('background:#fdf6ec')
    }

    fireEvent.click(undo())
    await waitFor(() => expect(source().value).toContain('h1{color:#e8543f}'), SLOW)
    for (const saved of await savedPages()) expect(saved.html).toBe(uploaded(saved.name))
  }, 30000)
})
