// A palette snippet dropped into a section stays that snippet: an `html`
// component carrying it, inside the section. The type's default component
// ("Contact Me" in the theme's style) used to be dropped instead.
import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore.js'

const s = () => useEditorStore.getState()

beforeEach(() => {
  s().loadSchema({ theme: {}, pages: [{ id: 'p1', name: 'Home', components: [] }] })
  s().addComponent('region', 0, 200)
})

describe('a palette snippet dropped into a section', () => {
  it('goes in as the snippet that was dragged', () => {
    const region = s().schema.pages[0].components[0]
    s().addComponent('html', 40, 30, region.id, null, { w: 120, h: 48 }, { code: '<a href="#">Hemen başla</a>', _paletteType: 'button' })
    const child = s().schema.pages[0].components[0].children[0]
    expect(child.type).toBe('html')
    expect(child.props.code).toBe('<a href="#">Hemen başla</a>')
    expect(child.props._paletteType).toBe('button')
    expect(child.layout).toMatchObject({ x: 40, y: 30, w: 120, h: 48 })
    expect(s().schema.pages[0].components).toHaveLength(1)
  })

  it('keeps the mobile drop coordinates in a section instead of re-deriving auto mobile', () => {
    const region = s().schema.pages[0].components[0]
    s().setViewport('mobile')
    s().addComponent('html', 40, 140, region.id, null, { w: 120, h: 48 }, { code: '<a href="#">Mobil</a>' })
    const page = s().schema.pages[0]
    const child = page.components[0].children[0]
    expect(page.mobileManual).toBe(true)
    expect(child.mobileLayout).toMatchObject({ x: 40, y: 140, w: 120, h: 48 })
    expect(child.layout.y).toBe(16)
  })

  it('keeps sections and horizontal navbars on the page even if dropped over a parent id', () => {
    const region = s().schema.pages[0].components[0]
    s().addComponent('region', 0, 50, region.id)
    s().addComponent('navbar', 0, 10, region.id, 'minimal')
    const top = s().schema.pages[0].components
    expect(top[0].children).toEqual([])
    expect(top.map((c) => c.type)).toEqual(['region', 'region', 'navbar'])
  })
})
