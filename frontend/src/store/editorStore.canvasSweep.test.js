import { beforeEach, describe, expect, it } from 'vitest'
import { selectCurrentPage, useEditorStore } from './editorStore.js'

const store = () => useEditorStore.getState()
const components = () => selectCurrentPage(store()).components

beforeEach(() => {
  store().loadSchema({
    pages: [{
      id: 'home', name: 'Home', mobileManual: true,
      components: ['first', 'second'].map((id, index) => ({
        id, type: 'heading', props: { text: id }, styles: {},
        layout: { x: 100 + index * 300, y: 80, w: 240, h: 60 },
        mobileLayout: { x: 20, y: 80 + index * 120, w: 240, h: 60 },
      })),
    }],
  })
  store().setViewport('mobile')
})

describe('duplicating a manually arranged phone design', () => {
  it('places a single duplicate away from its original on the phone', () => {
    const original = structuredClone(components()[0])
    store().duplicateComponent('first')
    const copy = components().find((component) => component.id === store().selectedId)

    expect(copy.mobileLayout).toEqual({ ...original.mobileLayout, x: 44, y: 104 })
    expect(components().find((component) => component.id === 'first')).toEqual(original)
    expect(selectCurrentPage(store()).mobileManual).toBe(true)
  })

  it('offsets every duplicate in a multi-selection on the phone', () => {
    store().selectMany(['first', 'second'])
    store().duplicateSelection()
    const copies = store().selectedIds.map((id) => components().find((component) => component.id === id))

    expect(copies.map((component) => component.mobileLayout)).toEqual([
      { x: 44, y: 104, w: 240, h: 60 },
      { x: 44, y: 224, w: 240, h: 60 },
    ])
    store().undo()
    expect(components()).toHaveLength(2)
    store().redo()
    expect(components().slice(2).map((component) => component.mobileLayout)).toEqual(copies.map((component) => component.mobileLayout))
  })

  it('keeps a duplicate inside the phone width near the right edge', () => {
    store().setLayout('first', { x: 150, w: 240 })
    store().duplicateComponent('first')
    const copy = components().find((component) => component.id === store().selectedId)

    expect(copy.mobileLayout.x + copy.mobileLayout.w).toBeLessThanOrEqual(390)
    expect(copy.mobileLayout.y).toBe(104)
  })

  it('keeps a desktop duplicate inside the artboard near the right edge', () => {
    store().setViewport('pc')
    store().setLayout('first', { x: 760 })
    store().duplicateComponent('first')
    const copy = components().find((component) => component.id === store().selectedId)

    expect(copy.layout).toEqual({ x: 760, y: 104, w: 240, h: 60 })
  })

  it('keeps repeated pastes inside both artboards before and after loading', () => {
    store().setViewport('pc')
    store().setLayout('first', { x: 760 })
    store().setViewport('mobile')
    store().setLayout('first', { x: 150 })
    store().selectComponent('first')
    store().copySelection()
    store().pasteClipboard()
    store().pasteClipboard()
    const copies = components().slice(2)

    expect(copies.map((component) => component.layout)).toEqual([
      { x: 760, y: 104, w: 240, h: 60 },
      { x: 760, y: 128, w: 240, h: 60 },
    ])
    expect(copies.map((component) => component.mobileLayout)).toEqual([
      { x: 150, y: 104, w: 240, h: 60 },
      { x: 150, y: 128, w: 240, h: 60 },
    ])
    store().loadSchema(structuredClone(store().schema))
    expect(components().slice(2)).toEqual(copies)
  })
})
