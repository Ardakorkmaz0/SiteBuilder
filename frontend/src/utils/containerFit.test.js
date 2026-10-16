import { describe, expect, it } from 'vitest'
import { containerDesignWidth, fitContainerCanvas } from './containerFit.js'

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
