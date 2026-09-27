// Full screen shows the page, not the editor: the element the caller hands in
// (the stage with the page in its PC or phone frame) is what the browser puts
// on the whole screen. Taking the document full screen instead kept the header,
// the toolbars and the rails on screen, which is the editor, only bigger.
//
// The browser can refuse (an embedding iframe without the permission, or a
// phone browser that only allows video full screen). The flag is set either
// way, and the caller pins the same element over the window with CSS, so the
// page still covers the editor and Esc or the exit button still ends it.

import { useCallback, useEffect, useState } from 'react'

export default function useFullscreenEditing() {
  const [fullscreen, setFullscreen] = useState(false)

  // The browser is the authority: Esc, F11 and the window chrome can all end
  // full screen without going through us.
  useEffect(() => {
    const sync = () => { if (!document.fullscreenElement) setFullscreen(false) }
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  // With the request refused there is no fullscreenchange coming, so Esc has
  // to end the CSS version itself.
  useEffect(() => {
    if (!fullscreen) return undefined
    const onKey = (event) => {
      if (event.key !== 'Escape' || document.fullscreenElement) return
      setFullscreen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [fullscreen])

  // The browser calls happen here, in the click itself, not inside a state
  // updater: updaters must be pure (StrictMode runs them twice, which asked for
  // full screen twice) and a request made later than the click can lose the
  // user activation the browser demands for it.
  const toggleFullscreen = useCallback((target) => {
    if (fullscreen) {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
      setFullscreen(false)
      return
    }
    // Requested, not awaited: a refusal leaves the CSS version in place.
    const element = target && typeof target.requestFullscreen === 'function' ? target : null
    element?.requestFullscreen().catch(() => {})
    setFullscreen(true)
  }, [fullscreen])

  return { fullscreen, toggleFullscreen }
}
