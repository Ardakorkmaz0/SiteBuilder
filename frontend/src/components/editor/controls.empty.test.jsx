import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LabeledNumber } from './controls.jsx'

describe('optional empty numeric style controls', () => {
  it('keeps the existing integer-control clear-to-zero contract by default', () => {
    const onChange = vi.fn()
    render(<LabeledNumber label="Width" value={16} onChange={onChange} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } })
    expect(onChange).toHaveBeenLastCalledWith(0)
  })

  it('distinguishes clearing an opted-in HTML style from choosing zero', () => {
    const onChange = vi.fn()
    render(<LabeledNumber label="Padding" value={16} allowEmpty onChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '' } })
    expect(onChange).toHaveBeenLastCalledWith('')
    expect(input).toHaveValue(null)
    fireEvent.change(input, { target: { value: '0' } })
    expect(onChange).toHaveBeenLastCalledWith(0)
    expect(input).toHaveValue(0)
  })

  it('keeps a cleared draft blank while typing and shows the inherited value on blur', () => {
    const onChange = vi.fn()
    const { rerender } = render(<LabeledNumber label="Gap" value={24} allowEmpty onChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '' } })
    rerender(<LabeledNumber label="Gap" value={16} allowEmpty onChange={onChange} />)
    expect(input).toHaveValue(null)
    fireEvent.blur(input)
    expect(input).toHaveValue(16)
  })
})
