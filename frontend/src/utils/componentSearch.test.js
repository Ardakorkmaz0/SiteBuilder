import { describe, expect, it } from 'vitest'
import { buildEntries } from '../components/editor/libraryEntries.js'
import { buildSearchIndex, foldText, highlightParts, searchComponents } from './componentSearch.js'

const index = buildSearchIndex(buildEntries())
const search = (query) => searchComponents(index, query)
const kinds = (list, count = 5) => list.slice(0, count).map((entry) => entry.categoryId)
const labels = (list) => list.map((entry) => entry.label)

describe('folding text for search', () => {
  it('reads Turkish letters, accents and case as their plain twins', () => {
    expect(foldText('Görsel ŞİŞE çığlık Âlem')).toBe('gorsel sise ciglik alem')
    expect(foldText('  İletişim-formu! ')).toBe('iletisim formu')
  })
})

describe('searching the block library', () => {
  it('finds the same blocks with or without Turkish letters', () => {
    expect(labels(search('görsel').best)).toEqual(labels(search('gorsel').best))
    expect(search('görsel').best.length).toBeGreaterThan(0)
  })

  it('puts the kind of block a word names first', () => {
    expect(kinds(search('görsel').best, 1)).toEqual(['image'])
    expect(kinds(search('foto').best, 1)).toEqual(['image'])
    expect(kinds(search('sss').best, 3)).toEqual(['section:faq', 'section:faq', 'section:faq'])
  })

  it('understands a word that means the same thing', () => {
    // "fiyat" is in no English label: it reaches pricing through its concept.
    expect(kinds(search('fiyat').best, 3)).toEqual(['section:pricing', 'section:pricing', 'section:pricing'])
    expect(kinds(search('btn').best, 1)).toEqual(['button'])
    expect(search('plak').best[0].label).toBe('Record sleeve')
  })

  it('forgives a typo and offers the corrected query', () => {
    const result = search('galri')
    expect(labels(result.best)).toContain('Gallery')
    expect(result.suggestion).toBe('galeri')
    expect(search('galeri').suggestion).toBeNull()
  })

  it('reads a Turkish word with an ending as the word', () => {
    // Endings are within the typo allowance of the word ("tablosu" → tablo).
    expect(kinds(search('görselleri').best, 1)).toEqual(['image'])
    expect(labels(search('fiyat tablosu').best)).toEqual(['Plan comparison table'])
  })

  it('ranks a whole word above a name that only starts with its letters', () => {
    const found = labels(search('form').best)
    expect(found.indexOf('Contact form with details')).toBeLessThan(found.indexOf('Formula card'))
    expect(found.indexOf('Contact form with details')).toBeGreaterThanOrEqual(0)
  })

  it('ranks an exact name first', () => {
    expect(search('Çözümlü sınav sorusu').best[0].key).toBe('widget-study-question-paper')
    expect(search('Countdown').best[0].label).toBe('Countdown')
  })

  it('keeps related blocks when not every word matches', () => {
    const result = search('fiyat zzzz')
    expect(result.best).toEqual([])
    expect(kinds(result.related, 2)).toEqual(['section:pricing', 'section:pricing'])
    expect(search('zzzz')).toEqual({ best: [], related: [], suggestion: null })
  })

  it('lists more of the same kind after the best matches', () => {
    const result = search('Çözümlü sınav sorusu')
    expect(labels(result.related)).toContain('Exam sheet header')
    expect(result.related.map((entry) => entry.key)).not.toContain('widget-study-question-paper')
  })

  it('answers every keystroke within a few milliseconds', () => {
    const queries = ['f', 'fo', 'fot', 'foto', 'g', 'ga', 'gal', 'galr', 'galri', 'fiyat tablosu', 'iletişim formu', 'geri sayım', 'navbr', 'zzzz']
    const start = performance.now()
    for (let round = 0; round < 5; round++) for (const query of queries) search(query)
    const perQuery = (performance.now() - start) / (queries.length * 5)
    // About 2 ms here; a frame is 16 ms. The bound leaves room for a slow CI.
    expect(perQuery).toBeLessThan(16)
  })
})

describe('marking the words a search found in a name', () => {
  it('marks a word written without Turkish letters in the name that has them', () => {
    expect(highlightParts('Görsel kartı', 'gorsel')).toEqual([
      { text: 'Görsel', match: true },
      { text: ' kartı', match: false },
    ])
    expect(highlightParts('İletişim formu', 'iletisim form')).toEqual([
      { text: 'İletişim', match: true },
      { text: ' ', match: false },
      { text: 'form', match: true },
      { text: 'u', match: false },
    ])
  })

  it('keeps the marks on the right letters after an emoji and over a combining accent', () => {
    expect(highlightParts('🎵 Menü', 'menu')).toEqual([{ text: '🎵 ', match: false }, { text: 'Menü', match: true }])
    expect(highlightParts('Go\u0308rsel', 'gorsel')).toEqual([{ text: 'Go\u0308rsel', match: true }])
    expect(highlightParts('👩‍💻 İletişim', 'iletisim')).toEqual([{ text: '👩‍💻 ', match: false }, { text: 'İletişim', match: true }])
  })

  it('leaves a name unmarked when no word of two letters or more is in it', () => {
    expect(highlightParts('Gallery', 'z')).toEqual([{ text: 'Gallery', match: false }])
    expect(highlightParts('Gallery', '')).toEqual([{ text: 'Gallery', match: false }])
  })
})
