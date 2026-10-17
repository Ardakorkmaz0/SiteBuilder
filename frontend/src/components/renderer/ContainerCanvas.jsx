import { useLayoutEffect, useRef } from 'react'
import { fitContainerCanvas } from '../../utils/containerFit.js'

// A free container keeps one design space in Edit, View and exported HTML.
// Fitting its root scales all content, including text whose own fit is off.
export default function ContainerCanvas({ width, height, initialWidth, style, hidden, children, ...attributes }) {
  const boxRef = useRef(null)
  const rootRef = useRef(null)
  const scale = Math.min(1, Math.max(1, Number(initialWidth) || width) / width)
  // An ancestor tab can become visible without changing this canvas's props.
  // Measure after every render, as FitBox does, even without ResizeObserver.
  useLayoutEffect(() => {
    const box = boxRef.current
    const root = rootRef.current
    if (!box || !root) return undefined
    const fit = () => fitContainerCanvas(box, root, width, height)
    fit()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null
    observer?.observe(box)
    return () => observer?.disconnect()
  })
  return (
    <div
      {...attributes}
      ref={boxRef}
      hidden={hidden}
      data-pwb-container-width={width}
      data-pwb-container-height={height}
      style={{ ...style, position: 'relative', minHeight: height * scale }}
    >
      <div
        ref={rootRef}
        data-pwb-container-root=""
        style={{
          position: 'absolute', left: 0, top: 0, width, height,
          transformOrigin: '0 0', transform: scale === 1 ? undefined : `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
