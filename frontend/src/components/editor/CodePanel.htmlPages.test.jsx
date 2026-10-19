// A site can mix pages built on the canvas with pages that are HTML documents.
// The Source workspace only knew the canvas: an HTML page showed up in it as
// the (empty) component page behind it, and every export — the project zip,
// the single file, the optimized set — shipped that blank page instead of the
// document the person had written.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const zipped = vi.hoisted(() => ({ files: null }))
vi.mock('../../utils/zip.js', () => ({
  zipFiles: (files) => {
    zipped.files = files
    return new Blob(['zip'])
  },
}))

import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../../store/editorStore.js'
import CodePanel from './CodePanel.jsx'

const ABOUT = '<!DOCTYPE html><html><head><title>About</title><link rel="stylesheet" href="styles.css"></head><body><h1>Written by hand</h1></body></html>'

let saved = []

function renderPanel(props = {}) {
  return render(
    <UiThemeProvider>
      <LanguageProvider>
        <CodePanel currentPageId="p1" {...props} />
      </LanguageProvider>
    </UiThemeProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  zipped.files = null
  saved = []
  // What the browser is asked to save, read back as text.
  URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:test' }
  URL.revokeObjectURL = () => {}
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

function loadMixedSite({ htmlFirst = false } = {}) {
  const canvas = { id: 'p1', name: 'Home', components: [{ id: 'h1', type: 'heading', props: { text: 'Built on the canvas' }, styles: {}, layout: { x: 0, y: 0, w: 400, h: 60 } }] }
  const html = { id: 'p2', name: 'About', mode: 'html', components: [] }
  useEditorStore.getState().loadSchema({ theme: {}, pages: htmlFirst ? [html, canvas] : [canvas, html] })
  return { p2: ABOUT }
}

describe('an HTML page in the Source workspace', () => {
  it('is shown as its own document, not as the empty canvas behind it', () => {
    const htmlMap = loadMixedSite()
    renderPanel({ htmlMap })

    fireEvent.click(screen.getByRole('button', { name: /about\.html/i }))

    expect(screen.getByLabelText('HTML source editor').value).toBe(ABOUT)
  })

  it('goes into the project zip as that document', () => {
    const htmlMap = loadMixedSite()
    renderPanel({ htmlMap })

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Editable code project/i }))

    const about = zipped.files.find((file) => file.name === 'about.html')
    expect(about.content).toBe(ABOUT)
    expect(zipped.files.find((file) => file.name === 'index.html').content).toContain('Built on the canvas')
  })

  it('keeps authored HTML in the ZIP schema backup without converting canvas pages', () => {
    const htmlMap = loadMixedSite()
    renderPanel({ htmlMap })

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Editable code project/i }))

    const backup = JSON.parse(zipped.files.find((file) => file.name === 'schema.json').content)
    expect(backup.pages.find((page) => page.id === 'p2').html).toBe(ABOUT)
    expect(backup.pages.find((page) => page.id === 'p1').html).toBe('')
    expect(backup.pages.find((page) => page.id === 'p1').components[0].props.text).toBe('Built on the canvas')
    expect(useEditorStore.getState().schema.pages[1]).not.toHaveProperty('html')
  })

  it('puts the same pending authored document in the ZIP HTML and schema backup', () => {
    const htmlMap = loadMixedSite()
    renderPanel({ htmlMap })
    fireEvent.click(screen.getByRole('button', { name: /about\.html/i }))
    const draft = ABOUT.replace('Written by hand', 'Unsaved source for the backup')
    fireEvent.change(screen.getByLabelText('HTML source editor'), { target: { value: draft } })
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Editable code project/i }))

    const backup = JSON.parse(zipped.files.find((file) => file.name === 'schema.json').content)
    expect(backup.pages.find((page) => page.id === 'p2').html).toBe(draft)
    expect(zipped.files.find((file) => file.name === 'about.html').content).toBe(draft)
    expect(htmlMap.p2).toBe(ABOUT)
  })

  it('goes into the optimized set untouched, beside the minified canvas pages', () => {
    const htmlMap = loadMixedSite()
    renderPanel({ htmlMap })

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Optimized publication/i }))

    expect(zipped.files.find((file) => file.name === 'about.html').content).toBe(ABOUT)
  })

  it('is the single website file when it is the home page', async () => {
    const htmlMap = loadMixedSite({ htmlFirst: true })
    renderPanel({ htmlMap, currentPageId: 'p1' })

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Single website file/i }))

    expect(await saved[0].text()).toBe(ABOUT)
  })

  it('is applied as written: its own stylesheet link is not swapped for the generated one', () => {
    const htmlMap = loadMixedSite()
    const onApplyHtml = vi.fn()
    renderPanel({ htmlMap, onApplyHtml })
    fireEvent.click(screen.getByRole('button', { name: /about\.html/i }))

    fireEvent.change(screen.getByLabelText('HTML source editor'), { target: { value: ABOUT.replace('Written by hand', 'Edited by hand') } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply HTML' }))

    expect(onApplyHtml).toHaveBeenCalledTimes(1)
    const applied = onApplyHtml.mock.calls[0][0]
    expect(applied.pageId).toBe('p2')
    expect(applied.html).toBe(ABOUT.replace('Written by hand', 'Edited by hand'))
  })
})
