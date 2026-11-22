import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { selectCurrentPage, useEditorStore } from '../../store/editorStore.js'
import { registry } from '../registry.jsx'
import FreeCanvasItem from './FreeCanvasItem.jsx'

const s = () => useEditorStore.getState()

function CanvasHost() {
  const current = useEditorStore(selectCurrentPage)
  return (
    <LanguageProvider>
      <div id="canvas-scroll">
        <div id="free-canvas" data-builder-canvas-scale="1">
          {current.components.map((c) => <FreeCanvasItem key={c.id} component={c} canvasScale={1} />)}
        </div>
      </div>
    </LanguageProvider>
  )
}

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

describe('FreeCanvasItem render isolation', () => {
  it('does not re-render an untouched sibling when another component is selected or moved', () => {
    const renderSpy = vi.spyOn(registry.text, 'Render')
    s().loadSchema({
      pages: [{
        id: 'p1',
        name: 'Home',
        canvasWidth: 1000,
        components: [
          { id: 'sibling', type: 'text', props: { text: 'Sibling' }, styles: {}, layout: { x: 260, y: 40, w: 140, h: 40 } },
          { id: 'moved', type: 'text', props: { text: 'Moved' }, styles: {}, layout: { x: 40, y: 200, w: 140, h: 40 } },
        ],
      }],
    })
    s().setViewport('pc')
    render(<CanvasHost />)

    const siblingCalls = () => renderSpy.mock.calls.filter(([arg]) => arg?.props?.text === 'Sibling').length
    const movedCalls = () => renderSpy.mock.calls.filter(([arg]) => arg?.props?.text === 'Moved').length

    expect(siblingCalls()).toBe(1)
    expect(movedCalls()).toBe(1)

    // Selecting another block must not re-render unaffected siblings.
    act(() => {
      s().selectComponent('moved')
    })
    expect(siblingCalls()).toBe(1)

    // Moving another block updates the page array, but memo + narrow selectors
    // + structural sharing in applyAutoMobileLayouts keep the untouched sibling
    // out of React's render pass.
    act(() => {
      s().setLayout('moved', { x: 120, y: 210, w: 140, h: 40 })
    })
    expect(movedCalls()).toBeGreaterThan(1)
    expect(siblingCalls()).toBe(1)
  })

  it('keeps an untouched sibling container and its children out of render when another component moves', () => {
    const renderSpy = vi.spyOn(registry.text, 'Render')
    s().loadSchema({
      pages: [{
        id: 'p1',
        name: 'Home',
        canvasWidth: 1000,
        mobileManual: true,
        components: [
          {
            id: 'box',
            type: 'container',
            props: {},
            styles: {},
            layout: { x: 40, y: 40, w: 300, h: 120 },
            children: [
              { id: 'nested', type: 'text', props: { text: 'Inside box' }, styles: {}, layout: { x: 10, y: 10, w: 120, h: 40 } },
            ],
          },
          { id: 'moved', type: 'text', props: { text: 'Moved' }, styles: {}, layout: { x: 40, y: 220, w: 140, h: 40 } },
        ],
      }],
    })
    s().setViewport('pc')
    render(<CanvasHost />)

    const nestedCalls = () => renderSpy.mock.calls.filter(([arg]) => arg?.props?.text === 'Inside box').length
    const movedCalls = () => renderSpy.mock.calls.filter(([arg]) => arg?.props?.text === 'Moved').length

    expect(nestedCalls()).toBe(1)
    expect(movedCalls()).toBe(1)

    act(() => {
      s().setLayout('moved', { x: 120, y: 230, w: 140, h: 40 })
    })
    expect(movedCalls()).toBeGreaterThan(1)
    expect(nestedCalls()).toBe(1)
  })
})
