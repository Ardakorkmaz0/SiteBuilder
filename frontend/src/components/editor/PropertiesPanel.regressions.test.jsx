import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import PropertiesPanel from './PropertiesPanel.jsx'
import { useEditorStore } from '../../store/editorStore.js'

const state = () => useEditorStore.getState()

function showPanel(props = {}) {
  return render(
    <UiThemeProvider>
      <LanguageProvider>
        <PropertiesPanel {...props} />
      </LanguageProvider>
    </UiThemeProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('PropertiesPanel regressions', () => {
  it('keeps MixedNumber focused and preserves typed digits across multi-select updates', () => {
    state().loadSchema({
      pages: [{
        id: 'home',
        name: 'Home',
        components: [
          { id: 'b1', type: 'button', props: { label: 'One' }, styles: {}, layout: { x: 10, y: 20, w: 120, h: 40 } },
          { id: 'b2', type: 'button', props: { label: 'Two' }, styles: {}, layout: { x: 10, y: 80, w: 200, h: 40 } },
        ],
      }],
    })
    state().setViewport('pc')
    state().selectMany(['b1', 'b2'])
    showPanel()

    const widthInput = screen.getByRole('spinbutton', { name: 'Width', exact: true })
    widthInput.focus()
    expect(document.activeElement).toBe(widthInput)
    fireEvent.change(widthInput, { target: { value: '150' } })
    expect(document.activeElement).toBe(widthInput)
    expect(widthInput.value).toBe('150')
  })

  it('hides X/Y and edits shared layout (all screens) for children of auto-layout containers on mobile flow pages', () => {
    state().loadSchema({
      pages: [{
        id: 'home',
        name: 'Home',
        flowMode: true,
        components: [{
          id: 'flex_box',
          type: 'container',
          props: { flow: 'column' },
          styles: {},
          layout: { x: 0, y: 0, w: 800, h: 200 },
          children: [{
            id: 'inner_text',
            type: 'text',
            props: { text: 'Flex item' },
            styles: {},
            layout: { x: 20, y: 30, w: 240, h: 60 },
          }],
        }],
      }],
    })
    state().setViewport('mobile')
    state().selectComponent('inner_text')
    showPanel()

    fireEvent.click(screen.getByRole('tab', { name: 'Layout' }))
    expect(screen.getAllByText(/all screens/).length).toBeGreaterThan(0)
    expect(screen.queryByRole('spinbutton', { name: 'X', exact: true })).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton', { name: 'Y', exact: true })).not.toBeInTheDocument()
    const beforeMobileW = state().schema.pages[0].components[0].children[0].mobileLayout?.w
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Max width', exact: true }), { target: { value: '320' } })
    const saved = state().schema.pages[0].components[0].children[0]
    expect(saved.layout.w).toBe(320)
    expect(saved.mobileLayout?.w).toBe(beforeMobileW)
  })

  it('supports fontWeight 700, Soft shadow option, shorthand border control, and Same as PC mobile style clearing', () => {
    state().loadSchema({
      pages: [{
        id: 'home',
        name: 'Home',
        flowMode: false,
        components: [
          {
            id: 'card_btn',
            type: 'container',
            props: {},
            styles: {
              border: '1px solid #cbd5e1',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            },
            stylesMobile: {
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            },
            layout: { x: 0, y: 0, w: 300, h: 200 },
            children: [],
          },
          {
            id: 'txt_bold',
            type: 'text',
            props: { text: 'Bold text' },
            styles: { fontWeight: '700' },
            layout: { x: 0, y: 220, w: 200, h: 40 },
          },
        ],
      }],
    })
    state().setViewport('mobile')
    state().selectComponent('card_btn')
    showPanel()

    fireEvent.click(screen.getByRole('tab', { name: 'Design' }))
    fireEvent.click(screen.getByRole('button', { name: /Border/ }))
    expect(screen.getByRole('textbox', { name: 'Border', exact: true })).toHaveValue('1px solid #cbd5e1')

    fireEvent.click(screen.getByRole('button', { name: /Effects/ }))
    const shadowSelect = screen.getByRole('combobox', { name: 'Shadow', exact: true })
    expect(within(shadowSelect).getByRole('option', { name: 'Soft' })).toBeInTheDocument()
    expect(within(shadowSelect).getByRole('option', { name: 'Same as PC' })).toBeInTheDocument()

    fireEvent.change(shadowSelect, { target: { value: '' } })
    const updated = state().schema.pages[0].components[0]
    expect(updated.stylesMobile?.boxShadow).toBeUndefined()

    act(() => state().selectComponent('txt_bold'))
    const weightSelect = screen.getByRole('combobox', { name: 'Font weight', exact: true })
    expect(weightSelect.value).toBe('700')
    expect(weightSelect.querySelector('option[value="700"]')).not.toBeNull()
  })

  it('passes component subject into FieldPartsEditor so color typing does not leak across fields', () => {
    state().loadSchema({
      pages: [{
        id: 'home',
        name: 'Home',
        components: [
          { id: 'inp1', type: 'input', props: { inputType: 'text', label: 'Email', fieldBackgroundColor: '#112233' }, styles: {}, layout: { x: 0, y: 0, w: 300, h: 60 } },
          { id: 'inp2', type: 'input', props: { inputType: 'text', label: 'Name', fieldBackgroundColor: '#445566' }, styles: {}, layout: { x: 0, y: 80, w: 300, h: 60 } },
        ],
      }],
    })
    state().setViewport('pc')
    state().selectComponent('inp1')
    showPanel()

    fireEvent.click(screen.getByRole('tab', { name: 'Content' }))
    const bgField = () => screen.getByRole('textbox', { name: 'Background', exact: true })
    fireEvent.focus(bgField())
    fireEvent.change(bgField(), { target: { value: '#abc' } })
    expect(bgField()).toHaveValue('#abc')

    act(() => state().selectComponent('inp2'))
    expect(bgField()).toHaveValue('#445566')
  })

  it('reads and updates seoImage via htmlPageSettings on HTML pages', () => {
    const onHtmlPageSettings = vi.fn()
    state().loadSchema({
      pages: [{
        id: 'home',
        name: 'Home',
        mode: 'html',
        html: '<html><head></head><body><h1>Hi</h1></body></html>',
        components: [],
      }],
    })
    showPanel({
      htmlMode: true,
      htmlPageSettings: { language: 'en', seoImage: 'https://example.com/old.png' },
      onHtmlPageSettings,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Paste URL' }))
    const urlInput = screen.getByDisplayValue('https://example.com/old.png')
    fireEvent.change(urlInput, { target: { value: 'https://example.com/new.png' } })
    expect(onHtmlPageSettings).toHaveBeenCalledWith({ seoImage: 'https://example.com/new.png' })
  })
})
