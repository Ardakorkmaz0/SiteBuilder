// A page shown a part at a time (utils/pageShow.js) has its parts drawn in the
// same place. The canvas shows one of them; a block added there belongs to it.
import { beforeEach, describe, expect, it } from 'vitest'
import { shownPartOf, useEditorStore } from './editorStore.js'

const s = () => useEditorStore.getState()
const page = () => s().schema.pages[0]
const heading = (id, part) => ({ id, type: 'heading', props: { text: id, level: 'h2', shownBy: [part] }, styles: {}, layout: { x: 340, y: 40, w: 400, h: 60 } })

beforeEach(() => {
  s().loadSchema({
    theme: {},
    pages: [{
      id: 'notes', name: 'Notes', mode: 'empty',
      parts: [{ key: 'p0', label: 'One' }, { key: 'p1', label: 'Two' }], hiddenKeys: ['p1'],
      components: [heading('one', 'p0'), heading('two', 'p1')],
    }],
  })
  s().showPart('notes', 'p0')
})

describe('the part of the page the canvas shows', () => {
  it('is the first part until another is chosen, and choosing one is no edit', () => {
    expect(shownPartOf(page())).toBe('p0')
    const before = s().schema

    s().showPart('notes', 'p1')
    expect(shownPartOf(page())).toBe('p1')
    expect(s().schema).toBe(before)
  })

  it('takes in a block added while it is shown, and leaves the parts it had alone', () => {
    s().showPart('notes', 'p1')
    s().addComponent('text', 400, 200)

    const added = page().components.find((c) => !['one', 'two'].includes(c.id))
    expect(added.props.shownBy).toEqual(['p1'])
    expect(page().components.find((c) => c.id === 'one').props.shownBy).toEqual(['p0'])
  })

  it('takes in a copy of a block of another part, pasted while it is shown', () => {
    s().selectComponent('one')
    s().copySelection()
    s().showPart('notes', 'p1')
    s().pasteClipboard()

    const pasted = page().components.filter((c) => !['one', 'two'].includes(c.id))
    expect(pasted).toHaveLength(1)
    expect(pasted[0].props.text).toBe('one')
    expect(pasted[0].props.shownBy).toEqual(['p1'])
  })

  it('takes in a copied box whole: the blocks inside keep no key of the part they came from', () => {
    s().addComponent('container', 400, 200)
    const box = page().components.find((c) => c.type === 'container')
    s().moveComponentInto('one', box.id)
    s().selectComponent(box.id)
    s().copySelection()
    s().showPart('notes', 'p1')
    s().pasteClipboard()

    const pasted = page().components.find((c) => c.type === 'container' && c.id !== box.id)
    expect(pasted.props.shownBy).toEqual(['p1'])
    expect(pasted.children.map((c) => c.props.shownBy)).toEqual([undefined])
  })

  it('takes in a block added or moved out of a box on the phone canvas too', () => {
    s().addComponent('container', 400, 200)
    const box = page().components.find((c) => c.type === 'container')
    s().moveComponentInto('one', box.id)
    s().updateProps?.('one', { shownBy: ['p0', 's'] })
    s().showPart('notes', 'p1')
    s().setViewport('mobile')
    s().addComponent('heading', 0, 300)
    s().moveComponentInto('one', null)

    const added = page().components.find((c) => c.type === 'heading' && !['one', 'two'].includes(c.id))
    expect(added.props.shownBy).toEqual(['p1'])
    expect(page().components.find((c) => c.id === 'one').props.shownBy).toEqual(['p1', 's'])
    s().setViewport('pc')
  })

  it('keeps the keys of a duplicate that are not a part\'s', () => {
    s().updateProps('one', { shownBy: ['p0', 's'] })
    s().duplicateComponent('one')

    const copy = page().components.find((c) => !['one', 'two'].includes(c.id))
    expect(copy.props.shownBy).toEqual(['p0', 's'])
  })
})
