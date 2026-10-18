import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { isSiteChanged, useSiteConflict } from './useSiteConflict.js'

const refusal = { response: { status: 409, data: { code: 'site_changed', detail: 'Saved elsewhere.' } } }

describe('isSiteChanged', () => {
  it('recognises only the out-of-date refusal', () => {
    expect(isSiteChanged(refusal)).toBe(true)
    expect(isSiteChanged({ response: { status: 409, data: { code: 'slug_taken' } } })).toBe(false)
    expect(isSiteChanged({ response: { status: 400, data: { code: 'site_changed' } } })).toBe(false)
    expect(isSiteChanged(new Error('Network Error'))).toBe(false)
    expect(isSiteChanged(undefined)).toBe(false)
  })
})

describe('the conflict dialog', () => {
  it('opens on a refusal and closes once a save goes through', () => {
    const { result } = renderHook(() => useSiteConflict())
    expect(result.current.open).toBe(false)
    act(() => result.current.refuse())
    expect(result.current.open).toBe(true)
    act(() => result.current.resolve())
    expect(result.current.open).toBe(false)
  })

  it('keeps the revision the editor works from', () => {
    const { result } = renderHook(() => useSiteConflict())
    expect(result.current.baseRevisionRef.current).toBe(null)
    result.current.baseRevisionRef.current = 4
    expect(result.current.baseRevisionRef.current).toBe(4)
  })
})

describe('"Save mine anyway"', () => {
  it('sends a refused publish again, and closes the dialog first', async () => {
    const { result } = renderHook(() => useSiteConflict())
    act(() => result.current.refuse({ publish: true }))
    const save = vi.fn(async () => ({ revision: 6 }))
    await act(() => result.current.overwrite(save))
    expect(save).toHaveBeenCalledWith(true)
    expect(result.current.open).toBe(false)
  })

  it('does not let a later ordinary refusal forget the publish choice', async () => {
    const { result } = renderHook(() => useSiteConflict())
    act(() => result.current.refuse({ publish: false }))
    act(() => result.current.refuse({ publish: undefined }))
    const save = vi.fn(async () => ({}))
    await act(() => result.current.overwrite(save))
    expect(save).toHaveBeenCalledWith(false)
  })

  it('sends no publish choice after a save went through', async () => {
    const { result } = renderHook(() => useSiteConflict())
    act(() => result.current.refuse({ publish: true }))
    act(() => result.current.resolve())
    act(() => result.current.refuse())
    const save = vi.fn(async () => ({}))
    await act(() => result.current.overwrite(save))
    expect(save).toHaveBeenCalledWith(undefined)
  })
})

describe('a save made for something ("Save and leave")', () => {
  it('does that thing when the save goes through', async () => {
    const { result } = renderHook(() => useSiteConflict())
    const leave = vi.fn()
    await act(() => result.current.saveThen(async () => ({ revision: 5 }), leave))
    expect(leave).toHaveBeenCalledTimes(1)
  })

  it('after a conflict, does it once "Save mine anyway" has saved', async () => {
    const { result } = renderHook(() => useSiteConflict())
    const leave = vi.fn()
    await act(() => result.current.saveThen(async () => {
      result.current.refuse()
      return null
    }, leave))
    expect(leave).not.toHaveBeenCalled()
    await act(() => result.current.overwrite(async () => ({ revision: 6 })))
    expect(leave).toHaveBeenCalledTimes(1)
    // Once only: a later overwrite is not for leaving.
    act(() => result.current.refuse())
    await act(() => result.current.overwrite(async () => ({ revision: 7 })))
    expect(leave).toHaveBeenCalledTimes(1)
  })

  it('does not do it when "Save mine anyway" fails too', async () => {
    const { result } = renderHook(() => useSiteConflict())
    const leave = vi.fn()
    await act(() => result.current.saveThen(async () => {
      result.current.refuse()
      return null
    }, leave))
    await act(() => result.current.overwrite(async () => null))
    expect(leave).not.toHaveBeenCalled()
  })

  it('does not do it after a failure that was not a conflict', async () => {
    const { result } = renderHook(() => useSiteConflict())
    const leave = vi.fn()
    await act(() => result.current.saveThen(async () => null, leave))
    // A conflict from some other save later on is not for leaving.
    act(() => result.current.refuse())
    await act(() => result.current.overwrite(async () => ({ revision: 6 })))
    expect(leave).not.toHaveBeenCalled()
  })
})
