import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { applyElementPatch } from './htmlElementEdit.js'

let style
beforeEach(() => {
  document.body.innerHTML = '<p class="template-off">Imported paragraph</p>'
  style = document.createElement('style')
  style.textContent = '.template-off{font-style:italic;border:4px solid red;box-shadow:0 5px 10px red;opacity:0.4;overflow:hidden}'
  document.head.appendChild(style)
})
afterEach(() => style.remove())

describe('explicit off choices on an imported template', () => {
  it.each([
    ['Italic unchecked', { italic: false }, 'fontStyle', 'normal'],
    ['Border style None', { borderStyle: 'none' }, 'borderTopStyle', 'none'],
    ['Shadow None', { boxShadow: 'none' }, 'boxShadow', 'none'],
    ['Opacity 1', { opacity: 1 }, 'opacity', '1'],
    ['Overflow Visible', { overflow: 'visible' }, 'overflow', 'visible'],
  ])('%s changes the visible template value', (_, patch, property, expected) => {
    const paragraph = document.querySelector('p')
    applyElementPatch(paragraph, patch)
    expect(getComputedStyle(paragraph)[property]).toBe(expected)
  })

  it('an empty Default choice keeps falling back to the imported CSS', () => {
    const paragraph = document.querySelector('p')
    applyElementPatch(paragraph, { borderStyle: '', boxShadow: '', opacity: '', overflow: '' })
    const computed = getComputedStyle(paragraph)
    expect([computed.borderTopStyle, computed.opacity, computed.overflow]).toEqual(['solid', '0.4', 'hidden'])
    expect(computed.boxShadow).toContain('10px')
  })
})
