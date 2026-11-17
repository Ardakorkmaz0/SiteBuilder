// In the phone view the editor lets the owner select and move a container's
// blocks where they are drawn: at their phone layout.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { useEditorStore } from '../../store/editorStore.js'
import { ContainerEditor } from './FlowCanvasItem.jsx'

const state = () => useEditorStore.getState()

function editable(props) {
  state().loadSchema({ pages: [{
    id: 'home', name: 'Home', mobileWidth: 390, mobileManual: true,
    components: [{
      id: 'card', type: 'container', props, styles: {},
      layout: { x: 0, y: 0, w: 300, h: 120 }, mobileLayout: { x: 16, y: 16, w: 180, h: 200 },
      children: [{ id: 'title', type: 'text', props: { text: 'Humidity' }, styles: {}, layout: { x: 18, y: 20, w: 260, h: 40 }, mobileLayout: { x: 10, y: 10, w: 160, h: 80 } }],
    }],
  }] })
  state().setViewport('mobile')
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(180)
  const view = render(<LanguageProvider><ContainerEditor component={state().schema.pages[0].components[0]} /></LanguageProvider>)
  const item = view.container.querySelector('[data-cid="title"]')
  return { left: item.style.left, top: item.style.top, width: item.style.width, height: item.style.height }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('a container\'s blocks in the editor\'s phone view', () => {
  it('stand at their phone layout when the container has phone layouts', () => {
    expect(editable({ phoneLayout: true })).toEqual({ left: '10px', top: '10px', width: '160px', height: '80px' })
  })

  // A page laid out by hand before containers had phone layouts: the place
  // its scaled drawing gave each block (180 / 300 of the desktop one).
  it('stand where the scaled drawing showed them on a page laid out by hand before', () => {
    expect(editable({})).toEqual({ left: '11px', top: '12px', width: '156px', height: '24px' })
  })
})
