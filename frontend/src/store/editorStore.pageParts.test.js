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
})
