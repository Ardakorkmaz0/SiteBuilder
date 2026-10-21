// A card's ⋯ menu closes when the keyboard moves on past it. The focusout's
// relatedTarget cannot say where focus went: Chrome leaves it empty when Tab
// lands on a button that holds a preview frame, and the menu stayed open over
// the next card. Where focus landed is known once the focus change is done.
//
// Focus that fell to the page itself is no reason to close: Safari does not
// focus a button it clicks, and the click that follows still needs its item.
// A click elsewhere is the outside-pointer handler's job.
export function closeWhenFocusLeaves(root, close) {
  const doc = root.ownerDocument
  setTimeout(() => {
    const active = doc.activeElement
    if (active && active !== doc.body && !root.contains(active)) close()
  })
}
