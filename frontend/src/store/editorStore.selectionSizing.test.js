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
  // The container's block has the phone place its scaled drawing gave it
  // (300 / 700 of the desktop one): the page was laid out by hand before
  // containers had phone layouts.
  const PHONE = { x: 43, y: 17, w: 51, h: 26 }

  it('applies explicit descendant sizes without applying positional nudges twice on pc', () => {
    load('container', 'pc')
    state().selectMany(['child', 'parent'])
    state().nudgeSelection(10, 5)
    expect(child().layout).toEqual({ x: 100, y: 40, w: 120, h: 60 })
    expect(parent().layout.x).toBe(50)

    state().setLayoutMany({ parent: { w: 100 }, child: { w: 100 } })
    expect(parent().layout.w).toBe(100)
    expect(child().layout).toEqual({ x: 100, y: 40, w: 100, h: 60 })
    expect(child().mobileLayout).toEqual(PHONE)
    state().undo()
    expect(child().layout.w).toBe(120)
    state().redo()
    expect(child().layout.w).toBe(100)
  })

  it('applies explicit descendant sizes without applying positional nudges twice on mobile', () => {
    load('container', 'mobile')
    state().selectMany(['child', 'parent'])
    state().nudgeSelection(10, 5)
    expect(child().mobileLayout).toEqual(PHONE)
    expect(parent().mobileLayout.x).toBe(20)

    state().setLayoutMany({ parent: { w: 100 }, child: { w: 100 } })
    expect(parent().mobileLayout.w).toBe(100)
    // As wide as the narrowed container: it fits only from its left edge.
    expect(child().mobileLayout).toEqual({ ...PHONE, x: 0, w: 100 })
    expect(child().layout).toEqual({ x: 100, y: 40, w: 120, h: 60 })
    state().undo()
    expect(child().mobileLayout.w).toBe(51)
    state().redo()
    expect(child().mobileLayout.w).toBe(100)
  })

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
