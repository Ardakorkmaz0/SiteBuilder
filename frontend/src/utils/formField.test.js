// A field is described once here and written by three renderers, so these pin
// the description: which parts a kind has, what the published HTML says, that
// the owner's settings cannot reach out of the page, and that a field saved
// before parts existed looks as it did.
import { afterEach, describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { controlsFor, fieldHtml, fieldSize, fieldStyles, partsFor, styleText } from './formField.js'
import { builderInteractiveJs } from './htmlRuntime.js'

const html = (props, type = 'input') => fieldHtml(type, props, 'c1')
const dom = (markup) => new JSDOM(`<body>${markup}</body>`).window.document

describe('parts', () => {
  it('gives each kind of field the parts it has', () => {
    expect(partsFor('input', 'password')).toEqual(['label', 'field', 'placeholder', 'reveal', 'help'])
    expect(partsFor('input', 'date')).toEqual(['label', 'field', 'help'])
    expect(partsFor('input', 'switch')).toEqual(['label', 'control', 'help'])
    expect(partsFor('input', 'radio')).toEqual(['label', 'choices', 'control', 'help'])
    expect(partsFor('select')).toEqual(['label', 'field', 'choices', 'placeholder', 'help'])
  })

  it('offers only the settings that mean something for the kind', () => {
    const keys = (type) => controlsFor('input', type).map((control) => control.key)
    expect(keys('password')).toContain('revealButton')
    expect(keys('text')).not.toContain('revealButton')
    // A switch has no field box and no placeholder.
    expect(keys('switch')).not.toContain('fieldBackgroundColor')
    expect(keys('switch')).not.toContain('placeholder')
    expect(keys('range')).toEqual(expect.arrayContaining(['rangeMin', 'rangeMax', 'rangeValue']))
    // The type picker belongs to the field component, not the dropdown.
    expect(controlsFor('select').map((control) => control.key)).not.toContain('inputType')
  })
})

describe('the published HTML', () => {
  it('writes a password field with a labelled field and a show/hide button', () => {
    const doc = dom(html({ inputType: 'password', label: 'Password', placeholder: 'Secret', required: 'on' }))
    const input = doc.querySelector('input')
    expect(input.type).toBe('password')
    expect(input.required).toBe(true)
    expect(doc.querySelector(`label[for="${input.id}"]`).textContent).toBe('Password *')
    const button = doc.querySelector('[data-pwb-reveal]')
    expect(button.getAttribute('type')).toBe('button')
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.getAttribute('aria-label')).toBe('Show password')
  })

  it('leaves the button out when it is turned off', () => {
    expect(dom(html({ inputType: 'password', revealButton: 'off' })).querySelector('[data-pwb-reveal]')).toBeNull()
  })

  it('writes a switch as a checkbox with the switch role', () => {
    const doc = dom(html({ inputType: 'switch', label: 'News', checked: 'on' }))
    const box = doc.querySelector('input[type="checkbox"]')
    expect(box.getAttribute('role')).toBe('switch')
    expect(box.checked).toBe(true)
    expect(doc.querySelector(`label[for="${box.id}"]`).textContent).toBe('News')
  })

  it('writes a choice list as one named group under its question', () => {
    const doc = dom(html({ inputType: 'radio', label: 'Pick one', options: 'A\nB\n<img src=x onerror=alert(1)>' }))
    expect(doc.querySelector('fieldset legend').textContent).toBe('Pick one')
    const radios = [...doc.querySelectorAll('input[type="radio"]')]
    expect(radios).toHaveLength(3)
    expect(new Set(radios.map((radio) => radio.name)).size).toBe(1)
    // An option is text, never markup.
    expect(doc.querySelector('img')).toBeNull()
  })

  it('keeps a slider inside its range', () => {
    const range = dom(html({ inputType: 'range', rangeMin: '10', rangeMax: '20', rangeValue: '99' })).querySelector('input')
    expect([range.min, range.max, range.value]).toEqual(['10', '20', '20'])
  })

  it('styles each part on its own', () => {
    const doc = dom(html({ label: 'Name', labelColor: '#ff0000', fieldColor: '#00ff00', helpText: 'Hint', helpColor: '#0000ff' }))
    expect(doc.querySelector('label').style.color).toBe('rgb(255, 0, 0)')
    expect(doc.querySelector('input').style.color).toBe('rgb(0, 255, 0)')
    expect(doc.querySelector('p').style.color).toBe('rgb(0, 0, 255)')
  })

  it('marks a coloured placeholder and a focus ring only when they are set', () => {
    expect(dom(html({})).querySelector('input').className).toBe('pwb-field-input')
    const input = dom(html({ placeholderColor: '#123456', fieldFocusColor: '#654321' })).querySelector('input')
    expect(input.className).toBe('pwb-field-input pwb-ph pwb-focus')
    expect(input.getAttribute('style')).toContain('--pwb-placeholder:#123456')
  })

  it('drops a setting that could reach out of the page', () => {
    expect(styleText({ background: 'url(https://evil.example/x.png)', color: 'red' })).toBe('color:red')
    // A quote cannot close the style attribute and open another one.
    const input = dom(html({ fieldBackgroundColor: '#fff" onmouseover="alert(1)' })).querySelector('input')
    expect(input.hasAttribute('onmouseover')).toBe(false)
  })

  it('draws a field saved before parts existed as it was drawn then', () => {
    const doc = dom(html({ label: 'Email', inputType: 'email' }))
    expect(doc.querySelector('label').style.fontWeight).toBe('600')
    expect(doc.querySelector('input').style.height).toBe('44px')
    expect(fieldStyles('input', { inputType: 'email' }).label.color).toBeUndefined()
  })

  it('sizes a new field to what it holds', () => {
    expect(fieldSize('input', { inputType: 'textarea', label: 'Message' }).h).toBeGreaterThan(fieldSize('input', { inputType: 'text', label: 'Name' }).h)
    expect(fieldSize('input', { inputType: 'checkbox', label: 'Agree' }).h).toBeLessThan(40)
  })
})

describe('the show/hide button on a published page', () => {
  const pages = []
  afterEach(() => pages.splice(0).forEach((page) => page.window.close()))

  it('shows the password and hides it again', () => {
    const page = new JSDOM(`<body>${html({ inputType: 'password' })}</body>`, { url: 'https://example.test/', runScripts: 'outside-only' })
    pages.push(page)
    page.window.eval(builderInteractiveJs())
    page.window.document.dispatchEvent(new page.window.Event('DOMContentLoaded'))
    const input = page.window.document.querySelector('input')
    const button = page.window.document.querySelector('[data-pwb-reveal]')

    button.dispatchEvent(new page.window.MouseEvent('click', { bubbles: true, cancelable: true }))
    expect([input.type, button.getAttribute('aria-pressed')]).toEqual(['text', 'true'])
    button.dispatchEvent(new page.window.MouseEvent('click', { bubbles: true, cancelable: true }))
    expect([input.type, button.getAttribute('aria-pressed')]).toEqual(['password', 'false'])
  })
})
