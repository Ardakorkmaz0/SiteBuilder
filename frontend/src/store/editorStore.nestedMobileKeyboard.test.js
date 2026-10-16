import { describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore.js'

const state = () => useEditorStore.getState()
const page = () => state().schema.pages[0]
const parent = () => page().components[0]
const child = () => parent().children[0]

function load(type = 'container', mobileManual = true) {
  state().loadSchema({ pages: [{
    id: 'home', name: 'Home', mobileWidth: 320, mobileManual,
    components: [{
      id: 'parent', type,
      props: type === 'tabs' ? { tabs: [{ id: 'one', label: 'One' }], activeId: 'one' } : {},
      styles: {}, layout: { x: 0, y: 0, w: 700, h: 300 },
      mobileLayout: { x: 0, y: 0, w: 320, h: 300 },
      children: [{
        id: 'child', type: 'text', tabId: 'one', props: { text: 'Move me' }, styles: {},
        layout: { x: 100, y: 40, w: 120, h: 60 },
        mobileLayout: { x: 16, y: 16, w: 200, h: 50 },
      }],
    }, {
      id: 'outside', type: 'text', props: { text: 'Outside' }, styles: {},
      layout: { x: 400, y: 400, w: 200, h: 60 },
      mobileLayout: { x: 16, y: 400, w: 200, h: 60 },
    }],
  }] })
  state().setViewport('mobile')
}

describe('keyboard movement inside a container or tabs on the phone', () => {
  for (const type of ['container', 'tabs']) {
    it(`nudges the same shared ${type} coordinates that the pointer editor displays`, () => {
      load(type)
      state().selectComponent('child')
      state().nudgeSelection(10, 5)

      expect(child().layout).toEqual({ x: 110, y: 45, w: 120, h: 60 })
      expect(child().mobileLayout).toEqual({ x: 16, y: 16, w: 200, h: 50 })
      state().undo()
      expect(child().layout).toEqual({ x: 100, y: 40, w: 120, h: 60 })
      state().redo()
      expect(child().layout).toEqual({ x: 110, y: 45, w: 120, h: 60 })
    })
  }

  it('does not disable automatic mobile layout when only a shared child is edited', () => {
    load('container', false)
    state().setLayoutMany({ child: { x: 110, y: 45 } })

    expect(child().layout).toEqual({ x: 110, y: 45, w: 120, h: 60 })
    expect(page().mobileManual).toBe(false)
  })

  it('keeps top-level phone movement independent while a shared child moves in the same action', () => {
    load()
    state().selectMany(['child', 'outside'])
    state().nudgeSelection(10, 5)

    expect(child().layout).toEqual({ x: 110, y: 45, w: 120, h: 60 })
    expect(page().components[1].layout).toEqual({ x: 400, y: 400, w: 200, h: 60 })
    expect(page().components[1].mobileLayout).toEqual({ x: 26, y: 405, w: 200, h: 60 })
    expect(page().mobileManual).toBe(true)
  })

  it('continues moving region children in their independent phone layout', () => {
    load('region')
    state().selectComponent('child')
    state().nudgeSelection(10, 5)

    expect(child().layout).toEqual({ x: 100, y: 40, w: 120, h: 60 })
    expect(child().mobileLayout).toEqual({ x: 26, y: 21, w: 200, h: 50 })
    expect(page().mobileManual).toBe(true)
  })
})
