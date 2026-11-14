import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ReviewPage from './ReviewPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import { getReviewSite } from '../api/sites.js'

vi.mock('../api/sites.js', () => ({
  getReviewSite: vi.fn(),
  submitReviewComment: vi.fn(),
}))
vi.mock('../components/LanguageSwitcher.jsx', () => ({ default: () => null }))

const FACE = '@font-face{font-family:"Okul";src:url(data:font/woff2;base64,AAAA)}'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
})

describe('ReviewPage shared site preview', () => {
  it('writes schema fontFaces and colorMode palettes into canvas review frames', async () => {
    getReviewSite.mockResolvedValue({
      site: {
        title: 'Notes',
        slug: 'notes',
        html: '',
        schema: {
          theme: {},
          fontFaces: FACE,
          colorMode: { start: 'light', theme: { background: '#0f172a', textColor: '#f8fafc' } },
          pages: [
            {
              id: 'home',
              name: 'Home',
              components: [
                { id: 'tt', type: 'themeToggle', props: { label: 'Theme' }, styles: {}, layout: { x: 0, y: 0, w: 44, h: 44 } },
                { id: 'h1', type: 'text', props: { text: 'Hello' }, styles: { fontFamily: 'Okul, serif' }, layout: { x: 0, y: 60, w: 300, h: 40 } },
              ],
            },
          ],
        },
      },
      comments: [],
    })

    await act(async () => {
      render(
        <LanguageProvider>
          <MemoryRouter initialEntries={['/review/tok-1']}>
            <Routes>
              <Route path="/review/:token" element={<ReviewPage />} />
            </Routes>
          </MemoryRouter>
        </LanguageProvider>,
      )
    })

    const frame = await screen.findByTitle('Previewing Home')
    const doc = frame.getAttribute('srcdoc') || ''
    expect(doc).toContain(FACE)
    expect(doc).toContain('<style data-pwb-color-mode>')
  })

  it('injects colorMode palettes into HTML pages on a site with a theme toggle', async () => {
    getReviewSite.mockResolvedValue({
      site: {
        title: 'Mixed',
        slug: 'mixed',
        html: '',
        schema: {
          theme: {},
          colorMode: { start: 'light', theme: { background: '#0f172a', textColor: '#f8fafc' } },
          pages: [
            {
              id: 'home',
              name: 'Home',
              mode: 'html',
              html: '<!doctype html><html><head></head><body><button data-pwb-theme-toggle>Dark</button></body></html>',
              components: [],
            },
          ],
        },
      },
      comments: [],
    })

    await act(async () => {
      render(
        <LanguageProvider>
          <MemoryRouter initialEntries={['/review/tok-2']}>
            <Routes>
              <Route path="/review/:token" element={<ReviewPage />} />
            </Routes>
          </MemoryRouter>
        </LanguageProvider>,
      )
    })

    const frame = await screen.findByTitle('Previewing Home')
    expect(frame.getAttribute('srcdoc') || '').toContain('<style data-pwb-color-mode>')
  })
})
