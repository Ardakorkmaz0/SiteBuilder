import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import PropertiesPanel from './PropertiesPanel.jsx'
import { useEditorStore } from '../../store/editorStore.js'

const state = () => useEditorStore.getState()
const currentPage = () => state().schema.pages[0]
const box = (id = 'child') => ({
  id, type: 'text', props: { text: id }, styles: {},
  layout: { x: 100, y: 40, w: 120, h: 60 },
  mobileLayout: { x: 16, y: 16, w: 200, h: 50 },
})
const parent = (type, child = box()) => ({
  id: `parent-${type}`, type,
  props: type === 'tabs' ? { tabs: [{ id: 'one', label: 'One' }], activeId: 'one' } : {},
  styles: {}, layout: { x: 0, y: 0, w: 700, h: 300 },
  mobileLayout: { x: 0, y: 0, w: 320, h: 300 },
  children: [{ ...child, ...(type === 'tabs' ? { tabId: 'one' } : {}) }],
})

function renderPanel(components, { flowMode = false, selected = ['child'] } = {}) {
  state().loadSchema({ pages: [{
    id: 'home', name: 'Home', mobileWidth: 320, mobileManual: true, flowMode, components,
  }] })
  state().setViewport('mobile')
  state().selectMany(selected)
  return render(<UiThemeProvider><LanguageProvider><PropertiesPanel /></LanguageProvider></UiThemeProvider>)
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_props_tab', 'layout')
})

describe('Properties panel coordinates on a phone', () => {
  for (const type of ['container', 'tabs']) {
    it(`shows and scales the shared ${type} child instead of its stale phone geometry`, () => {
      renderPanel([parent(type)])

      expect.soft(screen.getByRole('spinbutton', { name: 'Width', exact: true })).toHaveValue(120)
      expect.soft(screen.getByRole('spinbutton', { name: 'Height', exact: true })).toHaveValue(60)
      fireEvent.click(screen.getByRole('button', { name: '10% larger', exact: true }))

      const child = currentPage().components[0].children[0]
      expect(child.layout).toEqual({ x: 100, y: 40, w: 132, h: 66 })
      expect(child.mobileLayout).toEqual({ x: 16, y: 16, w: 200, h: 50 })
      expect(screen.getByRole('spinbutton', { name: 'Width', exact: true })).toHaveValue(132)
    })
  }

  it('keeps a root component on the phone layout of a free page', () => {
    renderPanel([box()])
    expect(screen.getByRole('spinbutton', { name: 'Width', exact: true })).toHaveValue(200)
    fireEvent.click(screen.getByRole('button', { name: '10% larger', exact: true }))
    expect(currentPage().components[0].mobileLayout).toEqual({ x: 16, y: 16, w: 220, h: 55 })
    expect(currentPage().components[0].layout).toEqual({ x: 100, y: 40, w: 120, h: 60 })
  })

  it('keeps a root component on its shared layout on a flow page', () => {
    renderPanel([box()], { flowMode: true })
    expect(screen.getByRole('spinbutton', { name: 'Max width', exact: true })).toHaveValue(120)
    fireEvent.click(screen.getByRole('button', { name: '10% larger', exact: true }))
    expect(currentPage().components[0].layout).toEqual({ x: 100, y: 40, w: 132, h: 66 })
    expect(currentPage().mobileManual).toBe(false)
  })

  for (const flowMode of [false, true]) {
    it(`keeps a region child on its independent phone layout on a ${flowMode ? 'flow' : 'free'} page`, () => {
      renderPanel([parent('region')], { flowMode })
      // Flow pages derive the initial phone column at 320px with 16px sides.
      expect(screen.getByRole('spinbutton', { name: flowMode ? 'Max width' : 'Width', exact: true })).toHaveValue(flowMode ? 288 : 200)
      fireEvent.click(screen.getByRole('button', { name: '10% larger', exact: true }))
      const child = currentPage().components[0].children[0]
      if (flowMode) expect(child.mobileLayout.w).toBe(317)
      else expect(child.mobileLayout).toEqual({ x: 16, y: 16, w: 220, h: 55 })
      expect(child.layout).toEqual({ x: 100, y: 40, w: 120, h: 60 })
    })
  }

  it('reads each selected parent coordinate space before scaling a mixed selection', () => {
    renderPanel([parent('container', box('shared')), parent('region', box('phone'))], { selected: ['shared', 'phone'] })
    expect.soft(screen.getByRole('spinbutton', { name: 'Width', exact: true })).toHaveValue(null)
    fireEvent.click(screen.getByRole('button', { name: '10% larger', exact: true }))

    const shared = currentPage().components[0].children[0]
    const phone = currentPage().components[1].children[0]
    expect(shared.layout).toEqual({ x: 100, y: 40, w: 132, h: 66 })
    expect(shared.mobileLayout).toEqual({ x: 16, y: 16, w: 200, h: 50 })
    expect(phone.mobileLayout).toEqual({ x: 16, y: 16, w: 220, h: 55 })
    expect(phone.layout).toEqual({ x: 100, y: 40, w: 120, h: 60 })
  })
})
