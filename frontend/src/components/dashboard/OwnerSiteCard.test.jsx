// The card's picture links to the editor too, but has no words: a keyboard or
// screen reader met it as a link called nothing, once per project.
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it } from 'vitest'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import OwnerSiteCard from './OwnerSiteCard.jsx'

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
