import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useEditorSave } from './useEditorSave.js'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function setup() {
  const lifecycleRef = { current: { performSave: vi.fn(async () => ({ revision: 1 })) } }
  const discardRef = { current: false }
  const sessionMessageRef = { current: '' }
  const conflict = { refuse: vi.fn() }
  // The error bar, as the editor's setError keeps it: a value or an update.
  const bar = { text: '' }
  const onError = vi.fn((value) => { bar.text = typeof value === 'function' ? value(bar.text) : value })
  const view = renderHook(() => useEditorSave({ lifecycleRef, discardRef, conflict, sessionMessageRef, onError }))
  return { ...view, lifecycleRef, discardRef, sessionMessageRef, conflict, onError, bar }
}

const failure = (status, data = {}) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } })

beforeEach(() => { localStorage.setItem('pwb_language', 'en') })

describe('the save queue', () => {
  it('runs saves one at a time, in the order they were asked for', async () => {
    const ctx = setup()
    const first = deferred()
    const order = []
    ctx.lifecycleRef.current.performSave = vi.fn((published) => {
      order.push(published)
      return published === true ? first.promise : Promise.resolve({})
    })
    let a, b
    act(() => {
      a = ctx.result.current.save(true)
      b = ctx.result.current.save(false)
    })
    await act(async () => { await Promise.resolve() })
    expect(order).toEqual([true])
    await act(async () => { first.resolve({ revision: 2 }); await a; await b })
    expect(order).toEqual([true, false])
  })

  it('runs the latest performSave when its turn comes, not the one there was when asked', async () => {
    const ctx = setup()
    const first = deferred()
    const older = vi.fn(() => first.promise)
    const newer = vi.fn(async () => ({ revision: 3 }))
    ctx.lifecycleRef.current.performSave = older
    let a, b
    act(() => {
      a = ctx.result.current.save()
      b = ctx.result.current.save()
    })
    // The first save is under way with the older function; then a render
    // brings a newer one, before the second save's turn.
    await act(async () => { await Promise.resolve() })
    expect(older).toHaveBeenCalledTimes(1)
    ctx.lifecycleRef.current.performSave = newer
    await act(async () => { first.resolve({}); await a; await b })
    expect(older).toHaveBeenCalledTimes(1)
    expect(newer).toHaveBeenCalledTimes(1)
  })

  it('passes what the save is for', async () => {
    const ctx = setup()
    await act(() => ctx.result.current.save(true, { auto: true, versionSource: 'checkpoint', force: true }))
    expect(ctx.lifecycleRef.current.performSave).toHaveBeenCalledWith(true, { auto: true, versionSource: 'checkpoint', force: true })
  })

  it('lets a history load wait its turn in the same queue', async () => {
    const ctx = setup()
    const first = deferred()
    ctx.lifecycleRef.current.performSave = vi.fn(() => first.promise)
    const load = vi.fn(async () => 'loaded')
    let a, b
    act(() => {
      a = ctx.result.current.save()
      b = ctx.result.current.run(load)
    })
    await act(async () => { await Promise.resolve() })
    expect(load).not.toHaveBeenCalled()
    await act(async () => { first.resolve({}); await a })
    await expect(b).resolves.toBe('loaded')
  })

  it('drops an automatic save that waited behind another after "leave without saving"', async () => {
    const ctx = setup()
    const first = deferred()
    ctx.lifecycleRef.current.performSave = vi.fn(() => first.promise)
    let a, b
    act(() => {
      a = ctx.result.current.save()
      b = ctx.result.current.save(undefined, { auto: true })
    })
    ctx.discardRef.current = true
    await act(async () => { first.resolve({}); await a })
    await expect(b).resolves.toBe(null)
    expect(ctx.lifecycleRef.current.performSave).toHaveBeenCalledTimes(1)
  })
})

describe('"Saving…"', () => {
  it('shows for a manual save until the last one finishes, and clears the error bar', async () => {
    const ctx = setup()
    const first = deferred()
    const second = deferred()
    ctx.lifecycleRef.current.performSave = vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    let a, b
    act(() => {
      a = ctx.result.current.save()
      b = ctx.result.current.save()
    })
    expect(ctx.result.current.saving).toBe(true)
    expect(ctx.onError).toHaveBeenCalledWith('')
    await act(async () => { first.resolve({}); await a })
    expect(ctx.result.current.saving).toBe(true)
    await act(async () => { second.resolve({}); await b })
    expect(ctx.result.current.saving).toBe(false)
  })

  it('does not show for an automatic save, which leaves the error bar alone', async () => {
    const ctx = setup()
    const first = deferred()
    ctx.lifecycleRef.current.performSave = vi.fn(() => first.promise)
    let a
    act(() => { a = ctx.result.current.save(undefined, { auto: true }) })
    expect(ctx.result.current.saving).toBe(false)
    expect(ctx.onError).not.toHaveBeenCalled()
    await act(async () => { first.resolve({}); await a })
  })
})

describe('a save that fails', () => {
  it('opens the conflict dialog for a save made from an older revision, with its publish choice', async () => {
    const ctx = setup()
    ctx.lifecycleRef.current.performSave = vi.fn(async () => { throw failure(409, { code: 'site_changed' }) })
    let result
    await act(async () => { result = await ctx.result.current.save(false) })
    expect(result).toBe(null)
    expect(ctx.conflict.refuse).toHaveBeenCalledWith({ publish: false })
    expect(ctx.result.current.autoSaveState).toBe('error')
    expect(ctx.onError).toHaveBeenCalledTimes(1)
    expect(ctx.onError).toHaveBeenLastCalledWith('')
  })

  it('shows why the server refused an automatic save for good, and marks it not to retry', async () => {
    const ctx = setup()
    ctx.lifecycleRef.current.performSave = vi.fn(async () => { throw failure(413, { detail: 'Too big to keep.' }) })
    await act(() => ctx.result.current.save(undefined, { auto: true }))
    expect(ctx.result.current.refused).toBe(true)
    expect(ctx.result.current.autoSaveState).toBe('error')
    expect(ctx.onError).toHaveBeenCalledWith('Too big to keep.')
  })

  it('takes the refusal off the error bar once a save goes through', async () => {
    const ctx = setup()
    ctx.lifecycleRef.current.performSave = vi.fn()
      .mockRejectedValueOnce(failure(413, { detail: 'Too big to keep.' }))
      .mockResolvedValueOnce({ revision: 2 })
    await act(() => ctx.result.current.save(undefined, { auto: true }))
    expect(ctx.bar.text).toBe('Too big to keep.')
    await act(() => ctx.result.current.save(undefined, { auto: true }))
    expect(ctx.bar.text).toBe('')
    expect(ctx.result.current.refused).toBe(false)
  })

  it('takes off only the refusal: a message the successful save put up stays', async () => {
    const ctx = setup()
    const automatic = deferred()
    const manual = deferred()
    ctx.lifecycleRef.current.performSave = vi.fn()
      .mockImplementationOnce(() => automatic.promise)
      .mockImplementationOnce(async () => {
        await manual.promise
        // The editor's performSave: the server took it, the linked file did not.
        ctx.onError('Saved to the server, but writing index.html failed: denied')
        return { revision: 2 }
      })
    let a, b
    act(() => { a = ctx.result.current.save(undefined, { auto: true }) })
    await act(async () => { await Promise.resolve() })
    // Save is pressed while the automatic save is still out; the server then
    // refuses the automatic one, and takes the manual one.
    act(() => { b = ctx.result.current.save() })
    await act(async () => { automatic.reject(failure(413, { detail: 'Too big to keep.' })); await a })
    expect(ctx.bar.text).toBe('Too big to keep.')
    await act(async () => { manual.resolve(); await b })
    expect(ctx.bar.text).toBe('Saved to the server, but writing index.html failed: denied')
    expect(ctx.result.current.refused).toBe(false)
  })

  it('leaves the error bar alone when an automatic save goes through after no refusal', async () => {
    const ctx = setup()
    await act(() => ctx.result.current.save(undefined, { auto: true }))
    expect(ctx.onError).not.toHaveBeenCalled()
  })

  it.each([401, 408, 429, 500])('keeps retrying an automatic save after a %i', async (status) => {
    const ctx = setup()
    ctx.lifecycleRef.current.performSave = vi.fn(async () => { throw failure(status) })
    await act(() => ctx.result.current.save(undefined, { auto: true }))
    expect(ctx.result.current.refused).toBe(false)
    expect(ctx.result.current.autoSaveState).toBe('error')
    expect(ctx.onError).not.toHaveBeenCalled()
  })

  it('does not mark an automatic save refused once the session has ended', async () => {
    const ctx = setup()
    ctx.sessionMessageRef.current = 'Your guest session expired.'
    ctx.lifecycleRef.current.performSave = vi.fn(async () => { throw failure(403, { detail: 'Gone.' }) })
    await act(() => ctx.result.current.save(undefined, { auto: true }))
    expect(ctx.result.current.refused).toBe(false)
  })

  it('shows a manual save the server reason, or why the session ended', async () => {
    const ctx = setup()
    ctx.lifecycleRef.current.performSave = vi.fn(async () => { throw failure(400, { detail: 'Title is required.' }) })
    await act(() => ctx.result.current.save())
    expect(ctx.onError).toHaveBeenLastCalledWith('Title is required.')

    ctx.sessionMessageRef.current = 'Your guest session expired.'
    await act(() => ctx.result.current.save())
    expect(ctx.onError).toHaveBeenLastCalledWith('Your guest session expired.')
    expect(ctx.result.current.saving).toBe(false)
  })
})
