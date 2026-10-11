import { describe, expect, it } from 'vitest'
import { PC_MIN_WIDTH, PHONE_BREAKPOINT, devicesFor, isMobileDevice, responsivePcSize } from './htmlDevices.js'

describe('the PC/Mobile sides of the device list', () => {
  it('puts phones under Mobile and everything else, the area width included, under PC', () => {
    expect(isMobileDevice('iphone15pro')).toBe(true)
    expect(isMobileDevice('ipad')).toBe(false)
    expect(isMobileDevice('fit')).toBe(false)
    expect(devicesFor('pc').map((d) => d.id)).toContain('fit')
    expect(devicesFor('mobile').every((d) => d.w < PHONE_BREAKPOINT)).toBe(true)
  })
})

// "Responsive · area width" used to draw the page at whatever the area was. In
// a small window with both rails open that is about 700px: the page went into
// its phone layout, and the phone overrides made in the editor applied, under a
// toggle that said PC.
describe('the page size the Responsive PC device draws at', () => {
  it('is the area itself when the area is as wide as a desktop', () => {
    expect(responsivePcSize({ availableW: 1100, availableH: 700 })).toEqual({ narrow: false, width: 1100, height: 700 })
    // The browser frame takes its share first.
    expect(responsivePcSize({ availableW: 1100, availableH: 700, frameW: 20, frameH: 60 }))
      .toEqual({ narrow: false, width: 1080, height: 640 })
    expect(responsivePcSize({ availableW: PHONE_BREAKPOINT, availableH: 700 }).narrow).toBe(false)
  })

  it('keeps a desktop width under the phone breakpoint, never the phone layout', () => {
    const size = responsivePcSize({ availableW: 710, availableH: 600 })
    expect(size.narrow).toBe(true)
    expect(size.width).toBe(PC_MIN_WIDTH)
    expect(size.width).toBeGreaterThanOrEqual(PHONE_BREAKPOINT)
  })

  it('makes the smaller page as tall as the area, so it still fills it', () => {
    const availableW = 710
    const availableH = 600
    const size = responsivePcSize({ availableW, availableH })
    const scale = availableW / size.width
    expect(Math.round(size.height * scale)).toBe(availableH)

    const framed = responsivePcSize({ availableW, availableH, frameW: 20, frameH: 60 })
    const framedScale = availableW / (framed.width + 20)
    expect(Math.abs((framed.height + 60) * framedScale - availableH)).toBeLessThan(1)
  })

  it('does not take a stage that has not been measured yet for a narrow one', () => {
    expect(responsivePcSize({ availableW: 1, availableH: 1, measured: false }))
      .toEqual({ narrow: false, width: 320, height: 420 })
  })
})
