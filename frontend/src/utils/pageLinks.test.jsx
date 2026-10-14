// Deleting a page leaves the links that led to it pointing at nothing. The
// delete question now says how many there are, and the link control shows such
// a link as one to a deleted page instead of a "section" named after its id.
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { countLinksToPage, looksLikePageLink } from './pageLinks.js'
import { LinkTargetControl } from '../components/editor/controls.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'

const pages = [
  {
    id: 'page_home',
    components: [
      { id: 'b1', props: { text: 'Hakkımızda', href: '#page_about' } },
      { id: 'n1', props: { links: [{ label: 'Hakkımızda', href: '#page_about' }, { label: 'Ana', href: '#page_home' }] } },
      { id: 'h1', props: { code: '<a href="#page_about">x</a><a href=\'#page_about\'>y</a>' } },
      { id: 'r1', children: [{ id: 'c1', props: { buttonHref: '#page_about' } }] },
    ],
  },
  { id: 'page_about', components: [{ id: 'self', props: { href: '#page_about' } }] },
  { id: 'page_html', html: '<nav><a href="#page_about">Hakkımızda</a><a href="#page_aboutx">no</a></nav>' },
]

describe('links that lead to a page', () => {
  it('are counted across the other pages: components, nested ones, embeds and documents', () => {
    expect(countLinksToPage(pages, 'page_about')).toBe(6)
    expect(countLinksToPage(pages, 'page_about', { page_html: '<p>no links</p>' })).toBe(5)
    // A page's links to itself do not count: they go with it.
    expect(countLinksToPage(pages, 'page_home')).toBe(0)
    expect(looksLikePageLink('#page_m65gim')).toBe(true)
    expect(looksLikePageLink('#contact')).toBe(false)
  })

  it('to a deleted page are shown as such in the link control', () => {
    localStorage.setItem('pwb_language', 'en')
    const onChange = vi.fn()
    render(
      <LanguageProvider>
        <LinkTargetControl label="Link" value="#page_gone" pages={[{ id: 'page_home', name: 'Home' }]} onChange={onChange} />
      </LanguageProvider>,
    )
    const [kind, page] = screen.getAllByRole('combobox')
    expect(kind.value).toBe('page')
    expect(page.value).toBe('page_gone')
    expect(screen.getByRole('alert').textContent).toMatch(/was deleted/)

    fireEvent.change(page, { target: { value: 'page_home' } })
    expect(onChange).toHaveBeenCalledWith('#page_home')
  })
})
