import '../../ui/workspace-design.css'

// Shared page structure for the dashboard. The editor and authentication pages
// do not mount this layout or inherit its local presentation rules.
export default function WorkspaceLayout({ id, sidebar, sidebarLabel, className = '', children }) {
  return (
    <main id={id} className={`dashboard-container workspace-container ${sidebar ? 'workspace-has-sidebar' : ''} ${className}`}>
      {sidebar && <aside className="workspace-sidebar" aria-label={sidebarLabel}>{sidebar}</aside>}
      <div className="workspace-content">{children}</div>
    </main>
  )
}
