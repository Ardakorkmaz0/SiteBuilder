import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useLeaveGuard } from './useLeaveGuard.js'

const clean = { dirty: false, htmlDirty: false, metaDirty: false, workspaceDirty: false }

function render(state = clean) {
  return renderHook((props) => useLeaveGuard(props), { initialProps: state })
}

// What the browser does when the tab is closed: the page blocks it by
// cancelling the event.
function closeTab() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

describe('leaving through the editor', () => {
  it('leaves at once when nothing is unsaved', () => {
    const { result } = render()
    const action = vi.fn()
    act(() => result.current.request(action))
    expect(action).toHaveBeenCalledTimes(1)
    expect(result.current.promptOpen).toBe(false)
  })

  it.each(['dirty', 'htmlDirty', 'metaDirty', 'workspaceDirty'])('asks first when %s', (flag) => {
    const { result } = render({ ...clean, [flag]: true })
    const action = vi.fn()
    act(() => result.current.request(action))
    expect(action).not.toHaveBeenCalled()
    expect(result.current.promptOpen).toBe(true)
  })

  it('"Save and leave" goes where the person asked, once', () => {
    const { result } = render({ ...clean, dirty: true })
    const action = vi.fn()
    act(() => result.current.request(action))
    act(() => result.current.finish())
    expect(action).toHaveBeenCalledTimes(1)
    expect(result.current.promptOpen).toBe(false)
    expect(result.current.discardRef.current).toBe(false)
    act(() => result.current.finish())
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('"Leave without saving" stops automatic saves', () => {
    const { result } = render({ ...clean, dirty: true })
    act(() => result.current.request(() => {}))
    act(() => result.current.finish({ discard: true }))
    expect(result.current.discardRef.current).toBe(true)
  })

  it('"Stay" drops the way out, and asking again starts afresh', () => {
    const { result } = render({ ...clean, dirty: true })
    const action = vi.fn()
    act(() => result.current.request(action))
    act(() => result.current.stay())
    expect(result.current.promptOpen).toBe(false)
    act(() => result.current.finish())
    expect(action).not.toHaveBeenCalled()

    act(() => result.current.request(() => {}))
    act(() => result.current.finish({ discard: true }))
    act(() => result.current.request(() => {}))
    expect(result.current.discardRef.current).toBe(false)
  })
})

describe('closing or reloading the tab', () => {
  it('is blocked while something is unsaved, and only then', () => {
    const view = render({ ...clean, metaDirty: true })
    expect(closeTab()).toBe(true)
    view.rerender(clean)
    expect(closeTab()).toBe(false)
    view.unmount()
  })

  it('is let through once a leave was confirmed', () => {
    const view = render({ ...clean, dirty: true })
    act(() => view.result.current.request(() => {}))
    expect(closeTab()).toBe(true)
    act(() => view.result.current.finish())
    expect(closeTab()).toBe(false)
    view.unmount()
  })

  it('is let through for a reload the editor asked for', () => {
    const view = render({ ...clean, htmlDirty: true })
    act(() => view.result.current.allowUnload())
    expect(closeTab()).toBe(false)
    view.unmount()
  })

  it('stops guarding when the editor goes away', () => {
    const view = render({ ...clean, dirty: true })
    view.unmount()
    expect(closeTab()).toBe(false)
  })
})
