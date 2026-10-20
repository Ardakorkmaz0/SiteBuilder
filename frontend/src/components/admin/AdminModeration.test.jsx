import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { ComponentReportsTab, ReportsTab } from './AdminModeration.jsx'
import { listComponentReports, listReports } from '../../api/admin.js'
import { translate } from '../../i18n/language.js'

vi.mock('../../api/admin.js', () => ({
  listReports: vi.fn(),
  resolveReport: vi.fn(),
  moderateSite: vi.fn(),
  listComponentReports: vi.fn(),
  resolveComponentReport: vi.fn(),
  moderateComponent: vi.fn(),
}))

beforeEach(() => {
  localStorage.setItem('pwb_language', 'tr')
  vi.clearAllMocks()
  listReports.mockResolvedValue({ count: 0, results: [] })
})

// The console calls a report a şikâyet; "bildirim" is a notification.
describe('an empty report queue', () => {
  it('says there are no complaints, for one status and for all of them', async () => {
    render(<LanguageProvider><ReportsTab /></LanguageProvider>)
    expect(await screen.findByText('açık durumunda şikâyet yok')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tümü', exact: true }))
    expect(await screen.findByText('Şikâyet yok')).toBeInTheDocument()
    expect(listReports).toHaveBeenLastCalledWith('all', 1)
  })
})

describe('an open site report', () => {
  it('says which site its buttons act on', async () => {
    listReports.mockResolvedValue({ count: 1, results: [{
      id: 5, reason: 'spam', reason_label: 'Spam or misleading', site_title: 'Ada Studio', site_slug: 'ada', site_owner: 'ada',
      site_published: true, detail: '', reporter_username: 'bob', created_at: '2026-10-20T00:00:00Z', status: 'open',
    }] })
    render(<MemoryRouter><LanguageProvider><ReportsTab /></LanguageProvider></MemoryRouter>)
    expect(await screen.findByRole('button', { name: 'Çözümle' })).toHaveAccessibleDescription('Ada Studio')
    expect(screen.getByRole('button', { name: 'Reddet' })).toHaveAccessibleDescription('Ada Studio')
    expect(screen.getByRole('link', { name: 'Görüntüle' })).toHaveAccessibleDescription('Ada Studio')
  })
})

describe('an open block report', () => {
  it('says which block its buttons act on', async () => {
    listComponentReports.mockResolvedValue({ count: 1, results: [{
      id: 8, reason: 'spam', reason_label: 'Spam or misleading', component_id: 3, component_title: 'Pricing card',
      component_author: 'ada', component_status: 'published', component_use_count: 2, component_html: '<p>x</p>',
      component_css: '', detail: '', reporter_username: 'bob', created_at: '2026-10-20T00:00:00Z', status: 'open',
    }] })
    render(<MemoryRouter><LanguageProvider><ComponentReportsTab /></LanguageProvider></MemoryRouter>)
    for (const name of ['Bloğu listeden kaldır', 'Her yerden sil', 'Reddet']) {
      expect(await screen.findByRole('button', { name })).toHaveAccessibleDescription('Pricing card')
    }
  })
})

// The console's own words for a report, wherever they come from.
describe('the word for a report', () => {
  it('is şikâyet in the section heading and in the server refusal', () => {
    expect(translate('tr', 'Reports')).toBe('Şikâyetler')
    expect(translate('tr', 'Report not found.')).toBe('Şikâyet bulunamadı.')
  })
})

