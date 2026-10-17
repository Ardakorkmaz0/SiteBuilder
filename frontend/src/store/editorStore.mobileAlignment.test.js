import { describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore.js'

const state = () => useEditorStore.getState()
const page = () => state().schema.pages[0]
const children = () => page().components[0].children
const desktopX = () => children().map((c) => c.layout.x)
const desktopY = () => children().map((c) => c.layout.y)
const mobileX = () => children().map((c) => c.mobileLayout.x)
const mobileY = () => children().map((c) => c.mobileLayout.y)

function load(type, { flowMode = false, mobileManual = true } = {}) {
  const child = (id, x, y, w, h, mx, my, mw, mh) => ({
    id, type: 'text', props: { text: id }, styles: {}, tabId: 'one',
    layout: { x, y, w, h }, mobileLayout: { x: mx, y: my, w: mw, h: mh },
  })
  state().loadSchema({ pages: [{
    id: 'home', name: 'Home', canvasWidth: 1000, mobileWidth: 320, flowMode, mobileManual,
    components: [{
      id: 'parent', type,
      props: type === 'tabs' ? { tabs: [{ id: 'one', label: 'One' }], activeId: 'one' } : { contentWidth: 800 },
      styles: {}, layout: { x: 0, y: 0, w: 800, h: 600 }, mobileLayout: { x: 0, y: 0, w: 320, h: 600 },
      children: [
        child('a', 100, 40, 80, 40, 20, 30, 100, 50),
        child('b', 300, 160, 120, 60, 80, 180, 140, 70),
        child('c', 600, 320, 100, 80, 140, 430, 120, 90),
      ],
    }, child('outside', 500, 800, 100, 40, 16, 800, 200, 50)],
  }] })
  state().setViewport('mobile')
}

describe('mobile alignment coordinate spaces', () => {
  for (const type of ['container', 'tabs']) {
    it(`aligns the displayed shared ${type} coordinates, with Undo and Redo`, () => {
      load(type)
      state().selectMany(['a', 'b', 'c'])
      state().alignSelection('left')
      expect(desktopX()).toEqual([100, 100, 100])
      expect(mobileX()).toEqual([20, 80, 140])
      state().undo()
      expect(desktopX()).toEqual([100, 300, 600])
      state().redo()
      expect(desktopX()).toEqual([100, 100, 100])
    })

    it(`distributes the displayed shared ${type} coordinates, with Undo and Redo`, () => {
      load(type)
      state().selectMany(['a', 'b', 'c'])
      state().distributeSelection('y')
      expect(desktopY()).toEqual([40, 170, 320])
      expect(mobileY()).toEqual([30, 180, 430])
      state().undo()
      expect(desktopY()).toEqual([40, 160, 320])
      state().redo()
      expect(desktopY()).toEqual([40, 170, 320])
    })
  }

  for (const action of ['align', 'distribute']) {
    it(`keeps automatic mobile layout enabled after a shared-child ${action}`, () => {
      load('container', { mobileManual: false })
      state().selectMany(['a', 'b', 'c'])
      if (action === 'align') state().alignSelection('left')
      else state().distributeSelection('y')
      expect(page().mobileManual).toBe(false)
    })
  }

  it('aligns only the region children sharing the primary parent in a mixed selection', () => {
    load('region')
    state().selectMany(['outside', 'a', 'b', 'c'])
    state().alignSelection('left')
    expect(desktopX()).toEqual([100, 300, 600])
    expect(mobileX()).toEqual([20, 20, 20])
    expect(page().components[1].layout.x).toBe(500)
    expect(page().components[1].mobileLayout.x).toBe(16)
  })

  it('distributes only region phone positions on a free canvas', () => {
    load('region')
    state().selectMany(['outside', 'a', 'b', 'c'])
    state().distributeSelection('y')
    expect(desktopY()).toEqual([40, 160, 320])
    expect(mobileY()).toEqual([30, 220, 430])
    expect(page().components[1].mobileLayout.y).toBe(800)
  })

  for (const action of ['align', 'distribute']) {
    it(`leaves desktop region child positions alone during phone ${action} on a flow page`, () => {
      load('region', { flowMode: true })
      state().selectMany(['a', 'b', 'c'])
      if (action === 'align') state().alignSelection('left')
      else state().distributeSelection('y')
      expect(desktopX()).toEqual([100, 300, 600])
      expect(desktopY()).toEqual([40, 160, 320])
    })
  }

  it('aligns a sole region child in its phone coordinate space', () => {
    load('region')
    state().selectComponent('b')
    state().alignSelection('left')
    expect(desktopX()).toEqual([100, 300, 600])
    expect(mobileX()).toEqual([20, 0, 140])
  })
})
