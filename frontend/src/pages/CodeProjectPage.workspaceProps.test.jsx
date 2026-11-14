import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CodeProjectPage from './CodeProjectPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useProjectStore } from '../store/projectStore.js'

function openHtmlProject(html) {
  const rootHandle = {
    name: 'demo-site',
    async *values() {},
    async getFileHandle() { throw new DOMException('Missing', 'NotFoundError') },
  }
  useProjectStore.getState().setProject({
    rootHandle,
    files: [{ path: 'index.html', name: 'index.html', kind: 'html', content: html }],
  })
}

function hydrateEditIframe(html) {
  const iframe = screen.getByTitle('site')
  const doc = iframe.contentDocument
  doc.open()
  doc.write(html)
  doc.close()
  fireEvent.load(iframe)
  return { iframe, doc }
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_htmlmode_code:index.html', 'edit')
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})

afterEach(() => {
  useProjectStore.getState().closeProject()
})

describe('CodeProjectPage workspace wiring', () => {
  it('places keyboard-selected Sidebar components immediately at the end of the HTML document', async () => {
    const initial = '<!doctype html><html><head></head><body><section id="hero"><h1>Hello</h1></section></body></html>'
    openHtmlProject(initial)
    render(
      <MemoryRouter>
        <UiThemeProvider>
          <LanguageProvider>
            <CodeProjectPage />
          </LanguageProvider>
        </UiThemeProvider>
      </MemoryRouter>,
    )

    await act(async () => {})
    hydrateEditIframe(initial)

    fireEvent.click(screen.getByRole('tab', { name: 'Components' }))
    fireEvent.click(screen.getByRole('button', { name: /Text band/i }))
    const swatch = (await screen.findAllByRole('button', { name: /Enter adds it at the end of the page/i }))[0]
    await act(async () => {
      fireEvent.keyDown(swatch, { key: 'Enter' })
    })

    await waitFor(() => {
      const updated = useProjectStore.getState().files.get('index.html')?.content || ''
      expect(updated.length).toBeGreaterThan(initial.length)
      expect(updated).not.toBe(initial)
    })
  })

  it('passes mobile viewport and onResetMobile handler to HtmlElementPanel on mobile preview', async () => {
    const html = '<!doctype html><html><head></head><body><h1 id="headline" data-pwb-mobile-font-size="" style="font-size:32px;--pwb-mobile-font-size:14px">Mobile Heading</h1></body></html>'
    openHtmlProject(html)
    await act(async () => {
      render(
        <MemoryRouter>
          <UiThemeProvider>
            <LanguageProvider>
              <CodeProjectPage />
            </LanguageProvider>
          </UiThemeProvider>
        </MemoryRouter>,
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Mobile', exact: true }))
    const { doc } = hydrateEditIframe(html)

    await act(async () => {
      fireEvent.click(doc.getElementById('headline'))
    })

    await screen.findByRole('tab', { name: 'Design' })
    fireEvent.click(screen.getByRole('tab', { name: 'Design' }))

    expect(screen.getByText(/Style edits here apply to MOBILE only/i)).toBeInTheDocument()
    const resetBtn = screen.getByRole('button', { name: /Reset mobile styles/i })
    await act(async () => {
      fireEvent.click(resetBtn)
    })

    await waitFor(() => {
      const updated = useProjectStore.getState().files.get('index.html')?.content || ''
      expect(updated).not.toContain('data-pwb-mobile-font-size')
    })
  })
})
