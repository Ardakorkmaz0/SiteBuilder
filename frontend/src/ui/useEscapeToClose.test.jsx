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

function CodeDialog({ open, onClose = () => {} }) {
  useEscapeToClose(open, onClose)
  return open ? <div role="dialog"><button type="button" autoFocus>Copy</button></div> : null
}

function Toolbar({ open, withOpener = true }) {
  return (
    <>
      {withOpener && <button type="button">Code</button>}
      <input aria-label="Search" />
      <CodeDialog open={open} />
    </>
  )
}

describe('closing a dialog', () => {
  it('gives focus back to what opened it', () => {
    const { getByRole, rerender } = render(<Toolbar open={false} />)
    getByRole('button', { name: 'Code' }).focus()

    rerender(<Toolbar open />)
    expect(document.activeElement).toBe(getByRole('button', { name: 'Copy' }))
    rerender(<Toolbar open={false} />)

    expect(document.activeElement).toBe(getByRole('button', { name: 'Code' }))
  })

  it('leaves focus where the close put it on purpose', () => {
    const { getByRole, rerender } = render(<Toolbar open={false} />)
    getByRole('button', { name: 'Code' }).focus()
    rerender(<Toolbar open />)

    getByRole('textbox', { name: 'Search' }).focus()
    rerender(<Toolbar open={false} />)

    expect(document.activeElement).toBe(getByRole('textbox', { name: 'Search' }))
  })

  it('comes back to the menu button when the dialog came from a menu item', () => {
    function Menu({ menuOpen, dialogOpen }) {
      return (
        <>
          <button type="button">More</button>
          {menuOpen && <div role="menu"><button type="button" role="menuitem">Settings</button></div>}
          <CodeDialog open={dialogOpen} />
        </>
      )
    }
    const { getByRole, rerender } = render(<Menu menuOpen={false} dialogOpen={false} />)
    getByRole('button', { name: 'More' }).focus()
    rerender(<Menu menuOpen dialogOpen={false} />)
    getByRole('menuitem', { name: 'Settings' }).focus()

    rerender(<Menu menuOpen={false} dialogOpen />)
    rerender(<Menu menuOpen={false} dialogOpen={false} />)

    expect(document.activeElement).toBe(getByRole('button', { name: 'More' }))
  })

  it('leaves focus alone when nothing had it as the dialog opened', () => {
    const { getByRole, rerender } = render(<Toolbar open={false} />)
    getByRole('button', { name: 'Code' }).focus()
    getByRole('button', { name: 'Code' }).blur()
    rerender(<Toolbar open />)

    rerender(<Toolbar open={false} withOpener={false} />)

    expect(document.activeElement).toBe(document.body)
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
