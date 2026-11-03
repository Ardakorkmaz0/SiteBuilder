// What the site opens in: the owner's choice, shown for a site that never made
// one, and written as the store keeps it.
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import ColorModePanel from './ColorModePanel.jsx'
import { useEditorStore } from '../../store/editorStore.js'

const LIGHT = { backgroundColor: '#ffffff' }
const DARK = { backgroundColor: '#0b0c0f' }

function open({ theme = LIGHT, colorMode, pages = [{ id: 'home', name: 'Home', components: [] }] } = {}) {
  localStorage.setItem('pwb_language', 'en')
  useEditorStore.getState().loadSchema({ theme, ...(colorMode ? { colorMode } : {}), pages })
  render(
    <UiThemeProvider>
      <LanguageProvider>
        <ColorModePanel />
      </LanguageProvider>
    </UiThemeProvider>,
  )
}

const choice = (name) => screen.getByRole('radio', { name })
const saved = () => useEditorStore.getState().schema.colorMode

beforeEach(() => localStorage.clear())

describe('the site opens in', () => {
  it('shows the designed palette for a site that never chose, and writes nothing', () => {
    open()
    expect(choice('Light')).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(choice('Light'))
    expect(saved()).toBeUndefined()
    expect(useEditorStore.getState().dirty).toBe(false)
  })

  it('shows a site designed dark as dark', () => {
    open({ theme: DARK })
    expect(choice('Dark')).toHaveAttribute('aria-checked', 'true')
  })

  it('shows the old device box as the device', () => {
    open({ colorMode: { theme: {}, followDevice: true } })
    expect(choice('Device')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Each visitor gets the setting of their own device.')).toBeInTheDocument()
  })

  it('writes the choice and says when visitors see the other colors first', () => {
    open()
    fireEvent.click(choice('Dark'))
    expect(saved()).toEqual({ theme: {}, followDevice: false, start: 'dark' })
    expect(choice('Dark')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Visitors see the colors below first; the editor keeps showing the colors you design in.')).toBeInTheDocument()

    fireEvent.click(choice('Device'))
    expect(saved()).toEqual({ theme: {}, followDevice: true, start: 'system' })
    fireEvent.click(choice('Light'))
    expect(saved()).toEqual({ theme: {}, followDevice: false, start: 'light' })
  })

  it('keeps the colors the owner set, and the choice when a color changes', () => {
    open({ colorMode: { theme: { backgroundColor: '#000000' }, followDevice: false } })
    fireEvent.click(choice('Dark'))
    expect(saved().theme).toEqual({ backgroundColor: '#000000' })
    useEditorStore.getState().updateColorMode({ theme: { textColor: '#eeeeee' } })
    expect(saved()).toEqual({ theme: { backgroundColor: '#000000', textColor: '#eeeeee' }, followDevice: false, start: 'dark' })
  })

  it('moves and chooses with the arrow keys', async () => {
    const user = userEvent.setup()
    open()
    choice('Light').focus()
    await user.keyboard('{ArrowRight}')
    expect(choice('Dark')).toHaveFocus()
    expect(choice('Dark')).toHaveAttribute('aria-checked', 'true')
    expect(saved().start).toBe('dark')
  })

  it('is one Tab stop, at the choice', async () => {
    const user = userEvent.setup()
    open()
    choice('Light').focus()
    await user.tab()
    expect(screen.getByRole('radiogroup', { name: 'The site opens in' })).not.toContainElement(document.activeElement)
    await user.tab({ shift: true })
    expect(choice('Light')).toHaveFocus()
  })

  it('takes the choice back with undo', () => {
    open()
    fireEvent.click(choice('Dark'))
    useEditorStore.getState().undo()
    expect(saved()).toBeUndefined()
  })
})

describe('adding the switch to the pages', () => {
  const page = (id, components = []) => ({ id, name: id, components })
  const aSwitch = { id: 'sw', type: 'themeToggle', props: {}, styles: {}, layout: { x: 0, y: 0, w: 44, h: 44 } }
  const switches = (id) => useEditorStore.getState().schema.pages.find((p) => p.id === id).components.filter((c) => c.type === 'themeToggle')

  it('offers nothing beyond this page on a site of one page', () => {
    open()
    expect(screen.getByRole('button', { name: 'Add a theme switch to this page' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Add one to/ })).not.toBeInTheDocument()
  })

  it('adds one to every canvas page as one step, leaving the page on screen and the selection', () => {
    const bar = { id: 'bar', type: 'navbar', props: {}, styles: {}, layout: { x: 0, y: 0, w: 1200, h: 64 } }
    const heading = { id: 'h', type: 'heading', props: {}, styles: {}, layout: { x: 40, y: 120, w: 300, h: 60 } }
    open({ pages: [page('home', [heading, bar]), page('about'), { id: 'doc', name: 'doc', mode: 'html', html: '<p>Hi</p>', components: [] }] })
    useEditorStore.getState().selectComponent('bar')
    const before = useEditorStore.getState().currentPageId

    fireEvent.click(screen.getByRole('button', { name: 'Add one to 2 pages' }))

    expect(switches('home')).toHaveLength(1)
    expect(switches('about')).toHaveLength(1)
    expect(switches('doc')).toHaveLength(0)
    // Under the bar on the page that has one, and the corner on the other.
    expect(switches('home')[0].layout).toMatchObject({ y: 80, w: 44, h: 44 })
    expect(switches('about')[0].layout).toMatchObject({ y: 24, w: 44, h: 44 })
    // A page that does not flow keeps its order: the new block is on top of it.
    expect(useEditorStore.getState().schema.pages[0].components.map((c) => c.type)).toEqual(['heading', 'navbar', 'themeToggle'])
    const state = useEditorStore.getState()
    expect(state.currentPageId).toBe(before)
    expect(state.selectedIds).toEqual(['bar'])
    expect(state.dirty).toBe(true)

    state.undo()
    expect(switches('home')).toHaveLength(0)
    expect(switches('about')).toHaveLength(0)
  })

  it('puts it near the top of a page that flows, not at the end', () => {
    const block = (id, type) => ({ id, type, props: {}, styles: {}, layout: { x: 0, y: 0, w: 300, h: 60 } })
    const order = (id) => useEditorStore.getState().schema.pages.find((p) => p.id === id).components.map((c) => c.type)
    open({ pages: [
      { ...page('home', [block('n', 'navbar'), block('h', 'heading'), block('t', 'text')]), flowMode: true },
      { ...page('about', [block('h2', 'heading'), block('t2', 'text')]), flowMode: true },
    ] })
    fireEvent.click(screen.getByRole('button', { name: 'Add one to 2 pages' }))
    expect(order('home')).toEqual(['navbar', 'themeToggle', 'heading', 'text'])
    expect(order('about')).toEqual(['themeToggle', 'heading', 'text'])
    useEditorStore.getState().undo()
    expect(order('home')).toEqual(['navbar', 'heading', 'text'])
  })

  it('adds to this page in the same place, and selects it to be moved', () => {
    const block = { id: 'h', type: 'heading', props: {}, styles: {}, layout: { x: 0, y: 0, w: 300, h: 60 } }
    open({ pages: [{ ...page('home', [block]), flowMode: true }] })
    fireEvent.click(screen.getByRole('button', { name: 'Add a theme switch to this page' }))
    const state = useEditorStore.getState()
    const [first] = state.schema.pages[0].components
    expect(first.type).toBe('themeToggle')
    expect(state.selectedIds).toEqual([first.id])
  })

  it('names how many pages it can reach when HTML pages are left out, and says why', () => {
    open({ pages: [page('home'), page('about'), { id: 'doc', name: 'doc', mode: 'html', html: '<p>Hi</p>', components: [] }] })
    expect(screen.queryByRole('button', { name: 'Add one to every page' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add one to 2 pages' })).toBeInTheDocument()
    expect(screen.getByText('An HTML page gets its own from Components, under Theme switch.')).toBeInTheDocument()
  })

  it('says which pages are left, adds to those only, and points an HTML page to Components', () => {
    open({ pages: [page('home', [aSwitch]), page('about'), { id: 'doc', name: 'doc', mode: 'html', html: '<p>Hi</p>', components: [] }] })
    expect(screen.getByText('2 pages have no theme switch: they follow the choice, but visitors cannot change it there.')).toBeInTheDocument()
    expect(screen.getByText('An HTML page gets its own from Components, under Theme switch.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add one to 1 page' }))

    expect(switches('home')).toHaveLength(1)
    expect(switches('about')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /^Add one to/ })).not.toBeInTheDocument()
  })

  it('counts one page in the singular', () => {
    open({ pages: [page('home', [aSwitch]), page('about')] })
    expect(screen.getByText('1 page has no theme switch: it follows the choice, but visitors cannot change it there.')).toBeInTheDocument()
  })

  it('says nothing once every page has one', () => {
    open({ pages: [page('home', [aSwitch])] })
    expect(screen.queryByText(/have no theme switch/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add a theme switch to this page' })).not.toBeInTheDocument()
  })
})
