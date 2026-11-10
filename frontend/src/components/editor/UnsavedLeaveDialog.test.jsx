// The leave question takes the keyboard: focus moves into it, Tab stays on its
// three answers, and Esc is Stay.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import UnsavedLeaveDialog from './UnsavedLeaveDialog.jsx'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'

function Page({ open, saving = false, onStay = () => {} }) {
  return (
    <LanguageProvider>
      <button type="button">Back</button>
      <UnsavedLeaveDialog open={open} saving={saving} onStay={onStay} onSave={() => {}} onDiscard={() => {}} />
    </LanguageProvider>
  )
}

const dialog = () => screen.getByRole('dialog', { name: 'Save before leaving?', exact: true })
const button = (name) => screen.getByRole('button', { name, exact: true })

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('the unsaved-changes dialog', () => {
  it('takes focus from the button that opened it', () => {
    localStorage.setItem('pwb_language', 'en')
    const { rerender } = render(<Page open={false} />)
    button('Back').focus()

    rerender(<Page open />)

    expect(document.activeElement).toBe(dialog())
  })

  it('answers Esc with Stay', () => {
    localStorage.setItem('pwb_language', 'en')
    const onStay = vi.fn()
    render(<Page open onStay={onStay} />)

    fireEvent.keyDown(document.body, { key: 'Escape' })

    expect(onStay).toHaveBeenCalledTimes(1)
  })

  it('ignores Esc while the save is on its way', () => {
    localStorage.setItem('pwb_language', 'en')
    const onStay = vi.fn()
    render(<Page open saving onStay={onStay} />)

    fireEvent.keyDown(document.body, { key: 'Escape' })

    expect(onStay).not.toHaveBeenCalled()
  })

  it('keeps Tab on its three answers', () => {
    localStorage.setItem('pwb_language', 'en')
    render(<Page open />)

    button('Save and leave').focus()
    fireEvent.keyDown(document.activeElement, { key: 'Tab' })
    expect(document.activeElement).toBe(button('Stay'))

    fireEvent.keyDown(document.activeElement, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(button('Save and leave'))
  })
})
