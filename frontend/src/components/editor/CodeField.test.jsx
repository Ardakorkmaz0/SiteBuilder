// The source field: the colours behind it, its own text the browser's, and a
// switch that is remembered and reaches every open view.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { CodeColorsToggle, CodeField, CodeText } from './CodeField.jsx'
import { setCodeColors } from './useCodeColors.js'

const code = '<a href="x">t</a>'
const behind = (container) => container.querySelector('pre[aria-hidden="true"]')

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  act(() => setCodeColors(true))
})
afterEach(cleanup)

describe('the field', () => {
  it('stays the textbox it was: its name, value, ref and changes', () => {
    const ref = createRef()
    const onChange = vi.fn()
    render(<CodeField ref={ref} aria-label="Source" value={code} onChange={onChange} />)
    const box = screen.getByRole('textbox', { name: 'Source' })
    expect(box).toHaveValue(code)
    expect(ref.current).toBe(box)
    fireEvent.change(box, { target: { value: 'b' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('draws the colours behind it, hidden from a screen reader', () => {
    const { container } = render(<CodeField aria-label="Source" value={code} onChange={() => {}} />)
    expect(behind(container).querySelector('.code-t-tag').textContent).toBe('a')
    expect(screen.getByRole('textbox')).toHaveClass('code-field-input')
  })

  it('reads the language it is given', () => {
    const { container } = render(<CodeField aria-label="Source" lang="css" value="a{color:red}" onChange={() => {}} />)
    expect(behind(container).querySelector('.code-t-property').textContent).toBe('color')
  })

  it('keeps the colours where the text is when it scrolls', () => {
    const { container } = render(<CodeField aria-label="Source" value={code} onChange={() => {}} />)
    fireEvent.scroll(screen.getByRole('textbox'), { target: { scrollTop: 120 } })
    expect(behind(container).scrollTop).toBe(120)
  })

  it('leaves room for a last empty line', () => {
    const { container } = render(<CodeField aria-label="Source" value={'a\n'} onChange={() => {}} />)
    expect(behind(container).textContent).toBe('a\n\n')
  })

  it('is a plain field with the colours off, and passes on what it is told', () => {
    act(() => setCodeColors(false))
    const { container } = render(<CodeField aria-label="Source" className="mine" value={code} onChange={() => {}} />)
    expect(behind(container)).toBeNull()
    expect(screen.getByRole('textbox')).toHaveClass('mine')
    expect(screen.getByRole('textbox')).not.toHaveClass('code-field-input')
  })
})

describe('code that cannot be edited', () => {
  it('has the colours too, and none when they are off', () => {
    const { container, rerender } = render(<CodeText value={code} />)
    expect(container.querySelector('.code-t-tag')).not.toBeNull()
    act(() => setCodeColors(false))
    rerender(<CodeText value={code} />)
    expect(container.querySelector('.code-t-tag')).toBeNull()
    expect(container.textContent).toBe(code)
  })
})

describe('the switch', () => {
  const toggle = () => screen.getByRole('button', { name: 'Code colors' })
  const open = () => render(<LanguageProvider><CodeColorsToggle /><CodeField aria-label="Source" value={code} onChange={() => {}} /></LanguageProvider>)

  it('is on by default, turns the colours off, and is remembered', () => {
    const { container } = open()
    expect(toggle()).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(toggle())
    expect(toggle()).toHaveAttribute('aria-pressed', 'false')
    expect(behind(container)).toBeNull()
    expect(localStorage.getItem('pwb_code_colors')).toBe('off')
    cleanup()
    const again = open()
    expect(toggle()).toHaveAttribute('aria-pressed', 'false')
    expect(behind(again.container)).toBeNull()
  })

  it('keeps what was typed when it turns them off and on', () => {
    open()
    const before = screen.getByRole('textbox')
    expect(before).toHaveValue(code)
    fireEvent.click(toggle())
    expect(screen.getByRole('textbox')).toHaveValue(code)
    fireEvent.click(toggle())
    expect(screen.getByRole('textbox')).toHaveValue(code)
  })
})
