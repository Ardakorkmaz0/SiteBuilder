// A block is drawn with a look of its own (an alert's tinted box, a quote's bar)
// and the styles its owner wrote over it. React writes a style object key by
// key, so a look written in a shorthand loses a value when the owner changes or
// takes back a longhand of it. These tests hold the two apart.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { registry } from '../registry.jsx'
import { ALLOWED_STYLE_KEYS } from '../../utils/sanitize.js'
import { RenderComponent } from './Renderer.jsx'

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function block(type, styles = {}, props = {}) {
  const def = registry[type]
  return {
    id: `${type}_1`,
    type,
    props: { ...def.defaultProps, ...props },
    styles,
    layout: { x: 0, y: 0, ...def.defaultSize },
    children: [],
  }
}

const draw = (component) => <RenderComponent component={component} />

// React's own report of a shorthand and one of its longhands in one style object.
const conflicts = (errors) => errors.mock.calls
  .map((call) => call.map(String).join(' '))
  .filter((text) => text.includes('conflicting property'))

describe('an alert', () => {
  // The "info" alert: background #eff6ff, border #60a5fa.
  const alert = (styles) => block('alert', styles, { variant: 'info' })
  const box = (view) => view.container.querySelector('svg').parentElement

  it('is drawn in its own colours again when a background is taken back', () => {
    const view = render(draw(alert()))
    expect(box(view).style.backgroundColor).toBe('rgb(239, 246, 255)')
    view.rerender(draw(alert({ backgroundColor: '#ff0000' })))
    expect(box(view).style.backgroundColor).toBe('rgb(255, 0, 0)')
    view.rerender(draw(alert()))
    expect(box(view).style.backgroundColor).toBe('rgb(239, 246, 255)')
  })

  it('keeps its border when a border colour is taken back', () => {
    const view = render(draw(alert()))
    view.rerender(draw(alert({ borderColor: '#0000ff' })))
    expect(box(view).style.borderTopColor).toBe('rgb(0, 0, 255)')
    view.rerender(draw(alert()))
    expect(box(view).style.borderTopColor).toBe('rgb(96, 165, 250)')
    expect(box(view).style.borderTopWidth).toBe('1px')
    expect(box(view).style.borderTopStyle).toBe('solid')
  })

  it('keeps its border and padding when the fields were emptied and saved', () => {
    const view = render(draw(alert({ borderWidth: '', padding: '', backgroundColor: '' })))
    expect(box(view).style.borderTopWidth).toBe('1px')
    expect(box(view).style.paddingTop).toBe('12px')
    expect(box(view).style.paddingLeft).toBe('16px')
    expect(box(view).style.backgroundColor).toBe('rgb(239, 246, 255)')
  })
})

describe('an accordion', () => {
  it('keeps the colour of its border when a border colour is taken back', () => {
    const view = render(draw(block('accordion')))
    const details = view.container.querySelector('details')
    view.rerender(draw(block('accordion', { borderColor: '#0000ff' })))
    expect(details.style.borderTopColor).toBe('rgb(0, 0, 255)')
    view.rerender(draw(block('accordion')))
    expect(details.style.borderTopColor).toBe('rgb(229, 231, 235)')
    expect(details.style.borderTopWidth).toBe('1px')
  })
})

describe('an HTML block', () => {
  const BORDER = { borderWidth: '3px', borderStyle: 'solid', borderColor: '#ff0000' }

  // The published page draws this border, so the canvas has to.
  it('is drawn with the border its owner gave it, from the first render', () => {
    const view = render(draw(block('html', BORDER)))
    const frame = view.container.querySelector('iframe')
    expect(frame.style.borderTopWidth).toBe('3px')
    expect(frame.style.borderTopStyle).toBe('solid')
    expect(frame.style.borderTopColor).toBe('rgb(255, 0, 0)')
  })

  it('has no border once the border is taken back', () => {
    const view = render(draw(block('html', BORDER)))
    const frame = view.container.querySelector('iframe')
    view.rerender(draw(block('html')))
    expect(frame.style.borderTopStyle).toBe('none')
    expect(frame.style.borderTopWidth).toBe('0px')
  })

  // Width, height, display and the `border` shorthand of this block are the
  // Renderer's (layout.js, SETTLED_STYLES): only the assistant can write them.
  it('is not drawn with a border shorthand', () => {
    const view = render(draw(block('html', { border: '5px dashed #123456' })))
    const frame = view.container.querySelector('iframe')
    expect(frame.style.borderTopStyle).toBe('none')
    expect(frame.style.borderTopWidth).toBe('0px')
  })
})

describe('a navbar', () => {
  // Written as `gap` next to `rowGap`, a new link gap became the row gap too:
  // React writes `gap` again and leaves the unchanged `rowGap` alone.
  it('keeps the space between its rows of links when the space between links changes', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const view = render(draw(block('navbar', {}, { linkGap: 20 })))
    const links = view.container.querySelector('a').parentElement
    view.rerender(draw(block('navbar', {}, { linkGap: 48 })))
    expect(conflicts(errors)).toEqual([])
    expect(links.style.gap).toBe('')
    expect(links.style.columnGap).toBe('48px')
    expect(links.style.rowGap).toBe('6px')
  })
})

describe('tabs', () => {
  it('underline only the tab that is open, after another tab was opened', () => {
    const tabs = [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }]
    const view = render(draw(block('tabs', {}, { tabs, activeId: 'one' })))
    const [one, two] = view.container.querySelectorAll('[role="tab"]')
    expect(one.style.borderBottomColor).toBe('rgb(37, 99, 235)')
    expect(two.style.borderBottomColor).toBe('transparent')
    fireEvent.click(two)
    expect(two.getAttribute('aria-selected')).toBe('true')
    expect(two.style.borderBottomColor).toBe('rgb(37, 99, 235)')
    expect(one.style.borderBottomColor).toBe('transparent')
    expect(one.style.borderBottomWidth).toBe('2px')
    expect(one.style.borderTopWidth).toBe('0px')
  })
})

// Styles only the assistant or an imported site can write.
describe('a shorthand the owner writes over a look', () => {
  it('gives a list its indent back when a padding is taken back', () => {
    const view = render(draw(block('list')))
    const list = view.container.querySelector('ul')
    expect(list.style.paddingLeft).toBe('1.4em')
    view.rerender(draw(block('list', { padding: '33px' })))
    expect(list.style.paddingLeft).toBe('33px')
    view.rerender(draw(block('list')))
    expect(list.style.paddingLeft).toBe('1.4em')
    expect(list.style.paddingTop).toBe('')
  })

  it('gives a quote its bar back when a border colour is taken back', () => {
    const view = render(draw(block('quote')))
    const quote = view.container.querySelector('blockquote')
    view.rerender(draw(block('quote', { borderColor: '#0000ff' })))
    expect(quote.style.borderLeftColor).toBe('rgb(0, 0, 255)')
    view.rerender(draw(block('quote')))
    expect(quote.style.borderLeftColor).toBe('currentcolor')
    expect(quote.style.borderLeftWidth).toBe('4px')
    expect(quote.style.borderLeftStyle).toBe('solid')
  })

  it('reaches every side of a divider', () => {
    const view = render(draw(block('divider', { margin: '7px' })))
    const line = view.container.querySelector('[style*="margin"]')
    expect(line.style.marginLeft).toBe('7px')
    expect(line.style.marginRight).toBe('7px')
    expect(line.style.marginTop).toBe('7px')
  })
})

// One value for every style an owner can write, none of them a block's own.
const SAMPLE = {
  backgroundColor: '#ff0000', backgroundImage: 'linear-gradient(red, blue)', color: '#00ff00', fontSize: '31px',
  fontWeight: '900', fontFamily: 'Georgia, serif', fontStyle: 'oblique', textAlign: 'right', textDecoration: 'underline',
  textTransform: 'uppercase', lineHeight: '2.5', letterSpacing: '3px', padding: '33px', margin: '7px',
  borderRadius: '21px', border: '5px dashed #123456', borderColor: '#0000ff', borderWidth: '4px', borderStyle: 'dotted',
  width: '77%', maxWidth: '333px', minHeight: '99px', height: '88px', boxShadow: '0 0 9px #000', display: 'grid',
  gap: '13px', objectFit: 'contain', opacity: '0.4', transform: 'rotate(3deg)', filter: 'blur(2px)',
  backdropFilter: 'blur(3px)', textShadow: '1px 1px #000', aspectRatio: '2 / 1', objectPosition: 'top',
  backgroundSize: 'contain', backgroundPosition: 'left top', backgroundRepeat: 'repeat-x', cursor: 'crosshair',
  overflow: 'scroll',
}

// A `border` next to a border width, style or colour is a mix inside the owner's
// own styles (only the assistant can write one). What is held here is the look
// against the owner's styles, so a default style that shares a property with the
// style under test is left out.
const SHARES = {
  border: ['borderWidth', 'borderStyle', 'borderColor'],
  borderWidth: ['border'],
  borderStyle: ['border'],
  borderColor: ['border'],
}

// Every inline declaration the block is drawn with, element by element.
function drawn(container) {
  return [...container.querySelectorAll('*')].map((el) => {
    const declarations = []
    for (let i = 0; i < el.style.length; i += 1) {
      declarations.push(`${el.style[i]}:${el.style.getPropertyValue(el.style[i])}`)
    }
    return `${el.tagName.toLowerCase()}{${declarations.sort().join(';')}}`
  }).join('\n')
}

describe('every block type', () => {
  it('has a sample value for every style an owner can write', () => {
    expect(Object.keys(SAMPLE).sort()).toEqual([...ALLOWED_STYLE_KEYS].sort())
  })

  it.each(Object.keys(registry))('%s is drawn the same however a style reached it', (type) => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrong = []
    for (const key of ALLOWED_STYLE_KEYS) {
      const without = { ...registry[type].defaultStyles }
      for (const shared of [key, ...(SHARES[key] || [])]) delete without[shared]
      const withIt = { ...without, [key]: SAMPLE[key] }

      const fresh = render(draw(block(type, without)))
      const freshLook = drawn(fresh.container)
      cleanup()

      const first = render(draw(block(type, withIt)))
      const firstLook = drawn(first.container)
      cleanup()

      const view = render(draw(block(type, without)))
      view.rerender(draw(block(type, withIt)))
      if (drawn(view.container) !== firstLook) wrong.push(`${key}: set on a drawn block, it differs from a block first drawn with it`)
      view.rerender(draw(block(type, without)))
      if (drawn(view.container) !== freshLook) wrong.push(`${key}: taken back, the block is not what it was`)
      cleanup()

      const emptied = render(draw(block(type, { ...without, [key]: '' })))
      if (drawn(emptied.container) !== freshLook) wrong.push(`${key}: emptied, the block is not drawn as without it`)
      cleanup()
    }
    expect(wrong).toEqual([])
    expect(conflicts(errors)).toEqual([])
  })
})
