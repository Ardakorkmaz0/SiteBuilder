import { describe, expect, it } from 'vitest'
import { containerChildKey, containerDesignWidth, fitContainerCanvas, scaledPhoneLayout } from './containerFit.js'
import { absoluteChildrenHeight } from '../components/renderer/layout.js'

const container = (extra = {}) => ({
  type: 'container', layout: { w: 500 }, props: {},
  children: [{ layout: { x: 650, w: 100 } }], ...extra,
})

describe('a free container design space', () => {
  it('includes the original right edge without mutating the geometry', () => {
    const component = container()
    const before = structuredClone(component)
    expect(containerDesignWidth(component)).toBe(750)
    expect(component).toEqual(before)
  })

  it('keeps the same design space when a child is hidden at either breakpoint', () => {
    expect(containerDesignWidth(container({ children: [{ hidden: true, hiddenMobile: true, layout: { x: 650, w: 100 } }] }))).toBe(750)
  })

  it('leaves auto-layout sizing to its flow rules', () => {
    for (const flow of ['column', 'row', 'grid']) {
      expect(containerDesignWidth(container({ props: { flow } }))).toBe(500)
    }
  })

  it('uses only direct children because each nested canvas fits its own contents', () => {
    expect(containerDesignWidth(container({ children: [
      { type: 'container', layout: { x: 50, w: 600 }, children: [{ layout: { x: 650, w: 100 } }] },
    ] }))).toBe(650)
  })

  it('ignores nonfinite coordinates and never produces an infinite or negative width', () => {
    expect(containerDesignWidth(container({ layout: { w: Infinity }, children: [
      { layout: { x: Infinity, w: NaN } },
      { layout: { x: -50, w: -100 } },
      { layout: { x: 1e308, w: 1e308 } },
    ] }))).toBe(600)
    expect(containerDesignWidth(container({ children: null }))).toBe(500)
  })
})

describe('whole-canvas fitting shared by View and export', () => {
  const elements = (width) => ({ box: { clientWidth: width, style: {} }, root: { style: {} } })

  it('scales the whole coordinate space into a narrow box', () => {
    const { box, root } = elements(500)
    expect(fitContainerCanvas(box, root, 750, 200)).toBe(0.6666666666666666)
    expect(root.style).toEqual({ width: '750px', height: '200px', transformOrigin: '0 0', transform: 'scale(0.6666666666666666)' })
    expect(box.style.minHeight).toBe('133.33333333333331px')
  })

  it('uses a 320px mobile measurement without magnifying a wide box', () => {
    const { box, root } = elements(320)
    expect(fitContainerCanvas(box, root, 750, 200)).toBe(0.4266666666666667)
    box.clientWidth = 900
    expect(fitContainerCanvas(box, root, 750, 200)).toBe(1)
    expect(root.style.transform).toBe('')
    expect(box.style.minHeight).toBe('200px')
  })

  it('handles missing measurements and malformed design sizes without NaN styles', () => {
    const { box, root } = elements(NaN)
    expect(fitContainerCanvas(box, root, Infinity, -1)).toBe(1)
    expect(root.style).toEqual({ width: '1px', height: '0px', transformOrigin: '0 0', transform: '' })
    expect(box.style.minHeight).toBe('0px')
  })
})

// A container whose blocks have a phone layout of their own (one converted
// from an uploaded page) draws them there on the phone instead of scaling
// its desktop drawing: a 294 px card in a 171 px phone box drew its text at
// 0.58 of its size.
describe('a free container with phone layouts', () => {
  const card = (props = { phoneLayout: true }) => ({
    type: 'container', props,
    layout: { x: 0, y: 0, w: 300, h: 120 },
    mobileLayout: { x: 16, y: 16, w: 180, h: 200 },
    children: [
      { id: 'a', layout: { x: 18, y: 20, w: 260, h: 40 }, mobileLayout: { x: 10, y: 10, w: 160, h: 80 } },
      { id: 'b', layout: { x: 18, y: 70, w: 120, h: 30 }, mobileLayout: { x: 10, y: 100, w: 120, h: 30 } },
    ],
  })

  it('stands its blocks at their phone layout on a phone only, when it says so', () => {
    expect(containerChildKey(card(), 'mobile')).toBe('mobileLayout')
    expect(containerChildKey(card(), 'pc')).toBe('layout')
    expect(containerChildKey(card(), 'mobile', true)).toBe('layout')
    // Every block has a mobileLayout once saved: that alone says nothing.
    expect(containerChildKey(card({}), 'mobile')).toBe('layout')
    expect(containerChildKey(card({ phoneLayout: true, flow: 'column' }), 'mobile')).toBe('layout')
  })

  it('is as wide as its phone box there, or as its blocks reach', () => {
    expect(containerDesignWidth(card(), 'mobileLayout')).toBe(180)
    expect(containerDesignWidth(card(), 'layout')).toBe(300)
    const wide = card()
    wide.children[1].mobileLayout = { x: 100, y: 100, w: 120, h: 30 }
    expect(containerDesignWidth(wide, 'mobileLayout')).toBe(220)
  })

  it('places a block put in it where the scaled desktop drawing showed it', () => {
    expect(scaledPhoneLayout(card(), { layout: { x: 100, y: 50, w: 150, h: 40 } })).toEqual({ x: 60, y: 30, w: 90, h: 24 })
  })
})

describe('how tall a container\'s blocks reach', () => {
  const kids = [
    { layout: { x: 0, y: 0, w: 100, h: 300 }, mobileLayout: { x: 0, y: 10, w: 100, h: 50 } },
    { layout: { x: 0, y: 0, w: 100, h: 40 }, mobileLayout: { x: 0, y: 400, w: 100, h: 50 }, hiddenMobile: true },
  ]

  it('reads their phone layout, without what the phone hides, when they stand there', () => {
    // 10 + 50 + 16 below.
    expect(absoluteChildrenHeight(kids, 20, 'mobileLayout')).toBe(76)
    // 300 + 16 below.
    expect(absoluteChildrenHeight(kids, 20)).toBe(316)
  })
})
