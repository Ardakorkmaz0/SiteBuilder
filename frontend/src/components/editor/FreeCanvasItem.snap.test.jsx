import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { selectCurrentPage, useEditorStore } from '../../store/editorStore.js'
import FreeCanvasItem from './FreeCanvasItem.jsx'

const s = () => useEditorStore.getState()
const page = () => selectCurrentPage(s())
const layoutOf = (id, key = 'layout') => page().components.find((c) => c.id === id)[key]

function CanvasHost() {
  const current = useEditorStore(selectCurrentPage)
  return (
    <LanguageProvider>
      <div id="canvas-scroll">
        <div id="free-canvas" data-builder-canvas-scale="1">
          {current.components.map((c) => <FreeCanvasItem key={c.id} component={c} canvasScale={1} />)}
        </div>
      </div>
    </LanguageProvider>
  )
}

function dragItem(view, id, { fromY = 0, toY = 200, dx = 10 } = {}) {
  const item = view.container.querySelector(`[data-cid="${id}"]`)
  fireEvent.pointerDown(item, { button: 0, clientX: 50, clientY: fromY })
  fireEvent(window, new MouseEvent('pointermove', { bubbles: true, clientX: 50 + dx, clientY: toY }))
  fireEvent(window, new MouseEvent('pointerup', { bubbles: true, clientX: 50 + dx, clientY: toY }))
}

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

afterEach(() => {
  cleanup()
})

describe('FreeCanvasItem snapping ignores hidden siblings', () => {
  it('does not snap onto components hidden on the active PC viewport', () => {
    s().loadSchema({
      pages: [{
        id: 'p1',
        name: 'Home',
        canvasWidth: 1000,
        components: [
          { id: 'moved', type: 'text', props: { text: 'M' }, styles: {}, layout: { x: 100, y: 100, w: 120, h: 40 }, hidden: false, hiddenMobile: false },
          // 4px away from moved's dragged x (104 vs 100+4=104): would snap to x=100 if visible, OR x=204 if ghost sits at x=204!
          // Move moved from x=100 by dx=+99 => rawX=199. Ghost is at x=200 (within 6px threshold).
          { id: 'ghost', type: 'text', props: { text: 'Ghost' }, styles: {}, layout: { x: 200, y: 300, w: 120, h: 40 }, hidden: true, hiddenMobile: false },
        ],
      }],
    })
    s().setViewport('pc')
    const view = render(<CanvasHost />)
    dragItem(view, 'moved', { fromY: 100, toY: 150, dx: 99 })
    expect(layoutOf('moved').x).toBe(199)
  })

  it('ignores hiddenMobile siblings on mobile while still snapping to components shown only on mobile', () => {
    s().loadSchema({
      pages: [{
        id: 'p1',
        name: 'Home',
        canvasWidth: 1000,
        mobileWidth: 390,
        mobileManual: true,
        components: [
          {
            id: 'moved', type: 'text', props: { text: 'M' }, styles: {},
            layout: { x: 40, y: 100, w: 100, h: 40 },
            mobileLayout: { x: 40, y: 100, w: 100, h: 40 },
            hidden: false, hiddenMobile: false,
          },
          {
            id: 'pcOnly', type: 'text', props: { text: 'PC only' }, styles: {},
            layout: { x: 80, y: 300, w: 100, h: 40 },
            mobileLayout: { x: 80, y: 300, w: 100, h: 40 },
            hidden: false, hiddenMobile: true,
          },
          {
            id: 'mobileOnly', type: 'text', props: { text: 'Mobile only' }, styles: {},
            layout: { x: 240, y: 400, w: 100, h: 40 },
            mobileLayout: { x: 240, y: 400, w: 100, h: 40 },
            hidden: true, hiddenMobile: false,
          },
        ],
      }],
    })
    s().setViewport('mobile')
    const view = render(<CanvasHost />)
    // Drag moved by +39 => rawX=79, 1px from pcOnly (x=80) — must NOT snap to pcOnly.
    dragItem(view, 'moved', { fromY: 100, toY: 150, dx: 39 })
    expect(layoutOf('moved', 'mobileLayout').x).toBe(79)
    // Now drag from 79 by +160 => rawX=239, 1px from mobileOnly (x=240) — MUST snap to x=240.
    dragItem(view, 'moved', { fromY: 150, toY: 180, dx: 160 })
    expect(layoutOf('moved', 'mobileLayout').x).toBe(240)
  })
})
