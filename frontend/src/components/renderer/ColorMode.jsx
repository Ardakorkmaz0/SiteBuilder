// The site's two palettes inside the app: the in-app viewer and the editor's
// preview draw a page with the same variables the published page has (see
// utils/colorMode.js), under a root that says which palette is on. The theme
// switch component reads and flips it here; on a published page the runtime
// does the same to <html>.
import { useMemo, useState } from 'react'
import { colorModeCss } from '../../utils/colorMode.js'
import { ColorModeContext } from './colorModeContext.js'

function firstMode(mode) {
  if (mode.initial === mode.alt || mode.initial === mode.base) return mode.initial
  if (!mode.followDevice || typeof window === 'undefined' || !window.matchMedia) return mode.base
  try {
    return window.matchMedia(`(prefers-color-scheme: ${mode.alt})`).matches ? mode.alt : mode.base
  } catch {
    return mode.base
  }
}

// `forced` shows one palette and leaves the switch inert: the editor's canvas
// preview, where a click selects the block rather than pressing it.
export function ColorModeRoot({ mode, forced = null, children }) {
  const [chosen, setChosen] = useState(() => (mode ? firstMode(mode) : null))
  const current = forced || chosen
  const value = useMemo(() => (mode
    ? {
      current,
      base: mode.base,
      alt: mode.alt,
      toggle: forced ? null : () => setChosen((was) => (was === mode.alt ? mode.base : mode.alt)),
    }
    : null), [mode, current, forced])
  if (!mode) return children
  return (
    <ColorModeContext.Provider value={value}>
      <style data-pwb-color-mode="" dangerouslySetInnerHTML={{ __html: colorModeCss(mode) }} />
      <div data-pwb-color-root="" data-pwb-theme={current} style={{ display: 'contents' }}>
        {children}
      </div>
    </ColorModeContext.Provider>
  )
}
