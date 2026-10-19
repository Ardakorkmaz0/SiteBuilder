import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createReparentTracker, DROP_TARGET_CLASS } from './reparentDrag.js'

// jsdom lays nothing out: each element gets the rectangle a browser would.
function box(el, left, top, width, height) {
  el.getBoundingClientRect = () => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top })
  return el
}

let canvas, section, sectionGrid, item, itemInner, under

beforeEach(() => {
  canvas = box(document.createElement('div'), 100, 50, 500, 800)
  canvas.id = 'free-canvas'
  canvas.dataset.builderCanvasScale = '0.5'
  section = box(document.createElement('section'), 100, 150, 500, 180)
  sectionGrid = box(document.createElement('div'), 110, 150, 480, 180)
  sectionGrid.setAttribute('data-builder-droppable-id', 'section')
  sectionGrid.dataset.builderFitScale = '1'
  section.append(sectionGrid)
  item = box(document.createElement('div'), 120, 160, 100, 40)
  // A container being dragged has a droppable of its own: never its target.
  itemInner = document.createElement('div')
  itemInner.setAttribute('data-builder-droppable-id', 'dragged-container')
  item.append(itemInner)
  canvas.append(section, item)
  document.body.append(canvas)
  under = []
  document.elementsFromPoint = vi.fn(() => under)
})

afterEach(() => {
  canvas.remove()
  delete document.elementsFromPoint
})

describe('while dragging', () => {
  it('outlines the section the block would move into, and nothing else', () => {
    const tracker = createReparentTracker({ itemEl: item, canvas })
    under = [itemInner, item, sectionGrid, section, canvas]
    tracker.move(300, 200)
    expect(sectionGrid.classList.contains(DROP_TARGET_CLASS)).toBe(true)
    expect(itemInner.classList.contains(DROP_TARGET_CLASS)).toBe(false)
    under = [item, canvas]
    tracker.move(300, 600)
    expect(sectionGrid.classList.contains(DROP_TARGET_CLASS)).toBe(false)
  })

  it('does not outline the parent the block is already in', () => {
    const tracker = createReparentTracker({ itemEl: item, canvas, currentParentId: 'section' })
    under = [item, sectionGrid, canvas]
    tracker.move(300, 200)
    expect(sectionGrid.classList.contains(DROP_TARGET_CLASS)).toBe(false)
  })

  it('takes the outline away when the drag is cancelled', () => {
    const tracker = createReparentTracker({ itemEl: item, canvas })
    under = [item, sectionGrid]
    tracker.move(300, 200)
    tracker.cancel()
    expect(sectionGrid.classList.contains(DROP_TARGET_CLASS)).toBe(false)
  })
})

describe('on release', () => {
  it('lands in the section, at the block top-left in the section grid design', () => {
    // Held 10 px right and 5 px down of its top-left; let go at (300, 200).
    const tracker = createReparentTracker({ itemEl: item, canvas, grab: { x: 10, y: 5 } })
    under = [item, sectionGrid, canvas]
    tracker.move(300, 200)
    const landing = tracker.end(300, 200)
    // Top-left (290, 195) is (180, 45) inside the grid on screen: 0.5 zoom.
    expect(landing).toEqual({ targetId: 'section', point: { x: 360, y: 90, displayWidth: 960 } })
    expect(sectionGrid.classList.contains(DROP_TARGET_CLASS)).toBe(false)
  })

  it('lands on the page when let go outside any parent', () => {
    const tracker = createReparentTracker({ itemEl: item, canvas, currentParentId: 'section', grab: { x: 0, y: 0 } })
    under = [item, canvas]
    expect(tracker.end(200, 650)).toEqual({ targetId: null, point: { x: 200, y: 1200 } })
  })

  it('stays put in the parent it is already in', () => {
    const tracker = createReparentTracker({ itemEl: item, canvas, currentParentId: 'section' })
    under = [item, sectionGrid, canvas]
    expect(tracker.end(300, 200)).toBeNull()
  })

  it('stays put when a block on the page is let go on the page', () => {
    const tracker = createReparentTracker({ itemEl: item, canvas })
    under = [item, canvas]
    expect(tracker.end(300, 600)).toBeNull()
  })

  it('does not move a block that was only clicked', () => {
    const tracker = createReparentTracker({ itemEl: item, canvas, currentParentId: 'section', start: { x: 300, y: 600 } })
    under = [item, canvas]
    expect(tracker.end(302, 601)).toBeNull()
    expect(tracker.end(300, 610)).toEqual({ targetId: null, point: { x: 400, y: 1120 } })
  })

  it('stays put when the browser cannot say what is under the pointer', () => {
    delete document.elementsFromPoint
    const tracker = createReparentTracker({ itemEl: item, canvas, currentParentId: 'section' })
    expect(tracker.end(300, 600)).toBeNull()
  })

  it('stays put when let go off the canvas', () => {
    const tracker = createReparentTracker({ itemEl: item, canvas, currentParentId: 'section' })
    under = []
    expect(tracker.end(900, 200)).toBeNull()
  })
})
