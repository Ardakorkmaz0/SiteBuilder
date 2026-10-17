import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { useEditorStore } from '../../store/editorStore.js'
import FreeCanvasItem from './FreeCanvasItem.jsx'
import FlowCanvasItem, { ContainerEditor } from './FlowCanvasItem.jsx'
import Canvas from './Canvas.jsx'
import { DndContext } from '@dnd-kit/core'

const state = () => useEditorStore.getState()
const box = () => state().schema.pages[0].components[0]

function loadBox(x, y) {
  state().loadSchema({ pages: [{
    id: 'home', name: 'Home', canvasWidth: 1000, mobileManual: true, components: [{
      id: 'same-id', type: 'text', props: { text: 'Text' }, styles: {},
      layout: { x, y, w: 200, h: 80 },
      mobileLayout: { x: 16, y: 20, w: 100, h: 40 },
    }],
  }] })
  state().setViewport('pc')
}

beforeEach(() => {
  localStorage.setItem('pwb_language', 'en')
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})

afterEach(() => {
  fireEvent.pointerUp(window)
  vi.unstubAllGlobals()
})

describe('canvas item drag lifetime', () => {
  it('does not keep editing a replacement document after the dragged item unmounts', () => {
    loadBox(40, 80)
    const view = render(<LanguageProvider><FreeCanvasItem component={box()} /></LanguageProvider>)
    fireEvent.pointerDown(view.container.querySelector('[data-cid="same-id"]'), { button: 0, clientX: 100, clientY: 100 })
    view.unmount()
    act(() => loadBox(600, 700))

    fireEvent.pointerMove(window, { clientX: 160, clientY: 180 })

    expect(box().layout).toEqual({ x: 600, y: 700, w: 200, h: 80 })
    expect(state().dirty).toBe(false)
    expect(state().past).toHaveLength(0)
  })

  for (const mode of ['free resize', 'fixed drag', 'flow resize', 'nested drag', 'nested resize']) {
    it(`ends ${mode} when its canvas item unmounts`, () => {
      loadBox(40, 80)
      let component = box()
      if (mode === 'fixed drag') {
        act(() => state().updateProps('same-id', { scrollBehavior: 'fixed' }))
        component = box()
      }
      if (mode.includes('resize')) act(() => state().selectComponent('same-id'))
      const content = mode.startsWith('flow')
        ? <FlowCanvasItem component={component} canvasWidth={1000} />
        : mode.startsWith('nested')
          ? <ContainerEditor component={{ id: 'parent', type: 'container', props: {}, styles: {}, layout: { x: 0, y: 0, w: 600, h: 300 }, children: [component] }} />
          : <FreeCanvasItem component={component} />
      const view = render(<LanguageProvider><DndContext>{content}</DndContext></LanguageProvider>)
      const handle = mode.includes('resize')
        ? view.container.querySelector('[data-resize-handle="e"]')
        : view.container.querySelector('[data-cid="same-id"]')
      expect(handle).not.toBeNull()
      fireEvent.pointerDown(handle, { button: 0, clientX: 100, clientY: 100 })
      view.unmount()
      act(() => loadBox(600, 700))

      fireEvent.pointerMove(window, { clientX: 160, clientY: 180 })

      expect(box().layout).toEqual({ x: 600, y: 700, w: 200, h: 80 })
      expect(box().props).toEqual({ text: 'Text' })
      expect(state().dirty).toBe(false)
    })
  }

  it('ends a PC drag before switching to the phone coordinate space', () => {
    loadBox(40, 80)
    const view = render(<LanguageProvider><FreeCanvasItem component={box()} /></LanguageProvider>)
    fireEvent.pointerDown(view.container.querySelector('[data-cid="same-id"]'), { button: 0, clientX: 100, clientY: 100 })
    act(() => state().setViewport('mobile'))
    fireEvent.pointerMove(window, { clientX: 160, clientY: 180 })

    expect(box().mobileLayout).toEqual({ x: 16, y: 20, w: 100, h: 40 })
    expect(box().layout).toEqual({ x: 40, y: 80, w: 200, h: 80 })
    expect(state().dirty).toBe(false)
  })

  it('cancels a marquee on unmount instead of selecting items in the next document', () => {
    loadBox(40, 80)
    const view = render(<LanguageProvider><DndContext><Canvas /></DndContext></LanguageProvider>)
    const canvas = view.container.querySelector('#free-canvas')
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 800 })
    fireEvent.pointerDown(canvas, { button: 0, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 260, clientY: 200 })
    view.unmount()
    act(() => loadBox(600, 700))
    fireEvent.pointerUp(window)

    expect(state().selectedIds).toEqual([])
    expect(state().dirty).toBe(false)
  })
})
