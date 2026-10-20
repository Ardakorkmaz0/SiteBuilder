import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { ReportsTab } from './AdminModeration.jsx'
import { listReports } from '../../api/admin.js'

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
