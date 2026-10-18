import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useMediaQuery } from './useMediaQuery.js'

let media
let events
beforeEach(() => {
  events = []
  const listeners = new Set()
  media = {
    matches: false, listeners,
    addEventListener: (name, listener) => listeners.add(listener),
    removeEventListener: (name, listener) => listeners.delete(listener),
  }
  vi.spyOn(window, 'matchMedia').mockImplementation(() => {
    events.push('snapshot')
    return media
  })
})
afterEach(() => vi.restoreAllMocks())

describe('media query transitions', () => {
  it('preserves the old surface before notifying React about a changed viewport', () => {
    const beforeChange = vi.fn(() => events.push('preserve'))
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)', beforeChange))
    events.length = 0
    act(() => {
      media.matches = true
      for (const listener of [...media.listeners]) listener({ matches: true })
    })
    expect(beforeChange).toHaveBeenCalledTimes(1)
    expect(events[0]).toBe('preserve')
    expect(events.slice(1)).toContain('snapshot')
    expect(result.current).toBe(true)
  })

  it('uses the current handoff callback and removes its listener on unmount', () => {
    const previous = vi.fn()
    const current = vi.fn()
    const view = renderHook(({ beforeChange }) => useMediaQuery('(max-width: 767px)', beforeChange), {
      initialProps: { beforeChange: previous },
    })
    view.rerender({ beforeChange: current })
    expect(media.listeners.size).toBe(1)
    act(() => {
      media.matches = true
      for (const listener of [...media.listeners]) listener({ matches: true })
    })
    expect(previous).not.toHaveBeenCalled()
    expect(current).toHaveBeenCalledTimes(1)
    view.unmount()
    expect(media.listeners.size).toBe(0)
  })
})
