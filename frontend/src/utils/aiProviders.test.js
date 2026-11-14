// Relative VITE_API_URL (the production "/api" configuration) must still
// construct a valid request URL in fetchLocalStatus instead of throwing
// TypeError: Invalid URL when `new URL('/api/...')` lacks a base.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchLocalStatus, readCachedLocalModels, setEndpoint } from './aiProviders.js'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
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
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchLocalStatus('http://127.0.0.1:11434/v1')

    expect(result).toEqual({ ok: true, models: ['qwen2.5:7b'] })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('/api/ai/local/status/')
    expect(calledUrl).toContain('base=http')
  })

  it('returns { ok: false } instead of rejecting when URL or fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down')
    }))

    const result = await fetchLocalStatus()

    expect(result).toMatchObject({ ok: false, reason: 'network down' })
  })
})

const localResponse = (models) => ({ ok: true, json: async () => ({ ok: true, models }) })

describe('local model cache ownership', () => {
  it('caches models with their endpoint and ignores them after switching endpoints', async () => {
    setEndpoint('http://localhost:1234/v1', 'local')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(localResponse(['llama3.1:8b'])))
    await fetchLocalStatus()

    expect(JSON.parse(localStorage.getItem('pwb_local_models_cache'))).toMatchObject({
      base: 'http://localhost:1234/v1', models: ['llama3.1:8b'],
    })
    expect(readCachedLocalModels()).toEqual(['llama3.1:8b'])
    expect(readCachedLocalModels('http://localhost:1234/v1/')).toEqual(['llama3.1:8b'])
    setEndpoint('http://localhost:11434/v1', 'local')
    expect(readCachedLocalModels()).toEqual([])
  })

  it('ignores legacy cache entries without an endpoint', () => {
    localStorage.setItem('pwb_local_models_cache', JSON.stringify({ at: 1, models: ['qwen2.5:7b'] }))
    expect(readCachedLocalModels()).toEqual([])
  })

  it('does not cache a response after the endpoint changes without another status request', async () => {
    let resolveStatus
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { resolveStatus = resolve })))
    const request = fetchLocalStatus()
    setEndpoint('http://localhost:1234/v1', 'local')

    resolveStatus(localResponse(['qwen2.5:7b']))
    await request

    expect(localStorage.getItem('pwb_local_models_cache')).toBeNull()
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it.each([false, true])('does not let an older response replace a newer cache with endpoint change %s', async (switchEndpoint) => {
    let resolveOldStatus
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOldStatus = resolve }))
      .mockResolvedValueOnce(localResponse(['llama3.1:8b'])))
    const oldRequest = fetchLocalStatus()
    if (switchEndpoint) setEndpoint('http://localhost:1234/v1', 'local')
    await fetchLocalStatus()
    resolveOldStatus(localResponse(['qwen2.5:7b']))
    await oldRequest

    expect(readCachedLocalModels()).toEqual(['llama3.1:8b'])
    expect(JSON.parse(localStorage.getItem('pwb_local_models_cache'))).toMatchObject({
      base: switchEndpoint ? 'http://localhost:1234/v1' : 'http://localhost:11434/v1',
      models: ['llama3.1:8b'],
    })
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })
})
