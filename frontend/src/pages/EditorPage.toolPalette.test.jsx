// The tool palette over the stage, through the real editor page, canvas and
// store: a tool places one block where the canvas is clicked (or the size of
// the box dragged), then the palette is back on Select; the letters pick the
// tools, and are left alone while a field is being typed in.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

const state = () => useEditorStore.getState()
const blocks = () => state().schema.pages[0].components
const tool = (name) => screen.getByRole('button', { name })

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
    id: 1, title: 'Palette', slug: 'palette', published: false,
    category: 'other', tags: [], html: '', site_options: {}, revision: 1,
    schema: { theme: {}, pages: [{ id: 'home', name: 'Home', canvasWidth: 1000, components: [
      { id: 'first', type: 'text', props: { text: 'Existing' }, styles: {}, layout: { x: 0, y: 0, w: 200, h: 40 } },
    ] }] },
  }
})

afterEach(() => {
  cleanup()
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
  const canvas = document.getElementById('free-canvas')
  // jsdom lays nothing out: the canvas is 1000 px at 1:1, from the origin.
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 800, right: 1000, bottom: 800 })
  return canvas
}

describe('the tool palette on a canvas page', () => {
  it('places a text block centred on a click, selects it, and goes back to Select', async () => {
    const canvas = await openEditor()
    expect(tool('Select (V)')).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(tool('Text (T)'))
    expect(tool('Text (T)')).toHaveAttribute('aria-pressed', 'true')
    act(() => {
      fireEvent.pointerDown(canvas, { button: 0, clientX: 500, clientY: 300 })
      fireEvent.pointerUp(window, { clientX: 500, clientY: 300 })
    })

    await waitFor(() => expect(blocks()).toHaveLength(2))
    const added = blocks()[1]
    expect(added.type).toBe('text')
    expect(state().selectedId).toBe(added.id)
    // Centred on the click.
    expect(added.layout.x + added.layout.w / 2).toBeCloseTo(500, 0)
    expect(added.layout.y + added.layout.h / 2).toBeCloseTo(300, 0)
    expect(tool('Select (V)')).toHaveAttribute('aria-pressed', 'true')
  })

  it('gives a box the size of the box dragged, drawing it while the pointer moves', async () => {
    const canvas = await openEditor()
    fireEvent.click(tool('Box (R)'))
    act(() => { fireEvent.pointerDown(canvas, { button: 0, clientX: 100, clientY: 200 }) })
    act(() => { fireEvent.pointerMove(window, { clientX: 400, clientY: 350 }) })
    const drawing = document.querySelector('[data-draw-box]')
    expect(drawing).not.toBeNull()
    expect(drawing.style.width).toBe('300px')
    expect(drawing.style.height).toBe('150px')
    act(() => { fireEvent.pointerUp(window, { clientX: 400, clientY: 350 }) })

    await waitFor(() => expect(blocks()).toHaveLength(2))
    expect(document.querySelector('[data-draw-box]')).toBeNull()
    const box = blocks()[1]
    expect(box.type).toBe('container')
    expect(box.layout).toMatchObject({ x: 100, y: 200, w: 300, h: 150 })
  })

  // A drawing the browser cancels (a touch turned into a scroll, the window
  // lost the pointer) stayed on screen, and the next pointer to lift, even
  // another finger, finished it as a box.
  it('drops a drawing the browser cancels, and finishes a drawing only on its own pointer', async () => {
    const canvas = await openEditor()
    fireEvent.click(tool('Box (R)'))
    act(() => { fireEvent.pointerDown(canvas, { button: 0, pointerId: 1, clientX: 100, clientY: 200 }) })
    act(() => { fireEvent.pointerMove(window, { pointerId: 1, clientX: 400, clientY: 350 }) })
    expect(document.querySelector('[data-draw-box]')).not.toBeNull()
    act(() => { fireEvent.pointerCancel(window, { pointerId: 1 }) })
    expect(document.querySelector('[data-draw-box]')).toBeNull()
    act(() => { fireEvent.pointerUp(window, { pointerId: 2, clientX: 600, clientY: 500 }) })
    await act(async () => {})
    expect(blocks()).toHaveLength(1)
    expect(tool('Box (R)')).toHaveAttribute('aria-pressed', 'true')

    act(() => { fireEvent.pointerDown(canvas, { button: 0, pointerId: 3, clientX: 100, clientY: 200 }) })
    act(() => { fireEvent.pointerMove(window, { pointerId: 3, clientX: 400, clientY: 350 }) })
    act(() => { fireEvent.pointerUp(window, { pointerId: 4, clientX: 900, clientY: 700 }) })
    await act(async () => {})
    expect(blocks()).toHaveLength(1)
    act(() => { fireEvent.pointerUp(window, { pointerId: 3, clientX: 400, clientY: 350 }) })
    await waitFor(() => expect(blocks()).toHaveLength(2))
    expect(blocks()[1].layout).toMatchObject({ x: 100, y: 200, w: 300, h: 150 })
  })

  it('picks the tools by their letters, Escape-free: V puts the pointer back', async () => {
    await openEditor()
    fireEvent.keyDown(document.body, { key: 'i' })
    expect(tool('Image (I)')).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(document.body, { key: 'v' })
    expect(tool('Select (V)')).toHaveAttribute('aria-pressed', 'true')
    expect(blocks()).toHaveLength(1)
  })

  it('leaves the letters to a field being typed in', async () => {
    await openEditor()
    const title = screen.getByRole('textbox', { name: 'Site title', exact: true })
    title.focus()
    fireEvent.keyDown(title, { key: 't' })
    expect(tool('Select (V)')).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('the tool palette on an HTML page', () => {
  it('is the same palette, and its tools start the page\'s own click-to-place', async () => {
    localStorage.setItem('pwb_htmlmode_1', 'edit')
    site.schema.pages[0] = { id: 'home', name: 'Home', mode: 'html', html: '<!DOCTYPE html><html><body><h1>Garden</h1></body></html>', components: [] }
    render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
      <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
    </MemoryRouter></LanguageProvider></UiThemeProvider>)
    await screen.findByTitle('site', {}, { timeout: 15000 })

    expect(screen.getByRole('toolbar', { name: 'Tools' })).toBeInTheDocument()
    expect(tool('Select (V)')).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(tool('Box (R)'))
    expect(tool('Box (R)')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Click in the page to place the', { exact: false })).toBeInTheDocument()

    fireEvent.click(tool('Select (V)'))
    expect(tool('Select (V)')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('Click in the page to place the', { exact: false })).toBeNull()
  }, 30000)

  // Source has no palette. A letter pressed there (on the Source button, say)
  // still armed a tool behind it, which was waiting on the way back to Edit.
  it('takes its letters only while it is on screen, so Source arms no tool', async () => {
    localStorage.setItem('pwb_htmlmode_1', 'edit')
    site.schema.pages[0] = { id: 'home', name: 'Home', mode: 'html', html: '<!DOCTYPE html><html><body><h1>Garden</h1></body></html>', components: [] }
    render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
      <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
    </MemoryRouter></LanguageProvider></UiThemeProvider>)
    await screen.findByTitle('site', {}, { timeout: 15000 })

    const source = screen.getByRole('button', { name: 'Source', exact: true })
    await act(async () => { fireEvent.click(source) })
    expect(screen.queryByRole('toolbar', { name: 'Tools' })).toBeNull()
    source.focus()
    fireEvent.keyDown(source, { key: 'i' })

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Edit', exact: true })) })
    expect(tool('Select (V)')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('Click in the page to place the', { exact: false })).toBeNull()

    // On screen again, the letters work.
    fireEvent.keyDown(document.body, { key: 'i' })
    expect(tool('Image (I)')).toHaveAttribute('aria-pressed', 'true')
  }, 30000)
})
