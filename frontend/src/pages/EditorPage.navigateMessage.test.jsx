// A page shown in View asks the editor to switch pages when a link names
// another page (it is sandboxed and cannot do it itself). The editor took that
// request from ANY window: a frame embedded in the page by a third party, or a
// window that opened the editor, could flip the page being edited.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const page = (text) => `<!doctype html><html><head><title>${text}</title></head><body><h1>${text}</h1></body></html>`

vi.mock('../api/sites.js', () => ({
  getSite: vi.fn(async () => ({
    id: 1, title: 'Two pages', slug: 'two', published: false, category: 'other', tags: [], html: '', site_options: {},
    schema: {
      theme: {},
      pages: [
        { id: 'page_home', name: 'Home', mode: 'html', html: page('First page'), components: [] },
        { id: 'page_two', name: 'Second', mode: 'html', html: page('Second page'), components: [] },
      ],
    },
  })),
  updateSite: vi.fn(async (id, payload) => ({ ...payload, slug: 'two' })),
  patchSite: vi.fn(async () => ({})),
}))

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'

const SLOW = { timeout: 15000 }
const stage = () => screen.getByTitle('site')
const shown = () => stage().getAttribute('srcdoc') || ''
const ask = (source, hash) => act(async () => {
  window.dispatchEvent(new MessageEvent('message', { data: { type: 'pwb-navigate', hash }, source }))
})

beforeEach(() => {
  localStorage.clear()
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

async function openEditor() {
  render(
    <UiThemeProvider>
      <LanguageProvider>
        <MemoryRouter initialEntries={['/editor/1']}>
          <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
        </MemoryRouter>
      </LanguageProvider>
    </UiThemeProvider>,
  )
  await waitFor(() => expect(shown()).toContain('First page'), SLOW)
}

describe('a request to switch pages', () => {
  it('is ignored when it does not come from a page preview of this editor', async () => {
    await openEditor()
    const stranger = document.createElement('iframe')
    document.body.appendChild(stranger)
    const strangerWindow = stranger.contentWindow
    stranger.remove()

    await ask(strangerWindow, '#page_two')
    await ask(window, '#page_two')

    expect(shown()).toContain('First page')
  }, 30000)

  it('is honoured when the page being previewed asks', async () => {
    await openEditor()

    await ask(stage().contentWindow, '#page_two')

    await waitFor(() => expect(shown()).toContain('Second page'), SLOW)
  }, 30000)

  it('survives a hash that is not valid percent-encoding', async () => {
    await openEditor()
    const errors = []
    const onError = (event) => { errors.push(event.error || event.message); event.preventDefault() }
    window.addEventListener('error', onError)

    await ask(stage().contentWindow, '#%E0%A4%A')

    window.removeEventListener('error', onError)
    expect(errors).toEqual([])
    expect(shown()).toContain('First page')
  }, 30000)
})
