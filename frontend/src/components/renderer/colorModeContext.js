// Which palette the page is drawn in, and how to switch it (ColorMode.jsx).
// Its own file so ColorMode.jsx exports only components.
import { createContext, useContext } from 'react'

export const ColorModeContext = createContext(null)

export function useColorMode() {
  return useContext(ColorModeContext)
}
