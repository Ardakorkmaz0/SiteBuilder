import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { readEditorRecovery, SESSION_EXPIRED_EVENT, writeEditorRecovery } from '../../utils/editorRecovery.js'
import { useSessionRecovery } from './useSessionRecovery.js'

const project = {
  schema: { pages: [{ id: 'home', name: 'Home', components: [] }] },
  title: 'Unsaved title', category: 'other', tagsText: '', currentPageId: 'home', codeDrafts: {},
}

function render({ isGuest = false, captureProject = () => project } = {}) {
  const onLost = vi.fn()
  const capture = vi.fn(captureProject)
  const view = renderHook(
    () => useSessionRecovery({ ownerId: 7, siteId: 1, isGuest, captureProject: capture, onLost }),
    { wrapper: LanguageProvider },
  )
  return { ...view, onLost, capture }
}

// What the API client does when a request comes back 401 for the current
// token: it asks first, and signs out unless something cancels the event.
function expireSession() {
  const event = new Event(SESSION_EXPIRED_EVENT, { cancelable: true })
  act(() => { window.dispatchEvent(event) })
  return event.defaultPrevented
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('pwb_language', 'en')
})
afterEach(() => { vi.restoreAllMocks() })

describe('when the session ends', () => {
  it('keeps the unsaved work for this account and site, and lets the sign-out go ahead', () => {
    const { result, onLost } = render()
    expect(expireSession()).toBe(false)
    expect(readEditorRecovery(7, 1)?.title).toBe('Unsaved title')
    expect(readEditorRecovery(8, 1)).toBe(null)
    expect(result.current.endedRef.current).toBe(true)
    expect(result.current.lost).toBe(false)
    expect(onLost).not.toHaveBeenCalled()
  })

  it('stores nothing when nothing is unsaved', () => {
    const { result } = render({ captureProject: () => null })
    expect(expireSession()).toBe(false)
    expect(readEditorRecovery(7, 1)).toBe(null)
    expect(result.current.endedRef.current).toBe(true)
  })

  it('keeps a guest in the editor: there is no account to come back with', () => {
    const { result, onLost } = render({ isGuest: true })
    expect(expireSession()).toBe(true)
    expect(readEditorRecovery(7, 1)?.title).toBe('Unsaved title')
    expect(result.current.lost).toBe(true)
    expect(result.current.endedRef.current).toBe(false)
    expect(result.current.messageRef.current).toBe('Your guest session expired. Download your project before starting a new session.')
    expect(onLost).toHaveBeenCalledWith('Your guest session expired. Download your project before starting a new session.')
  })

  it('keeps the editor open when the draft cannot be stored', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError') })
    const { result, onLost } = render()
    expect(expireSession()).toBe(true)
    expect(result.current.lost).toBe(true)
    expect(result.current.endedRef.current).toBe(false)
    expect(onLost).toHaveBeenCalledWith('Your session expired and the local draft could not be saved. Download your project before signing in again.')
  })

  it('leaves an offered draft alone while it waits for an answer', () => {
    const offered = writeEditorRecovery(7, 1, { ...project, title: 'Offered draft' })
    const { result, capture } = render()
    act(() => result.current.offer(offered))
    expect(expireSession()).toBe(false)
    expect(capture).not.toHaveBeenCalled()
    expect(readEditorRecovery(7, 1)?.title).toBe('Offered draft')
  })

  it('stops listening when the editor goes away', () => {
    const { unmount, capture } = render()
    unmount()
    expireSession()
    expect(capture).not.toHaveBeenCalled()
  })
})

describe('the draft offered on opening', () => {
  it('"Keep server version" deletes it', () => {
    const offered = writeEditorRecovery(7, 1, project)
    const { result } = render()
    act(() => result.current.offer(offered))
    expect(result.current.draft?.id).toBe(offered.id)
    act(() => result.current.discard())
    expect(result.current.draft).toBe(null)
    expect(readEditorRecovery(7, 1)).toBe(null)
  })

  it('a restored draft stays stored until a save holds everything it had', () => {
    const offered = writeEditorRecovery(7, 1, project)
    const { result } = render()
    act(() => result.current.offer(offered))
    act(() => result.current.restored())
    expect(result.current.draft).toBe(null)
    expect(readEditorRecovery(7, 1)?.id).toBe(offered.id)
    act(() => result.current.clearRestored())
    expect(readEditorRecovery(7, 1)).toBe(null)
  })

  it('clearing the restored draft spares a newer one', () => {
    const offered = writeEditorRecovery(7, 1, project)
    const { result } = render()
    act(() => result.current.offer(offered))
    act(() => result.current.restored())
    const newer = writeEditorRecovery(7, 1, { ...project, title: 'Newer' })
    act(() => result.current.clearRestored())
    expect(readEditorRecovery(7, 1)?.id).toBe(newer.id)
  })
})
