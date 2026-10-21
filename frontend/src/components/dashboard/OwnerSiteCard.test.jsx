// The card's picture links to the editor too, but has no words: a keyboard or
// screen reader met it as a link called nothing, once per project.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import OwnerSiteCard from './OwnerSiteCard.jsx'
import { focusoutWithoutRelatedTarget } from '../../test/focusoutWithoutRelatedTarget.js'

beforeAll(() => {
  // The preview waits to be on screen, and measures its box, before it draws.
  class Observer {
    observe() {}
    disconnect() {}
  }
  globalThis.IntersectionObserver ??= Observer
  globalThis.ResizeObserver ??= Observer
})

describe('a project card', () => {
  it('offers one named way into the editor', () => {
    localStorage.setItem('pwb_language', 'en')
    render(
      <LanguageProvider>
        <MemoryRouter>
          <OwnerSiteCard site={{ id: 42, title: 'Bakery', slug: 'bakery', published: false, schema: { pages: [] } }} />
        </MemoryRouter>
      </LanguageProvider>,
    )

    const editorLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/editor/42')
    expect(editorLinks).toHaveLength(1)
    expect(editorLinks[0]).toHaveAccessibleName('Continue editing: Bakery')
  })

  it('closes its menu on Esc and gives the keyboard back to the menu button', () => {
    localStorage.setItem('pwb_language', 'en')
    render(
      <LanguageProvider>
        <MemoryRouter>
          <OwnerSiteCard site={{ id: 42, title: 'Bakery', slug: 'bakery', published: false, schema: { pages: [] } }} />
        </MemoryRouter>
      </LanguageProvider>,
    )
    const trigger = screen.getByRole('button', { name: 'Project actions: Bakery' })
    trigger.focus()
    fireEvent.click(trigger)
    screen.getByRole('menuitem', { name: 'Duplicate' }).focus()

    fireEvent.keyDown(document.activeElement, { key: 'Escape' })

    expect(screen.queryByRole('menu')).toBeNull()
    expect(trigger).toHaveFocus()
  })
})


it('keeps editing, live view and all menu actions working in list view', async () => {
  localStorage.setItem('pwb_language', 'en')
  const user = userEvent.setup()
  const onDuplicate = vi.fn()
  const onExport = vi.fn()
  const onDelete = vi.fn()
  const onTogglePin = vi.fn()
  render(<LanguageProvider><MemoryRouter>
    <OwnerSiteCard view="list" site={{ id: 42, title: 'Bakery', slug: 'bakery', published: true }}
      onDuplicate={onDuplicate} onExport={onExport} onDelete={onDelete} onTogglePin={onTogglePin} />
  </MemoryRouter></LanguageProvider>)
  expect(screen.getByRole('article', { name: 'Bakery' })).toHaveClass('owner-site-card-list')
  expect(screen.getByRole('link', { name: 'Continue editing: Bakery' })).toHaveAttribute('href', '/editor/42')
  const live = screen.getByRole('link', { name: /Open the live site at/ })
  expect(live.getAttribute('href')).toMatch(/\/s\/bakery\/$/)
  const trigger = screen.getByRole('button', { name: 'Project actions: Bakery' })
  for (const [label, callback] of [['Pin project', onTogglePin], ['Duplicate', onDuplicate], ['Export project', onExport], ['Delete site', onDelete]]) {
    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: label, exact: true }))
    expect(callback).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 42 }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  }
})

it('moves through list actions with the keyboard and skips a pending duplicate', async () => {
  localStorage.setItem('pwb_language', 'en')
  const user = userEvent.setup()
  render(<LanguageProvider><MemoryRouter>
    <OwnerSiteCard view="list" busyAction="duplicate-42" site={{ id: 42, title: 'Bakery', slug: 'bakery', published: false }} />
  </MemoryRouter></LanguageProvider>)
  const trigger = screen.getByRole('button', { name: 'Project actions: Bakery' })
  trigger.focus()
  await user.keyboard('{ArrowDown}')
  expect(screen.getByRole('menuitem', { name: 'Pin project' })).toHaveFocus()
  expect(screen.getByRole('menuitem', { name: 'Duplicating…' })).toBeDisabled()
  await user.keyboard('{ArrowDown}')
  expect(screen.getByRole('menuitem', { name: 'Export project' })).toHaveFocus()
  await user.keyboard('{End}')
  expect(screen.getByRole('menuitem', { name: 'Delete site' })).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})

// Tab past the last item must close the menu, not leave it over the next card.
it('closes its menu when Tab moves on past it', async () => {
  localStorage.setItem('pwb_language', 'en')
  const user = userEvent.setup()
  render(<LanguageProvider><MemoryRouter>
    <OwnerSiteCard site={{ id: 42, title: 'Bakery', slug: 'bakery', published: false }} />
  </MemoryRouter></LanguageProvider>)
  screen.getByRole('button', { name: 'Project actions: Bakery' }).focus()
  await user.keyboard('{ArrowDown}{End}')
  expect(screen.getByRole('menuitem', { name: 'Delete site' })).toHaveFocus()
  const restore = focusoutWithoutRelatedTarget()
  try {
    await user.tab()
    expect(screen.getByRole('link', { name: 'Continue editing: Bakery' })).toHaveFocus()
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  } finally {
    restore()
  }
})
