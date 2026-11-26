import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const api = vi.hoisted(() => ({
  getSite: vi.fn(),
  updateSite: vi.fn(),
  patchSite: vi.fn(),
}))

vi.mock('../api/sites.js', () => ({
  getSite: api.getSite,
  updateSite: api.updateSite,
  patchSite: api.patchSite,
}))
vi.mock('../api/config.js', () => ({ getPublicConfig: vi.fn(async () => ({ ai: { enabled: false } })) }))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../store/editorStore.js'
import { useAuthStore } from '../store/authStore.js'

const SLOW = { timeout: 15000 }
const origOpen = window.open

function deferred() {
  let resolve
  const promise = new Promise((res) => { resolve = res })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  useAuthStore.setState({ token: 'tok', user: { id: 1, username: 'ada' } })
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
  api.getSite.mockResolvedValue({
    id: 20,
    title: 'Ada Site',
    slug: 'ada-site',
    revision: 4,
    published: true,
    category: 'other',
    tags: [],
    html: '',
    site_options: {},
    schema: {
      theme: {},
      pages: [
        {
          id: 'page_home',
          name: 'Home',
          components: [{ id: 'h1', type: 'heading', props: { text: 'Welcome' }, styles: {}, layout: { x: 20, y: 20, w: 400, h: 60 } }],
        },
        {
          id: 'page_about',
          name: 'About',
          components: [{ id: 'h2', type: 'heading', props: { text: 'About' }, styles: {}, layout: { x: 20, y: 20, w: 400, h: 60 } }],
        },
      ],
    },
  })
})

afterEach(() => {
  window.open = origOpen
})

describe('EditorPage Preview button', () => {
  it('opens the draft preview immediately without saving when nothing is unsaved, preserving the active sub-page', async () => {
    const openSpy = vi.fn(() => ({ closed: false, location: { href: '', replace: vi.fn() } }))
    window.open = openSpy

    render(
      <UiThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/editor/20']}>
            <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
          </MemoryRouter>
        </LanguageProvider>
      </UiThemeProvider>,
    )

    await waitFor(() => expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument(), SLOW)
    act(() => { useEditorStore.getState().selectPage('page_about') })

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    expect(api.updateSite).not.toHaveBeenCalled()
    expect(openSpy).toHaveBeenCalledWith('/site/ada-site?draft=1#page_about', '_blank')
  }, 30000)

  it('saves once when dirty without triggering a duplicate visibilitychange auto-save, shows loading text in the preview tab, and navigates when ready', async () => {
    const saveGate = deferred()
    api.updateSite.mockImplementation(() => saveGate.promise)

    let writtenHtml = ''
    const replaceSpy = vi.fn()
    const fakeWin = {
      closed: false,
      document: {
        open: vi.fn(),
        write: vi.fn((chunk) => { writtenHtml += chunk }),
        close: vi.fn(),
      },
      location: { href: 'about:blank', replace: replaceSpy },
      close: vi.fn(),
    }
    window.open = vi.fn(() => {
      // Simulate the browser focusing the new preview tab and hiding the editor tab.
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      return fakeWin
    })

    render(
      <UiThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/editor/20']}>
            <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
          </MemoryRouter>
        </LanguageProvider>
      </UiThemeProvider>,
    )

    await waitFor(() => expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument(), SLOW)
    act(() => {
      useEditorStore.getState().updateProps('h1', { text: 'Edited heading' })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    expect(writtenHtml).toContain('Loading preview')
    await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(1), SLOW)

    await act(async () => {
      saveGate.resolve({ id: 20, title: 'Ada Site', slug: 'ada-site', revision: 5, published: true })
    })

    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('/site/ada-site?draft=1'))
    // The visibilitychange auto-save that queued behind the manual save must NOT fire a second write.
    expect(api.updateSite).toHaveBeenCalledTimes(1)
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  }, 30000)
})
