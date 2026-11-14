import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const api = vi.hoisted(() => ({ getSite: vi.fn(), updateSite: vi.fn() }))
vi.mock('../api/sites.js', () => ({ getSite: api.getSite, updateSite: api.updateSite, patchSite: vi.fn() }))
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
const originalHtml = '<h1>Saved authored About</h1>'
const changedHtml = '<h1>Changed About</h1>'
let site
const toolbar = () => within(screen.getByRole('banner'))
const undo = () => toolbar().getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true })
const redo = () => toolbar().getByRole('button', { name: 'Redo (Ctrl+Shift+Z)', exact: true })

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_canvasmode_1', 'source')
  localStorage.setItem('pwb_editor_tour_v1', '1')
  useAuthStore.setState({ user: { id: 1, username: 'owner', is_guest: false }, token: 'test-token' })
  site = {
    id: 1, title: 'Mixed page history', slug: 'mixed-history', revision: 1,
    published: false, category: 'other', tags: [], html: '', site_options: {},
    schema: { theme: {}, pages: [
      { id: 'home', name: 'Home', mode: 'empty', components: [{
        id: 'heading', type: 'heading', props: { text: 'Original canvas heading' }, styles: {},
        layout: { x: 20, y: 20, w: 400, h: 60 },
      }] },
      { id: 'about', name: 'About', mode: 'html', html: originalHtml, components: [] },
    ] },
  }
  api.getSite.mockImplementation(async () => structuredClone(site))
  api.updateSite.mockImplementation(async (id, payload) => ({ ...payload, id, slug: 'mixed-history', revision: 2 }))
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})

async function openAndEditOtherPage(beforeApply) {
  render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
    <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
  </MemoryRouter></LanguageProvider></UiThemeProvider>)
  await screen.findByRole('textbox', { name: 'HTML source editor', exact: true }, SLOW)
  if (beforeApply) await beforeApply()
  fireEvent.click(screen.getByRole('button', { name: 'HTMLabout.html', exact: true }))
  fireEvent.change(screen.getByRole('textbox', { name: 'HTML source editor', exact: true }), { target: { value: changedHtml } })
  fireEvent.click(screen.getByRole('button', { name: 'Apply HTML', exact: true }))
  expect(useEditorStore.getState().currentPageId).toBe('home')
  expect(useEditorStore.getState().schema.pages[0].mode).toBe('empty')
}

async function savedAboutHtml() {
  const before = api.updateSite.mock.calls.length
  fireEvent.click(toolbar().getByRole('button', { name: 'Save', exact: true }))
  await waitFor(() => expect(api.updateSite).toHaveBeenCalledTimes(before + 1), SLOW)
  await waitFor(() => expect(toolbar().getByRole('button', { name: 'Save', exact: true })).toBeEnabled(), SLOW)
  return api.updateSite.mock.calls.at(-1)[1].schema.pages[1].html
}

describe('HTML document history while a canvas page is active', () => {
  it('undoes and redoes importing onto an initially empty inactive page in one step', async () => {
    site.schema.pages[1].mode = 'empty'
    site.schema.pages[1].html = ''
    await openAndEditOtherPage()
    expect(await savedAboutHtml()).toBe(changedHtml)
    expect(useEditorStore.getState().schema.pages[1].mode).toBe('html')

    fireEvent.click(undo())
    expect(await savedAboutHtml()).toBe('')
    expect(useEditorStore.getState().schema.pages[1].mode).toBe('empty')
    expect(undo()).toBeDisabled()

    fireEvent.click(redo())
    expect(await savedAboutHtml()).toBe(changedHtml)
    expect(useEditorStore.getState().schema.pages[1].mode).toBe('html')
  }, 30000)

  it('undoes and redoes an applied change to another page', async () => {
    await openAndEditOtherPage()
    expect(await savedAboutHtml()).toBe(changedHtml)
    expect(undo()).toBeEnabled()

    fireEvent.click(undo())
    expect(await savedAboutHtml()).toBe(originalHtml)
    expect(undo()).toBeDisabled()
    expect(redo()).toBeEnabled()

    fireEvent.click(redo())
    expect(await savedAboutHtml()).toBe(changedHtml)
    expect(redo()).toBeDisabled()
    expect(useEditorStore.getState().currentPageId).toBe('home')
  }, 30000)

  it('orders document edits and canvas edits chronologically in both directions', async () => {
    await openAndEditOtherPage()
    await act(async () => useEditorStore.getState().updateProps('heading', { text: 'New canvas heading' }))

    fireEvent.click(undo())
    expect(useEditorStore.getState().schema.pages[0].components[0].props.text).toBe('Original canvas heading')
    expect(await savedAboutHtml()).toBe(changedHtml)

    fireEvent.click(undo())
    expect(await savedAboutHtml()).toBe(originalHtml)
    fireEvent.click(redo())
    expect(await savedAboutHtml()).toBe(changedHtml)
    expect(useEditorStore.getState().schema.pages[0].components[0].props.text).toBe('Original canvas heading')

    fireEvent.click(redo())
    expect(useEditorStore.getState().schema.pages[0].components[0].props.text).toBe('New canvas heading')
    expect(redo()).toBeDisabled()
  }, 30000)

  it('undoes a later document edit before an earlier canvas edit', async () => {
    await openAndEditOtherPage(async () => {
      await act(async () => useEditorStore.getState().updateProps('heading', { text: 'New canvas heading' }))
    })

    fireEvent.click(undo())
    expect(await savedAboutHtml()).toBe(originalHtml)
    expect(useEditorStore.getState().schema.pages[0].components[0].props.text).toBe('New canvas heading')
    fireEvent.click(undo())
    expect(useEditorStore.getState().schema.pages[0].components[0].props.text).toBe('Original canvas heading')

    fireEvent.click(redo())
    expect(useEditorStore.getState().schema.pages[0].components[0].props.text).toBe('New canvas heading')
    expect(await savedAboutHtml()).toBe(originalHtml)
    fireEvent.click(redo())
    expect(await savedAboutHtml()).toBe(changedHtml)
  }, 30000)
})
