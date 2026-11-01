import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import HtmlPageColors from './HtmlPageColors.jsx'

const html = '<style>body{background:#ffffff;color:#111111}h1{color:#111}</style>'

function renderColors(onReplace = vi.fn()) {
  localStorage.setItem('pwb_language', 'en')
  render(<LanguageProvider><HtmlPageColors html={html} onReplace={onReplace} /></LanguageProvider>)
  return onReplace
}

describe('HtmlPageColors', () => {
  it('names each colour with how often the page uses it, most used first', () => {
    renderColors()
    const pickers = screen.getAllByLabelText(/^Change /)
    expect(pickers.map((p) => p.getAttribute('aria-label'))).toEqual([
      'Change #111111, used 2 times',
      'Change #FFFFFF, used 1 times',
    ])
  })

  // Dragging the picker only previews; the page changes once, when it closes.
  it('changes the page when the picker closes, not while it is dragged', () => {
    const onReplace = renderColors()
    const picker = screen.getByLabelText('Change #111111, used 2 times')
    fireEvent.input(picker, { target: { value: '#333333' } })
    expect(onReplace).not.toHaveBeenCalled()
    expect(screen.getByText('#333333')).toBeInTheDocument()
    fireEvent.change(picker, { target: { value: '#1e3a8a' } })
    expect(onReplace).toHaveBeenCalledExactlyOnceWith('#111111', '#1e3a8a')
  })

  it('says so when the page sets no colours', () => {
    localStorage.setItem('pwb_language', 'en')
    render(<LanguageProvider><HtmlPageColors html="<p>plain</p>" onReplace={vi.fn()} /></LanguageProvider>)
    expect(screen.getByText('This page sets no colors of its own in its CSS.')).toBeInTheDocument()
  })
})
