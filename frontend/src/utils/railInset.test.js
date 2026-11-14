import { describe, expect, it } from 'vitest'
import { fixedRailInset } from './railInset.js'
import { schemaToCss } from './schemaToFiles.js'

const rail = (over = {}) => ({
  type: 'navbar',
  props: { navLayout: 'vertical', scrollBehavior: 'fixed', ...over.props },
  layout: { w: 220, h: 320, ...over.layout },
})

describe('fixedRailInset', () => {
  it('measures a fixed left rail', () => {
    expect(fixedRailInset([rail()])).toEqual({ left: 220, right: 0 })
  })

  it('measures a right-pinned rail on the right', () => {
    expect(fixedRailInset([rail({ props: { pinX: 'right' } })])).toEqual({ left: 0, right: 220 })
  })

  it('takes the widest rail per side', () => {
    expect(fixedRailInset([rail(), rail({ layout: { w: 300 } })])).toEqual({ left: 300, right: 0 })
  })

  it('reserves space only for desktop-visible rails, independently of mobile visibility', () => {
    expect(fixedRailInset([
      { ...rail(), hidden: true },
      { ...rail({ props: { pinX: 'right' } }), hidden: true },
    ])).toEqual({ left: 0, right: 0 })
    expect(fixedRailInset([{ ...rail(), hiddenMobile: true }])).toEqual({ left: 220, right: 0 })
  })

  it('exports an edge-to-edge fixed top bar when its desktop side rail is hidden', () => {
    const css = schemaToCss({
      pages: [{
        id: 'home', name: 'Home', canvasWidth: 1000,
        components: [
          { ...rail(), id: 'rail', hidden: true },
          {
            id: 'topnav', type: 'navbar',
            props: { navLayout: 'horizontal', scrollBehavior: 'fixed' },
            styles: {}, layout: { x: 0, y: 0, w: 1000, h: 64 },
          },
        ],
      }],
    })
    const desktopBar = css.match(/\.c-topnav \{([^}]+)\}/)?.[1] || ''
    expect(desktopBar).toContain('left: 0px;')
    expect(desktopBar).toContain('right: 0px;')
    expect(desktopBar).toContain('width: 100%;')
  })

  it('ignores horizontal, unpinned or zero-width navbars', () => {
    expect(fixedRailInset([rail({ props: { navLayout: 'horizontal' } })])).toEqual({ left: 0, right: 0 })
    expect(fixedRailInset([rail({ props: { scrollBehavior: 'normal' } })])).toEqual({ left: 0, right: 0 })
    expect(fixedRailInset([rail({ layout: { w: 0 } })])).toEqual({ left: 0, right: 0 })
    expect(fixedRailInset([{ type: 'card', props: {}, layout: { w: 200 } }])).toEqual({ left: 0, right: 0 })
    expect(fixedRailInset(null)).toEqual({ left: 0, right: 0 })
  })
})
