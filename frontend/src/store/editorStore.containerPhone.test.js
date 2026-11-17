// On the phone, a block in a container with phone layouts (props.phoneLayout)
// is moved in its own phone layout; one in any other container moves in the
// desktop drawing both breakpoints share.
import { describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore.js'

const state = () => useEditorStore.getState()
const card = () => state().schema.pages[0].components[0]
const block = (id) => card().children.find((c) => c.id === id)

function load(props, mobileManual = true) {
  state().loadSchema({ pages: [{
    id: 'home', name: 'Home', mobileWidth: 390, mobileManual,
    components: [{
      id: 'card', type: 'container', props, styles: {},
      layout: { x: 0, y: 0, w: 300, h: 160 }, mobileLayout: { x: 16, y: 16, w: 180, h: 240 },
      children: [{
        id: 'title', type: 'text', props: { text: 'Humidity' }, styles: {},
        layout: { x: 18, y: 20, w: 260, h: 40 }, mobileLayout: { x: 10, y: 10, w: 160, h: 80 },
      }],
    }, {
      id: 'outside', type: 'text', props: { text: 'Outside' }, styles: {},
      layout: { x: 400, y: 400, w: 100, h: 50 }, mobileLayout: { x: 16, y: 400, w: 100, h: 50 },
    }],
  }] })
  state().setViewport('mobile')
}

describe('a block in a container on the phone', () => {
  it('moves in its own phone layout when the container has phone layouts', () => {
    load({ phoneLayout: true })
    state().setLayout('title', { x: 20, y: 30 })

    expect(block('title').mobileLayout).toEqual({ x: 20, y: 30, w: 160, h: 80 })
    expect(block('title').layout).toEqual({ x: 18, y: 20, w: 260, h: 40 })
  })

  // A page laid out by hand before containers had phone layouts looks as it
  // did: each block gets the place the container's scaled drawing gave it
  // (180 / 300 of its desktop one), and from then on moves there.
  it('takes the place its container\'s scaled drawing gave it, on a page laid out by hand before', () => {
    load({})
    expect(card().props.phoneLayout).toBe(true)
    expect(block('title').mobileLayout).toEqual({ x: 11, y: 12, w: 156, h: 24 })

    state().setLayout('title', { x: 20, y: 30 })
    expect(block('title').mobileLayout).toEqual({ x: 20, y: 30, w: 156, h: 24 })
    expect(block('title').layout).toEqual({ x: 18, y: 20, w: 260, h: 40 })
  })

  // A page whose phone layout is automatic stacks a container's blocks for
  // the container's phone width, as it stacks the page's.
  it('is stacked at the top of its container, inside its margins, on a page laid out automatically', () => {
    load({}, false)
    const phoneW = card().mobileLayout.w
    expect(card().props.phoneLayout).toBe(true)
    expect(block('title').mobileLayout).toMatchObject({ x: 16, y: 16, w: phoneW - 32 })
  })

  it('stays in the shared desktop drawing of a tab panel', () => {
    state().loadSchema({ pages: [{
      id: 'home', name: 'Home', mobileWidth: 390, mobileManual: true,
      components: [{
        id: 'tabs', type: 'tabs', props: { tabs: [{ id: 'one', label: 'One' }], activeId: 'one' }, styles: {},
        layout: { x: 0, y: 0, w: 600, h: 300 }, mobileLayout: { x: 16, y: 16, w: 358, h: 300 },
        children: [{
          id: 'card', type: 'container', tabId: 'one', props: {}, styles: {},
          layout: { x: 0, y: 0, w: 300, h: 160 }, mobileLayout: { x: 0, y: 0, w: 200, h: 80 },
          children: [{ id: 'title', type: 'text', props: { text: 'Humidity' }, styles: {}, layout: { x: 18, y: 20, w: 260, h: 40 }, mobileLayout: { x: 0, y: 0, w: 200, h: 80 } }],
        }],
      }],
    }] })
    const inPanel = state().schema.pages[0].components[0].children[0]
    expect(inPanel.props.phoneLayout).toBeUndefined()
    expect(inPanel.children[0].mobileLayout).toEqual({ x: 0, y: 0, w: 200, h: 80 })
  })

  it('lands where it is dropped in the container\'s phone space, keeping its desktop place under the others', () => {
    load({ phoneLayout: true })
    state().moveComponentInto('outside', 'card', { x: 12, y: 100 })

    const moved = block('outside')
    expect(moved.mobileLayout).toEqual({ x: 12, y: 100, w: 100, h: 50 })
    expect(moved.layout).toEqual({ x: 0, y: 60, w: 100, h: 50 })
  })

  it('gets, when added to it, the phone place its desktop one has in the scaled drawing', () => {
    load({ phoneLayout: true })
    state().setViewport('pc')
    state().addComponent('text', 100, 50, 'card', null, { w: 100, h: 40 })

    const added = card().children.at(-1)
    expect(added.layout).toEqual({ x: 100, y: 50, w: 100, h: 40 })
    // 180 / 300 of each.
    expect(added.mobileLayout).toEqual({ x: 60, y: 30, w: 60, h: 24 })
  })
})
