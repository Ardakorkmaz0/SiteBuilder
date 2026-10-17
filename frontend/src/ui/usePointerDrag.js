import { useCallback, useLayoutEffect, useRef } from 'react'
import { trackPointerDrag } from '../utils/pointerDrag.js'

// A pointer gesture belongs to the mounted editor and its coordinate space.
// End it before a replacement document or viewport can receive stale moves.
export function usePointerDrag(contextId, coordinateSpace) {
  const active = useRef(new Set())
  useLayoutEffect(() => {
    const stops = active.current
    return () => {
      for (const stop of [...stops]) stop()
    }
  }, [contextId, coordinateSpace])

  return useCallback((event, { onEnd, ...callbacks } = {}) => {
    let finished = false
    let stop
    stop = trackPointerDrag(event, {
      ...callbacks,
      onEnd: (endEvent) => {
        finished = true
        active.current.delete(stop)
        onEnd?.(endEvent)
      },
    })
    if (!finished) active.current.add(stop)
    return stop
  }, [])
}
