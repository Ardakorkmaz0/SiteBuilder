import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { colorModeFor } from '../../utils/colorMode.js'
import { DEFAULT_THEME } from '../../utils/theme.js'
import CanvasPreview from './CanvasPreview.jsx'

const schema = {
  theme: { ...DEFAULT_THEME, backgroundColor: '#ffffff', textColor: '#111111', mutedColor: '#54595f', surfaceColor: '#fafafa' },
  colorMode: { start: 'dark', theme: { backgroundColor: '#111317', surfaceColor: '#bbbbbb', textColor: '#e8edf4', mutedColor: '#111111' } },
  pages: [{ id: 'home', name: 'Home', components: [] }],
}
const card = {
  id: 'tinted',
  type: 'card',
  props: { title: 'Review', text: 'Readable' },
  styles: { backgroundColor: 'rgba(255,0,0,.1)', color: '#54595f' },
  layout: { x: 0, y: 0, w: 300, h: 120 },
}

function drawnOn(background) {
  const { container, unmount } = render(
    <LanguageProvider>
      <CanvasPreview
        page={{ id: 'home', name: 'Home', components: [card] }}
        viewport="pc"
        width={1000}
        background={background}
        colorMode={colorModeFor(schema, schema.pages[0])}
      />
    </LanguageProvider>,
  )
  const html = container.innerHTML
  unmount()
  return html
}

describe('the canvas preview in the other palette', () => {
  beforeEach(() => vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  }))
  afterEach(() => vi.unstubAllGlobals())

  it('judges a tinted block on the page background it is given', () => {
    expect(drawnOn('#fafafa')).toContain('var(--pwb-alt-muted, #54595f)')
    expect(drawnOn('#ffffff')).not.toContain('var(--pwb-alt-muted, #54595f)')
  })
})
