// A word on a segmented switch with its icon beside it (stageSwitchIcons.js).
//
// `align-top`: an inline-flex box that starts with an icon takes its baseline
// from the icon, sat lower than the word's, and the button grew by a pixel.
// That pixel moved the canvas under the stage bar, and a drag at a zoom then
// landed a pixel off in Firefox (editor-canvas-sweep).
export default function SwitchLabel({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 align-top">
      {Icon && <Icon size={13} className="shrink-0" />}
      <span>{children}</span>
    </span>
  )
}
