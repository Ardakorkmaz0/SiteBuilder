// The editor draws a container with phone layouts (props.phoneLayout) the
// way the published page does: on the phone, each block at its phone
// layout, unscaled; anywhere else, and for any other container, at the
// desktop drawing.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { RenderComponent } from './Renderer.jsx'

const card = (props) => ({
  id: 'card', type: 'container', props, styles: {},
  layout: { x: 0, y: 0, w: 300, h: 120 }, mobileLayout: { x: 16, y: 16, w: 180, h: 200 },
  children: [{ id: 'title', type: 'text', props: { text: 'Humidity' }, styles: {}, layout: { x: 18, y: 20, w: 260, h: 40 }, mobileLayout: { x: 10, y: 10, w: 160, h: 80 } }],
})

function drawn(props, viewport) {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(viewport === 'mobile' ? 180 : 300)
  const view = render(<RenderComponent component={card(props)} viewport={viewport} />)
  const box = view.container.querySelector('#title')
  const root = view.container.querySelector('[data-pwb-container-root]')
  const out = { left: box.style.left, width: box.style.width, height: box.style.height, rootWidth: root.style.width, transform: root.style.transform }
  cleanup()
  vi.restoreAllMocks()
  return out
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('a container drawn in the editor', () => {
  it('stands its blocks at their phone layout on the phone when it has phone layouts', () => {
    expect(drawn({ phoneLayout: true }, 'mobile')).toEqual({ left: '10px', width: '160px', height: '80px', rootWidth: '180px', transform: '' })
  })

  it('keeps the desktop drawing on the desktop, and on the phone for any other container, scaled there', () => {
    expect(drawn({ phoneLayout: true }, 'pc')).toMatchObject({ left: '18px', width: '260px', rootWidth: '300px' })
    expect(drawn({}, 'mobile')).toEqual({ left: '18px', width: '260px', height: '40px', rootWidth: '300px', transform: 'scale(0.6)' })
  })
})
