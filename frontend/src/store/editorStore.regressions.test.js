import { beforeEach, describe, expect, it } from 'vitest'
import { autoMobileLayout, selectCanMoveComponent, selectCurrentPage, useEditorStore } from './editorStore.js'

const s = () => useEditorStore.getState()

function freshSchema(pages) {
  s().loadSchema({
    theme: { primaryColor: '#2563eb' },
    pages,
  })
  s().selectPage(pages[0].id)
}

beforeEach(() => {
  freshSchema([{ id: 'p1', name: 'Home', canvasWidth: 1000, components: [] }])
})

describe('editorStore regressions', () => {
  it('scopes selectCanMoveComponent and moveForward/moveBackward within the same tab panel (including props.tabId)', () => {
    freshSchema([{
      id: 'p1',
      name: 'Home',
      components: [{
        id: 'tabs_1',
        type: 'tabs',
        props: { tabs: [{ id: 't1', label: 'One' }, { id: 't2', label: 'Two' }], activeId: 't1' },
        styles: {},
        layout: { x: 0, y: 0, w: 600, h: 300 },
        children: [
          { id: 'c1', type: 'text', tabId: 't1', props: { text: 'First t1' }, styles: {}, layout: { x: 10, y: 10, w: 120, h: 40 } },
          { id: 'c2', type: 'text', tabId: 't2', props: { text: 'In t2' }, styles: {}, layout: { x: 10, y: 10, w: 120, h: 40 } },
          { id: 'c3', type: 'text', props: { text: 'Second t1', tabId: 't1' }, styles: {}, layout: { x: 10, y: 70, w: 120, h: 40 } },
        ],
      }],
    }])

    expect(selectCanMoveComponent(s(), 'c2', 'forward')).toBe(false)
    expect(selectCanMoveComponent(s(), 'c2', 'backward')).toBe(false)
    expect(selectCanMoveComponent(s(), 'c3', 'backward')).toBe(true)
    expect(selectCanMoveComponent(s(), 'c3', 'forward')).toBe(false)

    // Without tab scoping, moveBackward('c3') swapped c3 with c2 (tab t2), leaving t1 order [c1, c3].
    s().moveBackward('c3')
    const kids = selectCurrentPage(s()).components[0].children
    expect(kids.map((c) => c.id)).toEqual(['c3', 'c2', 'c1'])
  })

  it('counts existing props.tabId children when stacking a newly added child in Tabs', () => {
    freshSchema([{
      id: 'p1',
      name: 'Home',
      components: [{
        id: 'tabs_1',
        type: 'tabs',
        props: { tabs: [{ id: 't1', label: 'One' }, { id: 't2', label: 'Two' }], activeId: 't2' },
        styles: {},
        layout: { x: 0, y: 0, w: 600, h: 300 },
        children: [{
          id: 'existing',
          type: 'text',
          props: { text: 'Existing', tabId: 't2' },
          styles: {},
          layout: { x: 16, y: 20, w: 200, h: 50 },
        }],
      }],
    }])

    s().addComponent('text', 0, 0, 'tabs_1')
    const kids = selectCurrentPage(s()).components[0].children
    expect(kids).toHaveLength(2)
    expect(kids[1].tabId).toBe('t2')
    expect(kids[1].layout.y).toBe(82)
  })

  it('relinks props.rich inline fragment links when cloning a subtree with duplicateComponent', () => {
    freshSchema([{
      id: 'p1',
      name: 'Home',
      components: [{
        id: 'wrap',
        type: 'container',
        props: {},
        styles: {},
        layout: { x: 0, y: 0, w: 500, h: 300 },
        children: [
          { id: 'target_box', type: 'text', props: { text: 'Target' }, styles: {}, layout: { x: 10, y: 10, w: 200, h: 40 } },
          { id: 'rich_link', type: 'text', props: { text: 'Jump', rich: [{ t: 'Jump', href: '#target_box' }] }, styles: {}, layout: { x: 10, y: 60, w: 200, h: 40 } },
        ],
      }],
    }])

    s().duplicateComponent('wrap')
    const dup = selectCurrentPage(s()).components[1]
    const clonedTarget = dup.children[0]
    const clonedRich = dup.children[1]
    expect(clonedRich.props.rich[0].href).toBe(`#${clonedTarget.id}`)
    expect(clonedRich.props.rich[0].href).not.toBe('#target_box')
  })

  it('strips page-part shownBy keys from moved node and descendants in moveComponentInto', () => {
    freshSchema([{
      id: 'p1',
      name: 'Home',
      parts: [{ key: 'step1', triggerId: 'btn1' }],
      components: [
        { id: 'box', type: 'container', props: { shownBy: ['step1'] }, styles: {}, layout: { x: 0, y: 0, w: 600, h: 300 }, children: [] },
        {
          id: 'outer',
          type: 'container',
          props: { shownBy: ['step1'] },
          styles: {},
          layout: { x: 0, y: 320, w: 300, h: 120 },
          children: [{
            id: 'inner',
            type: 'text',
            props: { text: 'Nested', shownBy: ['step1'] },
            styles: {},
            layout: { x: 10, y: 10, w: 120, h: 40 },
          }],
        },
      ],
    }])

    s().moveComponentInto('outer', 'box', 20, 20)
    const moved = selectCurrentPage(s()).components[0].children[0]
    expect(moved.id).toBe('outer')
    expect(moved.props.shownBy).toBeUndefined()
    expect(moved.children[0].props.shownBy).toBeUndefined()
  })

  it('stacks a free container\'s blocks for its phone width in autoMobileLayout, as tall as they come out', () => {
    const page = {
      components: [{
        id: 'cont_1',
        type: 'container',
        props: {},
        styles: {},
        layout: { x: 0, y: 0, w: 716, h: 400 },
        children: [{
          id: 'c1',
          type: 'text',
          props: { text: 'Low' },
          styles: {},
          layout: { x: 20, y: 300, w: 200, h: 100 },
        }],
      }],
    }
    const mobile = autoMobileLayout(page.components)
    // Not its desktop drawing scaled (416 * 358 / 716 = 208, the low text
    // still 300 px down): the text is stacked at the top, 16 px in, and the
    // container ends 16 px below it.
    expect(mobile.cont_1.w).toBe(358)
    expect(mobile.cont_1.h).toBeLessThan(120)
  })

  it('does not record phantom undo history entries on no-op actions', () => {
    freshSchema([
      {
        id: 'p1',
        name: 'Home',
        components: [
          {
            id: 'box',
            type: 'container',
            props: {},
            styles: {},
            layout: { x: 10, y: 10, w: 300, h: 200 },
            children: [
              { id: 'nested', type: 'text', props: { text: 'Nested' }, styles: {}, layout: { x: 10, y: 10, w: 100, h: 40 } },
            ],
          },
        ],
      },
      { id: 'p2', name: 'Other', components: [] },
    ])
    expect(s().canUndo()).toBe(false)

    s().selectMany(['box', 'nested'])
    s().alignSelection('left')
    s().distributeSelection('x')
    s().distributeSiblings('missing', 'y')
    s().duplicateComponent('missing')
    s().copyComponentToPage('missing', 'p2')
    s().applyThemeToComponent('missing')
    s().bringToFront('box')
    s().sendToBack('box')
    s().removeComponent('missing')

    expect(s().canUndo()).toBe(false)
  })

  it('clears tabId and props.tabId on copyComponentToPage and refuses non-parent targets on addComponent', () => {
    freshSchema([
      {
        id: 'p1',
        name: 'Home',
        components: [
          {
            id: 'tabs_1',
            type: 'tabs',
            props: { tabs: [{ id: 't1', label: 'A' }, { id: 't2', label: 'B' }], activeId: 't2' },
            styles: {},
            layout: { x: 0, y: 0, w: 500, h: 200 },
            children: [{
              id: 't_child',
              type: 'button',
              tabId: 't2',
              props: { text: 'Btn', tabId: 't2' },
              styles: {},
              layout: { x: 10, y: 10, w: 120, h: 40 },
            }],
          },
          { id: 'leaf', type: 'text', props: { text: 'Leaf' }, styles: {}, layout: { x: 0, y: 240, w: 200, h: 40 } },
        ],
      },
      { id: 'p2', name: 'Target', components: [] },
    ])

    s().copyComponentToPage('t_child', 'p2')
    const p2 = s().schema.pages.find((p) => p.id === 'p2')
    expect(p2.components).toHaveLength(1)
    expect(p2.components[0].tabId).toBeUndefined()
    expect(p2.components[0].props.tabId).toBeUndefined()

    s().addComponent('text', 0, 0, 'leaf')
    expect(selectCurrentPage(s()).components).toHaveLength(2)
  })

  it('applies converted document language unless the page already customized a non-English language', () => {
    freshSchema([{ id: 'p1', name: 'Home', components: [] }])
    s().convertPageToCanvas('p1', {
      components: [{ id: 'h1', type: 'heading', props: { text: 'Merhaba' }, styles: {}, layout: { x: 0, y: 0, w: 400, h: 50 } }],
      canvasWidth: 1000,
      background: '#ffffff',
      language: 'tr',
    })
    expect(s().schema.pages[0].language).toBe('tr')

    s().convertPageToCanvas('p1', {
      components: [{ id: 'h2', type: 'heading', props: { text: 'Hola' }, styles: {}, layout: { x: 0, y: 0, w: 400, h: 50 } }],
      canvasWidth: 1000,
      background: '#ffffff',
      language: 'es',
    })
    expect(s().schema.pages[0].language).toBe('tr')
  })
})
