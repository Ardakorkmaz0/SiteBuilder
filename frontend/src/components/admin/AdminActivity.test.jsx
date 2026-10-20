import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import AdminActivity from './AdminActivity.jsx'
import { listAdminActivity } from '../../api/admin.js'

vi.mock('../../api/admin.js', () => ({ listAdminActivity: vi.fn() }))

const entry = (id, action, label, detail) => ({
  id, action, label, detail, at: '2026-10-20T00:00:00Z', source: 'console',
  actor: { id: 1, username: 'mod' }, target: { type: 'site', id: '8', repr: 'Ada site (ada)' },
})

beforeEach(() => {
  localStorage.setItem('pwb_language', 'tr')
  vi.clearAllMocks()
})

describe('the activity log', () => {
  it('says what the server wrote in English in the console language', async () => {
    listAdminActivity.mockResolvedValue({ count: 3, results: [
      entry(1, 'site.delete', 'Deleted the site', 'Owner @ada'),
      entry(2, 'report.resolve', 'Resolved a report', 'Report 12 (copyright)'),
      entry(3, 'component.purge', 'Took the block down and removed its copies', '4 copies removed'),
    ] })
    render(<LanguageProvider><AdminActivity onOpen={vi.fn()} /></LanguageProvider>)
    expect(await screen.findByText('· Sahibi: @ada')).toBeInTheDocument()
    expect(screen.getByText('· 12 numaralı şikâyet: Telif ihlali veya kimliğe bürünme')).toBeInTheDocument()
    expect(screen.getByText('· 4 kopya silindi')).toBeInTheDocument()
  })
})
