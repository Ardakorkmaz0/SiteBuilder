// Notes float beside the work. Esc from inside the panel closes it; Esc on the
// canvas belongs to the canvas (it clears the selection), so it is left alone.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import NotesPanel from './NotesPanel.jsx'

function renderPanel() {
  localStorage.setItem('pwb_language', 'en')
  const onClose = vi.fn()
  render(<LanguageProvider><NotesPanel open onClose={onClose} /></LanguageProvider>)
  return onClose
}

describe('the notes panel', () => {
  it('is a named panel with a named close button', () => {
    renderPanel()
    expect(screen.getByRole('complementary', { name: 'Notes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close notes' })).toBeInTheDocument()
  })

  it('closes on Esc from inside, and leaves Esc elsewhere to the editor', () => {
    const onClose = renderPanel()
    const editorShortcut = vi.fn()
    window.addEventListener('keydown', editorShortcut)

    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    expect(editorShortcut).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(screen.getByRole('button', { name: 'Close notes' }), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(editorShortcut).toHaveBeenCalledTimes(1)
    window.removeEventListener('keydown', editorShortcut)
  })
})
