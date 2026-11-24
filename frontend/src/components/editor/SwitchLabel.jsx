// A word on a segmented switch with its icon beside it (stageSwitchIcons.js).
export default function SwitchLabel({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {Icon && <Icon size={13} className="shrink-0" />}
      <span>{children}</span>
    </span>
  )
}
