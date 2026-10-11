// Zooming a canvas past its fit has to leave the whole design reachable, and
// the zoom control has to actually zoom. Both edit canvases failed one of
// those: the component canvas clipped anything past the workspace edge with no
// scrollbar, and the HTML canvas on its default "Responsive" device ignored the
// zoom entirely while the readout kept changing.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { useEditorStore } from '../../store/editorStore.js'
import Canvas from './Canvas.jsx'
import HtmlWorkspace from './HtmlWorkspace.jsx'

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

function loadPage(viewport = 'pc') {
  useEditorStore.getState().loadSchema({
    theme: {},
    pages: [{
      id: 'home',
      name: 'Home',
      canvasWidth: 1000,
      components: [{ id: 'b', type: 'button', props: {}, styles: {}, layout: { x: 40, y: 40, w: 120, h: 44 } }],
    }],
  })
  useEditorStore.getState().setViewport(viewport)
}

function renderCanvas(zoom) {
  return render(
    <LanguageProvider>
      <DndContext>
        <Canvas zoom={zoom} />
      </DndContext>
    </LanguageProvider>,
  )
}

describe('component canvas when zoomed past fit', () => {
  it.each(['pc', 'mobile'])('%s: the workspace scrolls both ways', (viewport) => {
    loadPage(viewport)
    const { container } = renderCanvas(200)
    const workspace = container.querySelector('main')
    expect(workspace.className).toContain('overflow-auto')
    expect(workspace.className).not.toContain('overflow-hidden')
    expect(workspace.className).not.toContain('overflow-x-hidden')
  })

  it('keeps the old clipping on fit, where nothing overflows', () => {
    loadPage('pc')
    const { container } = renderCanvas('fit')
    expect(container.querySelector('main').className).toContain('overflow-x-hidden')
  })
})

describe('component canvas pointer buttons', () => {
  it('a right- or middle-click on the canvas keeps the selection', () => {
    loadPage('pc')
    useEditorStore.getState().selectComponent('b')
    const { container } = renderCanvas('fit')
    const canvas = container.querySelector('#free-canvas')
    fireEvent.pointerDown(canvas, { button: 2 })
    fireEvent.pointerDown(canvas, { button: 1 })
    expect(useEditorStore.getState().selectedId).toBe('b')
    // A plain left click on the bare canvas still deselects.
    fireEvent.pointerDown(canvas, { button: 0 })
    fireEvent.pointerUp(window, { button: 0 })
    expect(useEditorStore.getState().selectedId).toBe(null)
  })
})

describe('HTML canvas on the Responsive device', () => {
  function renderWorkspace(zoom) {
    localStorage.setItem('pwb_htmlmode_zoom-test', 'edit')
    if (zoom === 'fit') localStorage.removeItem('pwb_html_canvas_zoom')
    else localStorage.setItem('pwb_html_canvas_zoom', String(zoom))
    return render(
      <LanguageProvider>
        <HtmlWorkspace
          persistKey="zoom-test"
          html="<html><body><main>Page</main></body></html>"
          deviceId="fit"
        />
      </LanguageProvider>,
    )
  }

  const scaledBox = () => screen.getByTitle('site').closest('[style*="scale("]')

  it('fills the stage without scaling on fit', () => {
    renderWorkspace('fit')
    expect(scaledBox()).toBeNull()
  })

  it('draws the page at the chosen zoom, in a stage that scrolls', () => {
    renderWorkspace(200)
    expect(scaledBox()?.style.transform).toBe('scale(2)')
    const stage = scaledBox().closest('main')
    expect(stage.className).toContain('overflow-auto')
  })
  // A small window with both rails open leaves the page about 700px. It used to
  // be drawn at that width: its phone layout, with the phone overrides applied,
  // under a toggle that said PC.
  describe('in an area narrower than a desktop', () => {
    const clientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
    const clientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')
    let areaWidth = 0
    let resized = []

    const stubStage = () => {
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => areaWidth })
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 624 })
      resized = []
      globalThis.ResizeObserver = class {
        constructor(callback) { resized.push(callback) }
        observe() {}
        disconnect() {}
      }
    }
    const restore = (name, descriptor) => {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor)
      else delete HTMLElement.prototype[name]
    }
    afterEach(() => {
      restore('clientWidth', clientWidth)
      restore('clientHeight', clientHeight)
    })

    const pageBox = () => screen.getByTitle('site').parentElement

    it('keeps the page at a desktop width and draws it smaller', () => {
      areaWidth = 734
      stubStage()
      renderWorkspace('fit')
      expect(pageBox().style.width).toBe('1024px')
      expect(pageBox().style.transform).toMatch(/^scale\(0\.69/)
    })

    it('fills the area as before when the area is wide enough', () => {
      areaWidth = 1224
      stubStage()
      renderWorkspace('fit')
      expect(pageBox().style.width).toBe('100%')
      expect(pageBox().style.transform).toBe('')
    })

    it('does not reload the page when the area crosses that width', () => {
      areaWidth = 1224
      stubStage()
      renderWorkspace('fit')
      const frame = screen.getByTitle('site')

      areaWidth = 734 // a side rail opened
      act(() => resized.forEach((callback) => callback()))

      expect(pageBox().style.width).toBe('1024px')
      expect(screen.getByTitle('site')).toBe(frame)
    })
  })
})
