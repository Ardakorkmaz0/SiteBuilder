// The theme's newer fields: an accent, and typography that only speaks when
// chosen. And the presets, which have to be complete and readable.
import { describe, expect, it } from 'vitest'
import {
  FONT_OPTIONS, THEME_PRESETS, normalizeTheme, presetTheme, readableTextOn, sameTheme, themedStyles,
} from './theme.js'

describe('the presets', () => {
  it('are many, and some of them dark', () => {
    expect(THEME_PRESETS.length).toBeGreaterThanOrEqual(24)
    expect(THEME_PRESETS.filter((p) => p.dark).length).toBeGreaterThanOrEqual(4)
    expect(new Set(THEME_PRESETS.map((p) => p.id)).size).toBe(THEME_PRESETS.length)
  })

  it('only name fonts the font list offers, so the picker can show them', () => {
    const offered = new Set(FONT_OPTIONS.map(([stack]) => stack))
    for (const preset of THEME_PRESETS) {
      const theme = presetTheme(preset)
      expect(offered.has(theme.fontFamily), `${preset.id} body font`).toBe(true)
      expect(offered.has(theme.headingFontFamily), `${preset.id} heading font`).toBe(true)
    }
  })

  it('keep button text readable on the button', () => {
    // WCAG's 4.5:1 for normal text, measured on each preset's own pair.
    const luminance = (color) => {
      const hex = color.replace('#', '')
      const channel = (i) => {
        const v = parseInt(hex.slice(i, i + 2), 16) / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
    }
    for (const preset of THEME_PRESETS) {
      const theme = presetTheme(preset)
      const [a, b] = [luminance(theme.primaryColor), luminance(theme.buttonTextColor)]
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      expect(ratio, preset.id).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('fill what they leave out the way they always did', () => {
    const apple = presetTheme(THEME_PRESETS.find((p) => p.id === 'apple'))

    expect(apple.headingFontFamily).toBe(apple.fontFamily)
    expect(apple.buttonTextColor).toBe('#ffffff')
    expect(apple.borderColor).toBe(apple.mutedColor)
    expect(apple.accentColor).toBe(apple.primaryColor)
    expect(apple.headingWeight).toBe('')
  })
})

describe('normalizeTheme', () => {
  it('gives an older theme an accent in its own primary color', () => {
    expect(normalizeTheme({ primaryColor: '#e8543f' }).accentColor).toBe('#e8543f')
  })

  it('leaves typography empty unless chosen', () => {
    const theme = normalizeTheme({})
    expect([theme.headingWeight, theme.headingLetterSpacing, theme.bodyLineHeight]).toEqual(['', '', ''])
  })
})

describe('themedStyles', () => {
  it('keeps a heading\'s own weight when the theme does not choose one', () => {
    const styles = themedStyles('heading', { fontWeight: '800' }, normalizeTheme({}))
    expect(styles.fontWeight).toBe('800')
    expect(styles.letterSpacing).toBeUndefined()
  })

  it('sets the chosen typography', () => {
    const theme = normalizeTheme({ headingWeight: '600', headingLetterSpacing: '-0.02em', bodyLineHeight: '1.7' })

    expect(themedStyles('heading', {}, theme)).toMatchObject({ fontWeight: '600', letterSpacing: '-0.02em' })
    expect(themedStyles('text', {}, theme)).toMatchObject({ lineHeight: '1.7' })
  })

  it('dresses badges and icons in the accent, with readable badge text', () => {
    const theme = normalizeTheme({ accentColor: '#facc15', buttonTextColor: '#ffffff' })

    expect(themedStyles('badge', {}, theme)).toMatchObject({ backgroundColor: '#facc15', color: '#111111' })
    expect(themedStyles('icon', {}, theme).color).toBe('#facc15')
  })
})

describe('readableTextOn', () => {
  it('picks dark text on light colors and light text on dark ones', () => {
    expect(readableTextOn('#ffffff')).toBe('#111111')
    expect(readableTextOn('#1e3a8a')).toBe('#ffffff')
    expect(readableTextOn('rgb(0,0,0)', '#abcdef')).toBe('#abcdef')
  })
})

describe('sameTheme', () => {
  it('recognises a preset after it was applied', () => {
    const preset = presetTheme(THEME_PRESETS[0])
    expect(sameTheme(preset, { ...preset, borderColor: '#000000' })).toBe(true)
    expect(sameTheme(preset, { ...preset, primaryColor: '#000000' })).toBe(false)
  })
})
