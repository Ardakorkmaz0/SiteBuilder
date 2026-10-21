import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listFavorites, addFavorite, removeFavorite } from '../api/explore.js'
import { cloneSite } from '../api/sites.js'
import { apiError } from '../utils/errors.js'
import { useGuestGate } from '../utils/useGuestGate.jsx'
import { useScrollRestore } from '../utils/useScrollRestore.js'
import DashboardHeader from '../components/dashboard/DashboardHeader.jsx'
import DashboardSearch from '../components/dashboard/DashboardSearch.jsx'
import ExploreCard from '../components/dashboard/ExploreCard.jsx'
import WorkspaceLayout from '../components/dashboard/WorkspaceLayout.jsx'
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState.jsx'
import { useLanguage } from '../i18n/useLanguage.js'
import { useDocumentTitle } from '../utils/useDocumentTitle.js'

export default function FavoritesPage() {
  const { t } = useLanguage()
  useDocumentTitle(t('Favorites'))
  const [items, setItems] = useState(null) // null = loading
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [favoritingIds, setFavoritingIds] = useState(new Set())
  const pendingFavorites = useRef(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [remixingId, setRemixingId] = useState(null)
  const navigate = useNavigate()
  useScrollRestore(items !== null)

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()
    if (!query) return items || []
    return (items || []).filter((site) => [
      site.title,
      site.owner_display_name,
      site.owner_username,
      site.category,
    ].some((value) => String(value || '').toLocaleLowerCase().includes(query)))
  }, [items, searchQuery])

  useEffect(() => {
    let alive = true
    listFavorites()
      .then((d) => alive && setItems(d))
      .catch((e) => {
        if (!alive) return
        setLoadError(apiError(e))
        setItems([])
      })
    return () => { alive = false }
  }, [loadAttempt])

  // Keep the card until the server confirms the change so a failed save is retryable.
  async function onToggleFav(site) {
    if (pendingFavorites.current.has(site.id)) return
    pendingFavorites.current.add(site.id)
    setFavoritingIds(new Set(pendingFavorites.current))
    setError('')
    const next = !site.is_favorited
    try {
      if (next) await addFavorite(site.id)
      else await removeFavorite(site.id)
      setItems((previous) => (previous || [])
        .map((item) => item.id === site.id ? {
          ...item,
          is_favorited: next,
          favorite_count: Math.max(0, (item.favorite_count || 0) + (next ? 1 : -1)),
        } : item)
        .filter((item) => !(item.id === site.id && !next)))
    } catch (e) {
      setError(apiError(e))
    } finally {
      pendingFavorites.current.delete(site.id)
      setFavoritingIds(new Set(pendingFavorites.current))
    }
  }

  // A guest at the site limit is told what an account changes, with the way to
  // one, instead of a line of red text.
  const { gate: guestGate, dialog: guestDialog } = useGuestGate()

  async function onRemix(site) {
    if (remixingId) return
    setRemixingId(site.id)
    setError('')
    try {
      const copy = await cloneSite(site.slug)
      navigate(`/editor/${copy.id}`)
    } catch (e) {
      setRemixingId(null)
      if (e?.response?.data?.code === 'guest_forbidden' && guestGate('limit')) return
      setError(apiError(e))
    }
  }

  return (
    <div className="dashboard-page workspace-page">
      <a href="#favorites-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-[var(--studio-panel-raised)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--studio-accent-hover)] focus:shadow-lg">
        {t('Skip to content')}
      </a>
      <DashboardHeader current="favorites" />
      <WorkspaceLayout id="favorites-main" sidebarLabel={t('Favorite options')} heading={
        <div className="workspace-heading">
          <div className="min-w-0"><h1 id="favorites-heading">{t('Favorites')}</h1><p>{t('Sites you starred on Explore.')}</p></div>
        </div>
      } sidebar={
        <div className="workspace-sidebar-section">
          <h2>{t('Search favorites')}</h2>
          <DashboardSearch value={searchQuery} onChange={setSearchQuery} label={t('Search favorites')} placeholder={t('Search your favorites…')} className="w-full" />
          <p className="mt-4">{t('Star sites on Explore to keep them here.')}</p>
          <Link to="/" className="mt-4 inline-flex min-h-10 items-center text-xs font-semibold text-[var(--studio-accent-text)]">{t('Explore')}</Link>
        </div>
      }>
        <section aria-labelledby="favorites-heading">
          {error && <div role="alert" className="studio-status-danger mb-5 rounded-lg border px-4 py-3 text-sm">{error}</div>}
          {loadError ? (
            <div role="alert" className="workspace-panel p-8 text-center">
              <p className="mb-4 text-sm text-[var(--studio-text-muted)]">{loadError}</p>
              <button type="button" className="studio-btn studio-btn-secondary px-4" onClick={() => { setLoadError(''); setItems(null); setLoadAttempt((attempt) => attempt + 1) }}>{t('Try again')}</button>
            </div>
          ) : items === null ? (
            <div role="status" className="workspace-grid" aria-label={t('Loading…')}>
              {[0, 1, 2].map((item) => <div key={item} className="workspace-panel h-72 bg-[var(--studio-control)]" />)}
            </div>
          ) : items.length === 0 ? (
            <DashboardEmptyState kind="favorites" title={t('No favorites yet')} description={t('Star sites on Explore to keep them here.')}>
              <Link to="/" className="studio-btn studio-btn-primary">{t('Explore')}</Link>
            </DashboardEmptyState>
          ) : filteredItems.length === 0 ? (
            <DashboardEmptyState kind="search" title={t('No favorites match your search.')} description={t('Try a different site or creator name.')}>
              <button type="button" className="studio-btn studio-btn-secondary" onClick={() => setSearchQuery('')}>{t('Clear search')}</button>
            </DashboardEmptyState>
          ) : (
            <div className="workspace-grid">
              {filteredItems.map((site) => <ExploreCard key={site.id} redesigned site={site} onToggleFav={onToggleFav} onRemix={onRemix} remixing={remixingId === site.id} favoriting={favoritingIds.has(site.id)} />)}
            </div>
          )}
        </section>
      </WorkspaceLayout>
      {guestDialog}
    </div>
  )
}
