// Two tabs on one site. The second save, made from what the first one has
// since replaced, silently won and took the first tab's work with it. Now the
// server refuses it (409) and the editor asks which version wins.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const updateSite = vi.fn()
let initiallyPublished = false

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Two tabs', slug: 'two-tabs', published: initiallyPublished, category: 'other', tags: [], html: '', site_options: {}, revision: 4,
    schema: {
      theme: {},
      pages: [{
        id: 'home',
        name: 'Home',
        components: [{ id: 'h1', type: 'heading', props: { text: 'Hello' }, styles: {}, layout: { x: 20, y: 20, w: 400, h: 60 } }],
      }],
    },
  })),
  updateSite: (...args) => updateSite(...args),
  patchSite: vi.fn(async () => ({})),
}))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../store/editorStore.js'
import { useAuthStore } from '../store/authStore.js'

const SLOW = { timeout: 15000 }

beforeEach(() => {
  updateSite.mockReset()
  initiallyPublished = false
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

describe('a save made from an older revision', () => {
  it.each([
    { published: false, requested: true, before: 'Publish', after: 'Published' },
    { published: true, requested: false, before: 'Published', after: 'Publish' },
  ])('keeps the requested publication state after conflicts when initially published is $published', async ({ published, requested, before, after }) => {
    initiallyPublished = published
    useAuthStore.setState({ user: { id: 1, username: 'owner', is_guest: false }, token: 'test-token' })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const conflict = { response: { status: 409, data: { code: 'site_changed', detail: 'This site was saved somewhere else.' } } }
    let refuseFirst
    updateSite
      .mockImplementationOnce(() => new Promise((resolve, reject) => { refuseFirst = reject }))
      .mockRejectedValueOnce(conflict)
      .mockImplementation(async (id, payload) => ({ ...payload, slug: 'two-tabs', revision: 6 }))
    render(
      <UiThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/editor/1']}>
            <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
          </MemoryRouter>
        </LanguageProvider>
      </UiThemeProvider>,
    )
    await waitFor(() => expect(screen.getByRole('button', { name: before, exact: true })).toBeEnabled(), SLOW)
    fireEvent.click(screen.getByRole('button', { name: before, exact: true }))
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(1), SLOW)
    expect(updateSite.mock.calls[0][1].published).toBe(requested)
    expect(updateSite.mock.calls[0][1].base_revision).toBe(4)

    // Queue an ordinary save before the first request is refused. Its later
    // conflict must not replace the explicit publish/unpublish request.
    await act(async () => { fireEvent.keyDown(window, { key: 's', ctrlKey: true }) })
    expect(updateSite).toHaveBeenCalledTimes(1)
    await act(async () => { refuseFirst(conflict) })
    const dialog = await screen.findByRole('alertdialog', { name: 'This site changed somewhere else' }, SLOW)
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(2), SLOW)
    expect(updateSite.mock.calls[1][1].published).toBe(published)
    expect(updateSite.mock.calls[1][1].base_revision).toBe(4)

    fireEvent.click(screen.getByRole('button', { name: 'Save mine anyway', exact: true }))

    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(3), SLOW)
    expect(updateSite.mock.calls[2][1].published).toBe(requested)
    expect(updateSite.mock.calls[2][1]).not.toHaveProperty('base_revision')
    await waitFor(() => expect(dialog).not.toBeInTheDocument(), SLOW)
    expect(screen.getByRole('button', { name: after, exact: true })).toBeEnabled()
  }, 30000)

  it('writes nothing until the person chooses, and "Save mine anyway" sends it without the revision', async () => {
    updateSite
      .mockRejectedValueOnce({ response: { status: 409, data: { code: 'site_changed', detail: 'This site was saved somewhere else after it was opened here.' } } })
      .mockImplementation(async (id, payload) => ({ ...payload, slug: 'two-tabs', revision: 6 }))
    render(
      <UiThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/editor/1']}>
            <Routes>
              <Route path="/editor/:id" element={<EditorPage />} />
              <Route path="/profile" element={<p>profile page</p>} />
            </Routes>
          </MemoryRouter>
        </LanguageProvider>
      </UiThemeProvider>,
    )
    await waitFor(() => expect(document.querySelector('[data-cid="h1"]')).toBeTruthy(), SLOW)
    await act(async () => useEditorStore.getState().updateProps('h1', { text: 'Mine' }))

    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0])

    const dialog = await screen.findByRole('alertdialog', { name: 'This site changed somewhere else' }, SLOW)
    expect(updateSite).toHaveBeenCalledTimes(1)
    expect(updateSite.mock.calls[0][1].base_revision).toBe(4)

    fireEvent.click(screen.getByRole('button', { name: 'Save mine anyway' }))

    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(2), SLOW)
    expect(updateSite.mock.calls[1][1]).not.toHaveProperty('base_revision')
    expect(JSON.stringify(updateSite.mock.calls[1][1].schema)).toContain('Mine')
    await waitFor(() => expect(dialog).not.toBeInTheDocument(), SLOW)

    // The next save works from the revision that save produced.
    await act(async () => useEditorStore.getState().updateProps('h1', { text: 'Mine again' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0])
    await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(3), SLOW)
    expect(updateSite.mock.calls[2][1].base_revision).toBe(6)
  }, 30000)

  it('after "Save and leave", "Save mine anyway" saves and leaves instead of asking again', async () => {
    updateSite
      .mockRejectedValueOnce({ response: { status: 409, data: { code: 'site_changed', detail: 'This site was saved somewhere else after it was opened here.' } } })
      .mockImplementation(async (id, payload) => ({ ...payload, slug: 'two-tabs', revision: 6 }))
    render(
      <UiThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/editor/1']}>
            <Routes>
              <Route path="/editor/:id" element={<EditorPage />} />
              <Route path="/profile" element={<p>profile page</p>} />
            </Routes>
          </MemoryRouter>
        </LanguageProvider>
      </UiThemeProvider>,
    )
    await waitFor(() => expect(document.querySelector('[data-cid="h1"]')).toBeTruthy(), SLOW)
    await act(async () => useEditorStore.getState().updateProps('h1', { text: 'Mine' }))

    fireEvent.click(screen.getAllByRole('button', { name: 'Back to previous page' })[0])
    fireEvent.click(await screen.findByRole('button', { name: 'Save and leave' }, SLOW))
    await screen.findByRole('alertdialog', { name: 'This site changed somewhere else' }, SLOW)

    fireEvent.click(screen.getByRole('button', { name: 'Save mine anyway' }))

    expect(await screen.findByText('profile page', {}, SLOW)).toBeInTheDocument()
    expect(updateSite).toHaveBeenCalledTimes(2)
    expect(updateSite.mock.calls[1][1]).not.toHaveProperty('base_revision')
  }, 30000)
})
