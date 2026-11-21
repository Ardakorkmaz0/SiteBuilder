import { describe, expect, it } from 'vitest'
import { blockSize } from './paletteData.js'

describe('paletteData blockSize', () => {
  it('prefers the explicit measured size on section-library block objects', () => {
    expect(blockSize({ id: 'custom-section', size: [960, 520] })).toEqual([960, 520])
  })

  it('falls back to the core block table for blocks without an explicit size array', () => {
    expect(blockSize({ id: 'hero' })).toEqual([1000, 420])
    expect(blockSize('pricing')).toEqual([1000, 380])
  })

  it('returns the default frame size for unknown blocks', () => {
    expect(blockSize({ id: 'unknown-block' })).toEqual([1000, 360])
    expect(blockSize('unknown-block')).toEqual([1000, 360])
  })
})
