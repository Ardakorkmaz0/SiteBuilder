import { FolderArt, ScratchArt, UploadArt } from './GuideArt.jsx'
import { GlobeIcon, LayersIcon, SearchIcon, StarIcon } from '../icons.jsx'

const ART = { sites: FolderArt, blocks: ScratchArt, favorites: ScratchArt, search: UploadArt }
const MARK = { sites: GlobeIcon, blocks: LayersIcon, favorites: StarIcon, search: SearchIcon }

export default function DashboardEmptyState({ title, description, kind = 'sites', children }) {
  const Art = ART[kind] || FolderArt
  const Mark = MARK[kind] || GlobeIcon
  return (
    <div className="workspace-empty">
      <div className="workspace-empty-art" aria-hidden="true"><Art /><span><Mark size={28} /></span></div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children && <div className="workspace-empty-actions">{children}</div>}
    </div>
  )
}
