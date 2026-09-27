import { useEffect, useRef, useState } from 'react'
import { configureDomain, getDomainSetup, verifyDomain } from '../../api/sites.js'
import { apiError } from '../../utils/errors.js'
import { useLanguage } from '../../i18n/useLanguage.js'

const STEP = { DOMAIN: 1, DNS: 2, VERIFY: 3, LIVE: 4 }
const CHECK_REASON = {
  not_resolving: 'The domain does not resolve yet. DNS changes can take a few minutes to a few hours.',
  points_elsewhere: 'The domain resolves somewhere else. Check the record values above. An old A or CNAME record may still be there.',
  target_unknown: 'Domain hosting is not configured yet. Contact the site administrator before checking the connection.',
  ownership_missing: 'The ownership TXT record was not found. Add the TXT record shown above, then check again.',
  ownership_mismatch: 'The ownership TXT record does not match this site. Replace it with the value shown above, then check again.',
  dns_error: 'The DNS check could not finish. Your settings are saved; try again shortly.',
  no_domain: 'Add a domain first.',
  domain_changed: 'The domain changed while the check was running. The latest settings are shown; review them and check again.',
}

function Step({ index, current, title, children }) {
  const done = current > index
  const active = current === index
  return (
    <li aria-current={active ? 'step' : undefined} className={`rounded-2xl border p-4 ${active ? 'border-[var(--studio-accent)]' : 'border-[var(--studio-border)]'}`}>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? 'bg-[var(--studio-success)] text-[var(--studio-panel)]' : active ? 'bg-[var(--studio-accent)] text-white' : 'bg-[var(--studio-control)] text-[var(--studio-text-muted)]'}`}>
          {done ? '✓' : index}
        </span>
        <h4 className="text-sm font-bold text-[var(--studio-text)]">{title}</h4>
      </div>
      <div className="mt-3 space-y-3 sm:pl-8">{children}</div>
    </li>
  )
}

// Remount on site changes so an earlier site's requests cannot overwrite this one.
export default function DomainPanel(props) {
  return <DomainConnection key={props.siteId} {...props} />
}

function DomainConnection({ siteId, onStatus }) {
  const { t } = useLanguage()
  const [setup, setSetup] = useState(null)
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState('')
  const mounted = useRef(false)
  const pending = useRef(false)
  const copyTimer = useRef(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimeout(copyTimer.current)
    }
  }, [])

  useEffect(() => {
    let alive = true
    getDomainSetup(siteId)
      .then((data) => {
        if (!alive) return
        setSetup(data)
        setDomain(data.domain || '')
      })
      .catch((err) => {
        if (alive) setError({ cause: err, fallback: 'Could not load the domain settings.' })
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [siteId, reload])

  async function run(action, work, fallback) {
    if (pending.current) return
    pending.current = true
    setBusy(action)
    setError(null)
    try {
      const data = await work()
      if (!mounted.current) return
      setSetup(data)
      setDomain(data.domain || '')
      setCopied('')
      onStatus?.(data)
    } catch (err) {
      if (!mounted.current) return
      const latest = err?.response?.data
      if (err?.response?.status === 409 && latest?.checked === 'domain_changed') {
        setSetup(latest)
        setDomain(latest.domain || '')
        setCopied('')
        onStatus?.(latest)
      } else {
        setError({ cause: err, fallback })
      }
    } finally {
      pending.current = false
      if (mounted.current) setBusy('')
    }
  }

  async function copy(value, key) {
    setError(null)
    clearTimeout(copyTimer.current)
    setCopied('')
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      if (!mounted.current) return
      setCopied(key)
      copyTimer.current = setTimeout(() => setCopied(''), 1500)
    } catch {
      if (mounted.current) setError({ fallback: 'Could not copy the DNS value. Select and copy it manually.' })
    }
  }

  const connected = setup?.status === 'connected'
  const disabled = loading || Boolean(busy) || !setup
  const changed = Boolean(setup) && domain.trim() !== (setup.domain || '')
  const targetConfigured = setup?.target_configured === true
  const step = !setup?.domain ? STEP.DOMAIN : connected ? STEP.LIVE : setup?.checked ? STEP.VERIFY : STEP.DNS

  return (
    <div className="space-y-4" aria-busy={loading || Boolean(busy)}>
      {loading && <p role="status" className="text-sm text-[var(--studio-text-muted)]">{t('Loading domain settings…')}</p>}
      {error && <div role="alert" className="studio-status-danger rounded-lg border px-3 py-2 text-sm">{apiError(error.cause, t(error.fallback))}</div>}
      {!loading && !setup && (
        <button type="button" className="ms-btn ms-btn-secondary min-h-11" onClick={() => { setError(null); setLoading(true); setReload((value) => value + 1) }}>{t('Try again')}</button>
      )}
      {setup && !targetConfigured && <p role="status" className="studio-status-warning rounded-lg border px-3 py-2 text-sm">{t(CHECK_REASON.target_unknown)}</p>}

      <ol className="space-y-3">
        <Step index={STEP.DOMAIN} current={step} title={t('1. Enter your domain')}>
          <p className="text-xs text-[var(--studio-text-muted)]">{t('Enter the hostname without http:// or a path. For example: www.your-domain.com')}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={domain} disabled={disabled} onChange={(event) => setDomain(event.target.value)} placeholder="www.example.com" aria-label={t('Your domain')} autoCapitalize="none" autoCorrect="off" spellCheck={false} className="ms-input min-h-11 min-w-0 flex-1" />
            <button type="button" disabled={disabled || !domain.trim() || !changed} onClick={() => run('save', () => configureDomain(siteId, domain.trim()), 'Could not save the domain.')} className="ms-btn ms-btn-primary min-h-11 shrink-0 px-5">
              {t(busy === 'save' ? 'Saving…' : 'Save domain')}
            </button>
          </div>
          {setup?.domain && (
            <button type="button" disabled={disabled} onClick={() => run('disconnect', () => configureDomain(siteId, ''), 'Could not disconnect the domain.')} className="ms-btn ms-btn-secondary min-h-11 text-[var(--studio-danger)]">
              {t(busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect domain')}
            </button>
          )}
          {changed && <p className="text-xs text-[var(--studio-warning)]">{t('Save your changes before checking the connection. The records below belong to your saved domain.')}</p>}
        </Step>

        <Step index={STEP.DNS} current={step} title={t('2. Add these records at your domain provider')}>
          {!setup?.domain ? <p className="text-xs text-[var(--studio-text-muted)]">{t('Enter a domain first.')}</p> : (
            <>
              <p className="text-xs text-[var(--studio-text-muted)]">{t('Add the TXT record to prove ownership, plus one routing option for the exact domain below. Keep the TXT record after verification.')}</p>
              <p className="text-xs text-[var(--studio-text-muted)]">{t('Record names are full addresses. If your provider adds your domain automatically, enter only the part before it. CNAME and A are alternatives; do not add both at the same name.')}</p>
              <div className="overflow-x-auto">
                <table role="table" className="block w-full text-left text-sm sm:table">
                  <caption className="sr-only">{t('DNS records for {domain}', { domain: setup.domain })}</caption>
                  <thead role="rowgroup" className="sr-only text-xs uppercase text-[var(--studio-text-muted)] sm:not-sr-only"><tr role="row"><th role="columnheader" scope="col" className="py-2">{t('Type')}</th><th role="columnheader" scope="col">{t('Name')}</th><th role="columnheader" scope="col">{t('Value')}</th><th role="columnheader" scope="col"><span className="sr-only">{t('Copy')}</span></th></tr></thead>
                  <tbody role="rowgroup" className="block sm:table-row-group">
                    {(setup.records || []).map((record) => {
                      const key = `${record.type}-${record.name}-${record.value}`
                      return <tr role="row" key={key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-t border-[var(--studio-border)] py-3 sm:table-row sm:py-0">
                        <th role="rowheader" scope="row" className="order-1 self-center text-left font-bold sm:order-none sm:py-3 sm:pr-3">{record.type}<span className="mt-1 block text-xs font-normal text-[var(--studio-text-muted)]">{t(record.purpose === 'ownership' ? 'Ownership' : 'Routing')}</span></th>
                        <td role="cell" className="order-3 col-span-2 min-w-0 break-all py-2 font-mono text-xs sm:order-none sm:max-w-48 sm:py-3 sm:pr-3"><span aria-hidden="true" className="mb-1 block font-sans text-[var(--studio-text-muted)] sm:hidden">{t('Name')}</span>{record.name}</td>
                        <td role="cell" className="order-4 col-span-2 min-w-0 break-all py-2 font-mono text-xs sm:order-none sm:max-w-64 sm:py-3 sm:pr-3"><span aria-hidden="true" className="mb-1 block font-sans text-[var(--studio-text-muted)] sm:hidden">{t('Value')}</span>{record.value}{record.note && <p className="mt-1 font-sans text-[var(--studio-text-muted)]">{t(record.note)}</p>}</td>
                        <td role="cell" className="order-2 text-right sm:order-none"><button type="button" onClick={() => copy(record.value, key)} aria-label={t('Copy {type} record: {value}', { type: record.type, value: record.value })} className="min-h-11 min-w-11 px-2 text-xs font-semibold text-[var(--studio-accent-hover)]">{t(copied === key ? 'Copied' : 'Copy')}</button></td>
                      </tr>
                    })}
                  </tbody>
                </table>
              </div>
              <span role="status" className="sr-only">{copied ? t('Copied') : ''}</span>
            </>
          )}
        </Step>

        <Step index={STEP.VERIFY} current={step} title={t('3. Check the connection')}>
          <p className="text-xs text-[var(--studio-text-muted)]">{t('DNS updates can take a few minutes to a few hours. Your settings stay saved while you wait. Check again when your records have updated.')}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={disabled || !setup?.domain || !targetConfigured || changed} onClick={() => run('verify', () => verifyDomain(siteId), 'Could not check the domain.')} className="ms-btn ms-btn-secondary min-h-11 px-5">{t(busy === 'verify' ? 'Checking…' : 'Check now')}</button>
            {setup?.checked && setup.checked !== 'ok' && setup.checked !== 'target_unknown' && <span role="status" className="text-xs text-[var(--studio-warning)]">{t(CHECK_REASON[setup.checked] || 'The DNS check could not finish. Your settings are saved; try again shortly.')}</span>}
            {connected && <span role="status" className="text-xs text-[var(--studio-success)]">{t('Domain ownership and routing verified.')}</span>}
          </div>
        </Step>

        <Step index={STEP.LIVE} current={step} title={t('4. Publish and open your domain')}>
          {connected ? (
            <>
              <p className="break-all text-sm font-semibold text-[var(--studio-text)]">{setup.domain}</p>
              {!setup.is_published ? <p className="text-sm text-[var(--studio-warning)]">{t('Your domain is connected, but this site is still a draft. Publish the site to make its pages available here.')}</p> : <p className="text-xs text-[var(--studio-text-muted)]">{t('Your published pages are ready to be served on this domain.')}</p>}
              <p className="text-xs text-[var(--studio-text-muted)]">{t(setup.ssl_status === 'pending_certificate' ? 'HTTPS certificate issuance is pending. DNS verification alone does not confirm a working HTTPS connection.' : 'HTTPS readiness has not been confirmed.')}</p>
              {setup.is_published && <a href={`https://${setup.domain}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center py-2 text-sm font-semibold text-[var(--studio-accent-hover)] underline">{t('Test HTTPS connection')}</a>}
            </>
          ) : <p className="text-xs text-[var(--studio-text-muted)]">{t('Verify ownership and routing first, then publish your site. HTTPS also requires the hosting server to issue a certificate.')}</p>}
        </Step>
      </ol>
      <p className="text-xs text-[var(--studio-text-muted)]">{t('Only your published pages appear on your domain. The editor and your account stay on this platform.')}</p>
    </div>
  )
}