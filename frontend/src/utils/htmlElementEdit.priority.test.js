import { beforeEach, describe, expect, it } from 'vitest'
import { applyElementPatch, applyMobileElementPatch, clearMobileElementStyles } from './htmlElementEdit.js'
import { serializeDocument } from './htmlPlacement.js'

const IMPORTED_CSS = '@layer template { #hero { font-size: 40px !important; } }'
const OVERRIDE_STYLE = 'style[data-pwb-responsive-overrides]'

beforeEach(() => {
  document.head.innerHTML = `<style id="imported-css">${IMPORTED_CSS}</style>`
  document.body.innerHTML = '<h1 id="hero">Imported heading</h1>'
})

describe('responsive override cascade priority', () => {
  it.each(['stylesheet', 'StyleSheet', 'STYLESHEET', 'alternate StyleSheet'])('preserves the early encoding declaration before a %s link', (rel) => {
    document.head.innerHTML = `<meta charset="utf-8"><title>Encoding</title><link rel="${rel}" href="/template.css"><style>#hero{font-size:40px!important}</style>`
    applyMobileElementPatch(document.getElementById('hero'), { fontSize: 28 })

    const style = document.querySelector(OVERRIDE_STYLE)
    const children = [...document.head.children]
    expect(document.head.firstElementChild.tagName).toBe('META')
    expect(children.indexOf(style)).toBeLessThan(children.indexOf(document.querySelector('link')))
    expect(serializeDocument(document).indexOf('charset="utf-8"')).toBeLessThan(1024)
  })

  it('reserves an earlier important layer than the imported stylesheet', () => {
    const hero = document.getElementById('hero')
    applyElementPatch(hero, { fontSize: 52 })
    applyMobileElementPatch(hero, { fontSize: 28 })

    const style = document.querySelector(OVERRIDE_STYLE)
    const layer = style.sheet.cssRules[0]
    // Important declarations in the first layer beat later layers and
    // unlayered !important, without inflating selectors to beat arbitrary IDs.
    expect(document.head.querySelector('style') === style).toBe(true)
    expect(layer.constructor.name).toBe('CSSLayerBlockRule')
    const pc = [...layer.cssRules].find((rule) => rule.selectorText?.includes('[data-pwb-pc-font-size]'))
    const phoneMedia = [...layer.cssRules].find((rule) => rule.conditionText === '(max-width: 767px)')
    const phone = [...phoneMedia.cssRules].find((rule) => rule.selectorText?.includes('[data-pwb-mobile-font-size]'))
    expect(pc.style.getPropertyValue('font-size')).toBe('var(--pwb-pc-font-size)')
    expect(phone.style.getPropertyValue('font-size')).toBe('var(--pwb-mobile-font-size)')
    // jsdom's layer CSSOM loses !important on var() declarations. Check the
    // emitted source here; the browser spec verifies its actual cascade.
    expect(style.textContent).toContain('font-size: var(--pwb-pc-font-size) !important')
    expect(style.textContent).toContain('font-size: var(--pwb-mobile-font-size) !important')
    expect([...layer.cssRules].indexOf(pc)).toBeLessThan([...layer.cssRules].indexOf(phoneMedia))
    expect(document.getElementById('imported-css').textContent).toBe(IMPORTED_CSS)
  })

  it('upgrades an older saved override sheet before the authored layer order', () => {
    const oldStyle = document.createElement('style')
    oldStyle.setAttribute('data-pwb-responsive-overrides', '')
    oldStyle.textContent = '@media (max-width: 767px) { [data-pwb-mobile-font-size] { font-size: var(--pwb-mobile-font-size) !important; } }'
    document.head.appendChild(oldStyle)

    applyMobileElementPatch(document.getElementById('hero'), { fontSize: 28 })

    expect(document.querySelectorAll(OVERRIDE_STYLE)).toHaveLength(1)
    expect(document.head.querySelector('style') === oldStyle).toBe(true)
    expect(oldStyle.sheet.cssRules[0].constructor.name).toBe('CSSLayerBlockRule')
    expect(document.getElementById('imported-css').textContent).toBe(IMPORTED_CSS)
  })

  it('keeps the priority layer and separate values through serialization, then removes it on reset', () => {
    const hero = document.getElementById('hero')
    applyElementPatch(hero, { fontSize: 52 })
    applyMobileElementPatch(hero, { fontSize: 28 })

    const restored = new DOMParser().parseFromString(serializeDocument(document), 'text/html')
    const savedStyle = restored.querySelector(OVERRIDE_STYLE)
    const savedHero = restored.getElementById('hero')
    expect(restored.head.querySelector('style') === savedStyle).toBe(true)
    expect(savedStyle.textContent.trimStart()).toMatch(/^@layer\s+/)
    expect(savedHero.style.getPropertyValue('--pwb-pc-font-size')).toBe('52px')
    expect(savedHero.style.getPropertyValue('--pwb-mobile-font-size')).toBe('28px')

    clearMobileElementStyles(savedHero)

    expect(savedHero.style.getPropertyValue('font-size')).toBe('52px')
    expect(savedHero.style.getPropertyPriority('font-size')).toBe('important')
    expect(restored.querySelector(OVERRIDE_STYLE)).toBeNull()
    expect(restored.getElementById('imported-css').textContent).toBe(IMPORTED_CSS)
  })
})
