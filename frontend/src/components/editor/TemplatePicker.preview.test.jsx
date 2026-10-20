import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import TemplatePicker from './TemplatePicker.jsx'

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
})

async function openPreview() {
  const user = userEvent.setup()
  const onClose = vi.fn()
  render(<LanguageProvider><TemplatePicker open title="Review" onPick={vi.fn()} onClose={onClose} /></LanguageProvider>)
  const gallery = screen.getByRole('dialog', { name: /^Template gallery/ })
  const opener = within(gallery).getAllByRole('button', { name: 'Preview', exact: true })[0]
  opener.focus()
  await user.keyboard('{Enter}')
  return { user, onClose, gallery, opener }
}

describe('the full-screen template preview', () => {
  it('takes focus as a named modal while its gallery is inert', async () => {
    const { gallery } = await openPreview()
    const preview = screen.getByRole('dialog', { name: 'Full-screen template preview' })
    expect(preview).toHaveAttribute('aria-modal', 'true')
    expect(preview).toHaveFocus()
    expect(gallery).toHaveAttribute('inert')
    expect(screen.getByTitle('Full-screen template preview')).toHaveAttribute('sandbox', '')
  })

  it('keeps forward and backward Tab on its actions and returns to its opener on Escape', async () => {
    const { user, opener, gallery, onClose } = await openPreview()
    const preview = screen.getByRole('dialog', { name: 'Full-screen template preview' })
    const useTemplate = within(preview).getByRole('button', { name: 'Use this template' })
    const close = within(preview).getByRole('button', { name: 'Close preview' })
    await user.tab()
    expect(useTemplate).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.tab()
    expect(useTemplate).toHaveFocus()
    await user.tab({ shift: true })
    expect(close).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Full-screen template preview' })).not.toBeInTheDocument()
    expect(gallery).not.toHaveAttribute('inert')
    expect(opener).toHaveFocus()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes only the preview when its own backdrop is clicked', async () => {
    const { user, onClose, gallery } = await openPreview()
    await user.click(screen.getByRole('dialog', { name: 'Full-screen template preview' }))
    expect(screen.queryByTitle('Full-screen template preview')).not.toBeInTheDocument()
    expect(gallery).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
