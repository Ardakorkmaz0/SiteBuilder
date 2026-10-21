// A button that sends a request is disabled until the answer comes, and often
// comes back as its opposite ("Mark read" becomes "Mark unread"); a Remove
// button takes its own row away. The browser takes focus off a control the
// moment it is disabled or removed, so a keyboard user who pressed it was
// dropped at the top of the page, even out of an open dialog.
//
// This watches for exactly that, a focused control disabled or removed, and
// gives the keyboard back: to the control when it is enabled again, or to the
// first control in the closest part of the page that is still there (where the
// replacement stands). Where the control stood is noted when it takes focus,
// since by the time it is removed its parents may be gone with it.
//
// Focus a person moved on purpose is left alone: anything focused in the
// meantime ends the rescue, and leaving a control that is still usable (a
// click on the page background) forgets it, so a later update of that control
// cannot pull focus back to it.
//
// A control that took the person to another page (a header tab) goes with the
// page it was on. That is not rescued: the new page starts fresh, as a load
// does. Handing focus to its first control put "Skip to content" on screen
// after every click on a tab.

const FOCUSABLE = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(', ')

// Drawn and reachable: not hidden by itself or by any part of the page above it,
// and not drawn only for screen readers (a skip link shows itself on focus).
function shown(element, doc) {
  if (element.disabled) return false
  if (element.closest('[hidden], [inert], [aria-hidden="true"], .sr-only')) return false
  if (getComputedStyle(element).visibility === 'hidden') return false
  for (let node = element; node && node !== doc.body; node = node.parentElement) {
    if (getComputedStyle(node).display === 'none') return false
  }
  return true
}

function ancestorsOf(element, doc) {
  const around = []
  for (let node = element.parentElement; node && node !== doc.body; node = node.parentElement) around.push(node)
  return around
}

export function installFocusRescue(doc = document) {
  // The control focus last went to, and the parts of the page it stood in.
  let last = null
  let around = []
  let page = ''
  let lost = null
  const pathname = () => doc.location?.pathname ?? ''

  const onFocusIn = (event) => {
    last = event.target
    around = ancestorsOf(last, doc)
    page = pathname()
    lost = null
  }

  // Focus leaving to nowhere. Decided once the current task is done: a control
  // that is still connected and enabled then was left on purpose; one that was
  // disabled or removed in the same task was taken away by the page.
  const onFocusOut = (event) => {
    const control = event.target
    if (event.relatedTarget || control !== last) return
    queueMicrotask(() => {
      if (last !== control || doc.activeElement === control) return
      if (control.isConnected && !control.disabled) {
        last = null
        around = []
      }
    })
  }

  const focusLost = () => {
    const active = doc.activeElement
    return !active || active === doc.body || !active.isConnected
  }

  const give = (element) => {
    element.focus({ preventScroll: true })
    if (doc.activeElement === element) lost = null
  }

  const observer = new MutationObserver(() => {
    // Noted when the control is disabled or removed, which can be before the
    // browser actually takes focus away (Chrome does that at the next paint).
    if (!lost && last && (last.disabled || !last.isConnected)) lost = { control: last, around, page }
    if (!lost) return
    if (lost.page !== pathname()) {
      lost = null
      last = null
      around = []
      return
    }
    const { control } = lost
    if (!focusLost()) {
      // The browser left focus where it was (Firefox): nothing to give back.
      if (control.isConnected && !control.disabled) lost = null
      return
    }
    if (control.isConnected) {
      if (control.disabled) return // wait for it to come back
      if (shown(control, doc)) {
        give(control)
        return
      }
    }
    for (const area of lost.around) {
      if (!area.isConnected) continue
      const next = [...area.querySelectorAll(FOCUSABLE)].find((element) => shown(element, doc))
      if (next) {
        give(next)
        return
      }
    }
  })

  doc.addEventListener('focusin', onFocusIn, true)
  doc.addEventListener('focusout', onFocusOut, true)
  observer.observe(doc.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'] })
  return () => {
    observer.disconnect()
    doc.removeEventListener('focusin', onFocusIn, true)
    doc.removeEventListener('focusout', onFocusOut, true)
  }
}
