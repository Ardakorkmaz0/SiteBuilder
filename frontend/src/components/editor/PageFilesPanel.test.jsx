import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { useEditorStore } from '../../store/editorStore.js'
import PageFilesPanel from './PageFilesPanel.jsx'

function open() {
  render(
    <LanguageProvider>
      <PageFilesPanel mode="empty" />
    </LanguageProvider>,
  )
  return userEvent.setup()
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  useEditorStore.getState().loadSchema({ pages: [{ id: 'home', name: 'Home', components: [] }] })
})

// The question asked before a new page exists was an overlay and nothing more:
// a screen reader never heard it open, focus stayed on the button behind it,
// and Esc did not close it.
describe('the "How should this page start?" dialog', () => {
  it('is a modal dialog that takes the keyboard', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: '+ File' }))
    const dialog = screen.getByRole('dialog', { name: 'How should this page start?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('Each page can use a different mode. You can switch a page later from its toolbar.')
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('keeps Tab inside', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: '+ File' }))
    const dialog = screen.getByRole('dialog')
    const buttons = within(dialog).getAllByRole('button')
    buttons[buttons.length - 1].focus()
    await user.tab()
    expect(document.activeElement).toBe(buttons[0])
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(buttons[buttons.length - 1])
  })

  it('closes on Esc, adds no page, and gives focus back to the button', async () => {
    const user = open()
    const opener = screen.getByRole('button', { name: '+ File' })
    await user.click(opener)
    // Found by its words, not its role: the old overlay had no role at all.
    expect(screen.getByText('How should this page start?')).toBeInTheDocument()
    expect(document.activeElement).not.toBe(opener)
    await user.keyboard('{Escape}')
    expect(screen.queryByText('How should this page start?')).not.toBeInTheDocument()
    expect(useEditorStore.getState().schema.pages).toHaveLength(1)
    expect(document.activeElement).toBe(opener)
  })

  it('adds the page in the mode picked', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: '+ File' }))
    await user.click(screen.getByRole('button', { name: /^Empty canvas/ }))
    expect(screen.queryByText('How should this page start?')).not.toBeInTheDocument()
    const pages = useEditorStore.getState().schema.pages
    expect(pages).toHaveLength(2)
    expect(pages[1].mode).toBe('empty')
  })
})

// Renaming happens in a field that replaces the page's button. It had no
// name for a screen reader, and when Enter or Esc took it away, focus fell to
// the top of the page.
describe('renaming a page', () => {
  it('names the field and returns focus to the page after Enter', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: 'Rename page: Home' }))
    const field = screen.getByRole('textbox', { name: 'Page name' })
    expect(document.activeElement).toBe(field)
    await user.clear(field)
    await user.type(field, 'Start{Enter}')
    expect(useEditorStore.getState().schema.pages[0].name).toBe('Start')
    expect(document.activeElement).toHaveAttribute('data-page-button', 'home')
  })

  it('returns focus to the page after Esc, keeping the old name', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: 'Rename page: Home' }))
    await user.type(screen.getByRole('textbox', { name: 'Page name' }), 'x{Escape}')
    expect(useEditorStore.getState().schema.pages[0].name).toBe('Home')
    expect(document.activeElement).toHaveAttribute('data-page-button', 'home')
  })
})
