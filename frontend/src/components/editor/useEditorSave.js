import { useRef, useState } from 'react'
import { apiError } from '../../utils/errors.js'
import { createSaveQueue } from '../../utils/saveQueue.js'
import { isSiteChanged } from './useSiteConflict.js'

// How the editor's saves run and report, apart from what they write (the
// editor's `performSave`, read from `lifecycleRef` when a save's turn comes).
//
// - Every server write goes through one queue. A save waits behind the one in
//   flight instead of racing it, and runs the latest render's performSave, so
//   a slow request cannot overwrite newer work. History loads use the same
//   queue (`run`).
// - A manual save shows "Saving…" (`saving`) until the last one finishes, and
//   clears the error bar when it starts.
// - `autoSaveState` ('idle' | 'saving' | 'saved' | 'error') drives the header
//   status; performSave sets 'saving' and 'saved', a failure sets 'error'.
// - Failures: a conflict opens its dialog; an automatic save the server
//   refused for good (over the size limit, a value it will not take) shows
//   why and is not retried (`refused`); a manual save shows the server's
//   reason, or why the session ended.
export function useEditorSave({ lifecycleRef, discardRef, conflict, sessionMessageRef, onError }) {
  const [queue] = useState(createSaveQueue)
  const manualCountRef = useRef(0)
  const [saving, setSaving] = useState(false)
  const [autoSaveState, setAutoSaveState] = useState('idle')
  const [refused, setRefused] = useState(false)

  async function save(nextPublished, { auto = false, versionSource, force = false } = {}) {
    if (!auto) {
      manualCountRef.current += 1
      setSaving(true)
      onError('')
    }
    try {
      return await queue.run(() => {
        // This automatic save may have waited behind one in flight, and a
        // "leave without saving" since then cancels it.
        if (auto && discardRef.current) return null
        return lifecycleRef.current.performSave(nextPublished, { auto, versionSource, force })
      })
    } catch (e) {
      setAutoSaveState('error')
      if (isSiteChanged(e)) {
        // Nothing was written; the dialog says why and lets the person choose.
        conflict.refuse({ publish: nextPublished })
        return null
      }
      const status = e?.response?.status
      if (auto && !sessionMessageRef.current && status >= 400 && status < 500 && ![401, 408, 429].includes(status)) {
        setRefused(true)
        onError(apiError(e))
        return null
      }
      if (!auto) onError(sessionMessageRef.current || apiError(e))
      return null
    } finally {
      if (!auto) {
        manualCountRef.current = Math.max(0, manualCountRef.current - 1)
        if (manualCountRef.current === 0) setSaving(false)
      }
    }
  }

  return { save, run: queue.run, saving, autoSaveState, setAutoSaveState, refused, setRefused }
}
