// Esc closes the dialog on top, only that one, and nothing behind it.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useEscapeToClose } from './useEscapeToClose.js'
import AiWizard from '../components/editor/AiWizard.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'

function Dialog({ open = true, onClose }) {
  useEscapeToClose(open, onClose)
  return open ? <div role="dialog" /> : null
}

afterEach(cleanup)

describe('useEscapeToClose', () => {
  it('closes the newest dialog first, then the one under it', () => {
    const gallery = vi.fn()
    const preview = vi.fn()
    const { rerender } = render(<><Dialog onClose={gallery} /><Dialog onClose={preview} /></>)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(preview).toHaveBeenCalledTimes(1)
    expect(gallery).not.toHaveBeenCalled()

    rerender(<><Dialog onClose={gallery} /><Dialog open={false} onClose={preview} /></>)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(gallery).toHaveBeenCalledTimes(1)
  })

  it('keeps the editor\'s own Esc shortcuts from firing behind a dialog', () => {
    const editorShortcut = vi.fn()
    document.addEventListener('keydown', editorShortcut)
    render(<Dialog onClose={vi.fn()} />)

    fireEvent.keyDown(document.body, { key: 'Escape' })

    expect(editorShortcut).not.toHaveBeenCalled()
    document.removeEventListener('keydown', editorShortcut)
  })

  it('leaves Esc alone once every dialog is closed', () => {
    const editorShortcut = vi.fn()
    document.addEventListener('keydown', editorShortcut)
    const { unmount } = render(<Dialog onClose={vi.fn()} />)
    unmount()

    fireEvent.keyDown(document.body, { key: 'Escape' })

    expect(editorShortcut).toHaveBeenCalledTimes(1)
    document.removeEventListener('keydown', editorShortcut)
  })

  it('ignores other keys and a key held for an input method', () => {
    const onClose = vi.fn()
    render(<Dialog onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Enter' })
    fireEvent.keyDown(document, { key: 'Escape', isComposing: true })

    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('the AI wizard', () => {
  it('closes on Esc, as a dialog', () => {
    localStorage.setItem('pwb_language', 'en')
    const onClose = vi.fn()
    const { getByRole } = render(
      <LanguageProvider>
        <AiWizard open onClose={onClose} onApply={vi.fn()} />
      </LanguageProvider>,
    )

    expect(getByRole('dialog', { name: 'AI Site Wizard' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
