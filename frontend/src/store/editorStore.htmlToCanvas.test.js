// An HTML page becomes a canvas page, and can become the HTML page again.
import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore.js'

const DOCUMENT = '<!DOCTYPE html><html><body><h1>Olive</h1></body></html>'
const s = () => useEditorStore.getState()
const home = () => s().schema.pages[0]

const blocks = () => [{
  id: 'region_1', type: 'region', props: { contentWidth: 1200 }, styles: { backgroundColor: 'rgb(15, 23, 42)' },
  layout: { x: 0, y: 0, w: 1200, h: 400 },
  children: [{ id: 'heading_1', type: 'heading', props: { text: 'Olive', level: 'h1' }, styles: { color: 'rgb(255, 255, 255)' }, layout: { x: 100, y: 60, w: 600, h: 60 } }],
}]

beforeEach(() => {
  s().loadSchema({
    theme: {},
    pages: [
      { id: 'page_home', name: 'Home', mode: 'html', components: [], flowMode: true, seoTitle: 'Kept title' },
      { id: 'page_about', name: 'About', mode: 'html', components: [] },
    ],
  })
})

describe('turning an HTML page into a canvas', () => {
  const convert = () => s().convertPageToCanvas('page_home', {
    components: blocks(), canvasWidth: 1200, background: '#0f172a', htmlBackup: DOCUMENT,
    seoTitle: 'From the document', seoDescription: 'A café', fonts: ['Fraunces:wght@500'],
  })

  it('puts the blocks on a free canvas of the measured width and keeps the document', () => {
    convert()

    expect(home()).toMatchObject({
      mode: 'empty', flowMode: false, mobileManual: false, canvasWidth: 1200,
      background: '#0f172a', backgroundMobile: '#0f172a',
      htmlBackup: DOCUMENT, fonts: ['Fraunces:wght@500'],
      // What the owner already wrote stays; what was empty is filled in.
      seoTitle: 'Kept title', seoDescription: 'A café',
    })
    expect(home().components.map((c) => [c.id, c.type, c.layout])).toEqual([['region_1', 'region', { x: 0, y: 0, w: 1200, h: 400 }]])
    expect(home().components[0].children[0]).toMatchObject({ id: 'heading_1', props: { text: 'Olive', level: 'h1' }, layout: { x: 100, y: 60, w: 600, h: 60 } })
    // Every block has a phone layout, like any block placed by hand.
    expect(home().components[0].mobileLayout.w).toBeLessThanOrEqual(390)
    expect(s().dirty).toBe(true)
    expect(s().schema.pages[1]).toMatchObject({ id: 'page_about', mode: 'html' })
  })

  it('is one step for Undo', () => {
    convert()
    s().undo()

    expect(home()).toMatchObject({ mode: 'html', components: [], flowMode: true })
    expect(home().htmlBackup).toBeUndefined()
  })

  it('does nothing for a page that is not there', () => {
    const before = s().schema
    s().convertPageToCanvas('page_gone', { components: blocks(), htmlBackup: DOCUMENT })

    expect(s().schema).toBe(before)
  })
})

describe('turning an HTML page that shows its parts one at a time into a canvas', () => {
  const heading = (id, text, part) => ({ id, type: 'heading', props: { text, level: 'h1', shownBy: [part] }, styles: {}, layout: { x: 340, y: 40, w: 600, h: 60 } })
  const menu = { id: 'menu', type: 'text', props: { text: 'Chapters' }, styles: {}, layout: { x: 0, y: 0, w: 300, h: 40 } }
  const convertParts = () => s().convertPageToCanvas('page_home', {
    components: [menu, heading('one', 'Part one', 'p0'), heading('two', 'Part two', 'p1')],
    canvasWidth: 1200, background: '#ffffff', htmlBackup: DOCUMENT,
    parts: [{ key: 'p0', label: 'Part one' }, { key: 'p1', label: 'Part two' }], hiddenKeys: ['p1', 'k1'],
  })

  it('keeps the parts and the keys hidden when the page opens', () => {
    convertParts()

    expect(home().parts).toEqual([{ key: 'p0', label: 'Part one' }, { key: 'p1', label: 'Part two' }])
    expect(home().hiddenKeys).toEqual(['p1', 'k1'])
  })

  it('lays each part out for the phone on its own, under what the parts share', () => {
    convertParts()
    const phone = (id) => home().components.find((c) => c.id === id).mobileLayout.y

    // Both open right under the menu, as each does on its own; read as one
    // page, the second would have been put under the first.
    expect(phone('one')).toBe(phone('two'))
    expect(phone('one')).toBeGreaterThan(phone('menu'))
  })
})

describe('going back to the HTML page', () => {
  it('hands the document back and makes the page an HTML page again', () => {
    s().convertPageToCanvas('page_home', { components: blocks(), canvasWidth: 1200, background: '#0f172a', htmlBackup: DOCUMENT })

    expect(s().restoreHtmlBackup('page_home')).toBe(DOCUMENT)
    expect(home()).toMatchObject({ mode: 'html', htmlBackup: '' })
    // The canvas design stays under the HTML page, as it does for any page.
    expect(home().components).toHaveLength(1)
  })

  it('does nothing for a page that has no document kept', () => {
    const before = s().schema

    expect(s().restoreHtmlBackup('page_about')).toBe('')
    expect(s().schema).toBe(before)
  })
})
