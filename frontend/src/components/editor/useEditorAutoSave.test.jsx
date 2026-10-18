import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useEditorAutoSave } from './useEditorAutoSave.js'

const content = { schema: { pages: [] }, htmlMap: {}, title: 'Site', category: 'other', tagsText: '', published: false }

// The editor refreshes this on every render; here the test holds it.
function setup(overrides = {}) {
  const save = vi.fn()
  const lifecycleRef = { current: null }
  const discardRef = { current: false }
  const sessionEndedRef = { current: false }
  const sessionMessageRef = { current: '' }
  const initial = {
    autoSaveEnabled: true, blocked: false, previewing: false,
    dirty: true, htmlDirty: false, metaDirty: false, workspaceDirty: false,
    content, autoSaveState: 'idle', refused: false, ...overrides,
  }
  const sync = (props) => {
    lifecycleRef.current = {
      save, autoSaveEnabled: props.autoSaveEnabled, loading: props.blocked, previewing: props.previewing,
      dirty: props.dirty, htmlDirty: props.htmlDirty, metaDirty: props.metaDirty, workspaceDirty: props.workspaceDirty,
    }
  }
  sync(initial)
  const hook = renderHook((props) => {
    sync(props)
    useEditorAutoSave({ lifecycleRef, discardRef, sessionEndedRef, sessionMessageRef, ...props })
  }, { initialProps: initial })
  return { save, hook, initial, lifecycleRef, discardRef, sessionEndedRef, sessionMessageRef }
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('saving after a quiet moment', () => {
  it('saves once, 2.5 seconds after the last change', () => {
    const { save } = setup()
    act(() => { vi.advanceTimersByTime(2499) })
    expect(save).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(undefined, { auto: true })
    act(() => { vi.advanceTimersByTime(10000) })
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('starts the wait again on each change, so typing saves once it pauses', () => {
    const { save, hook, initial } = setup()
    act(() => { vi.advanceTimersByTime(2000) })
    hook.rerender({ ...initial, content: { ...content, title: 'Site edited' } })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(save).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(500) })
    expect(save).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['switched off', { autoSaveEnabled: false }],
    ['loading, or waiting on a dialog', { blocked: true }],
    ['showing an AI proposal', { previewing: true }],
    ['with nothing to save', { dirty: false }],
  ])('does not save while %s', (_, overrides) => {
    const { save } = setup(overrides)
    act(() => { vi.advanceTimersByTime(60000) })
    expect(save).not.toHaveBeenCalled()
  })

  it('does not save after "leave without saving"', () => {
    const { save, discardRef } = setup()
    discardRef.current = true
    act(() => { vi.advanceTimersByTime(2500) })
    expect(save).not.toHaveBeenCalled()
  })
})

describe('retrying a failed automatic save', () => {
  // The props say nothing is dirty, which keeps the quiet-moment timer out of
  // these tests; the lifecycle the retry reads still has work to save.
  function failed(overrides = {}) {
    const ctx = setup({ dirty: false, autoSaveState: 'error', ...overrides })
    ctx.lifecycleRef.current.dirty = true
    return ctx
  }
  function rerender(ctx, props) {
    ctx.hook.rerender({ ...ctx.initial, ...props })
    ctx.lifecycleRef.current.dirty = true
  }

  it('waits 5 seconds, then 10, then 20', () => {
    const ctx = failed()
    act(() => { vi.advanceTimersByTime(4999) })
    expect(ctx.save).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(ctx.save).toHaveBeenCalledTimes(1)
    expect(ctx.save).toHaveBeenCalledWith(undefined, { auto: true })

    rerender(ctx, { autoSaveState: 'saving' })
    rerender(ctx, { autoSaveState: 'error' })
    act(() => { vi.advanceTimersByTime(9999) })
    expect(ctx.save).toHaveBeenCalledTimes(1)
    act(() => { vi.advanceTimersByTime(1) })
    expect(ctx.save).toHaveBeenCalledTimes(2)

    rerender(ctx, { autoSaveState: 'saving' })
    rerender(ctx, { autoSaveState: 'error' })
    act(() => { vi.advanceTimersByTime(19999) })
    expect(ctx.save).toHaveBeenCalledTimes(2)
    act(() => { vi.advanceTimersByTime(1) })
    expect(ctx.save).toHaveBeenCalledTimes(3)
  })

  it('starts again from 5 seconds once a save succeeds', () => {
    const ctx = failed()
    act(() => { vi.advanceTimersByTime(5000) })
    expect(ctx.save).toHaveBeenCalledTimes(1)
    rerender(ctx, { autoSaveState: 'saved' })
    rerender(ctx, { autoSaveState: 'error' })
    act(() => { vi.advanceTimersByTime(4999) })
    expect(ctx.save).toHaveBeenCalledTimes(1)
    act(() => { vi.advanceTimersByTime(1) })
    expect(ctx.save).toHaveBeenCalledTimes(2)
  })

  it('never waits more than a minute', () => {
    const ctx = failed()
    for (let attempt = 0; attempt < 6; attempt += 1) {
      act(() => { vi.advanceTimersByTime(60000) })
      rerender(ctx, { autoSaveState: 'saving' })
      rerender(ctx, { autoSaveState: 'error' })
    }
    // Seven failures in: 5000 * 2 ** 7 would be over ten minutes.
    const before = ctx.save.mock.calls.length
    act(() => { vi.advanceTimersByTime(60000) })
    expect(ctx.save.mock.calls.length).toBe(before + 1)
  })

  it('tries at once when the browser is back online', () => {
    const ctx = failed()
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(ctx.save).toHaveBeenCalledTimes(1)
  })

  it('does not ask again after a refusal the server will repeat', () => {
    const ctx = failed({ refused: true })
    act(() => { vi.advanceTimersByTime(60000) })
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('does not ask again once the session has ended', () => {
    const ctx = failed()
    ctx.sessionMessageRef.current = 'Your session expired.'
    act(() => { vi.advanceTimersByTime(60000) })
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(ctx.save).not.toHaveBeenCalled()
  })
})

describe('saving at the edges', () => {
  function setVisibility(value) {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value })
    document.dispatchEvent(new Event('visibilitychange'))
  }
  afterEach(() => { delete document.visibilityState })

  it('saves when the tab is hidden, not when it comes back', () => {
    const { save } = setup()
    act(() => { setVisibility('visible') })
    expect(save).not.toHaveBeenCalled()
    act(() => { setVisibility('hidden') })
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('saves on the way out of the editor', () => {
    const { save, hook } = setup()
    hook.unmount()
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(undefined, { auto: true })
  })

  it('does not save on the way out once the session has ended', () => {
    const { save, hook, sessionEndedRef } = setup()
    sessionEndedRef.current = true
    hook.unmount()
    expect(save).not.toHaveBeenCalled()
  })
})
