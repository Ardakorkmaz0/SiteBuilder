// A row of buttons with role="radio": the arrow keys move along it and choose,
// wrapping at the ends. Put this on the radiogroup, and give each button
// tabIndex={checked ? 0 : -1}, so Tab enters at the choice and leaves the group.
const STEP = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

export function moveInRadioGroup(event) {
  const step = STEP[event.key]
  if (!step) return
  const radios = [...event.currentTarget.querySelectorAll('[role="radio"]:not(:disabled)')]
  const at = radios.indexOf(event.target.closest('[role="radio"]'))
  if (at === -1) return
  event.preventDefault()
  const next = radios[(at + step + radios.length) % radios.length]
  next.focus()
  next.click()
}
