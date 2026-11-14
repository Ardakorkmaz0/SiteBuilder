// Switching a canvas page to HTML changes the page's mode and document
// together. Previously, commitHtml + setPageMode pushed separate history steps
// (and in six call sites setPageMode ran after commitHtml, so one Undo reverted
// mode back to 'empty' while leaving the HTML string orphaned in pageHtmlMap).
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

const SLOW = { timeout: 15000 }
const banner = () => screen.getByRole('banner')
const undoButton = () => within(banner()).getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true })
const redoButton = () => within(banner()).getByRole('button', { name: 'Redo (Ctrl+Shift+Z)', exact: true })

function canvasSite() {
  return {
    id: 1,
    title: 'Canvas Switch',
    slug: 'canvas-switch',
    published: false,
    category: 'other',
    tags: [],
    html: '',
    site_options: {},
    revision: 1,
    schema: {
      theme: {},
      pages: [
        {
          id: 'page_home',
          name: 'Home',
          mode: 'empty',
          components: [
            {
              id: 'cmp_1',
              type: 'heading',
              props: { text: 'Original Canvas Heading', tag: 'h1' },
              styles: {},
              layout: { x: 20, y: 20, w: 320, h: 60 },
            },
          ],
        },
        {
          id: 'page_about',
          name: 'About',
          mode: 'empty',
          components: [],
        },
      ],
    },
  }
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_editor_tour_v1', '1')
  site = canvasSite()
  updateSite.mockReset()
  updateSite.mockImplementation(async (id, payload) => ({
    ...payload,
    id,
    slug: 'canvas-switch',
    revision: (site.revision || 1) + 1,
  }))
  useAuthStore.setState({ user: { id: 1, username: 'owner', is_guest: false }, token: 'test-token' })
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

async function openCanvasEditor() {
  render(
    <UiThemeProvider>
      <LanguageProvider>
        <MemoryRouter initialEntries={['/editor/1']}>
          <Routes>
            <Route path="/editor/:id" element={<EditorPage />} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </UiThemeProvider>,
  )
  await screen.findByText('Original Canvas Heading', {}, SLOW)
}

async function saveAndReadPayload() {
  const before = updateSite.mock.calls.length
  await act(async () => {
    fireEvent.click(within(banner()).getByRole('button', { name: 'Save', exact: true }))
  })
  await waitFor(() => expect(updateSite).toHaveBeenCalledTimes(before + 1), SLOW)
  await waitFor(() => expect(within(banner()).getByRole('button', { name: 'Save', exact: true })).toBeEnabled(), SLOW)
  return updateSite.mock.calls.at(-1)[1]
}

describe('atomic Undo / Redo across canvas-to-HTML mode switches', () => {
  it.each([
    {
      name: 'Start blank HTML',
      trigger: async () => {
        fireEvent.click(screen.getByTitle('More actions'))
        await act(async () => {
          fireEvent.click(screen.getByText('Start blank HTML'))
        })
      },
    },
    {
      name: 'Convert to responsive HTML',
      trigger: async () => {
        fireEvent.click(screen.getByTitle('More actions'))
        await act(async () => {
          fireEvent.click(screen.getByText('Convert to responsive HTML'))
        })
      },
    },
    {
      name: 'Choose a template',
      trigger: async () => {
        fireEvent.click(screen.getByTitle('More actions'))
        await act(async () => {
          fireEvent.click(screen.getByText('Choose a template...'))
        })
        const useBtns = await screen.findAllByRole('button', { name: 'Use this template' }, SLOW)
        await act(async () => {
          fireEvent.click(useBtns[0])
        })
      },
    },
  ])('$name undoes mode and html together in one step, and redoes in one step', async ({ trigger }) => {
    await openCanvasEditor()

    await trigger()

    await waitFor(() => {
      expect(useEditorStore.getState().schema.pages[0].mode).toBe('html')
    }, SLOW)
    const afterSwitchPayload = await saveAndReadPayload()
    expect(afterSwitchPayload.html.trim().length).toBeGreaterThan(0)
    expect(afterSwitchPayload.schema.pages[0].html.trim().length).toBeGreaterThan(0)

    await act(async () => {
      fireEvent.click(undoButton())
    })

    await screen.findByText('Original Canvas Heading', {}, SLOW)
    expect(useEditorStore.getState().schema.pages[0].mode).toBe('empty')
    expect(undoButton()).toBeDisabled()

    const afterUndoPayload = await saveAndReadPayload()
    expect(afterUndoPayload.html).toBe('')
    expect(afterUndoPayload.schema.pages[0].html).toBe('')
    expect(afterUndoPayload.schema.pages[0].mode).toBe('empty')

    await act(async () => {
      fireEvent.click(redoButton())
    })

    await waitFor(() => {
      expect(useEditorStore.getState().schema.pages[0].mode).toBe('html')
    }, SLOW)
    const afterRedoPayload = await saveAndReadPayload()
    expect(afterRedoPayload.html.trim().length).toBeGreaterThan(0)
    expect(afterRedoPayload.schema.pages[0].html.trim().length).toBeGreaterThan(0)
  }, 30000)

  it('undoes importing an HTML file onto a canvas page in a single step', async () => {
    const { container } = render(
      <UiThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/editor/1']}>
            <Routes>
              <Route path="/editor/:id" element={<EditorPage />} />
            </Routes>
          </MemoryRouter>
        </LanguageProvider>
      </UiThemeProvider>,
    )
    await screen.findByText('Original Canvas Heading', {}, SLOW)

    const htmlInput = container.querySelector('input[type="file"][accept=".html,.htm"]')
    const uploaded = new File(['<!doctype html><html><head><title>Up</title></head><body><h1>Imported</h1></body></html>'], 'index.html', { type: 'text/html' })
    Object.defineProperty(uploaded, 'text', { value: async () => '<!doctype html><html><head><title>Up</title></head><body><h1>Imported</h1></body></html>' })
    await act(async () => {
      fireEvent.change(htmlInput, { target: { files: [uploaded] } })
    })

    await waitFor(() => {
      expect(useEditorStore.getState().schema.pages[0].mode).toBe('html')
    }, SLOW)

    await act(async () => {
      fireEvent.click(undoButton())
    })

    await screen.findByText('Original Canvas Heading', {}, SLOW)
    expect(useEditorStore.getState().schema.pages[0].mode).toBe('empty')
    expect(undoButton()).toBeDisabled()

    const afterUndoPayload = await saveAndReadPayload()
    expect(afterUndoPayload.html).toBe('')
    expect(afterUndoPayload.schema.pages[0].html).toBe('')
  }, 30000)
})
