import { NodeIcon } from '../icons.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'
import { PALETTE_TOOLS } from './toolPalette.js'

// Select, Text, Box, Image: a switch in the bar over the stage, next to
// View / Edit / Source, on a canvas page and on an HTML page alike. It sat
// over the stage first and took the clicks meant for the page under it (the
// browser frame's reload button, the first heading).
export default function ToolPalette({ tool = 'select', onTool }) {
  const { t } = useLanguage()
  return (
    <div role="toolbar" aria-label={t('Tools')} data-tool-palette="" className="studio-segment shrink-0">
      {PALETTE_TOOLS.map(({ id, icon, label, key }) => {
        const name = `${t(label)} (${key.toUpperCase()})`
        const active = tool === id
        return (
          <button
            key={id}
            type="button"
            data-tool={id}
            aria-label={name}
            aria-pressed={active}
            title={name}
            onClick={() => onTool?.(id)}
            className={`studio-segment-btn grid place-items-center px-1.5 ${active ? 'studio-segment-btn-active' : ''}`}
          >
            <NodeIcon name={icon} size={15} />
          </button>
        )
      })}
    </div>
  )
}
