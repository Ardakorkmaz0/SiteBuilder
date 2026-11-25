import { act, fireEvent, render } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { beforeEach, describe, expect, it } from 'vitest'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { useEditorStore } from '../../store/editorStore.js'
import Canvas from './Canvas.jsx'
import { selectionActionsPosition } from './canvasSelectionActionsLayout.js'

function loadSelectedPage() {
  useEditorStore.getState().loadSchema({
    theme: {},
    pages: [{
      id: 'home',
      name: 'Home',
      canvasWidth: 1000,
      components: [{
        id: 'button',
        type: 'button',
        props: { text: 'Button' },
        styles: {},
        layout: { x: 450, y: 200, w: 100, h: 50 },
      }],
    }],
  })
  useEditorStore.getState().setViewport('pc')
  useEditorStore.getState().selectComponent('button')
}

function renderCanvas() {
  return render(
    <LanguageProvider>
      <DndContext>
        <Canvas />
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

describe('canvas selection action overlay', () => {
  it('uses the selected node rectangle instead of a fixed canvas location', () => {
    loadSelectedPage()
    const { container } = renderCanvas()
    const canvas = container.querySelector('#free-canvas')
    const target = container.querySelector('[data-cid="button"]')
    const canvasRect = { left: 100, top: 50, width: 1000, height: 800, right: 1100, bottom: 850 }
    let targetRect = { left: 550, top: 250, width: 100, height: 50, right: 650, bottom: 300 }
    canvas.getBoundingClientRect = () => canvasRect
    target.getBoundingClientRect = () => targetRect

    const expectedPosition = () => selectionActionsPosition({
      canvasWidth: parseFloat(canvas.style.width),
      canvasHeight: parseFloat(canvas.style.minHeight),
      targetX: targetRect.left - canvasRect.left,
      targetY: targetRect.top - canvasRect.top,
      targetWidth: targetRect.width,
      targetHeight: targetRect.height,
      canvasScale: Number(canvas.dataset.builderCanvasScale),
      // parent, duplicate, backward, forward, PC, mobile, delete, deselect
      actionCount: 8,
    })

    act(() => window.dispatchEvent(new Event('resize')))

    const toolbar = container.querySelector('[data-canvas-selection-actions]')
    let expected = expectedPosition()
    expect(toolbar.style.left).toBe(`${expected.left}px`)
    expect(toolbar.style.top).toBe(`${expected.top}px`)
    expect(toolbar.style.zIndex).toBe('1100')

    // Move the selected node to the canvas top. The same measured-node path
    // flips the bar below it rather than leaving it clipped above the canvas.
    targetRect = { left: 120, top: 54, width: 100, height: 44, right: 220, bottom: 98 }
    act(() => window.dispatchEvent(new Event('resize')))

    expected = expectedPosition()
    expect(expected.placement).toBe('below')
    expect(toolbar.style.left).toBe(`${expected.left}px`)
    expect(toolbar.style.top).toBe(`${expected.top}px`)
  })

  it('lets go of the selection with the X at the end of the bar, drawn like the HTML page bar', () => {
    loadSelectedPage()
    const { container } = renderCanvas()
    const canvas = container.querySelector('#free-canvas')
    const target = container.querySelector('[data-cid="button"]')
    canvas.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 800, right: 1100, bottom: 850 })
    target.getBoundingClientRect = () => ({ left: 550, top: 250, width: 100, height: 50, right: 650, bottom: 300 })
    act(() => window.dispatchEvent(new Event('resize')))
    const toolbar = container.querySelector('[data-canvas-selection-actions]')
    const ids = [...toolbar.querySelectorAll('[data-canvas-selection-action]')].map((b) => b.getAttribute('data-canvas-selection-action'))
    expect(ids.slice(-2)).toEqual(['delete', 'deselect'])
    // Delete is a trash can, not a red box with ×.
    const remove = toolbar.querySelector('[data-canvas-selection-action="delete"]')
    expect(remove.textContent).toBe('')
    expect(remove.querySelector('path[d="M9 7V4h6v3"]')).not.toBeNull()

    act(() => { fireEvent.click(toolbar.querySelector('[data-canvas-selection-action="deselect"]')) })

    expect(useEditorStore.getState().selectedId).toBeNull()
    expect(container.querySelector('[data-canvas-selection-actions]')).toBeNull()
    expect(useEditorStore.getState().schema.pages[0].components.map((c) => c.id)).toEqual(['button'])
  })

  // A phone's cover screen zoomed out (Galaxy Z Flip6, 320px at 50%): the bar
  // kept its size on screen, wider than the page, and ran past its edge.
  it('fits on a page narrower on screen than the bar', () => {
    useEditorStore.getState().loadSchema({
      theme: {},
      pages: [{
        id: 'home', name: 'Home', canvasWidth: 1000, mobileWidth: 320, mobileFold: 332,
        components: [{ id: 'button', type: 'button', props: { text: 'Button' }, styles: {}, layout: { x: 0, y: 120, w: 320, h: 40 } }],
      }],
    })
    useEditorStore.getState().setViewport('mobile')
    useEditorStore.getState().selectComponent('button')
    const { container } = render(
      <LanguageProvider>
        <DndContext>
          <Canvas zoom={50} />
        </DndContext>
      </LanguageProvider>,
    )
    const canvas = container.querySelector('#free-canvas')
    const target = container.querySelector('[data-cid="button"]')
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 160, height: 166, right: 160, bottom: 166 })
    target.getBoundingClientRect = () => ({ left: 0, top: 60, width: 160, height: 20, right: 160, bottom: 80 })

    act(() => window.dispatchEvent(new Event('resize')))

    const toolbar = container.querySelector('[data-canvas-selection-actions]')
    const drawn = Number(/scale\(([\d.]+)\)/.exec(toolbar.style.transform)?.[1] || 1)
    const left = Number.parseFloat(toolbar.style.left)
    // parent, duplicate, backward, forward, PC, mobile, delete, deselect: 248px.
    expect(left).toBeGreaterThanOrEqual(0)
    expect(left + 248 * drawn).toBeLessThanOrEqual(320)
  })

  it('includes the Open large spotlight button in the toolbar width calculation', () => {
    loadSelectedPage()
    const { container } = render(
      <LanguageProvider>
        <DndContext>
          <Canvas zoom={100} onSpotlight={() => {}} />
        </DndContext>
      </LanguageProvider>,
    )
    const canvas = container.querySelector('#free-canvas')
    const target = container.querySelector('[data-cid="button"]')
    canvas.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 800, right: 1100, bottom: 850 })
    // Near the right edge at 1:1 scale: 9 buttons (with deselect and Open large) = 278px + 8px margin -> max left 714px (8 buttons would clamp to 744px).
    target.getBoundingClientRect = () => ({ left: 990, top: 250, width: 100, height: 50, right: 1090, bottom: 300 })

    act(() => window.dispatchEvent(new Event('resize')))

    const toolbar = container.querySelector('[data-canvas-selection-actions]')
    expect(toolbar.style.left).toBe('714px')
  })
})
