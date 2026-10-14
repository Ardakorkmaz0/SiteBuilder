// Parts of the app load on demand (React.lazy): the editor, the wizard, the
// template gallery, most pages. A tab opened before a deploy asks for them by
// the names they had then. When a part cannot be had, the browser rejects the
// import — and the server answers a missing file with the app's index.html,
// which a browser refuses to run as a script.
//
// lazyChunk retries once (a dropped connection is the common case), and
// isChunkLoadError lets the error screen tell "this tab is older than the
// app" apart from a real bug, and say "reload" instead of "something broke".
import { lazy } from 'react'

// Chrome, Firefox and Safari word it differently; Vite adds its own for CSS.
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|Failed to load module script|error loading dynamically imported module|Unable to preload CSS/i

export function isChunkLoadError(error) {
  if (!error) return false
  if (error.name === 'ChunkLoadError') return true
  return CHUNK_ERROR.test(String(error.message || error))
}

export async function importWithRetry(factory, { retries = 1, delayMs = 1200 } = {}) {
  try {
    return await factory()
  } catch (error) {
    if (retries <= 0 || !isChunkLoadError(error)) throw error
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    return importWithRetry(factory, { retries: retries - 1, delayMs })
  }
}

export function lazyChunk(factory) {
  return lazy(() => importWithRetry(factory))
}
