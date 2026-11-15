import { forwardRef, useImperativeHandle } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const surface = { live: null }
const measureMock = { handler: null }

vi.mock('../components/editor/HtmlWorkspace.jsx', () => ({
  default: forwardRef(function FakeWorkspace({ html }, ref) {
    useImperativeHandle(ref, () => ({ getHtml: () => surface.live ?? html }), [html])
    return <iframe title="site" srcDoc={html} />
  }),
}))

vi.mock('../utils/htmlPageMeasure.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    measureHtmlPage: (...args) => measureMock.handler(...args),
  }
})

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1,
    title: 'Multi',
    slug: 'multi',
    published: false,
    html: '',
    schema: {
      theme: {},
      pages: [
        { id: 'home', name: 'Home', mode: 'html', html: '<!DOCTYPE html><html lang="en"><body><p>Home</p></body></html>', components: [] },
        { id: 'about', name: 'About', mode: 'html', html: '<!DOCTYPE html><html lang="tr"><body><h1>Hakkimizda</h1></body></html>', components: [] },
      ],
    },
  })),
  updateSite: vi.fn(),
  patchSite: vi.fn(),
}))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useAuthStore } from '../store/authStore.js'
import { useEditorStore } from '../store/editorStore.js'

beforeEach(() => {
  surface.live = null
  measureMock.handler = null
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  useAuthStore.getState().setAuth('token', { id: 7 })
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const STYLE_BASE = {
  color: 'rgb(17, 24, 39)', backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none', backgroundSize: 'auto',
  fontSize: '16px', fontWeight: '400', fontFamily: 'Inter, sans-serif', fontStyle: 'normal',
  textAlign: 'start', textDecorationLine: 'none', textTransform: 'none', lineHeight: '24px',
  letterSpacing: 'normal', boxShadow: 'none', opacity: '1', objectFit: 'fill',
  paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px',
  borderTopWidth: '0px', borderRightWidth: '0px', borderBottomWidth: '0px', borderLeftWidth: '0px',
  borderTopStyle: 'none', borderRightStyle: 'none', borderBottomStyle: 'none', borderLeftStyle: 'none',
  borderTopColor: 'rgb(17, 24, 39)', borderRightColor: 'rgb(17, 24, 39)', borderBottomColor: 'rgb(17, 24, 39)', borderLeftColor: 'rgb(17, 24, 39)',
  borderTopLeftRadius: '0px', borderTopRightRadius: '0px', borderBottomRightRadius: '0px', borderBottomLeftRadius: '0px',
  listStyleType: 'disc', position: 'static', display: 'block',
}

describe('EditorPage convertHtmlToCanvas integration', () => {
  it('preserves measured language and keeps concurrent edits on another page made during measurement', async () => {
    let resolveMeasure
    measureMock.handler = vi.fn(() => new Promise((resolve) => { resolveMeasure = resolve }))

    render(
      <UiThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/editor/1']}>
            <Routes>
              <Route path="/editor/:id" element={<EditorPage />} />
            </Routes>
          </MemoryRouter>
        </LanguageProvider>
      </UiThemeProvider>,
    )

    await screen.findByTitle('site', {}, { timeout: 15000 })
    const aboutFile = await screen.findByText('about.html')
    fireEvent.contextMenu(aboutFile)
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Convert to canvas blocks' }))

    await waitFor(() => expect(measureMock.handler).toHaveBeenCalledTimes(1))

    // Edit Home HTML while the async measurement of About is still running.
    surface.live = '<!DOCTYPE html><html lang="en"><body><p>Typed while converting About</p></body></html>'

    await act(async () => {
      resolveMeasure({
        width: 1000,
        height: 800,
        background: ['rgb(255, 255, 255)', 'rgba(0, 0, 0, 0)'],
        fontFamily: 'Inter, sans-serif',
        title: 'About',
        description: 'Hakkımızda',
        language: 'tr',
        scripts: 0,
        root: {
          tag: 'body',
          rect: { x: 0, y: 0, w: 1000, h: 800 },
          s: STYLE_BASE,
          kids: [{
            tag: 'h1',
            kind: 'text',
            text: 'Hakkimizda',
            rect: { x: 40, y: 40, w: 400, h: 48 },
            s: { ...STYLE_BASE, fontSize: '36px', fontWeight: '700', lineHeight: '42px' },
          }],
        },
      })
    })

    await waitFor(() => {
      const about = useEditorStore.getState().schema.pages.find((p) => p.id === 'about')
      expect(about?.mode).not.toBe('html')
      expect(about?.language).toBe('tr')
    })

    await act(async () => {
      useEditorStore.getState().selectPage('home')
    })
    await waitFor(() => {
      expect(screen.getByTitle('site').getAttribute('srcdoc')).toContain('Typed while converting About')
    })
  }, 30000)
})
