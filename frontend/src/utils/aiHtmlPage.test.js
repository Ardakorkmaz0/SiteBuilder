// What the assistant is given of an HTML page, and what it may put back.
//
// An uploaded page carries its pictures inside itself as data: URIs, and the
// page used to be cut at 30,000 characters without a word: one picture was
// enough for the model to see no more than the <head>, and its answer, taken
// as the whole page, dropped everything below the cut.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runAiHtmlPrompt, setAsideEmbeddedFiles } from './aiAssistant.js'

let bodies = []

function answer(content) {
  globalThis.fetch = vi.fn(async (url, options = {}) => {
    bodies.push(JSON.parse(options.body))
    const json = { choices: [{ message: { content }, finish_reason: 'stop' }] }
    return { ok: true, status: 200, json: async () => json, text: async () => JSON.stringify(json) }
  })
}

const sent = () => bodies.at(-1).messages.at(-1).content

beforeEach(() => {
  bodies = []
  localStorage.clear()
  localStorage.setItem('pwb_ai_provider', 'groq')
  localStorage.setItem('pwb_groq_key', 'test-key')
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

const picture = `data:image/png;base64,${'iVBORw0KGgo'.repeat(4000)}`
const font = `data:font/woff2;base64,${'d09GMgABAAAA'.repeat(3000)}`
const page = (body, head = '') => `<!DOCTYPE html><html><head>${head}</head><body>${body}</body></html>`

describe('a page that carries its files inside itself', () => {
  it('is sent without them, and gets them back where the model kept them', async () => {
    const current = page(
      `<img src="${picture}" alt="Bike"><p>Hello</p><img src="${picture}" alt="Again">`,
      `<style>@font-face{font-family:X;src:url(${font})}</style>`,
    )
    answer(page('<img src="pwb-embedded-file-2" alt="Bike"><p>Merhaba</p>', '<style>@font-face{font-family:X;src:url(pwb-embedded-file-1)}</style>'))

    const { html } = await runAiHtmlPrompt('translate to Turkish', { currentHtml: current })

    expect(sent()).not.toContain('iVBORw0KGgo')
    expect(sent()).not.toContain('d09GMgABAAAA')
    expect(sent()).toContain('<img src="pwb-embedded-file-2" alt="Bike"><p>Hello</p><img src="pwb-embedded-file-2" alt="Again">')
    expect(sent()).toContain('Keep each one exactly as written')
    expect(html).toBe(page(`<img src="${picture}" alt="Bike"><p>Merhaba</p>`, `<style>@font-face{font-family:X;src:url(${font})}</style>`))
  })

  it('leaves a short data: URI and a name the model made up as they are', () => {
    const dot = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
    const aside = setAsideEmbeddedFiles(`<img src="${dot}"><img src="${picture}">`)

    expect(aside.html).toBe(`<img src="${dot}"><img src="pwb-embedded-file-1">`)
    expect(aside.restore('<img src="pwb-embedded-file-1"><img src="pwb-embedded-file-7">'))
      .toBe(`<img src="${picture}"><img src="pwb-embedded-file-7">`)
  })
})

describe('a page too long to be rewritten whole', () => {
  it('is refused before anything is sent, not cut', async () => {
    const current = page(`<p>${'word '.repeat(6200)}</p><footer>Contact us</footer>`)

    await expect(runAiHtmlPrompt('make it friendlier', { currentHtml: current }))
      .rejects.toThrow('too long for the assistant to rewrite as a whole (about 30 KB; it can take about 29 KB)')
    expect(bodies).toHaveLength(0)
  })

  it('is sent whole when it fits', async () => {
    const current = page(`<p>${'word '.repeat(5000)}</p><footer>Contact us</footer>`)
    answer(current)

    await runAiHtmlPrompt('make it friendlier', { currentHtml: current })

    expect(sent()).toContain('<footer>Contact us</footer></body></html>')
  })
})
