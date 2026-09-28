import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import HistoryPanel from './HistoryPanel.jsx'
import { listVersions, restoreVersion, setVersionPinned } from '../../api/versions.js'

vi.mock('../../api/versions.js', () => ({
  listVersions: vi.fn(),
  restoreVersion: vi.fn(),
  createCheckpoint: vi.fn(),
  overwriteVersion: vi.fn(),
  setVersionPinned: vi.fn(),
  deleteVersion: vi.fn(),
}))

function renderPanel(props = {}) {
  return render(
    <LanguageProvider>
      <HistoryPanel open siteId="7" onClose={vi.fn()} {...props} />
    </LanguageProvider>,
  )
}

describe('HistoryPanel save sources and pins', () => {
  beforeEach(() => {
    localStorage.setItem('pwb_language', 'en')
    vi.clearAllMocks()
    listVersions.mockResolvedValue([
      { id: 1, source: 'manual', pinned: false, label: '', created_at: '2026-07-15T10:00:00Z' },
      { id: 2, source: 'auto', pinned: true, label: '', created_at: '2026-07-15T09:00:00Z' },
    ])
    setVersionPinned.mockResolvedValue({})
  })

  it('separates manual and automatic saves without using the pin as the source', async () => {
    const { container } = renderPanel()
    expect(container.firstChild).toHaveClass('studio-theme-surface', 'rounded-2xl')
    expect(await screen.findByText('Manual save')).toBeInTheDocument()
    expect(screen.getByText('Auto-saved snapshot')).toBeInTheDocument()
    expect(screen.getAllByText(/manual|auto/i).length).toBeGreaterThan(1)
  })

  it('pins and unpins rows independently and exposes the auto-save switch', async () => {
    const onAutoSaveEnabled = vi.fn()
    renderPanel({ autoSaveEnabled: false, onAutoSaveEnabled })
    await screen.findByText('Manual save')

    fireEvent.click(screen.getByRole('button', { name: 'Pin' }))
    await waitFor(() => expect(setVersionPinned).toHaveBeenCalledWith('7', 1, true))

    fireEvent.click(screen.getByRole('checkbox'))
    expect(onAutoSaveEnabled).toHaveBeenCalledWith(true)
  })

  it('filters the timeline without mixing manual and automatic saves', async () => {
    renderPanel()
    await screen.findByText('Manual save')

    fireEvent.click(screen.getByRole('button', { name: /Manual 1/i }))
    expect(screen.getByText('Manual save')).toBeInTheDocument()
    expect(screen.queryByText('Auto-saved snapshot')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Automatic 1/i }))
    expect(screen.queryByText('Manual save')).not.toBeInTheDocument()
    expect(screen.getByText('Auto-saved snapshot')).toBeInTheDocument()
  })
})

// The server's snapshot before a load is of the SAVED site, so work still on
// screen was lost although the confirmation promises the load can be undone.
describe('loading a save with work not saved yet', () => {
  beforeEach(() => {
    localStorage.setItem('pwb_language', 'en')
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    listVersions.mockResolvedValue([{ id: 1, source: 'manual', pinned: false, label: '', created_at: '2026-07-15T10:00:00Z' }])
    restoreVersion.mockResolvedValue({ id: 7, schema: { pages: [] } })
  })

  it('saves that work first, then loads', async () => {
    const order = []
    const onSave = vi.fn(async () => { order.push('save'); return { id: 7 } })
    restoreVersion.mockImplementation(async () => { order.push('load'); return { id: 7 } })
    const onRestored = vi.fn()
    renderPanel({ onSave, onRestored, hasUnsavedChanges: true })

    fireEvent.click(await screen.findByRole('button', { name: 'Load' }))

    await waitFor(() => expect(onRestored).toHaveBeenCalled())
    expect(order).toEqual(['save', 'load'])
  })

  it('loads nothing when that save fails', async () => {
    const onSave = vi.fn(async () => null)
    const onRestored = vi.fn()
    renderPanel({ onSave, onRestored, hasUnsavedChanges: true })

    fireEvent.click(await screen.findByRole('button', { name: 'Load' }))

    expect(await screen.findByText('Save failed. Nothing was loaded.')).toBeInTheDocument()
    expect(restoreVersion).not.toHaveBeenCalled()
    expect(onRestored).not.toHaveBeenCalled()
  })

  it('does not save when there is nothing new', async () => {
    const onSave = vi.fn()
    const onRestored = vi.fn()
    renderPanel({ onSave, onRestored, hasUnsavedChanges: false })

    fireEvent.click(await screen.findByRole('button', { name: 'Load' }))

    await waitFor(() => expect(onRestored).toHaveBeenCalled())
    expect(onSave).not.toHaveBeenCalled()
  })
})
