// Free-canvas behaviours found wrong while reading the canvas code end to end.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import FreeCanvasItem from './FreeCanvasItem.jsx'
import { useEditorStore, selectCurrentPage } from '../../store/editorStore.js'
import { CANVAS_SCROLLER_ID } from '../../utils/dragAutoScroll.js'

const s = () => useEditorStore.getState()
const page = () => selectCurrentPage(s())
const top = (id) => page().components.find((c) => c.id === id)

const box = (id, type, layout, extra = {}) => ({ id, type, props: {}, styles: {}, layout, ...extra })

function renderItem(id) {
  const view = render(
    <LanguageProvider>
      <div id={CANVAS_SCROLLER_ID}>
        <div id="free-canvas" style={{ position: 'relative' }}>
          <FreeCanvasItem component={top(id)} canvasScale={1} />
        </div>
      </div>
    </LanguageProvider>,
  )
  return { ...view, handle: view.container.querySelector(`[data-cid="${id}"]`) }
}

const move = (clientX, clientY) =>
  fireEvent(window, new MouseEvent('pointermove', { clientX, clientY, bubbles: true }))
const release = () => fireEvent(window, new MouseEvent('pointerup', { bubbles: true }))

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('dragging a group that was picked starting from a block inside a container', () => {
  // Click a block inside a container, then shift-click two blocks on the page:
  // the selection holds all three. The drag looked each one up among the
  // page's own blocks, did not find the nested one and stopped with an error
  // on every pointer move — the group could not be dragged at all.
  it('moves the blocks on the page and leaves the nested one in its container', () => {
    s().loadSchema({
      theme: {},
      pages: [{
        id: 'p1',
        name: 'Home',
        components: [
          box('wrap', 'container', { x: 500, y: 40, w: 400, h: 300 }, {
            children: [box('inner', 'text', { x: 20, y: 30, w: 200, h: 50 }, { props: { text: 'Inside' } })],
          }),
          box('a', 'text', { x: 40, y: 400, w: 200, h: 60 }, { props: { text: 'A' } }),
          box('b', 'text', { x: 40, y: 600, w: 200, h: 60 }, { props: { text: 'B' } }),
        ],
      }],
    })
    s().selectComponent('inner')
    s().toggleSelect('a')
    s().toggleSelect('b')
    const { handle } = renderItem('a')

    fireEvent.pointerDown(handle, { button: 0, clientX: 100, clientY: 430 })
    move(100, 530)
    release()

    expect(top('a').layout.y).toBeCloseTo(500, -1)
    expect(top('b').layout.y).toBeCloseTo(700, -1)
    expect(top('wrap').children[0].layout).toMatchObject({ x: 20, y: 30 })
  })
})

describe('a tabs block growing onto its content', () => {
  function loadTabs() {
    s().loadSchema({
      theme: {},
      pages: [{
        id: 'p1',
        name: 'Home',
        components: [
          box('tabs', 'tabs', { x: 40, y: 40, w: 600, h: 220 }, {
            props: { tabs: [{ id: 't1', label: 'One' }], activeId: 't1' },
            children: [],
          }),
          box('below', 'text', { x: 40, y: 400, w: 300, h: 60 }, { props: { text: 'Below' } }),
        ],
      }],
    })
  }
  // The content measures 500px tall, whatever box it is in.
  const contentIsTall = () => vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: 600, bottom: 500, width: 600, height: 500,
  })

  // The growth is a measurement. Written as an edit it was an undo step of its
  // own, and undoing it made the block grow again a moment later as a NEW
  // step: Ctrl+Z after adding something to a tab went round in a circle.
  it('is not an undo step, so Undo still takes back the edit before it', () => {
    vi.useFakeTimers()
    loadTabs()
    s().updateProps('below', { text: 'Edited' })
    contentIsTall()
    renderItem('tabs')

    act(() => { vi.advanceTimersByTime(100) })

    expect(top('tabs').layout.h).toBe(500)
    expect(s().past).toHaveLength(1)
    act(() => { s().undo() })
    expect(top('below').props.text).toBe('Below')
  })

  // Looking at the phone layout is not editing it.
  it('on the phone leaves the page following the desktop design', () => {
    vi.useFakeTimers()
    loadTabs()
    s().setViewport('mobile')
    expect(page().mobileManual).toBe(false)
    contentIsTall()
    renderItem('tabs')

    act(() => { vi.advanceTimersByTime(100) })

    expect(top('tabs').mobileLayout.h).toBe(500)
    expect(page().mobileManual).toBe(false)
    expect(s().dirty).toBe(false)
    // What is under it on the phone has made room.
    expect(top('below').mobileLayout.y).toBeGreaterThanOrEqual(top('tabs').mobileLayout.y + 500)
    // And it stays grown when the phone is laid out again after a desktop edit.
    act(() => { s().updateProps('below', { text: 'Edited on the desktop' }) })
    expect(top('tabs').mobileLayout.h).toBe(500)
  })
})
