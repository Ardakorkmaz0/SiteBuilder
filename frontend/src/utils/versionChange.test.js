import { describe, expect, it } from 'vitest'
import { changeColor, changeLabel, versionChange } from './versionChange.js'

const row = (summary) => ({ id: 1, summary })
const page = (id, size, extra = {}) => ({ id, name: id, kind: 'changed', size, hard: false, ...extra })

describe('what a saved version changed', () => {
  it('is the whole site\'s change, or one page\'s when a page is named', () => {
    const saved = row({ first: false, pages: [page('home', 0.1), page('about', 0.8)], size: 0.8, hard: false, site: false })

    expect(versionChange(saved)).toEqual({ size: 0.8, hard: false, kind: 'changed', pages: 2 })
    expect(versionChange(saved, 'home')).toEqual({ size: 0.1, hard: false, kind: 'changed', pages: 1 })
  })

  it('is nothing for a page the version did not touch, or a row without a summary', () => {
    const saved = row({ first: false, pages: [page('home', 0.1)], size: 0.1, hard: false, site: false })

    expect(versionChange(saved, 'about')).toBeNull()
    expect(versionChange({ id: 2 })).toBeNull()
    expect(versionChange({ id: 3, summary: null }, 'home')).toBeNull()
  })

  it('is told apart from the first save and from a change to the site alone', () => {
    expect(versionChange(row({ first: true, pages: [], size: 0, hard: false, site: false })).kind).toBe('first')
    expect(versionChange(row({ first: false, pages: [], size: 0.05, hard: false, site: true })).kind).toBe('site')
    expect(versionChange(row({ first: false, pages: [], size: 0, hard: false, site: false })).kind).toBe('none')
  })
})

describe('the words and the colour beside a version', () => {
  const change = (size, extra = {}) => ({ size, hard: false, kind: 'changed', pages: 1, ...extra })

  it('name the size of the change', () => {
    expect(changeLabel(change(0.05))).toBe('Small change')
    expect(changeLabel(change(0.15))).toBe('Medium change')
    expect(changeLabel(change(0.5))).toBe('Large change')
    expect(changeLabel(change(1, { hard: true, kind: 'mode' }))).toBe('Hard to take back')
    expect(changeLabel(change(0, { kind: 'none' }))).toBe('No page changed')
    expect(changeLabel(change(0, { kind: 'first' }))).toBe('First save')
    expect(changeLabel(change(0.05, { kind: 'site' }))).toBe('Site settings changed')
    expect(changeLabel(null)).toBe('')
  })

  it('run from the low colour to the high one, with one of its own for a hard change', () => {
    expect(changeColor(change(0.1))).toBe('color-mix(in srgb, var(--studio-change-high) 10%, var(--studio-change-low))')
    expect(changeColor(change(1))).toBe('color-mix(in srgb, var(--studio-change-high) 100%, var(--studio-change-low))')
    expect(changeColor(change(1, { hard: true }))).toBe('var(--studio-change-hard)')
    expect(changeColor(change(0, { kind: 'none' }))).toBe('var(--studio-border-strong)')
    expect(changeColor(null)).toBe('var(--studio-border-strong)')
  })
})
