import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore.js'

const state = () => useEditorStore.getState()
const parent = () => state().schema.pages[0].components[0]
const child = () => parent().children[0]

beforeEach(() => {
  state().loadSchema({ pages: [{
    id: 'narrow', name: 'Narrow', canvasWidth: 500, mobileWidth: 320,
    mobileManual: true, components: [{
      id: 'parent', type: 'container', props: {}, styles: {},
      layout: { x: 0, y: 0, w: 500, h: 200 },
      children: [{
        id: 'edge', type: 'heading', props: { text: 'Edge', fit: 'off' },
        styles: { fontSize: '44px' }, layout: { x: 650, y: 40, w: 100, h: 60 },
      }],
    }],
  }] })
  state().setViewport('pc')
})

describe('editing a free container fitted to a narrow box', () => {
  it('nudges in design coordinates without jumping to the outer box edge, with Undo and Redo', () => {
    state().selectComponent('edge')
    state().nudgeSelection(-15, 0)
    expect(child().layout).toEqual({ x: 635, y: 40, w: 100, h: 60 })
    expect(child().styles.fontSize).toBe('44px')
    expect(child().props.fit).toBe('off')
    state().undo()
    expect(child().layout.x).toBe(650)
    state().redo()
    expect(child().layout.x).toBe(635)
  })

  it('uses the same design bounds for the multi-layout action', () => {
    state().setLayoutMany({ edge: { x: 635, y: 40, w: 100, h: 60 } })
    expect(child().layout).toEqual({ x: 635, y: 40, w: 100, h: 60 })
  })

  it('places a new child at the mapped drop coordinate inside the fitted canvas', () => {
    state().addComponent('text', 600, 60, 'parent', null, { w: 100, h: 40 })
    expect(parent().children).toHaveLength(2)
    expect(parent().children[1].layout).toEqual({ x: 600, y: 60, w: 100, h: 40 })
  })

  it('allows a fitted child to move left and back right as its design bounds change', () => {
    state().selectComponent('edge')
    state().nudgeSelection(-15, 0)
    expect(child().layout.x).toBe(635)
    state().nudgeSelection(15, 0)
    expect(child().layout.x).toBe(650)
    state().nudgeSelection(15, 0)
    expect(child().layout.x).toBe(665)
  })

  it('keeps extended positions within the backend coordinate limit on both write paths', () => {
    state().setLayout('edge', { x: 6000 })
    expect(child().layout.x).toBe(5000)
    state().setLayoutMany({ edge: { x: 6000 } })
    expect(child().layout.x).toBe(5000)
  })

  for (const batch of [false, true]) {
    it(`keeps a fitted resize within the backend width limit through the ${batch ? 'batch' : 'single'} action`, () => {
      state().setLayout('edge', { x: 6000 })
      expect(child().layout.x).toBe(5000)
      if (batch) state().setLayoutMany({ edge: { w: 6000 } })
      else state().setLayout('edge', { w: 6000 })

      expect(child().layout).toEqual({ x: 5000, y: 40, w: 2000, h: 60 })
      expect(child().styles.fontSize).toBe('44px')
      expect(child().props.fit).toBe('off')
    })
  }

  it('retains ordinary parent bounds once every child is inside the original box', () => {
    state().setLayout('edge', { x: 100 })
    state().setLayout('edge', { x: 600 })
    expect(child().layout.x).toBe(400)
  })
})
