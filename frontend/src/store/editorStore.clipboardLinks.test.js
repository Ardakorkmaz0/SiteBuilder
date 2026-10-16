import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { selectCurrentPage, useEditorStore } from './editorStore.js'

const store = () => useEditorStore.getState()
const page = () => selectCurrentPage(store())
const node = (id, type, props = {}, children) => ({
  id, type, props, styles: {}, layout: { x: 20, y: 20, w: 300, h: 100 },
  ...(children ? { children } : {}),
})
const target = (anchor) => node('target', 'heading', { text: 'Target', ...(anchor ? { anchor } : {}) })
const link = (href = '#target') => node('source', 'button', { text: 'Go', href })
const container = (anchor) => node('box', 'container', {}, [target(anchor), link(anchor ? `#${anchor}` : '#target')])

function load(components, otherComponents = []) {
  store().loadSchema({ pages: [
    { id: 'home', name: 'Home', components },
    { id: 'other', name: 'Other', components: otherComponents },
  ] })
  useEditorStore.setState({ clipboard: [] })
  // Fixed ids make link destinations explicit, rather than calculating an
  // expected href with the cloning implementation under test.
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('links inside copied component trees', () => {
  it('keeps a nested target reachable after its entire container is cut and pasted', () => {
    load([container()])
    store().selectComponent('box')
    store().cutSelection()
    store().pasteClipboard()

    expect(page().components[0].children.map((child) => child.id)).toEqual(['heading_i', 'button_i'])
    expect(page().components[0].children[1].props.href).toBe('#heading_i')
    expect(page().components[0].children[0].props.text).toBe('Target')
  })

  it('retargets links between separate clipboard roots, regardless of their selection order', () => {
    load([target(), link()])
    store().selectMany(['source', 'target'])
    store().copySelection()
    store().selectPage('other')
    store().pasteClipboard()

    expect(page().components.map((component) => component.id)).toEqual(['button_i', 'heading_i'])
    expect(page().components[0].props.href).toBe('#heading_i')
    const original = store().schema.pages[0].components
    expect(original[1].props.href).toBe('#target')
  })

  it('retargets links across all roots of a duplicated selection', () => {
    load([target(), link()])
    store().selectMany(['source', 'target'])
    store().duplicateSelection()

    expect(page().components.at(-2).props.href).toBe('#heading_i')
    expect(page().components.at(-1).id).toBe('heading_i')
    expect(page().components[1].props.href).toBe('#target')
  })

  it('retargets a duplicated container when an original named anchor must be removed', () => {
    load([container('details')])
    store().duplicateComponent('box')

    const copy = page().components[1]
    expect(copy.children[0].props.anchor).toBeUndefined()
    expect(copy.children[1].props.href).toBe('#heading_i')
    expect(page().components[0].children[1].props.href).toBe('#details')
  })

  it('keeps an available named anchor and links to it when cutting a subtree', () => {
    load([container('details')])
    store().selectComponent('box')
    store().cutSelection()
    store().pasteClipboard()

    expect(page().components[0].children[0].props.anchor).toBe('details')
    expect(page().components[0].children[1].props.href).toBe('#details')
  })

  it('retargets a named anchor that conflicts on the destination page', () => {
    load([container('details')], [node('existing', 'text', { text: 'Existing', anchor: 'details' })])
    store().copyComponentToPage('box', 'other')

    const destination = store().schema.pages[1].components
    expect(destination[0].props.anchor).toBe('details')
    expect(destination[1].children[0].props.anchor).toBeUndefined()
    expect(destination[1].children[1].props.href).toBe('#heading_i')
  })

  it('retargets id-based links when copying a subtree directly to another page', () => {
    load([container()])
    store().copyComponentToPage('box', 'other')

    expect(store().schema.pages[1].components[0].children[1].props.href).toBe('#heading_i')
  })

  it('retargets links across all roots when duplicating a page', () => {
    load([target(), link(), node('menu', 'navbar', { links: [{ label: 'Target', href: '#target' }] })])
    store().duplicatePage('home')

    expect(page().components[1].props.href).toBe('#heading_i')
    expect(page().components[2].props.links).toEqual([{ label: 'Target', href: '#heading_i' }])
    expect(store().schema.pages[0].components[1].props.href).toBe('#target')
  })

  it('updates href, buttonHref and menu links while preserving URLs and uncopied destinations', () => {
    const menu = node('menu', 'navbar', {
      href: '#target', buttonHref: '#target',
      links: [
        { label: 'Copied', href: '#target' },
        { label: 'Uncopied', href: '#outside' },
        { label: 'Page', href: '#other' },
        { label: 'Top', href: '#top' },
        { label: 'Empty fragment', href: '#' },
        { label: 'Absolute', href: 'https://example.test/page#target' },
        { label: 'Relative', href: '/help#target' },
        { label: 'File', href: 'home.html#target' },
      ],
    })
    load([target(), menu, node('outside', 'text')])
    store().selectMany(['target', 'menu'])
    store().copySelection()
    store().selectPage('other')
    store().pasteClipboard()

    expect(page().components[1].props).toEqual({
      href: '#heading_i', buttonHref: '#heading_i',
      links: [
        { label: 'Copied', href: '#heading_i' },
        { label: 'Uncopied', href: '#outside' },
        { label: 'Page', href: '#other' },
        { label: 'Top', href: '#top' },
        { label: 'Empty fragment', href: '#' },
        { label: 'Absolute', href: 'https://example.test/page#target' },
        { label: 'Relative', href: '/help#target' },
        { label: 'File', href: 'home.html#target' },
      ],
    })
  })

  it('leaves links to a named target outside a duplicated subtree unchanged', () => {
    load([node('outside', 'text', { anchor: 'shared' }), node('box', 'container', {}, [link('#shared')])])
    store().duplicateComponent('box')

    expect(page().components[2].children[0].props.href).toBe('#shared')
  })

  it('does not cascade a remapped href through another old target id', () => {
    load([target(), node('heading_i', 'text'), link()])
    store().selectMany(['target', 'heading_i', 'source'])
    store().duplicateSelection()

    expect(page().components.at(-1).props.href).toBe('#heading_i')
  })
})

describe('separate paste history steps', () => {
  it('undo on the second page keeps the paste already made on the first page', () => {
    load([target()])
    vi.spyOn(Date, 'now').mockReturnValue(1_790_000_000_000)
    store().selectComponent('target')
    store().copySelection()
    store().pasteClipboard()
    store().selectPage('other')
    store().pasteClipboard()
    store().undo()

    expect(store().schema.pages[0].components.map((component) => component.id)).toEqual(['target', 'heading_i'])
    expect(store().schema.pages[1].components).toHaveLength(0)
    store().redo()
    expect(store().schema.pages[1].components).toHaveLength(1)
  })

  it('undo removes only the newest of two immediate pastes on the same page', () => {
    load([target()])
    vi.spyOn(Date, 'now').mockReturnValue(1_790_000_000_000)
    // Distinct deterministic ids for the two heading copies.
    Math.random.mockReturnValueOnce(0.5).mockReturnValueOnce(0.25)
    store().selectComponent('target')
    store().copySelection()
    store().pasteClipboard()
    store().pasteClipboard()
    store().undo()

    expect(page().components.map((component) => component.id)).toEqual(['target', 'heading_i'])
    store().redo()
    expect(page().components.map((component) => component.id)).toEqual(['target', 'heading_i', 'heading_9'])
  })
})
