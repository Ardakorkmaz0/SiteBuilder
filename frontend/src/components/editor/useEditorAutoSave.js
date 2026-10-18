import { useEffect, useRef } from 'react'
import { EDITOR_AUTO_SAVE_DELAY_MS, shouldRunEditorAutoSave } from '../../utils/editorLeave.js'

// When the editor saves by itself. Every save goes through `lifecycleRef`,
// which the editor refreshes on each render, so a listener bound once still
// saves that render's work and reads that render's flags. Four triggers:
//
// - A quiet moment after an edit. Each change to `content` restarts the timer,
//   so typing saves once it pauses, not on every keystroke.
// - A failed automatic save, tried again: the server or the connection is
//   usually back in a moment. Every 5, 10, 20… up to 60 seconds, and at once
//   when the browser says it is online again. Not after a refusal the server
//   will repeat (`refused`), and not once the session has ended.
// - The tab going hidden: switching away, closing or refreshing it.
// - Leaving the editor. The browser's Back button unmounts it with no prompt
//   (the "save before leaving?" dialog only guards the editor's own buttons),
//   and took the pending automatic save with it. Not after the session ended.
//
// The rules for all of them are `shouldRunEditorAutoSave`: not when it is
// switched off, while loading or previewing, with nothing to save, or after
// "leave without saving" (`discardRef`).
export function useEditorAutoSave({
  lifecycleRef,
  discardRef,
  sessionEndedRef,
  sessionMessageRef,
  autoSaveEnabled,
  blocked,
  previewing,
  dirty,
  htmlDirty,
  metaDirty,
  workspaceDirty,
  content,
  autoSaveState,
  refused,
}) {
  const { schema, htmlMap, title, category, tagsText, published } = content
  useEffect(() => {
    if (!shouldRunEditorAutoSave(
      { autoSaveEnabled, loading: blocked, dirty, htmlDirty, metaDirty, workspaceDirty, previewing },
      discardRef.current,
    )) return undefined
    const timer = window.setTimeout(() => {
      const s = lifecycleRef.current
      if (shouldRunEditorAutoSave(s, discardRef.current)) s.save(undefined, { auto: true })
    }, EDITOR_AUTO_SAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [
    lifecycleRef, discardRef,
    autoSaveEnabled, blocked, previewing, dirty, htmlDirty, metaDirty, workspaceDirty,
    schema, htmlMap, title, category, tagsText, published,
  ])

  const retryRef = useRef(0)
  useEffect(() => {
    if (autoSaveState === 'saved') retryRef.current = 0
    if (autoSaveState !== 'error' || !autoSaveEnabled || refused) return undefined
    const attempt = retryRef.current
    const retry = () => {
      // A session that has ended will not come back by itself: asking again
      // only collects the same 401.
      if (sessionMessageRef.current) return
      const s = lifecycleRef.current
      if (!shouldRunEditorAutoSave(s, discardRef.current)) return
      retryRef.current = attempt + 1
      s.save(undefined, { auto: true })
    }
    const timer = window.setTimeout(retry, Math.min(60000, 5000 * 2 ** attempt))
    window.addEventListener('online', retry)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('online', retry)
    }
  }, [lifecycleRef, discardRef, sessionMessageRef, autoSaveState, autoSaveEnabled, refused])

  useEffect(() => {
    if (!autoSaveEnabled) return undefined
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return
      const s = lifecycleRef.current
      if (shouldRunEditorAutoSave(s, discardRef.current)) s.save(undefined, { auto: true })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [lifecycleRef, discardRef, autoSaveEnabled])

  useEffect(() => () => {
    const s = lifecycleRef.current
    if (!sessionEndedRef.current && shouldRunEditorAutoSave(s, discardRef.current)) {
      s.save(undefined, { auto: true })
    }
  }, [lifecycleRef, discardRef, sessionEndedRef])
}
