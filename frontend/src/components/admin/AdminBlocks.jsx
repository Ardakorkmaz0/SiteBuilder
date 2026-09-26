import { useState } from 'react'
import { listAdminComponents, moderateComponent } from '../../api/admin.js'
import { apiError } from '../../utils/errors.js'
import { useLanguage } from '../../i18n/useLanguage.js'
import { Chip, Empty, ErrorBox, FilterChips, Loading, Pager, SearchField, SectionHeading } from './adminUi.jsx'
import { formatNumber, formatRelative, useAdminData, useDebounced } from './adminData.js'

const STATUS = [
  ['all', 'All'], ['published', 'Published'], ['reported', 'Reported'],
  ['removed', 'Removed by moderation'], ['withdrawn', 'Withdrawn by the author'],
]
const STATUS_TONE = { published: 'success', removed: 'danger', withdrawn: 'neutral' }
const STATUS_LABEL = { published: 'Published', removed: 'Removed by moderation', withdrawn: 'Withdrawn by the author' }

export default function AdminBlocks() {
  const { t, language } = useLanguage()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(0)
  const [actionError, setActionError] = useState('')
  const q = useDebounced(query.trim())
  const key = JSON.stringify({ q, status, page })
  const { data, error, loading, reload } = useAdminData(() => listAdminComponents({ q, status, page }), key)
  const rows = data?.results || []

  async function act(block, action) {
    const message = {
      remove: t('Remove “{title}” from the library? Copies already taken stay where they are.', { title: block.title }),
      purge: t('Delete “{title}” from the {count} site(s) that took it? This cannot be undone.', { title: block.title, count: block.use_count }),
      restore: '',
    }[action]
    if (message && !window.confirm(message)) return
    setBusy(block.id)
    setActionError('')
    try {
      await moderateComponent(block.id, action)
      reload()
    } catch (e) {
      setActionError(apiError(e))
    } finally {
      setBusy(0)
    }
  }

  return (
    <>
      <SectionHeading title={t('Community blocks')} description={t('Every shared block, including the ones taken down or withdrawn.')} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchField label={t('Search blocks')} value={query} onChange={(value) => { setQuery(value); setPage(1) }} placeholder={t('Title or @author')} />
      </div>
      <div className="mb-5"><FilterChips label={t('Block filter')} options={STATUS} value={status} onChange={(value) => { setStatus(value); setPage(1) }} /></div>
      {actionError && <div className="mb-4"><ErrorBox message={actionError} /></div>}

      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : rows.length === 0 ? (
        <Empty title={t('No blocks in this filter.')} />
      ) : (
        <>
          <ul className="divide-y divide-[var(--studio-border)] border-y border-[var(--studio-border)]">
            {rows.map((block) => (
              <li key={block.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--studio-text)]">{block.title}</span>
                    <Chip tone={STATUS_TONE[block.status]}>{t(STATUS_LABEL[block.status] || block.status)}</Chip>
                    {block.visibility === 'private' && <Chip>{t('Private')}</Chip>}
                    {block.open_reports > 0 && <Chip tone="warning">{t('{count} open reports', { count: block.open_reports })}</Chip>}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--studio-text-muted)]">
                    @{block.author?.username || '?'} · {t('{count} uses', { count: formatNumber(block.use_count, language) })} · {t('{count} views', { count: formatNumber(block.view_count, language) })} · {formatRelative(block.created_at, language)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {block.status === 'published' && (
                    <button type="button" disabled={busy === block.id} onClick={() => act(block, 'remove')} className="studio-btn studio-btn-secondary">{t('Unlist block')}</button>
                  )}
                  {block.status === 'removed' && (
                    <button type="button" disabled={busy === block.id} onClick={() => act(block, 'restore')} className="studio-btn studio-btn-secondary">{t('Put back in the library')}</button>
                  )}
                  {block.use_count > 0 && (
                    <button
                      type="button"
                      disabled={busy === block.id}
                      onClick={() => act(block, 'purge')}
                      className="studio-btn border-[color-mix(in_srgb,var(--studio-danger)_45%,var(--studio-border))] text-[var(--studio-danger)] hover:bg-[var(--studio-danger-soft)]"
                    >
                      {t('Delete everywhere')}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pager page={page} count={data.count} onPage={setPage} />
        </>
      )}
    </>
  )
}
