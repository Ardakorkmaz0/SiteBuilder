// How a live page preview is drawn smaller (or larger) than its real size.
//
// A transform used to do it. Chromium then opens a native popup of the page
// inside (a <select>'s list, a date picker) where the element would be
// WITHOUT the transform: in a phone preview drawn at 68% the list of a select
// opened well below and right of the select, half outside the phone. Measured
// on a user's screenshot: the offset was the scale factor, the same on both
// axes. `zoom` scales the layout itself, so the popup lands under the element.
//
// Chromium and WebKit zoom an iframe's document together with its box, which
// is what keeps the page inside at its real width. Firefox's zoom is recent,
// so it keeps the transform, whose popups it already places correctly.
function zoomScalesFrames() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  if (/Firefox\//.test(navigator.userAgent)) return false
  return !!window.CSS?.supports?.('zoom', '0.5')
}

const USE_ZOOM = zoomScalesFrames()

// Style for the box holding the preview at its real size. `scale` 1 adds
// nothing, so an unscaled preview has no transform or zoom at all.
export function previewScaleStyle(scale) {
  if (!scale || scale === 1) return {}
  return USE_ZOOM
    ? { zoom: scale }
    : { transform: `scale(${scale})`, transformOrigin: 'top left' }
}
