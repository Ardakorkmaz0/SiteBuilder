import { beforeEach, describe, expect, it } from 'vitest'
import { exportComponent } from './componentExport.js'

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = '<section id="hero">Shared hero</section><p class="unrelated">Elsewhere</p>'
})

describe('component exports preserve authored layer scope and order', () => {
  it('uses the inherited root variable instead of a definition on an unrelated element', () => {
    document.head.innerHTML = `<style>
      @layer template {
        .unrelated { --accent: red; }
        #hero { color: var(--accent); }
      }
      :root { --accent: blue; }
    </style>`

    const out = exportComponent(document, document.getElementById('hero'), { scope: 'inherited' })

    expect(out.ok).toBe(true)
    expect(out.css).toContain('--accent: blue;')
    expect(out.css).not.toContain('--accent: red;')
    expect(out.css).toContain('color: var(--accent)')
    expect(out.css).not.toContain('.unrelated')
  })

  it('retains the first layer declaration even when its initial rules belong to an unrelated element', () => {
    document.head.innerHTML = `<style>
      @layer first { .unrelated { color: orange; } }
      @layer second { #hero { color: blue; } }
      @layer first { #hero { color: red; } }
    </style>`

    const out = exportComponent(document, document.getElementById('hero'), { scope: 'ordered' })

    expect(out.ok).toBe(true)
    // The order of a layer's first mention decides its cascade priority.
    // Dropping the unrelated first block makes red beat the intended blue.
    expect(out.css.indexOf('@layer first')).toBeGreaterThanOrEqual(0)
    expect(out.css.indexOf('@layer second')).toBeGreaterThanOrEqual(0)
    expect(out.css.indexOf('@layer first')).toBeLessThan(out.css.indexOf('@layer second'))
    expect(out.css).toContain('color: blue;')
    expect(out.css).toContain('color: red;')
    expect(out.css).not.toContain('orange')
    expect(out.css).not.toContain('.unrelated')
  })
})
