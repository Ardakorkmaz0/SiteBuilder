import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { describeElement } from '../../utils/htmlElementEdit.js'
import HtmlElementPanel from './HtmlElementPanel.jsx'

function renderPanel(overrides = {}) {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  document.body.innerHTML = '<section><p id="selected">Hello</p></section>'
  const props = {
    onChange: vi.fn(),
    onSelectParent: vi.fn(),
    onDuplicate: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    onDelete: vi.fn(),
    onResetMobile: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
    info: {
      ...describeElement(document.getElementById('selected')),
      ...(overrides.info || {}),
    },
  }
  render(
    <LanguageProvider>
      <HtmlElementPanel {...props} />
    </LanguageProvider>,
  )
  return props
}

describe('HtmlElementPanel', () => {
  it('uses the same compact action footer as canvas properties', async () => {
    const props = renderPanel()
    const user = userEvent.setup()

    const actions = screen.getByRole('region', { name: 'Arrange' })
    expect(actions).toHaveClass('shrink-0')
    expect(actions.previousElementSibling).toHaveClass('overflow-y-auto')
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'More actions' }))
    expect(screen.getByRole('button', { name: 'Move up' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move down' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete component' }))
    expect(props.onDelete).toHaveBeenCalledOnce()
  })

  it('keeps every advanced field reachable through Content, Design and Layout tabs', async () => {
    renderPanel()
    const user = userEvent.setup()

    expect(screen.getByRole('tab', { name: 'Content' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText('Basic')).not.toBeInTheDocument()
    expect(screen.queryByText('Extend')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Design' }))
    expect(screen.getByRole('button', { name: 'Typography' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Border' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Effects' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Layout' }))
    expect(screen.getByRole('button', { name: 'Align' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Size & spacing' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Layout (rows / flex)' })).toBeInTheDocument()
  })

  it('shows and resets mobile-only element overrides', async () => {
    const props = renderPanel({
      viewport: 'mobile',
      info: { mobileOverrideCount: 2 },
    })
    const user = userEvent.setup()

    await user.click(screen.getByRole('tab', { name: 'Design' }))
    expect(screen.getByText(/apply to MOBILE only/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Reset mobile styles/ }))
    expect(props.onResetMobile).toHaveBeenCalledOnce()
  })

  // Both were rounded to whole numbers: 1.2 read as 1, 0.05 as 0, and typing
  // 1.5 turned into 2 under the cursor.
  it('shows and takes fractions for line height and letter spacing', async () => {
    const props = renderPanel({ info: { lineHeight: 1.2, letterSpacing: 0.05 } })
    const user = userEvent.setup()

    await user.click(screen.getByRole('tab', { name: 'Design' }))
    const lineHeight = screen.getByLabelText('Line height (×)')
    expect(lineHeight).toHaveValue(1.2)
    expect(screen.getByLabelText('Letter spacing (em)')).toHaveValue(0.05)

    await user.clear(lineHeight)
    await user.type(lineHeight, '1.5')
    expect(lineHeight).toHaveValue(1.5)
    expect(props.onChange).toHaveBeenLastCalledWith({ lineHeight: 1.5 })
  })

  it('lists the sections of the page for a link', async () => {
    const props = renderPanel({ info: {
      href: 'https://example.com',
      sections: [{ id: 'about', label: '#about · About' }, { id: 'contact', label: '#contact · Contact' }],
    } })
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText('Link (href)'), 'section')
    expect(props.onChange).toHaveBeenLastCalledWith({ href: '#about' })
  })

  // An image here was an address box only; the canvas had upload, a library
  // and presets.
  it('offers the canvas image control for an image and a background', async () => {
    const props = renderPanel({ info: { src: 'old.jpg', alt: '' } })
    const user = userEvent.setup()

    expect(screen.getByRole('button', { name: 'Image: Upload an image' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'My library' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sunset' }))
    expect(props.onChange).toHaveBeenLastCalledWith({ src: expect.any(String) })

    await user.click(screen.getByRole('tab', { name: 'Design' }))
    await user.click(screen.getByRole('button', { name: 'Background image & gradient' }))
    expect(screen.getByRole('button', { name: 'Background image: Upload an image' })).toBeInTheDocument()
  })

  it('clears a fraction field instead of writing 0', async () => {
    const props = renderPanel({ info: { letterSpacing: 0.05 } })
    const user = userEvent.setup()

    await user.click(screen.getByRole('tab', { name: 'Design' }))
    await user.clear(screen.getByLabelText('Letter spacing (em)'))
    expect(props.onChange).toHaveBeenLastCalledWith({ letterSpacing: '' })
  })
})
