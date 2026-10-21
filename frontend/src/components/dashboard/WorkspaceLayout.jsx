import '../../ui/workspace-design.css'

// Shared page structure for the dashboard. The editor and authentication pages
// do not mount this layout or inherit its local presentation rules.
//
// `heading` (the page title and its main actions) comes first in the page:
// a phone stacks the sidebar above the content, and a screen reader reads in
// order, so a title inside the content came after the filters on both. Beside
// a sidebar the stylesheet still places it at the top of the content column.
export default function WorkspaceLayout({ id, heading, sidebar, sidebarLabel, className = '', children }) {
  const layout = [
    'dashboard-container workspace-container',
    sidebar ? 'workspace-has-sidebar' : '',
    sidebar && heading ? 'workspace-has-heading' : '',
    className,
  ].filter(Boolean).join(' ')
  return (
    <main id={id} className={layout}>
      {heading && <div className="workspace-heading-slot">{heading}</div>}
      {sidebar && <aside className="workspace-sidebar" aria-label={sidebarLabel}>{sidebar}</aside>}
      <div className="workspace-content">{children}</div>
    </main>
  )
}
