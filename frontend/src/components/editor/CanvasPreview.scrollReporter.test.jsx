import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import CanvasPreview from './CanvasPreview.jsx'

describe('CanvasPreview scroll reporter injection', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('inserts the scroll reporter before the final closing body tag even when Turkish capital İ precedes it', () => {
    const html = '<!doctype html><html><body><p>İSTANBUL İZMİR İLETİŞİM</p><iframe srcdoc="<body>nested</body>"></iframe></body></html>'
    const { container } = render(
      <LanguageProvider>
        <CanvasPreview
          page={{ id: 'home', name: 'Home', components: [] }}
          viewport="pc"
          width={1000}
          iframeHtml={html}
          title="Turkish preview"
        />
      </LanguageProvider>,
    )

    const frame = container.querySelector('iframe[title="Turkish preview"]')
    const srcdoc = frame?.getAttribute('srcdoc') || ''
    expect(srcdoc).toContain('<p>İSTANBUL İZMİR İLETİŞİM</p>')
    expect(srcdoc).toContain('<iframe srcdoc="<body>nested</body>"></iframe>')
    expect(srcdoc).toMatch(/<\/script><\/body><\/html>$/)
  })
})
