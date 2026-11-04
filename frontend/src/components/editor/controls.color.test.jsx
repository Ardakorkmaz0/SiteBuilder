import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { LabeledColor } from './controls.jsx'

// The canvas keeps what it is given and shows a default while the setting is
// empty: `page.background || '#ffffff'` in the page settings.
function Setting({ initial = '', fallbackValue = '', onChange = () => {} }) {
  const [value, setValue] = useState(initial)
  return (
    <LanguageProvider>
      <LabeledColor
        label="Page background"
        value={value || fallbackValue}
        onChange={(next) => {
          onChange(next)
          setValue(next)
        }}
      />
    </LanguageProvider>
  )
}

const field = () => screen.getByRole('textbox', { name: 'Page background' })

describe('LabeledColor on a setting that stores what it gets', () => {
  it('still hands over every keystroke, whole values and partial ones', async () => {
    const onChange = vi.fn()
    render(<Setting initial="#111111" onChange={onChange} />)
    const user = userEvent.setup()

    await user.clear(field())
    await user.keyboard('#7a')

    expect(onChange.mock.calls.map(([value]) => value)).toEqual(['', '#', '#7', '#7a'])
    expect(field()).toHaveValue('#7a')
    await user.tab()
    expect(field()).toHaveValue('#7a')
  })

  it('takes a value that is not a plain colour, as the canvas always has', () => {
    const onChange = vi.fn()
    render(<Setting initial="#111111" onChange={onChange} />)

    fireEvent.change(field(), { target: { value: 'var(--brand)' } })

    expect(onChange).toHaveBeenCalledWith('var(--brand)')
    expect(field()).toHaveValue('var(--brand)')
  })

  it('does not put the default back under a field being cleared and retyped', async () => {
    render(<Setting initial="#111111" fallbackValue="#ffffff" />)
    const user = userEvent.setup()

    await user.clear(field())
    expect(field()).toHaveValue('')
    await user.keyboard('#7a2e12')
    expect(field()).toHaveValue('#7a2e12')
  })

  it('shows the default again once a field is left empty', async () => {
    render(<Setting initial="#111111" fallbackValue="#ffffff" />)
    const user = userEvent.setup()

    await user.clear(field())
    await user.tab()

    expect(field()).toHaveValue('#ffffff')
  })

  it('follows the value from outside when nobody is typing', () => {
    const { rerender } = render(<LanguageProvider><LabeledColor label="Page background" value="#111111" onChange={() => {}} /></LanguageProvider>)
    expect(field()).toHaveValue('#111111')
    rerender(<LanguageProvider><LabeledColor label="Page background" value="#222222" onChange={() => {}} /></LanguageProvider>)
    expect(field()).toHaveValue('#222222')
  })
})
