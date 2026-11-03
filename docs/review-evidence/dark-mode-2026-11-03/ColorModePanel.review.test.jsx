import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import ColorModePanel from './ColorModePanel.jsx'
import { useEditorStore } from '../../store/editorStore.js'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
})

describe('review: native radio keyboard interaction', () => {
  it('moves to and selects Dark with ArrowRight from Light', async () => {
    const user = userEvent.setup()
    useEditorStore.getState().loadSchema({
      theme: { backgroundColor: '#ffffff' },
      pages: [{ id: 'home', name: 'Home', components: [] }],
    })
    render(<UiThemeProvider><LanguageProvider><ColorModePanel /></LanguageProvider></UiThemeProvider>)
    const light = screen.getByRole('radio', { name: 'Light', exact: true })
    const dark = screen.getByRole('radio', { name: 'Dark', exact: true })
    await user.click(light)
    expect(light).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(dark).toHaveFocus()
    expect(dark).toHaveAttribute('aria-checked', 'true')
    expect(useEditorStore.getState().schema.colorMode.start).toBe('dark')
  })

  it('leaves the group with Tab instead of visiting an unchecked radio', async () => {
    const user = userEvent.setup()
    useEditorStore.getState().loadSchema({
      theme: { backgroundColor: '#ffffff' },
      pages: [{ id: 'home', name: 'Home', components: [] }],
    })
    render(<UiThemeProvider><LanguageProvider><ColorModePanel /></LanguageProvider></UiThemeProvider>)
    await user.click(screen.getByRole('radio', { name: 'Light', exact: true }))
    await user.tab()
    expect(screen.getByRole('radiogroup', { name: 'The site opens in' }).contains(document.activeElement)).toBe(false)
  })
})
