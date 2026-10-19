const positiveScale = (value) => {
  const scale = Number(value)
  return Number.isFinite(scale) && scale > 0 ? scale : 1
}

// How much `target` is shrunk on screen: the canvas zoom times each nested
// mini-canvas fit between it and the canvas.
export function dropScale(target, canvas, canvasScale = canvas?.dataset?.builderCanvasScale) {
  let scale = positiveScale(canvasScale)
  for (let node = target; node && node !== canvas && canvas?.contains(node); node = node.parentElement) {
    const next = scale * positiveScale(node.dataset?.builderFitScale)
    if (Number.isFinite(next) && next > 0) scale = next
  }
  return scale
}

// Client rectangles include every painted ancestor transform. Undo the canvas
// zoom once and each nested mini-canvas fit, stopping at the canvas boundary.
export function dropCoordinates(target, clientX, clientY, canvas, canvasScale = canvas?.dataset?.builderCanvasScale) {
  const scale = dropScale(target, canvas, canvasScale)
  const rect = target.getBoundingClientRect()
  return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale }
}
