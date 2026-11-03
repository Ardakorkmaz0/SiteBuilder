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
vi.mock('../components/preview/PublicToolbar.jsx', () => ({ default: () => null }))
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
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
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
