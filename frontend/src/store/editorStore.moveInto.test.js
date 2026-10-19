import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore, selectCurrentPage } from './editorStore.js'

const store = () => useEditorStore.getState()
const page = () => selectCurrentPage(store())
const top = () => page().components.map((c) => c.id)
const find = (id, list = page().components) => {
  for (const c of list) {
    if (c.id === id) return c
    const inner = c.children && find(id, c.children)
    if (inner) return inner
  }
  return null
}
const node = (id, type, layout, extra = {}) => ({ id, type, props: {}, styles: {}, layout, ...extra })

function load({ mobileManual = false } = {}) {
  store().loadSchema({
    pages: [{
      id: 'home',
      name: 'Home',
      canvasWidth: 1000,
      mobileWidth: 390,
      mobileManual,
      components: [
        node('heading', 'heading', { x: 100, y: 900, w: 400, h: 60 }, { mobileLayout: { x: 16, y: 900, w: 358, h: 70 } }),
        node('section', 'region', { x: 0, y: 400, w: 1000, h: 360 }, {
          props: { contentWidth: 980 },
          mobileLayout: { x: 0, y: 400, w: 390, h: 360 },
          children: [node('inSection', 'text', { x: 20, y: 30, w: 300, h: 50 }, { mobileLayout: { x: 16, y: 16, w: 300, h: 50 } })],
        }),
        node('box', 'container', { x: 40, y: 1000, w: 600, h: 300 }, {
          children: [node('inner', 'container', { x: 10, y: 10, w: 300, h: 200 }, { children: [] })],
        }),
        node('tabs', 'tabs', { x: 40, y: 1400, w: 600, h: 240 }, {
          props: { tabs: [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }], activeId: 'two' },
          children: [],
        }),
      ],
    }],
  })
  store().setViewport('pc')
}

beforeEach(() => load())

describe('moving a block into a section', () => {
  it('attaches it where it was dropped, and stacks it below on the phone', () => {
    // A page with its own phone layout: on an automatic one the phone column
    // is worked out again from the desktop design after every change.
    load({ mobileManual: true })
    expect(store().moveComponentInto('heading', 'section', { x: 120, y: 40 })).toBe(true)
    expect(top()).not.toContain('heading')
    const moved = find('heading')
    expect(find('section').children.map((c) => c.id)).toEqual(['inSection', 'heading'])
    expect(moved.layout).toEqual({ x: 120, y: 40, w: 400, h: 60 })
    // Below the section's last phone child (16 + 50) with the 16 px gap.
    expect(moved.mobileLayout).toEqual({ x: 16, y: 82, w: 358, h: 70 })
    expect(store().selectedIds).toEqual(['heading'])
  })

  it('is one undo step', () => {
    store().moveComponentInto('heading', 'section', { x: 120, y: 40 })
    store().undo()
    expect(top()).toContain('heading')
    expect(find('heading').layout).toEqual({ x: 100, y: 900, w: 400, h: 60 })
    expect(find('section').children.map((c) => c.id)).toEqual(['inSection'])
  })

  it('turns a drop on a narrower visible grid back into design coordinates', () => {
    // 980 px of design shown 600 px wide. A 400-wide block at 200 has its
    // middle at 400: docked centre, 100 px right of the grid's middle (300).
    // In the design that is 490 + 100, so it starts at 590 - 200 = 390.
    store().moveComponentInto('heading', 'section', { x: 200, y: 10, displayWidth: 600 })
    expect(find('heading').layout.x).toBe(390)
  })

  it('keeps the block inside the section', () => {
    store().moveComponentInto('heading', 'section', { x: 900, y: 10 })
    // 980 wide, the block 400: it can start at 580 at most.
    expect(find('heading').layout.x).toBe(580)
  })

  it('on the phone, takes the drop for the phone and stacks the desktop place', () => {
    load({ mobileManual: true })
    store().setViewport('mobile')
    store().moveComponentInto('heading', 'section', { x: 16, y: 200 })
    const moved = find('heading')
    expect(moved.mobileLayout).toEqual({ x: 16, y: 200, w: 358, h: 70 })
    // Below the section's last desktop child (30 + 50) with the 16 px gap.
    expect(moved.layout).toEqual({ x: 16, y: 96, w: 400, h: 60 })
    expect(page().mobileManual).toBe(true)
  })
})

describe('moving a block out onto the page', () => {
  it('places it on the page where it was dropped', () => {
    expect(store().moveComponentInto('inSection', null, { x: 50, y: 1700 })).toBe(true)
    expect(top()).toContain('inSection')
    expect(find('section').children).toEqual([])
    expect(find('inSection').layout).toEqual({ x: 50, y: 1700, w: 300, h: 50 })
  })
})

describe('tab panels', () => {
  it('puts the block in the tab being edited, and drops the tag on the way out', () => {
    store().moveComponentInto('heading', 'tabs', { x: 12, y: 12 })
    expect(find('heading').tabId).toBe('two')
    store().moveComponentInto('heading', null, { x: 0, y: 0 })
    expect(find('heading')).not.toHaveProperty('tabId')
  })
})

describe('moves that are refused', () => {
  const unchanged = (fn) => {
    const before = store().schema
    const pastBefore = store().past.length
    expect(fn()).toBe(false)
    expect(store().schema).toBe(before)
    expect(store().past.length).toBe(pastBefore)
  }

  it('into itself or into its own child', () => {
    unchanged(() => store().moveComponentInto('box', 'box', { x: 0, y: 0 }))
    unchanged(() => store().moveComponentInto('box', 'inner', { x: 0, y: 0 }))
  })

  it('of a section, which stays a band of the page', () => {
    unchanged(() => store().moveComponentInto('section', 'box', { x: 0, y: 0 }))
  })

  it('into the parent it is already in', () => {
    unchanged(() => store().moveComponentInto('inSection', 'section', { x: 5, y: 5 }))
    unchanged(() => store().moveComponentInto('heading', null, { x: 5, y: 5 }))
  })

  it('into something that is not a parent', () => {
    unchanged(() => store().moveComponentInto('heading', 'inSection', { x: 0, y: 0 }))
  })

  it('deeper than the server keeps', () => {
    // box (1) > inner (2) > a (3) > b (4): one level more would be dropped on save.
    const chain = node('a', 'container', { x: 0, y: 0, w: 100, h: 100 }, {
      children: [node('b', 'container', { x: 0, y: 0, w: 50, h: 50 }, { children: [] })],
    })
    store().loadSchema({ pages: [{ id: 'home', name: 'Home', components: [
      node('box', 'container', { x: 0, y: 0, w: 600, h: 300 }, {
        children: [node('inner', 'container', { x: 0, y: 0, w: 300, h: 200 }, { children: [] })],
      }),
      chain,
    ] }] })
    // inner sits at depth 1; a would go to 2 and b to 3: allowed.
    expect(store().moveComponentInto('a', 'inner', { x: 0, y: 0 })).toBe(true)
    store().undo()
    // Under b (depth 1 now) a cannot go: it is a's own child.
    unchanged(() => store().moveComponentInto('a', 'b', { x: 0, y: 0 }))
    const deep = node('d1', 'container', { x: 0, y: 0, w: 50, h: 50 }, {
      children: [node('d2', 'container', { x: 0, y: 0, w: 40, h: 40 }, {
        children: [node('d3', 'container', { x: 0, y: 0, w: 30, h: 30 }, {
          children: [node('d4', 'text', { x: 0, y: 0, w: 20, h: 20 })],
        })],
      })],
    })
    store().loadSchema({ pages: [{ id: 'home', name: 'Home', components: [
      node('box', 'container', { x: 0, y: 0, w: 600, h: 300 }, { children: [] }),
      deep,
    ] }] })
    // d1 would sit at depth 1 and d4 at 4: the limit, allowed.
    expect(store().moveComponentInto('d1', 'box', { x: 0, y: 0 })).toBe(true)
    store().undo()
    store().loadSchema({ pages: [{ id: 'home', name: 'Home', components: [
      node('box', 'container', { x: 0, y: 0, w: 600, h: 300 }, {
        children: [node('inner', 'container', { x: 0, y: 0, w: 300, h: 200 }, { children: [] })],
      }),
      deep,
    ] }] })
    // Into inner, d4 would reach depth 5.
    unchanged(() => store().moveComponentInto('d1', 'inner', { x: 0, y: 0 }))
  })

  it('into a parent that already holds as many as the server keeps', () => {
    const full = Array.from({ length: 60 }, (_, i) => node(`k${i}`, 'text', { x: 0, y: i, w: 10, h: 10 }))
    store().loadSchema({ pages: [{ id: 'home', name: 'Home', components: [
      node('box', 'container', { x: 0, y: 0, w: 600, h: 300 }, { children: full }),
      node('heading', 'heading', { x: 0, y: 400, w: 100, h: 40 }),
    ] }] })
    unchanged(() => store().moveComponentInto('heading', 'box', { x: 0, y: 0 }))
  })
})
