import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import PropertiesPanel from './PropertiesPanel.jsx'
import Canvas from './Canvas.jsx'
import { useEditorStore } from '../../store/editorStore.js'

const state = () => useEditorStore.getState()

afterEach(() => vi.unstubAllGlobals())

function renderEditor(viewport) {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  state().loadSchema({ pages: [{
    id: 'home', name: 'Home', canvasWidth: 1000, mobileWidth: 320, mobileManual: true,
    components: [{
      id: 'parent', type: 'container', props: {}, styles: {},
      layout: { x: 0, y: 0, w: 700, h: 300 },
      mobileLayout: { x: 0, y: 0, w: 320, h: 300 },
      children: [{
        id: 'child', type: 'text', props: { text: 'Child' }, styles: {},
        layout: { x: 100, y: 40, w: 120, h: 60 },
        mobileLayout: { x: 16, y: 16, w: 200, h: 50 },
      }],
    }],
  }] })
  state().setViewport(viewport)
  return render(
    <UiThemeProvider><LanguageProvider><DndContext>
      <Canvas zoom={100} /><PropertiesPanel />
    </DndContext></LanguageProvider></UiThemeProvider>,
  )
}

describe('sizing a selection containing a parent and its child', () => {
  for (const viewport of ['pc', 'mobile']) {
    it(`applies the panel width to both selected items on ${viewport}`, () => {
      const view = renderEditor(viewport)
      const child = view.container.querySelector('[data-cid="child"]')
      const parent = view.container.querySelector('[data-cid="parent"]')

      // Select the nested item, then add its parent through the real canvas
      // Shift-click path. No store selection or layout action is mocked.
      fireEvent.pointerDown(child, { button: 0, clientX: 110, clientY: 60 })
      fireEvent(window, new MouseEvent('pointerup', { bubbles: true }))
      fireEvent.pointerDown(parent, { button: 0, shiftKey: true, clientX: 5, clientY: 5 })
      expect(state().selectedIds).toEqual(['child', 'parent'])
      expect(screen.getByText('2 items selected')).toBeInTheDocument()

      fireEvent.change(screen.getByRole('spinbutton', { name: 'Width', exact: true }), { target: { value: '100' } })

      const result = state().schema.pages[0].components[0]
      expect(viewport === 'mobile' ? result.mobileLayout.w : result.layout.w).toBe(100)
      expect(result.children[0].layout.w).toBe(100)
    })
  }
})

function renderFlatSelection(types) {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  state().loadSchema({ pages: [{
    id: 'home', name: 'Home', mobileManual: true,
    components: types.map((type, index) => ({
      id: `item-${index}`, type,
      props: type === 'html' ? { code: '<p>HTML selection item</p>' } : { text: 'Native selection item' },
      styles: { fontSize: '44px' },
      layout: { x: 20, y: 40 + index * 120, w: 300, h: 60 },
    })),
  }] })
  state().setViewport('pc')
  state().selectMany(types.map((_type, index) => `item-${index}`))
  return render(
    <UiThemeProvider><LanguageProvider><DndContext>
      <Canvas zoom={100} /><PropertiesPanel />
    </DndContext></LanguageProvider></UiThemeProvider>,
  )
}

describe('batch sizing follows the same content-fit policy as a single resize', () => {
  it('fits both native items to their hand-sized boxes', () => {
    const view = renderFlatSelection(['text', 'text'])

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Width', exact: true }), { target: { value: '100' } })

    const components = state().schema.pages[0].components
    expect(components.map((component) => component.layout.w)).toEqual([100, 100])
    expect.soft(components.map((component) => component.props.fit)).toEqual(['box', 'box'])
    expect(view.container.querySelectorAll('[data-pwb-fit]')).toHaveLength(2)
  })

  it('keeps the selected HTML box manual and enables fitting after the panel sizes it', () => {
    renderFlatSelection(['html', 'text'])

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Width', exact: true }), { target: { value: '100' } })

    const embed = state().schema.pages[0].components[0]
    expect(embed.layout.w).toBe(100)
    expect.soft(embed.props._boxManual).toBe(true)
    expect(embed.props.fit).toBe('box')
  })
})
