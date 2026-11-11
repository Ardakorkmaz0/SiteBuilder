// Every file carries a mark that says what kind of page it is: a canvas of
// blocks or an HTML document. The mark comes from the page, so it is there
// whichever kind of page is open. The "empty" tag used to stand in for it: it
// showed on canvas pages while an HTML page was open, and was gone as soon as
// a canvas page was opened.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import PageFilesPanel from './PageFilesPanel.jsx'
import { useEditorStore } from '../../store/editorStore.js'

const pages = [
  { id: 'home', name: 'Home', mode: 'html', components: [] },
  { id: 'draft', name: 'Draft', mode: 'html', components: [] },
  { id: 'shop', name: 'Shop', mode: 'empty', components: [] },
  { id: 'turned', name: 'Turned', mode: 'empty', components: [], htmlBackup: '<h1>Before</h1>' },
]
const htmlMap = { home: '<h1>Home</h1>' }

function renderPanel(props = {}) {
  return render(
    <LanguageProvider>
      <PageFilesPanel htmlMap={htmlMap} {...props} />
    </LanguageProvider>,
  )
}

const fileRow = (name) => screen.getByRole('button', { name, exact: true }).parentElement
const kindOf = (name) => fileRow(name).querySelector('[data-page-kind]')
const menuOf = (name) => {
  fireEvent.contextMenu(fileRow(name), { clientX: 40, clientY: 50 })
  return screen.getByRole('menu', { name: `Options for ${name}` })
}

beforeEach(() => {
  localStorage.setItem('pwb_language', 'en')
  useEditorStore.setState({ schema: { theme: {}, pages }, currentPageId: 'home' })
})

describe('the mark beside a file', () => {
  for (const mode of ['html', 'pages']) {
    it(`says what kind of page it is, in the ${mode} editor's list`, () => {
      renderPanel({ mode })

      expect(kindOf('index.html').dataset.pageKind).toBe('html')
      expect(kindOf('draft.html').dataset.pageKind).toBe('html')
      expect(kindOf('shop.html').dataset.pageKind).toBe('canvas')
      expect(kindOf('turned.html').dataset.pageKind).toBe('canvas')
      expect(within(kindOf('index.html')).getByText('HTML page')).toHaveClass('sr-only')
      expect(within(kindOf('shop.html')).getByText('Canvas page: blocks you drag and drop')).toHaveClass('sr-only')
      expect(kindOf('shop.html')).toHaveAttribute('title', 'Canvas page: blocks you drag and drop')
    })

    it(`keeps "empty" for an HTML page with no document yet, in the ${mode} editor's list`, () => {
      renderPanel({ mode })

      expect(within(fileRow('draft.html')).getByText('empty')).toBeInTheDocument()
      expect(within(fileRow('index.html')).queryByText('empty')).not.toBeInTheDocument()
      // A canvas page is not an empty document.
      expect(within(fileRow('shop.html')).queryByText('empty')).not.toBeInTheDocument()
    })
  }
})

describe('right-clicking a file', () => {
  it('offers to turn an HTML page that has a document into canvas blocks', () => {
    const onConvertToCanvas = vi.fn()
    renderPanel({ onConvertToCanvas, onBackToHtml: vi.fn() })

    fireEvent.click(within(menuOf('index.html')).getByRole('menuitem', { name: 'Convert to canvas blocks' }))

    expect(onConvertToCanvas).toHaveBeenCalledWith('home')
  })

  it('offers the way back on a canvas page that has its HTML page kept', () => {
    const onBackToHtml = vi.fn()
    renderPanel({ onConvertToCanvas: vi.fn(), onBackToHtml })

    fireEvent.click(within(menuOf('turned.html')).getByRole('menuitem', { name: 'Back to the HTML page' }))

    expect(onBackToHtml).toHaveBeenCalledWith('turned')
  })

  it('offers neither where there is nothing to turn', () => {
    renderPanel({ onConvertToCanvas: vi.fn(), onBackToHtml: vi.fn() })

    const emptyDocument = menuOf('draft.html')
    expect(within(emptyDocument).queryByRole('menuitem', { name: 'Convert to canvas blocks' })).not.toBeInTheDocument()
    fireEvent.keyDown(emptyDocument, { key: 'Escape' })

    const plainCanvas = menuOf('shop.html')
    expect(within(plainCanvas).queryByRole('menuitem', { name: 'Back to the HTML page' })).not.toBeInTheDocument()
    expect(within(plainCanvas).queryByRole('menuitem', { name: 'Convert to canvas blocks' })).not.toBeInTheDocument()
  })
})
