import { describe, expect, it } from 'vitest'
import { buildEntries } from '../components/editor/libraryEntries.js'
import { buildSearchIndex, foldText, searchComponents } from './componentSearch.js'

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
