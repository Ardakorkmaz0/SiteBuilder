// Measures the HTML blocks the automatic phone layout narrows, at their phone
// width, and hands the heights to the store (placeMobile uses them). Without
// it a paragraph that was one line on the desktop became two on the phone
// inside a one-line box, and its second line was cut off, in the editor and
// on the published page.
import { useEffect } from 'react'
import { selectCurrentPage, useEditorStore } from '../../store/editorStore.js'
import { embedPhoneKey, measureEmbedHeight } from '../../utils/htmlEmbedMeasure.js'
import { canvasFontFamily } from '../../utils/theme.js'

// The blocks whose phone box is narrower than their desktop box and whose
// phone height is missing or was measured from something else.
function unmeasured(components) {
  const out = []
  const visit = (list) => {
    for (const c of list || []) {
      if (c.type === 'region') visit(c.children)
      if (c.type !== 'html' || c.hiddenMobile) continue
      const w = Math.round(c.mobileLayout?.w || 0)
      if (!w || w >= Math.round(c.layout?.w || 0)) continue
      const phone = c.props?._phoneH
      if (!phone || phone.w !== w || phone.key !== embedPhoneKey(c)) out.push({ c, w })
    }
  }
  visit(components)
  return out
}

export function usePhoneEmbedHeights() {
  const page = useEditorStore(selectCurrentPage)
  const font = useEditorStore((s) => canvasFontFamily(s.schema))
  const setHeights = useEditorStore((s) => s.setEmbedPhoneHeights)
  const auto = !!page && !page.flowMode && !page.mobileManual
  const todo = auto ? unmeasured(page.components) : []
  const pending = todo.map(({ c, w }) => `${c.id}:${w}:${embedPhoneKey(c)}`).join(' ')
  useEffect(() => {
    if (!pending) return undefined
    let live = true
    ;(async () => {
      const heights = {}
      for (const { c, w } of todo) {
        const h = await measureEmbedHeight(c, w, { font })
        if (!live) return
        if (h) heights[c.id] = { w, h, key: embedPhoneKey(c) }
      }
      if (live) setHeights(heights)
    })()
    return () => { live = false }
    // `pending` names every block and what it is measured from; the list
    // itself is rebuilt on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, font, setHeights])
}
