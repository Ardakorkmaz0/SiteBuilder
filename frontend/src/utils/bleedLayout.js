// Which blocks of a free-placed page reach the screen edges, and how wide their
// content runs when they do.
//
// A free-placed page is drawn at its design width and centred, so a screen
// wider than the design has empty space on both sides. A bar or band laid
// across the whole design is meant to run edge to edge, like the header and
// hero of any site: its BACKGROUND stretches to the screen, while its CONTENT
// stays on the design column, exactly where the editor shows it. Only the
// navbar and the region used to stretch, so on a wide screen a full-width hero
// stood as a box under an edge-to-edge bar, and the bar's brand and links ran
// out past the column the rest of the page sits on.
//
// One source of truth for the published page (schemaToFiles) and the in-app
// viewer (Renderer), so the two cannot drift apart.

import { pxNumber } from './pxNumber.js'

function px(value) {
  const n = pxNumber(value)
  return Number.isFinite(n) ? n : 0
}

const given = (value) => value !== undefined && value !== null && value !== ''

// The left and right padding, in px, from the `padding` shorthand and its
// longhands. Units other than px count as 0: the column then runs a little
// wider, never narrower than the box.
export function horizontalPadding(styles = {}) {
  const parts = String(styles?.padding ?? '').trim().split(/\s+/).filter(Boolean)
  let left = 0
  let right = 0
  if (parts.length === 1) {
    left = right = px(parts[0])
  } else if (parts.length === 2 || parts.length === 3) {
    left = right = px(parts[1])
  } else if (parts.length >= 4) {
    right = px(parts[1])
    left = px(parts[3])
  }
  if (given(styles?.paddingLeft)) left = px(styles.paddingLeft)
  if (given(styles?.paddingRight)) right = px(styles.paddingRight)
  return { left: Math.max(0, left), right: Math.max(0, right) }
}

// True when a top-level block of a free-placed page stretches to the screen:
// a region always, a horizontal navbar unless it is set to "boxed", and a
// section or divider laid across the whole design width (`layout` is the one
// for the screen being drawn: the PC or the phone design).
export function stretchesToViewport(component, layout, designWidth) {
  const type = component?.type
  if (type === 'region') return true
  if (type === 'navbar') {
    return component.props?.navLayout !== 'vertical' && component.props?.widthMode !== 'boxed'
  }
  if (type === 'section' || type === 'divider') {
    const box = layout || component.layout || {}
    const width = Number(designWidth) || 0
    return width > 0 && (Number(box.x) || 0) <= 1 && (Number(box.w) || 0) >= width - 1
  }
  return false
}

// A block's own content width, or 0 for "none set" (an empty field means the
// full width). Read with its unit: the px field writes "1200px".
export function ownContentWidth(component) {
  const n = pxNumber(component?.props?.contentWidth)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
}

// How wide the content row of a stretched navbar or section runs: its own
// content width when it has one, never wider than the design column inside
// the block's padding. At the design width this is the box the editor draws;
// on a wider screen it keeps the brand and links on that column.
export function bleedContentWidth(component, styles, designWidth) {
  const { left, right } = horizontalPadding(styles)
  const column = Math.max(0, Math.round((Number(designWidth) || 0) - left - right))
  const own = ownContentWidth(component)
  return own > 0 ? Math.min(own, column) : column
}
