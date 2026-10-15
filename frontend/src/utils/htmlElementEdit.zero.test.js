import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { applyElementPatch, applyMobileElementPatch } from './htmlElementEdit.js'

let style
beforeEach(() => {
  document.body.innerHTML = '<section class="template-zero">Content</section>'
  style = document.createElement('style')
  style.textContent = '.template-zero{padding:32px;margin:8px;border:6px solid red;border-radius:18px;gap:24px;width:500px;height:140px;max-width:600px;z-index:6}'
  document.head.appendChild(style)
})
afterEach(() => {
  style.remove()
  document.querySelector('style[data-pwb-responsive-overrides]')?.remove()
})

const ZERO_CHOICES = [
  ['padding', 'padding', 'paddingTop', '0px'],
  ['gap', 'gap', 'gap', '0px'],
  ['borderWidth', 'border-width', 'borderTopWidth', '0px'],
  ['radius', 'border-radius', 'borderTopLeftRadius', '0px'],
  ['width', 'width', 'width', 'auto'],
  ['height', 'height', 'height', 'auto'],
  ['maxWidth', 'max-width', 'maxWidth', 'none'],
  ['zIndex', 'z-index', 'zIndex', '0'],
]

describe('zero and empty numeric HTML style choices', () => {
  it.each(ZERO_CHOICES)('PC %s = 0 overrides the imported template', (key, _property, computedProperty, expected) => {
    const section = document.querySelector('section')
    applyElementPatch(section, { [key]: 0 })
    const actual = getComputedStyle(section)[computedProperty]
    expect(actual === '0' && expected === '0px' ? '0px' : actual).toBe(expected)
  })

  it.each(ZERO_CHOICES)('mobile %s = 0 is an override, while an empty field restores PC', (key, property, _computed, expected) => {
    const section = document.querySelector('section')
    applyMobileElementPatch(section, { [key]: 0 })
    expect(section.style.getPropertyValue(`--pwb-mobile-${property}`)).toBe(expected)
    expect(section.hasAttribute(`data-pwb-mobile-${property}`)).toBe(true)
    applyMobileElementPatch(section, { [key]: '' })
    expect(section.style.getPropertyValue(`--pwb-mobile-${property}`)).toBe('')
    expect(section.hasAttribute(`data-pwb-mobile-${property}`)).toBe(false)
  })

  it('empty PC margin and per-side padding restore the imported template rather than writing zero', () => {
    const section = document.querySelector('section')
    applyElementPatch(section, { marginTop: 20, paddingTop: 12 })
    applyElementPatch(section, { marginTop: '', paddingTop: '' })
    const computed = getComputedStyle(section)
    expect([computed.marginTop, computed.paddingTop]).toEqual(['8px', '32px'])
  })

  it('PC edits and empty mobile fields keep the explicit zero at the phone breakpoint', () => {
    const section = document.querySelector('section')
    applyElementPatch(section, { padding: 40, gap: 16, borderWidth: 4 })
    applyMobileElementPatch(section, { padding: 0, gap: 0, borderWidth: 0 })
    applyElementPatch(section, { padding: 48, gap: 20, borderWidth: 5 })
    expect(section.style.getPropertyValue('--pwb-mobile-padding')).toBe('0px')
    expect(section.style.getPropertyValue('--pwb-mobile-gap')).toBe('0px')
    expect(section.style.getPropertyValue('--pwb-mobile-border-width')).toBe('0px')
    expect(section.style.getPropertyValue('--pwb-pc-padding')).toBe('48px')
    applyMobileElementPatch(section, { padding: '', gap: '', borderWidth: '' })
    expect([section.style.padding, section.style.gap, section.style.borderWidth]).toEqual(['48px', '20px', '5px'])
  })
})
