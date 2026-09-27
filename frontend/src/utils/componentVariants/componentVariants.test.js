import { describe, expect, it } from 'vitest'
import { HTML_VARIANTS } from '../htmlVariants.js'
import { htmlSnippetSize } from '../htmlSnippetSizing.js'
import { TURKISH_TRANSLATIONS } from '../../i18n/translations.js'
import { EXTRA_VARIANTS, WIDGET_CATEGORIES, WIDGET_TYPE, WIDGETS } from './index.js'

const ALL_EXTRAS = Object.entries(EXTRA_VARIANTS).flatMap(([type, variants]) => variants.map((variant) => ({ type, variant })))
const EVERYTHING = [...ALL_EXTRAS, ...WIDGETS.map((variant) => ({ type: WIDGET_TYPE, variant }))]
const parse = (html) => new DOMParser().parseFromString(html, 'text/html').body

describe('component variants', () => {
  it('adds a broad set of variants to every common component type', () => {
    for (const type of ['button', 'linkbutton', 'badge', 'icon', 'heading', 'text', 'quote', 'list', 'image', 'divider', 'card', 'alert', 'container', 'accordion', 'input', 'select']) {
      expect(EXTRA_VARIANTS[type].length, type).toBeGreaterThanOrEqual(6)
    }
    const total = Object.values(HTML_VARIANTS).reduce((sum, variants) => sum + variants.length, 0)
    expect(total).toBeGreaterThanOrEqual(340)
  })

  it('keeps ids and labels unique within each palette type', () => {
    for (const [type, variants] of Object.entries(HTML_VARIANTS)) {
      expect(new Set(variants.map((variant) => variant.id)).size, type).toBe(variants.length)
      expect(new Set(variants.map((variant) => variant.label)).size, type).toBe(variants.length)
    }
    expect(new Set(WIDGETS.map((widget) => widget.id)).size).toBe(WIDGETS.length)
  })

  it('ships widgets in named groups', () => {
    expect(WIDGETS.length).toBeGreaterThanOrEqual(60)
    expect(WIDGET_CATEGORIES.length).toBeGreaterThanOrEqual(12)
    for (const category of WIDGET_CATEGORIES) {
      expect(WIDGETS.filter((widget) => widget.group === category.id).length, category.id).toBeGreaterThanOrEqual(4)
      expect(TURKISH_TRANSLATIONS[category.name.en], category.id).toBeTruthy()
    }
  })

  it('translates every label and builds Turkish copy with the same markup', () => {
    const tags = (html) => html.match(/<\/?[a-z0-9]+/g).join(' ')
    for (const { type, variant } of EVERYTHING) {
      expect(TURKISH_TRANSLATIONS[variant.label], `${type}:${variant.id}`).toBeTruthy()
      if (variant.htmlTr) expect(tags(variant.htmlTr), `${type}:${variant.id}`).toBe(tags(variant.html))
      for (const html of [variant.html, variant.htmlTr || variant.html]) {
        expect(html, `${type}:${variant.id}`).not.toMatch(/undefined|NaN|\[object Object\]/)
      }
    }
    // Most snippets have words in them; only glyph-only ones share one build.
    const bilingual = EVERYTHING.filter(({ variant }) => variant.htmlTr).length
    expect(bilingual / EVERYTHING.length).toBeGreaterThan(0.8)
  })

  it('stays self-contained and safe to share', () => {
    for (const { type, variant } of EVERYTHING) {
      for (const html of [variant.html, variant.htmlTr || variant.html]) {
        expect(html, `${type}:${variant.id}`).not.toMatch(/<style|<script|<link/i)
        expect(html, `${type}:${variant.id}`).not.toMatch(/\son[a-z]+\s*=/i)
        expect(html, `${type}:${variant.id}`).not.toMatch(/javascript:/i)
      }
    }
  })

  it('builds controls as one element so the canvas can stretch and scale them', () => {
    for (const type of ['button', 'linkbutton', 'badge', 'icon']) {
      for (const variant of EXTRA_VARIANTS[type]) {
        const body = parse(variant.html)
        expect(body.children, `${type}:${variant.id}`).toHaveLength(1)
        expect(['A', 'SPAN'], `${type}:${variant.id}`).toContain(body.children[0].tagName)
        expect(variant.html, `${type}:${variant.id}`).toMatch(/white-space:nowrap|display:inline-grid/)
      }
    }
  })

  it('names every form field so a published form keeps what visitors type', () => {
    for (const { type, variant } of EVERYTHING) {
      for (const field of parse(variant.html).querySelectorAll('input, textarea, select')) {
        if (['submit', 'button'].includes(field.type)) continue
        expect(field.getAttribute('name'), `${type}:${variant.id}`).toBeTruthy()
      }
    }
  })

  it('gives each snippet its measured frame', () => {
    for (const { type, variant } of EVERYTHING) {
      expect(variant.size, `${type}:${variant.id}`).toBeTruthy()
      expect(htmlSnippetSize(type, variant.id)).toEqual(variant.size)
      expect(variant.size.w, `${type}:${variant.id}`).toBeGreaterThan(20)
      expect(variant.size.h, `${type}:${variant.id}`).toBeGreaterThanOrEqual(24)
    }
  })
})
