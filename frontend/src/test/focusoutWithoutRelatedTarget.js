// Chrome sent Tab onto a card's preview button as a focusout with no
// relatedTarget (seen in a real browser on /community); jsdom always names
// where focus went. While this is installed, a focusout reaches the page the
// way Chrome sent it. Returns the uninstall function.
export function focusoutWithoutRelatedTarget(doc = document) {
  const strip = (event) => {
    if (!event.relatedTarget) return
    event.stopImmediatePropagation()
    event.target.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }))
  }
  doc.addEventListener('focusout', strip, true)
  return () => doc.removeEventListener('focusout', strip, true)
}
