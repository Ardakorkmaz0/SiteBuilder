// The one-block edit in the properties panel: one answer from the model,
// applied to the selected block when the user accepts it. There is no second
// round to correct the answer in, so what the page cannot show is left out
// before the user is told how many fields are ready.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aiEditComponent } from './aiAssistant.js'

let bodies = []

function answer(content) {
  globalThis.fetch = vi.fn(async (url, options = {}) => {
    bodies.push(options.body ? JSON.parse(options.body) : null)
    const json = { choices: [{ message: { content } }] }
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

const button = { id: 'b', type: 'button', props: { text: 'Buy', href: '#buy', icon: '' }, styles: { color: '#ffffff' } }

describe('the answer to a one-block edit', () => {
  it('keeps what the page can show and leaves the rest out', async () => {
    answer(JSON.stringify({
      styles: { background: '#ff0000', 'font-size': '18px', justifyContent: 'center', color: { r: 255 } },
      props: { label: 'Buy now', text: 'Buy now', icon: 'sparkle-unicorn' },
    }))

    const patch = await aiEditComponent(button, 'make it red and friendlier')

    expect(patch).toEqual({
      styles: { backgroundColor: '#ff0000', fontSize: '18px' },
      props: { text: 'Buy now' },
    })
  })

  it('is no change when nothing in it can be shown', async () => {
    answer(JSON.stringify({ styles: ['red'], props: { label: 'Buy now', colour: 'red' } }))

    expect(await aiEditComponent(button, 'make it red')).toEqual({ styles: {}, props: {} })
  })
})

describe('what a one-block edit sends', () => {
  it('names the props the block has and the styles the page draws', async () => {
    answer('{}')

    await aiEditComponent(button, 'make it red')

    expect(sent()).toContain('Props a button has: text, href, icon')
    expect(sent()).toContain('backgroundColor, backgroundImage, color')
  })

  it('leaves an uploaded picture out, and never writes its stand-in back', async () => {
    const image = { id: 'i', type: 'image', props: { src: `data:image/png;base64,${'QUJD'.repeat(2000)}`, alt: 'A red bike' }, styles: {} }
    answer(JSON.stringify({ props: { src: '(an uploaded file)', alt: 'A red bicycle' } }))

    const patch = await aiEditComponent(image, 'better alt text')

    expect(sent()).not.toContain('QUJDQUJD')
    expect(sent()).toContain('A red bike')
    expect(patch).toEqual({ styles: {}, props: { alt: 'A red bicycle' } })
  })
})
