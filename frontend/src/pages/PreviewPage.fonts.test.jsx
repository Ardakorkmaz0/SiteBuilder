// The in-app viewer draws a page with a pinned block or blocks shown by keys
// in a frame of the published page, which has to carry the fonts the site
// keeps inside itself: the viewer's own are not seen in there.
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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
vi.mock('../i18n/useLanguage.js', () => ({ useLanguage: () => ({ t: (value) => value }) }))

const FACE = '@font-face{font-family:"Okul";src:url(data:font/woff2;base64,AAAA)}'
const site = (components, extra = {}) => ({
  title: 'notes', slug: 'notes', published: true,
  schema: { theme: {}, fontFaces: FACE, pages: [{ id: 'home', name: 'Home', components, ...extra }] },
})
const text = (id, props) => ({ id, type: 'text', props: { text: id, ...props }, styles: { fontFamily: 'Okul, serif' }, layout: { x: 0, y: 0, w: 300, h: 40 } })

async function open(data) {
  getPublicSite.mockResolvedValue(data)
  countSiteView.mockResolvedValue({})
  await act(async () => {
    render(<MemoryRouter initialEntries={['/site/notes']}><Routes><Route path="/site/:slug" element={<PreviewPage />} /></Routes></MemoryRouter>)
  })
  return document.querySelector('iframe')?.getAttribute('srcdoc') || ''
}

beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState(null, '', '/')
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
})

describe('a page the viewer draws in a frame', () => {
  it('carries the fonts the site keeps inside itself', async () => {
    expect(await open(site([text('menu', { scrollBehavior: 'fixed' })]))).toContain(FACE)
  })

  it('is drawn in a frame when blocks are shown by keys, so the clicks that show them work', async () => {
    const doc = await open(site([text('step', { shownBy: ['s1'] })], { hiddenKeys: ['s1'] }))
    expect(doc).toContain('data-pwb-keys="s1"')
    expect(doc).toContain('data-pwb-show="s1"')
  })
})
