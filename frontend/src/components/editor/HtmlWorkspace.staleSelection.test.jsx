import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import HtmlWorkspace from './HtmlWorkspace.jsx'

const PAGE = '<html><head></head><body><section><h1 id="title" data-anim-in="fade-up">Current heading</h1></section></body></html>'

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_htmlmode_stale-test', 'edit')
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})
afterEach(() => vi.useRealTimers())

function mountAndReplaceDocument({ beforeReplace, ...extraProps } = {}) {
  const ref = createRef()
  const onCommit = vi.fn()
  const onElementSelect = vi.fn()
  render(<LanguageProvider><HtmlWorkspace ref={ref} persistKey="stale-test" html={PAGE} onCommit={onCommit} onElementSelect={onElementSelect} {...extraProps} /></LanguageProvider>)
  const iframe = screen.getByTitle('site')
  iframe.contentDocument.body.innerHTML = '<section><h1 id="title" data-anim-in="fade-up">Current heading</h1></section>'
  fireEvent.load(iframe)
  const oldHeading = iframe.contentDocument.getElementById('title')
  fireEvent.click(oldHeading)
  beforeReplace?.(iframe.contentDocument, oldHeading)
  const replacement = document.implementation.createHTMLDocument('Replacement')
  replacement.body.innerHTML = '<section><h1 id="title" data-anim-in="fade-up">Current heading</h1></section>'
  Object.defineProperty(iframe, 'contentDocument', { configurable: true, value: replacement })
  // A real srcdoc navigation leaves the old Document's node connected to
  // that Document. isConnected alone does not mean it is in the current frame.
  expect(oldHeading.isConnected).toBe(true)
  expect(oldHeading.ownerDocument).not.toBe(replacement)
  onCommit.mockClear()
  onElementSelect.mockClear()
  return { ref, iframe, oldHeading, replacement, onCommit, onElementSelect }
}

describe('a selection from a replaced iframe document', () => {
  it('does not apply inspector edits to an old document or commit the unchanged current one', () => {
    const { ref, oldHeading, replacement, onCommit, onElementSelect } = mountAndReplaceDocument()
    act(() => ref.current.updateSelectedElement({ text: 'Lost edit' }))
    expect(oldHeading.textContent).toBe('Current heading')
    expect(replacement.getElementById('title').textContent).toBe('Current heading')
    expect(onCommit).not.toHaveBeenCalled()
    expect(onElementSelect).toHaveBeenLastCalledWith(null)
  })

  it('does not silently remove an animation from an old document', () => {
    const { ref, oldHeading, onCommit, onElementSelect } = mountAndReplaceDocument()
    act(() => ref.current.applyMotionToSelected({ animIn: 'none' }))
    expect(oldHeading.getAttribute('data-anim-in')).toBe('fade-up')
    expect(onCommit).not.toHaveBeenCalled()
    expect(onElementSelect).toHaveBeenLastCalledWith(null)
  })

  it('clears the inspector immediately when the replacement document loads', () => {
    const { iframe, onElementSelect } = mountAndReplaceDocument()
    fireEvent.load(iframe)
    expect(onElementSelect).toHaveBeenLastCalledWith(null)
  })

  it('does not mark the replacement document dirty when an old input heartbeat finishes later', () => {
    const onDraftDirtyChange = vi.fn()
    const { iframe } = mountAndReplaceDocument({
      onDraftDirtyChange,
      beforeReplace: (doc, heading) => {
        heading.textContent = 'Old document typing'
        fireEvent.input(doc.body)
      },
    })
    fireEvent.load(iframe)
    onDraftDirtyChange.mockClear()
    act(() => vi.advanceTimersByTime(400))
    expect(onDraftDirtyChange).not.toHaveBeenCalledWith(true)
  })

  it('ignores a queued selection click from the previous document after the new document loaded', () => {
    const { iframe, oldHeading, onElementSelect } = mountAndReplaceDocument()
    fireEvent.load(iframe)
    onElementSelect.mockClear()
    fireEvent.click(oldHeading)
    expect(onElementSelect).not.toHaveBeenCalled()
  })
})
