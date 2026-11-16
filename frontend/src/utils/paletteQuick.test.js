import { beforeEach, describe, expect, it } from 'vitest'
import { inViewSpot, notePaletteUse, noteRecentBlock, quickPicks, readPaletteUsage, readRecentBlocks } from './paletteQuick.js'

const variants = [
  { id: 'a' }, { id: 'b' }, { id: 'c', recommended: true }, { id: 'd' }, { id: 'e' }, { id: 'f' },
]

describe('the variants a palette row offers first', () => {
  it('puts the recommended one first, then the palette order', () => {
    expect(quickPicks(variants).map((v) => v.id)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('moves the ones this viewer adds most ahead of the rest', () => {
    expect(quickPicks(variants, { e: 3, b: 1 }).map((v) => v.id)).toEqual(['c', 'e', 'b', 'a'])
  })

  it('offers what there is when a row has fewer than four', () => {
    expect(quickPicks([{ id: 'x' }, { id: 'y' }]).map((v) => v.id)).toEqual(['x', 'y'])
  })
})

describe('remembering what this viewer adds', () => {
  beforeEach(() => localStorage.clear())

  it('counts each variant per type', () => {
    notePaletteUse('image', 'rounded')
    notePaletteUse('image', 'rounded')
    notePaletteUse('button', 'solid')
    expect(readPaletteUsage()).toEqual({ image: { rounded: 2 }, button: { solid: 1 } })
  })

  it('reads a broken store as empty', () => {
    localStorage.setItem('pwb_palette_usage', '[1,2')
    expect(readPaletteUsage()).toEqual({})
    localStorage.setItem('pwb_palette_usage', '[1,2]')
    expect(readPaletteUsage()).toEqual({})
  })
})

describe('where a block added by its number key lands', () => {
  it('goes below the selected block, centred on it', () => {
    expect(inViewSpot({ selected: { x: 100, y: 200, w: 300, h: 80 }, view: { top: 0, height: 600 }, canvasWidth: 1000, height: 40 }))
      .toEqual({ x: 250, y: 324 })
  })

  it('goes to the middle of the canvas on screen when nothing is selected', () => {
    expect(inViewSpot({ view: { top: 900, height: 600 }, canvasWidth: 1000, height: 40 })).toEqual({ x: 500, y: 1200 })
  })

  it('never lands above the top of the page', () => {
    expect(inViewSpot({ view: { top: 0, height: 0 }, canvasWidth: 800, height: 120 })).toEqual({ x: 400, y: 60 })
  })
})

describe('the blocks this viewer added last', () => {
  beforeEach(() => localStorage.clear())

  it('keeps the newest first, once each, eight at most', () => {
    for (const key of ['a', 'b', 'c', 'a']) noteRecentBlock(key)
    expect(readRecentBlocks()).toEqual(['a', 'c', 'b'])
    for (const key of ['1', '2', '3', '4', '5', '6', '7', '8']) noteRecentBlock(key)
    expect(readRecentBlocks()).toEqual(['8', '7', '6', '5', '4', '3', '2', '1'])
  })

  it('reads a broken store as empty', () => {
    localStorage.setItem('pwb_recent_blocks', '{"a":1}')
    expect(readRecentBlocks()).toEqual([])
  })
})

describe('where a quick add lands on a canvas zoomed or scrolled sideways', () => {
  it('goes to the middle of the part on screen, across as well as down', () => {
    // 500 px canvas at 200 percent: design x 0 to 200 on screen.
    expect(inViewSpot({ view: { top: 0, height: 200, left: 0, width: 200 }, canvasWidth: 500, width: 90, height: 40 }))
      .toEqual({ x: 100, y: 100 })
  })

  it('keeps the block inside the canvas when the part on screen is at its edge', () => {
    expect(inViewSpot({ view: { top: 0, height: 200, left: 460, width: 40 }, canvasWidth: 500, width: 90, height: 40 }))
      .toEqual({ x: 455, y: 100 })
  })
})
