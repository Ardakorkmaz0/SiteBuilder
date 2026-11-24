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

    // The Mate XT fully open is a PC size, still held as a phone, creased twice.
    fireEvent.click(foldStates(openPicker(), 'Huawei Mate XT')[2])
    expect(localStorage.getItem('pwb_last_html_pc_device')).toBe('matext-full')
    expect(localStorage.getItem('pwb_default_editor_viewport')).toBe('pc')
    await waitFor(() => expect(document.querySelectorAll('[data-builder-hinge="thirds"]')).toHaveLength(2))
  }, 20000)
})
