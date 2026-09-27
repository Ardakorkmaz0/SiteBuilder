import { describe, expect, it } from 'vitest'
import { HTML_BLOCKS } from '../htmlVariants.js'
import { TURKISH_TRANSLATIONS } from '../../i18n/translations.js'
import { SECTION_BLOCKS, SECTION_CATEGORIES, SECTION_TRANSLATIONS } from './index.js'

const TURKISH_LETTERS = /[çğıöşüÇĞİÖŞÜ]/

describe('section library', () => {
  it('ships over two hundred sections across every category', () => {
    expect(SECTION_BLOCKS.length).toBeGreaterThanOrEqual(200)
    const categories = new Set(SECTION_CATEGORIES.map((category) => category.id))
    expect(categories.size).toBe(SECTION_CATEGORIES.length)
    for (const category of categories) {
      expect(SECTION_BLOCKS.filter((block) => block.category === category).length, category).toBeGreaterThanOrEqual(4)
    }
    for (const block of SECTION_BLOCKS) expect(categories.has(block.category), block.id).toBe(true)
  })

  it('files every block, old and new, into a known category with a unique id', () => {
    const categories = new Set(SECTION_CATEGORIES.map((category) => category.id))
    const ids = new Set(HTML_BLOCKS.map((block) => block.id))
    expect(ids.size).toBe(HTML_BLOCKS.length)
    for (const block of HTML_BLOCKS) expect(categories.has(block.category), block.id).toBe(true)
  })

  it('builds a Turkish version of every section from the same markup', () => {
    for (const block of SECTION_BLOCKS) {
      expect(block.htmlTr, block.id).not.toBe(block.html)
      // Same structure in both languages: the tag sequence must match.
      const tags = (html) => html.match(/<\/?[a-z0-9]+/g).join(' ')
      expect(tags(block.htmlTr), block.id).toBe(tags(block.html))
      for (const html of [block.html, block.htmlTr]) {
        expect(html, block.id).not.toMatch(/undefined|NaN|\[object Object\]/)
      }
    }
    // A short section can be Turkish without a single ç/ğ/ş, but the library
    // as a whole must read as Turkish.
    const turkish = SECTION_BLOCKS.filter((block) => TURKISH_LETTERS.test(block.htmlTr)).length
    expect(turkish / SECTION_BLOCKS.length).toBeGreaterThan(0.95)
  })

  it('keeps sections self-contained and safe to share', () => {
    for (const block of SECTION_BLOCKS) {
      for (const html of [block.html, block.htmlTr]) {
        // No stylesheet or script that could reach outside the section, and no
        // inline handlers (shared components refuse them).
        expect(html, block.id).not.toMatch(/<style|<script|<link/i)
        expect(html, block.id).not.toMatch(/\son[a-z]+\s*=/i)
        expect(html, block.id).not.toMatch(/javascript:/i)
        // Grids reflow on their own instead of relying on media queries.
        expect(html, block.id).not.toMatch(/@media/)
      }
    }
  })

  it('names every field of a real form so the site inbox keeps it', () => {
    for (const block of SECTION_BLOCKS) {
      for (const form of block.html.match(/<form[\s\S]*?<\/form>/g) || []) {
        for (const field of form.match(/<(input|textarea|select)\b[^>]*>/g) || []) {
          if (/type="(submit|button)"/.test(field)) continue
          expect(field, block.id).toMatch(/\sname="[^"]+"/)
        }
      }
    }
  })

  it('gives every section a natural full-width size', () => {
    for (const block of SECTION_BLOCKS) {
      const [w, h] = block.size
      expect(w, block.id).toBe(1000)
      expect(h, block.id).toBeGreaterThan(30)
      expect(h, block.id).toBeLessThan(1600)
    }
  })

  it('translates every label, description and category name', () => {
    for (const category of SECTION_CATEGORIES) {
      expect(TURKISH_TRANSLATIONS[category.name.en], category.id).toBeTruthy()
    }
    for (const block of SECTION_BLOCKS) {
      expect(SECTION_TRANSLATIONS[block.label], block.id).toBeTruthy()
      expect(TURKISH_TRANSLATIONS[block.label], block.id).toBeTruthy()
      expect(TURKISH_TRANSLATIONS[block.desc], block.id).toBeTruthy()
    }
  })
})
