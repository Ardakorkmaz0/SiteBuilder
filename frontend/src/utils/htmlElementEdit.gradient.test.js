import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyElementPatch,
  applyMobileElementPatch,
  clearMobileElementStyles,
  gradientParts,
} from './htmlElementEdit.js'

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = '<section id="hero">Gradient</section>'
})

afterEach(() => vi.restoreAllMocks())

const variants = [
  ['PC', applyElementPatch, (el) => el.style.getPropertyValue('background-image')],
  ['phone', applyMobileElementPatch, (el) => el.style.getPropertyValue('--pwb-mobile-background-image')],
]

describe.each(variants)('%s gradient edits', (_device, apply, storedGradient) => {
  it('starts a gradient by choosing only its ending colour', () => {
    const el = document.getElementById('hero')
    apply(el, { gradientTo: '#2563eb' })
    expect(gradientParts(storedGradient(el))).toEqual({
      gradientFrom: '#ffffff', gradientTo: '#2563eb', gradientAngle: 160,
    })
  })

  it('starts a gradient by choosing only its starting colour', () => {
    const el = document.getElementById('hero')
    apply(el, { gradientFrom: '#e11d48' })
    expect(gradientParts(storedGradient(el))).toEqual({
      gradientFrom: '#e11d48', gradientTo: '#000000', gradientAngle: 160,
    })
  })

  it('starts the displayed white-to-black gradient when only its angle changes', () => {
    const el = document.getElementById('hero')
    apply(el, { gradientAngle: 0 })
    expect(gradientParts(storedGradient(el))).toEqual({
      gradientFrom: '#ffffff', gradientTo: '#000000', gradientAngle: 0,
    })
  })

  it('preserves the other stop and angle over separate edits and a document reload', () => {
    const el = document.getElementById('hero')
    apply(el, { gradientFrom: '#e11d48' })
    apply(el, { gradientAngle: 45 })
    const restored = new DOMParser().parseFromString(document.documentElement.outerHTML, 'text/html')
    const next = restored.getElementById('hero')
    apply(next, { gradientTo: '#2563eb' })
    expect(gradientParts(storedGradient(next))).toEqual({
      gradientFrom: '#e11d48', gradientTo: '#2563eb', gradientAngle: 45,
    })
  })

  it('keeps explicit clearing distinct from an omitted stop', () => {
    const el = document.getElementById('hero')
    el.style.backgroundColor = '#f8fafc'
    apply(el, { gradientFrom: '#e11d48', gradientTo: '#2563eb', gradientAngle: 80 })
    apply(el, { gradientTo: '' })
    expect(storedGradient(el)).toBe('')
    expect(el.style.backgroundColor).toBe('rgb(248, 250, 252)')
  })

  it('preserves a supported gradient from the page stylesheet when changing one stop', () => {
    document.head.innerHTML = '<style>#hero { background-image: linear-gradient(35deg, #e11d48, #16a34a) !important; }</style>'
    const el = document.getElementById('hero')
    apply(el, { gradientTo: '#2563eb' })
    expect(gradientParts(storedGradient(el))).toEqual({
      gradientFrom: '#e11d48', gradientTo: '#2563eb', gradientAngle: 35,
    })
  })

  it('leaves hand-authored gradients alone when editing an unrelated property', () => {
    const el = document.getElementById('hero')
    el.style.backgroundImage = 'radial-gradient(circle, red 0%, blue 50%, green 100%)'
    const original = el.style.backgroundImage
    apply(el, { color: '#2563eb' })
    expect(el.style.backgroundImage).toBe(original)
    expect(gradientParts(original)).toEqual({ gradientFrom: '', gradientTo: '', gradientAngle: 160 })
  })
})

describe('gradient device isolation', () => {
  it('preserves the stylesheet PC gradient after a phone-only colour edit', () => {
    document.head.innerHTML = '<style>#hero { background-image: linear-gradient(35deg, #e11d48, #16a34a) !important; }</style>'
    const el = document.getElementById('hero')
    applyMobileElementPatch(el, { gradientTo: '#2563eb' })
    expect(el.style.getPropertyValue('--pwb-mobile-background-image')).toBe('linear-gradient(35deg, #e11d48, #2563eb)')

    applyElementPatch(el, { gradientTo: '#9333ea' })
    expect(gradientParts(el.style.getPropertyValue('--pwb-pc-background-image'))).toEqual({
      gradientFrom: '#e11d48', gradientTo: '#9333ea', gradientAngle: 35,
    })
    expect(el.style.getPropertyValue('--pwb-mobile-background-image')).toBe('linear-gradient(35deg, #e11d48, #2563eb)')
  })

  it('does not seed a PC gradient from the visible phone override at phone width', () => {
    const el = document.getElementById('hero')
    applyMobileElementPatch(el, { gradientFrom: '#e11d48', gradientTo: '#2563eb', gradientAngle: 35 })
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390)
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ backgroundImage: 'linear-gradient(35deg, #e11d48, #2563eb)' })

    applyElementPatch(el, { gradientTo: '#9333ea' })
    expect(gradientParts(el.style.getPropertyValue('--pwb-pc-background-image'))).toEqual({
      gradientFrom: '#ffffff', gradientTo: '#9333ea', gradientAngle: 160,
    })
    expect(el.style.getPropertyValue('--pwb-mobile-background-image')).toBe('linear-gradient(35deg, #e11d48, #2563eb)')
  })

  it('keeps separate PC and phone stops and restores the PC gradient after clearing phone styles', () => {
    const el = document.getElementById('hero')
    applyElementPatch(el, { gradientFrom: '#e11d48', gradientTo: '#16a34a', gradientAngle: 25 })
    applyMobileElementPatch(el, { gradientTo: '#2563eb' })
    expect(el.style.getPropertyValue('--pwb-mobile-background-image')).toBe('linear-gradient(25deg, #e11d48, #2563eb)')
    expect(gradientParts(el.style.getPropertyValue('--pwb-pc-background-image'))).toEqual({
      gradientFrom: '#e11d48', gradientTo: '#16a34a', gradientAngle: 25,
    })

    applyElementPatch(el, { gradientFrom: '#9333ea' })
    expect(el.style.getPropertyValue('--pwb-mobile-background-image')).toBe('linear-gradient(25deg, #e11d48, #2563eb)')
    clearMobileElementStyles(el)
    expect(gradientParts(el.style.backgroundImage)).toEqual({
      gradientFrom: '#9333ea', gradientTo: '#16a34a', gradientAngle: 25,
    })
    expect(el.style.getPropertyPriority('background-image')).toBe('important')
    expect(el.hasAttribute('data-pwb-mobile-background-image')).toBe(false)
  })
})
