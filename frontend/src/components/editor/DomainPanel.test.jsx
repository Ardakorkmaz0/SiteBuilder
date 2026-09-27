import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import DomainPanel from './DomainPanel.jsx'
import { configureDomain, getDomainSetup, verifyDomain } from '../../api/sites.js'

vi.mock('../../api/sites.js', () => ({ getDomainSetup: vi.fn(), configureDomain: vi.fn(), verifyDomain: vi.fn() }))

const RECORDS = [
  { type: 'TXT', name: '_sitebuilder.shop.ada.example', value: 'sitebuilder-verification=account-site-token', purpose: 'ownership' },
  { type: 'CNAME', name: 'shop.ada.example', value: 'sites.example.com', purpose: 'routing' },
  { type: 'A', name: 'shop.ada.example', value: '203.0.113.9', purpose: 'routing' },
]
const empty = { domain: '', status: 'not_connected', records: [], checked: null, target_configured: true, is_published: false, ssl_status: 'not_connected' }
const saved = { ...empty, domain: 'shop.ada.example', status: 'pending', records: RECORDS, ssl_status: 'waiting_for_dns' }
const connected = { ...saved, status: 'connected', checked: 'ok', ssl_status: 'pending_certificate' }

function panel(props = {}) {
  return <UiThemeProvider><LanguageProvider><DomainPanel siteId={4} {...props} /></LanguageProvider></UiThemeProvider>
}
async function loadPanel(data = empty, props = {}) {
  getDomainSetup.mockResolvedValueOnce(data)
  const result = render(panel(props))
  await waitFor(() => expect(screen.getByRole('textbox')).toBeEnabled())
  return result
}
function deferred() {
  let resolve
  let reject
  const promise = new Promise((accept, fail) => { resolve = accept; reject = fail })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue() } })
})

describe('custom-domain setup', () => {
  it('waits for the saved settings before enabling domain actions', async () => {
    const request = deferred()
    getDomainSetup.mockReturnValueOnce(request.promise)
    render(panel())
    expect(screen.getByRole('status')).toHaveTextContent('Loading domain settings…')
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save domain' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Check now' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Disconnect domain' })).not.toBeInTheDocument()
    await act(async () => request.resolve(empty))
    expect(screen.getByRole('textbox')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Save domain' })).toBeDisabled()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  it('saves the domain and shows ownership plus routing records for its exact hostname', async () => {
    configureDomain.mockResolvedValue(saved)
    const onStatus = vi.fn()
    await loadPanel(empty, { onStatus })
    fireEvent.change(screen.getByLabelText('Your domain'), { target: { value: '  SHOP.ada.example  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save domain' }))
    await waitFor(() => expect(configureDomain).toHaveBeenCalledWith(4, 'SHOP.ada.example'))
    const table = await screen.findByRole('table', { name: 'DNS records for shop.ada.example' })
    expect(within(table).getByText('_sitebuilder.shop.ada.example')).toBeInTheDocument()
    expect(within(table).getAllByText('shop.ada.example')).toHaveLength(2)
    expect(within(table).getByText('sitebuilder-verification=account-site-token')).toBeInTheDocument()
    expect(screen.getByLabelText('Your domain')).toHaveValue('shop.ada.example')
    expect(screen.getByText(/CNAME and A are alternatives/)).toBeInTheDocument()
    expect(onStatus).toHaveBeenCalledWith(saved)
  })

  it('keeps a connected draft distinct from published pages and HTTPS readiness', async () => {
    verifyDomain.mockResolvedValue(connected)
    await loadPanel(saved)
    fireEvent.click(screen.getByRole('button', { name: 'Check now' }))
    expect(await screen.findByText('Domain ownership and routing verified.')).toBeInTheDocument()
    expect(screen.getByText(/this site is still a draft/)).toBeInTheDocument()
    expect(screen.getByText(/HTTPS certificate issuance is pending/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('offers an explicit HTTPS test for published pages without claiming the certificate is ready', async () => {
    await loadPanel({ ...connected, is_published: true })
    expect(screen.getByRole('link', { name: 'Test HTTPS connection' })).toHaveAttribute('href', 'https://shop.ada.example')
    expect(screen.getByText(/DNS verification alone does not confirm/)).toBeInTheDocument()
    expect(screen.queryByText(/issued automatically on the first visit/)).not.toBeInTheDocument()
  })

  it.each([
    ['ownership_missing', 'The ownership TXT record was not found.'],
    ['ownership_mismatch', 'The ownership TXT record does not match this site.'],
    ['not_resolving', 'The domain does not resolve yet.'],
    ['points_elsewhere', 'The domain resolves somewhere else.'],
    ['dns_error', 'The DNS check could not finish.'],
  ])('explains the next action after %s', async (checked, message) => {
    verifyDomain.mockResolvedValue({ ...saved, checked })
    await loadPanel(saved)
    fireEvent.click(screen.getByRole('button', { name: 'Check now' }))
    expect(await screen.findByText((content) => content.startsWith(message))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check now' })).toBeEnabled()
  })

  it('explains missing hosting configuration and prevents a check that cannot succeed', async () => {
    await loadPanel({ ...saved, target_configured: false, records: [RECORDS[0]] })
    expect(screen.getByText(/Domain hosting is not configured yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check now' })).toBeDisabled()
    expect(screen.getByText('sitebuilder-verification=account-site-token')).toBeInTheDocument()
    expect(verifyDomain).not.toHaveBeenCalled()
  })

  it('lets a failed initial load be retried without treating the failure as a disconnected site', async () => {
    getDomainSetup.mockRejectedValueOnce({}).mockResolvedValueOnce(saved)
    render(panel())
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the domain settings.')
    expect(screen.getByRole('textbox')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('shop.ada.example'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check now' })).toBeEnabled()
  })

  it('preserves settings after a request error and allows another verification', async () => {
    verifyDomain.mockRejectedValueOnce({ response: { data: { detail: 'Please retry the DNS check.' } } }).mockResolvedValueOnce(connected)
    await loadPanel(saved)
    fireEvent.click(screen.getByRole('button', { name: 'Check now' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please retry the DNS check.')
    expect(screen.getByText('sitebuilder-verification=account-site-token')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Check now' }))
    expect(await screen.findByText('Domain ownership and routing verified.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('uses separate pending labels and prevents repeated mutations', async () => {
    const request = deferred()
    configureDomain.mockReturnValueOnce(request.promise)
    await loadPanel(saved)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new.ada.example' } })
    const save = screen.getByRole('button', { name: 'Save domain' })
    fireEvent.click(save)
    fireEvent.click(save)
    expect(configureDomain).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Check now' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Disconnect domain' })).toBeDisabled()
    expect(screen.getByRole('textbox')).toBeDisabled()
    await act(async () => request.resolve({ ...saved, domain: 'new.ada.example' }))
    expect(screen.getByRole('textbox')).toBeEnabled()
  })

  it('disconnects through its own action and clears old records only after success', async () => {
    const request = deferred()
    configureDomain.mockReturnValueOnce(request.promise)
    const onStatus = vi.fn()
    await loadPanel(saved, { onStatus })
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect domain' }))
    expect(configureDomain).toHaveBeenCalledWith(4, '')
    expect(screen.getByRole('button', { name: 'Disconnecting…' })).toBeDisabled()
    expect(screen.getByRole('table')).toBeInTheDocument()
    await act(async () => request.resolve(empty))
    expect(screen.getByRole('textbox')).toHaveValue('')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Disconnect domain' })).not.toBeInTheDocument()
    expect(onStatus).toHaveBeenCalledWith(empty)
  })

  it('does not check the old hostname while unsaved edits are displayed', async () => {
    await loadPanel(saved)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } })
    expect(screen.getByRole('button', { name: 'Save domain' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Check now' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Disconnect domain' })).toBeEnabled()
    expect(screen.getByText(/records below belong to your saved domain/)).toBeInTheDocument()
    expect(configureDomain).not.toHaveBeenCalled()
  })

  it('ignores a late initial response after switching sites', async () => {
    const request = deferred()
    getDomainSetup.mockReturnValueOnce(request.promise).mockResolvedValueOnce(empty)
    const view = render(panel())
    view.rerender(panel({ siteId: 5 }))
    await waitFor(() => expect(screen.getByRole('textbox')).toBeEnabled())
    await act(async () => request.resolve(connected))
    expect(screen.getByRole('textbox')).toHaveValue('')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('does not apply an earlier site mutation to the next site', async () => {
    const request = deferred()
    verifyDomain.mockReturnValueOnce(request.promise)
    const onStatus = vi.fn()
    const view = await loadPanel(saved, { onStatus })
    fireEvent.click(screen.getByRole('button', { name: 'Check now' }))
    getDomainSetup.mockResolvedValueOnce(empty)
    view.rerender(panel({ siteId: 5, onStatus }))
    await waitFor(() => expect(screen.getByRole('textbox')).toBeEnabled())
    await act(async () => request.resolve(connected))
    expect(onStatus).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('reports clipboard rejection instead of falsely reporting a successful copy', async () => {
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('denied'))
    await loadPanel(saved)
    fireEvent.click(screen.getByRole('button', { name: `Copy TXT record: ${RECORDS[0].value}` }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not copy the DNS value. Select and copy it manually.')
    expect(screen.queryByText('Copied')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: `Copy TXT record: ${RECORDS[0].value}` }))
    await waitFor(() => expect(screen.getByRole('button', { name: `Copy TXT record: ${RECORDS[0].value}` })).toHaveTextContent('Copied'))
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(RECORDS[0].value)
  })

  it('identifies and copies each address separately when DNS has multiple A records', async () => {
    await loadPanel({ ...saved, records: [RECORDS[0], RECORDS[2], { ...RECORDS[2], value: '203.0.113.10' }] })
    const first = screen.getByRole('button', { name: 'Copy A record: 203.0.113.9' })
    const second = screen.getByRole('button', { name: 'Copy A record: 203.0.113.10' })
    fireEvent.click(second)
    await waitFor(() => expect(second).toHaveTextContent('Copied'))
    expect(first).toHaveTextContent('Copy')
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith('203.0.113.10')
    fireEvent.click(first)
    await waitFor(() => expect(first).toHaveTextContent('Copied'))
    expect(second).toHaveTextContent('Copy')
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith('203.0.113.9')
  })

  it('refreshes the displayed hostname when another session changes it during verification', async () => {
    const latest = { ...saved, domain: 'new.ada.example', checked: 'domain_changed', records: [{ ...RECORDS[0], name: '_sitebuilder.new.ada.example', value: 'sitebuilder-verification=new-token' }] }
    verifyDomain.mockRejectedValueOnce({ response: { status: 409, data: latest } })
    const onStatus = vi.fn()
    await loadPanel(saved, { onStatus })
    fireEvent.click(screen.getByRole('button', { name: 'Check now' }))
    expect(await screen.findByText(/domain changed while the check was running/)).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('new.ada.example')
    expect(screen.getByText('_sitebuilder.new.ada.example')).toBeInTheDocument()
    expect(screen.queryByText('sitebuilder-verification=account-site-token')).not.toBeInTheDocument()
    expect(onStatus).toHaveBeenCalledWith(latest)
  })

  it('removes a previous connection claim when a new check fails', async () => {
    verifyDomain.mockResolvedValue({ ...saved, checked: 'ownership_mismatch' })
    await loadPanel({ ...connected, is_published: true })
    fireEvent.click(screen.getByRole('button', { name: 'Check now' }))
    await screen.findByText(/ownership TXT record does not match/)
    expect(screen.queryByText('Domain ownership and routing verified.')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('provides Turkish ownership, pending HTTPS, and draft explanations', async () => {
    localStorage.setItem('pwb_language', 'tr')
    await loadPanel(connected)
    expect(screen.getByRole('button', { name: 'Alan adı bağlantısını kes' })).toBeInTheDocument()
    expect(screen.getByText('Alan adı sahipliği ve yönlendirmesi doğrulandı.')).toBeInTheDocument()
    expect(screen.getByText(/bu site hâlâ taslak/)).toBeInTheDocument()
    expect(screen.getByText(/HTTPS sertifikası henüz hazırlanmadı/)).toBeInTheDocument()
  })
})