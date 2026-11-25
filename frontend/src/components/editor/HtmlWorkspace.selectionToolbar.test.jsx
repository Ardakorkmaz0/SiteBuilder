import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import HtmlWorkspace from './HtmlWorkspace.jsx'

const PAGE = '<html><head></head><body><section><h1 id="title">Garden notes</h1></section></body></html>'

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_htmlmode_toolbar-test', 'edit')
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})
afterEach(() => vi.useRealTimers())

// Edit mode with the heading selected. The heading reports a real box, as a
// browser would; jsdom lays nothing out.
function selectHeading({ frameWidth, pageWidth, headingBox } = {}) {
  const onCommit = vi.fn()
  const onElementSelect = vi.fn()
  render(
    <LanguageProvider>
      <HtmlWorkspace persistKey="toolbar-test" html={PAGE} onCommit={onCommit} onElementSelect={onElementSelect} />
    </LanguageProvider>,
  )
  const iframe = screen.getByTitle('site')
  if (frameWidth) iframe.getBoundingClientRect = () => ({ left: 0, top: 0, right: frameWidth, bottom: 400, width: frameWidth, height: 400 })
  if (pageWidth) Object.defineProperty(iframe.contentWindow, 'innerWidth', { value: pageWidth, configurable: true })
  iframe.contentDocument.body.innerHTML = '<section><h1 id="title">Garden notes</h1></section>'
  fireEvent.load(iframe)
  const doc = iframe.contentDocument
  const heading = doc.getElementById('title')
  const box = headingBox || { left: 300, top: 200, width: 400, height: 60 }
  heading.getBoundingClientRect = () => ({ ...box, right: box.left + box.width, bottom: box.top + box.height })
  act(() => { fireEvent.click(heading) })
  return { doc, heading, onCommit, onElementSelect }
}

describe('the bar over a selected element of an HTML page', () => {
  it('draws every action as an icon, with no character glyphs left', () => {
    const { doc } = selectHeading()
    const buttons = [...doc.querySelectorAll('[data-pwb-selection-action]')]
    expect(buttons.map((button) => button.getAttribute('data-pwb-selection-action')))
      .toEqual(['parent', 'duplicate', 'up', 'down', 'spotlight', 'share', 'delete', 'deselect'])
    for (const button of buttons) {
      expect(button.textContent, button.getAttribute('data-pwb-selection-action')).toBe('')
      expect(button.querySelector('svg path, svg rect, svg circle')).not.toBeNull()
    }
    // Delete is a trash can now, not a red box with ×.
    const remove = doc.querySelector('[data-pwb-selection-action="delete"]')
    // jsdom does not read the background shorthand back; the attribute text it was given is checked.
    expect(remove.getAttribute('style')).toContain('background:transparent')
    expect(remove.getAttribute('style')).not.toContain('#7f1d1d')
    expect(remove.innerHTML).toContain('d="M9 7V4h6v3"')
  })

  it('lets go of the selection with its X and leaves the page as it was', () => {
    const { doc, heading, onCommit, onElementSelect } = selectHeading()
    expect(doc.querySelector('[data-pwb-selection-toolbar]')).not.toBeNull()
    onElementSelect.mockClear()

    act(() => { fireEvent.click(doc.querySelector('[data-pwb-selection-action="deselect"]')) })

    expect(onElementSelect).toHaveBeenLastCalledWith(null)
    expect(doc.querySelector('[data-pwb-selection-toolbar]')).toBeNull()
    expect(heading.isConnected).toBe(true)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('keeps its size on screen while the page is drawn at half its size', () => {
    // The frame is 512px on screen for a 1024px page: the page is drawn at
    // half size, so the bar is drawn at twice its size inside it.
    const { doc } = selectHeading({ frameWidth: 512 })
    const toolbar = doc.querySelector('[data-pwb-selection-toolbar]')
    expect(toolbar.style.transform).toBe('scale(2)')
    expect(toolbar.style.transformOrigin).toBe('top left')
    // 38px bar and 8px gap on screen = 92px above the heading in page pixels.
    expect(toolbar.style.top).toBe('-92px')
  })

  // Galaxy Z Flip6's cover screen at 50%: 320px of page drawn 160px wide. The
  // bar kept its size on screen, wider than the page, and the frame cut off
  // its trash can and X.
  it('fits on a page narrower on screen than the bar, trash can and X included', () => {
    const { doc } = selectHeading({ frameWidth: 160, pageWidth: 320, headingBox: { left: 0, top: 120, width: 320, height: 40 } })
    const toolbar = doc.querySelector('[data-pwb-selection-toolbar]')
    expect(toolbar.querySelectorAll('[data-pwb-selection-action]')).toHaveLength(8)
    const drawn = Number(/scale\(([\d.]+)\)/.exec(toolbar.style.transform)?.[1] || 1)
    const left = Number.parseFloat(toolbar.style.left)
    // 8 buttons of 28px, 7 gaps of 2px, 4px padding and a 1px border at each end.
    const barWidth = 248
    expect(left).toBeGreaterThanOrEqual(0)
    expect(left + barWidth * drawn).toBeLessThanOrEqual(320)
  })
})
