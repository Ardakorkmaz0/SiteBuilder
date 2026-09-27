// Text typed into the page in Edit runs ahead of the committed html until Save
// or a mode switch picks it up. It used to raise no unsaved signal at all, so
// auto-save never ran for typing, the leave-page guard stayed quiet and a
// reload silently dropped what was typed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import HtmlWorkspace from './HtmlWorkspace.jsx'

const PAGE = '<html><head></head><body><h1 id="t">Hi</h1></body></html>'

function mountEditing(props = {}) {
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_htmlmode_typing-test', 'edit')
  render(
    <LanguageProvider>
      <HtmlWorkspace persistKey="typing-test" html={PAGE} {...props} />
    </LanguageProvider>,
  )
  const iframe = screen.getByTitle('site')
  // jsdom fires no load for srcdoc; seed the document the way the real load does.
  iframe.contentDocument.body.innerHTML = '<h1 id="t">Hi</h1>'
  fireEvent.load(iframe)
  return iframe
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('typing in Edit', () => {
  it('reports an unsaved draft once the page text changes', () => {
    const onDraftDirtyChange = vi.fn()
    const iframe = mountEditing({ onDraftDirtyChange })
    expect(onDraftDirtyChange).not.toHaveBeenCalledWith(true)

    const doc = iframe.contentDocument
    doc.getElementById('t').textContent = 'Hi there'
    act(() => {
      doc.dispatchEvent(new Event('input', { bubbles: true }))
      vi.advanceTimersByTime(400)
    })

    expect(onDraftDirtyChange).toHaveBeenLastCalledWith(true)
  })

  it('clears it when the text is typed back to what was saved', () => {
    const onDraftDirtyChange = vi.fn()
    const iframe = mountEditing({ onDraftDirtyChange })
    const doc = iframe.contentDocument
    const h1 = doc.getElementById('t')

    h1.textContent = 'Hi there'
    act(() => {
      doc.dispatchEvent(new Event('input', { bubbles: true }))
      vi.advanceTimersByTime(400)
    })
    h1.textContent = 'Hi'
    act(() => {
      doc.dispatchEvent(new Event('input', { bubbles: true }))
      vi.advanceTimersByTime(400)
    })

    expect(onDraftDirtyChange).toHaveBeenLastCalledWith(false)
  })
})
