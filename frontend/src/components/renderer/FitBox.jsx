// A native block that fits its box (utils/boxFit.js), in the editor and the
// app's viewer. The published page writes the same box and root and fits them
// with the same function, so the two agree.
import { useLayoutEffect, useRef } from 'react'
import { BOX_FIT_CSS, fitBoxContent } from '../../utils/boxFit.js'

function useFitCss() {
  useLayoutEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('pwb-box-fit-css')) return
    const tag = document.createElement('style')
    tag.id = 'pwb-box-fit-css'
    tag.textContent = BOX_FIT_CSS
    document.head.appendChild(tag)
  }, [])
}

export default function FitBox({ mode, fill = true, children }) {
  useFitCss()
  const boxRef = useRef(null)
  const rootRef = useRef(null)
  // After every render: the content may have changed (text, styles, the
  // other palette), and the box with it.
  useLayoutEffect(() => {
    const box = boxRef.current
    const root = rootRef.current
    if (!box || !root) return undefined
    const fit = () => fitBoxContent(box, root, mode, fill)
    fit()
    const watcher = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null
    watcher?.observe(box)
    const images = [...root.querySelectorAll('img')].filter((image) => !image.complete)
    images.forEach((image) => image.addEventListener('load', fit))
    let live = true
    document.fonts?.ready?.then(() => { if (live) fit() })
    return () => {
      live = false
      watcher?.disconnect()
      images.forEach((image) => image.removeEventListener('load', fit))
    }
  })
  return (
    <div
      ref={boxRef}
      data-pwb-fit={mode}
      data-pwb-fit-fill={fill ? '' : undefined}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <div
        ref={rootRef}
        data-pwb-fit-root=""
        style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', transformOrigin: '0 0' }}
      >
        {children}
      </div>
    </div>
  )
}
