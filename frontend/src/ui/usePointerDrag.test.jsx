import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePointerDrag } from './usePointerDrag.js'

function pointer(type, pointerId = 1) {
  const event = new Event(type)
  Object.assign(event, { pointerId })
  return event
}

describe('pointer gesture ownership', () => {
  it('cancels active listeners on unmount and finishes only once', () => {
    const onMove = vi.fn()
    const onEnd = vi.fn()
    const view = renderHook(() => usePointerDrag('page-a', 'pc'))
    act(() => view.result.current({ pointerId: 1 }, { onMove, onEnd }))
    view.unmount()
    window.dispatchEvent(pointer('pointermove'))
    window.dispatchEvent(pointer('pointerup'))
    expect(onMove).not.toHaveBeenCalled()
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onEnd.mock.calls[0][0].type).toBe('pointercancel')
  })

  for (const next of [
    { contextId: 'page-b', coordinateSpace: 'pc' },
    { contextId: 'page-a', coordinateSpace: 'mobile' },
  ]) {
    it(`cancels before changing to ${next.contextId} on ${next.coordinateSpace}`, () => {
      const onMove = vi.fn()
      const onEnd = vi.fn()
      const view = renderHook(({ contextId, coordinateSpace }) => usePointerDrag(contextId, coordinateSpace), {
        initialProps: { contextId: 'page-a', coordinateSpace: 'pc' },
      })
      act(() => view.result.current({ pointerId: 1 }, { onMove, onEnd }))
      view.rerender(next)
      window.dispatchEvent(pointer('pointermove'))
      expect(onMove).not.toHaveBeenCalled()
      expect(onEnd).toHaveBeenCalledTimes(1)
      expect(onEnd.mock.calls[0][0].type).toBe('pointercancel')
    })
  }

  it('keeps a gesture through ordinary re-renders in the same coordinate space', () => {
    const onMove = vi.fn()
    const onEnd = vi.fn()
    const view = renderHook(() => usePointerDrag('page-a', 'pc'))
    act(() => view.result.current({ pointerId: 1 }, { onMove, onEnd }))
    view.rerender()
    window.dispatchEvent(pointer('pointermove'))
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('does not finish a naturally completed gesture again during cleanup', () => {
    const onEnd = vi.fn()
    const view = renderHook(() => usePointerDrag('page-a', 'pc'))
    act(() => view.result.current({ pointerId: 1 }, { onEnd }))
    window.dispatchEvent(pointer('pointerup'))
    view.unmount()
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onEnd.mock.calls[0][0].type).toBe('pointerup')
  })

  it('releases every active pointer owned by the component', () => {
    const first = vi.fn()
    const second = vi.fn()
    const view = renderHook(() => usePointerDrag('page-a', 'pc'))
    act(() => {
      view.result.current({ pointerId: 1 }, { onEnd: first })
      view.result.current({ pointerId: 2 }, { onEnd: second })
    })
    view.unmount()
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })
})
