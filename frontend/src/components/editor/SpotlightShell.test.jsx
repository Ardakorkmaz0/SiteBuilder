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
})
