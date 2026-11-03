// A visitor's light or dark choice in the in-app viewer belongs to that site.
// The route keeps the same page mounted from one /site/<slug> to the next.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import PreviewPage from './PreviewPage.jsx'
import { countSiteView, getPublicSite } from '../api/sites.js'

vi.mock('../api/sites.js', () => ({
  getPublicSite: vi.fn(),
  countSiteView: vi.fn(),
  submitSiteForm: vi.fn(),
  getReviewSite: vi.fn(),
  submitReviewComment: vi.fn(),
}))
vi.mock('../components/preview/PublicToolbar.jsx', () => ({
  default: ({ onNavigate, pages = [] }) => (
    <nav>{pages.map((page) => <button key={page.id} type="button" onClick={() => onNavigate(page.id)}>{`Go to ${page.name}`}</button>)}</nav>
  ),
}))
vi.mock('../components/LanguageSwitcher.jsx', () => ({ default: () => null }))
vi.mock('../i18n/useLanguage.js', () => ({
  useLanguage: () => ({ t: (value, params = {}) => value.replace(/\{(\w+)\}/g, (_, key) => params[key] || key) }),
}))

const aSwitch = { id: 'sw', type: 'themeToggle', props: { label: 'Theme' }, styles: {}, layout: { x: 0, y: 0, w: 44, h: 44 } }
const canvasSite = (slug) => ({
  title: slug, slug, published: true,
  schema: { theme: { backgroundColor: '#ffffff' }, pages: [{ id: `${slug}-home`, name: 'Home', components: [aSwitch] }] },
})
const htmlSite = (slug) => ({
  title: slug, slug, published: true,
  schema: {
    theme: { backgroundColor: '#ffffff' },
    pages: [{ id: `${slug}-home`, name: 'Home', mode: 'html', html: `<!DOCTYPE html><html><head></head><body><button data-pwb-theme-toggle>x</button><p>${slug}-home-marker</p></body></html>`, components: [] }],
  },
})

const three = { id: 'sw', type: 'themeToggle', props: { label: 'Theme', states: 'three', lightLabel: 'Light', darkLabel: 'Dark', deviceLabel: 'Device' }, styles: {}, layout: { x: 0, y: 0, w: 132, h: 44 } }
const mixedSite = () => ({
  title: 'a', slug: 'a', published: true,
  schema: {
    theme: { backgroundColor: '#ffffff' },
    pages: [
      { id: 'canvas', name: 'Canvas', components: [three] },
      { id: 'doc', name: 'Document', mode: 'html', html: '<!DOCTYPE html><html><head></head><body><button data-pwb-theme-toggle>x</button></body></html>', components: [] },
    ],
  },
})
const go = (name) => act(async () => { fireEvent.click(screen.getByRole('button', { name: `Go to ${name}` })) })
const frameInitial = () => /"initial":("\w+"|null)/.exec(document.querySelector('iframe').getAttribute('srcdoc'))[1]

async function open(sites) {
  getPublicSite.mockImplementation(async (slug) => sites[slug])
  countSiteView.mockResolvedValue({})
  await act(async () => {
    render(
      <MemoryRouter initialEntries={['/site/a']}>
        <Link to="/site/b">Next site</Link>
        <Routes><Route path="/site/:slug" element={<PreviewPage />} /></Routes>
      </MemoryRouter>,
    )
  })
}

const goToB = async () => {
  await act(async () => { fireEvent.click(screen.getByRole('link', { name: 'Next site' })) })
  await waitFor(() => expect(getPublicSite).toHaveBeenCalledWith('b'))
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  // The viewer keeps the open page in the address.
  window.history.replaceState(null, '', '/')
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
})

describe('the palette a visitor chose, across the pages of one site', () => {
  it('goes from a page drawn in the app to a page in a frame', async () => {
    await open({ a: mixedSite() })
    fireEvent.click(await screen.findByRole('radio', { name: 'Dark' }))

    await go('Document')

    expect(frameInitial()).toBe('"dark"')
  })

  it('goes from a page in a frame back to a page drawn in the app', async () => {
    await open({ a: mixedSite() })
    await screen.findByRole('radio', { name: 'Dark' })
    await go('Document')
    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'pwb-color-mode', mode: 'dark' }, source: document.querySelector('iframe').contentWindow }))
    })

    await go('Canvas')

    expect(document.querySelector('[data-pwb-color-root]')).toHaveAttribute('data-pwb-theme', 'dark')
  })

  it('is the newest one: a choice in the app replaces the one a frame made', async () => {
    await open({ a: mixedSite() })
    await screen.findByRole('radio', { name: 'Dark' })
    await go('Document')
    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'pwb-color-mode', mode: 'system' }, source: document.querySelector('iframe').contentWindow }))
    })
    await go('Canvas')
    fireEvent.click(await screen.findByRole('radio', { name: 'Light' }))

    await go('Document')

    expect(frameInitial()).toBe('"light"')
  })
})

describe('the palette a visitor chose', () => {
  it('stays behind when a page drawn in the app moves on to another site', async () => {
    await open({ a: canvasSite('a'), b: canvasSite('b') })
    fireEvent.click(await screen.findByRole('button', { name: 'Theme' }))
    expect(document.querySelector('[data-pwb-color-root]')).toHaveAttribute('data-pwb-theme', 'dark')

    await goToB()

    await waitFor(() => expect(document.querySelector('[data-pwb-color-root]')).toHaveAttribute('data-pwb-theme', 'light'))
  })

  it('stays behind when a page in a frame moves on to another site', async () => {
    await open({ a: htmlSite('a'), b: htmlSite('b') })
    const frame = await waitFor(() => {
      const found = document.querySelector('iframe')
      expect(found).toBeTruthy()
      return found
    })
    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'pwb-color-mode', mode: 'dark' }, source: frame.contentWindow }))
    })

    await goToB()

    // The next document opens as its own site says, not as the last one ended.
    await waitFor(() => expect(document.querySelector('iframe').getAttribute('srcdoc')).toContain('b-home-marker'))
    expect(document.querySelector('iframe').getAttribute('srcdoc')).toContain('"initial":null')
  })
})
