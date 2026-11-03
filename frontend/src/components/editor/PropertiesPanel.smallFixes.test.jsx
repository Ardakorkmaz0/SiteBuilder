// Two small things in the Properties panel that did not do what they said.
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import PropertiesPanel from './PropertiesPanel.jsx'
import { useEditorStore } from '../../store/editorStore.js'

const s = () => useEditorStore.getState()

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
    pages: [
      { id: 'p1', name: 'Home', components: [{ id: 'h1', type: 'heading', props: { text: 'Hello', animIn: 'fade' }, styles: {}, layout: { x: 20, y: 20, w: 300, h: 60 } }] },
      { id: 'p2', name: 'Canvas page', components: [] },
      { id: 'p3', name: 'Document page', mode: 'html', components: [] },
    ],
  })
  s().selectComponent('h1')
})

describe('"Copy page…"', () => {
  // An HTML page is its document; a component copied "onto" it went into the
  // canvas design hidden behind that document and was never seen again.
  it('offers the pages that have a canvas, not the HTML pages', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))

    const options = [...screen.getByTitle('Copy this component onto another page').querySelectorAll('option')]
      .map((option) => option.textContent)

    expect(options).toContain('Canvas page')
    expect(options).not.toContain('Document page')
  })
})

describe('the entrance delay', () => {
  // A field of milliseconds that showed "px" beside the number.
  it('is a plain number of milliseconds', () => {
    localStorage.setItem('pwb_props_tab', 'motion')
    renderPanel()

    const field = screen.getByLabelText('Delay (ms)')
    expect(field.parentElement.textContent).not.toMatch(/px/)

    fireEvent.change(field, { target: { value: '250' } })
    expect(s().schema.pages[0].components[0].props.animDelay).toBe(250)
  })
})

describe('the theme switch\'s words', () => {
  it('ask for the names of the three choices only on the switch that has them', () => {
    s().loadSchema({
      theme: {},
      pages: [{ id: 'p1', name: 'Home', components: [{ id: 't1', type: 'themeToggle', props: { label: 'Theme', showLabel: '' }, styles: {}, layout: { x: 0, y: 0, w: 44, h: 44 } }] }],
    })
    s().selectComponent('t1')
    renderPanel()
    expect(screen.queryByLabelText('Name of device')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Visitors choose'), { target: { value: 'three' } })

    expect(s().schema.pages[0].components[0].props.states).toBe('three')
    expect(screen.getByLabelText('Name of device')).toBeInTheDocument()
  })
})
