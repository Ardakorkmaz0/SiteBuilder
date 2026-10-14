// A tab opened before a deploy asks for parts of the app by their old names.
// When one cannot be loaded, the error screen says the app was updated and
// offers a reload, instead of "this screen ran into a problem" with a
// "Try again" that can only fail the same way.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Suspense } from 'react'
import AppErrorBoundary from '../components/AppErrorBoundary.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import { importWithRetry, isChunkLoadError, lazyChunk } from './lazyChunk.js'

const chunkError = () => new TypeError('Failed to fetch dynamically imported module: https://sitebuilt.app/assets/HtmlWorkspace-old.js')

afterEach(() => vi.restoreAllMocks())

describe('a part of the app that cannot be loaded', () => {
  it('is told apart from a real bug, in every browser\'s words', () => {
    expect(isChunkLoadError(chunkError())).toBe(true)
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error("Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of \"text/html\"."))).toBe(true)
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true)
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false)
  })

  it('is asked for once more before giving up, and a real bug is not', async () => {
    const flaky = vi.fn().mockRejectedValueOnce(chunkError()).mockResolvedValueOnce({ default: 'ok' })
    await expect(importWithRetry(flaky, { delayMs: 0 })).resolves.toEqual({ default: 'ok' })
    expect(flaky).toHaveBeenCalledTimes(2)

    const broken = vi.fn().mockRejectedValue(new TypeError('x is not a function'))
    await expect(importWithRetry(broken, { delayMs: 0 })).rejects.toThrow('x is not a function')
    expect(broken).toHaveBeenCalledTimes(1)
  })

  it('shows "updated, reload" instead of "a problem", with no Try again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem('pwb_language', 'en')
    const Missing = lazyChunk(() => Promise.reject(chunkError()))
    render(
      <LanguageProvider>
        <MemoryRouter>
          <AppErrorBoundary>
            <Suspense fallback={<p>loading</p>}><Missing /></Suspense>
          </AppErrorBoundary>
        </MemoryRouter>
      </LanguageProvider>,
    )
    await waitFor(() => expect(screen.getByText('Sitebuilder has been updated')).toBeTruthy(), { timeout: 4000 })
    expect(screen.getByRole('button', { name: 'Reload the page' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  })
})
