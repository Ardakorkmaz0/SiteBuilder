// The assistant writes in the language the user asks for, not in English
// whatever happens; it follows the user's own settings (language, creativity,
// standing instructions); and the answers it cannot use (thinking, a page cut
// off at the length limit, a stopped request) are handled as such.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  aiEditComponent,
  isAbortError,
  runAiHtmlPrompt,
  runAiPrompt,
  stripThinking,
  testAiConnection,
} from './aiAssistant.js'
import { SYSTEM_PROMPT } from './aiSystemPrompt.js'
import { buildWizardPrompt } from './aiWizard.js'
import { aiSystemAddendum, getAiPreferences, setAiPreferences, temperatureFor } from './aiPreferences.js'
import { useEditorStore } from '../store/editorStore.js'

let bodies = []

function answer(json, { status = 200 } = {}) {
  globalThis.fetch = vi.fn(async (url, options = {}) => {
    bodies.push(options.body ? JSON.parse(options.body) : null)
    return { ok: status < 400, status, json: async () => json, text: async () => JSON.stringify(json) }
  })
}

beforeEach(() => {
  bodies = []
  localStorage.clear()
  localStorage.setItem('pwb_ai_provider', 'groq')
  localStorage.setItem('pwb_groq_key', 'test-key')
  useEditorStore.getState().loadSchema({
    theme: {},
    pages: [{ id: 'page_home', name: 'Ana Sayfa', language: 'tr', components: [] }],
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

const systemOf = (body) => body.messages.find((m) => m.role === 'system').content

describe('the language the assistant writes in', () => {
  it('is no longer forced to English', () => {
    expect(SYSTEM_PROMPT).not.toMatch(/must be in English/i)
    expect(buildWizardPrompt({ description: 'Kadıköy\'de bir kahveci' })).not.toMatch(/English/)
  })

  it('follows the request by default, and talks to the user in the editor\'s language', async () => {
    localStorage.setItem('pwb_language', 'tr')
    answer({ choices: [{ message: { content: 'Merhaba!' } }] })

    await runAiPrompt('neler yapabilirsin?', { maxRounds: 1 })

    const system = systemOf(bodies[0])
    expect(system).toContain('LANGUAGE:')
    expect(system).toContain('in Turkish, the language of their editor')
    expect(system).toContain('use the language the request is written in')
    expect(system).toContain('match the language of that copy')
    // The page's own language setting is in what the model sees.
    expect(bodies[0].messages.at(-1).content).toContain('"language": "tr"')
  })

  it('writes in the language the user fixed in the settings', () => {
    setAiPreferences({ contentLanguage: 'tr' })
    expect(aiSystemAddendum()).toMatch(/copy a visitor reads .* in Turkish, whatever language/)
  })

  it('reaches the HTML generation and the one-element edit too', async () => {
    answer({ choices: [{ message: { content: '<!DOCTYPE html><html lang="tr"><body>Merhaba</body></html>' }, finish_reason: 'stop' }] })
    await runAiHtmlPrompt('bir kafe sitesi')
    expect(systemOf(bodies[0])).toContain('LANGUAGE:')
    expect(systemOf(bodies[0])).not.toMatch(/must be in English/i)

    answer({ choices: [{ message: { content: '{"props":{"text":"Merhaba"}}' } }] })
    await aiEditComponent({ type: 'button', props: { text: 'Gönder' } }, 'daha samimi yaz')
    expect(systemOf(bodies.at(-1))).toContain('language of the component\'s current text')
    expect(systemOf(bodies.at(-1))).not.toMatch(/must be in English/i)
  })
})

describe('the user\'s own settings', () => {
  it('keep what they set, and drop what is not a setting', () => {
    setAiPreferences({ creativity: 'wild', contentLanguage: 'xx', instructions: 'a'.repeat(1200), failover: 'no' })
    expect(getAiPreferences()).toEqual({ contentLanguage: 'auto', creativity: 'balanced', instructions: 'a'.repeat(1000), failover: true })
  })

  it('turn creativity into the temperature of each kind of call', async () => {
    expect(temperatureFor('tools')).toBe(0.2)
    setAiPreferences({ creativity: 'creative' })
    answer({ choices: [{ message: { content: 'Tamam.' } }] })
    await runAiPrompt('neler yapabilirsin?', { maxRounds: 1 })
    expect(bodies[0].temperature).toBe(0.4)
  })

  it('send the standing instructions with every request', async () => {
    setAiPreferences({ instructions: 'Hep resmi bir dil kullan.' })
    answer({ choices: [{ message: { content: 'Tamam.' } }] })
    await runAiPrompt('neler yapabilirsin?', { maxRounds: 1 })
    expect(systemOf(bodies[0])).toContain('STANDING INSTRUCTIONS')
    expect(systemOf(bodies[0])).toContain('Hep resmi bir dil kullan.')
  })
})

describe('answers the assistant cannot use as they are', () => {
  it('drops a reasoning model\'s thinking', () => {
    expect(stripThinking('<think>Let me plan {"a":1}</think>\n{"props":{}}')).toBe('{"props":{}}')
    expect(stripThinking('Done.<think>half a thought')).toBe('Done.')
  })

  it('does not take a page cut off at the length limit for the page', async () => {
    answer({ choices: [{ message: { content: '<!DOCTYPE html><html><body><header>Top half' }, finish_reason: 'length' }] })
    await expect(runAiHtmlPrompt('bir kafe sitesi')).rejects.toThrow(/cut off before the page was complete/)
  })

  it('stops when the user stops it, and tries no other provider', async () => {
    localStorage.setItem('pwb_gemini_key', 'test-key')
    const controller = new AbortController()
    globalThis.fetch = vi.fn((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    }))

    const run = runAiPrompt('add a heading', { maxRounds: 2, signal: controller.signal })
    controller.abort()

    const err = await run.catch((e) => e)
    expect(isAbortError(err)).toBe(true)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('says a dropped connection in words the failover understands', async () => {
    localStorage.setItem('pwb_gemini_key', 'test-key')
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes('groq')) throw new TypeError('Failed to fetch')
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Merhaba!' }] } }] }) }
    })
    const result = await runAiPrompt('neler yapabilirsin?', { maxRounds: 1 })
    expect(result.text).toBe('Merhaba!')
  })

  it('carries a Turkish-ready key on the errors it shows', async () => {
    answer({ error: { message: 'Invalid API Key' } }, { status: 401 })
    const err = await runAiPrompt('add a heading', { maxRounds: 1 }).catch((e) => e)
    expect(err.i18n.key).toBe('Your {provider} API key was rejected ({status}). Open the AI settings and paste a fresh key.')
    expect(err.message).toBe('Your Groq · Llama API key was rejected (401). Open the AI settings and paste a fresh key.')
  })
})

describe('the connection test', () => {
  it('asks for one short answer and reports it', async () => {
    answer({ choices: [{ message: { content: 'OK' } }] })
    const result = await testAiConnection('groq')
    expect(result.ok).toBe(true)
    expect(bodies[0].messages).toHaveLength(2)
    expect(bodies[0].messages[0].content).not.toContain('LANGUAGE:')
  })

  it('reports the provider\'s refusal', async () => {
    answer({ error: { message: 'Invalid API Key' } }, { status: 401 })
    const result = await testAiConnection('groq')
    expect(result.ok).toBe(false)
    expect(result.error.message).toMatch(/rejected \(401\)/)
  })
})

describe('a model that takes too long', () => {
  it('is said as such, and the next provider is tried', async () => {
    localStorage.setItem('pwb_gemini_key', 'test-key')
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes('groq')) return { ok: false, status: 504, text: async () => '{"error":{"message":"timeout"}}' }
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Merhaba!' }] } }] }) }
    })
    expect((await runAiPrompt('neler yapabilirsin?', { maxRounds: 1 })).text).toBe('Merhaba!')

    localStorage.removeItem('pwb_gemini_key')
    const err = await runAiPrompt('neler yapabilirsin?', { maxRounds: 1 }).catch((e) => e)
    expect(err.message).toBe('Groq · Llama took too long to answer. Try again, or ask for something smaller.')
  })
})
