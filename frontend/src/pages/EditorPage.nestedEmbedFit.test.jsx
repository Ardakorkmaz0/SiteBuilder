// A palette block is an HTML embed whose box hugs its content: measured at the
// drop and again whenever its text changes. Only blocks lying directly on the
// page were looked up for that, so one inside a section kept the palette's
// guessed box — a frame bigger than the button in it — and a longer label was
// cut off instead of making room.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const measured = vi.hoisted(() => ({ calls: [] }))

vi.mock('../utils/htmlEmbedMeasure.js', async (importOriginal) => {
  const real = await importOriginal()
  return {
    ...real,
    // The content measures 180 x 44, whatever box it was in.
    fitHtmlEmbedLayout: vi.fn(async (component, width, apply) => {
      measured.calls.push({ id: component.id, width })
      apply({ w: 180, h: 44 })
      return true
    }),
  }
})

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Fit', slug: 'fit', published: false, category: 'other', tags: [], html: '', site_options: {},
    schema: {
      theme: {},
      pages: [{
        id: 'home',
        name: 'Home',
        components: [{
          id: 'band',
          type: 'region',
          props: {},
          styles: {},
          layout: { x: 0, y: 0, w: 1000, h: 300 },
          children: [{
            id: 'inner',
            type: 'html',
            props: { code: '<a class="btn">Go</a>' },
            styles: {},
            layout: { x: 40, y: 40, w: 320, h: 120 },
          }],
        }],
      }],
    },
  })),
  updateSite: vi.fn(async (id, payload) => ({ ...payload, slug: 'fit' })),
  patchSite: vi.fn(async () => ({})),
}))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../store/editorStore.js'

const SLOW = { timeout: 15000 }
const s = () => useEditorStore.getState()
const inner = () => s().schema.pages[0].components[0].children[0]

beforeEach(() => {
  measured.calls = []
  localStorage.clear()
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

describe('a palette block inside a section', () => {
  it('has its box fitted to its content again when its text changes', async () => {
    render(
      <UiThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/editor/1']}>
            <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
          </MemoryRouter>
        </LanguageProvider>
      </UiThemeProvider>,
    )
    await waitFor(() => expect(document.querySelector('[data-cid="inner"]')).toBeTruthy(), SLOW)
    await act(async () => { s().selectComponent('inner') })

    await act(async () => { s().updateProps('inner', { code: '<a class="btn">Go to the pricing page</a>' }) })

    await waitFor(() => expect(measured.calls.some((call) => call.id === 'inner')).toBe(true), SLOW)
    await waitFor(() => expect(inner().layout).toMatchObject({ w: 180, h: 44 }), SLOW)
    // Where it was put is not the measurement's to change.
    expect(inner().layout).toMatchObject({ x: 40, y: 40 })
  }, 30000)
})
