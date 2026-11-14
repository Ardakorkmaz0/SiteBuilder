// The HTML spotlight opens from the element's toolbar inside the page's
// iframe. Focus stayed in there, so Esc and Tab never reached this dialog.
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import SpotlightShell from './SpotlightShell.jsx'

function renderShell(onClose = vi.fn()) {
  localStorage.setItem('pwb_language', 'en')
  render(
    <LanguageProvider>
      <SpotlightShell open title="<h1>" onClose={onClose} renderPreview={() => <p>preview</p>} panel={null} caption={() => ''} />
    </LanguageProvider>,
  )
  return onClose
}

describe('SpotlightShell', () => {
  it('takes focus when it opens', () => {
    renderShell()
    expect(screen.getByRole('dialog', { name: 'Open large' })).toHaveFocus()
  })

  it('closes on Esc', async () => {
    const onClose = renderShell()
    await userEvent.setup().keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('keeps Tab and Shift+Tab inside the modal dialog and exposes panel without hidden classes', async () => {
    localStorage.setItem('pwb_language', 'en')
    render(
      <LanguageProvider>
        <button type="button">Outside trigger</button>
        <SpotlightShell
          open
          title="<h1>"
          onClose={vi.fn()}
          renderPreview={() => <p>preview</p>}
          panel={<button type="button">Inside inspector</button>}
          caption={() => ''}
        />
      </LanguageProvider>,
    )

    const outside = screen.getByRole('button', { name: 'Outside trigger' })
    const dialog = screen.getByRole('dialog', { name: 'Open large' })
    const insidePanelBtn = screen.getByRole('button', { name: 'Inside inspector' })
    const aside = insidePanelBtn.closest('aside')

    expect(aside).not.toBeNull()
    expect(aside.className).not.toMatch(/\bhidden\b/)

    const user = userEvent.setup()
    insidePanelBtn.focus()
    await user.tab()
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).not.toBe(outside)

    await user.tab({ shift: true })
    expect(document.activeElement).toBe(insidePanelBtn)
  })
})
