import { describe, expect, it } from 'vitest'
import { selectCurrentPage, useEditorStore } from './editorStore.js'

const store = () => useEditorStore.getState()
const firstBlock = () => selectCurrentPage(store()).components[0]

// Two blocks dragged into the top-left corner of their parent both sit at
// (0, 0): a picture with its caption over it. Opening the site again used to
// take that for a design from before nested blocks had places, and spread them
// out one under the other.
describe('opening a design whose nested blocks share a corner', () => {
  it('leaves the blocks in a box where they were put', () => {
    store().loadSchema({
      theme: {},
      pages: [{
        id: 'home', name: 'Home',
        components: [{
          id: 'box', type: 'container', props: {}, styles: {},
          layout: { x: 100, y: 100, w: 600, h: 400 },
          children: [
            { id: 'picture', type: 'image', props: {}, styles: {}, layout: { x: 0, y: 0, w: 260, h: 170 } },
            { id: 'caption', type: 'text', props: { text: 'Caption' }, styles: {}, layout: { x: 0, y: 0, w: 360, h: 80 } },
          ],
        }],
      }],
    })

    expect(firstBlock().children.map((child) => child.layout)).toEqual([
      { x: 0, y: 0, w: 260, h: 170 },
      { x: 0, y: 0, w: 360, h: 80 },
    ])
  })

  it('leaves a phone design arranged by hand as it was in a section', () => {
    store().loadSchema({
      theme: {},
      pages: [{
        id: 'home', name: 'Home', mobileWidth: 390, mobileManual: true,
        components: [{
          id: 'band', type: 'region', props: { contentWidth: 980 }, styles: {},
          layout: { x: 0, y: 0, w: 1000, h: 400 },
          mobileLayout: { x: 0, y: 0, w: 390, h: 400 },
          children: [
            {
              id: 'picture', type: 'image', props: {}, styles: {},
              layout: { x: 40, y: 40, w: 260, h: 170 },
              mobileLayout: { x: 0, y: 0, w: 260, h: 170 },
            },
            {
              id: 'caption', type: 'text', props: { text: 'Caption' }, styles: {},
              layout: { x: 60, y: 90, w: 360, h: 80 },
              mobileLayout: { x: 0, y: 0, w: 358, h: 73 },
            },
          ],
        }],
      }],
    })

    expect(selectCurrentPage(store()).mobileManual).toBe(true)
    expect(firstBlock().children.map((child) => child.mobileLayout)).toEqual([
      { x: 0, y: 0, w: 260, h: 170 },
      { x: 0, y: 0, w: 358, h: 73 },
    ])
  })
})
