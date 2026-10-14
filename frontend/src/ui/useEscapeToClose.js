// Esc closes the dialog on top, and only that one.
//
// Most editor dialogs had no Esc at all: the AI wizard, which opens by itself
// on every new site, could only be left by finding its ✕ or Cancel. Each open
// dialog now registers here, and one listener hands Esc to the newest. Two
// dialogs listening on their own would both close on one press (a template
// preview and the gallery under it); a stack closes the preview first.
//
// The listener runs in the capture phase and stops the event, so the editor's
// own Esc shortcuts (clearing a selection, cancelling a placement) do not also
// fire behind the dialog.
//
// Closing also hands the keyboard back. The element that had focus when the
// dialog opened (the "Code" button, a template card) gets it again; without
// that, focus fell to the top of the page and a keyboard user started over.
// A dialog opened from a menu item outlives the item (the menu closes), so
// the button that opened the menu takes its place.
import { useEffect, useRef, useState } from 'react'

const stack = []

function onKeyDown(event) {
  if (event.key !== 'Escape' || event.isComposing || !stack.length) return
  const close = stack[stack.length - 1].current
  if (!close) return
  event.preventDefault()
  event.stopImmediatePropagation()
  close()
}

// What had focus lately, newest last: where a menu item's menu button is.
const recentFocus = []
const RECENT_FOCUS = 4
// Only controls stand in for a lost opener. Focusing a field nobody chose
// would put a ring on it, and on a phone open the keyboard.
const STAND_IN = 'button, a[href], [role="button"], summary'

if (typeof document !== 'undefined') {
  document.addEventListener('focusin', (event) => {
    if (recentFocus[recentFocus.length - 1] === event.target) return
    recentFocus.push(event.target)
    if (recentFocus.length > RECENT_FOCUS) recentFocus.shift()
  }, true)
}

// Read while rendering the open dialog, before it mounts: a field in it that
// takes focus on mount has already taken it by the time an effect runs.
// Nothing focused (a tap on a phone does not focus a button): nothing to
// give back.
function openersNow() {
  if (typeof document === 'undefined') return null
  const active = document.activeElement
  if (!active || active === document.body) return null
  const standIns = recentFocus.filter((element) => element !== active && element.matches?.(STAND_IN))
  return [active, ...standIns.reverse()]
}

function focusWasLost() {
  const active = document.activeElement
  return !active || active === document.body || !active.isConnected
}

export function useEscapeToClose(open, onClose) {
  const [openers, setOpeners] = useState(() => (open ? openersNow() : null))
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    setOpeners(open ? openersNow() : null)
  }
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  useEffect(() => {
    if (!open) return undefined
    stack.push(closeRef)
    if (stack.length === 1) document.addEventListener('keydown', onKeyDown, true)
    return () => {
      const index = stack.lastIndexOf(closeRef)
      if (index !== -1) stack.splice(index, 1)
      if (!stack.length) document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])
  useEffect(() => {
    if (!open || !openers) return undefined
    return () => {
      // Only when focus went down with the dialog: a close that moved focus
      // on purpose (into a field, onto another page) is left alone.
      if (!focusWasLost()) return
      openers.find((element) => element.isConnected)?.focus({ preventScroll: true })
    }
  }, [open, openers])
}
