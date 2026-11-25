import { describe, expect, it } from 'vitest'
import { DEVICES } from '../../utils/htmlDevices.js'
import { phoneModel } from './phoneFrameMetrics.js'
import { mobileBrowserSkin } from './browserFrameMetrics.js'

const modelOf = (id) => phoneModel(DEVICES.find((device) => device.id === id))

describe('real phone frame profiles', () => {
  it('keeps a custom artboard vendor-neutral', () => {
    expect(phoneModel()).toMatchObject({ id: 'generic', name: 'Standard mobile' })
  })

  it.each([
    ['iphone14', 'iphone-notch', 'notch'],
    ['iphonese', 'iphone-classic', 'earpiece'],
    ['iphone15pro', 'iphone-island', 'island'],
    ['iphone16promax', 'iphone-island', 'island'],
    ['galaxys24', 'galaxy-s24', 'punch'],
    ['galaxys24ultra', 'galaxy-s24-ultra', 'punch'],
    ['pixel7', 'pixel-7', 'punch'],
    ['pixel9', 'pixel-9', 'punch'],
    ['pixel9fold-cover', 'foldable', 'punch'],
  ])('maps %s to its body and camera by identity', (device, id, camera) => {
    expect(modelOf(device)).toMatchObject({ id, camera })
  })
})

describe('foldable bodies', () => {
  it.each([
    ['zfold6-inner', 'Galaxy Z Fold6', 'vertical'],
    ['zflip6-inner', 'Galaxy Z Flip6', 'horizontal'],
    ['pixel9fold-inner', 'Pixel 9 Pro Fold', 'vertical'],
    ['matext-full', 'Huawei Mate XT', 'thirds'],
    ['zfold6-cover', 'Galaxy Z Fold6', null],
    ['matext-single', 'Huawei Mate XT', null],
    ['iphonefold-cover', 'iPhone Duo', null],
    ['iphonefold-inner', 'iPhone Duo', 'vertical'],
  ])('draws %s as a foldable, creased where it folds', (device, name, hinge) => {
    expect(modelOf(device)).toMatchObject({ id: 'foldable', name, hinge })
  })

  it('gives each maker its own keys, camera and browser', () => {
    for (const id of ['iphonefold-cover', 'iphonefold-inner']) {
      expect(modelOf(id)).toMatchObject({ buttons: 'iphone', camera: 'island', body: 'titanium' })
      expect(mobileBrowserSkin(modelOf(id))).toBe('ios')
    }
    expect(modelOf('pixel9fold-inner').buttons).toBe('pixel')
    expect(mobileBrowserSkin(modelOf('zfold6-inner'))).toBe('android')
  })
})
