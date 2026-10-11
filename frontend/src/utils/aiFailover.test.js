// When the first provider runs out of quota part-way through a turn, the next
// one starts the same request over. It has to start from the page as the user
// left it: the first provider's half of the work was still on the canvas, the
// second one did the whole request on top of it, and the proposal came back
// with everything the first had managed in it twice.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runAiPrompt } from './aiAssistant.js'
import { useEditorStore, selectCurrentPage } from '../store/editorStore.js'

const page = () => selectCurrentPage(useEditorStore.getState())

let geminiCalls = 0
let otherCalls = 0

beforeEach(() => {
  localStorage.setItem('pwb_ai_provider', 'gemini')
  localStorage.setItem('pwb_gemini_key', 'test-key')
  localStorage.setItem('pwb_groq_key', 'test-key')
  useEditorStore.getState().loadSchema({
    theme: {},
    pages: [{ id: 'page_home', name: 'Home', components: [], background: '#ffffff' }],
  })
  geminiCalls = 0
  otherCalls = 0
  // No real waiting for the retry delays.
  vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn) => { fn(); return 0 })
  globalThis.fetch = vi.fn(async (url) => {
    if (String(url).includes('generativelanguage')) {
      geminiCalls += 1
      // Round one lands a heading; after that the quota is gone.
      if (geminiCalls === 1) {
        return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ functionCall: { name: 'addComponent', args: { type: 'heading' } } }] } }] }) }
      }
      return { ok: false, status: 429, text: async () => JSON.stringify({ error: { message: 'Quota exceeded' } }) }
    }
    otherCalls += 1
    if (otherCalls === 1) {
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { tool_calls: [{ function: { name: 'addComponent', arguments: JSON.stringify({ type: 'heading' }) } }] } }] }),
      }
    }
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Added the heading.' } }] }) }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('a provider that gives out part-way through a turn', () => {
  it('leaves nothing behind for the provider that takes over', async () => {
    const result = await runAiPrompt('add a heading', { maxRounds: 4 })

    expect(geminiCalls).toBeGreaterThan(1)
    expect(otherCalls).toBeGreaterThan(0)
    expect(page().components.filter((c) => c.type === 'heading')).toHaveLength(1)
    expect(result.text).toContain('Added the heading.')
  })
})
