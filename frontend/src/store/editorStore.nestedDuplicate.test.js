import { describe, expect, it } from 'vitest'
import { selectCurrentPage, useEditorStore } from './editorStore.js'

const store = () => useEditorStore.getState()
const firstBlock = () => selectCurrentPage(store()).components[0]
const childLayouts = (key = 'layout') => firstBlock().children.map((child) => child[key])

const button = (id, layout, extra = {}) => ({
  id, type: 'button', props: { label: 'Send' }, styles: {}, layout, ...extra,
})

const loadPage = (page) => store().loadSchema({
  theme: {},
  pages: [{ id: 'home', name: 'Home', ...page }],
})

// A copy of a block on the page is nudged down and to the right so it can be
// seen. Inside a parent the copy used to land exactly on its original: the
// selection moved to it, but the canvas looked as if nothing had happened.
describe('duplicating a block inside a parent', () => {
  it('puts the copy beside its original in a section', () => {
    loadPage({
      components: [{
        id: 'band', type: 'region', props: { contentWidth: 980 }, styles: {},
        layout: { x: 0, y: 0, w: 1000, h: 400 },
        children: [button('send', { x: 40, y: 40, w: 180, h: 48 })],
      }],
    })

    store().duplicateComponent('send')

    expect(childLayouts()).toEqual([
      { x: 40, y: 40, w: 180, h: 48 },
      { x: 64, y: 64, w: 180, h: 48 },
    ])
    expect(store().selectedId).toBe(firstBlock().children[1].id)
  })

  it('puts the copy beside its original in a box', () => {
    loadPage({
      components: [{
        id: 'box', type: 'container', props: {}, styles: {},
        layout: { x: 100, y: 100, w: 600, h: 400 },
        children: [button('send', { x: 40, y: 40, w: 180, h: 48 })],
      }],
    })

    store().duplicateComponent('send')

    expect(childLayouts()).toEqual([
      { x: 40, y: 40, w: 180, h: 48 },
      { x: 64, y: 64, w: 180, h: 48 },
    ])
  })

  it('puts the copy beside its original in the same tab', () => {
    loadPage({
      components: [{
        id: 'tabs', type: 'tabs', styles: {},
        props: { tabs: [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }], activeId: 'two' },
        layout: { x: 100, y: 100, w: 600, h: 400 },
        children: [button('send', { x: 40, y: 40, w: 180, h: 48 }, { tabId: 'two' })],
      }],
    })

    store().duplicateComponent('send')

    expect(childLayouts()).toEqual([
      { x: 40, y: 40, w: 180, h: 48 },
      { x: 64, y: 64, w: 180, h: 48 },
    ])
    expect(firstBlock().children.map((child) => child.tabId)).toEqual(['two', 'two'])
  })

  it('keeps the copy inside the box when the original is against its edges', () => {
    loadPage({
      components: [{
        id: 'box', type: 'container', props: {}, styles: {},
        layout: { x: 100, y: 100, w: 600, h: 400 },
        children: [button('send', { x: 410, y: 340, w: 180, h: 48 })],
      }],
    })

    store().duplicateComponent('send')

    expect(childLayouts()).toEqual([
      { x: 410, y: 340, w: 180, h: 48 },
      { x: 420, y: 352, w: 180, h: 48 },
    ])
  })

  it('puts every copy of a selection beside its own original', () => {
    loadPage({
      components: [{
        id: 'box', type: 'container', props: {}, styles: {},
        layout: { x: 100, y: 100, w: 600, h: 400 },
        children: [
          button('send', { x: 40, y: 40, w: 180, h: 48 }),
          button('cancel', { x: 300, y: 40, w: 180, h: 48 }),
        ],
      }],
    })

    store().selectMany(['send', 'cancel'])
    store().duplicateSelection()

    expect(firstBlock().children.map((child) => child.layout)).toEqual([
      { x: 40, y: 40, w: 180, h: 48 },
      { x: 64, y: 64, w: 180, h: 48 },
      { x: 300, y: 40, w: 180, h: 48 },
      { x: 324, y: 64, w: 180, h: 48 },
    ])
  })

  it('moves the copy on a phone design arranged by hand too', () => {
    loadPage({
      mobileWidth: 390,
      mobileManual: true,
      components: [{
        id: 'band', type: 'region', props: { contentWidth: 980 }, styles: {},
        layout: { x: 0, y: 0, w: 1000, h: 400 },
        mobileLayout: { x: 0, y: 0, w: 390, h: 400 },
        children: [button('send', { x: 40, y: 40, w: 180, h: 48 }, {
          mobileLayout: { x: 20, y: 30, w: 150, h: 40 },
        })],
      }],
    })

    store().duplicateComponent('send')

    expect(selectCurrentPage(store()).mobileManual).toBe(true)
    expect(childLayouts('mobileLayout')).toEqual([
      { x: 20, y: 30, w: 150, h: 40 },
      { x: 44, y: 54, w: 150, h: 40 },
    ])
  })
})
