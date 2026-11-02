import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore, selectCurrentPage } from './editorStore.js'

// The server keeps four levels below the page and 60 children per parent, and
// answers 200 while dropping the rest. What it would drop must not look added.
const store = () => useEditorStore.getState()
const page = () => selectCurrentPage(store())
const find = (id, list = page().components) => {
  for (const c of list) {
    if (c.id === id) return c
    const inner = c.children && find(id, c.children)
    if (inner) return inner
  }
  return null
}
const block = (id, type = 'heading', children) => ({
  id, type, props: {}, styles: {}, layout: { x: 0, y: 0, w: 100, h: 40 }, ...(children ? { children } : {}),
})
const headings = (count) => Array.from({ length: count }, (_, index) => block(`h${index}`))

function load(components) {
  store().loadSchema({ pages: [{ id: 'home', name: 'Home', canvasWidth: 1000, components }], theme: {} })
}
const nested = () => block('c0', 'container', [block('c1', 'container', [block('c2', 'container', [
  block('c3', 'container', [block('c4', 'container', [])]),
])])])

describe('adding a block into a parent', () => {
  beforeEach(() => load([nested()]))

  it('refuses a parent four levels down, leaves no undo step, and says so', () => {
    const steps = store().past.length
    const refusals = store().insertRefusals

    expect(store().addComponent('heading', 10, 10, 'c4')).toBe(false)

    expect(find('c4').children).toEqual([])
    expect(store().past.length).toBe(steps)
    expect(store().insertRefusals).toBe(refusals + 1)
    expect(store().dirty).toBe(false)
  })

  it('accepts one three levels down', () => {
    store().addComponent('heading', 10, 10, 'c3')

    expect(find('c3').children.length).toBe(2)
  })

  it('refuses a full parent and accepts one with room', () => {
    load([block('full', 'container', headings(60)), block('room', 'container', headings(59).map((c) => ({ ...c, id: `r${c.id}` })))])

    expect(store().addComponent('heading', 10, 10, 'full')).toBe(false)
    store().addComponent('heading', 10, 10, 'room')

    expect(find('full').children.length).toBe(60)
    expect(find('room').children.length).toBe(60)
  })
})

describe('duplicating a block inside a parent', () => {
  it('refuses when the parent is full, and says so', () => {
    load([block('full', 'container', headings(60))])
    const refusals = store().insertRefusals
    const steps = store().past.length

    expect(store().duplicateComponent('h3')).toBe(false)

    expect(find('full').children.length).toBe(60)
    expect(store().past.length).toBe(steps)
    expect(store().insertRefusals).toBe(refusals + 1)
  })

  it('still copies beside it when there is room', () => {
    load([block('room', 'container', headings(59))])

    store().duplicateComponent('h3')

    expect(find('room').children.length).toBe(60)
  })

  it('still copies a block on the page, which has no such limit here', () => {
    load(headings(60))

    store().duplicateComponent('h3')

    expect(page().components.length).toBe(61)
  })
})

describe('duplicating a selection inside a parent', () => {
  it('copies only what fits, and says so', () => {
    load([block('room', 'container', headings(59))])
    useEditorStore.setState({ selectedIds: ['h1', 'h2'], selectedId: 'h2' })
    const refusals = store().insertRefusals

    store().duplicateSelection()

    expect(find('room').children.length).toBe(60)
    expect(store().selectedIds.length).toBe(1)
    expect(store().insertRefusals).toBe(refusals + 1)
  })

  it('does nothing at all when nothing fits', () => {
    load([block('full', 'container', headings(60))])
    useEditorStore.setState({ selectedIds: ['h1', 'h2'], selectedId: 'h2' })
    const steps = store().past.length

    store().duplicateSelection()

    expect(find('full').children.length).toBe(60)
    expect(store().past.length).toBe(steps)
    expect(store().selectedIds).toEqual(['h1', 'h2'])
  })
})
