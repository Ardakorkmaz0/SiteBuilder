import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useEscapeToClose } from '../../ui/useEscapeToClose.js'

// Shared address-bar editing state for BrowserFrame and MobileBrowserChrome:
// puts Escape on the global stack, skips blur-commit after Cancel, and returns
// focus to the address button when editing ends via Escape.
export function useEditableAddress({ visibleAddress, onAddressChange, onBegin }) {
  const inputRef = useRef(null)
  const buttonRef = useRef(null)
  const refocusBtnRef = useRef(false)
  const skipNextBlurRef = useRef(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const cancel = useCallback(() => {
    skipNextBlurRef.current = true
    refocusBtnRef.current = true
    setEditing(false)
  }, [])

  useEscapeToClose(editing, cancel)

  useEffect(() => {
    if (!editing) return undefined
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [editing, visibleAddress])

  useLayoutEffect(() => {
    if (editing || !refocusBtnRef.current) return
    refocusBtnRef.current = false
    buttonRef.current?.focus({ preventScroll: true })
  }, [editing])

  function begin() {
    onBegin?.()
    skipNextBlurRef.current = false
    setDraft(visibleAddress)
    setEditing(true)
  }

  function commit() {
    if (skipNextBlurRef.current) {
      skipNextBlurRef.current = false
      return
    }
    const next = draft.trim()
    setEditing(false)
    if (next !== visibleAddress) onAddressChange?.(next)
  }

  return { inputRef, buttonRef, editing, draft, setDraft, begin, commit }
}
