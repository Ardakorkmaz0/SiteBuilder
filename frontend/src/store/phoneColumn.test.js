// The phone layout is one column: a block that grows pushes the ones under it
// down (and pulls them back up when it shrinks), so resizing on the phone never
// spreads one block over the next.
import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore.js'
import { embedPhoneKey } from '../utils/htmlEmbedMeasure.js'

const COMPONENTS = [
  { id: 'fld', type: 'input', props: { label: 'Email', inputType: 'email' }, styles: { fontSize: '15px' }, layout: { x: 40, y: 40, w: 320, h: 70 } },
  { id: 'tt', type: 'themeToggle', props: {}, styles: {}, layout: { x: 600, y: 40, w: 44, h: 44 } },
  { id: 'hd', type: 'heading', props: { text: 'Our story', level: 'h2' }, styles: { fontSize: '28px' }, layout: { x: 40, y: 160, w: 300, h: 50 } },
  { id: 'btn', type: 'button', props: { text: 'Book now' }, styles: {}, layout: { x: 40, y: 260, w: 140, h: 48 } },
  { id: 'bar', type: 'button', props: { text: 'Chat', scrollBehavior: 'fixed', pinY: 'bottom' }, styles: {}, layout: { x: 40, y: 700, w: 120, h: 44 } },
]

const comps = () => useEditorStore.getState().schema.pages[0].components
const phone = (id) => comps().find((c) => c.id === id).mobileLayout
const desk = (id) => comps().find((c) => c.id === id).layout

function overlaps() {
  const list = comps().filter((c) => c.props?.scrollBehavior !== 'fixed').map((c) => ({ id: c.id, ...c.mobileLayout }))
  const out = []
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const [a, b] = [list[i], list[j]]
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) out.push(`${a.id}/${b.id}`)
    }
  }
  return out
}

beforeEach(() => {
  const store = useEditorStore.getState()
  store.loadSchema({ theme: {}, pages: [{ id: 'home', name: 'Home', components: structuredClone(COMPONENTS) }] })
  store.setViewport('mobile')
})

describe('on the phone', () => {
  it('pushes the blocks under a growing block down, gaps kept', () => {
    expect(overlaps()).toEqual([])
    const gap = phone('hd').y - (phone('tt').y + phone('tt').h)
    const pinned = { ...phone('bar') }
    useEditorStore.getState().setLayout('fld', { h: phone('fld').h + 90 })
    expect(overlaps()).toEqual([])
    expect(phone('hd').y - (phone('tt').y + phone('tt').h)).toBe(gap)
    // A pinned overlay is not part of the column.
    expect(phone('bar')).toEqual(pinned)
  })

  it('pulls them back up when it shrinks, so no hole opens', () => {
    const before = phone('btn').y
    useEditorStore.getState().setLayout('fld', { h: phone('fld').h + 90 })
    useEditorStore.getState().setLayout('fld', { h: phone('fld').h - 90 })
    expect(phone('btn').y).toBe(before)
  })

  it('takes the push back with the resize in one undo', () => {
    const before = comps().map((c) => [c.id, c.mobileLayout.y])
    useEditorStore.getState().setLayout('fld', { h: phone('fld').h + 90 })
    useEditorStore.getState().undo()
    expect(comps().map((c) => [c.id, c.mobileLayout.y])).toEqual(before)
  })

  it('leaves the desktop design alone', () => {
    const before = COMPONENTS.map((c) => desk(c.id))
    useEditorStore.getState().setLayout('fld', { h: phone('fld').h + 90 })
    expect(COMPONENTS.map((c) => desk(c.id))).toEqual(before)
  })
})

describe('the phone layout made from the desktop', () => {
  it("keeps a theme switch its own size, not the phone's width", () => {
    expect([phone('tt').w, phone('tt').h]).toEqual([44, 44])
  })
})

describe('an HTML block narrowed on the phone', () => {
  const lead = (props = {}) => ({
    id: 'lead', type: 'html', props: { code: '<p>A lead paragraph, one line on the desktop.</p>', ...props },
    styles: {}, layout: { x: 40, y: 40, w: 510, h: 36 },
  })
  const below = { id: 'below', type: 'heading', props: { text: 'Next' }, styles: {}, layout: { x: 40, y: 120, w: 300, h: 50 } }
  const load = (props) => {
    useEditorStore.getState().loadSchema({ theme: {}, pages: [{ id: 'home', name: 'Home', components: [lead(props), below] }] })
  }

  it('gets room for its text to re-wrap until it is measured', () => {
    load()
    // Narrower on the phone, so taller: never the one-line desktop height.
    expect(phone('lead').w).toBeLessThan(510)
    expect(phone('lead').h).toBeGreaterThan(36)
  })

  it('takes the measured height, and the column follows it', () => {
    load()
    const key = embedPhoneKey(comps().find((c) => c.id === 'lead'))
    useEditorStore.getState().setEmbedPhoneHeights({ lead: { w: phone('lead').w, h: 120, key } })
    expect(phone('lead').h).toBe(120)
    expect(phone('below').y).toBeGreaterThanOrEqual(phone('lead').y + 120)
    // Measuring is not an edit: a page just opened is not "unsaved".
    expect(useEditorStore.getState().dirty).toBe(false)
  })

  it('ignores a measurement of what the block no longer is', () => {
    load({ _phoneH: { w: 358, h: 300, key: 'stale' } })
    expect(phone('lead').h).not.toBe(300)
  })
})

describe('on the desktop', () => {
  it('does not move anything: overlapping there can be the design', () => {
    useEditorStore.getState().setViewport('pc')
    useEditorStore.getState().setLayout('fld', { h: 400 })
    expect([desk('hd').y, desk('btn').y]).toEqual([160, 260])
  })
})
