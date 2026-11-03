// Whether the source views show code in colour: on unless turned off, for every
// open view at once, and remembered.
import { useSyncExternalStore } from 'react'

const KEY = 'pwb_code_colors'
const listeners = new Set()
// What the browser would not keep: it holds until the page closes.
let unsaved = null

function read() {
  if (unsaved !== null) return unsaved
  try { return localStorage.getItem(KEY) !== 'off' } catch { return true }
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setCodeColors(on) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
    unsaved = null
  } catch {
    unsaved = on
  }
  listeners.forEach((listener) => listener())
}

export const useCodeColors = () => useSyncExternalStore(subscribe, read, () => true)
