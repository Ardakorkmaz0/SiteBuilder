import { fireEvent, render } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { useEditorStore } from '../../store/editorStore.js'
import Canvas from './Canvas.jsx'

function loadPage() {
  useEditorStore.getState().loadSchema({
    theme: { fontFamily: '"Lora", Georgia, serif' },
    pages: [{
      id: 'home',
      name: 'Home',
      canvasWidth: 1000,
      components: [{
        id: 'embed',
        type: 'html',
        props: { code: '<p style="font-family:inherit">Hi</p>', _siteFont: true },
        styles: {},
        layout: { x: 100, y: 100, w: 400, h: 200 },
      }],
    }],
  })
  useEditorStore.getState().setViewport('pc')
}

function renderCanvas(props = {}) {
  return render(
    <LanguageProvider>
      <DndContext>
        <Canvas {...props} />
      </DndContext>
    </LanguageProvider>,
  )
}

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

describe('free canvas placement', () => {
  it('places an armed item where the tap lands, even on top of a component', () => {
    loadPage()
    const onPlaceAt = vi.fn()
    const { container } = renderCanvas({ pendingPlace: { type: 'widget', html: '<div>x</div>', w: 100, h: 40 }, onPlaceAt })
    const canvas = container.querySelector('#free-canvas')
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 800, right: 1000, bottom: 800 })
    const component = container.querySelector('[data-cid="embed"]')

    fireEvent.pointerDown(component, { button: 0, clientX: 300, clientY: 150 })

    expect(onPlaceAt).toHaveBeenCalledTimes(1)
    const [x, y] = onPlaceAt.mock.calls[0]
    expect(Math.round(x * Number(canvas.dataset.builderCanvasScale))).toBe(300)
    expect(Math.round(y * Number(canvas.dataset.builderCanvasScale))).toBe(150)
    // The tap placed the item; it did not also select the component under it.
    expect(useEditorStore.getState().selectedIds).not.toContain('embed')
  })

  it('draws opted-in embeds in the site font', () => {
    loadPage()
    const { container } = renderCanvas()
    const frame = container.querySelector('iframe[title="Embedded HTML"]')
    expect(frame.getAttribute('srcdoc')).toContain(':root{--pwb-embed-font:"Lora", Georgia, serif;}')
  })

  it('marks the artboard as the site surface, so a dark editor does not turn embeds opaque', () => {
    loadPage()
    const { container } = renderCanvas()
    expect(container.querySelector('#free-canvas').classList.contains('site-surface')).toBe(true)
  })
})
