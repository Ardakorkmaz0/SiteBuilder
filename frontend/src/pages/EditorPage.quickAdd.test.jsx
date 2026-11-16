// Quick add from the palette flyout, through the real editor page, canvas and
// store: where a block added by its number key lands, and that each one added
// gets fitted to its content.
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

let site
vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => structuredClone(site)),
  updateSite: vi.fn(async (id, payload) => ({ ...payload, id, revision: 2 })),
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
import { useEditorStore } from '../store/editorStore.js'
import * as embedMeasure from '../utils/htmlEmbedMeasure.js'

const state = () => useEditorStore.getState()
const blocks = () => state().schema.pages[0].components

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_editor_tour_v1', '1')
  localStorage.setItem('pwb_canvas_zoom', '100')
  useAuthStore.setState({ user: { id: 1, username: 'owner', is_guest: false }, token: 'test-token' })
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000)
  site = {
    id: 1, title: 'Quick add', slug: 'quick-add', published: false,
    category: 'other', tags: [], html: '', site_options: {}, revision: 1,
    schema: { theme: {}, pages: [{ id: 'home', name: 'Home', canvasWidth: 500, components: [
      { id: 'first', type: 'text', props: { text: 'Existing' }, styles: {}, layout: { x: 0, y: 0, w: 200, h: 40 } },
    ] }] },
  }
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function openEditor() {
  render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
    <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
  </MemoryRouter></LanguageProvider></UiThemeProvider>)
  await screen.findByRole('textbox', { name: 'Site title', exact: true })
  await waitFor(() => expect(blocks()[0]?.id).toBe('first'))
  state().selectComponent(null)
  fireEvent.click(screen.getByRole('tab', { name: 'Components', exact: true }))
}

async function openFlyout(type, row) {
  fireEvent.pointerEnter(screen.getByRole('button', { name: row }))
  await waitFor(() => expect(document.querySelector(`[data-palette-flyout="${type}"]`)).not.toBeNull())
}

describe('a quick add through the editor', () => {
  it('lands in the part of a zoomed canvas on screen, across as well as down', async () => {
    localStorage.setItem('pwb_canvas_zoom', '200')
    await openEditor()
    const canvas = document.getElementById('free-canvas')
    const scroller = document.getElementById('canvas-scroll')
    expect(Number(canvas.dataset.builderCanvasScale)).toBe(2)
    // jsdom has no layout: the scroller shows 400 by 400 screen pixels of a
    // 1000 px canvas drawn at 200 percent, design x 0 to 200.
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000 })
    scroller.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400 })
    await openFlyout('icon', /^\W*Icon\d+▸$/)
    fireEvent.keyDown(window, { key: '1' })

    expect(blocks()).toHaveLength(2)
    const added = blocks()[1]
    expect(added.props._paletteType).toBe('icon')
    expect(added.layout.x).toBeGreaterThanOrEqual(0)
    expect(added.layout.x + added.layout.w).toBeLessThanOrEqual(200)
  })

  it('fits each block when two are added before the first fit runs', async () => {
    await openEditor()
    await openFlyout('button', /^\W*Button\d+▸$/)
    const measured = []
    vi.spyOn(embedMeasure, 'fitHtmlEmbedLayout').mockImplementation(async (component, width, apply) => {
      measured.push(component.id)
      apply({ w: 60, h: 24 })
      return true
    })
    vi.useFakeTimers()
    fireEvent.keyDown(window, { key: '1' })
    const one = blocks().at(-1).id
    fireEvent.keyDown(window, { key: '2' })
    const two = blocks().at(-1).id
    expect(one).not.toBe(two)
    await act(async () => { await vi.advanceTimersByTimeAsync(31) })

    expect(measured).toEqual([one, two])
    expect(blocks().slice(1).map((block) => block.layout.h)).toEqual([24, 24])
  })
})
