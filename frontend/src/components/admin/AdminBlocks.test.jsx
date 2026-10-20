import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import AdminBlocks from './AdminBlocks.jsx'
import { listAdminComponents } from '../../api/admin.js'

vi.mock('../../api/admin.js', () => ({ listAdminComponents: vi.fn(), moderateComponent: vi.fn() }))

const block = (id, title, author) => ({
  id, title, author, status: 'published', visibility: 'public', open_reports: 0,
  use_count: 0, view_count: 0, created_at: '2026-10-20T00:00:00Z',
})

beforeEach(() => {
  localStorage.setItem('pwb_language', 'tr')
  vi.clearAllMocks()
})

// A deleted account's blocks left the library (backend: an active author is
// required), though their status still says published.
describe('the admin block list', () => {
  it('says which blocks lost their author and are no longer in the library', async () => {
    listAdminComponents.mockResolvedValue({ count: 2, results: [
      block(1, 'Kept card', { id: 4, username: 'ada' }),
      block(2, 'Orphan card', null),
    ] })
    render(<LanguageProvider><AdminBlocks /></LanguageProvider>)
    const orphan = (await screen.findByText('Orphan card')).closest('li')
    expect(orphan).toHaveTextContent('Yazarı silinmiş, kütüphanede değil')
    expect(orphan).toHaveTextContent('Silinmiş hesap')
    const kept = screen.getByText('Kept card').closest('li')
    expect(kept).not.toHaveTextContent('Yazarı silinmiş')
    expect(kept).toHaveTextContent('@ada')
  })
})

describe('a block row', () => {
  it('says which block its buttons act on', async () => {
    listAdminComponents.mockResolvedValue({ count: 1, results: [{ ...block(3, 'Pricing card', { id: 4, username: 'ada' }), use_count: 2 }] })
    render(<LanguageProvider><AdminBlocks /></LanguageProvider>)
    expect(await screen.findByRole('button', { name: 'Bloğu listeden kaldır' })).toHaveAccessibleDescription('Pricing card')
    expect(screen.getByRole('button', { name: 'Her yerden sil' })).toHaveAccessibleDescription('Pricing card')
  })
})

