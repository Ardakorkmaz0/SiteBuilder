// The arrow keys of a row of radio buttons.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { moveInRadioGroup } from './radioGroupKeys.js'

function Group({ onChoose, disabledName }) {
  return (
    <div role="radiogroup" onKeyDown={moveInRadioGroup}>
      {['One', 'Two', 'Three'].map((name) => (
        <button key={name} type="button" role="radio" aria-checked="false" disabled={name === disabledName} onClick={() => onChoose(name)}>{name}</button>
      ))}
    </div>
  )
}

const radio = (name) => screen.getByRole('radio', { name })

afterEach(cleanup)

describe('the arrow keys of a radio group', () => {
  it.each([
    ['ArrowRight', 'One', 'Two'],
    ['ArrowDown', 'One', 'Two'],
    ['ArrowLeft', 'Three', 'Two'],
    ['ArrowUp', 'Three', 'Two'],
    ['ArrowRight', 'Three', 'One'],
    ['ArrowLeft', 'One', 'Three'],
  ])('%s from %s moves to %s and chooses it', (key, from, to) => {
    const onChoose = vi.fn()
    render(<Group onChoose={onChoose} />)
    radio(from).focus()
    fireEvent.keyDown(radio(from), { key })
    expect(radio(to)).toHaveFocus()
    expect(onChoose.mock.calls).toEqual([[to]])
  })

  it('skips a choice that is switched off', () => {
    const onChoose = vi.fn()
    render(<Group onChoose={onChoose} disabledName="Two" />)
    fireEvent.keyDown(radio('One'), { key: 'ArrowRight' })
    expect(radio('Three')).toHaveFocus()
    expect(onChoose.mock.calls).toEqual([['Three']])
  })

  it('stops the page from scrolling, and leaves every other key alone', () => {
    const onChoose = vi.fn()
    render(<Group onChoose={onChoose} />)
    const arrow = createEvent.keyDown(radio('One'), { key: 'ArrowDown' })
    fireEvent(radio('One'), arrow)
    expect(arrow.defaultPrevented).toBe(true)
    onChoose.mockClear()
    const tab = createEvent.keyDown(radio('Two'), { key: 'Tab' })
    fireEvent(radio('Two'), tab)
    expect(tab.defaultPrevented).toBe(false)
    expect(onChoose).not.toHaveBeenCalled()
  })
})
