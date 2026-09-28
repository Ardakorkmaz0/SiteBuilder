// A form field is edited part by part: the panel groups its settings by the
// part they change, and in the large view a click on a part (or its button in
// the row above) narrows the panel to that part.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import PropertiesPanel from './PropertiesPanel.jsx'
import ComponentSpotlight from './ComponentSpotlight.jsx'
import { useEditorStore } from '../../store/editorStore.js'

vi.mock('../../api/profile.js', () => ({
  getSavedThemes: vi.fn(() => new Promise(() => {})),
  putSavedThemes: vi.fn(),
}))

const field = (props) => ({
  id: 'f1',
  type: 'input',
  props: { label: 'Password', placeholder: 'Secret', inputType: 'password', ...props },
  styles: {},
  layout: { x: 40, y: 40, w: 320, h: 76 },
})

function load(props = {}) {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  const store = useEditorStore.getState()
  store.loadSchema({ theme: {}, pages: [{ id: 'home', name: 'Home', components: [field(props)] }] })
  store.setViewport('pc')
  store.selectComponent('f1')
}

const wrap = (node) => render(<UiThemeProvider><LanguageProvider>{node}</LanguageProvider></UiThemeProvider>)
const groups = () => screen.getAllByRole('button', { expanded: true }).concat(screen.queryAllByRole('button', { expanded: false }))
  .map((button) => button.textContent.trim())

beforeEach(() => load())

describe('the panel', () => {
  it('groups a password field\'s settings by part', () => {
    wrap(<PropertiesPanel />)
    expect(groups()).toEqual(expect.arrayContaining(['Label', 'Field', 'Placeholder', 'Show password button', 'Help text']))
  })

  it('follows the field type: a switch has a switch, not a field box', async () => {
    wrap(<PropertiesPanel />)
    await userEvent.setup().selectOptions(screen.getByLabelText('Field type'), 'switch')
    expect(useEditorStore.getState().schema.pages[0].components[0].props.inputType).toBe('switch')
    expect(groups()).toEqual(expect.arrayContaining(['Label', 'Switch', 'Help text']))
    expect(groups()).not.toContain('Field')
  })

  it('shows one part alone when one is picked, with the way back', async () => {
    wrap(<PropertiesPanel />)
    act(() => useEditorStore.getState().setSelectedPart('label'))
    const part = screen.getByRole('region', { name: 'Label' })
    expect(within(part).getByLabelText('Color')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Placeholder' })).toBeNull()

    await userEvent.setup().click(screen.getByRole('button', { name: 'All parts' }))
    expect(useEditorStore.getState().selectedPart).toBeNull()
  })

  it('shows the colour a field really has while nothing is set', () => {
    wrap(<PropertiesPanel />)
    act(() => useEditorStore.getState().setSelectedPart('field'))
    const part = screen.getByRole('region', { name: 'Field' })
    const background = within(part).getByText('Background').closest('label')
    expect(background.querySelector('input[type="color"]').value).toBe('#ffffff')
    expect(background.querySelector('input[type="text"]')).toHaveAttribute('placeholder', '#ffffff')
  })
})

describe('the large view', () => {
  it('picks the part that was clicked in the preview', () => {
    wrap(<ComponentSpotlight open componentId="f1" onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    const label = dialog.querySelector('[data-part-picker] [data-field-part="label"]')
    fireEvent.click(label)
    expect(useEditorStore.getState().selectedPart).toBe('label')
    expect(dialog.querySelector('[data-part-picker]').getAttribute('data-selected-part')).toBe('label')
  })

  it('draws the field in the site\'s colours, not the app\'s dark theme', () => {
    wrap(<ComponentSpotlight open componentId="f1" onClose={vi.fn()} />)
    expect(screen.getByRole('dialog').querySelector('[data-part-picker]')).toHaveClass('site-surface')
  })

  it('reaches every part from the row above, placeholder included', async () => {
    wrap(<ComponentSpotlight open componentId="f1" onClose={vi.fn()} />)
    const row = screen.getByRole('group', { name: 'Parts' })
    await userEvent.setup().click(within(row).getByRole('button', { name: 'Placeholder' }))
    expect(useEditorStore.getState().selectedPart).toBe('placeholder')
    expect(within(row).getByRole('button', { name: 'Placeholder' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('forgets the picked part when it closes', async () => {
    const onClose = vi.fn()
    wrap(<ComponentSpotlight open componentId="f1" onClose={onClose} />)
    act(() => useEditorStore.getState().setSelectedPart('help'))
    await userEvent.setup().keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
    expect(useEditorStore.getState().selectedPart).toBeNull()
  })
})
