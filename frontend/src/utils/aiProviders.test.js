// Relative VITE_API_URL (the production "/api" configuration) must still
// construct a valid request URL in fetchLocalStatus instead of throwing
// TypeError: Invalid URL when `new URL('/api/...')` lacks a base.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchLocalStatus } from './aiProviders.js'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('fetchLocalStatus', () => {
  it('handles a relative VITE_API_URL (/api) without throwing Invalid URL', async () => {
    vi.stubEnv('VITE_API_URL', '/api')
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, models: ['qwen2.5:7b'] }),
    }))
    globalThis.fetch = fetchMock

    const result = await fetchLocalStatus('http://127.0.0.1:11434/v1')

    expect(result).toEqual({ ok: true, models: ['qwen2.5:7b'] })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('/api/ai/local/status/')
    expect(calledUrl).toContain('base=http')
  })

  it('returns { ok: false } instead of rejecting when URL or fetch fails', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network down')
    })

    const result = await fetchLocalStatus()

    expect(result).toMatchObject({ ok: false, reason: 'network down' })
  })
})
