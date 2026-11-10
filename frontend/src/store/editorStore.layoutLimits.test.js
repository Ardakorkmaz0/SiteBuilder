import { beforeEach, describe, expect, it } from 'vitest'
import { selectCurrentPage, useEditorStore } from './editorStore.js'

const store = () => useEditorStore.getState()
const note = () => selectCurrentPage(store()).components.find((block) => block.id === 'note')

// The server stores a box up to x 5000, y 200000, width 4000 and height
// 100000 (MAX_LAYOUT_* in backend/builder/validators.py). A box the editor
// holds past that is changed by the save and only shows it after a reload.
describe('the box of a block and what the server stores', () => {
  beforeEach(() => {
    store().loadSchema({
      theme: {},
      pages: [{
        id: 'home', name: 'Home', canvasWidth: 4000,
        components: [{
          id: 'note', type: 'text', props: { text: 'Note' }, styles: {},
          layout: { x: 40, y: 40, w: 300, h: 80 },
        }],
      }],
    })
  })

  it('keeps a block far down a long page, and a tall one, as they were set', () => {
    store().setLayout('note', { y: 20320, h: 8200 })

    expect(note().layout).toEqual({ x: 40, y: 20320, w: 300, h: 8200 })
  })

  it('stops a typed position and size at what the server stores', () => {
    store().setLayout('note', { y: 9000000, h: 9000000 })
    expect(note().layout).toEqual({ x: 40, y: 200000, w: 300, h: 100000 })

    store().setLayout('note', { x: 0, w: 9000000 })
    expect(note().layout).toEqual({ x: 0, y: 200000, w: 4000, h: 100000 })
  })

  it('holds a block of a flow page, which has no page edge, to the same limits', () => {
    store().loadSchema({
      theme: {},
      pages: [{
        id: 'home', name: 'Home', flowMode: true,
        components: [{
          id: 'note', type: 'text', props: { text: 'Note' }, styles: {},
          layout: { x: 0, y: 0, w: 300, h: 80 },
        }],
      }],
    })

    store().setLayout('note', { x: 9000000, w: 9000000 })

    expect(note().layout).toEqual({ x: 5000, y: 0, w: 4000, h: 80 })
  })
})
