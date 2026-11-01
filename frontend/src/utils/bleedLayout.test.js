import { describe, expect, it } from 'vitest'
import { bleedContentWidth, horizontalPadding, stretchesToViewport } from './bleedLayout.js'

describe('horizontalPadding', () => {
  it('reads the shorthand the way CSS does', () => {
    expect(horizontalPadding({ padding: '24px' })).toEqual({ left: 24, right: 24 })
    expect(horizontalPadding({ padding: '18px 28px' })).toEqual({ left: 28, right: 28 })
    expect(horizontalPadding({ padding: '10px 30px 12px' })).toEqual({ left: 30, right: 30 })
    expect(horizontalPadding({ padding: '0 12px 0 40px' })).toEqual({ left: 40, right: 12 })
    expect(horizontalPadding({ padding: 16 })).toEqual({ left: 16, right: 16 })
  })

  it('lets the longhands win and counts other units as nothing', () => {
    expect(horizontalPadding({ padding: '20px', paddingLeft: '8px' })).toEqual({ left: 8, right: 20 })
    expect(horizontalPadding({ padding: '2em 5%' })).toEqual({ left: 0, right: 0 })
    expect(horizontalPadding({})).toEqual({ left: 0, right: 0 })
  })
})

describe('stretchesToViewport', () => {
  it('stretches a section or divider laid across the whole design, not a narrower one', () => {
    expect(stretchesToViewport({ type: 'section' }, { x: 0, y: 64, w: 1000, h: 380 }, 1000)).toBe(true)
    expect(stretchesToViewport({ type: 'divider' }, { x: 0, y: 10, w: 1000, h: 2 }, 1000)).toBe(true)
    expect(stretchesToViewport({ type: 'section' }, { x: 100, y: 64, w: 800, h: 380 }, 1000)).toBe(false)
    expect(stretchesToViewport({ type: 'section' }, { x: 0, y: 64, w: 600, h: 380 }, 1000)).toBe(false)
  })

  it('judges the phone design on its own width', () => {
    const band = { type: 'section', layout: { x: 0, y: 0, w: 1000, h: 300 } }
    expect(stretchesToViewport(band, { x: 0, y: 0, w: 390, h: 420 }, 390)).toBe(true)
    expect(stretchesToViewport(band, { x: 16, y: 0, w: 358, h: 420 }, 390)).toBe(false)
  })

  it('keeps the navbar rule: horizontal and not boxed', () => {
    expect(stretchesToViewport({ type: 'navbar', props: {} }, null, 1000)).toBe(true)
    expect(stretchesToViewport({ type: 'navbar', props: { widthMode: 'boxed' } }, null, 1000)).toBe(false)
    expect(stretchesToViewport({ type: 'navbar', props: { navLayout: 'vertical' } }, null, 1000)).toBe(false)
    expect(stretchesToViewport({ type: 'region' }, null, 1000)).toBe(true)
    expect(stretchesToViewport({ type: 'heading' }, { x: 0, y: 0, w: 1000, h: 60 }, 1000)).toBe(false)
  })
})

describe('bleedContentWidth', () => {
  it('keeps the row on the design column inside the padding', () => {
    // The default navbar: 980 content width, 28px padding on a 1000px design.
    expect(bleedContentWidth({ props: { contentWidth: 980 } }, { padding: '18px 28px' }, 1000)).toBe(944)
    // A narrower content width of its own still wins.
    expect(bleedContentWidth({ props: { contentWidth: 700 } }, { padding: '18px 28px' }, 1000)).toBe(700)
    // A section has none: the column inside its padding.
    expect(bleedContentWidth({ props: {} }, { padding: '40px' }, 1000)).toBe(920)
    // The phone design.
    expect(bleedContentWidth({ props: { contentWidth: 980 } }, { padding: '18px 28px' }, 390)).toBe(334)
  })
})

// The editor's px field writes its unit, and an emptied field means "full
// width": both used to be read as no number at all.
describe('bleedContentWidth from the px field', () => {
  it('reads a typed width with its unit and an empty one as the whole column', () => {
    expect(bleedContentWidth({ props: { contentWidth: '1200px' } }, { padding: '12px 20px' }, 1920)).toBe(1200)
    expect(bleedContentWidth({ props: { contentWidth: '' } }, { padding: '12px 20px' }, 1920)).toBe(1880)
  })
})
