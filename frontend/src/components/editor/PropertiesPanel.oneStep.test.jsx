// One click in the panel is one undo step.
//
// Removing a tab changes three things (the tab list, the blocks that were in
// it, which tab is showing), and each was written as an edit of its own: it
// took three Ctrl+Z to get the tab back, and after the second one the blocks
// belonged to a tab that did not exist yet and were nowhere on the canvas.
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import PropertiesPanel from './PropertiesPanel.jsx'
import { useEditorStore } from '../../store/editorStore.js'

const s = () => useEditorStore.getState()
const tabsBlock = () => s().schema.pages[0].components[0]

function renderPanel() {
  return render(
    <UiThemeProvider>
      <LanguageProvider>
        <PropertiesPanel />
      </LanguageProvider>
    </UiThemeProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  s().loadSchema({
    theme: {},
    pages: [{
      id: 'p1',
      name: 'Home',
      components: [{
        id: 'tabs',
        type: 'tabs',
        props: { tabs: [{ id: 't1', label: 'One' }, { id: 't2', label: 'Two' }], activeId: 't2' },
        styles: {},
        layout: { x: 20, y: 20, w: 600, h: 260 },
        children: [
          { id: 'kid', type: 'text', tabId: 't2', props: { text: 'In the second tab' }, styles: {}, layout: { x: 10, y: 10, w: 200, h: 40 } },
        ],
      }],
    }],
  })
  s().selectComponent('tabs')
})

describe('one click in the panel is one undo step', () => {
  it('removing a tab comes back whole with a single Undo', () => {
    renderPanel()
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[1])
    expect(tabsBlock().props.tabs.map((tab) => tab.id)).toEqual(['t1'])
    expect(tabsBlock().children[0].tabId).toBe('t1')
    expect(tabsBlock().props.activeId).toBe('t1')

    s().undo()

    expect(tabsBlock().props.tabs.map((tab) => tab.id)).toEqual(['t1', 't2'])
    expect(tabsBlock().children[0].tabId).toBe('t2')
    expect(tabsBlock().props.activeId).toBe('t2')
    expect(s().past).toHaveLength(0)
  })

  it('adding a tab goes away with a single Undo', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: '+ Add tab' }))
    expect(tabsBlock().props.tabs).toHaveLength(3)
    expect(tabsBlock().props.activeId).toBe('t3')

    s().undo()

    expect(tabsBlock().props.tabs).toHaveLength(2)
    expect(tabsBlock().props.activeId).toBe('t2')
  })
})

describe('a theme preset is one undo step', () => {
  // Picking a preset sets the theme and restyles the design with it. As two
  // steps, the first Undo put the old colours back on the blocks while the
  // panel still showed the preset as the theme in use.
  it('takes the colours and the theme back together', () => {
    s().loadSchema({
      theme: {},
      pages: [{
        id: 'p1',
        name: 'Home',
        components: [{ id: 'btn', type: 'button', props: { text: 'Go' }, styles: { backgroundColor: '#4f46e5' }, layout: { x: 20, y: 20, w: 160, h: 48 } }],
      }],
    })
    const before = { theme: s().schema.theme, styles: s().schema.pages[0].components[0].styles }
    localStorage.setItem('pwb_page_tab', 'theme')
    const { container } = renderPanel()
    // The last one: a dark preset, so it is not the theme already in use.
    const preset = [...container.querySelectorAll('button[title]')]
      .filter((button) => /^Use the ".+" theme and apply it to the whole site$/.test(button.title))
      .pop()
    expect(preset).toBeTruthy()

    fireEvent.click(preset)
    expect(s().schema.theme).not.toEqual(before.theme)

    s().undo()

    expect(s().schema.theme).toEqual(before.theme)
    expect(s().schema.pages[0].components[0].styles).toEqual(before.styles)
    expect(s().past).toHaveLength(0)
  })
})
