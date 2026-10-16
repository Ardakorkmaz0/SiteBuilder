import { beforeEach, describe, expect, it } from 'vitest'
import { exportComponent, sharedBlockHtml } from './componentExport.js'
import { applyElementPatch, applyMobileElementPatch } from './htmlElementEdit.js'

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = '<section id="hero"><h1>Responsive heading</h1></section><p class="unrelated">Elsewhere</p>'
})

describe('component exports retain responsive cascade layers', () => {
  it('exports the real editor PC and phone declarations with their own values and scoped selectors', () => {
    const hero = document.getElementById('hero')
    applyElementPatch(hero, { fontSize: 52 })
    applyMobileElementPatch(hero, { fontSize: 28 })

    const out = exportComponent(document, hero, { scope: 'responsive' })

    expect(out.ok).toBe(true)
    // jsdom drops !important from var() declarations in a layer's cssText.
    // Here the contract is that export retains the rules and their scope;
    // the browser spec verifies the generated layer's effective priority.
    expect(out.css).toContain('font-size: var(--pwb-pc-font-size)')
    expect(out.css).toContain('font-size: var(--pwb-mobile-font-size)')
    expect(out.css).toContain('@media (max-width: 767px)')
    expect(out.css).toContain('[data-pwb-shared="responsive"][data-pwb-mobile-font-size]')
    expect(out.html).toContain('--pwb-pc-font-size: 52px')
    expect(out.html).toContain('--pwb-mobile-font-size: 28px')
    const restored = new DOMParser().parseFromString(sharedBlockHtml(out), 'text/html')
    expect(restored.getElementById('hero').getAttribute('data-pwb-shared')).toBe('responsive')
    expect(restored.querySelector('style').textContent).toContain('var(--pwb-mobile-font-size)')
  })

  it('retains nested matching rules, variables, fonts and animations from an authored layer', () => {
    document.head.innerHTML = `<style>
      @layer template {
        :root { --accent: var(--brand); --brand: rebeccapurple; --unused: orange; }
        @font-face { font-family: LayerTypeface; src: url("/type.woff2"); }
        @keyframes layerPulse { from { opacity: 0.5; } to { opacity: 1; } }
        @media (max-width: 767px) {
          #hero { color: var(--accent); font-family: LayerTypeface; animation: layerPulse 2s infinite; }
          .unrelated { color: lime; }
        }
      }
    </style>`

    const out = exportComponent(document, document.getElementById('hero'), { scope: 'layered' })

    expect(out.css).toContain('@layer template')
    expect(out.css).toContain('@media (max-width: 767px)')
    expect(out.css).toContain('[data-pwb-shared="layered"]#hero')
    expect(out.css).toContain('--accent: var(--brand)')
    expect(out.css).toContain('--brand: rebeccapurple')
    expect(out.css).toContain('@font-face')
    expect(out.css).toContain('@keyframes layerPulse')
    expect(out.css).not.toContain('--unused')
    expect(out.css).not.toContain('unrelated')
    expect(out.css).not.toContain('lime')
  })
})
