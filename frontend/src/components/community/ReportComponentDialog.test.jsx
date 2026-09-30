// Flagging a block: the dialog takes the keyboard and Esc puts it away, like
// the site report beside it.
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import ReportComponentDialog from './ReportComponentDialog.jsx'
import { reportComponent } from '../../api/community.js'

vi.mock('../../api/community.js', () => ({ reportComponent: vi.fn() }))

function renderDialog(onClose = vi.fn()) {
  localStorage.setItem('pwb_language', 'en')
  render(
    <LanguageProvider>
      <ReportComponentDialog component={{ id: 3, title: 'Pricing card' }} onClose={onClose} />
    </LanguageProvider>,
  )
  return onClose
}

describe('reporting a block', () => {
  it('starts on the reason and closes on Esc', async () => {
    const user = userEvent.setup()
    const onClose = renderDialog()
    expect(screen.getByRole('combobox', { name: 'Reason' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('moves the keyboard to Close once the report is in', async () => {
    reportComponent.mockResolvedValue({})
    const user = userEvent.setup()
    renderDialog()
    await user.click(screen.getByRole('button', { name: /Submit|Send|Report/ }))
    expect(await screen.findByText('Thanks — a moderator will look at it.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Close' }).at(-1)).toHaveFocus()
  })
})
