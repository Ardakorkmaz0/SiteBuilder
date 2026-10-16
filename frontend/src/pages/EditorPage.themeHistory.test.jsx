import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

let site
const updateSite = vi.fn()
vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => structuredClone(site)),
  updateSite: (...args) => updateSite(...args),
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

const FONT = 'Arial, Helvetica, sans-serif'
const documentHtml = (name, color = '#4f46e5', { appliedFont = false, text = name } = {}) => {
  const font = appliedFont
    ? `<style data-pwb-theme-font>:root{--site-font:${FONT};--site-heading-font:${FONT}}body{font-family:${FONT}}h1,h2,h3,h4,h5,h6{font-family:${FONT}}</style>`
    : ''
  return `<!doctype html><html><head><style>:root{--primary:${color}}h1{color:var(--primary)}</style>${font}</head><body><h1>${name}</h1><p>${text}</p></body></html>`
}
const theme = (primaryColor = '#4f46e5') => ({ primaryColor, fontFamily: FONT, headingFontFamily: FONT })
const page = (id, name, color, options) => ({ id, name, mode: 'html', html: documentHtml(name, color, options), components: [] })
const banner = () => screen.getByRole('banner')
const source = () => screen.getByRole('textbox', { name: 'HTML source editor', exact: true })
const undo = () => screen.getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true })
const redo = () => screen.getByRole('button', { name: 'Redo (Ctrl+Shift+Z)', exact: true })
const SLOW = { timeout: 15000 }

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_editor_tour_v1', '1')
  localStorage.setItem('pwb_htmlmode_1', 'source')
  site = {
    id: 1, title: 'Theme history', slug: 'theme-history', published: false,
    category: 'other', tags: [], html: '', site_options: {}, revision: 1,
    schema: { theme: theme(), pages: [page('home', 'Home'), page('pricing', 'Pricing')] },
  }
  updateSite.mockReset()
  updateSite.mockImplementation(async (id, payload) => ({ ...payload, id, slug: 'theme-history', revision: 2 }))
  useAuthStore.setState({ user: { id: 1, username: 'owner', is_guest: false }, token: 'test-token' })
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})

async function openEditor() {
  render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
    <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
  </MemoryRouter></LanguageProvider></UiThemeProvider>)
  await screen.findByRole('textbox', { name: 'HTML source editor', exact: true }, SLOW)
  await waitFor(() => expect(source().value).toContain('<h1>Home</h1>'), SLOW)
  await act(async () => { fireEvent.click(screen.getByRole('tab', { name: 'Theme', exact: true })) })
}

async function saveSnapshot() {
  const before = updateSite.mock.calls.length
  await act(async () => { fireEvent.click(within(banner()).getByRole('button', { name: 'Save', exact: true })) })
  await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(before + 1), SLOW)
  await waitFor(() => expect(within(banner()).getByRole('button', { name: 'Save', exact: true })).toBeEnabled(), SLOW)
  return updateSite.mock.calls.at(-1)[1].schema.pages
}

const expectColors = (pages, colors) => {
  expect(pages).toHaveLength(colors.length)
  colors.forEach((color, index) => expect(pages[index].html).toContain(`--primary:${color}`))
}
const setPrimary = (color) => {
  const palette = screen.getByRole('radiogroup', { name: 'Where the theme applies', exact: true }).closest('section')
  fireEvent.change(within(palette).getByRole('textbox', { name: 'Primary color', exact: true }), { target: { value: color } })
}
const applyGlobal = () => fireEvent.click(screen.getByRole('button', { name: 'Apply to pages', exact: true }))

describe('HTML theme application history', () => {
  it('undoes and redoes every HTML page together, in order with the theme edit', async () => {
    await openEditor()
    setPrimary('#dc2626')
    applyGlobal()
    expectColors(await saveSnapshot(), ['#dc2626', '#dc2626'])

    fireEvent.click(undo())
    await waitFor(() => expect(source().value).toContain('--primary:#4f46e5'), SLOW)
    expectColors(await saveSnapshot(), ['#4f46e5', '#4f46e5'])

    // The palette field was edited before Apply. Its schema step is older
    // than the document step and is the next thing Undo must take back.
    fireEvent.click(undo())
    expect(useEditorStore.getState().schema.theme.primaryColor).toBe('#4f46e5')
    fireEvent.click(redo())
    expect(useEditorStore.getState().schema.theme.primaryColor).toBe('#dc2626')
    expectColors(await saveSnapshot(), ['#4f46e5', '#4f46e5'])
    fireEvent.click(redo())
    expectColors(await saveSnapshot(), ['#dc2626', '#dc2626'])
  }, 30000)

  it('marks an inactive document edit dirty when the active document is already themed', async () => {
    site.schema.theme = theme('#dc2626')
    site.schema.pages[0].html = documentHtml('Home', '#dc2626', { appliedFont: true })
    const originalHome = site.schema.pages[0].html
    await openEditor()
    expect(within(banner()).getByRole('status')).toHaveTextContent('Saved')
    applyGlobal()
    await waitFor(() => expect(within(banner()).getByRole('status')).toHaveTextContent('Unsaved'), SLOW)
    expect(source()).toHaveValue(originalHome)
    expect(undo()).toBeEnabled()
    const unload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unload)
    expect(unload.defaultPrevented).toBe(true)
    expectColors(await saveSnapshot(), ['#dc2626', '#dc2626'])
    fireEvent.click(undo())
    expectColors(await saveSnapshot(), ['#dc2626', '#4f46e5'])
  }, 30000)

  it('keeps pages with their own theme out of a whole-site application and its undo', async () => {
    site.schema.pages.push({ ...page('custom', 'Custom', '#166534'), theme: theme('#166534') })
    await openEditor()
    setPrimary('#dc2626')
    applyGlobal()
    expectColors(await saveSnapshot(), ['#dc2626', '#dc2626', '#166534'])
    fireEvent.click(undo())
    expectColors(await saveSnapshot(), ['#4f46e5', '#4f46e5', '#166534'])
    fireEvent.click(redo())
    expectColors(await saveSnapshot(), ['#dc2626', '#dc2626', '#166534'])
  }, 30000)

  it('applies and undoes a page-only theme without touching the other document', async () => {
    await openEditor()
    fireEvent.click(screen.getByRole('radio', { name: 'This page', exact: true }))
    setPrimary('#dc2626')
    fireEvent.click(screen.getByRole('button', { name: 'Apply to this page', exact: true }))
    expectColors(await saveSnapshot(), ['#dc2626', '#4f46e5'])
    fireEvent.click(undo())
    expectColors(await saveSnapshot(), ['#4f46e5', '#4f46e5'])
  }, 30000)

  it('reseeds the other HTML workspace and drops the document redo branch on a later page edit', async () => {
    await openEditor()
    setPrimary('#dc2626')
    applyGlobal()
    fireEvent.click(screen.getByRole('button', { name: 'pricing.html', exact: true }))
    await waitFor(() => expect(source().value).toContain('<h1>Pricing</h1>'), SLOW)

    fireEvent.click(undo())
    expect(source().value).toContain('--primary:#4f46e5')
    expectColors(await saveSnapshot(), ['#4f46e5', '#4f46e5'])
    fireEvent.click(redo())
    expect(source().value).toContain('--primary:#dc2626')
    expectColors(await saveSnapshot(), ['#dc2626', '#dc2626'])

    fireEvent.click(undo())
    await act(async () => { useEditorStore.getState().renamePage('pricing', 'Pricing revised') })
    expect(redo()).toBeDisabled()
    expectColors(await saveSnapshot(), ['#4f46e5', '#4f46e5'])
  }, 30000)

  it('ends a pending schema redo when a new whole-site document application branches history', async () => {
    await openEditor()
    await act(async () => { useEditorStore.getState().deletePage('pricing') })
    fireEvent.click(undo())
    expect(useEditorStore.getState().schema.pages).toHaveLength(2)
    expect(redo()).toBeEnabled()

    // The current theme adds its font to both documents even without a new
    // palette edit, so this exercises the document operation's branch guard.
    applyGlobal()
    expect(useEditorStore.getState().future).toHaveLength(0)
    expect(redo()).toBeDisabled()
    expectColors(await saveSnapshot(), ['#4f46e5', '#4f46e5'])
  }, 30000)

  it('preserves pending source text as a separate step before the theme application', async () => {
    await openEditor()
    fireEvent.change(source(), { target: { value: documentHtml('Home', '#4f46e5', { text: 'Pending source text must survive' }) } })
    setPrimary('#dc2626')
    applyGlobal()
    expectColors(await saveSnapshot(), ['#dc2626', '#dc2626'])
    fireEvent.click(undo())
    expect(source().value).toContain('Pending source text must survive')
    expectColors(await saveSnapshot(), ['#4f46e5', '#4f46e5'])

    fireEvent.click(undo())
    expect(source().value).not.toContain('Pending source text must survive')
    expectColors(await saveSnapshot(), ['#4f46e5', '#4f46e5'])
    fireEvent.click(redo())
    expect(source().value).toContain('Pending source text must survive')
    expectColors(await saveSnapshot(), ['#4f46e5', '#4f46e5'])
    fireEvent.click(redo())
    const saved = await saveSnapshot()
    expectColors(saved, ['#dc2626', '#dc2626'])
    expect(saved[0].html).toContain('Pending source text must survive')
  }, 30000)
})
