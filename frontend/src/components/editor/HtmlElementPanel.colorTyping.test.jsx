// A colour typed one key at a time passes through values that are no colour at
// all. The panel re-reads the element after every change, so the real panel, the
// real writers and a real element are wired together here the way the editor
// wires them.
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { applyElementPatch, applyMobileElementPatch, describeElement } from '../../utils/htmlElementEdit.js'
import HtmlElementPanel from './HtmlElementPanel.jsx'

function Workspace({ element, apply, onPatch }) {
  const [info, setInfo] = useState(() => describeElement(element))
  return (
    <LanguageProvider>
      <HtmlElementPanel
        info={info}
        onChange={(patch) => {
          onPatch(patch)
          apply(element, patch)
          setInfo(describeElement(element))
        }}
      />
    </LanguageProvider>
  )
}

async function open(html, { apply = applyElementPatch } = {}) {
  localStorage.setItem('pwb_language', 'en')
  document.body.innerHTML = `${html}<div id="panel"></div>`
  const element = document.getElementById('selected')
  const onPatch = vi.fn()
  const user = userEvent.setup()
  render(<Workspace element={element} apply={apply} onPatch={onPatch} />, { container: document.getElementById('panel') })
  await user.click(screen.getByRole('tab', { name: 'Design' }))
  return { element, onPatch, user }
}

const field = (name) => screen.getByRole('textbox', { name, exact: true })
const openGroup = (user, name) => user.click(screen.getByRole('button', { name }))

// Asserted key by key: at the end alone, a field that lost every key but the
// last few could not be told from one that kept them.
async function typeKeys(user, input, text) {
  let typed = input.value
  for (const key of text) {
    await user.keyboard(key)
    typed += key
    expect(input).toHaveValue(typed)
  }
}

beforeEach(() => localStorage.clear())

describe('typing a colour into the HTML element panel', () => {
  it('keeps every key of a colour typed into a cleared field, and applies it', async () => {
    const { element, user } = await open('<style>h1 { color: #2c2520 }</style><h1 id="selected">Hi</h1>')
    const input = field('Text color')
    expect(input).toHaveValue('#2c2520')

    await user.clear(input)
    expect(input).toHaveValue('')
    await typeKeys(user, input, '#7a2e12')

    expect(element.style.getPropertyValue('color')).toBe('rgb(122, 46, 18)')
    expect(element.style.getPropertyPriority('color')).toBe('important')
    await user.tab()
    expect(input).toHaveValue('#7a2e12')
  })

  it('writes nothing to the element until the typed text is a colour', async () => {
    const { element, onPatch, user } = await open('<h1 id="selected" style="color: #2c2520">Hi</h1>')
    const input = field('Text color')

    await user.clear(input)
    await user.keyboard('#7a')

    expect(onPatch).not.toHaveBeenCalled()
    expect(element.style.getPropertyValue('color')).toBe('rgb(44, 37, 32)')
  })

  it('puts the colour in use back when the person leaves on a half-typed one', async () => {
    const { element, onPatch, user } = await open('<h1 id="selected" style="color: #2c2520">Hi</h1>')
    const input = field('Text color')

    await user.clear(input)
    await user.keyboard('#7a')
    await user.tab()

    expect(input).toHaveValue('#2c2520')
    expect(onPatch).not.toHaveBeenCalled()
    expect(element.style.getPropertyValue('color')).toBe('rgb(44, 37, 32)')
  })

  it('still lets a field left empty clear the override', async () => {
    const { element, onPatch, user } = await open('<style>h1 { color: #2c2520 }</style><h1 id="selected" style="color: #7a2e12">Hi</h1>')
    const input = field('Text color')

    await user.clear(input)
    expect(onPatch).not.toHaveBeenCalled()
    await user.tab()

    expect(onPatch).toHaveBeenCalledTimes(1)
    expect(onPatch).toHaveBeenCalledWith({ color: '' })
    expect(element.style.getPropertyValue('color')).toBe('')
    expect(input).toHaveValue('#2c2520')
  })

  it('applies a pasted colour at once, in one write', async () => {
    const { element, onPatch, user } = await open('<h1 id="selected" style="color: #2c2520">Hi</h1>')
    const input = field('Text color')

    await user.click(input)
    await user.keyboard('{Control>}a{/Control}')
    await user.paste('#7a2e12')

    expect(onPatch).toHaveBeenCalledTimes(1)
    expect(onPatch).toHaveBeenCalledWith({ color: '#7a2e12' })
    expect(element.style.getPropertyValue('color')).toBe('rgb(122, 46, 18)')
    expect(input).toHaveValue('#7a2e12')
  })

  it('applies a pasted colour that is not a hex code, and shows its hex after leaving', async () => {
    const { element, user } = await open('<h1 id="selected" style="color: #2c2520">Hi</h1>')
    const input = field('Text color')

    await user.click(input)
    await user.keyboard('{Control>}a{/Control}')
    await user.paste('rgb(122, 46, 18)')
    expect(input).toHaveValue('rgb(122, 46, 18)')
    expect(element.style.getPropertyValue('color')).toBe('rgb(122, 46, 18)')

    await user.tab()
    expect(input).toHaveValue('#7a2e12')
  })

  it('lets the swatch replace a half-typed colour', async () => {
    const { element, user } = await open('<h1 id="selected" style="color: #2c2520">Hi</h1>')
    const input = field('Text color')

    await user.clear(input)
    await user.keyboard('#7a')
    fireEvent.change(screen.getByLabelText('Pick a colour: Text color'), { target: { value: '#2563eb' } })

    expect(element.style.getPropertyValue('color')).toBe('rgb(37, 99, 235)')
    expect(input).toHaveValue('#2563eb')
  })

  // On a phone the value goes into a custom property, which the browser takes
  // whatever it holds: `#7` there would leave the heading with no colour at all.
  it('writes no half-typed colour into a phone override', async () => {
    const { element, user } = await open('<h1 id="selected" style="color: #2c2520">Hi</h1>', { apply: applyMobileElementPatch })
    const input = field('Text color')

    await user.clear(input)
    await typeKeys(user, input, '#7a')
    expect(element.getAttribute('style')).not.toContain('#7')

    await typeKeys(user, input, '2e12')
    expect(element.getAttribute('style')).toContain('#7a2e12')
  })

  // Clearing a stop writes `gradientFrom: ''`, which drops the whole gradient,
  // so the other stop was gone by the time the new colour was typed.
  it('keeps the other gradient stop when one stop is cleared and retyped', async () => {
    const { element, user } = await open('<section id="selected" style="background-image: linear-gradient(45deg, #e11d48, #2563eb)">Hi</section>')
    await openGroup(user, 'Background image & gradient')
    const from = field('Gradient from')
    expect(from).toHaveValue('#e11d48')

    await user.clear(from)
    await typeKeys(user, from, '#7a2e12')

    expect(element.style.backgroundImage).toBe('linear-gradient(45deg, rgb(122, 46, 18), rgb(37, 99, 235))')
  })

  it('keeps every key in the background and border colour fields too', async () => {
    const { element, user } = await open('<div id="selected" style="background-color: #ffeedd; border: 1px solid #112233">Hi</div>')
    const background = field('Background')
    await user.clear(background)
    await typeKeys(user, background, '#7a2e12')
    expect(element.style.getPropertyValue('background-color')).toBe('rgb(122, 46, 18)')

    await openGroup(user, 'Border')
    const border = field('Border color')
    await user.clear(border)
    await typeKeys(user, border, '#123456')
    expect(element.style.getPropertyValue('border-color')).toBe('rgb(18, 52, 86)')
  })

  // Firefox can leave the panel's field focused while the click selects another
  // element in the page: its blur comes only later, with that element selected.
  describe('when another element gets selected before the field is left', () => {
    // fireEvent moves no focus: this selects without the field being left.
    const select = () => fireEvent.click(screen.getByRole('button', { name: 'Select the other' }))
    function Switching({ first, other, onPatch }) {
      const [element, setElement] = useState(first)
      const [, refresh] = useState(0)
      return (
        <LanguageProvider>
          <button type="button" onClick={() => setElement(other)}>Select the other</button>
          <HtmlElementPanel
            info={describeElement(element)}
            onChange={(patch) => {
              onPatch(patch)
              applyElementPatch(element, patch)
              refresh((n) => n + 1)
            }}
          />
        </LanguageProvider>
      )
    }

    async function openTwo() {
      localStorage.setItem('pwb_language', 'en')
      document.body.innerHTML = '<h1 id="a" style="color:#112233">A</h1><h1 id="b" style="color:#445566">B</h1><div id="panel"></div>'
      const [a, b] = [document.getElementById('a'), document.getElementById('b')]
      const onPatch = vi.fn()
      const user = userEvent.setup()
      render(<Switching first={a} other={b} onPatch={onPatch} />, { container: document.getElementById('panel') })
      await user.click(screen.getByRole('tab', { name: 'Design' }))
      return { a, b, onPatch, user }
    }

    it('does not clear the new element when the emptied field is left', async () => {
      const { a, b, onPatch, user } = await openTwo()
      const input = field('Text color')

      await user.clear(input)
      select()
      expect(input).toHaveValue('#445566')
      await user.click(input)
      await user.tab()

      expect(onPatch).not.toHaveBeenCalled()
      expect(b.style.getPropertyValue('color')).toBe('rgb(68, 85, 102)')
      expect(a.style.getPropertyValue('color')).toBe('rgb(17, 34, 51)')
    })

    it('drops a half-typed colour with the element it was typed for', async () => {
      const { user } = await openTwo()
      const input = field('Text color')

      await user.clear(input)
      await user.keyboard('#7a')
      select()

      expect(input).toHaveValue('#445566')
    })
  })

  describe('a gradient stop', () => {
    const GRADIENT = '<section id="selected" style="background-image: linear-gradient(45deg, #e11d48, #2563eb)">Hi</section>'

    // In a gradient the browser refuses these, and on a phone the value goes
    // into a variable that takes them anyway: the gradient was gone there.
    it.each(['inherit', 'initial', 'unset', 'revert'])('takes no %s, which a gradient cannot hold', async (keyword) => {
      const { element, onPatch, user } = await open(GRADIENT, { apply: applyMobileElementPatch })
      await openGroup(user, 'Background image & gradient')
      const from = field('Gradient from')

      await user.clear(from)
      await user.keyboard(keyword)

      expect(onPatch).not.toHaveBeenCalled()
      expect(element.getAttribute('style')).not.toContain(keyword)
      expect(from).toHaveValue(keyword)
      await user.tab()
      expect(from).toHaveValue('#e11d48')
    })

    it('takes no keyword at its end either', async () => {
      const { onPatch, user } = await open(GRADIENT, { apply: applyMobileElementPatch })
      await openGroup(user, 'Background image & gradient')
      const to = field('Gradient to')

      await user.clear(to)
      await user.keyboard('inherit')

      expect(onPatch).not.toHaveBeenCalled()
    })

    it('still takes a colour by name', async () => {
      const { onPatch, user } = await open(GRADIENT)
      await openGroup(user, 'Background image & gradient')
      const from = field('Gradient from')

      await user.clear(from)
      await user.paste('red')

      expect(onPatch).toHaveBeenCalledWith({ gradientFrom: 'red' })
    })

    it('leaves inherit to the plain colour fields, where it means something', async () => {
      const { onPatch, user } = await open('<h1 id="selected" style="color: #2c2520">Hi</h1>')
      const input = field('Text color')

      await user.clear(input)
      await user.paste('inherit')

      expect(onPatch).toHaveBeenCalledWith({ color: 'inherit' })
    })
  })
})
