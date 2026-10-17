import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createElement } from 'react'

let onDragEnd
let site
let elementsFromPointDescriptor
// The page, canvas, store and DndContext remain real. Capture only the public
// drag-end boundary: jsdom supplies no browser drag sensor or layout engine.
vi.mock('@dnd-kit/core', async (original) => {
  const actual = await original()
  return {
    ...actual,
    DndContext: (props) => {
      onDragEnd = props.onDragEnd
      return createElement(actual.DndContext, props)
    },
  }
})
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
const nested = () => state().schema.pages[0].components[0].children[0]

beforeEach(() => {
  elementsFromPointDescriptor = Object.getOwnPropertyDescriptor(document, 'elementsFromPoint')
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_editor_tour_v1', '1')
  localStorage.setItem('pwb_canvas_zoom', '100')
  useAuthStore.setState({ user: { id: 1, username: 'owner', is_guest: false }, token: 'test-token' })
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function () {
    if (this.getAttribute('data-builder-droppable-id') === 'outer') return site.schema.pages[0].components[0].layout.w
    if (this.getAttribute('data-builder-droppable-id') === 'nested') return 800
    return 1000
  })
  site = {
    id: 1, title: 'Nested placement', slug: 'nested-drop', published: false,
    category: 'other', tags: [], html: '', site_options: {}, revision: 1,
    schema: { theme: {}, pages: [{ id: 'home', name: 'Home', canvasWidth: 500, components: [{
      id: 'outer', type: 'container', props: {}, styles: {}, layout: { x: 0, y: 0, w: 500, h: 400 },
      children: [{
        id: 'nested', type: 'container', props: {}, styles: {}, layout: { x: 200, y: 40, w: 800, h: 200 },
        children: [{ id: 'edge', type: 'text', props: { text: 'Existing' }, styles: {}, layout: { x: 1400, y: 20, w: 100, h: 40 } }],
      }],
    }] }] },
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  if (elementsFromPointDescriptor) Object.defineProperty(document, 'elementsFromPoint', elementsFromPointDescriptor)
  else delete document.elementsFromPoint
})

async function openEditor() {
  const view = render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
    <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
  </MemoryRouter></LanguageProvider></UiThemeProvider>)
  await screen.findByRole('textbox', { name: 'Site title', exact: true })
  await waitFor(() => expect(nested().id).toBe('nested'))
  await waitFor(() => expect(document.querySelector('[data-builder-droppable-id="nested"]')).not.toBeNull())
  return view
}

describe('palette placement through nested fitted containers', () => {
  for (const html of [false, true]) {
    for (const fittedOuter of [true, false]) {
      it(`maps a ${html ? 'palette HTML snippet' : 'native palette component'} with outer fit ${fittedOuter}`, async () => {
        if (!fittedOuter) {
          site.schema.pages[0].canvasWidth = 1000
          site.schema.pages[0].components[0].layout.w = 1000
        }
        await openEditor()
        const outer = document.querySelector('[data-builder-droppable-id="outer"]')
        const target = document.querySelector('[data-builder-droppable-id="nested"]')
        const canvas = document.getElementById('free-canvas')
        expect(Number(canvas.dataset.builderCanvasScale)).toBe(1)
        expect(Number(outer.dataset.builderFitScale)).toBe(fittedOuter ? 0.5 : 1)
        expect(Number(target.dataset.builderFitScale)).toBe(0.5333333333333333)
        target.getBoundingClientRect = () => fittedOuter
          ? ({ left: 100, top: 20, right: 500, bottom: 120, width: 400, height: 100 })
          : ({ left: 200, top: 40, right: 1000, bottom: 240, width: 800, height: 200 })

        // Local (300,60) paints at (180,36): origin (100,20) plus
        // coordinates multiplied by outer .5 and target 8/15.
        const data = { from: 'palette', type: 'text', w: 100, h: 40, ...(html ? { html: '<p>Dropped snippet</p>' } : {}) }
        await act(async () => onDragEnd({
          active: { data: { current: data }, rect: { current: { translated: fittedOuter ? { left: 180, top: 36 } : { left: 360, top: 72 } } } },
          over: { id: 'nested' },
        }))

        expect(nested().children).toHaveLength(2)
        const dropped = nested().children[1]
        expect(dropped.type).toBe(html ? 'html' : 'text')
        expect.soft(dropped.layout.x).toBe(300)
        expect.soft(dropped.layout.y).toBe(60)
      })
    }
  }

  it('applies a 50 percent canvas zoom once along with both fitted ancestors', async () => {
    localStorage.setItem('pwb_canvas_zoom', '50')
    const view = await openEditor()
    const target = document.querySelector('[data-builder-droppable-id="nested"]')
    expect(Number(document.getElementById('free-canvas').dataset.builderCanvasScale)).toBe(0.5)
    // A similarly named marker outside the canvas must not enter its math.
    view.container.dataset.builderFitScale = '0.25'
    target.getBoundingClientRect = () => ({ left: 50, top: 10, right: 250, bottom: 60, width: 200, height: 50 })
    await act(async () => onDragEnd({
      active: { data: { current: { from: 'palette', type: 'text', w: 100, h: 40 } }, rect: { current: { translated: { left: 90, top: 18 } } } },
      over: { id: 'nested' },
    }))
    expect(nested().children).toHaveLength(2)
    expect(nested().children[1].layout).toEqual({ x: 300, y: 60, w: 100, h: 40 })
  })

  it('centres a real armed palette snippet at a nested tap after the full scale conversion', async () => {
    localStorage.setItem('pwb_canvas_zoom', '50')
    await openEditor()
    const target = document.querySelector('[data-builder-droppable-id="nested"]')
    const canvas = document.getElementById('free-canvas')
    expect(Number(canvas.dataset.builderCanvasScale)).toBe(0.5)
    target.getBoundingClientRect = () => ({ left: 50, top: 10, right: 250, bottom: 60, width: 200, height: 50 })
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, right: 250, bottom: 400, width: 250, height: 400 })
    Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: () => [target] })
    fireEvent.click(screen.getByRole('tab', { name: 'Components', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: /^■Button\d+▸$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Solid: Enter adds it at the end of the page', exact: true }))

    // The 220x56 Solid snippet is centred at local (410,88). At the actual
    // 0.5 * 0.5 * 8/15 scale that is screen (104 2/3,21 11/15).
    fireEvent.pointerDown(target, { button: 0, clientX: 104.66666666666667, clientY: 21.733333333333334 })
    expect(nested().children).toHaveLength(2)
    expect(nested().children[1].type).toBe('html')
    expect(nested().children[1].props._paletteVariant).toBe('solid')
    expect(nested().children[1].layout.x).toBe(300)
    expect(nested().children[1].layout.y).toBe(60)
  })
})
