// A heading on a canvas page and an <h1> on an HTML page are the same thing to
// the person editing them, so the right-hand panel shows them the same way:
// the same icon in the header, the same four tabs with the same icons, the
// same X that lets go of the selection, the same group names in the same order,
// the same controls, and the same motion fields.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import { applyMobileElementPatch, describeElement } from '../../utils/htmlElementEdit.js'
import { useEditorStore } from '../../store/editorStore.js'
import { ICON_NODES } from '../iconNodes.js'
import HtmlElementPanel from './HtmlElementPanel.jsx'
import PropertiesPanel from './PropertiesPanel.jsx'

function providers(children) {
  return (
    <UiThemeProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </UiThemeProvider>
  )
}

function renderHtmlElement(markup = '<section><h1 id="selected" data-anim-in="fade-up">Garden notes</h1></section>', extra = {}) {
  document.body.innerHTML = markup
  const element = document.getElementById('selected')
  const props = {
    info: describeElement(element),
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
  return { ...view, props, element }
}

function renderCanvasHeading(extraComponent = {}) {
  const s = useEditorStore.getState()
  s.loadSchema({ theme: {}, pages: [{ id: 'p1', name: 'Home', components: [
    { id: 'box', type: 'container', props: { flow: 'row', gap: 16 }, styles: { padding: '20px' }, layout: { x: 0, y: 0, w: 600, h: 300 }, children: [
      {
        id: 'title',
        type: 'heading',
        props: { text: 'Garden notes', animIn: 'fade-up' },
        styles: { padding: '12px', fontSize: '36px' },
        layout: { x: 20, y: 20, w: 400, h: 60 },
        ...extraComponent,
      },
    ] },
  ] }] })
  s.selectPage('p1')
  s.setViewport('pc')
  s.selectComponent('title')
  return render(providers(<PropertiesPanel />))
}

const headerDrawing = (root) => [...root.querySelector('h2').closest('div.flex').querySelector('svg').querySelectorAll('path, rect, circle')]
  .map((shape) => shape.getAttribute('d') || shape.outerHTML)
const tabs = (root) => within(root).getAllByRole('tab').map((tab) => [
  tab.textContent.trim(),
  [...tab.querySelectorAll('path, rect, circle')].map((shape) => shape.getAttribute('d') || shape.getAttribute('cx')).join('|'),
])
const groupTitles = (root) => {
  const panel = within(root).getByRole('tabpanel')
  return [...panel.querySelectorAll('button[aria-expanded]')]
    .map((btn) => btn.textContent.trim().split('(')[0].trim())
}
const buttonIconDrawings = (button) => [...button.querySelectorAll('svg path, svg rect, svg circle')]
  .map((shape) => shape.getAttribute('d') || shape.outerHTML)

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
})

describe('the properties panel on an HTML page and on a canvas page', () => {
  it('shows a heading with the same header icon and the same four tabs with the same icons', () => {
    const html = renderHtmlElement()
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
    const html = renderHtmlElement()
    fireEvent.click(screen.getByRole('button', { name: 'Deselect (back to site settings)' }))
    expect(html.props.onClose).toHaveBeenCalledTimes(1)
    html.unmount()

    renderCanvasHeading()
    fireEvent.click(screen.getByRole('button', { name: 'Deselect (back to site settings)' }))
    expect(useEditorStore.getState().selectedId).toBeNull()
  })

  it('selects the parent from the header on both', () => {
    const html = renderHtmlElement()
    fireEvent.click(screen.getByRole('button', { name: /^Select parent <section>$/ }))
    expect(html.props.onSelectParent).toHaveBeenCalledTimes(1)
    html.unmount()

    renderCanvasHeading()
    fireEvent.click(screen.getByRole('button', { name: /^Select parent Container$/ }))
    expect(useEditorStore.getState().selectedId).toBe('box')
  })

  it('orders Design groups identically and drives the same controls into HTML patches and canvas styles', () => {
    const html = renderHtmlElement()
    fireEvent.click(screen.getByRole('tab', { name: 'Design' }))
    const htmlDesignGroups = groupTitles(html.container)
    expect(htmlDesignGroups).toEqual([
      'Typography',
      'Colors',
      'Background image & gradient',
      'Border',
      'Effects',
    ])

    const htmlAlignCenter = screen.getByRole('button', { name: 'Align text center' })
    expect(buttonIconDrawings(htmlAlignCenter)).toEqual([ICON_NODES.alignCenter[0][1].d])
    fireEvent.click(htmlAlignCenter)
    expect(html.props.onChange).toHaveBeenLastCalledWith({ textAlign: 'center' })

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Font size', exact: true }), { target: { value: '42' } })
    expect(html.props.onChange).toHaveBeenLastCalledWith({ fontSize: 42 })

    fireEvent.click(screen.getByRole('button', { name: 'Border' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Corner radius', exact: true }), { target: { value: '14' } })
    expect(html.props.onChange).toHaveBeenLastCalledWith({ radius: 14 })
    html.unmount()

    localStorage.clear()
    localStorage.setItem('pwb_language', 'en')
    const canvas = renderCanvasHeading()
    fireEvent.click(screen.getByRole('tab', { name: 'Design' }))
    const canvasDesignGroups = groupTitles(canvas.container)
    expect(canvasDesignGroups.slice(0, 5)).toEqual(htmlDesignGroups)

    const canvasAlignCenter = screen.getByRole('button', { name: 'Align text center' })
    expect(buttonIconDrawings(canvasAlignCenter)).toEqual([ICON_NODES.alignCenter[0][1].d])
    fireEvent.click(canvasAlignCenter)
    expect(useEditorStore.getState().schema.pages[0].components[0].children[0].styles.textAlign).toBe('center')

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Font size', exact: true }), { target: { value: '42' } })
    expect(useEditorStore.getState().schema.pages[0].components[0].children[0].styles.fontSize).toBe('42px')

    fireEvent.click(screen.getByRole('button', { name: 'Border' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Corner radius', exact: true }), { target: { value: '14' } })
    expect(useEditorStore.getState().schema.pages[0].components[0].children[0].styles.borderRadius).toBe('14px')
  })

  it('orders Layout groups identically on flex containers, including per-side padding, stacking and flex controls', () => {
    const html = renderHtmlElement('<main><div id="selected" style="display:flex;padding:20px">Row</div></main>')
    fireEvent.click(screen.getByRole('tab', { name: 'Layout' }))
    const htmlLayoutGroups = groupTitles(html.container)
    expect(htmlLayoutGroups).toEqual([
      'Align',
      'Size',
      'Spacing',
      'Position & stacking',
      'Flex layout',
    ])
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Top', exact: true }), { target: { value: '32' } })
    expect(html.props.onChange).toHaveBeenLastCalledWith({ paddingTop: 32 })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Margin top', exact: true }), { target: { value: '18' } })
    expect(html.props.onChange).toHaveBeenLastCalledWith({ marginTop: 18 })
    html.unmount()

    localStorage.clear()
    localStorage.setItem('pwb_language', 'en')
    renderCanvasHeading()
    act(() => {
      useEditorStore.getState().selectComponent('box')
    })
    fireEvent.click(screen.getByRole('tab', { name: 'Layout' }))
    const canvasLayoutGroups = groupTitles(document.body)
    expect(canvasLayoutGroups.slice(0, 5)).toEqual(htmlLayoutGroups)

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Top', exact: true }), { target: { value: '32' } })
    expect(useEditorStore.getState().schema.pages[0].components[0].styles.padding).toBe('32px 20px 20px 20px')
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Margin top', exact: true }), { target: { value: '18' } })
    expect(useEditorStore.getState().schema.pages[0].components[0].styles.margin).toBe('18px 0px 0px 0px')
  })

  it('preserves mobile-only writes, clear-to-PC fallback, and 0 vs empty in both modes', () => {
    document.body.innerHTML = '<h1 id="selected" style="padding: 24px">Title</h1>'
    const el = document.getElementById('selected')
    applyMobileElementPatch(el, { padding: 8 })
    const html = render(
      providers(
        <HtmlElementPanel
          info={describeElement(el)}
          viewport="mobile"
          onChange={(patch) => applyMobileElementPatch(el, patch)}
          onResetMobile={vi.fn()}
        />,
      ),
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Design' }))
    expect(screen.getByText(/Style edits here apply to MOBILE only/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset mobile styles (1)' })).toBeInTheDocument()
    html.unmount()

    localStorage.clear()
    localStorage.setItem('pwb_language', 'en')
    renderCanvasHeading({ styles: { padding: '24px' }, stylesMobile: { padding: '8px' } })
    act(() => {
      useEditorStore.getState().setViewport('mobile')
    })
    fireEvent.click(screen.getByRole('tab', { name: 'Design' }))
    expect(screen.getByText(/Style edits here apply to MOBILE only/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset mobile styles (1)' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Layout' }))
    const pad = screen.getByRole('spinbutton', { name: 'Padding', exact: true })
    fireEvent.change(pad, { target: { value: '0' } })
    expect(useEditorStore.getState().schema.pages[0].components[0].children[0].stylesMobile.padding).toBe('0px')

    fireEvent.change(pad, { target: { value: '' } })
    expect(useEditorStore.getState().schema.pages[0].components[0].children[0].stylesMobile).toBeUndefined()
  })

  it('gives an HTML element the motion fields a canvas block has, and sends what is picked', () => {
    const { props } = renderHtmlElement()
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
