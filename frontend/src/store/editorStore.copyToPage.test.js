import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from './editorStore.js'

const store = () => useEditorStore.getState()
const count = (id) => store().schema.pages.find((page) => page.id === id).components.length

function load() {
  store().loadSchema({ pages: [
    { id: 'source', name: 'Source', components: [{
      id: 'heading', type: 'heading', props: { text: 'Copy me' }, styles: {},
      layout: { x: 20, y: 20, w: 200, h: 60 },
    }] },
    { id: 'first', name: 'First', components: [] },
    { id: 'second', name: 'Second', components: [] },
  ] })
  vi.spyOn(Date, 'now').mockReturnValue(1_790_000_000_000)
}

afterEach(() => vi.restoreAllMocks())

describe('separate copy-to-page history actions', () => {
  it('undoing the second destination keeps the first destination copy', () => {
    load()
    store().copyComponentToPage('heading', 'first')
    store().copyComponentToPage('heading', 'second')
    store().undo()

    expect(count('source')).toBe(1)
    expect(count('first')).toBe(1)
    expect(count('second')).toBe(0)
    store().redo()
    expect(count('first')).toBe(1)
    expect(count('second')).toBe(1)
  })

  it('keeps copies separate even with a save between the actions', () => {
    load()
    store().copyComponentToPage('heading', 'first')
    store().markSaved()
    store().copyComponentToPage('heading', 'second')
    store().undo()

    expect(count('first')).toBe(1)
    expect(count('second')).toBe(0)
    expect(store().dirty).toBe(true)
  })

  it('undo removes only the newest copy when the same destination is chosen twice', () => {
    load()
    store().copyComponentToPage('heading', 'first')
    store().copyComponentToPage('heading', 'first')
    store().undo()

    expect(count('first')).toBe(1)
    store().undo()
    expect(count('first')).toBe(0)
    store().redo()
    expect(count('first')).toBe(1)
    store().redo()
    expect(count('first')).toBe(2)
  })
})
