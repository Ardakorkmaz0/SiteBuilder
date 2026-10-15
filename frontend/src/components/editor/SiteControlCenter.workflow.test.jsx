import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import SiteControlCenter from './SiteControlCenter.jsx'
import { deleteSiteSubmission, getSiteAnalytics, listSiteComments, listSiteSubmissions, regenerateReviewLink, resolveSiteComment, updateSiteSubmission } from '../../api/sites.js'

vi.mock('../../api/sites.js', () => ({
  deleteSiteSubmission: vi.fn(), getSiteAnalytics: vi.fn(), listSiteComments: vi.fn(),
  listSiteSubmissions: vi.fn(), patchSite: vi.fn(), regenerateReviewLink: vi.fn(),
  resolveSiteComment: vi.fn(), updateSiteSubmission: vi.fn(),
}))
vi.mock('../../utils/useGuestGate.jsx', () => ({ useGuestGate: () => ({ isGuest: false, gate: () => false, dialog: null }) }))
vi.mock('./SharePanel.jsx', () => ({ default: () => <div>Sharing controls</div> }))
vi.mock('./DomainPanel.jsx', () => ({ default: () => null }))

const failure = () => ({ response: { data: { detail: 'Please retry this action.' } } })
const submission = { id: 12, created_at: '2026-10-15T12:00:00Z', page: 'Contact', data: { message: 'Message from client' }, is_read: false }
const comment = { id: 9, author_name: 'Client', page_id: 'home', body: 'Change this heading.', resolved: false }
function show(initialTab = 'inbox') {
  return render(<LanguageProvider><SiteControlCenter
    open initialTab={initialTab} onClose={vi.fn()}
    site={{ id: 7, title: 'Site', site_options: {}, review_token: 'review' }}
    schema={{ pages: [{ id: 'home', name: 'Home', components: [] }] }} pageHtmlMap={{}}
    onSitePatch={vi.fn()} onHtmlContentChange={vi.fn()} onSchemaContentChange={vi.fn()}
  /></LanguageProvider>)
}

describe('control centre workflow failures and retry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('pwb_language', 'en')
    listSiteSubmissions.mockResolvedValue([submission])
    listSiteComments.mockResolvedValue([comment])
    getSiteAnalytics.mockResolvedValue({ total_views: 1, last_30_days: 1, daily: [], devices: [], referrers: [] })
    updateSiteSubmission.mockResolvedValue({ ...submission, is_read: true })
    deleteSiteSubmission.mockResolvedValue({})
    resolveSiteComment.mockResolvedValue({ ...comment, resolved: true })
    regenerateReviewLink.mockResolvedValue({ review_token: 'replacement' })
  })

  it.each([['inbox', 'Inbox', 'Message from client'], ['analytics', 'Analytics', 'Total views'], ['feedback', 'Share', 'Change this heading.']])('clicking the active %s tab does not leave a permanent loader', async (initialTab, label, content) => {
    show(initialTab)
    await screen.findByText(content)
    fireEvent.click(screen.getByRole('button', { name: label, exact: true }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it.each([
    ['Mark read', updateSiteSubmission, 'Mark unread'],
    ['Delete', deleteSiteSubmission, 'No form submissions yet.'],
  ])('reports a failed %s action and lets it be retried', async (label, action, result) => {
    action.mockRejectedValueOnce(failure())
    show()
    fireEvent.click(await screen.findByRole('button', { name: label, exact: true }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please retry this action.')
    expect(screen.getByText('Message from client')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: label, exact: true }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(screen.getByText(result)).toBeInTheDocument()
  })

  it('keeps conflicting inbox actions disabled until the current request finishes', async () => {
    let complete
    updateSiteSubmission.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve }))
    show()
    const mark = await screen.findByRole('button', { name: 'Mark read', exact: true })
    fireEvent.click(mark)
    expect(mark).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete', exact: true })).toBeDisabled()
    fireEvent.click(mark)
    expect(updateSiteSubmission).toHaveBeenCalledTimes(1)
    complete({ ...submission, is_read: true })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark unread', exact: true })).toBeEnabled())
  })

  it.each([
    ['Resolve', resolveSiteComment, 'Reopen'],
    ['Replace the link (the old one stops working)', regenerateReviewLink, 'Change this heading.'],
  ])('reports a failed %s action in sharing', async (label, action, result) => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    action.mockRejectedValueOnce(failure())
    show('feedback')
    await screen.findByText('Change this heading.')
    fireEvent.click(screen.getByRole('button', { name: label, exact: true }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please retry this action.')
    fireEvent.click(screen.getByRole('button', { name: label, exact: true }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(screen.getByText(result)).toBeInTheDocument()
  })
})
