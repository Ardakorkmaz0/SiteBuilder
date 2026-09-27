// Which scaling a live preview gets: zoom where it keeps a native popup (a
// select's list) under its element, a transform where zoom is not reliable.
import { afterEach, describe, expect, it, vi } from 'vitest'

async function load({ userAgent, zoomSupported }) {
  vi.resetModules()
  vi.stubGlobal('navigator', { userAgent })
  vi.stubGlobal('CSS', { supports: (property) => property === 'zoom' && zoomSupported })
  window.CSS = globalThis.CSS
  return import('./previewScale.js')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0'

describe('previewScaleStyle', () => {
  it('zooms in Chromium, where a transform sends a select\'s list elsewhere', async () => {
    const { previewScaleStyle } = await load({ userAgent: CHROME, zoomSupported: true })

    expect(previewScaleStyle(0.68)).toEqual({ zoom: 0.68 })
  })

  it('keeps the transform in Firefox', async () => {
    const { previewScaleStyle } = await load({ userAgent: FIREFOX, zoomSupported: true })

    expect(previewScaleStyle(0.68)).toEqual({ transform: 'scale(0.68)', transformOrigin: 'top left' })
  })

  it('keeps the transform where zoom is not supported at all', async () => {
    const { previewScaleStyle } = await load({ userAgent: CHROME, zoomSupported: false })

    expect(previewScaleStyle(0.5)).toEqual({ transform: 'scale(0.5)', transformOrigin: 'top left' })
  })

  it('adds nothing at full size', async () => {
    const { previewScaleStyle } = await load({ userAgent: CHROME, zoomSupported: true })

    expect(previewScaleStyle(1)).toEqual({})
  })
})
