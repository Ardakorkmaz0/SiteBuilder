// Quick add from the component palette: which few variants a hovered row
// offers first, how often the viewer has used each, and where a variant added
// by its number key lands on the canvas.

const USAGE_KEY = 'pwb_palette_usage'

/** How many times this viewer added each variant: { type: { id: count } }. */
export function readPaletteUsage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function notePaletteUse(type, id) {
  try {
    const usage = readPaletteUsage()
    const counts = usage[type] && typeof usage[type] === 'object' ? usage[type] : {}
    counts[id] = (Number(counts[id]) || 0) + 1
    usage[type] = counts
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage))
  } catch {
    /* private mode: remembering favourites is a nicety */
  }
}

/**
 * The variants a row shows first: the recommended one, then the ones this
 * viewer adds most, then the palette's own order.
 */
export function quickPicks(variants, counts = {}, count = 4) {
  const used = (variant) => Number(counts?.[variant.id]) || 0
  return variants
    .map((variant, index) => ({ variant, index }))
    .sort((a, b) => (
      Number(!!b.variant.recommended) - Number(!!a.variant.recommended)
      || used(b.variant) - used(a.variant)
      || a.index - b.index
    ))
    .slice(0, count)
    .map((item) => item.variant)
}

/**
 * Centre of a block added by its number key, in canvas coordinates: below the
 * selected block when there is one, else in the middle of the part of the
 * canvas on screen (`view`: top/height, and left/width when the canvas is
 * zoomed or scrolled sideways), kept inside the canvas.
 */
export function inViewSpot({ selected = null, view, canvasWidth, width = 360, height = 120, gap = 24 }) {
  if (selected) {
    return {
      x: (selected.x || 0) + (selected.w || 0) / 2,
      y: (selected.y || 0) + (selected.h || 0) + gap + height / 2,
    }
  }
  const seenWidth = Number(view?.width)
  const middle = seenWidth > 0 ? (Number(view.left) || 0) + seenWidth / 2 : canvasWidth / 2
  const half = Math.min(width / 2, canvasWidth / 2)
  return {
    x: Math.min(Math.max(middle, half), canvasWidth - half),
    y: Math.max(height / 2, (view?.top || 0) + (view?.height || 0) / 2),
  }
}

const RECENT_KEY = 'pwb_recent_blocks'
const RECENT_LIMIT = 8

/** Library entry keys this viewer added last, newest first. */
export function readRecentBlocks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((key) => typeof key === 'string').slice(0, RECENT_LIMIT) : []
  } catch {
    return []
  }
}

export function noteRecentBlock(key) {
  try {
    const keys = [key, ...readRecentBlocks().filter((item) => item !== key)].slice(0, RECENT_LIMIT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(keys))
  } catch {
    /* private mode */
  }
}
