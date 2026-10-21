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
import { FolderOpenIcon, PlusIcon } from '../components/icons.jsx'
import { useLanguage } from '../i18n/useLanguage.js'
import { useDocumentTitle } from '../utils/useDocumentTitle.js'
import WorkspaceLayout from '../components/dashboard/WorkspaceLayout.jsx'
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState.jsx'
import '../ui/sites-design.css'

const PINNED_PROJECTS_KEY = 'pwb_pinned_projects'
const SORT_KEY = 'pwb_sites_sort'
const VIEW_KEY = 'pwb_sites_view'
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

function initialView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
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
  const [siteView, setSiteView] = useState(initialView)
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

  function chooseView(value) {
    setSiteView(value)
    remember(VIEW_KEY, value)
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

  const heading = (
    <div className="workspace-heading">
      <div className="min-w-0">
        <h1 id="sites-heading">{t('My sites')}</h1>
        <p>{t('Create, search, and manage every site you own.')}</p>
      </div>
      <div className="workspace-heading-actions">
        <Link to="/code" className="studio-btn studio-btn-secondary"><FolderOpenIcon size={16} /> {t('Open local project')}</Link>
        <button type="button" onClick={openCreate} aria-haspopup="dialog" aria-expanded={createOpen} className="studio-btn studio-btn-primary studio-create-trigger"><PlusIcon size={16} /> {t('Create new site')}</button>
      </div>
    </div>
  )

  const sidebar = (
    <>
      <section className="workspace-sidebar-section">
        <h2>{t('Filter projects')}</h2>
        {allSites.length > 0 && (
          <div role="group" aria-label={t('Filter projects')} className="sites-filters">
            {FILTERS.filter(([id]) => id !== 'pinned' || counts.pinned > 0 || siteFilter === 'pinned').map(([id, label]) => (
              <button key={id} type="button" onClick={() => setSiteFilter(id)} aria-pressed={siteFilter === id} className="workspace-filter">
                <span>{t(label)}</span>{' '}<span className="tabular-nums">{counts[id]}</span>
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="workspace-sidebar-section">
        <h2>{t('Sort projects')}</h2>
        <select aria-label={t('Sort projects')} value={siteSort} onChange={(event) => chooseSort(event.target.value)} className="studio-input sites-sort">
          <option value="updated">{t('Recently updated')}</option>
          <option value="name">{t('Name')}</option>
          <option value="views">{t('Most viewed')}</option>
          <option value="favorites">{t('Most favorited')}</option>
        </select>
      </section>
    </>
  )

  return (
    <div className="dashboard-page workspace-page sites-design">
      <a href="#sites-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-[var(--studio-panel-raised)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--studio-accent-hover)] focus:shadow-lg">{t('Skip to content')}</a>
      <DashboardHeader current="projects" />
      <WorkspaceLayout id="sites-main" heading={heading} sidebar={sidebar} sidebarLabel={t('Project filters')}>
        <section aria-labelledby="sites-heading">
          <dl className="sites-summary" aria-label={t('Workspace')} aria-busy={sites === null}>
            {[['Sites', counts.all], ['Published', counts.published], ['Total views', stats.views], ['Favorites', stats.favorites]].map(([label, value]) => (
              <div key={label} className="dashboard-figure"><dt>{t(label)}</dt><dd>{sites === null ? '…' : Number(value).toLocaleString()}</dd></div>
            ))}
          </dl>

          {error && <div role="alert" className="studio-status-danger mb-5 rounded-lg border px-4 py-3 text-sm">{error}</div>}
          {allSites.length > 0 && (
            <div className="sites-toolbar">
              <DashboardSearch value={query} onChange={setQuery} label={t('Search your sites…')} placeholder={t('Search your sites…')} className="sites-search" />
              <div role="group" aria-label={t('View mode')} className="sites-view-toggle">
                <button type="button" aria-pressed={siteView === 'grid'} onClick={() => chooseView('grid')}>{t('Card view')}</button>
                <button type="button" aria-pressed={siteView === 'list'} onClick={() => chooseView('list')}>{t('List view')}</button>
              </div>
            </div>
          )}

          {loadError ? (
            <div role="alert" className="workspace-panel p-8 text-center"><p className="mb-4 text-sm text-[var(--studio-text-muted)]">{loadError}</p><button type="button" className="studio-btn studio-btn-secondary" onClick={retryLoad}>{t('Try again')}</button></div>
          ) : sites === null ? (
            <div role="status" aria-label={t('Loading…')} className="workspace-grid">
              {[0, 1, 2].map((item) => <div key={item} className="workspace-panel"><div className="h-44 bg-[var(--studio-control)]" /><div className="p-5"><div className="h-4 w-2/3 rounded bg-[var(--studio-control)]" /><div className="mt-3 h-3 w-1/2 rounded bg-[var(--studio-control)]" /></div></div>)}
            </div>
          ) : allSites.length === 0 ? (
            <DashboardEmptyState kind="sites" title={t('No sites yet')} description={t('Choose a template, use AI, or bring your own HTML.')}>
              <button type="button" onClick={openCreate} aria-haspopup="dialog" aria-expanded={createOpen} className="studio-btn studio-btn-primary studio-create-trigger"><PlusIcon size={16} /> {t('Create your first project')}</button>
            </DashboardEmptyState>
          ) : visibleSites.length === 0 ? (
            <DashboardEmptyState kind="search" title={t('No results found.')} description={emptyViewText}>
              <button type="button" onClick={showAll} className="studio-btn studio-btn-secondary">{t('Show all sites')}</button>
            </DashboardEmptyState>
          ) : (
            <div className={siteView === 'list' ? 'sites-list' : 'workspace-grid'}>
              {showCreateTile && (
                <button type="button" onClick={openCreate} aria-haspopup="dialog" aria-expanded={createOpen}
                  aria-labelledby="new-site-tile-name" aria-describedby="new-site-tile-hint" className="studio-create-trigger sites-create-tile">
                  <span><PlusIcon size={22} /></span>
                  <span id="new-site-tile-name">{t('New site')}</span>
                  <span id="new-site-tile-hint">{t('Choose a template, use AI, or bring your own HTML.')}</span>
                </button>
              )}
              {visibleSites.map((site) => <OwnerSiteCard key={site.id} site={site} view={siteView} isPinned={pinnedIds.has(site.id)} onTogglePin={onTogglePin}
                onDelete={({ id }) => onDelete(id)} onDuplicate={onDuplicate} onExport={onExport} busyAction={busyAction} />)}
            </div>
          )}
        </section>
      </WorkspaceLayout>
      <CreateSiteWizard open={createOpen} origin={createOrigin} onClose={() => setCreateOpen(false)} onCreated={(site) => navigate(`/editor/${site.id}`)} />
      {guestDialog}
    </div>
  )
}
