// The history shows what each save changed, and can be narrowed to the page
// that is open: the saves that changed it, each loadable for that page alone.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import HistoryPanel from './HistoryPanel.jsx'
import { listVersions, restoreVersion } from '../../api/versions.js'

vi.mock('../../api/versions.js', () => ({
  listVersions: vi.fn(),
  restoreVersion: vi.fn(),
  createCheckpoint: vi.fn(),
  overwriteVersion: vi.fn(),
  setVersionPinned: vi.fn(),
  deleteVersion: vi.fn(),
}))

const page = (id, size, extra = {}) => ({ id, name: id, kind: 'changed', size, hard: false, ...extra })
const summary = (pages, extra = {}) => ({ first: false, pages, size: Math.max(0, ...pages.map((p) => p.size)), hard: pages.some((p) => p.hard), site: false, ...extra })

const ROWS = [
  { id: 4, source: 'manual', pinned: false, label: 'Turned into a canvas', created_at: '2026-07-15T13:00:00Z', summary: summary([page('home', 1, { kind: 'mode', hard: true })]) },
  { id: 3, source: 'manual', pinned: false, label: 'Both pages', created_at: '2026-07-15T12:00:00Z', summary: summary([page('home', 0.05), page('about', 0.8)]) },
  { id: 2, source: 'manual', pinned: false, label: 'A word on Home', created_at: '2026-07-15T11:00:00Z', summary: summary([page('home', 0.05)]) },
  { id: 1, source: 'manual', pinned: false, label: 'Very first', created_at: '2026-07-15T10:00:00Z', summary: { first: true, pages: [], size: 0, hard: false, site: false } },
]

function renderPanel(props = {}) {
  return render(
    <LanguageProvider>
      <HistoryPanel open siteId="7" onClose={vi.fn()} pageId="about" pageName="About" {...props} />
    </LanguageProvider>,
  )
}

const rowOf = (label) => screen.getByText(label).closest('li')

beforeEach(() => {
  localStorage.setItem('pwb_language', 'en')
  vi.clearAllMocks()
  listVersions.mockResolvedValue(ROWS)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('what each save changed', () => {
  it('is marked beside it: its size, and whether only the history takes it back', async () => {
    renderPanel()
    await screen.findByText('Both pages')

    expect(within(rowOf('Turned into a canvas')).getByRole('img', { name: 'Hard to take back' }).style.backgroundColor).toBe('var(--studio-change-hard)')
    expect(within(rowOf('Both pages')).getByRole('img', { name: 'Large change' }).style.backgroundColor)
      .toBe('color-mix(in srgb, var(--studio-change-high) 80%, var(--studio-change-low))')
    expect(within(rowOf('Both pages')).getByText(/· Large change · 2 pages/)).toBeInTheDocument()
    expect(within(rowOf('A word on Home')).getByRole('img', { name: 'Small change' })).toBeInTheDocument()
    expect(within(rowOf('Very first')).getByRole('img', { name: 'First save' })).toBeInTheDocument()
  })
})

describe('the history of the page that is open', () => {
  it('lists only the saves that changed that page', async () => {
    renderPanel()
    await screen.findByText('Both pages')

    fireEvent.click(screen.getByRole('checkbox', { name: /Only this page: About/ }))

    expect(screen.getByText('Both pages')).toBeInTheDocument()
    expect(screen.queryByText('A word on Home')).not.toBeInTheDocument()
    expect(screen.queryByText('Turned into a canvas')).not.toBeInTheDocument()
    expect(screen.queryByText('Very first')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All 1' })).toBeInTheDocument()
    // The size shown is that page's own share of the save.
    expect(within(rowOf('Both pages')).getByRole('img', { name: 'Large change' })).toBeInTheDocument()
  })

  it('says so when no save has changed it', async () => {
    renderPanel({ pageId: 'contact', pageName: 'Contact' })
    await screen.findByText('Both pages')

    fireEvent.click(screen.getByRole('checkbox', { name: /Only this page: Contact/ }))

    expect(screen.getByText('No save has changed this page yet.')).toBeInTheDocument()
  })

  it('loads that page alone from a save, and the whole save when the list is not narrowed', async () => {
    const onRestore = vi.fn(async () => ({ id: 7 }))
    renderPanel({ onRestore })
    await screen.findByText('Both pages')

    fireEvent.click(within(rowOf('Both pages')).getByRole('button', { name: 'Load' }))
    await waitFor(() => expect(onRestore).toHaveBeenLastCalledWith(3, undefined))
    expect(window.confirm).toHaveBeenLastCalledWith('Load this save? Your current state is snapshotted first, so you can undo the load.')

    fireEvent.click(screen.getByRole('checkbox', { name: /Only this page: About/ }))
    fireEvent.click(within(rowOf('Both pages')).getByRole('button', { name: 'Load' }))
    await waitFor(() => expect(onRestore).toHaveBeenLastCalledWith(3, 'about'))
    expect(window.confirm).toHaveBeenLastCalledWith('Load only “About” from this save? The other pages stay as they are. Your current state is snapshotted first, so you can undo the load.')
  })

  it('asks the server for that page alone when the panel loads by itself', async () => {
    restoreVersion.mockResolvedValue({ id: 7 })
    renderPanel()
    await screen.findByText('Both pages')

    fireEvent.click(screen.getByRole('checkbox', { name: /Only this page: About/ }))
    fireEvent.click(within(rowOf('Both pages')).getByRole('button', { name: 'Load' }))

    await waitFor(() => expect(restoreVersion).toHaveBeenCalledWith('7', 3, 'about'))
  })
})
