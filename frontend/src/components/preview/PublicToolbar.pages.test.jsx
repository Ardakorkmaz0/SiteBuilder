// The pages of a site in the viewer's bar: a row of tabs, and with many pages a
// list of them all, since a row that overflows hides most of them.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import PublicToolbar from './PublicToolbar.jsx'

const pagesOf = (count) => Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `Page ${i}` }))
const site = { title: 'Site', slug: 'site', schema: { pages: [] } }
let narrow = false

function open(count, activePageId = 'p0') {
  const onNavigate = vi.fn()
  render(
    <MemoryRouter>
      <UiThemeProvider>
        <LanguageProvider>
          <PublicToolbar site={site} pages={pagesOf(count)} activePageId={activePageId} onNavigate={onNavigate} />
        </LanguageProvider>
      </UiThemeProvider>
    </MemoryRouter>,
  )
  return onNavigate
}
const all = (count) => screen.queryByRole('button', { name: `All pages (${count})` })
const menu = () => document.querySelector('.preview-pages-menu')

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  narrow = false
  window.matchMedia = (query) => ({ matches: narrow && query.includes('max-width'), addEventListener() {}, removeEventListener() {} })
})
afterEach(() => {
  cleanup()
  delete window.matchMedia
})

describe('how many pages it takes', () => {
  it('is only tabs up to four', () => {
    open(4)
    expect(all(4)).toBeNull()
    expect(within(screen.getByRole('navigation', { name: 'Site pages' })).getAllByRole('button')).toHaveLength(4)
  })

  it('offers the list from five', () => {
    open(5)
    expect(all(5)).not.toBeNull()
  })

  it('stays the row on a phone', () => {
    narrow = true
    open(12)
    expect(all(12)).toBeNull()
  })
})

describe('the list', () => {
  it('opens with every page, the open one marked', () => {
    open(12, 'p7')
    expect(menu()).toBeNull()
    fireEvent.click(all(12))
    expect(all(12)).toHaveAttribute('aria-expanded', 'true')
    const items = within(menu()).getAllByRole('button')
    expect(items.map((item) => item.textContent)).toEqual(pagesOf(12).map((page) => page.name))
    expect(items[7]).toHaveAttribute('aria-current', 'page')
    expect(items[0]).not.toHaveAttribute('aria-current')
  })

  it('goes to the page chosen, and closes', () => {
    const onNavigate = open(12)
    fireEvent.click(all(12))
    fireEvent.click(within(menu()).getByRole('button', { name: 'Page 9' }))
    expect(onNavigate.mock.calls).toEqual([['p9']])
    expect(menu()).toBeNull()
  })

  it('closes with Esc and with a click outside', () => {
    open(12)
    fireEvent.click(all(12))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(menu()).toBeNull()
    fireEvent.click(all(12))
    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(menu()).toBeNull()
  })
})

describe('the row', () => {
  it('keeps the open page in sight', () => {
    const scrolled = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scrolled
    open(12, 'p9')
    expect(scrolled.mock.contexts[0]).toHaveTextContent('Page 9')
    delete window.HTMLElement.prototype.scrollIntoView
  })
})
