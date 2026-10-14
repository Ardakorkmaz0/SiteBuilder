// A modal dialog takes the keyboard when it opens. Without it focus stayed on
// the button behind the overlay: Tab walked the page underneath, and a screen
// reader never said a dialog had opened. A field the dialog focuses itself
// (autoFocus, an effect of its own) keeps it.
import { useEffect, useRef } from 'react'

export function useInitialDialogFocus(open) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog || dialog.contains(document.activeElement)) return
    dialog.focus({ preventScroll: true })
  }, [open])
  return ref
}
