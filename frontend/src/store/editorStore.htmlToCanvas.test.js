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

describe('turning an HTML page that shows its parts one at a time into canvas pages', () => {
  const extra = (id, name) => ({ id, name, components: blocks().map((c) => ({ ...c, id: `${c.id}_${id}`, children: [] })), canvasWidth: 1200, background: '#0f172a', fonts: ['Fraunces:wght@500'] })

  it('adds the other parts as canvas pages after it, in one step', () => {
    s().convertPageToCanvas('page_home', {
      components: blocks(), canvasWidth: 1200, background: '#0f172a', htmlBackup: DOCUMENT,
      more: [extra('page_costs', 'Costs'), extra('page_proofs', 'Proofs'), extra('page_about', 'Taken id'), { id: 'page_bad' }],
    })

    expect(s().schema.pages.map((p) => [p.id, p.name, p.mode])).toEqual([
      ['page_home', 'Home', 'empty'],
      ['page_costs', 'Costs', 'empty'],
      ['page_proofs', 'Proofs', 'empty'],
      ['page_about', 'About', 'html'],
    ])
    expect(s().schema.pages[1]).toMatchObject({ canvasWidth: 1200, background: '#0f172a', flowMode: false, fonts: ['Fraunces:wght@500'] })
    expect(s().schema.pages[1].components[0]).toMatchObject({ id: 'region_1_page_costs', type: 'region' })
    // Only the page that was converted keeps the document.
    expect(s().schema.pages[1].htmlBackup).toBeUndefined()

    s().undo()
    expect(s().schema.pages.map((p) => [p.id, p.mode])).toEqual([['page_home', 'html'], ['page_about', 'html']])
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
