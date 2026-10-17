import { describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore.js'

const state = () => useEditorStore.getState()
const page = () => state().schema.pages[0]
const parent = () => page().components[0]
const child = () => parent().children[0]

function load(type = 'container', viewport = 'pc') {
  state().loadSchema({ pages: [{
    id: 'home', name: 'Home', mobileWidth: 320, mobileManual: true,
    components: [{
      id: 'parent', type,
      props: type === 'tabs' ? { tabs: [{ id: 'one', label: 'One' }], activeId: 'one' } : {},
      styles: {}, layout: { x: 40, y: 50, w: 700, h: 300 },
      mobileLayout: { x: 10, y: 50, w: 300, h: 300 },
      children: [{
        id: 'child', type: 'heading', props: { text: 'Child', fit: 'off' }, tabId: 'one', styles: {},
        layout: { x: 100, y: 40, w: 120, h: 60 },
        mobileLayout: { x: 16, y: 16, w: 200, h: 50 },
      }],
    }],
  }] })
  state().setViewport(viewport)
}

describe('batch sizing a selected parent and descendant', () => {
  for (const viewport of ['pc', 'mobile']) {
    it(`applies explicit descendant sizes without applying positional nudges twice on ${viewport}`, () => {
      load('container', viewport)
      state().selectMany(['child', 'parent'])
      state().nudgeSelection(10, 5)
      expect(child().layout).toEqual({ x: 100, y: 40, w: 120, h: 60 })
      expect(parent()[viewport === 'mobile' ? 'mobileLayout' : 'layout'].x).toBe(viewport === 'mobile' ? 20 : 50)

      state().setLayoutMany({ parent: { w: 100 }, child: { w: 100 } })
      expect(parent()[viewport === 'mobile' ? 'mobileLayout' : 'layout'].w).toBe(100)
      expect(child().layout).toEqual({ x: 100, y: 40, w: 100, h: 60 })
      expect(child().mobileLayout).toEqual({ x: 16, y: 16, w: 200, h: 50 })
      state().undo()
      expect(child().layout.w).toBe(120)
      state().redo()
      expect(child().layout.w).toBe(100)
    })
  }

  it('constrains descendant sizes against the updated tabs parent, not its old width', () => {
    load('tabs')
    state().setLayoutMany({ parent: { w: 100 }, child: { w: 200 } })
    expect(parent().layout.w).toBe(100)
    expect(child().layout).toEqual({ x: 0, y: 40, w: 100, h: 60 })
  })

  it('keeps explicit fit-off while marking resized HTML as manually sized', () => {
    state().loadSchema({ pages: [{ id: 'home', name: 'Home', components: [
      { id: 'native', type: 'heading', props: { text: 'Off', fit: 'off' }, styles: {}, layout: { x: 20, y: 20, w: 200, h: 60 } },
      { id: 'html', type: 'html', props: { code: '<p>Off</p>', fit: 'off' }, styles: {}, layout: { x: 20, y: 100, w: 200, h: 60 } },
    ] }] })
    state().setViewport('pc')
    state().setLayoutMany({ native: { w: 100 }, html: { w: 100 } })
    expect(page().components[0].props.fit).toBe('off')
    expect(page().components[1].props.fit).toBe('off')
    expect(page().components[1].props._boxManual).toBe(true)
  })
})
