import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

  it('keeps what was sent live on its own tab, apart from the recovery points', async () => {
    listVersions.mockResolvedValue([
      { id: 3, source: 'publish', pinned: false, label: 'Sent live', created_at: '2026-07-15T11:00:00Z' },
      { id: 2, source: 'save', pinned: false, label: 'before restore', created_at: '2026-07-15T10:00:00Z' },
      { id: 1, source: 'manual', pinned: false, label: 'My save', created_at: '2026-07-15T09:00:00Z' },
    ])
    renderPanel()
    await screen.findByText('Sent live')

    fireEvent.click(screen.getByRole('button', { name: 'Live 1', exact: true }))
    expect(screen.getByRole('button', { name: 'Live 1', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Sent live')).toBeInTheDocument()
    expect(screen.queryByText('My save')).not.toBeInTheDocument()
    expect(screen.queryByText('Your work before a load')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Recovery 1', exact: true }))
    expect(screen.getByText('Your work before a load')).toBeInTheDocument()
    expect(screen.queryByText('Sent live')).not.toBeInTheDocument()
  })

  describe('the version that is live now', () => {
    const liveRows = [
      { id: 3, source: 'publish', pinned: false, label: 'Sent live from v1', created_at: '2026-07-15T11:00:00Z' },
      { id: 2, source: 'publish', pinned: false, label: 'Sent live', created_at: '2026-07-15T10:00:00Z' },
    ]
    const rowOf = (text) => screen.getByText(text).closest('li')

    beforeEach(() => listVersions.mockResolvedValue(liveRows))

    it('marks only the newest live row, and offers to send only the others', async () => {
      renderPanel({ onSendLive: vi.fn() })
      await screen.findByText('Sent live')

      expect(screen.getAllByText('Now live')).toHaveLength(1)
      expect(within(rowOf('Sent live from an older save')).getByText('Now live')).toBeInTheDocument()
      expect(within(rowOf('Sent live from an older save')).queryByRole('button', { name: 'Send live', exact: true })).not.toBeInTheDocument()
      expect(within(rowOf('Sent live')).queryByText('Now live')).not.toBeInTheDocument()
      expect(within(rowOf('Sent live')).getByRole('button', { name: 'Send live', exact: true })).toBeInTheDocument()
    })

    it('marks nothing while the site is offline', async () => {
      renderPanel()
      await screen.findByText('Sent live')

      expect(screen.queryByText('Now live')).not.toBeInTheDocument()
    })

    it('moves the mark when the header sends the draft live with the panel open', async () => {
      const onSendLive = vi.fn()
      const panel = (liveAt) => (
        <LanguageProvider><HistoryPanel open siteId="7" onClose={vi.fn()} onSendLive={onSendLive} liveAt={liveAt} /></LanguageProvider>
      )
      const { rerender } = render(panel('2026-07-15T11:00:00Z'))
      await screen.findByText('Sent live')

      listVersions.mockResolvedValue([
        { id: 4, source: 'publish', pinned: false, label: 'Sent live', created_at: '2026-07-15T12:00:00Z' },
        { ...liveRows[0] },
      ])
      rerender(panel('2026-07-15T12:00:00Z'))

      await waitFor(() => expect(within(rowOf('Sent live')).getByText('Now live')).toBeInTheDocument())
      expect(within(rowOf('Sent live from an older save')).queryByText('Now live')).not.toBeInTheDocument()
    })
  })

  it('says when nothing has been sent live yet', async () => {
    renderPanel()
    await screen.findByText('Manual save')

    fireEvent.click(screen.getByRole('button', { name: 'Live 0', exact: true }))
    expect(screen.getByText('Live versions appear here each time you send the site live.')).toBeInTheDocument()
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
