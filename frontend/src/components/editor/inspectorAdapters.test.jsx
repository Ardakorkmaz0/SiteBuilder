import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { describeElement } from '../../utils/htmlElementEdit.js'
import { registry } from '../registry.jsx'
import BorderFields from './BorderFields.jsx'
import ColorFields from './ColorFields.jsx'
import EffectsFields from './EffectsFields.jsx'
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
    extendedMode: overrides.extendedMode !== false,
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
    const pcView = wrap(<SpacingFields adapter={adapter} />)

    expect(screen.getByRole('spinbutton', { name: 'Padding', exact: true })).toHaveValue(24)
    const top = screen.getByRole('spinbutton', { name: 'Padding top', exact: true })
    expect(top).toHaveValue(24)

    fireEvent.change(top, { target: { value: '40' } })
    expect(updateStyles).toHaveBeenLastCalledWith('comp_1', { padding: '40px 24px 24px 24px' })
    pcView.unmount()

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
    view.unmount()

    // Per-side mobile override clear restores the PC side and drops stylesMobile.padding when all sides match PC.
    const mobileSide = makeCanvasAdapter('card', {
      viewport: 'mobile',
      component: { styles: { padding: '24px' }, stylesMobile: { padding: '8px 24px 24px 24px' } },
    })
    const sideView = wrap(<SpacingFields adapter={mobileSide.adapter} />)
    const mobileTop = sideView.getByRole('spinbutton', { name: 'Padding top', exact: true })
    expect(mobileTop).toHaveValue(8)
    fireEvent.change(mobileTop, { target: { value: '' } })
    expect(mobileSide.updateStyles).toHaveBeenLastCalledWith('comp_1', { padding: '' })
    expect(mobileSide.component.stylesMobile).toBeUndefined()

    // Margin top / Margin bottom work identically on canvas via styles.margin shorthand.
    const marginTop = sideView.getByRole('spinbutton', { name: 'Margin top', exact: true })
    fireEvent.change(marginTop, { target: { value: '16' } })
    expect(mobileSide.updateStyles).toHaveBeenLastCalledWith('comp_1', { margin: '16px 0px 0px 0px' })
    sideView.unmount()
  })

  // Padding and margin as the box they make (ChatGPT's design, 2026-11-26):
  // the margin outside, the padding inside it, each number at its side.
  const boxFields = () => within(screen.getByRole('group', { name: 'Box model' }))
    .getAllByRole('spinbutton')
    .map((field) => [field.getAttribute('aria-label'), field.value])

  it('draws padding and margin as a box with each number at its side, on a canvas page and an HTML page', () => {
    const canvas = makeCanvasAdapter('card', {
      component: { styles: { padding: '24px 16px', margin: '12px 0px 8px 0px' } },
    })
    const canvasView = wrap(<SpacingFields adapter={canvas.adapter} />)
    expect(boxFields()).toEqual([
      ['Margin top', '12'], ['Padding top', '24'], ['Padding left', '16'],
      ['Padding right', '16'], ['Padding bottom', '24'], ['Margin bottom', '8'],
    ])
    // The sides differ: the all-sides field says so instead of a shorthand.
    const all = screen.getByRole('spinbutton', { name: 'Padding', exact: true })
    expect(all).toHaveValue(null)
    expect(all).toHaveAttribute('placeholder', 'Sides differ')
    expect(all).toHaveAccessibleDescription('All sides')
    expect(screen.getByText('Values in pixels.')).toBeInTheDocument()
    fireEvent.change(all, { target: { value: '20' } })
    expect(canvas.updateStyles).toHaveBeenLastCalledWith('comp_1', { padding: '20px' })
    canvasView.unmount()

    document.body.innerHTML = '<div id="box" style="padding: 24px 16px; margin: 12px 0 8px">Box</div>'
    const onHtmlChange = vi.fn()
    wrap(<SpacingFields adapter={createHtmlInspectorAdapter({ info: describeElement(document.getElementById('box')), onChange: onHtmlChange })} />)
    expect(boxFields()).toEqual([
      ['Margin top', '12'], ['Padding top', '24'], ['Padding left', '16'],
      ['Padding right', '16'], ['Padding bottom', '24'], ['Margin bottom', '8'],
    ])
    // An HTML element reports its top padding as its padding: still "differ".
    expect(screen.getByRole('spinbutton', { name: 'Padding', exact: true })).toHaveAttribute('placeholder', 'Sides differ')
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Padding right', exact: true }), { target: { value: '30' } })
    expect(onHtmlChange).toHaveBeenLastCalledWith({ paddingRight: 30 })
  })

  it('shows a side in its own unit, and stops saying the values are pixels', () => {
    const { adapter, updateStyles } = makeCanvasAdapter('card', { component: { styles: { padding: '1em 24px' } } })
    wrap(<SpacingFields adapter={adapter} />)
    const top = screen.getByRole('spinbutton', { name: 'Padding top', exact: true })
    expect(top).toHaveValue(1)
    expect(top.parentElement).toHaveTextContent('em')
    expect(screen.queryByText('Values in pixels.')).toBeNull()
    fireEvent.change(top, { target: { value: '2' } })
    expect(updateStyles).toHaveBeenLastCalledWith('comp_1', { padding: '2em 24px 1em 24px' })
    // Sides that agree show their value in the all-sides field.
    const even = makeCanvasAdapter('card', { component: { styles: { padding: '18px' } } })
    wrap(<SpacingFields adapter={even.adapter} />)
    const allFields = screen.getAllByRole('spinbutton', { name: 'Padding', exact: true })
    expect(allFields[allFields.length - 1]).toHaveValue(18)
    expect(allFields[allFields.length - 1]).not.toHaveAttribute('placeholder')
  })

  // A block centred with `margin: 0 auto` lost its centring when one side was
  // edited: the shorthand was not read, and every other side was written as 0.
  it('keeps auto side margins when the top or bottom margin is edited on canvas', () => {
    const { adapter, updateStyles } = makeCanvasAdapter('heading', {
      component: { styles: { margin: '0 auto' } },
    })
    wrap(<SpacingFields adapter={adapter} />)
    const marginTop = screen.getByRole('spinbutton', { name: 'Margin top', exact: true })
    expect(marginTop).toHaveValue(0)

    fireEvent.change(marginTop, { target: { value: '12' } })
    expect(updateStyles).toHaveBeenLastCalledWith('comp_1', { margin: '12px auto 0px auto' })

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Margin bottom', exact: true }), { target: { value: '8' } })
    expect(updateStyles).toHaveBeenLastCalledWith('comp_1', { margin: '12px auto 8px auto' })

    fireEvent.change(marginTop, { target: { value: '' } })
    expect(updateStyles).toHaveBeenLastCalledWith('comp_1', { margin: '0px auto 8px auto' })
  })

  // Border and Overflow were offered for every block under Advanced CSS. When
  // they moved into the Border and Effects groups, a block with no border or
  // effects of its own (a Spacer) lost them, outside Simple mode as well.
  it('offers Border and Overflow on a block with no border or effects of its own, outside Simple mode', () => {
    const { adapter, updateStyles } = makeCanvasAdapter('spacer')
    const view = wrap(<><BorderFields adapter={adapter} /><EffectsFields adapter={adapter} /></>)
    for (const group of ['Border', 'Effects']) {
      const header = screen.getByRole('button', { name: group, exact: true })
      if (header.getAttribute('aria-expanded') === 'false') fireEvent.click(header)
    }
    fireEvent.change(screen.getByRole('textbox', { name: 'Border', exact: true }), { target: { value: '1px solid #334155' } })
    expect(updateStyles).toHaveBeenLastCalledWith('comp_1', { border: '1px solid #334155' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Overflow', exact: true }), { target: { value: 'hidden' } })
    expect(updateStyles).toHaveBeenLastCalledWith('comp_1', { overflow: 'hidden' })
    view.unmount()

    const simple = makeCanvasAdapter('spacer', { extendedMode: false })
    wrap(<><BorderFields adapter={simple.adapter} /><EffectsFields adapter={simple.adapter} /></>)
    expect(screen.queryByRole('textbox', { name: 'Border', exact: true })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Overflow', exact: true })).toBeNull()
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
