import { useMediaQuery } from './useMediaQuery.js'

// The dashboard has two faces. Below 1024px (phones and tablets) it draws the
// compact design: graphite palette, a bottom navigation bar, a page's options
// stacked above its list. From 1024px up it keeps the desktop design and its
// own colours. The markup decides which face is drawn, and each face's styles
// hang on its own classes, so the two never mix whatever the exact width.
//
// Asked as "is this a desktop?", so a place without matchMedia (or one that
// says no to everything, as the test setup does) gets the compact face.
export const DESKTOP_DASHBOARD_QUERY = '(min-width: 1024px)'

export function useCompactDashboard() {
  return !useMediaQuery(DESKTOP_DASHBOARD_QUERY)
}
