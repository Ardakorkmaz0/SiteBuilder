import { DESKTOP_DASHBOARD_QUERY } from '../utils/useCompactDashboard.js'

// The test setup answers every media query with "no", which is the compact
// (phone and tablet) dashboard. This makes it a desktop until the returned
// function puts the setup's answer back.
export function setDesktopViewport() {
  const previous = window.matchMedia
  window.matchMedia = (query) => ({
    matches: query === DESKTOP_DASHBOARD_QUERY,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
  return () => { window.matchMedia = previous }
}
