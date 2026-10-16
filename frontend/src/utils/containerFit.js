import { isAutoLayout } from './autoLayout.js'

const positive = (value, fallback) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

// A narrowed copy can retain children in the original coordinate space. Keep
// that space large enough for every child, then fit it as one canvas so fonts,
// borders and editor pointer coordinates all scale together. Hidden children
// count too, so switching breakpoints does not change the coordinate system.
export function containerDesignWidth(component) {
  const width = Math.max(1, Math.round(positive(component?.layout?.w, 600)))
  if (isAutoLayout(component?.props)) return width
  const children = Array.isArray(component?.children) ? component.children : []
  return children.reduce((max, child) => {
    const layout = child?.layout || {}
    const x = Number(layout.x)
    const right = Math.max(0, Number.isFinite(x) ? x : 0) + positive(layout.w, 200)
    return Number.isFinite(right) ? Math.max(max, Math.ceil(right)) : max
  }, width)
}

// Shared with the exported runtime. Keep this self-contained: its source is
// shipped to published documents without this module's imports or helpers.
export function fitContainerCanvas(box, root, designWidth, designHeight) {
  var width = Number(designWidth)
  var height = Number(designHeight)
  if (!Number.isFinite(width) || width <= 0) width = 1
  if (!Number.isFinite(height) || height < 0) height = 0
  var actual = Number(box.clientWidth)
  if (!Number.isFinite(actual) || actual <= 0) actual = width
  var scale = Math.min(1, actual / width)
  root.style.width = width + 'px'
  root.style.height = height + 'px'
  root.style.transformOrigin = '0 0'
  root.style.transform = scale === 1 ? '' : 'scale(' + scale + ')'
  box.style.minHeight = (height * scale) + 'px'
  return scale
}
