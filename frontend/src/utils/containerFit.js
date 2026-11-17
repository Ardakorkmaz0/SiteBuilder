import { isAutoLayout } from './autoLayout.js'

const positive = (value, fallback) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

// Which layout a free container's blocks stand at. On the phone (a page laid
// out freely, not in flow) their own phone layout when the container says
// so (`props.phoneLayout`: one converted from an uploaded page that read it).
// Otherwise the desktop drawing, scaled down to the container's phone width
// as a whole (fitContainerCanvas), fonts included. Not "when its blocks have
// a mobileLayout": the server gives every block one, and a block moved in
// from the page brings a phone place that means nothing in here.
export function containerChildKey(component, viewport = 'pc', flowMode = false) {
  if (viewport !== 'mobile' || flowMode || component?.type !== 'container' || isAutoLayout(component?.props)) return 'layout'
  return component.props?.phoneLayout === true ? 'mobileLayout' : 'layout'
}

// A block's phone place in a container that has phone layouts, taken from
// its place in the container's desktop drawing scaled to the container's
// phone width: what the phone showed of it before the container had any.
export function scaledPhoneLayout(container, child) {
  const phoneW = positive(container?.mobileLayout?.w, positive(container?.layout?.w, 600))
  const scale = Math.min(1, phoneW / containerDesignWidth(container))
  const l = child?.layout || {}
  return {
    x: Math.round((Number(l.x) || 0) * scale),
    y: Math.round((Number(l.y) || 0) * scale),
    w: Math.max(8, Math.round(positive(l.w, 200) * scale)),
    h: Math.max(4, Math.round(positive(l.h, 80) * scale)),
  }
}

// A narrowed copy can retain children in the original coordinate space. Keep
// that space large enough for every child, then fit it as one canvas so fonts,
// borders and editor pointer coordinates all scale together. Hidden children
// count too, so switching breakpoints does not change the coordinate system.
// With `key` 'mobileLayout' (containerChildKey) the space is the container's
// phone box and the blocks the phone shows.
export function containerDesignWidth(component, key = 'layout') {
  const phone = key === 'mobileLayout'
  const own = phone ? component?.mobileLayout?.w ?? component?.layout?.w : component?.layout?.w
  const width = Math.max(1, Math.round(positive(own, 600)))
  if (isAutoLayout(component?.props)) return width
  const children = Array.isArray(component?.children) ? component.children : []
  return children.reduce((max, child) => {
    if (phone && child?.hiddenMobile) return max
    const layout = (phone ? child?.mobileLayout : null) || child?.layout || {}
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
