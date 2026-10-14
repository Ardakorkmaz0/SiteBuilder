// The rows a load leaves behind are named in the person's language: the
// recovery point as the work before the load, the copy as what was loaded.
// The server's own notes ("before restore", "restored from v12") used to be
// shown as they were, in English, and the two could not be told apart.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('../../api/versions.js', () => ({
  listVersions: vi.fn(async () => [
    { id: 3, source: 'restore', label: 'restored from v1', pinned: false, created_at: '2026-10-14T10:02:00Z' },
    { id: 2, source: 'save', label: 'before restore', pinned: false, created_at: '2026-10-14T10:01:00Z' },
    { id: 1, source: 'manual', label: 'Benim kaydım', pinned: true, created_at: '2026-10-14T10:00:00Z' },
  ]),
  restoreVersion: vi.fn(),
  createCheckpoint: vi.fn(),
  overwriteVersion: vi.fn(),
  setVersionPinned: vi.fn(),
  deleteVersion: vi.fn(),
}))

import HistoryPanel from './HistoryPanel.jsx'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'

beforeEach(() => localStorage.setItem('pwb_language', 'tr'))

describe('the rows a load leaves behind', () => {
  it('are named in the person\'s language, and a save\'s own name is kept', async () => {
    render(<LanguageProvider><HistoryPanel open siteId={1} onClose={() => {}} /></LanguageProvider>)
    await waitFor(() => expect(screen.getByText('Yüklemeden önceki çalışmanız')).toBeTruthy())
    expect(screen.getByText('Geçmişten geri yüklendi')).toBeTruthy()
    expect(screen.getByText('Benim kaydım')).toBeTruthy()
    expect(screen.queryByText('before restore')).toBeNull()
    expect(screen.queryByText('restored from v1')).toBeNull()
  })
})
