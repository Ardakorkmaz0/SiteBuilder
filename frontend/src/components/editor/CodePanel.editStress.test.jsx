import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

const exported = vi.hoisted(() => ({ files: null }))
vi.mock('../../utils/zip.js', () => ({ zipFiles: (files) => { exported.files = files; return new Blob(['zip']) } }))

import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../../store/editorStore.js'
import CodePanel from './CodePanel.jsx'

let blobs
const home = { id: 'home', name: 'Home', components: [], mode: 'empty' }
const about = { id: 'about', name: 'About', components: [], mode: 'html' }
const ownHtml = '<!doctype html><html><head><link rel="stylesheet" href="own.css"></head><body><h1>Before</h1></body></html>'
const draft = '<!doctype html><html><head><title>Unsaved export</title></head><body><h1>Keep my unsaved source ğüş</h1></body></html>'

function panel(pages = [home], props = {}) {
  useEditorStore.getState().loadSchema({ theme: {}, customCss: '.custom{color:red}', customJs: 'window.customReady=true', pages })
  return render(<UiThemeProvider><LanguageProvider><CodePanel currentPageId="home" onApplyHtml={vi.fn()} {...props} /></LanguageProvider></UiThemeProvider>)
}

function changeHtml(value = draft) {
  fireEvent.change(screen.getByRole('textbox', { name: 'HTML source editor' }), { target: { value } })
}

function exportAs(name) {
  fireEvent.click(screen.getByRole('button', { name: 'Export', exact: true }))
  fireEvent.click(screen.getByRole('menuitem', { name }))
}

beforeEach(() => {
  localStorage.clear()
  blobs = []
  exported.files = null
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => { blobs.push(blob); return 'blob:test' })
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

describe('editing and exporting before Apply', () => {
  it('single-file and optimized preview files include the pending source and shared assets', () => {
    panel()
    changeHtml()
    for (const name of [/home\.single\.html/, /home\.optimized\.min\.html/]) {
      fireEvent.click(screen.getByRole('button', { name }))
      expect(screen.getByLabelText('Generated source preview')).toHaveTextContent('Keep my unsaved source ğüş')
    }
  })

  it.each([/Single website file/, /Optimized publication/])('downloads the pending home HTML for %s', async (format) => {
    panel()
    changeHtml()
    exportAs(format)
    expect(await blobs[0].text()).toContain('Keep my unsaved source ğüş')
  })

  it('optimized multi-page export keeps both drafts and authored linked assets', () => {
    panel([home, about], { htmlMap: { about: ownHtml } })
    changeHtml()
    fireEvent.click(screen.getByRole('button', { name: /about\.html$/ }))
    changeHtml(ownHtml.replace('Before', 'Own pending document'))
    exportAs(/Optimized publication/)
    expect(exported.files.find((file) => file.name === 'index.html').content).toContain('Keep my unsaved source ğüş')
    expect(exported.files.find((file) => file.name === 'about.html').content).toContain('Own pending document')
    expect(exported.files.find((file) => file.name === 'about.html').content).toContain('href="own.css"')
  })

  it('the single authored HTML home page exports its pending edit without replacing its links', async () => {
    panel([about, home], { htmlMap: { about: ownHtml } })
    fireEvent.click(screen.getByRole('button', { name: /index\.html$/ }))
    changeHtml(ownHtml.replace('Before', 'Own home draft'))
    exportAs(/Single website file/)
    expect(await blobs[0].text()).toContain('Own home draft')
    expect(await blobs[0].text()).toContain('href="own.css"')
  })

  it('exports an intentionally empty draft instead of restoring an older document', async () => {
    panel()
    changeHtml('')
    exportAs(/Single website file/)
    expect(await blobs[0].text()).toBe('')
  })
})

describe('copying source', () => {
  it('reports success only after the clipboard accepts the current source', async () => {
    let resolve
    navigator.clipboard.writeText.mockImplementation(() => new Promise((done) => { resolve = done }))
    panel()
    changeHtml()
    fireEvent.click(screen.getByRole('button', { name: 'Copy', exact: true }))
    expect(screen.getByRole('button', { name: 'Copy', exact: true })).toBeInTheDocument()
    await act(async () => resolve())
    expect(screen.getByRole('button', { name: 'Copied', exact: true })).toBeInTheDocument()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(draft)
  })

  it('handles a rejected clipboard permission and leaves the source available for retry', async () => {
    navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard permission denied'))
    panel()
    changeHtml()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy', exact: true })) })
    expect(screen.getByRole('button', { name: 'Copy', exact: true })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Could not copy the code')
    expect(screen.getByRole('textbox', { name: 'HTML source editor' })).toHaveValue(draft)
    navigator.clipboard.writeText.mockResolvedValue(undefined)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy', exact: true })) })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copied', exact: true })).toBeInTheDocument()
  })
})
