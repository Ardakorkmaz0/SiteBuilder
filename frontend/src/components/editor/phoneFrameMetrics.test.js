import { describe, expect, it } from 'vitest'
import { phoneModel } from './phoneFrameMetrics.js'
import { mobileBrowserSkin } from './browserFrameMetrics.js'

describe('real phone frame profiles', () => {
  it('keeps the default 390px artboard vendor-neutral', () => {
    expect(phoneModel(390, 0).id).toBe('generic')
    expect(phoneModel(390, 0).name).toBe('Standard mobile')
  })

  it.each([
    [390, 'iphone-notch', 'iPhone 14'],
    [375, 'iphone-classic', 'iPhone SE'],
    [393, 'iphone-island', 'iPhone 15 Pro'],
    [360, 'galaxy-s24', 'Galaxy S24'],
    [384, 'galaxy-s24-ultra', 'Galaxy S24 Ultra'],
    [412, 'pixel-7', 'Pixel 7'],
  ])('maps %ipx to its actual device body', (width, id, name) => {
    const model = phoneModel(width)
    expect(model.id).toBe(id)
    expect(model.name).toContain(name)
  })
})

describe('foldable bodies', () => {
  it.each([
    [707, 823, 'Galaxy Z Fold6', 'vertical'],
    [411, 1006, 'Galaxy Z Flip6', 'horizontal'],
    [791, 820, 'Pixel 9 Pro Fold', 'vertical'],
    [1061, 744, 'Huawei Mate XT', 'thirds'],
    [369, 905, 'Galaxy Z Fold6', null],
    [336, 744, 'Huawei Mate XT', null],
  ])('draws a %ix%i screen as a foldable, creased where it folds', (width, height, name, hinge) => {
    const model = phoneModel(width, height)
    expect(model.id).toBe('foldable')
    expect(model.name).toBe(name)
    expect(model.hinge).toBe(hinge)
  })

  it('keeps a Pixel 9 a Pixel, though the Flip is as wide', () => {
    expect(phoneModel(411, 923).id).toBe('pixel-7')
    expect(phoneModel(411, 923).hinge).toBeUndefined()
  })

  it('gives each maker its own keys, and with them its browser', () => {
    expect(phoneModel(640, 904).buttons).toBe('iphone')
    expect(mobileBrowserSkin(phoneModel(640, 904))).toBe('ios')
    expect(phoneModel(791, 820).buttons).toBe('pixel')
    expect(mobileBrowserSkin(phoneModel(707, 823))).toBe('android')
  })
})
