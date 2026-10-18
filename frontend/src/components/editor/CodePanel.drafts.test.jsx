import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { useEditorStore } from '../../store/editorStore.js'
import CodePanel from './CodePanel.jsx'

function panel(props = {}) {
  return <LanguageProvider><CodePanel currentPageId="home" {...props} /></LanguageProvider>
}

beforeEach(() => {
  localStorage.setItem('pwb_language', 'en')
  useEditorStore.getState().loadSchema({
    theme: {}, pages: [
      { id: 'home', name: 'Home', components: [] },
      { id: 'other', name: 'Other', components: [] },
    ],
  })
})

describe('editor-owned component source drafts', () => {
  it('shows the source owned by its editor', () => {
    render(panel({ htmlDrafts: { 'index.html': '<h1>Recovered source</h1>' } }))
    expect(screen.getByLabelText('HTML source editor')).toHaveValue('<h1>Recovered source</h1>')
  })

  it('shows a newer editor-owned source without remounting the panel', () => {
    const view = render(panel({ htmlDrafts: { 'index.html': '<h1>Original source</h1>' } }))
    view.rerender(panel({ htmlDrafts: { 'index.html': '<h1>Recovered source</h1>' } }))
    expect(screen.getByLabelText('HTML source editor')).toHaveValue('<h1>Recovered source</h1>')
  })

  it('synchronously hands edits to its owner while retaining other pending files', () => {
    const onHtmlDraftsChange = vi.fn()
    render(panel({
      htmlDrafts: { 'other.html': '<h1>Another page</h1>' }, onHtmlDraftsChange,
    }))
    fireEvent.change(screen.getByLabelText('HTML source editor'), { target: { value: '<h1>Edited source</h1>' } })
    expect(onHtmlDraftsChange).toHaveBeenLastCalledWith({
      'other.html': '<h1>Another page</h1>', 'index.html': '<h1>Edited source</h1>',
    })
  })

  it('drops an edit that returns to the generated document', () => {
    const onHtmlDraftsChange = vi.fn()
    const view = render(panel({ onHtmlDraftsChange }))
    const generated = screen.getByLabelText('HTML source editor').value
    view.rerender(panel({ htmlDrafts: { 'index.html': '<h1>Pending source</h1>' }, onHtmlDraftsChange }))
    fireEvent.change(screen.getByLabelText('HTML source editor'), { target: { value: generated } })
    expect(onHtmlDraftsChange).toHaveBeenLastCalledWith({})
  })

  it('clears the applied file from its owner without erasing other pending files', () => {
    const onHtmlDraftsChange = vi.fn()
    const onApplyHtml = vi.fn()
    render(panel({
      htmlDrafts: { 'index.html': '<h1>Apply this source</h1>', 'other.html': '<h1>Keep this draft</h1>' },
      onHtmlDraftsChange, onApplyHtml,
    }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply HTML' }))
    expect(onApplyHtml).toHaveBeenCalledTimes(1)
    expect(onApplyHtml.mock.calls[0][0].html).toContain('<h1>Apply this source</h1>')
    expect(onHtmlDraftsChange).toHaveBeenLastCalledWith({ 'other.html': '<h1>Keep this draft</h1>' })
  })
})
