import { afterEach, describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { colorModeFor, colorModeScript } from './colorMode.js'
import { builderInteractiveJs } from './htmlRuntime.js'

const windows = []
afterEach(() => windows.splice(0).forEach((window) => window.close()))
function visit(url, { chosen = '', stored = null } = {}) {
  const page = { id: 'home', components: [{ id: 'toggle', type: 'themeToggle', props: {} }] }
  const mode = colorModeFor({ theme: { backgroundColor: '#ffffff' }, colorMode: { start: 'light' }, pages: [page] }, page)
  const attribute = chosen ? ` data-pwb-chosen="${chosen}"` : ''
  const dom = new JSDOM(`<!doctype html><html><head><script data-pwb-color-mode${attribute}>${colorModeScript(mode)}</script></head><body><a id="local" href="/s/site-a/about/">About</a><a id="other" href="/s/site-b/">Another site</a></body></html>`, {
    url, runScripts: 'dangerously',
    beforeParse(window) {
      if (stored) window.localStorage.setItem('pwb-color-mode', stored)
      else Object.defineProperty(window, 'localStorage', { get() { throw new window.DOMException('sandboxed', 'SecurityError') } })
      window.matchMedia = () => ({ matches: false })
    },
  })
  const { window } = dom
  windows.push(window)
  window.eval(builderInteractiveJs())
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'))
  return window
}
const palette = (window) => window.document.documentElement.getAttribute('data-pwb-theme')
function clickLink(window, id) {
  const link = window.document.getElementById(id)
  link.addEventListener('click', (event) => event.preventDefault())
  link.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
  return link.href
}

describe('review: stage 2 keeps the preference local and parses it consistently', () => {
  it('carries a choice within site A without injecting it into site B', () => {
    const window = visit('https://builder.test/s/site-a/?pwb-theme=dark')
    expect(clickLink(window, 'local')).toBe('https://builder.test/s/site-a/about/?pwb-theme=dark')
    expect(clickLink(window, 'other')).toBe('https://builder.test/s/site-b/')
  })

  it.each([
    ['pwb-theme=%64ark', 'dark'],
    ['pwb-theme=light&pwb-theme=dark', 'dark'],
    ['pwb-theme=dark&pwb-theme=light', 'light'],
  ])('agrees with the real server response for %s', (query, serverChoice) => {
    // backend-proof.py independently verifies these server choices and that
    // the first response has no data-pwb-chosen attribute.
    const first = visit(`https://builder.test/s/site-a/?${query}`)
    const again = visit('https://builder.test/s/site-a/', { chosen: serverChoice })
    expect([palette(first), palette(again)]).toEqual([serverChoice, serverChoice])
  })

  it('keeps usable local storage ahead of a server attribute', () => {
    expect(palette(visit('https://builder.test/s/site-a/', { stored: 'light', chosen: 'dark' }))).toBe('light')
  })
})
