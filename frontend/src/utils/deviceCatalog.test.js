import { describe, expect, it } from 'vitest'
import { FOLD_STATE_ORDER, foldableOrder } from './deviceCatalog.js'
import { DEVICES, isMobileDevice } from './htmlDevices.js'
import { MOBILE_CANVAS_PRESETS, PC_CANVAS_PRESETS } from '../components/registry.jsx'

const canvas = [...PC_CANVAS_PRESETS, ...MOBILE_CANVAS_PRESETS]

describe('device screens', () => {
  it.each([
    ['iphonefold-cover', 'iPhone Duo', 466, 678, null, true],
    ['iphonefold-inner', 'iPhone Duo', 951, 669, 'vertical', false],
    ['pixel7', 'Pixel 7', 411, 914, undefined, true],
    ['pixel9', 'Pixel 9', 411, 923, undefined, true],
    ['pixel9fold-cover', 'Pixel 9 Pro Fold', 411, 923, null, true],
    ['pixel9fold-inner', 'Pixel 9 Pro Fold', 791, 820, 'vertical', false],
    ['zflip6-inner', 'Galaxy Z Flip6', 411, 1006, 'horizontal', true],
    ['zfold6-cover', 'Galaxy Z Fold6', 369, 905, null, true],
    ['galaxys24ultra', 'Galaxy S24 Ultra', 384, 832, undefined, true],
  ])('offers %s at its rounded logical screen size in both editors', (id, name, w, h, hinge, mobile) => {
    const htmlDevice = DEVICES.find((device) => device.id === id)
    const canvasDevice = canvas.find((device) => device.id === id)
    expect(htmlDevice).toMatchObject({ name, w, h })
    expect(canvasDevice).toMatchObject({ name, width: w, fold: h })
    expect(htmlDevice.hinge).toBe(hinge)
    expect(canvasDevice.hinge).toBe(hinge)
    expect(isMobileDevice(id)).toBe(mobile)
    expect((mobile ? MOBILE_CANVAS_PRESETS : PC_CANVAS_PRESETS).some((device) => device.id === id)).toBe(true)
  })

  it('offers a foldable closed first, then opening, in the catalog order', () => {
    expect(FOLD_STATE_ORDER).toEqual(['cover', 'inner', 'single', 'double', 'full'])
    expect(foldableOrder('galaxy-zfold6')).toBe(0)
    expect(foldableOrder('iphone-fold')).toBe(5)
    expect(foldableOrder('galaxy-s24')).toBe(-1)
  })
})
