// The phone screen has to be a REAL viewport, not just a minimum.
//
// Children fill it with `height: 100%`, and a percentage height only resolves
// against a parent whose height is definite. With `min-height` alone it is not:
// the HTML preview's iframe fell back to a replaced element's default 150px, so
// a page showed its first ~150px and the rest of the phone was the screen div's
// white background. It looked like the document was broken — in View and Edit,
// on every device, for every document — and nothing in the page was wrong.
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PhoneFrame from './PhoneFrame.jsx'
import { DEVICES } from '../../utils/htmlDevices.js'
import { phoneModel } from './phoneFrameMetrics.js'

const SCREEN_W = 393
const SCREEN_H = 852

function screenOf(container) {
  // The frame is the outer element; its screen is the child that clips.
  const frame = container.querySelector('[data-builder-phone-frame]')
  return [...frame.children].find((el) => el.style.overflow === 'hidden')
}

describe('PhoneFrame screen', () => {
  it('gives the screen a definite height, so percentage children can resolve', () => {
    const { container } = render(
      <PhoneFrame screenWidth={SCREEN_W} screenHeight={SCREEN_H}>
        <div data-testid="child" style={{ width: '100%', height: '100%' }} />
      </PhoneFrame>,
    )
    const screen = screenOf(container)
    expect(screen.style.height, 'height must be set, not only min-height').toBe(`${SCREEN_H}px`)
    expect(screen.style.width).toBe(`${SCREEN_W}px`)
  })

  it('keeps the minimum too, so the box never collapses below the device', () => {
    const { container } = render(
      <PhoneFrame screenWidth={SCREEN_W} screenHeight={SCREEN_H}>
        <span />
      </PhoneFrame>,
    )
    expect(screenOf(container).style.minHeight).toBe(`${SCREEN_H}px`)
  })

  it('sizes the outer body from the screen plus the bezel', () => {
    const { container } = render(
      <PhoneFrame screenWidth={SCREEN_W} screenHeight={SCREEN_H}>
        <span />
      </PhoneFrame>,
    )
    const frame = container.querySelector('[data-builder-phone-frame]')
    // Bezel is symmetric horizontally, so the body is wider than the screen.
    expect(parseInt(frame.style.width, 10)).toBeGreaterThan(SCREEN_W)
    expect(frame.style.paddingTop).toBeTruthy()
    expect(frame.style.paddingBottom).toBeTruthy()
  })

  it('renders whatever the caller puts on the screen', () => {
    const { getByTestId } = render(
      <PhoneFrame screenWidth={SCREEN_W} screenHeight={SCREEN_H}>
        <iframe data-testid="preview" title="preview" style={{ width: '100%', height: '100%' }} />
      </PhoneFrame>,
    )
    expect(getByTestId('preview')).toBeTruthy()
  })
})

describe('PhoneFrame on a foldable', () => {
  const creases = (id, width, height) => {
    const { container, unmount } = render(
      <PhoneFrame screenWidth={width} screenHeight={height} model={phoneModel(DEVICES.find((device) => device.id === id))}>
        <span />
      </PhoneFrame>,
    )
    const lines = [...container.querySelectorAll('[data-builder-hinge]')]
    const found = lines.map((line) => ({
      kind: line.dataset.builderHinge,
      left: line.style.left,
      top: line.style.top,
      clicks: line.style.pointerEvents,
    }))
    unmount()
    return found
  }

  it('draws the crease down the middle of an open book-style screen, and lets clicks through', () => {
    expect(creases('zfold6-inner', 707, 823)).toEqual([{ kind: 'vertical', left: '50%', top: '0px', clicks: 'none' }])
  })

  it('lays the Flip\'s crease across its screen', () => {
    expect(creases('zflip6-inner', 411, 1006)).toEqual([{ kind: 'horizontal', left: '0px', top: '50%', clicks: 'none' }])
  })

  it('draws two creases on a tri-fold, and none on a closed screen or a phone', () => {
    expect(creases('matext-full', 1061, 744).map((line) => line.left)).toEqual(['33.333%', '66.667%'])
    expect(creases('zfold6-cover', 369, 905)).toEqual([])
    expect(creases('iphone15pro', 393, 852)).toEqual([])
  })
})

describe('iPhone Duo hardware', () => {
  it.each([
    ['iphonefold-cover', 466, 678],
    ['iphonefold-inner', 951, 669],
  ])('draws a vertical Dynamic Island on the right edge of %s', (id, w, h) => {
    const { container } = render(
      <PhoneFrame screenWidth={w} screenHeight={h} model={phoneModel(DEVICES.find((device) => device.id === id))} />,
    )
    const island = [...screenOf(container).children].find((element) => element.style.right === '10px')
    expect(island).toHaveStyle({ width: '28px', height: '104px', top: '50%' })
  })
})
