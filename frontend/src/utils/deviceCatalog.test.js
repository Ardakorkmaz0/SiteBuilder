import { describe, expect, it } from 'vitest'
import { FOLDABLE_STATES, FOLD_STATE_ORDER, foldableOrder, foldableStateOfSize } from './deviceCatalog.js'
import { DEVICES, isMobileDevice } from './htmlDevices.js'
import { MOBILE_CANVAS_PRESETS, PC_CANVAS_PRESETS } from '../components/registry.jsx'

describe('foldable screens', () => {
  it('finds a foldable state by its screen size, rounding what a canvas stored', () => {
    expect(foldableStateOfSize(707, 823)?.id).toBe('zfold6-inner')
    expect(foldableStateOfSize('369', '905.4')?.id).toBe('zfold6-cover')
    expect(foldableStateOfSize(1061, 744)?.hinge).toBe('thirds')
    expect(foldableStateOfSize(411, 1006)?.hinge).toBe('horizontal')
  })

  it('does not take a phone as wide as a foldable for one', () => {
    // The Flip's inner screen and the Pixel 9 are both 411 wide.
    expect(foldableStateOfSize(411, 923)).toBeNull()
    expect(foldableStateOfSize(390, 0)).toBeNull()
    expect(foldableStateOfSize(707, 0)).toBeNull()
  })

  it('gives no other screen a foldable size, or it would be drawn with a crease', () => {
    const others = [
      ...DEVICES.filter((device) => device.category !== 'foldable').map((device) => `${device.id} ${device.w}×${device.h}`),
      ...[...PC_CANVAS_PRESETS, ...MOBILE_CANVAS_PRESETS]
        .filter((preset) => preset.category !== 'foldable')
        .map((preset) => `${preset.id} ${preset.width}×${preset.fold}`),
    ]
    expect(others.filter((entry) => {
      const [w, h] = entry.split(' ').pop().split('×')
      return foldableStateOfSize(w, h)
    })).toEqual([])
    const sizes = FOLDABLE_STATES.map((state) => `${state.w}×${state.h}`)
    expect(new Set(sizes).size).toBe(sizes.length)
  })

  it('puts a screen narrower than a tablet on the phone side, and a wider one on the PC side', () => {
    expect(isMobileDevice('zfold6-inner')).toBe(true) // 707
    expect(isMobileDevice('matext-double')).toBe(true) // 683
    expect(isMobileDevice('pixel9fold-inner')).toBe(false) // 791
    expect(isMobileDevice('matext-full')).toBe(false) // 1061
    expect(PC_CANVAS_PRESETS.filter((preset) => preset.category === 'foldable').map((preset) => preset.id))
      .toEqual(['pixel9fold-inner', 'matext-full'])
    expect(MOBILE_CANVAS_PRESETS.filter((preset) => preset.category === 'foldable').map((preset) => preset.id))
      .toEqual([
        'zfold6-cover', 'zfold6-inner', 'zflip6-cover', 'zflip6-inner', 'pixel9fold-cover',
        'matex6-cover', 'matex6-inner', 'matext-single', 'matext-double', 'iphonefold-cover', 'iphonefold-inner',
      ])
  })

  it('offers a foldable closed first, then opening, in the catalog order', () => {
    expect(FOLD_STATE_ORDER).toEqual(['cover', 'inner', 'single', 'double', 'full'])
    expect(foldableOrder('galaxy-zfold6')).toBe(0)
    expect(foldableOrder('iphone-fold')).toBe(5)
    expect(foldableOrder('galaxy-s24')).toBe(-1)
  })

  it('marks only the iPhone Fold as a concept', () => {
    expect(FOLDABLE_STATES.filter((state) => state.concept).map((state) => state.id))
      .toEqual(['iphonefold-cover', 'iphonefold-inner'])
  })
})
