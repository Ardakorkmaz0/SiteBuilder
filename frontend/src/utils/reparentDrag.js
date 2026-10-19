import { dropCoordinates, dropScale } from './dropCoordinates.js'

export const DROP_TARGET_CLASS = 'pwb-drop-target'
// Pointer travel, in screen pixels, below which a press is a click.
const CLICK_SLOP = 4

// The section, container or tab panel a dragged block would land in: the
// innermost one under the pointer that is not the block itself or inside it.
export function dropTargetAt(clientX, clientY, canvas, dragged) {
  if (!canvas || typeof document.elementsFromPoint !== 'function') return null
  return document.elementsFromPoint(clientX, clientY).find((el) => (
    el.hasAttribute?.('data-builder-droppable-id') && canvas.contains(el) && !dragged?.contains(el)
  )) || null
}

function inside(rect, x, y) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

// Follows one drag of a block. While it moves, the parent it would move into
// is outlined. On release, `end` says where it lands — `{ targetId, point }`,
// targetId null for the page itself — or null when it stays in the parent it
// is in (or the pointer let go off the canvas). `point` is the block's new
// top-left in the target's own coordinates (see moveComponentInto); `grab`
// is where the pointer held the block, from its top-left, in screen pixels.
// A click (`start` is where the pointer went down) never moves a block, and
// neither does a release whose place cannot be read.
export function createReparentTracker({ itemEl, canvas, currentParentId = null, grab = { x: 0, y: 0 }, start = null }) {
  let outlined = null
  const outline = (el) => {
    if (outlined === el) return
    outlined?.classList.remove(DROP_TARGET_CLASS)
    outlined = el
    el?.classList.add(DROP_TARGET_CLASS)
  }
  const landingAt = (clientX, clientY) => {
    const target = dropTargetAt(clientX, clientY, canvas, itemEl)
    return { target, targetId: target?.getAttribute('data-builder-droppable-id') ?? null }
  }
  return {
    move(clientX, clientY) {
      const { target, targetId } = landingAt(clientX, clientY)
      outline(target && targetId !== currentParentId ? target : null)
    },
    end(clientX, clientY) {
      outline(null)
      if (start && Math.hypot(clientX - start.x, clientY - start.y) < CLICK_SLOP) return null
      if (!canvas || typeof document.elementsFromPoint !== 'function') return null
      if (!inside(canvas.getBoundingClientRect(), clientX, clientY)) return null
      const { target, targetId } = landingAt(clientX, clientY)
      if (targetId === currentParentId) return null
      const left = clientX - grab.x
      const top = clientY - grab.y
      if (target) {
        const point = dropCoordinates(target, left, top, canvas)
        const displayWidth = target.getBoundingClientRect().width / dropScale(target, canvas)
        return { targetId, point: { ...point, displayWidth } }
      }
      const rect = canvas.getBoundingClientRect()
      const scale = dropScale(canvas, canvas)
      return { targetId: null, point: { x: (left - rect.left) / scale, y: (top - rect.top) / scale } }
    },
    cancel() {
      outline(null)
    },
  }
}
