import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore.js'

const s = () => useEditorStore.getState()
const LEGACY = '<!doctype html><html><body><h1>Legacy exported document</h1></body></html>'
const CURRENT = '<!doctype html><html><body><h1>Page document wins</h1></body></html>'

beforeEach(() => {
  s().loadSchema({ pages: [{ id: 'before', name: 'Before', components: [] }] })
})

describe('importing an exported site project', () => {
  it('recovers a legacy site-level HTML document onto its home page', () => {
    const file = {
      format: 'sitebuilder-project', version: 1,
      site: {
        html: LEGACY,
        schema: { pages: [
          { id: 'home', name: 'Home', components: [{
            id: 'kept', type: 'text', props: { text: 'Recoverable canvas design' },
            styles: {}, layout: { x: 10, y: 10, w: 200, h: 60 },
          }] },
          { id: 'about', name: 'About', components: [] },
        ] },
      },
    }
    expect(s().importSchema(file)).toEqual({ home: LEGACY })
    expect(s().schema.pages.map((page) => page.id)).toEqual(['home', 'about'])
    expect(s().schema.pages[0].mode).toBe('html')
    expect(s().schema.pages[0].components[0].props.text).toBe('Recoverable canvas design')
    expect(s().schema.pages[1].mode).toBe('empty')
    expect(s().schema.pages[0]).not.toHaveProperty('html')
    expect(s().dirty).toBe(true)
    s().undo()
    expect(s().schema.pages.map((page) => page.id)).toEqual(['before'])
  })

  it('prefers per-page HTML to the wrapper legacy copy and keeps other pages separate', () => {
    expect(s().importSchema({
      format: 'sitebuilder-project',
      site: { html: LEGACY, schema: { pages: [
        { id: 'home', name: 'Home', html: CURRENT, components: [] },
        { id: 'about', name: 'About', html: '<p>About only</p>', components: [] },
      ] } },
    })).toEqual({ home: CURRENT, about: '<p>About only</p>' })
  })

  it('still accepts a bare editor schema without borrowing a top-level HTML field', () => {
    expect(s().importSchema({
      html: LEGACY,
      pages: [{ id: 'home', name: 'Home', html: CURRENT, components: [] }],
    })).toEqual({ home: CURRENT })
    expect(s().schema.pages[0].mode).toBe('html')
  })

  it('keeps an explicitly component-mode home and a document-free bare schema in component mode', () => {
    s().importSchema({ format: 'sitebuilder-project', site: { html: LEGACY, schema: { pages: [
      { id: 'explicit', name: 'Canvas', mode: 'empty', components: [] },
    ] } } })
    expect(s().schema.pages[0].mode).toBe('empty')
    expect(s().importSchema({ html: LEGACY, pages: [{ id: 'plain', name: 'Plain', components: [] }] })).toEqual({})
    expect(s().schema.pages[0].mode).toBe('empty')
  })

  it('refuses a malformed wrapper without changing the open design or its history', () => {
    const schema = s().schema
    expect(s().importSchema({ format: 'sitebuilder-project', site: { html: LEGACY } })).toBe(false)
    expect(s().schema).toBe(schema)
    expect(s().dirty).toBe(false)
    expect(s().past).toEqual([])
  })
})
