// An arrow key moves the selected block, unless a control took it first: a
// radio group's or a tab row's arrow must not change the draft as well.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Arrow keys', slug: 'arrow-keys', published: true,
    category: 'other', tags: [], html: '', site_options: {}, revision: 1,
    published_pages: [{ path: '', title: 'Home', html: '<h1>Live</h1>' }],
    schema: { theme: {}, pages: [{ id: 'home', name: 'Home', components: [
      { id: 'h1', type: 'heading', props: { text: 'Hello' }, styles: {}, layout: { x: 20, y: 20, w: 400, h: 60 } },
    ] }] },
  })),
  updateSite: vi.fn(async (id, payload) => ({ ...payload, id, slug: 'arrow-keys' })),
  patchSite: vi.fn(async () => ({})),
}))
vi.mock('../api/config.js', () => ({ getPublicConfig: vi.fn(async () => ({ ai: { enabled: false } })) }))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../store/editorStore.js'
import { useAuthStore } from '../store/authStore.js'

const layout = () => useEditorStore.getState().schema.pages[0].components[0].layout

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

describe('the arrow keys in the editor', () => {
  it('move the selected block when no control took them', async () => {
    await openWithBlockSelected()
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(layout()).toMatchObject({ x: 21, y: 20 })
  }, 30000)

  it('in the Draft and Live group change the version and leave the block', async () => {
    await openWithBlockSelected()
    const versions = screen.getByRole('radiogroup', { name: 'Version shown' })
    fireEvent.keyDown(within(versions).getByRole('radio', { name: 'Draft', exact: true }), { key: 'ArrowRight' })
    expect(within(versions).getByRole('radio', { name: 'Live', exact: true })).toHaveAttribute('aria-checked', 'true')
    expect(layout()).toMatchObject({ x: 20, y: 20 })
  }, 30000)

  it('in a row of tabs change the tab and leave the block', async () => {
    await openWithBlockSelected()
    const content = screen.getByRole('tab', { name: 'Content', exact: true })
    expect(content).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(content, { key: 'ArrowRight' })
    expect(content).toHaveAttribute('aria-selected', 'false')
    expect(layout()).toMatchObject({ x: 20, y: 20 })
  }, 30000)
})
