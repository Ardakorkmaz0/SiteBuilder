import { useEffect, useRef, useState } from 'react'
import { hasUnsavedEditorChanges, shouldBlockEditorUnload } from '../../utils/editorLeave.js'

// Leaving the editor with unsaved work. Its own ways out (Back, the logo, the
// profile menu) ask first: save and leave, leave without saving, or stay.
// Closing or reloading the tab gets the browser's own warning instead, until a
// leave has been confirmed or a reload allowed (`allowUnload`).
//
// "Leave without saving" also stops automatic saves (`discardRef`): the page
// often turns hidden during navigation, and saving then wrote the very edits
// the person had just discarded.
export function useLeaveGuard({ dirty, htmlDirty, metaDirty, workspaceDirty }) {
  const [promptOpen, setPromptOpen] = useState(false)
  const actionRef = useRef(null)
  const confirmedRef = useRef(false)
  const discardRef = useRef(false)
  const unloadAllowedRef = useRef(false)

  useEffect(() => {
    const unsaved = { dirty, htmlDirty, metaDirty, workspaceDirty }
    if (!hasUnsavedEditorChanges(unsaved)) return undefined
    const handler = (event) => {
      if (unloadAllowedRef.current) return
      if (!shouldBlockEditorUnload(unsaved, confirmedRef.current)) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty, htmlDirty, metaDirty, workspaceDirty])

  function request(action) {
    if (!hasUnsavedEditorChanges({ dirty, htmlDirty, metaDirty, workspaceDirty })) {
      action?.()
      return
    }
    confirmedRef.current = false
    discardRef.current = false
    actionRef.current = action
    setPromptOpen(true)
  }

  function finish({ discard = false } = {}) {
    const action = actionRef.current
    actionRef.current = null
    confirmedRef.current = true
    discardRef.current = discard
    setPromptOpen(false)
    action?.()
  }

  function stay() {
    actionRef.current = null
    confirmedRef.current = false
    discardRef.current = false
    setPromptOpen(false)
  }

  function allowUnload() {
    unloadAllowedRef.current = true
  }

  return { promptOpen, request, finish, stay, allowUnload, discardRef }
}
