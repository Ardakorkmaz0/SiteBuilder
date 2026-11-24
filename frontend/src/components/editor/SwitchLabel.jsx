// A word on a segmented switch with its icon beside it (stageSwitchIcons.js).
//
// `align-top`: an inline-flex box that starts with an icon takes its baseline
// from the icon, sat lower than the word's, and the button grew by a pixel.
// That pixel moved the canvas under the stage bar, and a drag at a zoom then
// landed a pixel off in Firefox (editor-canvas-sweep).
//
// `collapse`: the stage bars are @containers. Where a bar is short of room the
// word gives way to its icon: it stays in the button for a screen reader and
// shows on hover. The mode switch gives way first, then PC/Mobile, so the
// controls at the end of the bar (zoom, the ⋯ menu) stay on screen.
const COLLAPSE = {
  mode: 'sr-only @[1300px]:not-sr-only',
  device: 'sr-only @[1100px]:not-sr-only',
}

export default function SwitchLabel({ icon: Icon, collapse, children }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 align-top"
      title={collapse && typeof children === 'string' ? children : undefined}
    >
      {Icon && <Icon size={13} className="shrink-0" />}
      <span className={COLLAPSE[collapse]}>{children}</span>
    </span>
  )
}
