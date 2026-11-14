import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { selectCurrentPage, useEditorStore } from '../../store/editorStore.js'
import FlowCanvasItem, { RegionEditor } from './FlowCanvasItem.jsx'

const s = () => useEditorStore.getState()
const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height })

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

afterEach(() => {
  cleanup()
})

describe('FlowCanvasItem', () => {
  it('computes fixed pin offsets in design pixels across canvasScale changes', () => {
    const pinned = {
      id: 'sticky_btn',
      type: 'button',
      props: { text: 'Pin', scrollBehavior: 'fixed', pinY: 'top', pinOffsetY: 20, pinX: 'left', pinOffsetX: 16 },
      styles: {},
      layout: { w: 120, h: 40 },
    }
    s().loadSchema({
      pages: [{ id: 'home', name: 'Home', canvasWidth: 1000, flowMode: true, components: [pinned] }],
    })
    s().setViewport('pc')

    const renderFixed = (canvasScale) => render(
      <LanguageProvider>
        <div id="canvas-scroll">
          <div id="free-canvas">
            <FlowCanvasItem component={pinned} canvasWidth={1000} canvasScale={canvasScale} />
          </div>
        </div>
      </LanguageProvider>,
    )

    const view = renderFixed(0.5)
    const scroller = view.container.querySelector('#canvas-scroll')
    const canvas = view.container.querySelector('#free-canvas')
    const item = view.container.querySelector('[data-cid="sticky_btn"]')

    // At 0.5 scale: 1000x2000 design canvas is 500x1000 on screen.
    // Item flow position sits at design (0, 300) => screen (0, 150).
    // Scroller starts at screen top 50 => viewTop = 100 design px.
    // Fixed pin target is (16, 120) design => transform translate(16px, -180px).
    scroller.getBoundingClientRect = () => rect(0, 50, 600, 300)
    canvas.getBoundingClientRect = () => rect(0, 0, 500, 1000)
    item.getBoundingClientRect = () => rect(0, 150, 100, 40)

    fireEvent(window, new Event('resize'))
    expect(item.style.transform).toBe('translate(16px, -180px)')
  })

  it('keeps aspect ratio locked when resizing a shaped embed inside a section', () => {
    const avatar = {
      id: 'avatar',
      type: 'html',
      props: {
        code: '<p>Avatar</p>',
        shape: 'circle',
      },
      styles: {},
      layout: { x: 40, y: 40, w: 100, h: 100 },
    }
    const region = {
      id: 'sec',
      type: 'region',
      props: { contentWidth: 980 },
      styles: {},
      layout: { x: 0, y: 0, w: 1000, h: 400 },
      children: [avatar],
    }
    s().loadSchema({
      pages: [{ id: 'home', name: 'Home', canvasWidth: 1000, components: [region] }],
    })
    s().setViewport('pc')
    s().selectComponent('avatar')

    const view = render(
      <LanguageProvider>
        <DndContext>
          <RegionEditor component={region} canvasScale={1} />
        </DndContext>
      </LanguageProvider>,
    )
    const eastHandle = view.container.querySelector('[data-cid="avatar"] [data-resize-handle="e"]')
    fireEvent.pointerDown(eastHandle, { button: 0, clientX: 140, clientY: 90 })
    fireEvent(window, new MouseEvent('pointermove', { bubbles: true, clientX: 180, clientY: 90 }))
    fireEvent(window, new MouseEvent('pointerup', { bubbles: true, clientX: 180, clientY: 90 }))

    const resized = selectCurrentPage(s()).components[0].children[0]
    expect(resized.layout.w).toBe(140)
    expect(resized.layout.h).toBe(140)
  })
})
