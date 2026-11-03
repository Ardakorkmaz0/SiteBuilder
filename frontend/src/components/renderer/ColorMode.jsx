// The site's two palettes inside the app: the in-app viewer and the editor's
// preview draw a page with the same variables the published page has (see
// utils/colorMode.js), under a root that says which palette is on. The theme
// switch component reads and flips it here; on a published page the runtime
// does the same to <html>.
import { useEffect, useMemo, useState } from 'react'
import { COLOR_SCHEME_CSS, colorModeCss } from '../../utils/colorMode.js'
import { ColorModeContext } from './colorModeContext.js'

// The choice a page opens with: 'light', 'dark' or 'system' (the device).
function firstPick(mode) {
  if (['light', 'dark', 'system'].includes(mode.initial)) return mode.initial
  return mode.followDevice ? 'system' : mode.base
}

function deviceQuery() {
  try {
    return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
  } catch {
    return null
  }
}

const devicePalette = () => (deviceQuery()?.matches ? 'dark' : 'light')

// `forced` shows one palette and leaves the switch inert: the editor's canvas
// preview, where a click selects the block rather than pressing it.
export function ColorModeRoot({ mode, forced = null, onChoose = null, children }) {
  // What the visitor chose here. Until then the page follows what it is told,
  // which can change while it is open: the owner changing what the site opens
  // in, or the site gaining its second palette.
  const [chosen, setChosen] = useState(null)
  const pick = mode ? chosen || firstPick(mode) : null
  const [device, setDevice] = useState(devicePalette)
  useEffect(() => {
    const query = deviceQuery()
    if (!query?.addEventListener) return undefined
    const onChange = () => setDevice(devicePalette())
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  const current = forced || (pick === 'system' ? device : pick)
  const value = useMemo(() => {
    if (!mode) return null
    // `onChoose`: the page around it hands the choice on to the site's next page.
    const choose = (next) => {
      setChosen(next)
      onChoose?.(next)
    }
    return {
      current,
      pick: forced || pick,
      base: mode.base,
      alt: mode.alt,
      toggle: forced ? null : () => choose(current === mode.alt ? mode.base : mode.alt),
      choose: forced ? null : choose,
    }
  }, [mode, current, pick, forced, onChoose])
  if (!mode) return children
  return (
    <ColorModeContext.Provider value={value}>
      <style data-pwb-color-mode="" dangerouslySetInnerHTML={{ __html: colorModeCss(mode) + COLOR_SCHEME_CSS }} />
      <div data-pwb-color-root="" data-pwb-theme={current} data-pwb-theme-pick={forced || pick} style={{ display: 'contents' }}>
        {children}
      </div>
    </ColorModeContext.Provider>
  )
}
