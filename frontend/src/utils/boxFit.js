// Content that fits its box.
//
// Resizing a block on the canvas used to change only the box: the content
// kept its size, so a smaller box clipped it ("Bootstra") and a bigger one
// left it in a corner of empty space. A block sized by hand now fits its box:
// its content is drawn as large as it can be without spilling, text re-wrapped
// to the box's width, and it shrinks the same way.
//
// How: the content sits in a root inside the box. The root is laid out at the
// box's width divided by a zoom, then scaled by that zoom, so text wraps as it
// would at that size and everything (type, padding, borders) grows together.
// The largest zoom whose layout still fits is found by bisection.
//
// The same function runs in the editor (React) and on the published page (its
// source is shipped in the runtime, see htmlRuntime.js), so both agree to the
// pixel. It must therefore stay self-contained: no imports, no outer names.

// How each native type fits. `reflow`: the content re-wraps to the box's width
// and grows until the box is full. `contain`: a control (button, badge...) is
// scaled whole to the largest size that fits either way. The component itself
// then fills the box, so its background and border cover it.
const NATIVE_FIT = {
  heading: 'reflow',
  text: 'reflow',
  quote: 'reflow',
  list: 'reflow',
  card: 'reflow',
  alert: 'reflow',
  section: 'reflow',
  input: 'reflow',
  select: 'reflow',
  button: 'contain',
  linkbutton: 'contain',
  badge: 'contain',
  icon: 'contain',
  themeToggle: 'contain',
}

// Types a hand-sized box makes fit: the natives above and HTML blocks, which
// fit inside their own document (htmlEmbedDocument).
export const FIT_TYPES = new Set([...Object.keys(NATIVE_FIT), 'html'])

export function fitsBox(component) {
  return !!component && component.props?.fit === 'box' && FIT_TYPES.has(component.type)
}

// { mode, fill } for a native component that fits its box, else null.
export function nativeFit(component) {
  if (!fitsBox(component) || component.type === 'html') return null
  return { mode: NATIVE_FIT[component.type], fill: true }
}

// While measuring, a long word must not be broken mid-word to squeeze into a
// narrower line: it has to count as too wide, which caps the zoom.
//
// Then the box's shape changes some layouts, so a block uses a wide or a
// narrow box instead of just shrinking in it. The box is a size container; its
// shape is decided by the box alone (never by the zoomed content), so the
// layout cannot flip back and forth while it fits.
const R = '[data-pwb-fit-root]'
export const BOX_FIT_CSS = [
  '[data-pwb-fit-measuring],[data-pwb-fit-measuring] *{overflow-wrap:normal!important;word-break:normal!important;}',
  '[data-pwb-fit]{container-type:size;}',
  // A theme switch with its text, in a box too narrow for both: the icon.
  `@container (max-aspect-ratio: 19/10){${R}>.pwb-theme-toggle>span:not([aria-hidden]){display:none!important;}}`,
  // A button with an icon, in a box about square: the icon.
  `@container (max-aspect-ratio: 5/4){${R}>a:has(>[aria-hidden="true"])>span:not([aria-hidden]){display:none!important;}}`,
  // A list of four or more in a wide box: two columns.
  `@container (min-aspect-ratio: 13/5){${R} :is(ul,ol):has(>li:nth-child(4)){column-count:2;column-gap:2em;}${R} :is(ul,ol)>li{break-inside:avoid;}}`,
  // A text band in a wide box: its button beside the text, not under it.
  `@container (min-aspect-ratio: 16/5){${R}>section>.section-inner:has(>a){display:grid!important;grid-template-columns:minmax(0,1fr) auto;column-gap:2em;align-items:center;}${R}>section>.section-inner>a{grid-column:2;grid-row:1/span 3;margin-top:0!important;}${R}>section>.section-inner>:not(a){grid-column:1;}}`,
  // A one-line field in a very wide box: its label beside the field.
  `@container (min-aspect-ratio: 7/1){${R} .pwb-field-line{flex-direction:row!important;align-items:center!important;flex-wrap:wrap!important;column-gap:0.75em;}${R} .pwb-field-line>label{flex:0 0 auto;margin:0!important;}${R} .pwb-field-line>:is(input,select,.pwb-password){flex:1 1 0;min-width:0;width:auto!important;}${R} .pwb-field-line>p{flex-basis:100%;}}`,
].join('')


// Fits `root` into `box` and returns the zoom used. `mode` is 'reflow',
// 'contain' or 'cover' (media that fills the box as it is, no zoom). With
// `fill`, the root takes the whole box (its content fills it); without, the
// content is centred in the box.
export function fitBoxContent(box, root, mode, fill) {
  var W = box.clientWidth
  var H = box.clientHeight
  var s = root.style
  if (!W || !H) return 1
  s.position = 'absolute'
  s.left = '0px'
  s.top = '0px'
  s.maxWidth = 'none'
  s.minHeight = '0px'
  s.transformOrigin = '0 0'
  if (mode === 'cover') {
    s.width = '100%'
    s.height = '100%'
    s.transform = 'none'
    return 1
  }
  s.transform = 'none'
  s.height = 'auto'
  root.setAttribute('data-pwb-fit-measuring', '')
  var MIN = 0.1
  var MAX = 8
  var wide = function (el) { return !!el && el.scrollWidth > el.clientWidth + 1 }
  var z
  if (mode === 'contain') {
    s.width = 'max-content'
    // offsetWidth is rounded down: a label that needs 118.4px would get 118
    // and break onto a second line. A pixel of room keeps it on one.
    var w0 = (root.offsetWidth || 0) + 1
    var h0 = root.offsetHeight || 1
    z = Math.min(W / w0, H / h0)
  } else {
    var fits = function (k) {
      s.width = (W / k) + 'px'
      return !wide(root) && !wide(root.firstElementChild) && root.offsetHeight * k <= H + 0.5
    }
    if (fits(MAX)) z = MAX
    else if (!fits(MIN)) z = MIN
    else {
      var lo = MIN
      var hi = MAX
      for (var i = 0; i < 18; i++) {
        var mid = Math.sqrt(lo * hi)
        if (fits(mid)) lo = mid
        else hi = mid
      }
      z = lo
    }
  }
  z = Math.max(MIN, Math.min(MAX, z))
  root.removeAttribute('data-pwb-fit-measuring')
  s.width = (W / z) + 'px'
  if (fill) {
    s.height = (H / z) + 'px'
  } else {
    // Centred: down by the room left under it, across by the room beside the
    // content (a block that spans the width is left where it is).
    s.top = Math.max(0, (H - root.offsetHeight * z) / 2) + 'px'
    var rect = root.getBoundingClientRect()
    var scale = rect.width ? rect.width / (W / z) : z
    var left = Infinity
    var right = -Infinity
    for (var c = root.firstElementChild; c; c = c.nextElementSibling) {
      var r = c.getBoundingClientRect()
      if (!r.width && !r.height) continue
      if (r.left < left) left = r.left
      if (r.right > right) right = r.right
    }
    if (right > left && scale) {
      var used = (right - left) / scale * z
      var offset = (left - rect.left) / scale * z
      if (used < W - 1) s.left = ((W - used) / 2 - offset) + 'px'
    }
  }
  s.transform = 'scale(' + z + ')'
  return z
}

