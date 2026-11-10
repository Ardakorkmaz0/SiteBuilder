// Delete and the arrow keys change the selected block. The selection survives
// a switch to View or Source and an opened dialog, so the keys used to act on
// a block the user could not see: Delete removed it behind the preview.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Hidden canvas', slug: 'hidden-canvas', published: true,
    category: 'other', tags: [], html: '', site_options: {}, revision: 1,
    published_pages: [{ path: '', title: 'Home', html: '<h1>Live</h1>' }],
    schema: { theme: {}, pages: [{ id: 'home', name: 'Home', components: [
      { id: 'h1', type: 'heading', props: { text: 'Hello' }, styles: {}, layout: { x: 20, y: 20, w: 400, h: 60 } },
    ] }] },
  })),
  updateSite: vi.fn(async (id, payload) => ({ ...payload, id, slug: 'hidden-canvas' })),
  patchSite: vi.fn(async () => ({})),
}))
vi.mock('../api/config.js', () => ({ getPublicConfig: vi.fn(async () => ({ ai: { enabled: false } })) }))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../store/editorStore.js'
import { useAuthStore } from '../store/authStore.js'

const blocks = () => useEditorStore.getState().schema.pages[0].components
const untouched = () => {
  expect(blocks()).toHaveLength(1)
  expect(blocks()[0].layout).toMatchObject({ x: 20, y: 20 })
  expect(useEditorStore.getState().selectedId).toBe('h1')
}

async function openWithBlockSelected() {
  render(
    <UiThemeProvider>
      <LanguageProvider>
        <MemoryRouter initialEntries={['/editor/1']}>
          <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
        </MemoryRouter>
      </LanguageProvider>
    </UiThemeProvider>,
  )
  await waitFor(() => expect(document.querySelector('[data-cid="h1"]')).toBeTruthy())
  await act(async () => { useEditorStore.getState().selectComponent('h1') })
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_editor_tour_v1', '1')
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
  useAuthStore.setState({ user: { id: 1, username: 'owner', is_guest: false }, token: 'test-token' })
})

describe('the canvas keys while the canvas is out of sight', () => {
  it('leave the selected block alone in View', async () => {
    await openWithBlockSelected()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'View', exact: true })) })
    fireEvent.keyDown(document.body, { key: 'ArrowDown' })
    fireEvent.keyDown(document.body, { key: 'Delete' })
    fireEvent.keyDown(document.body, { key: 'd', ctrlKey: true })
    untouched()
  }, 30000)

  it('leave the selected block alone in Source', async () => {
    await openWithBlockSelected()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Source', exact: true })) })
    fireEvent.keyDown(document.body, { key: 'Delete' })
    fireEvent.keyDown(document.body, { key: 'Backspace' })
    untouched()
  }, 30000)

  it('leave the selected block alone under the shortcuts dialog, and work again once it is closed', async () => {
    await openWithBlockSelected()
    fireEvent.keyDown(document.body, { key: '?' })
    await screen.findByRole('dialog', { name: /Keyboard shortcuts/ })
    fireEvent.keyDown(document.body, { key: 'ArrowDown' })
    fireEvent.keyDown(document.body, { key: 'Delete' })
    untouched()

    fireEvent.keyDown(document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Keyboard shortcuts/ })).toBeNull())
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(blocks()[0].layout).toMatchObject({ x: 21, y: 20 })
  }, 30000)

  it('leave the selected block alone while a toolbar menu is open', async () => {
    await openWithBlockSelected()
    // The header's menu button; the properties panel has one of the same name.
    const more = screen.getAllByRole('button', { name: 'More actions' }).find((button) => button.dataset.tour === 'more')
    await act(async () => { fireEvent.click(more) })
    expect(more).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(more, { key: 'Delete' })
    fireEvent.keyDown(more, { key: 'ArrowRight' })
    untouched()
  }, 30000)
})
