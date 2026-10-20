// A button that sends a request is disabled until the answer comes, and often
// comes back as its opposite ("Mark read" becomes "Mark unread"). The browser
// takes focus off a control the moment it is disabled, so a keyboard user who
// pressed it was dropped at the top of the page, even out of an open dialog.
//
// This watches for exactly that, a focused control disabled or removed, and
// gives the keyboard back: to the control when it is enabled again, or to the
// first control in the closest part of the page that is still there (where the
// replacement stands). Focus a person moved on purpose is left alone: anything
// focused in the meantime ends the rescue, and leaving an enabled control (a
// click on the page background) never starts one.

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Drawn and reachable: not hidden by itself or by a part of the page around it.
function shown(element, area) {
  if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false
  for (let node = element; node && node !== area.parentElement; node = node.parentElement) {
    const style = getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden') return false
  }
  return true
}

export function installFocusRescue(doc = document) {
  let last = null
  let lost = null

  const onFocusIn = (event) => {
    last = event.target
    lost = null
  }

  const focusLost = () => {
    const active = doc.activeElement
    return !active || active === doc.body || !active.isConnected
  }

  const observer = new MutationObserver(() => {
    // Noted when the control is disabled or removed, which can be before the
    // browser actually takes focus away (Chrome does that at the next paint).
    if (!lost && last && (last.disabled || !last.isConnected)) {
      // The control and the parts of the page it stood in, closest first.
      const around = []
      for (let node = last.parentElement; node && node !== doc.body; node = node.parentElement) around.push(node)
      lost = { control: last, around }
    }
    if (!lost) return
    const { control, around } = lost
    if (!focusLost()) {
      // The browser left focus where it was (Firefox): nothing to give back.
      if (control.isConnected && !control.disabled) lost = null
      return
    }
    if (control.isConnected) {
      if (!control.disabled) {
        lost = null
        control.focus({ preventScroll: true })
      }
      return
    }
    for (const area of around) {
      if (!area.isConnected) continue
      const next = [...area.querySelectorAll(FOCUSABLE)].find((element) => shown(element, area))
      if (next) {
        lost = null
        next.focus({ preventScroll: true })
        return
      }
    }
  })

  doc.addEventListener('focusin', onFocusIn, true)
  observer.observe(doc.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'] })
  return () => {
    observer.disconnect()
    doc.removeEventListener('focusin', onFocusIn, true)
  }
}
