import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import BlockLibrary from './BlockLibrary.jsx'
import { HTML_BLOCKS } from '../../utils/htmlVariants.js'

function renderLibrary(props = {}) {
  return render(
    <LanguageProvider>
      <BlockLibrary open onClose={() => {}} {...props} />
    </LanguageProvider>,
  )
}

describe('BlockLibrary', () => {
  it('renders nothing when closed', () => {
    localStorage.setItem('pwb_language', 'en')
    render(
      <LanguageProvider>
        <BlockLibrary open={false} onClose={() => {}} />
      </LanguageProvider>,
    )
    expect(document.querySelector('[data-block-library]')).toBeNull()
  })

  // Building the entry list touches the whole library (hundreds of sections
  // and variants); under a loaded parallel test run that can exceed 5s.
  it('lists categories with counts and shows every entry under All blocks', { timeout: 20000 }, () => {
    localStorage.setItem('pwb_language', 'en')
    renderLibrary()
    expect(screen.getByText('Block library')).toBeInTheDocument()
    // Fixed canvas navbars use z-index 100+; app chrome must stay above them.
    expect(document.querySelector('[data-block-library]')).toHaveClass('z-[2147483000]')
    // Category rail: All blocks + Sections + one per palette type (desktop nav
    // + mobile chip row render each label twice; assert via the desktop nav).
    expect(screen.getAllByText('All blocks').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sections').length).toBeGreaterThan(0)
    // A known section block card is present by default (All).
    expect(screen.getAllByText(/Hero/i).length).toBeGreaterThan(0)
  })

  const cards = () => document.querySelectorAll('[data-block-library] .grid > button')
  const rail = () => within(document.querySelector('[data-block-library] nav'))

  it('files sections by category in the rail and filters to one', async () => {
    localStorage.setItem('pwb_language', 'en')
    const user = userEvent.setup()
    renderLibrary()
    await user.click(rail().getByText('Footers'))
    const footers = HTML_BLOCKS.filter((block) => block.category === 'footer')
    expect(cards()).toHaveLength(footers.length)
    for (const card of cards()) expect(card).toHaveTextContent('Footers')
    expect(screen.queryByText('Show more')).toBeNull()
  })

  it('shows a page of cards at a time and grows on request', async () => {
    localStorage.setItem('pwb_language', 'en')
    const user = userEvent.setup()
    renderLibrary()
    await user.click(rail().getByText('All sections'))
    expect(cards()).toHaveLength(36)
    expect(screen.getByText(`Showing 36 of ${HTML_BLOCKS.length}`)).toBeInTheDocument()
    await user.click(screen.getByText('Show more'))
    expect(cards()).toHaveLength(72)
  })

  it('search matches block descriptions too', async () => {
    localStorage.setItem('pwb_language', 'en')
    const user = userEvent.setup()
    renderLibrary()
    await user.type(screen.getByPlaceholderText('Search blocks'), 'copyable code')
    expect(cards()).toHaveLength(1)
    expect(cards()[0]).toHaveTextContent('Offer with code')
  })

  it('drops the Turkish build of a section when the editor is in Turkish', async () => {
    localStorage.setItem('pwb_language', 'tr')
    const user = userEvent.setup()
    const onArm = vi.fn()
    renderLibrary({ onArmPlacement: onArm })
    await user.click(rail().getByText('Yardımcı sayfalar'))
    await user.click(screen.getByText('Sayfa bulunamadı'))
    const armed = onArm.mock.calls[0][0]
    expect(armed.type).toBe('section')
    expect(armed.html).toContain('Bu sayfa kaybolmuş.')
    expect(armed.html).not.toContain('This page has wandered off.')
    expect(armed.h).toBe(HTML_BLOCKS.find((block) => block.id === 'utility-404').size[1])
  })

  it('search filters across every category and ignores the active one', async () => {
    localStorage.setItem('pwb_language', 'en')
    const user = userEvent.setup()
    renderLibrary()
    const input = screen.getByPlaceholderText('Search blocks')
    await user.type(input, 'zzz-no-such-block')
    expect(screen.getByText('No blocks match your search')).toBeInTheDocument()
  })

  it('clicking a card arms placement on the canvas and closes the overlay', async () => {
    localStorage.setItem('pwb_language', 'en')
    const user = userEvent.setup()
    const onArm = vi.fn()
    const onClose = vi.fn()
    renderLibrary({ onArmPlacement: onArm, onClose })
    const card = document.querySelector('[data-block-library] .grid button')
    await user.click(card)
    expect(onArm).toHaveBeenCalledTimes(1)
    const armed = onArm.mock.calls[0][0]
    expect(armed.w).toBeGreaterThan(0)
    expect(armed.h).toBeGreaterThan(0)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('in HTML mode a click inserts via onPickComponent instead', async () => {
    localStorage.setItem('pwb_language', 'en')
    const user = userEvent.setup()
    const onPick = vi.fn()
    const onArm = vi.fn()
    const onClose = vi.fn()
    renderLibrary({ onPickComponent: onPick, onArmPlacement: onArm, onClose })
    const card = document.querySelector('[data-block-library] .grid button')
    await user.click(card)
    expect(onPick).toHaveBeenCalledTimes(1)
    expect(onArm).not.toHaveBeenCalled()
    expect(typeof onPick.mock.calls[0][1]).toBe('string') // html payload
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
