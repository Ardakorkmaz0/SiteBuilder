// The editor on a phone is a preview: a light/dark switch on the page has to
// switch there too, as it does on the published site.
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import MobileEditorPreview from './MobileEditorPreview.jsx'

const toggle = { id: 'tt', type: 'themeToggle', props: { label: 'Dark mode' }, styles: { color: '#1d1d1f' }, layout: { x: 10, y: 10, w: 44, h: 44 } }
const text = { id: 't', type: 'text', props: { text: 'Hi' }, styles: { color: '#1d1d1f' }, layout: { x: 10, y: 80, w: 200, h: 40 } }

function preview(pages, currentPageId = pages[0].id) {
  render(
    <MemoryRouter>
      <LanguageProvider>
        <UiThemeProvider>
          <MobileEditorPreview
            title="Site"
            slug="site"
            published={false}
            pages={pages}
            currentPageId={currentPageId}
            pageHtmlMap={{}}
            theme={{}}
            colorModeSetting={{}}
            customCss=""
            customJs=""
            onSelectPage={vi.fn()}
            onBack={vi.fn()}
          />
        </UiThemeProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )
  return screen.getByTestId('mobile-editor-preview').querySelector('iframe').getAttribute('srcdoc')
}

describe('the editor on a phone', () => {
  it('draws both palettes when the site has a theme switch', () => {
    const html = preview([{ id: 'home', name: 'Home', background: '#ffffff', components: [toggle, text] }])
    expect(html).toContain('<style data-pwb-color-mode>')
    expect(html).toContain('var(--pwb-alt-text, #1d1d1f)')
  })

  it('does so on a page whose switch sits on another page, and on an HTML page', () => {
    const pages = [
      { id: 'home', name: 'Home', components: [toggle] },
      { id: 'inner', name: 'Inner', mode: 'html', html: '<!doctype html><html><head></head><body><p>In</p></body></html>' },
    ]
    expect(preview(pages, 'inner')).toContain('data-pwb-color-mode')
  })

  it('frames the page in the editor theme, not in fixed light colours', () => {
    preview([{ id: 'home', name: 'Home', components: [text] }])
    const root = screen.getByTestId('mobile-editor-preview')
    for (const part of [root, root.querySelector('header'), root.querySelector('nav')]) {
      expect(part.className).not.toMatch(/#[0-9a-f]{3,6}|bg-white/i)
      expect(part.className).toContain('var(--studio-')
    }
  })

  it('is drawn as before when the site has one palette', () => {
    expect(preview([{ id: 'home', name: 'Home', components: [text] }])).not.toContain('data-pwb-color-mode')
  })

  it('includes uploaded fontFaces inside the preview frame', () => {
    const face = '@font-face{font-family:"Okul";src:url(data:font/woff2;base64,AAAA)}'
    render(
      <MemoryRouter>
        <LanguageProvider>
          <UiThemeProvider>
            <MobileEditorPreview
              title="Site"
              slug="site"
              published={false}
              pages={[{ id: 'home', name: 'Home', components: [{ ...text, styles: { ...text.styles, fontFamily: 'Okul, serif' } }] }]}
              currentPageId="home"
              pageHtmlMap={{}}
              theme={{}}
              fontFaces={face}
              colorModeSetting={{}}
              customCss=""
              customJs=""
              onSelectPage={vi.fn()}
              onBack={vi.fn()}
            />
          </UiThemeProvider>
        </LanguageProvider>
      </MemoryRouter>,
    )
    const html = screen.getByTestId('mobile-editor-preview').querySelector('iframe').getAttribute('srcdoc')
    expect(html).toContain(face)
  })

  it('switches pages on pwb-navigate messages from the preview iframe and exits focused mode on Escape', () => {
    const onSelectPage = vi.fn()
    render(
      <MemoryRouter>
        <LanguageProvider>
          <UiThemeProvider>
            <MobileEditorPreview
              title="Site"
              slug="site"
              published={false}
              pages={[
                { id: 'home', name: 'Home', components: [text] },
                { id: 'about', name: 'About', components: [text] },
              ]}
              currentPageId="home"
              pageHtmlMap={{}}
              theme={{}}
              colorModeSetting={{}}
              customCss=""
              customJs=""
              onSelectPage={onSelectPage}
              onBack={vi.fn()}
            />
          </UiThemeProvider>
        </LanguageProvider>
      </MemoryRouter>,
    )
    const frame = screen.getByTestId('mobile-editor-preview').querySelector('iframe')
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'pwb-navigate', hash: '#about' }, source: frame.contentWindow }))
    expect(onSelectPage).toHaveBeenCalledWith('about')

    fireEvent.click(screen.getByRole('button', { name: 'Focus preview' }))
    expect(screen.getByRole('button', { name: 'Exit focused preview' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('button', { name: 'Exit focused preview' })).not.toBeInTheDocument()
  })
})
