import { beforeEach, describe, expect, it, vi } from 'vitest'
import { selectCurrentPage, useEditorStore } from './editorStore.js'

const s = () => useEditorStore.getState()
const current = () => selectCurrentPage(s())
const find = (id, list = current().components) => {
  for (const component of list) {
    if (component.id === id) return component
    const child = find(id, component.children || [])
    if (child) return child
  }
  return null
}
const heading = (id, x, y) => ({
  id, type: 'heading', props: { text: id }, styles: { color: '#172554' },
  layout: { x, y, w: 180, h: 60 }, mobileLayout: { x: 20, y, w: 240, h: 60 },
})

beforeEach(() => {
  s().loadSchema({ pages: [
    { id: 'source', name: 'Source', mobileManual: true, components: [
      { id: 'container', type: 'container', props: {}, styles: {},
        layout: { x: 40, y: 60, w: 620, h: 300 },
        mobileLayout: { x: 10, y: 60, w: 370, h: 300 },
        children: [heading('inner', 40, 50)],
      },
      heading('outside', 100, 450),
    ] },
    { id: 'target', name: 'Target', canvasWidth: 500, mobileWidth: 320, mobileManual: true, components: [] },
  ] })
  // Tests own their clipboard, whereas loadSchema intentionally keeps the
  // in-app clipboard available when moving between projects.
  useEditorStore.setState({ clipboard: [] })
})

describe('a selection spanning a container and the page', () => {
  it('leaves a nested-only cut and an existing clipboard untouched', () => {
    s().selectComponent('outside')
    s().copySelection()
    s().selectComponent('inner')
    s().cutSelection()

    expect(find('inner')?.props.text).toBe('inner')
    expect(find('outside')?.props.text).toBe('outside')
    expect(s().clipboard.map((component) => component.id)).toEqual(['outside'])
    expect(s().selectedIds).toEqual(['inner'])
  })

  it('never cuts a nested item that copySelection cannot put on the clipboard', () => {
    s().selectMany(['inner', 'outside'])
    s().cutSelection()

    expect(s().clipboard.map((component) => component.id)).toEqual(['outside'])
    expect(find('inner')?.props.text).toBe('inner')
    expect(find('outside')).toBeNull()
    s().pasteClipboard()
    expect(current().components).toHaveLength(2)
    expect(find('container').children.map((component) => component.id)).toEqual(['inner'])
  })

  it('duplicates a selected parent and child as one subtree', () => {
    s().selectMany(['inner', 'container'])
    s().duplicateSelection()

    expect(find('container').children.map((component) => component.id)).toEqual(['inner'])
    expect(current().components).toHaveLength(3)
    const copy = current().components.at(-1)
    expect(copy.type).toBe('container')
    expect(copy.children).toHaveLength(1)
    expect(copy.children[0].id).not.toBe('inner')
    expect(s().selectedIds).toEqual([copy.id])
  })

  it('cuts a selected parent and child together through the parent snapshot', () => {
    s().selectMany(['inner', 'container'])
    s().cutSelection()

    expect(find('container')).toBeNull()
    expect(s().clipboard).toHaveLength(1)
    expect(s().clipboard[0].children[0].id).toBe('inner')
    s().pasteClipboard()
    expect(current().components.at(-1).children[0].props.text).toBe('inner')
    expect(current().components.at(-1).children[0].id).not.toBe('inner')
  })

  it('handles a selected grandparent and grandchild without duplicating into the original', () => {
    const container = find('container')
    container.children = [{
      ...container, id: 'nested_container', layout: { x: 0, y: 0, w: 400, h: 200 },
      children: [heading('deep', 20, 20)],
    }]
    s().selectMany(['container', 'deep'])
    s().duplicateSelection()

    expect(find('nested_container').children).toHaveLength(1)
    const copy = current().components.at(-1)
    expect(copy.children[0].children).toHaveLength(1)
    expect(s().selectedIds).toEqual([copy.id])
  })
})

describe('clipboard across pages and breakpoints', () => {
  it('moves a mixed selection to a narrower page without deleting its uncopied child', () => {
    s().setAnchor('outside', 'move-me')
    s().selectMany(['inner', 'outside'])
    s().cutSelection()
    s().selectPage('target')
    s().pasteClipboard()

    const moved = current().components[0]
    expect(moved.props).toMatchObject({ text: 'outside', anchor: 'move-me' })
    expect(moved.layout.x + moved.layout.w).toBeLessThanOrEqual(500)
    expect(moved.mobileLayout.x + moved.mobileLayout.w).toBeLessThanOrEqual(320)
    const source = s().schema.pages.find((page) => page.id === 'source')
    expect(find('inner', source.components)?.props.text).toBe('inner')

    s().undo() // paste
    expect(current().components).toHaveLength(0)
    s().undo() // cut, without changing the open page
    expect(s().currentPageId).toBe('target')
    const restored = s().schema.pages.find((page) => page.id === 'source')
    expect(find('outside', restored.components)?.props.anchor).toBe('move-me')
    expect(find('inner', restored.components)?.props.text).toBe('inner')
  })

  it('keeps a copied subtree independent after source edits and a page switch', () => {
    s().selectComponent('container')
    s().copySelection()
    s().updateProps('inner', { text: 'Changed after copy' })
    s().selectPage('target')
    s().pasteClipboard()

    expect(current().components[0].children[0].props.text).toBe('inner')
    expect(current().components[0].children[0].id).not.toBe('inner')
    expect(current().components[0].layout.x + current().components[0].layout.w).toBeLessThanOrEqual(500)
    s().selectPage('source')
    expect(find('inner').props.text).toBe('Changed after copy')
  })

  it('preserves selection across device switches while history edits each layout independently', () => {
    s().selectMany(['container', 'outside'])
    s().setViewport('mobile')
    expect(s().selectedIds).toEqual(['container', 'outside'])
    s().setLayout('outside', { x: 40, y: 500 })
    s().setViewport('pc')
    expect(s().selectedIds).toEqual(['container', 'outside'])
    s().setLayout('outside', { x: 130, y: 480 })
    s().undo()
    expect(find('outside').layout).toMatchObject({ x: 100, y: 450 })
    expect(find('outside').mobileLayout).toMatchObject({ x: 40, y: 500 })
    s().undo()
    expect(find('outside').mobileLayout).toMatchObject({ x: 20, y: 450 })
    expect(s().selectedIds).toEqual([])
  })
})

it('undo restores grouped deletion of a parent, its child and a hidden page block together', () => {
  s().setVisibility('outside', { hidden: true })
  const before = structuredClone(s().schema)
  s().selectMany(['inner', 'container', 'outside'])
  s().removeSelection()
  expect(current().components).toHaveLength(0)
  expect(s().selectedIds).toEqual([])
  s().undo()
  expect(s().schema).toEqual(before)
  expect(find('outside').hidden).toBe(true)
  s().redo()
  expect(current().components).toHaveLength(0)
})

describe('discrete page-mode history', () => {
  it.each([false, true])('undoes an immediate HTML removal back to HTML (saved between actions: %s)', (saved) => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_790_000_000_000)
    try {
      const original = s().schema
      s().setPageMode('source', 'html')
      const html = s().schema
      if (saved) s().markSaved()
      s().setPageMode('source', 'empty')

      s().undo()
      expect(current().mode).toBe('html')
      expect(s().schema).toBe(html)
      expect(current().components).toBe(original.pages[0].components)
      s().undo()
      expect(s().schema).toBe(original)
      s().redo()
      expect(current().mode).toBe('html')
      s().redo()
      expect(current().mode).toBe('empty')
    } finally {
      clock.mockRestore()
    }
  })
})
