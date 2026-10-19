// Which drags may move a block into a container, through the real pointer
// handlers and the store (round 4 review: pinned blocks, bars, groups).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import FreeCanvasItem from './FreeCanvasItem.jsx'
import { useEditorStore, selectCurrentPage } from '../../store/editorStore.js'

const s = () => useEditorStore.getState()
const page = () => selectCurrentPage(s())
const node = (id, type, layout, props = {}, children) => ({ id, type, layout, props, styles: {}, ...(children ? { children } : {}) })
const all = (list = page().components) => list.flatMap((n) => [n, ...all(n.children || [])])
const find = (id) => all().find((n) => n.id === id)
const childIds = (id) => (find(id).children || []).map((n) => n.id)
const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top })

function Canvas() {
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

// `target` sits at (400, 100) on screen. The dragged block is on the page at
// (40, 500), or inside `source` at (40, 500) + (40, 40).
function load(props = {}, { type = 'text', nested = false } = {}) {
  const dragged = node('dragged', type, { x: 40, y: nested ? 40 : 500, w: 180, h: 60 }, props)
  s().loadSchema({
    pages: [{
      id: 'p',
      name: 'Home',
      canvasWidth: 1000,
      mobileWidth: 390,
      mobileManual: true,
      components: [
        node('target', 'container', { x: 400, y: 100, w: 400, h: 300 }, {}, []),
        nested ? node('source', 'container', { x: 40, y: 500, w: 400, h: 300 }, {}, [dragged]) : dragged,
        node('other', 'text', { x: 40, y: 900, w: 180, h: 60 }, { text: 'Other' }),
      ],
    }],
  })
  s().setViewport('pc')
}

// Pressed 40 px right and 30 px down of the block's corner, let go at
// (480, 180): its corner lands at (440, 150), (40, 50) inside `target`.
// Says whether `target` was outlined while the block was over it.
function drag({ nested = false } = {}) {
  const view = render(<Canvas />)
  const canvas = view.container.querySelector('#free-canvas')
  canvas.getBoundingClientRect = () => rect(0, 0, 1000, 2000)
  const target = view.container.querySelector('[data-builder-droppable-id="target"]')
  target.getBoundingClientRect = () => rect(400, 100, 400, 300)
  const item = view.container.querySelector('[data-cid="dragged"]')
  const top = nested ? 540 : 500
  item.getBoundingClientRect = () => rect(40, top, 180, 60)
  document.elementsFromPoint = vi.fn(() => [target, canvas])
  fireEvent.pointerDown(item, { button: 0, clientX: 80, clientY: top + 30 })
  fireEvent(window, new MouseEvent('pointermove', { bubbles: true, clientX: 480, clientY: 180 }))
  const outlined = target.classList.contains('pwb-drop-target')
  fireEvent(window, new MouseEvent('pointerup', { bubbles: true, clientX: 480, clientY: 180 }))
  return { outlined }
}

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

afterEach(() => {
  delete document.elementsFromPoint
})

describe('a block on the page let go over a container', () => {
  it('moves into it, where it was let go', () => {
    load({ text: 'Plain' })
    expect(drag()).toEqual({ outlined: true })
    expect(childIds('target')).toEqual(['dragged'])
    expect(find('dragged').layout).toEqual({ x: 40, y: 50, w: 180, h: 60 })
  })

  it.each(['sticky', 'fixed'])('stays on the page when it is pinned (%s)', (scrollBehavior) => {
    load({ text: 'Pinned', scrollBehavior })
    expect(drag()).toEqual({ outlined: false })
    expect(childIds('target')).toEqual([])
    expect(page().components.map((n) => n.id)).toContain('dragged')
  })

  it('stays on the page when it is a full-width bar', () => {
    load({ brand: 'Nav' }, { type: 'navbar' })
    expect(drag()).toEqual({ outlined: false })
    expect(childIds('target')).toEqual([])
  })

  it.each([{ widthMode: 'boxed' }, { navLayout: 'vertical' }])('moves in when it is a bar drawn as a box (%o)', (props) => {
    load({ brand: 'Nav', ...props }, { type: 'navbar' })
    drag()
    expect(childIds('target')).toEqual(['dragged'])
  })

  it('stays on the page when it was pressed as part of a multi-selection', () => {
    load({ text: 'Plain' })
    s().selectComponent('dragged')
    s().toggleSelect('other')
    expect(drag()).toEqual({ outlined: false })
    expect(childIds('target')).toEqual([])
  })
})

describe('a block inside a container let go over another', () => {
  it('moves into the other one', () => {
    load({ text: 'Plain' }, { nested: true })
    drag({ nested: true })
    expect(childIds('source')).toEqual([])
    expect(childIds('target')).toEqual(['dragged'])
  })

  it('keeps its parent when it was pressed as part of a multi-selection', () => {
    load({ text: 'Plain' }, { nested: true })
    s().selectComponent('dragged')
    s().toggleSelect('other')
    expect(drag({ nested: true })).toEqual({ outlined: false })
    expect(childIds('source')).toEqual(['dragged'])
    expect(childIds('target')).toEqual([])
  })
})
