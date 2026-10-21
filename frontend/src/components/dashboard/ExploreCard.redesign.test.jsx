import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import ExploreCard from './ExploreCard.jsx'
import { focusoutWithoutRelatedTarget } from '../../test/focusoutWithoutRelatedTarget.js'

vi.mock('./SitePreview.jsx', () => ({ default: () => <div /> }))

const site = {
  id: 7, slug: 'modern-portfolio', title: 'Modern Portfolio', category: 'portfolio', tags: ['Design'],
  owner_id: 42, owner_display_name: 'Ada Studio', favorite_count: 9, is_favorited: false, pinned: false,
}

function renderCard(props = {}, overrides = {}) {
  return render(<LanguageProvider><MemoryRouter>
    <ExploreCard redesigned site={{ ...site, ...overrides }} {...props} />
    <button type="button">Outside the card</button>
  </MemoryRouter></LanguageProvider>)
}

beforeEach(() => { localStorage.setItem('pwb_language', 'en') })

describe('redesigned home card', () => {
  it('keeps the main action visible and puts secondary actions behind a named disclosure', async () => {
    const user = userEvent.setup()
    const onToggleFav = vi.fn()
    const onRemix = vi.fn()
    renderCard({ onToggleFav, onRemix })
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/site/modern-portfolio')
    expect(screen.queryByRole('menuitemcheckbox', { name: 'Favorite' })).not.toBeInTheDocument()
    const trigger = screen.getByRole('button', { name: 'More actions' })
    expect(trigger).toHaveAccessibleDescription('Modern Portfolio')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const menu = screen.getByRole('menu', { name: 'More actions' })
    const favorite = within(menu).getByRole('menuitemcheckbox', { name: 'Favorite' })
    expect(favorite).toHaveFocus()
    expect(favorite).toHaveAttribute('aria-checked', 'false')
    expect(favorite).toHaveAccessibleDescription('Modern Portfolio')
    await user.click(favorite)
    expect(onToggleFav).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 7 }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('keeps remix available without adding the admin pin for an ordinary viewer', async () => {
    const user = userEvent.setup()
    const onRemix = vi.fn()
    renderCard({ onToggleFav: vi.fn(), onRemix })
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    expect(screen.queryByRole('menuitemcheckbox', { name: /pin to the home page/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Use as template' }))
    expect(onRemix).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 7 }))
  })

  it('shows the pin badge to everyone and exposes the pressed admin action only with a handler', async () => {
    const user = userEvent.setup()
    const onTogglePin = vi.fn()
    renderCard({ onTogglePin }, { pinned: true })
    expect(screen.getByText('Pinned')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    const pin = screen.getByRole('menuitemcheckbox', { name: 'Unpin from the home page' })
    expect(pin).toHaveAttribute('aria-checked', 'true')
    await user.click(pin)
    expect(onTogglePin).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 7, pinned: true }))
  })

  // Chrome gives the focusout no relatedTarget when Tab lands on a button
  // holding a preview frame, and the menu stayed open over the next card.
  it('closes when Tab moves on past the menu', async () => {
    const user = userEvent.setup()
    renderCard({ onToggleFav: vi.fn() })
    screen.getByRole('button', { name: 'More actions' }).focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitemcheckbox', { name: 'Favorite' })).toHaveFocus()
    const restore = focusoutWithoutRelatedTarget()
    try {
      await user.tab()
      expect(screen.getByRole('button', { name: 'Outside the card' })).toHaveFocus()
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    } finally {
      restore()
    }
  })

  // Safari does not focus a button it clicks: focus falls to the page before
  // the click, and the item clicked must still be there for it.
  it('stays open when focus only falls to the page', async () => {
    const user = userEvent.setup()
    const onToggleFav = vi.fn()
    renderCard({ onToggleFav })
    screen.getByRole('button', { name: 'More actions' }).focus()
    await user.keyboard('{ArrowDown}')
    act(() => document.activeElement.blur())
    await act(() => new Promise((resolve) => setTimeout(resolve, 10)))
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Favorite' }))
    expect(onToggleFav).toHaveBeenCalledOnce()
  })

  it('supports menu keyboard navigation, skips disabled actions and restores focus on Escape', async () => {
    const user = userEvent.setup()
    renderCard({ onToggleFav: vi.fn(), onRemix: vi.fn(), onTogglePin: vi.fn(), favoriting: true })
    const trigger = screen.getByRole('button', { name: 'More actions' })
    trigger.focus()
    await user.keyboard('{ArrowDown}')
    const remix = screen.getByRole('menuitem', { name: 'Use as template' })
    const pin = screen.getByRole('menuitemcheckbox', { name: 'Pin to the home page' })
    expect(remix).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(pin).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(remix).toHaveFocus()
    await user.keyboard('{End}')
    expect(pin).toHaveFocus()
    await user.keyboard('{Home}')
    expect(remix).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('refuses pending actions and exposes their busy states', async () => {
    const user = userEvent.setup()
    const onToggleFav = vi.fn()
    const onRemix = vi.fn()
    const onTogglePin = vi.fn()
    renderCard({ onToggleFav, onRemix, onTogglePin, favoriting: true, remixing: true, pinning: true }, { is_favorited: true })
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    for (const action of [screen.getByRole('menuitemcheckbox', { name: 'Unfavorite' }), screen.getByRole('menuitem', { name: 'Creating copy…' }), screen.getByRole('menuitemcheckbox', { name: 'Pin to the home page' })]) {
      expect(action).toBeDisabled()
      expect(action).toHaveAttribute('aria-busy', 'true')
      fireEvent.click(action)
    }
    expect(onToggleFav).not.toHaveBeenCalled()
    expect(onRemix).not.toHaveBeenCalled()
    expect(onTogglePin).not.toHaveBeenCalled()
  })

  it('dismisses when focus leaves without taking focus back from the outside control', async () => {
    const user = userEvent.setup()
    renderCard({ onToggleFav: vi.fn() })
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    const outside = screen.getByRole('button', { name: 'Outside the card' })
    await user.click(outside)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(outside).toHaveFocus()
  })

  it('uses existing category and tags for context and preserves attribution', () => {
    renderCard()
    expect(screen.getByText('Portfolio · Design')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ada Studio' })).toHaveAttribute('href', '/u/42')
    expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument()
  })

  it('prefers a supplied description without rendering it as HTML', () => {
    renderCard({}, { description: '<strong>A small portfolio</strong>' })
    expect(screen.getByText('<strong>A small portfolio</strong>')).toBeInTheDocument()
    expect(screen.queryByText('Portfolio · Design')).not.toBeInTheDocument()
    expect(screen.getByRole('article').querySelector('strong')).toBeNull()
  })
})
