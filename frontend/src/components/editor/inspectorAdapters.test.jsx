import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { describeElement } from '../../utils/htmlElementEdit.js'
import { registry } from '../registry.jsx'
import ColorFields from './ColorFields.jsx'
import FlexLayoutFields from './FlexLayoutFields.jsx'
import SpacingFields from './SpacingFields.jsx'
import TypographyFields from './TypographyFields.jsx'
import {
  createCanvasInspectorAdapter,
  createHtmlInspectorAdapter,
} from './inspectorAdapters.js'

function wrap(ui) {
  localStorage.setItem('pwb_language', 'en')
  return render(<LanguageProvider>{ui}</LanguageProvider>)
}

function makeCanvasAdapter(type, overrides = {}) {
  const component = {
    id: 'comp_1',
    type,
    props: {},
    styles: {},
    layout: { x: 10, y: 20, w: 320, h: 120 },
    ...overrides.component,
  }
  const updateStyles = vi.fn((_id, patch) => {
    if (overrides.viewport === 'mobile') {
      const over = { ...(component.stylesMobile || {}) }
      for (const [k, v] of Object.entries(patch)) {
        if (v === '' || v == null) delete over[k]
        else over[k] = v
      }
      component.stylesMobile = Object.keys(over).length ? over : undefined
    } else {
      component.styles = { ...component.styles, ...patch }
    }
  })
  const updateProps = vi.fn((_id, patch) => {
    component.props = { ...component.props, ...patch }
  })
  const setLayout = vi.fn()
  const adapter = createCanvasInspectorAdapter({
    component,
    def: registry[type],
    viewport: overrides.viewport || 'pc',
    isFlow: !!overrides.isFlow,
    layout: component.layout,
    showPositionControls: true,
    viewportStretchComponent: false,
    selectedIds: [component.id],
    pages: [],
    linkSections: [],
    updateStyles,
    updateProps,
    setLayout,
    clearMobileStyles: vi.fn(),
    alignSelection: vi.fn(),
    distributeSelection: vi.fn(),
    scaleSingleSize: vi.fn(),
    presetSingleSize: vi.fn(),
    scrollBehavior: 'normal',
    setScrollBehavior: vi.fn(),
    hiddenUnderBar: 0,
  })
  return { adapter, component, updateStyles, updateProps, setLayout }
}

describe('shared inspector adapters and field groups', () => {
  it('round-trips per-side padding into CSS shorthand on canvas and keeps mobile 0 distinct from clear', () => {
    const { adapter, updateStyles } = makeCanvasAdapter('card', {
      component: { styles: { padding: '24px' } },
    })
    wrap(<SpacingFields adapter={adapter} />)

    expect(screen.getByRole('spinbutton', { name: 'Padding', exact: true })).toHaveValue(24)
    const top = screen.getByRole('spinbutton', { name: 'Top', exact: true })
    expect(top).toHaveValue(24)

    fireEvent.change(top, { target: { value: '40' } })
    expect(updateStyles).toHaveBeenLastCalledWith('comp_1', { padding: '40px 24px 24px 24px' })

    // Mobile override: 0 writes '0px', while clearing sends '' so stylesMobile drops the key.
    const mobile = makeCanvasAdapter('card', {
      viewport: 'mobile',
      component: { styles: { padding: '24px' }, stylesMobile: { padding: '12px' } },
    })
    const view = wrap(<SpacingFields adapter={mobile.adapter} />)
    const mobilePad = view.getAllByRole('spinbutton', { name: 'Padding' }).pop()
    fireEvent.change(mobilePad, { target: { value: '0' } })
    expect(mobile.updateStyles).toHaveBeenLastCalledWith('comp_1', { padding: '0px' })
    expect(mobile.component.stylesMobile).toEqual({ padding: '0px' })

    fireEvent.change(mobilePad, { target: { value: '' } })
    expect(mobile.updateStyles).toHaveBeenLastCalledWith('comp_1', { padding: '' })
    expect(mobile.component.stylesMobile).toBeUndefined()
  })

  it('edits two-stop linear gradients on canvas and hides URL background images unsupported by canvas styles', () => {
    const { adapter, updateStyles } = makeCanvasAdapter('card', {
      component: {
        styles: { backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
      },
    })
    wrap(<ColorFields adapter={adapter} />)

    fireEvent.click(screen.getByRole('button', { name: 'Background image & gradient' }))
    expect(screen.getByRole('textbox', { name: 'Gradient from', exact: true })).toHaveValue('#667eea')
    expect(screen.getByRole('textbox', { name: 'Gradient to', exact: true })).toHaveValue('#764ba2')
    expect(screen.getByRole('spinbutton', { name: 'Gradient angle', exact: true })).toHaveValue(135)
    expect(screen.queryByRole('button', { name: /Background image: Upload/i })).toBeNull()

    fireEvent.change(screen.getByLabelText('Pick a colour: Gradient to'), { target: { value: '#2563eb' } })
    expect(updateStyles).toHaveBeenLastCalledWith('comp_1', {
      backgroundImage: 'linear-gradient(135deg, #667eea, #2563eb)',
    })
  })

  it('drives identical Flex layout controls onto container props on canvas and inline CSS on HTML', () => {
    const canvas = makeCanvasAdapter('container', {
      component: { props: { flow: 'row', gap: 16, justify: 'start', align: 'stretch', wrap: false } },
    })
    const { unmount } = wrap(<FlexLayoutFields adapter={canvas.adapter} />)
    fireEvent.click(screen.getByRole('button', { name: 'Flex layout' }))

    fireEvent.change(screen.getByRole('combobox', { name: 'Direction', exact: true }), { target: { value: 'column' } })
    expect(canvas.updateProps).toHaveBeenLastCalledWith('comp_1', { flow: 'column' })

    fireEvent.change(screen.getByRole('combobox', { name: 'Justify', exact: true }), { target: { value: 'between' } })
    expect(canvas.updateProps).toHaveBeenLastCalledWith('comp_1', { justify: 'between' })

    fireEvent.change(screen.getByRole('combobox', { name: 'Wrapping', exact: true }), { target: { value: 'wrap' } })
    expect(canvas.updateProps).toHaveBeenLastCalledWith('comp_1', { wrap: true })

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Gap', exact: true }), { target: { value: '28' } })
    expect(canvas.updateProps).toHaveBeenLastCalledWith('comp_1', { gap: 28 })
    unmount()

    document.body.innerHTML = '<nav id="nav" style="display:flex;gap:12px"><a href="#a">A</a></nav>'
    const onHtmlChange = vi.fn()
    const htmlAdapter = createHtmlInspectorAdapter({
      info: describeElement(document.getElementById('nav')),
      onChange: onHtmlChange,
    })
    wrap(<FlexLayoutFields adapter={htmlAdapter} />)
    // PanelGroup remembers 'flex-layout' open from above in localStorage.
    fireEvent.change(screen.getByRole('combobox', { name: 'Direction', exact: true }), { target: { value: 'column' } })
    expect(onHtmlChange).toHaveBeenLastCalledWith({ flexDirection: 'column' })

    fireEvent.change(screen.getByRole('combobox', { name: 'Justify', exact: true }), { target: { value: 'space-between' } })
    expect(onHtmlChange).toHaveBeenLastCalledWith({ justifyContent: 'space-between' })

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Gap', exact: true }), { target: { value: '28' } })
    expect(onHtmlChange).toHaveBeenLastCalledWith({ gap: 28 })
  })

  it('toggles segmented text alignment and italic/underline marks in both modes', () => {
    const canvas = makeCanvasAdapter('text', {
      component: { styles: { textAlign: 'center', fontStyle: 'normal', textDecoration: 'none' } },
    })
    const { unmount } = wrap(<TypographyFields adapter={canvas.adapter} />)

    const center = screen.getByRole('button', { name: 'Align text center' })
    expect(center).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(center)
    expect(canvas.updateStyles).toHaveBeenLastCalledWith('comp_1', { textAlign: '' })

    fireEvent.click(screen.getByRole('checkbox', { name: 'Italic' }))
    expect(canvas.updateStyles).toHaveBeenLastCalledWith('comp_1', { fontStyle: 'italic' })

    fireEvent.click(screen.getByRole('checkbox', { name: 'Underline' }))
    expect(canvas.updateStyles).toHaveBeenLastCalledWith('comp_1', { textDecoration: 'underline' })
    unmount()

    document.body.innerHTML = '<p id="p" style="text-align:center">Text</p>'
    const onHtmlChange = vi.fn()
    const htmlAdapter = createHtmlInspectorAdapter({
      info: describeElement(document.getElementById('p')),
      onChange: onHtmlChange,
    })
    wrap(<TypographyFields adapter={htmlAdapter} />)
    fireEvent.click(screen.getByRole('button', { name: 'Align text right' }))
    expect(onHtmlChange).toHaveBeenLastCalledWith({ textAlign: 'right' })

    fireEvent.click(screen.getByRole('checkbox', { name: 'Italic' }))
    expect(onHtmlChange).toHaveBeenLastCalledWith({ italic: true })
  })
})
