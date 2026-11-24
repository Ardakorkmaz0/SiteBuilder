import { NodeIcon } from '../icons.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'
import {
  SELECTION_BAR_BACKGROUND,
  SELECTION_BAR_BORDER,
  SELECTION_BAR_SHADOW,
  SELECTION_ICON_SIZE,
} from './selectionToolbar.js'
import { PALETTE_TOOLS } from './toolPalette.js'

// A dark bar of tools at the side of the stage, drawn like the bar over a
// selected element (selectionToolbar.js): Select, Text, Box, Image.
export default function ToolPalette({ tool = 'select', onTool }) {
  const { t } = useLanguage()
  return (
    <div
      role="toolbar"
      aria-label={t('Tools')}
      aria-orientation="vertical"
      data-tool-palette=""
      className="pointer-events-auto flex flex-col items-center gap-0.5 p-1"
      style={{
        border: `1px solid ${SELECTION_BAR_BORDER}`,
        borderRadius: 10,
        background: SELECTION_BAR_BACKGROUND,
        boxShadow: SELECTION_BAR_SHADOW,
      }}
    >
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
            className={`grid h-7 w-7 place-items-center rounded-md border-0 p-0 text-white ${
              active ? 'bg-white/20' : 'bg-transparent hover:bg-white/10'
            }`}
          >
            <NodeIcon name={icon} size={SELECTION_ICON_SIZE} />
          </button>
        )
      })}
    </div>
  )
}
