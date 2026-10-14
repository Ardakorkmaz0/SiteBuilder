// What the server's superadmin switched off is gone from the editor: from the
// provider list, from the active provider, from the failover, and from the
// suggested models. And the local runtime, which needs no key, no longer
// counts as "ready" on a server that refuses it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OPEN_POLICY, normaliseAiPolicy, readAiPolicy, setAiPolicy, useAiPolicyStore } from './aiPolicy.js'
import {
  aiAvailable,
  availableProviders,
  getModel,
  getModelsFor,
  getProvider,
  setProvider,
} from './aiProviders.js'
import { runAiPrompt } from './aiAssistant.js'
import { useEditorStore } from '../store/editorStore.js'

const PUBLIC_SERVER = { enabled: true, providers: ['openrouter', 'groq', 'gemini', 'nvidia'], hidden_models: {}, default_provider: '', notice: '' }

beforeEach(() => {
  localStorage.clear()
  useAiPolicyStore.setState({ policy: OPEN_POLICY })
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  useAiPolicyStore.setState({ policy: OPEN_POLICY })
})

describe('the server policy', () => {
  it('leaves everything open until the server has answered', () => {
    expect(readAiPolicy().loaded).toBe(false)
    // …all but the local runtime, which only the server can say it serves.
    expect(availableProviders().map((p) => p.id)).toEqual(['openrouter', 'groq', 'gemini', 'nvidia'])
    setAiPolicy({ ...PUBLIC_SERVER, providers: ['openrouter', 'local'] })
    expect(availableProviders().map((p) => p.id)).toEqual(['openrouter', 'local'])
  })

  it('reads what the server sends, and ignores what it cannot use', () => {
    expect(normaliseAiPolicy({ enabled: false, providers: ['groq', 7], hidden_models: { groq: ['a', 1] }, notice: ' Bakım ' }))
      .toEqual({ loaded: true, enabled: false, providers: ['groq'], hiddenModels: { groq: ['a'] }, defaultProvider: '', notice: 'Bakım' })
    expect(normaliseAiPolicy(null)).toBe(OPEN_POLICY)
  })

  it('takes a switched-off provider out of the list and away from the user who had chosen it', () => {
    setProvider('groq')
    localStorage.setItem('pwb_gemini_key', 'k')
    setAiPolicy({ ...PUBLIC_SERVER, providers: ['openrouter', 'gemini'] })

    expect(availableProviders().map((p) => p.id)).toEqual(['openrouter', 'gemini'])
    // The provider they already have a key for, before the first in the list.
    expect(getProvider()).toBe('gemini')
    setProvider('groq')
    expect(getProvider()).toBe('gemini')
  })

  it('starts a new user on the server\'s start provider', () => {
    setAiPolicy({ ...PUBLIC_SERVER, default_provider: 'nvidia' })
    expect(getProvider()).toBe('nvidia')
  })

  it('has nothing to offer when the assistant is switched off', () => {
    setAiPolicy({ ...PUBLIC_SERVER, enabled: false, providers: [] })
    expect(aiAvailable()).toBe(false)
    expect(availableProviders()).toEqual([])
  })

  it('hides a suggested model, and moves a user who had picked it to one still offered', () => {
    localStorage.setItem('pwb_groq_model', 'llama-3.1-8b-instant')
    localStorage.setItem('pwb_openrouter_model', 'qwen/qwen3-coder:free')
    setAiPolicy({
      ...PUBLIC_SERVER,
      hidden_models: { groq: ['llama-3.1-8b-instant'], openrouter: ['qwen/qwen3-coder:free'] },
    })

    expect(getModelsFor('groq').map((m) => m.id)).not.toContain('llama-3.1-8b-instant')
    expect(getModel('groq')).toBe('llama-3.3-70b-versatile')
    expect(getModel('openrouter')).toBe(getModelsFor('openrouter')[0].id)
  })
})

describe('the failover on a server that refuses the local runtime', () => {
  it('goes from a provider out of quota to the next real one, never to the local runtime', async () => {
    setAiPolicy(PUBLIC_SERVER)
    setProvider('openrouter')
    localStorage.setItem('pwb_openrouter_key', 'k')
    localStorage.setItem('pwb_gemini_key', 'k')
    useEditorStore.getState().loadSchema({ theme: {}, pages: [{ id: 'page_home', name: 'Home', components: [] }] })
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn) => { fn(); return 0 })
    const asked = []
    globalThis.fetch = vi.fn(async (url) => {
      asked.push(String(url))
      if (String(url).includes('openrouter')) {
        return { ok: false, status: 429, text: async () => '{"error":{"message":"Rate limit exceeded"}}' }
      }
      if (String(url).includes('/ai/local/')) {
        return { ok: false, status: 403, text: async () => '{"detail":"Local AI is only available when running the app on your own machine."}' }
      }
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Merhaba!' }] } }] }) }
    })

    const result = await runAiPrompt('what can you do?', { maxRounds: 2 })

    expect(result.text).toBe('Merhaba!')
    expect(result.switched).toEqual({ from: 'OpenRouter · Qwen3 80B', to: 'Google Gemini' })
    expect(asked.some((url) => url.includes('/ai/local/'))).toBe(false)
    expect(asked.some((url) => url.includes('generativelanguage'))).toBe(true)
  })

  it('stays on the chosen provider when the user switched failover off', async () => {
    setAiPolicy(PUBLIC_SERVER)
    setProvider('openrouter')
    localStorage.setItem('pwb_openrouter_key', 'k')
    localStorage.setItem('pwb_gemini_key', 'k')
    localStorage.setItem('pwb_ai_prefs', JSON.stringify({ failover: false }))
    useEditorStore.getState().loadSchema({ theme: {}, pages: [{ id: 'page_home', name: 'Home', components: [] }] })
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn) => { fn(); return 0 })
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 429, text: async () => '{"error":{"message":"Rate limit exceeded"}}' }))

    await expect(runAiPrompt('add a heading', { maxRounds: 2 })).rejects.toThrow(/quota hit/)
    expect(globalThis.fetch.mock.calls.every(([url]) => String(url).includes('openrouter'))).toBe(true)
    expect(getProvider()).toBe('openrouter')
  })
})
