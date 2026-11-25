// The device picker through the real editor page and store: one list for PC
// and Mobile, so a size from the other side switches the side first, and the
// size lands on the side it belongs to.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

let site
vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => structuredClone(site)),
  updateSite: vi.fn(async (id, payload) => ({ ...payload, id, revision: 2 })),
  patchSite: vi.fn(async () => ({})),
}))
vi.mock('../api/config.js', () => ({ getPublicConfig: vi.fn(async () => ({ ai: { enabled: false } })) }))
vi.mock('../api/profile.js', () => ({
  getSavedThemes: vi.fn(async () => ({ themes: [], limit: 20 })),
  putSavedThemes: vi.fn(async () => ({ themes: [], limit: 20 })),
}))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useAuthStore } from '../store/authStore.js'
import { useEditorStore } from '../store/editorStore.js'

const state = () => useEditorStore.getState()
const page = () => state().schema.pages[0]
const pickerButton = () => screen.getByRole('button', { name: /^Screen size:/ })
const openPicker = () => {
  fireEvent.click(pickerButton())
  return screen.getByRole('dialog', { name: 'Screen size' })
}
const phoneFrame = () => document.querySelector('[data-builder-phone-frame]')
const foldStates = (picker, name) => within(within(picker).getByRole('group', { name })).getAllByRole('button')

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_editor_tour_v1', '1')
  localStorage.setItem('pwb_canvas_zoom', '100')
  useAuthStore.setState({ user: { id: 1, username: 'owner', is_guest: false }, token: 'test-token' })
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000)
  site = {
    id: 1, title: 'Devices', slug: 'devices', published: false,
    category: 'other', tags: [], html: '', site_options: {}, revision: 1,
    schema: { theme: {}, pages: [{ id: 'home', name: 'Home', canvasWidth: 1000, components: [
      { id: 'first', type: 'text', props: { text: 'Existing' }, styles: {}, layout: { x: 0, y: 0, w: 200, h: 40 } },
    ] }] },
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function renderEditor() {
  render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
    <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
  </MemoryRouter></LanguageProvider></UiThemeProvider>)
}

describe('the device picker on a canvas page', () => {
  it('switches to Mobile for a phone-sized foldable screen, and back to PC for a wide one', async () => {
    renderEditor()
    await screen.findByRole('textbox', { name: 'Site title', exact: true })
    await waitFor(() => expect(page().components[0]?.id).toBe('first'))
    expect(state().viewport).toBe('pc')
    expect(pickerButton()).toHaveAccessibleName('Screen size: Standard 1000')

    // The Fold6's inner screen is 707 wide: the phone layout.
    fireEvent.click(foldStates(openPicker(), 'Galaxy Z Fold6')[1])
    expect(state().viewport).toBe('mobile')
    expect(page()).toMatchObject({ mobileWidth: 707, mobileFold: 823 })
    // The PC artboard was left as it was.
    expect(page().canvasWidth).toBe(1000)
    expect(localStorage.getItem('pwb_default_editor_viewport')).toBe('mobile')
    expect(pickerButton()).toHaveAccessibleName('Screen size: Galaxy Z Fold6 707×823 · Inner screen')

    // The Pixel 9 Pro Fold opens to 791: a desktop layout.
    fireEvent.click(foldStates(openPicker(), 'Pixel 9 Pro Fold')[1])
    expect(state().viewport).toBe('pc')
    expect(page()).toMatchObject({ canvasWidth: 791, canvasFold: 820, mobileWidth: 707 })
    expect(pickerButton()).toHaveAccessibleName('Screen size: Pixel 9 Pro Fold 791×820 · Inner screen')
  })

  it('keeps an iPad mini on the mobile layout without a phone body', async () => {
    renderEditor()
    await screen.findByRole('textbox', { name: 'Site title', exact: true })
    fireEvent.click(within(openPicker()).getByRole('button', { name: 'iPad mini 744×1133' }))
    expect(state().viewport).toBe('mobile')
    expect(page()).toMatchObject({ mobileWidth: 744, mobileFold: 1133 })
    expect(document.querySelector('[data-builder-device-viewport="1133"]')).not.toBeNull()
    expect(phoneFrame()).toBeNull()
  })

  it('reopens the selected Pixel at a shared size, falling back to Pixel 9 for width-only data', async () => {
    site.schema.pages[0] = { ...site.schema.pages[0], mobileWidth: 412, mobileFold: 923 }
    localStorage.setItem('pwb_default_editor_viewport', 'mobile')
    renderEditor()
    await screen.findByRole('textbox', { name: 'Site title', exact: true })
    await waitFor(() => expect(pickerButton()).toHaveAccessibleName('Screen size: Pixel 9 412×923'))
    expect(phoneFrame()).toHaveAttribute('aria-label', 'Pixel 9')

    fireEvent.click(foldStates(openPicker(), 'Pixel 9 Pro Fold')[0])
    expect(page()).toMatchObject({ mobileWidth: 412, mobileFold: 923, mobilePresetId: 'pixel9fold-cover' })
    expect(phoneFrame()).toHaveAttribute('aria-label', 'Pixel 9 Pro Fold')
    expect(pickerButton()).toHaveAccessibleName('Screen size: Pixel 9 Pro Fold 412×923 · Outer screen')

    site.schema.pages[0] = structuredClone(page())
    cleanup()
    renderEditor()
    await screen.findByRole('textbox', { name: 'Site title', exact: true })
    await waitFor(() => expect(phoneFrame()).toHaveAttribute('aria-label', 'Pixel 9 Pro Fold'))
    state().setCanvasPreset({ width: 412, fold: 923 })
    await waitFor(() => expect(pickerButton()).toHaveAccessibleName('Screen size: Pixel 9 412×923'))
  })

  it('frames a wide iPhone Duo in Edit and View while keeping the PC layout', async () => {
    renderEditor()
    await screen.findByRole('textbox', { name: 'Site title', exact: true })
    fireEvent.click(foldStates(openPicker(), 'iPhone Duo')[0])
    expect(phoneFrame()).toHaveAttribute('data-builder-camera', 'island')
    expect(document.querySelector('[data-builder-hinge]')).toBeNull()

    fireEvent.click(foldStates(openPicker(), 'iPhone Duo')[1])
    expect(state().viewport).toBe('pc')
    expect(page()).toMatchObject({ canvasWidth: 951, canvasFold: 669, mobileWidth: 466, mobileFold: 678 })
    expect(phoneFrame()).toHaveAttribute('data-builder-camera', 'under-display')
    expect(document.querySelector('[data-builder-hinge="vertical"]')).toHaveStyle({ left: '50%' })
    expect(document.querySelector('[data-builder-device-viewport="669"]')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'View', exact: true }))
    await waitFor(() => expect(phoneFrame()).toHaveAttribute('aria-label', 'iPhone Duo'))
    expect(document.querySelector('[data-builder-hinge="vertical"]')).not.toBeNull()
  })

  it('keeps the Acer case off by default and toggles it without changing the PC viewport', async () => {
    renderEditor()
    await screen.findByRole('textbox', { name: 'Site title', exact: true })
    fireEvent.click(within(openPicker()).getByRole('button', { name: 'Acer Nitro 16 2560×1600' }))
    const frame = () => document.querySelector('[data-builder-laptop-frame="nitro"]')
    const deviceViewport = () => document.querySelector('[data-builder-device-viewport="1600"]')
    expect(state().viewport).toBe('pc')
    expect(page()).toMatchObject({ canvasWidth: 2560, canvasFold: 1600, canvasPresetId: 'acer-nitro-16' })
    expect(frame()).toBeNull()
    expect(deviceViewport()).toHaveStyle({ width: '2560px', height: '1522px' })

    const show = within(openPicker()).getByRole('switch', { name: 'Laptop case' })
    expect(show).not.toBeChecked()
    fireEvent.click(show)
    expect(show).toBeChecked()
    expect(localStorage.getItem('pwb_laptop_frame')).toBe('1')
    expect(frame().querySelector('[data-builder-laptop-screen]')).toHaveStyle({ width: '2560px', height: '1600px' })
    expect(frame().querySelector('img[data-builder-laptop-keyboard]')).toHaveAttribute('src', expect.stringContaining('nitro.webp'))
    fireEvent.click(pickerButton())

    fireEvent.click(screen.getByRole('button', { name: 'View', exact: true }))
    await waitFor(() => expect(frame()).not.toBeNull())
    expect(deviceViewport()).toHaveStyle({ width: '2560px', height: '1522px' })
    fireEvent.click(within(openPicker()).getByRole('switch', { name: 'Laptop case' }))
    expect(frame()).toBeNull()
    expect(state().viewport).toBe('pc')
    expect(deviceViewport()).toHaveStyle({ width: '2560px', height: '1522px' })
  })

  it('lists the foldables in one order, though their screens are split between PC and Mobile', async () => {
    renderEditor()
    await screen.findByRole('textbox', { name: 'Site title', exact: true })
    const picker = openPicker()
    expect([...picker.querySelectorAll('[data-device-group]')].map((card) => card.dataset.deviceGroup)).toEqual([
      'galaxy-zfold6', 'galaxy-zflip6', 'pixel9-pro-fold', 'huawei-mate-x6', 'huawei-mate-xt', 'iphone-fold',
    ])
    expect(within(picker).getAllByRole('region').map((section) => section.getAttribute('aria-label')))
      .toEqual(['Desktop', 'Tablet', 'Phone', 'Foldable'])
    expect(foldStates(picker, 'Pixel 9 Pro Fold').map((state) => state.textContent)).toEqual(['Outer screen', 'Inner screen'])
  })

  it('keeps the side for a size on the same side, and names a size no card has as custom', async () => {
    renderEditor()
    await screen.findByRole('textbox', { name: 'Site title', exact: true })
    await waitFor(() => expect(page().components[0]?.id).toBe('first'))

    fireEvent.click(within(openPicker()).getByRole('button', { name: 'Full HD 1920×1080' }))
    expect(state().viewport).toBe('pc')
    expect(page()).toMatchObject({ canvasWidth: 1920, canvasFold: 1080 })

    state().setCanvasPreset({ width: 1111, fold: 0 })
    await waitFor(() => expect(pickerButton()).toHaveAccessibleName('Screen size: Custom · 1111px'))
  })
})

describe('the device picker on an HTML page', () => {
  it('draws a phone picked from the PC side in its phone, and remembers it for Mobile', async () => {
    localStorage.setItem('pwb_htmlmode_1', 'edit')
    site.schema.pages[0] = { id: 'home', name: 'Home', mode: 'html', html: '<!DOCTYPE html><html><body><h1>Garden</h1></body></html>', components: [] }
    renderEditor()
    await screen.findByTitle('site', {}, { timeout: 15000 })
    expect(pickerButton()).toHaveAccessibleName('Screen size: Responsive')
    expect(document.querySelector('[data-builder-phone-frame]')).toBeNull()

    fireEvent.click(within(openPicker()).getByRole('button', { name: 'iPhone 16 Pro 402×874' }))
    expect(pickerButton()).toHaveAccessibleName('Screen size: iPhone 16 Pro 402×874')
    await waitFor(() => expect(document.querySelector('[data-builder-phone-frame]')).not.toBeNull())
    expect(localStorage.getItem('pwb_last_html_mobile_device')).toBe('iphone16pro')
    expect(localStorage.getItem('pwb_default_editor_viewport')).toBe('mobile')

    fireEvent.click(within(openPicker()).getByRole('button', { name: 'iPad mini 744×1133' }))
    await waitFor(() => expect(phoneFrame()).toBeNull())
    expect(localStorage.getItem('pwb_default_editor_viewport')).toBe('mobile')

    fireEvent.click(within(openPicker()).getByRole('button', { name: 'Pixel 9 412×923' }))
    await waitFor(() => expect(phoneFrame()).toHaveAttribute('aria-label', 'Pixel 9'))
    fireEvent.click(foldStates(openPicker(), 'Pixel 9 Pro Fold')[0])
    await waitFor(() => expect(phoneFrame()).toHaveAttribute('aria-label', 'Pixel 9 Pro Fold'))

    // The Mate XT fully open is a PC size, still held as a phone, creased twice.
    fireEvent.click(foldStates(openPicker(), 'Huawei Mate XT')[2])
    expect(localStorage.getItem('pwb_last_html_pc_device')).toBe('matext-full')
    expect(localStorage.getItem('pwb_default_editor_viewport')).toBe('pc')
    await waitFor(() => expect(document.querySelectorAll('[data-builder-hinge="thirds"]')).toHaveLength(2))
  }, 20000)
})

it('offers the saved case preference on the reference MacBook Pro and keeps the Air plain', async () => {
  localStorage.setItem('pwb_htmlmode_1', 'edit')
  localStorage.setItem('pwb_laptop_frame', '1')
  site.schema.pages[0] = { id: 'home', name: 'Home', mode: 'html', html: '<!DOCTYPE html><html><body><h1>Garden</h1></body></html>', components: [] }
  renderEditor()
  await screen.findByTitle('site', {}, { timeout: 15000 })

  fireEvent.click(within(openPicker()).getByRole('button', { name: 'MacBook Air 13" 1470×956' }))
  expect(document.querySelector('[data-builder-laptop-frame]')).toBeNull()
  const airPicker = within(openPicker())
  expect(airPicker.queryByRole('switch', { name: 'Laptop case' })).toBeNull()
  fireEvent.click(airPicker.getByRole('button', { name: 'MacBook Pro 16" 1728×1117' }))
  const frame = () => document.querySelector('[data-builder-laptop-frame="macbook"]')
  expect(frame().querySelector('[data-builder-laptop-screen]')).toHaveStyle({ width: '1728px', height: '1117px' })
  expect(within(frame()).getByTitle('site')).toBeInTheDocument()
  const show = within(openPicker()).getByRole('switch', { name: 'Laptop case' })
  expect(show).toBeChecked()
  fireEvent.click(show)
  expect(frame()).toBeNull()
  expect(screen.getByTitle('site')).toBeInTheDocument()
  expect(localStorage.getItem('pwb_laptop_frame')).toBe('0')
})
