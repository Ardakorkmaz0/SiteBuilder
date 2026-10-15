import { forwardRef, useImperativeHandle } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const surface = { live: null }
vi.mock('../components/editor/HtmlWorkspace.jsx', () => ({
  default: forwardRef(function FakeWorkspace({ html }, ref) {
    useImperativeHandle(ref, () => ({ getHtml: () => surface.live ?? html }), [html])
    return <iframe title="site" srcDoc={html} />
  }),
}))
vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Typing', slug: 'typing', published: false, html: '',
    schema: { theme: {}, pages: [{ id: 'home', name: 'Home', mode: 'html', html: '<p>Saved</p>', components: [] }] },
  })),
  updateSite: vi.fn(), patchSite: vi.fn(),
}))

import EditorPage from './EditorPage.jsx'
import ProtectedRoute from '../routes/ProtectedRoute.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useAuthStore } from '../store/authStore.js'
import { useEditorStore } from '../store/editorStore.js'
import { readEditorRecovery } from '../utils/editorRecovery.js'
import client from '../api/client.js'

beforeEach(() => {
  surface.live = null
  localStorage.setItem('pwb_language', 'en')
  useAuthStore.getState().setAuth('token', { id: 7 })
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})

describe('session expiry during an HTML input debounce', () => {
  it('captures the live document even before the parent dirty flags update', async () => {
    render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
      <Routes>
        <Route path="/editor/:id" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
        <Route path="/login" element={<p>Sign in</p>} />
      </Routes>
    </MemoryRouter></LanguageProvider></UiThemeProvider>)
    await screen.findByTitle('site', {}, { timeout: 15000 })
    expect(useEditorStore.getState().dirty).toBe(false)
    // No onCommit/onDraftDirtyChange has fired yet, as during the 300ms debounce.
    surface.live = '<p>Just typed before the unauthorized response</p>'
    await act(async () => {
      await client.get('/sites/1/', { adapter: async (config) => {
        throw Object.assign(new Error('Expired'), { config, response: { status: 401 } })
      } }).catch(() => {})
    })
    expect(await screen.findByText('Sign in')).toBeInTheDocument()
    expect(readEditorRecovery(7, 1)?.schema.pages[0].html).toContain('Just typed')
  }, 30000)
})
