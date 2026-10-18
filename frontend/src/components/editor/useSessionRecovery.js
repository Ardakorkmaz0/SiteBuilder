import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLanguage } from '../../i18n/useLanguage.js'
import { clearEditorRecovery, SESSION_EXPIRED_EVENT, writeEditorRecovery } from '../../utils/editorRecovery.js'

// A session that ends while the editor is open: signed out everywhere, a
// password reset, a revoked guest. Only the account that made a draft can
// recover it (utils/editorRecovery.js).
//
// - The unsaved work (`captureProject()`, null when there is none) is kept as
//   a local draft for this account and site. The app then signs out, and the
//   editor offers the draft when the account opens the site again (`offer`
//   from the load, `draft` while it waits for an answer).
// - When the draft cannot be stored (quota, private browsing), or for a guest,
//   who has no credentials to come back with, the editor stays open instead:
//   it says why (`onLost`) and offers the project download (`lost`). Signing
//   out there would take the work with it.
// - `endedRef`: the session is over, so leaving the editor sends no save.
// - `messageRef`: why saves fail from now on; they are not retried.
export function useSessionRecovery({ ownerId, siteId, isGuest, captureProject, onLost }) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState(null)
  const [lost, setLost] = useState(false)
  const restoredIdRef = useRef(null)
  const endedRef = useRef(false)
  const messageRef = useRef('')

  const captureRef = useRef(null)
  useLayoutEffect(() => {
    captureRef.current = (event) => {
      // A draft is already waiting for an answer: it is the work to keep.
      if (draft) return
      const project = captureProject()
      if (!project) return
      const written = writeEditorRecovery(ownerId, siteId, project)
      const message = !written
        ? t('Your session expired and the local draft could not be saved. Download your project before signing in again.')
        : isGuest
          ? t('Your guest session expired. Download your project before starting a new session.')
          : ''
      if (!message) return
      event.preventDefault()
      messageRef.current = message
      onLost(message)
      setLost(true)
    }
  })
  useEffect(() => {
    const capture = (event) => {
      captureRef.current?.(event)
      if (!event.defaultPrevented) endedRef.current = true
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, capture)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, capture)
  }, [])

  // The offered draft was put back on screen. It stays stored until a save
  // holds everything it had (`clearRestored`).
  function restored() {
    restoredIdRef.current = draft?.id ?? null
    setDraft(null)
  }

  // "Keep server version": the draft is gone for good.
  function discard() {
    clearEditorRecovery(ownerId, siteId, draft?.id)
    setDraft(null)
  }

  function clearRestored() {
    clearEditorRecovery(ownerId, siteId, restoredIdRef.current)
    restoredIdRef.current = null
  }

  return { draft, offer: setDraft, lost, endedRef, messageRef, restored, discard, clearRestored }
}
