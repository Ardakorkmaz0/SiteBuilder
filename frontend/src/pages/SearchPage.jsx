import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchDashboard } from '../api/search.js'
import { addFavorite, removeFavorite } from '../api/explore.js'
import DashboardHeader from '../components/dashboard/DashboardHeader.jsx'
import DashboardGlobalSearch from '../components/dashboard/DashboardGlobalSearch.jsx'
import ExploreCard from '../components/dashboard/ExploreCard.jsx'
import SearchPeople from '../components/dashboard/SearchPeople.jsx'
import WorkspaceLayout from '../components/dashboard/WorkspaceLayout.jsx'
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState.jsx'
import { useLanguage } from '../i18n/useLanguage.js'
import { useDocumentTitle } from '../utils/useDocumentTitle.js'

function SearchResults({ query, type, onFilter, heading }) {
  const { t } = useLanguage()
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreFailed, setMoreFailed] = useState(false)
  const [favoriteFailed, setFavoriteFailed] = useState(false)
  const pendingFavorites = useRef(new Set())
  const pendingPage = useRef(false)
  const validQuery = query.length >= 2

  useEffect(() => {
    if (!validQuery) return
    let alive = true
    searchDashboard(query, { mode: 'results', type, page: 1 })
      .then((response) => { if (alive) setData(response) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [query, type, validQuery, retry])

  async function loadMore() {
    if (pendingPage.current || !data?.has_more) return
    pendingPage.current = true
    setLoadingMore(true)
    setMoreFailed(false)
    try {
      const response = await searchDashboard(query, { mode: 'results', type, page: data.page + 1 })
      setData((current) => ({
        ...response,
        users: [...current.users, ...response.users.filter((user) => !current.users.some((previous) => previous.id === user.id))],
        sites: [...current.sites, ...response.sites.filter((site) => !current.sites.some((previous) => previous.id === site.id))],
      }))
    } catch {
      setMoreFailed(true)
    } finally {
      pendingPage.current = false
      setLoadingMore(false)
    }
  }

  async function onToggleFav(site) {
    if (pendingFavorites.current.has(site.id)) return
    pendingFavorites.current.add(site.id)
    setFavoriteFailed(false)
    try {
      if (site.is_favorited) await removeFavorite(site.id)
      else await addFavorite(site.id)
      setData((current) => ({ ...current, sites: current.sites.map((item) => item.id === site.id ? {
        ...item,
        is_favorited: !site.is_favorited,
        favorite_count: Math.max(0, item.favorite_count + (site.is_favorited ? -1 : 1)),
      } : item) }))
    } catch {
      setFavoriteFailed(true)
    } finally {
      pendingFavorites.current.delete(site.id)
    }
  }

  const filters = [{ value: 'all', label: t('All') }, { value: 'users', label: t('Users') }, { value: 'sites', label: t('Sites') }]
  const counts = data?.counts
  return (
    <WorkspaceLayout id="search-main" heading={heading} sidebarLabel={t('Search filters')} sidebar={
      <div className="workspace-sidebar-section">
      <h2>{t('Search filters')}</h2>
      <div role="group" aria-label={t('Search filters')}>
        {filters.map((filter) => {
          const count = counts && (filter.value === 'all' ? counts.users + counts.sites : counts[filter.value])
          return (
            <button key={filter.value} type="button" aria-pressed={type === filter.value} onClick={() => onFilter(filter.value)}
              className="workspace-filter">
              {filter.label}
              {count !== undefined && <span className="text-xs tabular-nums opacity-75">{count}</span>}
            </button>
          )
        })}
      </div>
      </div>
    }>
      {!validQuery ? <DashboardEmptyState kind="search" title={t('Type at least 2 characters to search.')} />
        : failed ? (
          <div role="alert" className="workspace-panel p-8 text-center">
            <p className="mb-4 text-sm text-[var(--studio-text-muted)]">{t('Search could not be completed.')}</p>
            <button className="studio-btn studio-btn-secondary px-4" onClick={() => { setFailed(false); setRetry((value) => value + 1) }}>{t('Try again')}</button>
          </div>
        ) : !data ? <p role="status" className="py-12 text-center text-sm text-[var(--studio-text-muted)]">{t('Searching…')}</p>
          : (
            <div className="space-y-7">
              {favoriteFailed && <p role="alert" className="studio-status-danger rounded-xl border p-3 text-sm">{t('Could not update favorite. Please try again.')}</p>}
              {type !== 'sites' && (
                <section className="workspace-panel p-5 sm:p-6" aria-labelledby="search-people-heading">
                  <h2 id="search-people-heading" className="mb-3 text-lg font-semibold text-[var(--studio-text)]">{t('People')}</h2>
                  {data.users.length ? <SearchPeople users={data.users} /> : <p className="py-4 text-sm text-[var(--studio-text-muted)]">{t('No users found.')}</p>}
                </section>
              )}
              {type !== 'users' && (
                <section aria-labelledby="search-sites-heading">
                  <h2 id="search-sites-heading" className="mb-4 text-lg font-semibold text-[var(--studio-text)]">{t('Sites')}</h2>
                  {data.sites.length ? (
                    <div className="workspace-grid">
                      {data.sites.map((site) => <ExploreCard key={site.id} redesigned site={site} onToggleFav={onToggleFav} />)}
                    </div>
                  ) : <DashboardEmptyState kind="search" title={t('No sites found.')} />}
                </section>
              )}
              {moreFailed && <p role="alert" className="text-center text-sm text-[var(--studio-danger)]">{t('Search could not be completed.')}</p>}
              {data.has_more && <div className="flex justify-center"><button type="button" className="studio-btn studio-btn-secondary px-6" onClick={loadMore} disabled={loadingMore}>{loadingMore ? t('Loading…') : moreFailed ? t('Try again') : t('Load more')}</button></div>}
            </div>
          )}
    </WorkspaceLayout>
  )
}

export default function SearchPage() {
  const { t } = useLanguage()
  useDocumentTitle(t('Search results'))
  const [params, setParams] = useSearchParams()
  const query = (params.get('q') || '').trim().slice(0, 80)
  const requestedType = params.get('type')
  const type = ['users', 'sites'].includes(requestedType) ? requestedType : 'all'
  return (
    <div className="dashboard-page workspace-page">
      <a href="#search-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-[var(--studio-panel-raised)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--studio-accent-hover)] focus:shadow-lg">
        {t('Skip to content')}
      </a>
      <DashboardHeader showSearch={false} />
      <SearchResults key={`${query}:${type}`} query={query} type={type} onFilter={(value) => setParams({ q: query, type: value })} heading={
        <>
          <div className="workspace-heading"><h1>{t('Search results')}</h1></div>
          <div className="workspace-search-form mb-7"><DashboardGlobalSearch key={`${query}:${type}`} initialQuery={query} resultType={type} label={t('Search query')} formLabel={t('Search results')} /></div>
        </>
      } />
    </div>
  )
}
