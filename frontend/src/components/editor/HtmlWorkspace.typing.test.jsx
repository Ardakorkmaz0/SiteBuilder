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

// Typing is not an undo step per keystroke, but it has to become one before
// the next action. An action's undo step holds the last recorded document, so
// undoing a delete made after typing brought the block back without the typing.
describe('typing becomes an undo step before the next action', () => {
  const typeInto = (doc, text) => {
    doc.getElementById('t').textContent = text
    act(() => { doc.dispatchEvent(new Event('input', { bubbles: true })) })
  }

  it('records what was typed when the pointer goes down on the page', () => {
    const onCommit = vi.fn()
    const doc = mountEditing({ onCommit }).contentDocument
    typeInto(doc, 'Hi there')

    act(() => { doc.body.dispatchEvent(new Event('pointerdown', { bubbles: true })) })

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit.mock.calls[0][0]).toContain('Hi there')
  })

  it('records it when the pointer goes down on the editor around the page', () => {
    const onCommit = vi.fn()
    const doc = mountEditing({ onCommit }).contentDocument
    typeInto(doc, 'Hi there')

    act(() => { window.dispatchEvent(new Event('pointerdown')) })

    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('records nothing when nothing was typed', () => {
    const onCommit = vi.fn()
    const doc = mountEditing({ onCommit }).contentDocument

    act(() => {
      doc.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      window.dispatchEvent(new Event('pointerdown'))
    })

    expect(onCommit).not.toHaveBeenCalled()
  })

  it('records it once, not on every later click', () => {
    const onCommit = vi.fn()
    const doc = mountEditing({ onCommit }).contentDocument
    typeInto(doc, 'Hi there')

    act(() => {
      doc.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      doc.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    })

    expect(onCommit).toHaveBeenCalledTimes(1)
  })
})

// The × sits in the page, so focus is there after a delete: Ctrl+Z has to be
// the editor's then, and the text's own only while there is typing to undo.
describe('Ctrl+Z pressed in the page', () => {
  const pressUndo = (doc) => {
    const seen = vi.fn()
    window.addEventListener('keydown', seen)
    act(() => { doc.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })) })
    window.removeEventListener('keydown', seen)
    return seen.mock.calls.length > 0
  }

  it('goes to the editor when nothing was typed since its last change', () => {
    const doc = mountEditing({ onCommit: vi.fn() }).contentDocument
    doc.designMode = 'on'
    expect(pressUndo(doc)).toBe(true)
  })

  it('stays with the text while there is typing to undo', () => {
    const doc = mountEditing({ onCommit: vi.fn() }).contentDocument
    doc.designMode = 'on'
    doc.getElementById('t').textContent = 'Hi there'
    act(() => { doc.dispatchEvent(new Event('input', { bubbles: true })) })
    expect(pressUndo(doc)).toBe(false)
  })
})
