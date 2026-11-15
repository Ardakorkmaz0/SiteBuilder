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
 * canvas on screen.
 */
export function inViewSpot({ selected = null, view, canvasWidth, height = 120, gap = 24 }) {
  if (selected) {
    return {
      x: (selected.x || 0) + (selected.w || 0) / 2,
      y: (selected.y || 0) + (selected.h || 0) + gap + height / 2,
    }
  }
  return {
    x: canvasWidth / 2,
    y: Math.max(height / 2, (view?.top || 0) + (view?.height || 0) / 2),
  }
}
