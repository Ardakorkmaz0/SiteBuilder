import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listSites, deleteSite, cloneSite, getSite } from '../api/sites.js'
import { apiError } from '../utils/errors.js'
import { GUEST_SITE_LIMIT, useGuestGate } from '../utils/useGuestGate.jsx'
import { orderSites } from '../utils/siteSort.js'
import { useScrollRestore } from '../utils/useScrollRestore.js'
import OwnerSiteCard from '../components/dashboard/OwnerSiteCard.jsx'
import CreateSiteWizard from '../components/dashboard/CreateSiteWizard.jsx'
import DashboardHeader from '../components/dashboard/DashboardHeader.jsx'
import DashboardSearch from '../components/dashboard/DashboardSearch.jsx'
import { FolderIcon, FolderOpenIcon, PlusIcon } from '../components/icons.jsx'
import { useLanguage } from '../i18n/useLanguage.js'
import { useDocumentTitle } from '../utils/useDocumentTitle.js'

const PINNED_PROJECTS_KEY = 'pwb_pinned_projects'
const SORT_KEY = 'pwb_sites_sort'
const SORTS = ['updated', 'name', 'views', 'favorites']
const FILTERS = [
  ['all', 'All'],
  ['published', 'Published'],
  ['draft', 'Drafts'],
  ['pinned', 'Pinned'],
]

// Pins and the chosen order are this browser's conveniences: a private window
// or blocked storage only means starting from the defaults.
function initialPinnedProjects() {
  try {
    const stored = JSON.parse(localStorage.getItem(PINNED_PROJECTS_KEY) || '[]')
    return new Set(Array.isArray(stored) ? stored : [])
  } catch {
    return new Set()
  }
}

function initialSort() {
  try {
    const stored = localStorage.getItem(SORT_KEY)
    return SORTS.includes(stored) ? stored : 'updated'
  } catch {
    return 'updated'
  }
}

function remember(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Not remembered; the page works the same.
  }
}

export default function SitesPage() {
  const { t } = useLanguage()
  useDocumentTitle(t('My sites'))
  const navigate = useNavigate()
  const [sites, setSites] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [siteFilter, setSiteFilter] = useState('all')
  const [siteSort, setSiteSort] = useState(initialSort)
  const [pinnedIds, setPinnedIds] = useState(initialPinnedProjects)
  const [busyAction, setBusyAction] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createOrigin, setCreateOrigin] = useState(null)

  useEffect(() => {
    let alive = true
    listSites()
      .then((result) => alive && setSites(result))
      .catch((requestError) => {
        if (!alive) return
        setLoadError(apiError(requestError))
        setSites([])
      })
    return () => { alive = false }
  }, [loadAttempt])

  const allSites = useMemo(() => sites || [], [sites])
  const visibleSites = useMemo(() => orderSites(allSites, query, {
    filter: siteFilter,
    sort: siteSort,
    pinnedIds,
  }), [allSites, pinnedIds, query, siteFilter, siteSort])
  const counts = useMemo(() => ({
    all: allSites.length,
    published: allSites.filter((site) => site.published).length,
    draft: allSites.filter((site) => !site.published).length,
    pinned: allSites.filter((site) => pinnedIds.has(site.id)).length,
  }), [allSites, pinnedIds])
  const stats = useMemo(() => ({
    views: allSites.reduce((total, site) => total + (site.view_count || 0), 0),
    favorites: allSites.reduce((total, site) => total + (site.favorite_count || 0), 0),
  }), [allSites])

  useScrollRestore(sites !== null)

  // A guest at the site limit is told what an account changes, with the way to
  // one, before filling in the wizard for a site the server will not make.
  const { isGuest, gate: guestGate, dialog: guestDialog } = useGuestGate()

  function openCreate(event) {
    if (isGuest && allSites.length >= GUEST_SITE_LIMIT && guestGate('limit')) return
    const trigger = event.currentTarget
    const { left, top, width, height } = trigger.getBoundingClientRect()
    setCreateOrigin({ left, top, width, height, trigger })
    setCreateOpen(true)
  }

  function retryLoad() {
    setLoadError('')
    setSites(null)
    setLoadAttempt((attempt) => attempt + 1)
  }

  function chooseSort(value) {
    setSiteSort(value)
    remember(SORT_KEY, value)
  }

  function showAll() {
    setQuery('')
    setSiteFilter('all')
  }

  async function onDelete(id) {
    if (!window.confirm(t('Delete this site? This cannot be undone.'))) return
    setError('')
    try {
      await deleteSite(id)
      setSites((previous) => (previous || []).filter((site) => site.id !== id))
    } catch (requestError) {
      setError(apiError(requestError))
    }
  }

  function onTogglePin(site) {
    setPinnedIds((previous) => {
      const next = new Set(previous)
      if (next.has(site.id)) next.delete(site.id)
      else next.add(site.id)
      remember(PINNED_PROJECTS_KEY, JSON.stringify([...next]))
      return next
    })
  }

  async function onDuplicate(site) {
    setBusyAction(`duplicate-${site.id}`)
    setError('')
    try {
      const copy = await cloneSite(site.slug)
      setSites((previous) => [{ ...copy, favorite_count: 0 }, ...(previous || [])])
    } catch (requestError) {
      if (requestError?.response?.data?.code === 'guest_forbidden' && guestGate('limit')) return
      setError(apiError(requestError))
    } finally {
      setBusyAction('')
    }
  }

  async function onExport(site) {
    setBusyAction(`export-${site.id}`)
    setError('')
    try {
      const project = await getSite(site.id)
      const blob = new Blob([
        JSON.stringify({ format: 'sitebuilder-project', version: 1, site: project }, null, 2),
      ], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${site.slug || 'site'}.sitebuilder.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(apiError(requestError))
    } finally {
      setBusyAction('')
    }
  }

  // Said for the view that came up empty, not as a generic "nothing found".
  const trimmedQuery = query.trim()
  const emptyViewText = trimmedQuery
    ? t('No sites match “{query}”.', { query: trimmedQuery })
    : siteFilter === 'published'
      ? t('None of your sites is published yet.')
      : siteFilter === 'draft'
        ? t('Every site of yours is published.')
        : t('Pin a site from its menu to keep it at the top.')
  const showCreateTile = siteFilter === 'all' && !trimmedQuery

  return (
    <div className="dashboard-page">
      <a href="#sites-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-[var(--studio-panel-raised)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--studio-accent-hover)] focus:shadow-lg">
        {t('Skip to content')}
      </a>
      <DashboardHeader current="projects" />

      <main id="sites-main" className="dashboard-container">
        <section aria-labelledby="sites-heading">
          <div className="dashboard-section-heading">
            <div className="min-w-0">
              <h1 id="sites-heading" className="text-2xl font-semibold text-[var(--studio-text)] sm:text-3xl">{t('My sites')}</h1>
              <p className="mt-1 text-sm text-[var(--studio-text-muted)]">{t('Create, search, and manage every site you own.')}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link to="/code" className="studio-btn studio-btn-secondary min-h-10 px-4">
                <FolderOpenIcon size={16} /> {t('Open local project')}
              </Link>
              <button type="button" onClick={openCreate} aria-haspopup="dialog" aria-expanded={createOpen} className="studio-btn studio-btn-primary studio-create-trigger min-h-10 px-4">
                <PlusIcon size={16} /> {t('Create new site')}
              </button>
            </div>
          </div>

          {/* The same plain figures as the home page and the profile, so the
              numbers read as one system wherever they appear. */}
          <dl className="dashboard-section-card mb-6 grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-4" aria-label={t('Workspace')} aria-busy={sites === null}>
            {[
              ['Sites', counts.all],
              ['Published', counts.published],
              ['Total views', stats.views],
              ['Favorites', stats.favorites],
            ].map(([label, value]) => (
              <div key={label} className="dashboard-figure">
                <dt>{t(label)}</dt>
                <dd>{sites === null ? '…' : Number(value).toLocaleString()}</dd>
              </div>
            ))}
          </dl>

          {error && (
            <div role="alert" className="studio-status-danger mb-5 rounded-xl border px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {allSites.length > 0 && (
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div role="group" aria-label={t('Filter projects')} className="dashboard-filter-rail flex max-w-full gap-1.5 overflow-x-auto">
                {FILTERS.filter(([id]) => id !== 'pinned' || counts.pinned > 0 || siteFilter === 'pinned').map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSiteFilter(id)}
                    aria-pressed={siteFilter === id}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      siteFilter === id
                        ? 'border-[var(--studio-text)] bg-[var(--studio-text)] text-[var(--studio-panel-raised)]'
                        : 'border-[var(--studio-border)] bg-[var(--studio-panel-raised)] text-[var(--studio-text-muted)] hover:bg-[var(--studio-control-hover)] hover:text-[var(--studio-text)]'
                    }`}
                  >
                    {t(label)}{' '}
                    <span className="tabular-nums opacity-70">{counts[id]}</span>
                  </button>
                ))}
              </div>
              <div className="flex min-w-0 gap-2">
                <DashboardSearch
                  value={query}
                  onChange={setQuery}
                  label={t('Search your sites…')}
                  placeholder={t('Search your sites…')}
                  className="min-w-0 flex-1 lg:w-[20rem] lg:flex-none [&_input]:pr-3"
                />
                {/* Narrow on a phone, so the search beside it keeps room for
                    its own words. */}
                <select
                  aria-label={t('Sort projects')}
                  value={siteSort}
                  onChange={(event) => chooseSort(event.target.value)}
                  className="studio-input h-[2.65rem] w-[8.75rem] shrink-0 rounded-full px-3 text-xs font-semibold sm:w-auto"
                >
                  <option value="updated">{t('Recently updated')}</option>
                  <option value="name">{t('Name')}</option>
                  <option value="views">{t('Most viewed')}</option>
                  <option value="favorites">{t('Most favorited')}</option>
                </select>
              </div>
            </div>
          )}

          {loadError ? (
            <div role="alert" className="dashboard-section-card p-8 text-center">
              <p className="mb-4 text-sm text-[var(--studio-text-muted)]">{loadError}</p>
              <button type="button" className="studio-btn studio-btn-secondary px-4" onClick={retryLoad}>{t('Try again')}</button>
            </div>
          ) : sites === null ? (
            <div role="status" aria-label={t('Loading…')} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="dashboard-site-card">
                  <div className="dashboard-site-card-media"><div className="h-40 bg-[var(--studio-control)]" /></div>
                  <div className="p-4">
                    <div className="h-4 w-2/3 rounded bg-[var(--studio-control)]" />
                    <div className="mt-3 h-3 w-1/2 rounded bg-[var(--studio-control)]" />
                    <div className="mt-6 h-9 rounded-lg bg-[var(--studio-control)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : allSites.length === 0 ? (
            <div className="dashboard-section-card border-dashed px-6 py-16 text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--studio-accent-soft)] text-[var(--studio-accent-hover)]">
                <FolderIcon size={22} />
              </div>
              <h2 className="text-lg font-semibold text-[var(--studio-text)]">{t('No sites yet')}</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[var(--studio-text-muted)]">{t('Choose a template, use AI, or bring your own HTML.')}</p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                <button type="button" onClick={openCreate} aria-haspopup="dialog" aria-expanded={createOpen} className="studio-btn studio-btn-primary studio-create-trigger min-h-10 px-4">
                  <PlusIcon size={16} /> {t('Create your first project')}
                </button>
              </div>
            </div>
          ) : visibleSites.length === 0 ? (
            <div className="dashboard-section-card border-dashed px-6 py-12 text-center">
              <p className="text-sm text-[var(--studio-text-muted)]">{emptyViewText}</p>
              <button type="button" onClick={showAll} className="studio-btn studio-btn-secondary mt-4 min-h-9 px-4">{t('Show all sites')}</button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {showCreateTile && (
                <button
                  type="button"
                  onClick={openCreate}
                  aria-haspopup="dialog"
                  aria-expanded={createOpen}
                  aria-labelledby="new-site-tile-name"
                  aria-describedby="new-site-tile-hint"
                  className="studio-create-trigger group flex min-h-[18rem] flex-col items-center justify-center gap-3 rounded-[var(--studio-radius-lg)] border border-dashed border-[var(--studio-border-strong)] bg-[color-mix(in_srgb,var(--studio-panel-raised)_55%,transparent)] p-6 text-center transition-colors hover:border-[var(--studio-accent)] hover:bg-[var(--studio-accent-soft)]"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] text-[var(--studio-accent-hover)] shadow-[var(--studio-shadow-sm)] transition-colors group-hover:border-[var(--studio-accent)]">
                    <PlusIcon size={22} />
                  </span>
                  <span id="new-site-tile-name" className="text-sm font-semibold text-[var(--studio-text)]">{t('New site')}</span>
                  <span id="new-site-tile-hint" className="max-w-[16rem] text-xs leading-5 text-[var(--studio-text-muted)]">{t('Choose a template, use AI, or bring your own HTML.')}</span>
                </button>
              )}
              {visibleSites.map((site) => (
                <OwnerSiteCard
                  key={site.id}
                  site={site}
                  isPinned={pinnedIds.has(site.id)}
                  onTogglePin={onTogglePin}
                  onDelete={({ id }) => onDelete(id)}
                  onDuplicate={onDuplicate}
                  onExport={onExport}
                  busyAction={busyAction}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <CreateSiteWizard
        open={createOpen}
        origin={createOrigin}
        onClose={() => setCreateOpen(false)}
        onCreated={(site) => navigate(`/editor/${site.id}`)}
      />
      {guestDialog}
    </div>
  )
}
