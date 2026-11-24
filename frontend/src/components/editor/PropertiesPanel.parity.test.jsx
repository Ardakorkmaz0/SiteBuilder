// A heading on a canvas page and an <h1> on an HTML page are the same thing to
// the person editing them, so the right-hand panel shows them the same way:
// the same icon in the header, the same four tabs with the same icons, the
// same X that lets go of the selection, the same motion fields.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import { describeElement } from '../../utils/htmlElementEdit.js'
import { useEditorStore } from '../../store/editorStore.js'
import HtmlElementPanel from './HtmlElementPanel.jsx'
import PropertiesPanel from './PropertiesPanel.jsx'

function providers(children) {
  return (
    <UiThemeProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </UiThemeProvider>
  )
}

function renderHtmlHeading(extra = {}) {
  document.body.innerHTML = '<section><h1 id="selected" data-anim-in="fade-up">Garden notes</h1></section>'
  const props = {
    info: describeElement(document.getElementById('selected')),
    onChange: vi.fn(),
    onSelectParent: vi.fn(),
    onDuplicate: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    onDelete: vi.fn(),
    onResetMobile: vi.fn(),
    onMotionChange: vi.fn(),
    onClose: vi.fn(),
    ...extra,
  }
  const view = render(providers(<HtmlElementPanel {...props} />))
  return { ...view, props }
}

function renderCanvasHeading() {
  const s = useEditorStore.getState()
  s.loadSchema({ theme: {}, pages: [{ id: 'p1', name: 'Home', components: [
    { id: 'box', type: 'container', props: {}, styles: {}, layout: { x: 0, y: 0, w: 600, h: 300 }, children: [
      { id: 'title', type: 'heading', props: { text: 'Garden notes', animIn: 'fade-up' }, styles: {}, layout: { x: 20, y: 20, w: 400, h: 60 } },
    ] },
  ] }] })
  s.selectPage('p1')
  s.selectComponent('title')
  return render(providers(<PropertiesPanel />))
}

// The header's kind icon and each tab's icon, as their drawings.
const headerDrawing = (root) => [...root.querySelector('h2').closest('div.flex').querySelector('svg').querySelectorAll('path, rect, circle')]
  .map((shape) => shape.getAttribute('d') || shape.outerHTML)
const tabs = (root) => within(root).getAllByRole('tab').map((tab) => [
  tab.textContent.trim(),
  [...tab.querySelectorAll('path, rect, circle')].map((shape) => shape.getAttribute('d') || shape.getAttribute('cx')).join('|'),
])

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
})

describe('the properties panel on an HTML page and on a canvas page', () => {
  it('shows a heading with the same header icon and the same four tabs with the same icons', () => {
    const html = renderHtmlHeading()
    const htmlHeader = headerDrawing(html.container)
    const htmlTabs = tabs(html.container)
    html.unmount()
    const canvas = renderCanvasHeading()

    // The heading drawing (an H), on both.
    expect(htmlHeader).toEqual(['M6 12h12', 'M6 20V4M18 20V4'])
    expect(headerDrawing(canvas.container)).toEqual(htmlHeader)
    expect(htmlTabs.map(([label]) => label)).toEqual(['Content', 'Design', 'Layout', 'Motion'])
    expect(tabs(canvas.container)).toEqual(htmlTabs)
    for (const [label, drawing] of htmlTabs) expect(drawing, label).not.toBe('')
  })

  it('lets go of the selection with the same X on both', () => {
    const html = renderHtmlHeading()
    fireEvent.click(screen.getByRole('button', { name: 'Deselect (back to site settings)' }))
    expect(html.props.onClose).toHaveBeenCalledTimes(1)
    html.unmount()

    renderCanvasHeading()
    fireEvent.click(screen.getByRole('button', { name: 'Deselect (back to site settings)' }))
    expect(useEditorStore.getState().selectedId).toBeNull()
  })

  it('selects the parent from the header on both', () => {
    const html = renderHtmlHeading()
    fireEvent.click(screen.getByRole('button', { name: /^Select parent <section>$/ }))
    expect(html.props.onSelectParent).toHaveBeenCalledTimes(1)
    html.unmount()

    renderCanvasHeading()
    fireEvent.click(screen.getByRole('button', { name: /^Select parent Container$/ }))
    expect(useEditorStore.getState().selectedId).toBe('box')
  })

  it('gives an HTML element the motion fields a canvas block has, and sends what is picked', () => {
    const { props } = renderHtmlHeading()
    fireEvent.click(screen.getByRole('tab', { name: 'Motion' }))
    const entrance = screen.getByRole('combobox', { name: 'Entrance (on scroll)' })
    expect(entrance).toHaveValue('fade-up')
    expect(screen.getByRole('combobox', { name: 'Hover effect' })).toHaveValue('none')
    fireEvent.change(entrance, { target: { value: 'zoom' } })
    expect(props.onMotionChange).toHaveBeenLastCalledWith({ animIn: 'zoom' })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Delay (ms)' }), { target: { value: '250' } })
    fireEvent.blur(screen.getByRole('spinbutton', { name: 'Delay (ms)' }))
    expect(props.onMotionChange).toHaveBeenCalledWith({ animDelay: 250 })
  })
})
