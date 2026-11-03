import { describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { colorModeFor, colorModeScript } from './colorMode.js'
import { builderInteractiveJs } from './htmlRuntime.js'

describe('review: carry an explicit return to the designed palette', () => {
  it('opens the next page light when the owner defaults to dark and storage is unavailable', () => {
    const page = { id: 'home', name: 'Home', components: [{ id: 'switch', type: 'themeToggle', props: {} }] }
    const mode = colorModeFor({ theme: { backgroundColor: '#ffffff' }, colorMode: { start: 'dark' }, pages: [page] }, page)
    const windows = []
    function visit(url) {
      const dom = new JSDOM('<!doctype html><html><head></head><body><button data-pwb-theme-toggle>x</button><a id="about" href="/about/">About</a></body></html>', { url, runScripts: 'outside-only' })
      const { window } = dom
      windows.push(window)
      Object.defineProperty(window, 'localStorage', { get() { throw new window.DOMException('sandboxed', 'SecurityError') } })
      window.matchMedia = () => ({ matches: false })
      window.eval(colorModeScript(mode))
      window.eval(builderInteractiveJs())
      window.document.dispatchEvent(new window.Event('DOMContentLoaded'))
      return window
    }
    try {
      const first = visit('https://example.test/')
      first.document.querySelector('button').click()
      expect(first.document.documentElement.getAttribute('data-pwb-theme')).toBe('light')
      const link = first.document.getElementById('about')
      link.addEventListener('click', (event) => event.preventDefault())
      link.dispatchEvent(new first.MouseEvent('click', { bubbles: true, cancelable: true }))
      expect(link.href).toBe('https://example.test/about/?pwb-theme=light')
      const next = visit(link.href)
      expect(next.document.documentElement.getAttribute('data-pwb-theme')).toBe('light')
    } finally {
      windows.forEach((window) => window.close())
    }
  })
})
