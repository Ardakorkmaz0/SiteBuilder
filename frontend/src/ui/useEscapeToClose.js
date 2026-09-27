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
import { useEffect, useRef } from 'react'

const stack = []

function onKeyDown(event) {
  if (event.key !== 'Escape' || event.isComposing || !stack.length) return
  const close = stack[stack.length - 1].current
  if (!close) return
  event.preventDefault()
  event.stopImmediatePropagation()
  close()
}

export function useEscapeToClose(open, onClose) {
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
}
