// NVIDIA's API refuses calls from a browser, so this provider is reached
// through the app's own server. Two credentials travel and must not be mixed
// up: the app's sign-in goes in the Authorization header (the relay requires
// it), and the user's NVIDIA key rides in the body, for the relay to pass on.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AI_PROVIDERS, aiEditComponent, fetchNvidiaModels, runAiHtmlPrompt, runAiPrompt } from './aiAssistant.js'
import { getModel, getModelsFor, readCachedNvidiaModels } from './aiProviders.js'
import { useEditorStore } from '../store/editorStore.js'
import { useAuthStore } from '../store/authStore.js'

const NVIDIA_KEY = 'nvapi-test-key-0123456789' // not a real key
const APP_TOKEN = 'app-session-token'
let requests = []

function answerWith(...answers) {
  const queue = [...answers]
  globalThis.fetch = vi.fn(async (url, options = {}) => {
    requests.push({ url: String(url), headers: options.headers || {}, body: options.body ? JSON.parse(options.body) : null })
    const next = queue.shift() || { ok: true, json: { choices: [{ message: { content: 'Done.' } }] } }
    return {
      ok: next.ok !== false,
      status: next.status || 200,
      json: async () => next.json,
      text: async () => JSON.stringify(next.json || {}),
    }
  })
}

beforeEach(() => {
  requests = []
  localStorage.clear()
  localStorage.setItem('pwb_ai_provider', 'nvidia')
  localStorage.setItem('pwb_nvidia_key', NVIDIA_KEY)
  useAuthStore.setState({ token: APP_TOKEN, user: { id: 1, username: 'me' } })
  useEditorStore.getState().loadSchema({
    theme: {},
    pages: [{ id: 'page_home', name: 'Home', components: [], background: '#ffffff' }],
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('the NVIDIA provider', () => {
  it('is offered, with a key of its own and a model to start from', () => {
    const nvidia = AI_PROVIDERS.find((p) => p.id === 'nvidia')
    expect(nvidia).toMatchObject({ relayed: true, customModel: true })
    expect(getModelsFor('nvidia').length).toBeGreaterThan(0)
    expect(getModel('nvidia')).toBe(getModelsFor('nvidia')[0].id)
  })

  it('sends a canvas request through the relay: app sign-in in the header, NVIDIA key in the body', async () => {
    answerWith(
      { json: { choices: [{ message: { tool_calls: [{ function: { name: 'addComponent', arguments: '{"type":"heading"}' } }] } }] } },
      { json: { choices: [{ message: { content: 'Added a heading.' } }] } },
    )

    const result = await runAiPrompt('add a heading', { maxRounds: 3 })

    expect(result.text).toContain('Added a heading.')
    expect(useEditorStore.getState().schema.pages[0].components.map((c) => c.type)).toEqual(['heading'])
    for (const request of requests) {
      expect(request.url).toMatch(/\/api\/ai\/nvidia\/chat\/$/)
      expect(request.url).not.toContain('nvidia.com')
      expect(request.headers.Authorization).toBe(`Token ${APP_TOKEN}`)
      expect(request.body._apiKey).toBe(NVIDIA_KEY)
      expect(request.body.model).toBe(getModel('nvidia'))
      expect(Array.isArray(request.body.tools)).toBe(true)
    }
  })

  it('sends an HTML-page request the same way', async () => {
    answerWith({ json: { choices: [{ message: { content: '<!DOCTYPE html><html><body><h1>Hi</h1></body></html>' } }] } })

    const { html, providerUsed } = await runAiHtmlPrompt('a one-line page')

    expect(providerUsed).toBe('nvidia')
    expect(html).toContain('<h1>Hi</h1>')
    expect(requests[0].url).toMatch(/\/api\/ai\/nvidia\/chat\/$/)
    expect(requests[0].headers.Authorization).toBe(`Token ${APP_TOKEN}`)
    expect(requests[0].body._apiKey).toBe(NVIDIA_KEY)
  })

  it('sends a single-component edit the same way', async () => {
    answerWith({ json: { choices: [{ message: { content: '{"styles":{"color":"#ff0000"},"props":{}}' } }] } })

    await aiEditComponent({ id: 'h1', type: 'heading', props: { text: 'Hi' }, styles: {} }, 'make it red')

    expect(requests[0].url).toMatch(/\/api\/ai\/nvidia\/chat\/$/)
    expect(requests[0].headers.Authorization).toBe(`Token ${APP_TOKEN}`)
    expect(requests[0].body._apiKey).toBe(NVIDIA_KEY)
  })

  it('says the model is gone, not that the key is wrong, when NVIDIA no longer offers it', async () => {
    answerWith({ ok: false, status: 404, json: { status: 404, title: 'Not Found', detail: 'Function not found' } })
    await expect(runAiHtmlPrompt('a page')).rejects.toThrow(/does not offer the selected model/)
  })

  it('asks for the app sign-in, not a new key, when the relay turns the caller away', async () => {
    answerWith({ ok: false, status: 401, json: { detail: 'Authentication credentials were not provided.', code: 'not_authenticated' } })
    await expect(runAiHtmlPrompt('a page')).rejects.toThrow(/Sign in to this app again/)
  })

  // What NVIDIA really answers for a bad key (seen through the relay).
  it('asks for a fresh key when NVIDIA rejects the key', async () => {
    answerWith({ ok: false, status: 403, json: { status: 403, title: 'Forbidden', detail: 'Authorization failed' } })
    await expect(runAiHtmlPrompt('a page')).rejects.toThrow(/API key was rejected \(403\)/)
  })
})

describe('the live NVIDIA model list', () => {
  it('comes through the relay with the app sign-in and is remembered', async () => {
    answerWith({ json: { ok: true, models: ['moonshotai/kimi-k3', 'z-ai/glm-5.3'] } })

    const first = await fetchNvidiaModels(APP_TOKEN)
    const second = await fetchNvidiaModels(APP_TOKEN)

    expect(first).toEqual(['moonshotai/kimi-k3', 'z-ai/glm-5.3'])
    expect(second).toEqual(first)
    expect(requests).toHaveLength(1)
    expect(requests[0].url).toMatch(/\/api\/ai\/nvidia\/models\/$/)
    expect(requests[0].headers.Authorization).toBe(`Token ${APP_TOKEN}`)
    expect(readCachedNvidiaModels()).toEqual(first)
  })

  it('is simply empty when it cannot be had', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('offline') })
    expect(await fetchNvidiaModels(APP_TOKEN)).toEqual([])
  })
})
