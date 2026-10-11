// Store actions found wrong while reading the canvas code end to end.
import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore, selectCurrentPage } from './editorStore.js'

const s = () => useEditorStore.getState()
const page = () => selectCurrentPage(s())
const byId = (id) => {
  const find = (list) => {
    for (const c of list) {
      if (c.id === id) return c
      const inner = Array.isArray(c.children) ? find(c.children) : null
      if (inner) return inner
    }
    return null
  }
  return find(page().components)
}

const box = (id, type, layout, extra = {}) => ({ id, type, props: {}, styles: {}, layout, ...extra })

function load(components, pageExtra = {}) {
  s().loadSchema({ theme: {}, pages: [{ id: 'p1', name: 'Home', components, ...pageExtra }] })
}

describe('deleting two sections at once', () => {
  beforeEach(() => {
    load([
      box('band1', 'region', { x: 0, y: 0, w: 1000, h: 300 }, { children: [] }),
      box('band2', 'region', { x: 0, y: 300, w: 1000, h: 200 }, { children: [] }),
      box('near', 'heading', { x: 40, y: 520, w: 400, h: 60 }, { props: { text: 'Right under the second section' } }),
      box('far', 'heading', { x: 40, y: 900, w: 400, h: 60 }, { props: { text: 'Further down' } }),
    ])
  })

  // The second section was measured where it stood before the first one went,
  // so what sat right under it was taken to be above it and stayed where it
  // was — a hole the height of the section, with the rest of the page pulled
  // up over it.
  it('pulls everything under them up by both heights', () => {
    s().selectMany(['band1', 'band2'])
    s().removeSelection()

    expect(page().components.map((c) => c.id)).toEqual(['near', 'far'])
    expect(byId('near').layout.y).toBe(20)
    expect(byId('far').layout.y).toBe(400)
  })

  it('whichever order they were picked in', () => {
    s().selectMany(['band2', 'band1'])
    s().removeSelection()

    expect(byId('near').layout.y).toBe(20)
    expect(byId('far').layout.y).toBe(400)
  })
})

describe('aligning one block on the phone', () => {
  // The phone layout follows the desktop one until it is edited by hand. Align
  // wrote the new place and left the page following, so the very next line
  // laid the phone out again and the block was back where it started.
  it('moves it, and the phone layout is the user\'s from then on', () => {
    load([box('btn', 'button', { x: 40, y: 40, w: 160, h: 48 }, { props: { text: 'Go' } })])
    s().setViewport('mobile')
    s().selectComponent('btn')
    const before = byId('btn').mobileLayout
    expect(before.x).toBeGreaterThan(0)

    s().alignSelection('left')

    expect(byId('btn').mobileLayout.x).toBe(0)
    expect(page().mobileManual).toBe(true)
    // The desktop design is not touched from the phone.
    expect(byId('btn').layout.x).toBe(40)
  })
})

describe('duplicating a selection that reaches into a container', () => {
  it('puts the copy of a nested block beside it, not out on the page', () => {
    load([
      box('wrap', 'container', { x: 100, y: 100, w: 500, h: 300 }, {
        children: [box('inner', 'heading', { x: 20, y: 30, w: 200, h: 50 }, { props: { text: 'Inside' } })],
      }),
      box('outer', 'heading', { x: 40, y: 500, w: 300, h: 60 }, { props: { text: 'Outside' } }),
    ])
    s().selectMany(['inner', 'outer'])

    s().duplicateSelection()

    expect(byId('wrap').children).toHaveLength(2)
    expect(page().components.filter((c) => c.type === 'heading')).toHaveLength(2)
    expect(s().selectedIds).toHaveLength(2)
  })
})

describe('a narrower phone', () => {
  it('re-lays the blocks inside a section for the new width at once', () => {
    load([
      box('band', 'region', { x: 0, y: 0, w: 1000, h: 300 }, {
        children: [box('text', 'text', { x: 40, y: 40, w: 600, h: 80 }, { props: { text: 'Some words in a section' } })],
      }),
    ])
    s().setViewport('mobile')
    expect(byId('text').mobileLayout.w).toBe(390 - 32)

    s().setCanvasPreset({ width: 320, fold: 0 })

    const laid = byId('text').mobileLayout
    expect(laid.x + laid.w).toBeLessThanOrEqual(320)
  })
})
