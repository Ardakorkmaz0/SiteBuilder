import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const { getSite, updateSite, race } = vi.hoisted(() => ({
  getSite: vi.fn(),
  updateSite: vi.fn(),
  race: { restoreDuringPanelCommit: false },
}))
vi.mock('../api/sites.js', () => ({ getSite, updateSite, patchSite: vi.fn() }))

vi.mock('../components/editor/CodePanel.jsx', async (importOriginal) => {
  const { default: CodePanel } = await importOriginal()
  const { forwardRef, useLayoutEffect } = await import('react')
  return {
    default: forwardRef(function RecoveryTimingPanel(props, ref) {
      const { htmlDrafts } = props
      useLayoutEffect(() => {
        if (!race.restoreDuringPanelCommit || Object.keys(htmlDrafts || {}).length) return
        race.restoreDuringPanelCommit = false
        // Force the recovery click between the old panel's commit and its
        // passive seed acknowledgement. Its real implementation stays mounted.
        const restore = [...document.querySelectorAll('button')]
          .find((button) => button.textContent === 'Restore local draft')
        if (!restore) throw new Error('The recovery action must be available before the source panel commits')
        restore.click()
      }, [htmlDrafts])
      return <CodePanel ref={ref} {...props} />
    }),
  }
})

import EditorPage from './EditorPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useAuthStore } from '../store/authStore.js'
import { readEditorRecovery, writeEditorRecovery } from '../utils/editorRecovery.js'

const site = {
  id: 1, title: 'Recovery timing', slug: 'recovery-timing', published: false,
  category: 'other', tags: [], html: '', revision: 4,
  schema: { theme: {}, pages: [{
    id: 'home', name: 'Home', components: [{
      id: 'h1', type: 'heading', props: { text: 'Server text' }, styles: {},
      layout: { x: 20, y: 20, w: 400, h: 60 },
    }],
  }] },
}
const recoveredSource = '<h1>Recovered before the old source panel acknowledged</h1>'

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_autosave_on_1', '0')
  localStorage.setItem('pwb_canvasmode_1', 'source')
  useAuthStore.getState().setAuth('test-token', { id: 7, username: 'ada' })
  getSite.mockResolvedValue(structuredClone(site))
  race.restoreDuringPanelCommit = true
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})
afterEach(async () => {
  race.restoreDuringPanelCommit = false
  await act(async () => useAuthStore.getState().logout())
  vi.restoreAllMocks()
})

async function recoverAtSourceCommit() {
  const draft = writeEditorRecovery(7, 1, {
    schema: structuredClone(site.schema), title: site.title, currentPageId: 'home',
    codeDrafts: { 'index.html': recoveredSource },
  })
  render(<UiThemeProvider><LanguageProvider><MemoryRouter initialEntries={['/editor/1']}>
    <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
  </MemoryRouter></LanguageProvider></UiThemeProvider>)
  await waitFor(() => expect(screen.getByLabelText('HTML source editor')).toHaveValue(recoveredSource), { timeout: 15000 })
  expect(readEditorRecovery(7, 1)?.id).toBe(draft.id)
  expect(updateSite).not.toHaveBeenCalled()
}

describe('source recovery during panel mounting', () => {
  it('keeps restored source when recovery runs before the previous source panel finishes mounting', async () => {
    await recoverAtSourceCommit()
  }, 30000)
})
