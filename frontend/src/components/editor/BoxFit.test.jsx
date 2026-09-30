// A block sized by hand fits its box: resizing turns it on, the Layout tab
// turns it off, and the canvas draws the fitted block in a box and a root.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import PropertiesPanel from './PropertiesPanel.jsx'
import { RenderComponent } from '../renderer/Renderer.jsx'
import { useEditorStore } from '../../store/editorStore.js'

vi.mock('../../api/profile.js', () => ({
  getSavedThemes: vi.fn(() => new Promise(() => {})),
  putSavedThemes: vi.fn(),
}))

const heading = { id: 'h', type: 'heading', props: { text: 'Hello', level: 'h2' }, styles: {}, layout: { x: 0, y: 0, w: 300, h: 60 } }
const navbar = { id: 'n', type: 'navbar', props: { brand: 'B', links: [] }, styles: {}, layout: { x: 0, y: 100, w: 1000, h: 64 } }
const embed = { id: 'e', type: 'html', props: { code: '<p>x</p>' }, styles: {}, layout: { x: 0, y: 200, w: 300, h: 80 } }

function load(components = [heading, navbar, embed]) {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  const store = useEditorStore.getState()
  store.loadSchema({ theme: {}, pages: [{ id: 'home', name: 'Home', components: structuredClone(components) }] })
  store.setViewport('pc')
}
const props = (id) => useEditorStore.getState().schema.pages[0].components.find((c) => c.id === id).props

beforeEach(() => load())

describe('resizing', () => {
  it('turns fitting on for a block whose size changed', () => {
    act(() => useEditorStore.getState().setLayout('h', { w: 420 }))
    act(() => useEditorStore.getState().setLayout('e', { h: 160 }))
    expect([props('h').fit, props('e').fit]).toEqual(['box', 'box'])
  })

  it('leaves it off for a move, a band that lays itself out, and a block told not to', () => {
    act(() => useEditorStore.getState().setLayout('h', { x: 40, y: 20, w: 300, h: 60 }))
    act(() => useEditorStore.getState().setLayout('n', { h: 90 }))
    expect([props('h').fit, props('n').fit]).toEqual([undefined, undefined])
    load([{ ...heading, props: { ...heading.props, fit: 'off' } }])
    act(() => useEditorStore.getState().setLayout('h', { w: 500 }))
    expect(props('h').fit).toBe('off')
  })
})

describe('the canvas', () => {
  const drawn = (component, extra = {}) => render(<RenderComponent component={component} fit {...extra} />).container

  it('draws a fitted block in a box and a root', () => {
    const box = drawn({ ...heading, props: { ...heading.props, fit: 'box' } }).querySelector('[data-pwb-fit="reflow"]')
    expect(box.querySelector(':scope > [data-pwb-fit-root] h2').textContent).toBe('Hello')
  })

  it('draws the rest as before, and nothing fits in flow', () => {
    expect(drawn(heading).querySelector('[data-pwb-fit]')).toBeNull()
    expect(drawn({ ...heading, props: { ...heading.props, fit: 'box' } }, { flowMode: true }).querySelector('[data-pwb-fit]')).toBeNull()
  })
})

describe('the Layout tab', () => {
  it('turns fitting off and on again', async () => {
    load([{ ...heading, props: { ...heading.props, fit: 'box' } }])
    act(() => useEditorStore.getState().selectComponent('h'))
    render(<UiThemeProvider><LanguageProvider><PropertiesPanel /></LanguageProvider></UiThemeProvider>)
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Layout' }))
    const toggle = screen.getByRole('checkbox', { name: /Content fits the box/ })
    expect(toggle).toBeChecked()
    await user.click(toggle)
    expect(props('h').fit).toBe('off')
    await user.click(toggle)
    expect(props('h').fit).toBe('box')
  })
})
