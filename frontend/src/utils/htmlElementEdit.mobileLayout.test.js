import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyElementPatch,
  applyMobileElementPatch,
  clearMobileElementStyles,
  describeElement,
} from './htmlElementEdit.js'
import { serializeDocument } from './htmlPlacement.js'

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = '<main><a id="inline-link" href="#contact" style="display:inline">Contact</a><section id="box">Content</section></main>'
})

function reparse(id) {
  return new DOMParser().parseFromString(serializeDocument(document), 'text/html').getElementById(id)
}

describe('phone element placement', () => {
  it.each([
    ['left', '0', 'auto'],
    ['center', 'auto', 'auto'],
    ['right', 'auto', '0'],
  ])('makes an inline element movable to the %s without changing its PC layout', (side, left, right) => {
    const link = document.getElementById('inline-link')
    applyMobileElementPatch(link, { alignBlock: side })

    expect(link.style.getPropertyValue('--pwb-mobile-display')).toBe('block')
    expect(link.style.getPropertyValue('--pwb-mobile-width')).toBe('fit-content')
    expect(link.style.getPropertyValue('--pwb-mobile-margin-left')).toBe(left)
    expect(link.style.getPropertyValue('--pwb-mobile-margin-right')).toBe(right)
    expect(link.style.display).toBe('inline')
    expect(link.style.width).toBe('')
    expect(describeElement(link).mobileAlignBlock).toBe(side)
  })

  it('keeps phone placement after serialization and restores explicit PC values on reset', () => {
    const link = document.getElementById('inline-link')
    applyElementPatch(link, { display: 'inline', width: 180 })
    applyMobileElementPatch(link, { alignBlock: 'center' })

    const restored = reparse('inline-link')
    expect(restored.style.getPropertyValue('--pwb-mobile-display')).toBe('block')
    expect(restored.style.getPropertyValue('--pwb-mobile-width')).toBe('fit-content')
    expect(restored.style.getPropertyValue('--pwb-pc-display')).toBe('inline')
    expect(restored.style.getPropertyValue('--pwb-pc-width')).toBe('180px')
    expect(describeElement(restored).mobileAlignBlock).toBe('center')

    clearMobileElementStyles(restored)
    expect(restored.style.display).toBe('inline')
    expect(restored.style.width).toBe('180px')
    expect(restored.style.getPropertyPriority('display')).toBe('important')
    expect(restored.style.getPropertyPriority('width')).toBe('important')
    expect(restored.getAttributeNames().filter((name) => name.startsWith('data-pwb-'))).toEqual([])
  })

  it('preserves the existing display and width of a block when placing it', () => {
    const box = document.getElementById('box')
    applyElementPatch(box, { display: 'flex', width: 220 })
    applyMobileElementPatch(box, { alignBlock: 'right' })

    expect(box.style.display).toBe('flex')
    expect(box.style.width).toBe('220px')
    expect(box.style.getPropertyValue('--pwb-mobile-display')).toBe('')
    expect(box.style.getPropertyValue('--pwb-mobile-width')).toBe('')
    expect(describeElement(box).mobileAlignBlock).toBe('right')
  })
})

describe('phone padding shorthand replaces its previous sides', () => {
  it.each([[24, '24px'], [0, '0px']])('replaces a top override with all-side padding %s and preserves PC padding', (value, expected) => {
    const box = document.getElementById('box')
    applyElementPatch(box, { padding: 40 })
    applyMobileElementPatch(box, { paddingTop: 8 })
    applyMobileElementPatch(box, { padding: value })

    expect(box.style.getPropertyValue('--pwb-mobile-padding')).toBe(expected)
    expect(box.style.getPropertyValue('--pwb-mobile-padding-top')).toBe('')
    expect(box.hasAttribute('data-pwb-mobile-padding-top')).toBe(false)

    const restored = reparse('box')
    expect(restored.style.getPropertyValue('--pwb-mobile-padding')).toBe(expected)
    expect(restored.hasAttribute('data-pwb-mobile-padding-top')).toBe(false)
    clearMobileElementStyles(restored)
    expect([
      restored.style.paddingTop, restored.style.paddingRight,
      restored.style.paddingBottom, restored.style.paddingLeft,
    ]).toEqual(['40px', '40px', '40px', '40px'])
    expect(restored.getAttributeNames().filter((name) => name.startsWith('data-pwb-'))).toEqual([])
  })

  it('clears previous side overrides when the all-side field is emptied', () => {
    const box = document.getElementById('box')
    applyElementPatch(box, { padding: 40 })
    applyMobileElementPatch(box, { paddingTop: 8, paddingRight: 12, paddingBottom: 16, paddingLeft: 20 })
    applyMobileElementPatch(box, { padding: '' })

    expect(box.getAttributeNames().filter((name) => name.startsWith('data-pwb-mobile-padding'))).toEqual([])
    expect([
      box.style.paddingTop, box.style.paddingRight,
      box.style.paddingBottom, box.style.paddingLeft,
    ]).toEqual(['40px', '40px', '40px', '40px'])
    expect(document.querySelector('style[data-pwb-responsive-overrides]')).toBeNull()
  })

  it('allows an explicit side in the same patch to refine the new shorthand', () => {
    const box = document.getElementById('box')
    applyMobileElementPatch(box, { paddingTop: 8, paddingRight: 12 })
    applyMobileElementPatch(box, { padding: 24, paddingTop: 6 })

    expect(box.style.getPropertyValue('--pwb-mobile-padding')).toBe('24px')
    expect(box.style.getPropertyValue('--pwb-mobile-padding-top')).toBe('6px')
    expect(box.style.getPropertyValue('--pwb-mobile-padding-right')).toBe('')
  })
})
