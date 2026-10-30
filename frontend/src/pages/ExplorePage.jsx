import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { listExplore, addFavorite, removeFavorite } from '../api/explore.js'
import { cloneSite, listSites } from '../api/sites.js'
import { pinSite } from '../api/admin.js'
import { useAuthStore } from '../store/authStore.js'
import { apiError } from '../utils/errors.js'
import { GUEST_SITE_LIMIT, useGuestGate } from '../utils/useGuestGate.jsx'
import { orderSites } from '../utils/siteSort.js'
import { forgetScroll, useScrollRestore } from '../utils/useScrollRestore.js'
import ExploreCard from '../components/dashboard/ExploreCard.jsx'
import CreateSiteWizard from '../components/dashboard/CreateSiteWizard.jsx'
import DashboardHeader from '../components/dashboard/DashboardHeader.jsx'
import GuestStorageWarning from '../components/auth/GuestStorageWarning.jsx'
import SitePreview from '../components/dashboard/SitePreview.jsx'
import {
  ArrowRightIcon,
  ClockIcon,
  FolderOpenIcon,
  GlobeIcon,
  LayersIcon,
  StarIcon,
  PlusIcon,
} from '../components/icons.jsx'
import { useLanguage } from '../i18n/useLanguage.js'
import { useDocumentTitle } from '../utils/useDocumentTitle.js'
import { accountName, chosenName } from '../utils/accountName.js'
import { ScratchArt } from '../components/dashboard/GuideArt.jsx'
import '../ui/explore-design.css'
import { useCompactDashboard } from '../utils/useCompactDashboard.js'

// Keep the feed across navigation within one account, including its favorite state.
let feedCache = null
const unsubscribeFeedCache = useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id || state.token !== previous.token) feedCache = null
})
if (import.meta.hot) import.meta.hot.dispose(unsubscribeFeedCache)

const CATEGORIES = [
  ['', 'All'],
  ['portfolio', 'Portfolio'],
  ['business', 'Business'],
  ['blog', 'Blog'],
  ['landing', 'Landing'],
  ['shop', 'Shop'],
  ['personal', 'Personal'],
  ['other', 'Other'],
]

function formattedDate(value, language) {
  const date = new Date(value || 0)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default function ExplorePage() {
  const { language, t } = useLanguage()
  const compact = useCompactDashboard()
  useDocumentTitle(t('Explore'))
  const user = useAuthStore((state) => state.user)
  // Set by the sign-in pages when a guest session's work was taken over.
  const location = useLocation()
  const [movedNotice, setMovedNotice] = useState(location.state?.guestWorkMoved || null)
  const userId = user?.id ?? null
  const cachedFeed = userId !== null && feedCache?.userId === userId ? feedCache : null
  const [category, setCategory] = useState(cachedFeed?.category ?? '')
  const [data, setData] = useState(cachedFeed ?? { userId, category: null, items: [], page: 1, hasMore: false })
  const [ownSites, setOwnSites] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [feedError, setFeedError] = useState('')
  const [feedAttempt, setFeedAttempt] = useState(0)
  const feedHeadingRef = useRef(null)
  const filterRailRef = useRef(null)
  const filterJump = useRef(false)
  const [pinningId, setPinningId] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createOrigin, setCreateOrigin] = useState(null)
  const [remixingId, setRemixingId] = useState(null)
  const [favoritingIds, setFavoritingIds] = useState(new Set())
  const pendingFavorites = useRef(new Set())
  const navigate = useNavigate()

  const feedIsCurrent = data.userId === userId && data.category === category
  const items = feedIsCurrent ? data.items : []
  const loading = !feedIsCurrent && !feedError
  const latestSite = useMemo(() => orderSites(ownSites)[0] || null, [ownSites])
  const displayName = accountName(user, t, t('Creator'))
  const featuredSite = items[0] || null
  const workspaceStats = useMemo(() => ({
    total: ownSites.length,
    published: ownSites.filter((site) => site.published).length,
    views: ownSites.reduce((sum, site) => sum + (site.view_count || 0), 0),
    favorites: ownSites.reduce((sum, site) => sum + (site.favorite_count || 0), 0),
  }), [ownSites])
  const lastEdited = latestSite ? formattedDate(latestSite.updated_at, language) : ''

  // A guest at the site limit is told what an account changes, with the way to
  // one, instead of a line of red text — and before filling in three wizard
  // steps for a site the server will not make.
  const { isGuest, gate: guestGate, dialog: guestDialog } = useGuestGate()

  function openCreate(event) {
    if (isGuest && ownSites.length >= GUEST_SITE_LIMIT && guestGate('limit')) return
    const trigger = event.currentTarget
    const { left, top, width, height } = trigger.getBoundingClientRect()
    setCreateOrigin({ left, top, width, height, trigger })
    setCreateOpen(true)
  }

  useEffect(() => {
    if (userId === null || (data.userId === userId && data.category === category)) return undefined
    let alive = true
    listExplore({ category, search: '', page: 1 })
      .then((result) => alive && setData({ userId, category, items: result.results, page: 1, hasMore: !!result.next }))
      .catch((requestError) => alive && setFeedError(apiError(requestError)))
    return () => { alive = false }
  }, [category, data.category, data.userId, userId, feedAttempt])

  useEffect(() => {
    let alive = true
    listSites()
      .then((sites) => alive && setOwnSites(sites))
      .catch((requestError) => alive && setError(apiError(requestError)))
      .finally(() => alive && setProjectsLoading(false))
    return () => { alive = false }
  }, [])

  useEffect(() => {
    feedCache = userId !== null && data.userId === userId ? data : null
  }, [data, userId])
  useScrollRestore(items.length > 0, category)

  const retryFeed = () => {
    setFeedError('')
    setFeedAttempt((attempt) => attempt + 1)
  }

  const selectCategory = (nextCategory) => {
    setError('')
    if (nextCategory === category && feedError) retryFeed()
    else setFeedError('')
    if (nextCategory !== category) {
      // Two different intentions share this page. Coming BACK to the feed
      // should land where you were; picking a filter should show the new
      // results from the start. Forgetting the incoming category's offset
      // stops the restore from firing, and the effect below does the
      // positioning once the new list exists.
      forgetScroll(location.pathname, nextCategory)
      filterJump.current = true
    }
    setCategory(nextCategory)
  }

  // After the new list has rendered — not before. Filtering usually shortens
  // the page, and a scroll issued while the old (taller) list is still up gets
  // clamped away the moment it shrinks, which is how you end up stranded in
  // the middle of the results with the filter row off-screen above.
  useEffect(() => {
    if (!filterJump.current || items.length === 0) return
    filterJump.current = false
    // The compact page brings its feed heading into view, the desktop page its
    // row of category chips; both stop below the sticky header.
    const target = compact ? feedHeadingRef.current : filterRailRef.current
    if (!target) return
    const top = target.getBoundingClientRect().top + window.scrollY
    const headerHeight = document.querySelector('.dashboard-header')?.getBoundingClientRect().height || 0
    window.scrollTo({ top: Math.max(0, top - headerHeight - (compact ? 24 : 12)), behavior: 'auto' })
  }, [items.length, category, compact])

  async function loadMore() {
    if (loadingMore || !data.hasMore) return
    setLoadingMore(true)
    try {
      const requested = category
      const result = await listExplore({ category: requested, search: '', page: data.page + 1 })
      setData((previous) => {
        // Switching category while this was in flight resets the feed. Without
        // this check the old category's second page landed in the new list and
        // pushed the page counter past the new category's real page 2.
        if (previous.category !== requested) return previous
        return {
          ...previous,
          items: [...previous.items, ...result.results],
          page: previous.page + 1,
          hasMore: !!result.next,
        }
      })
    } catch (requestError) {
      setError(apiError(requestError))
    } finally {
      setLoadingMore(false)
    }
  }

  async function onToggleFav(site) {
    if (pendingFavorites.current.has(site.id)) return
    pendingFavorites.current.add(site.id)
    setFavoritingIds(new Set(pendingFavorites.current))
    setError('')
    const next = !site.is_favorited
    try {
      if (next) await addFavorite(site.id)
      else await removeFavorite(site.id)
      setData((previous) => ({
        ...previous,
        items: previous.items.map((item) => item.id === site.id ? {
          ...item,
          is_favorited: next,
          favorite_count: Math.max(0, (item.favorite_count || 0) + (next ? 1 : -1)),
        } : item),
      }))
    } catch (requestError) {
      setError(apiError(requestError))
    } finally {
      pendingFavorites.current.delete(site.id)
      setFavoritingIds(new Set(pendingFavorites.current))
    }
  }

  async function onRemix(site) {
    if (remixingId) return
    setRemixingId(site.id)
    setError('')
    try {
      const copy = await cloneSite(site.slug)
      navigate(`/editor/${copy.id}`)
    } catch (requestError) {
      setRemixingId(null)
      if (requestError?.response?.data?.code === 'guest_forbidden' && guestGate('limit')) return
      setError(apiError(requestError))
    }
  }

  // Superuser-only: the server refuses anybody else, and the button is not
  // rendered for them either. The card is updated in place rather than
  // refetching, so the badge appears immediately; the new position in the
  // ranking shows on the next load, which is when the feed is re-sorted.
  async function onTogglePin(site) {
    if (pinningId) return
    setPinningId(site.id)
    setError('')
    const next = !site.pinned
    try {
      await pinSite(site.id, next)
      setData((previous) => ({
        ...previous,
        items: previous.items.map((item) => (
          item.id === site.id ? { ...item, pinned: next } : item
        )),
      }))
    } catch (requestError) {
      setError(apiError(requestError))
    } finally {
      setPinningId(null)
    }
  }

  // From 1024px up: the desktop page. Phones and tablets get the compact page
  // below (utils/useCompactDashboard.js).
  if (!compact) {
    return (
      <div className="dashboard-page">
        <a href="#explore-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-[var(--studio-panel-raised)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--studio-accent-hover)] focus:shadow-lg">
          {t('Skip to content')}
        </a>
        <DashboardHeader current="explore" />

        <main id="explore-main" className="dashboard-container">
          <GuestStorageWarning />
          {/* Said once, on arrival: the drafts made before signing in are here,
              under this account. Silence would leave the person wondering
              whether they lost them. */}
          {movedNotice && (
            <div role="status" className="studio-status-success mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm">
              <span>
                {t('The {count} sites you made before signing in are now in this account.', { count: movedNotice.sites })}
              </span>
              <button type="button" onClick={() => setMovedNotice(null)} aria-label={t('Dismiss')} className="studio-icon-btn shrink-0">×</button>
            </div>
          )}
          <section className="dashboard-workspace-grid" aria-labelledby="workspace-heading">
            <div className="dashboard-workspace-primary">
              <div className="max-w-2xl">
                <h1 id="workspace-heading" className="text-3xl font-semibold text-[var(--studio-text)] [overflow-wrap:anywhere] sm:text-4xl">
                  {/* A new guest has no name and has not been here before. */}
                  {user?.is_guest && !chosenName(user) ? t('Welcome') : t('Welcome back, {name}', { name: displayName })}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--studio-text-muted)]">
                  {t('Continue your latest project or start with a fresh idea.')}
                </p>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={openCreate} aria-haspopup="dialog" aria-expanded={createOpen} className="studio-btn studio-btn-primary studio-create-trigger min-h-11 px-4">
                    <PlusIcon size={16} /> {t('Create new site')}
                  </button>
                  <Link to="/code" className="studio-btn studio-btn-secondary min-h-11 px-4">
                    <FolderOpenIcon size={16} /> {t('Open local project')}
                  </Link>
                </div>
              </div>

              {/* Plain figures on one rule: four coloured icon tiles in four
                  different hues were decoration competing with the one accent. */}
              <dl className="dashboard-stat-strip mt-8" aria-label={t('Workspace')} aria-busy={projectsLoading}>
                {[
                  [workspaceStats.total, t('Sites')],
                  [workspaceStats.published, t('Published')],
                  [workspaceStats.views.toLocaleString(), t('Total views')],
                  [workspaceStats.favorites.toLocaleString(), t('Favorites')],
                ].map(([value, label]) => (
                  <div key={label} className="dashboard-figure">
                    <dt>{label}</dt>
                    <dd>{projectsLoading ? '…' : value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {projectsLoading ? (
              <div className="dashboard-workspace-project items-center justify-center p-7" aria-busy="true">
                <p role="status" className="text-sm text-[var(--studio-text-muted)]">{t('Loading…')}</p>
              </div>
            ) : latestSite ? (
              <article className="dashboard-workspace-project sb-frame" aria-labelledby="recent-project-title">
                <Link
                  to={`/editor/${latestSite.id}`}
                  className="dashboard-workspace-preview block"
                  aria-label={`${t('Continue editing')}: ${latestSite.title}`}
                >
                  <div className="absolute left-4 top-4 z-10">
                    <span className={`dashboard-status ${latestSite.published ? 'dashboard-status-live' : ''}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {latestSite.published ? t('Published') : t('Draft')}
                    </span>
                  </div>
                  <SitePreview site={latestSite} source="owner" height={188} framed={false} />
                </Link>
                <div className="dashboard-workspace-meta">
                  <div className="min-w-0 flex-1">
                    <h2 id="recent-project-title" className="truncate text-base font-semibold text-[var(--studio-text)]">{latestSite.title}</h2>
                    {lastEdited && (
                      <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-[var(--studio-text-muted)]">
                        <ClockIcon size={12} /> {t('Last edited {date}', { date: lastEdited })}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {latestSite.published && (
                      <Link to={`/site/${latestSite.slug}`} className="studio-icon-btn studio-btn-secondary" aria-label={t('View live site')}>
                        <GlobeIcon size={14} />
                      </Link>
                    )}
                    <Link to={`/editor/${latestSite.id}`} className="studio-icon-btn studio-btn-accent" aria-label={t('Continue editing')}>
                      <ArrowRightIcon size={15} />
                    </Link>
                  </div>
                </div>
              </article>
            ) : (
              <div className="dashboard-workspace-project justify-center p-7">
                <h2 className="text-xl font-semibold text-[var(--studio-text)]">{t('Create your first project')}</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--studio-text-muted)]">{t('Choose a template, use AI, or bring your own HTML.')}</p>
                <button type="button" onClick={openCreate} aria-haspopup="dialog" aria-expanded={createOpen} className="studio-btn studio-btn-secondary studio-create-trigger mt-5 min-h-10 w-fit px-4">
                  <PlusIcon size={15} /> {t('Create new site')}
                </button>
              </div>
            )}
          </section>

          {/* The community spotlight from the compact page, in the desktop
              page's own style. The picture is a mouse shortcut to the named
              link beside it. */}
          {featuredSite && (
            <section aria-labelledby="featured-heading" className="dashboard-section-card mb-9 grid overflow-hidden lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div className="flex min-w-0 flex-col items-start p-6 xl:p-8">
                <p className="dashboard-kicker">{t('Community spotlight')}</p>
                <h2 id="featured-heading" className="mt-3 text-2xl font-semibold text-[var(--studio-text)] [overflow-wrap:anywhere]">{featuredSite.title}</h2>
                <p className="mt-1.5 text-sm text-[var(--studio-text-muted)] [overflow-wrap:anywhere]">
                  {t('Made by {name}', { name: featuredSite.owner_display_name || featuredSite.owner_username || t('Creator') })}
                </p>
                {!!featuredSite.tags?.length && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {featuredSite.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-md bg-[var(--studio-control)] px-2 py-1 text-[11px] font-medium text-[var(--studio-text-muted)]">{tag}</span>
                    ))}
                  </div>
                )}
                <Link to={`/site/${featuredSite.slug}`} className="studio-btn studio-btn-secondary mt-6 min-h-10 px-4" aria-label={t('View featured site: {title}', { title: featuredSite.title })}>
                  {t('View site')} <ArrowRightIcon size={15} />
                </Link>
              </div>
              <Link to={`/site/${featuredSite.slug}`} tabIndex={-1} aria-hidden="true" className="block min-w-0 border-t border-[var(--studio-border)] bg-[var(--studio-control)] p-5 lg:border-l lg:border-t-0">
                <SitePreview site={featuredSite} source="public" height={240} framed />
              </Link>
            </section>
          )}

          {error && (
            <div role="alert" className="studio-status-danger mb-5 rounded-xl border px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <section aria-labelledby="discover-heading">
            <div className="dashboard-section-heading">
              <div>
                <h2 id="discover-heading" className="text-xl font-semibold text-[var(--studio-text)] sm:text-2xl">{t('Discover ideas')}</h2>
                <p className="mt-1 text-sm text-[var(--studio-text-muted)]">{t('Explore published work from the community.')}</p>
              </div>
              <div ref={filterRailRef} className="dashboard-filter-rail flex max-w-full gap-1.5 overflow-x-auto" aria-label={t('Site categories')}>
                {CATEGORIES.map(([id, label]) => (
                  <button
                    key={id || 'all'}
                    type="button"
                    onClick={() => selectCategory(id)}
                    aria-pressed={category === id}
                    className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      category === id
                        ? 'border-[var(--studio-text)] bg-[var(--studio-text)] text-[var(--studio-panel-raised)]'
                        : 'border-[var(--studio-border)] bg-[var(--studio-panel-raised)] text-[var(--studio-text-muted)] hover:bg-[var(--studio-control-hover)] hover:text-[var(--studio-text)]'
                    }`}
                  >
                    {t(label)}
                  </button>
                ))}
              </div>
            </div>

            {feedError ? (
              <div role="alert" className="dashboard-section-card p-8 text-center">
                <p className="mb-4 text-sm text-[var(--studio-text-muted)]">{feedError}</p>
                <button type="button" onClick={retryFeed} className="studio-btn studio-btn-secondary px-4">{t('Try again')}</button>
              </div>
            ) : loading ? (
              <p role="status" className="text-sm text-[var(--studio-text-muted)]">{t('Loading…')}</p>
            ) : items.length === 0 ? (
              <div className="dashboard-section-card border-dashed py-16 text-center">
                <div className="mx-auto mb-3 grid place-items-center text-[var(--studio-text-faint)]"><GlobeIcon size={24} /></div>
                <p className="font-medium text-[var(--studio-text)]">{t('Nothing here yet')}</p>
                <p className="mt-1 text-sm text-[var(--studio-text-muted)]">
                  {category
                    ? t('No published sites in this category.')
                    : t('Publish a site to share it here.')}
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((site) => (
                    <ExploreCard key={site.id} site={site} onToggleFav={onToggleFav} onRemix={onRemix}
                      onTogglePin={user?.is_superuser ? onTogglePin : undefined}
                      remixing={remixingId === site.id} favoriting={favoritingIds.has(site.id)}
                      pinning={pinningId === site.id} />
                  ))}
                </div>
                {data.hasMore && (
                  <div className="mt-8 text-center">
                    <button onClick={loadMore} disabled={loadingMore} className="studio-btn studio-btn-secondary min-h-10 px-6">
                      {loadingMore ? t('Loading…') : t('Load more')}
                    </button>
                  </div>
                )}
              </>
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

  return (
    <div className="dashboard-page explore-redesign">
      <a href="#explore-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-[var(--studio-panel-raised)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--studio-accent-hover)] focus:shadow-lg">
        {t('Skip to content')}
      </a>
      <DashboardHeader current="explore" />

      <main id="explore-main" className="dashboard-container explore-layout">
        <div className="explore-notices">
          <GuestStorageWarning />
          {movedNotice && (
            <div role="status" className="studio-status-success mb-4 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
              <span>{t('The {count} sites you made before signing in are now in this account.', { count: movedNotice.sites })}</span>
              <button type="button" onClick={() => setMovedNotice(null)} aria-label={t('Dismiss')} className="studio-icon-btn shrink-0">×</button>
            </div>
          )}
        </div>

        <section className="explore-intro" aria-labelledby="workspace-heading">
          <div>
            <p className="explore-eyebrow">{t('Explore')}</p>
            <h1 id="workspace-heading">
              {user?.is_guest && !chosenName(user) ? t('Welcome') : t('Welcome back, {name}', { name: displayName })}
            </h1>
            <p className="explore-intro-description">{t('Explore published work from the community.')}</p>
          </div>
          <div className="explore-create-actions">
            <button type="button" onClick={openCreate} aria-haspopup="dialog" aria-expanded={createOpen} className="studio-btn studio-btn-primary studio-create-trigger">
              <PlusIcon size={16} /> {t('Create new site')}
            </button>
            <Link to="/code" className="studio-btn studio-btn-secondary">
              <FolderOpenIcon size={16} /> {t('Open local project')}
            </Link>
          </div>
        </section>

        <aside className="explore-sidebar" aria-label={t('Explore options')}>
          <div className="explore-sidebar-section">
            <h2>{t('Categories')}</h2>
            <div className="explore-categories" role="group" aria-label={t('Site categories')}>
              {CATEGORIES.map(([id, label]) => (
                <button key={id || 'all'} type="button" onClick={() => selectCategory(id)} aria-pressed={category === id}>
                  <span>{t(label)}</span>
                  {category === id && <span className="explore-category-mark" aria-hidden="true" />}
                </button>
              ))}
            </div>
            <details className="explore-filter-details">
              <summary>{t('Filter details')}</summary>
              <p>{t('Only published sites in the selected category are shown.')}</p>
              <button type="button" onClick={() => selectCategory('')} className="explore-text-link">{t('Show all categories')}</button>
            </details>
          </div>

          <div className="explore-sidebar-section explore-resume" aria-busy={projectsLoading}>
            <h2>{t('Your workspace')}</h2>
            {latestSite && (
              <article>
                <span className="explore-eyebrow">{t('Continue editing')}</span>
                <h3>{latestSite.title}</h3>
                <Link to={`/editor/${latestSite.id}`} className="explore-text-link" aria-label={`${t('Continue editing')}: ${latestSite.title}`}>
                  {t('Continue editing')} <ArrowRightIcon size={14} />
                </Link>
              </article>
            )}
            <Link to="/sites" className="explore-sidebar-link"><FolderOpenIcon size={16} />{t('My sites')}<ArrowRightIcon size={13} /></Link>
            <Link to="/community" className="explore-sidebar-link"><LayersIcon size={16} />{t('Community blocks')}<ArrowRightIcon size={13} /></Link>
          </div>
        </aside>

        <div className="explore-content">
          {featuredSite && (
            <section className="explore-feature" aria-labelledby="featured-heading">
              <div className="explore-feature-copy">
                <p className="explore-eyebrow">{t('Community spotlight')}</p>
                <h2 id="featured-heading">{featuredSite.title}</h2>
                <p>{t('Made by {name}', { name: featuredSite.owner_display_name || t('Creator') })}</p>
                {!!featuredSite.tags?.length && <div className="explore-feature-tags">{featuredSite.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>}
                <Link to={`/site/${featuredSite.slug}`} className="explore-text-link" aria-label={t('View featured site: {title}', { title: featuredSite.title })}>
                  {t('View site')} <ArrowRightIcon size={15} />
                </Link>
              </div>
              <Link to={`/site/${featuredSite.slug}`} className="explore-feature-preview" aria-label={t('Preview featured site: {title}', { title: featuredSite.title })}>
                <SitePreview site={featuredSite} source="public" height={220} framed={false} />
              </Link>
            </section>
          )}

          {error && <div role="alert" className="studio-status-danger mb-5 rounded-lg border px-4 py-3 text-sm">{error}</div>}

          <section aria-labelledby="discover-heading">
            <div className="explore-feed-heading">
              <div>
                <h2 ref={feedHeadingRef} id="discover-heading">{t('Discover ideas')}</h2>
                <p>{t('Explore published work from the community.')}</p>
              </div>
              <span className="explore-feed-label"><GlobeIcon size={14} />{t(CATEGORIES.find(([id]) => id === category)?.[1] || 'All')}</span>
            </div>

            {feedError ? (
              <div role="alert" className="dashboard-section-card p-8 text-center">
                <p className="mb-4 text-sm text-[var(--studio-text-muted)]">{feedError}</p>
                <button type="button" onClick={retryFeed} className="studio-btn studio-btn-secondary px-4">{t('Try again')}</button>
              </div>
            ) : loading ? (
              <p role="status" className="explore-loading">{t('Loading…')}</p>
            ) : items.length === 0 ? (
              <div className="explore-empty">
                <div className="explore-empty-art" aria-hidden="true"><ScratchArt /><span><GlobeIcon size={26} /><StarIcon size={18} /></span></div>
                <h3>{t('Nothing here yet')}</h3>
                <p>{category ? t('No published sites in this category.') : t('Publish a site to share it here.')}</p>
                {category ? (
                  <button type="button" onClick={() => selectCategory('')} className="studio-btn studio-btn-secondary">{t('Show all categories')}</button>
                ) : (
                  <button type="button" onClick={openCreate} aria-haspopup="dialog" aria-expanded={createOpen} className="studio-btn studio-btn-primary studio-create-trigger"><PlusIcon size={16} />{t('Create new site')}</button>
                )}
              </div>
            ) : (
              <>
                <div className="explore-site-grid">
                  {items.map((site) => (
                    <ExploreCard key={site.id} redesigned site={site} onToggleFav={onToggleFav} onRemix={onRemix}
                      onTogglePin={user?.is_superuser ? onTogglePin : undefined}
                      remixing={remixingId === site.id} favoriting={favoritingIds.has(site.id)}
                      pinning={pinningId === site.id} />
                  ))}
                </div>
                {data.hasMore && (
                  <div className="mt-8 text-center">
                    <button type="button" onClick={loadMore} disabled={loadingMore} className="studio-btn studio-btn-secondary min-h-10 px-6">
                      {loadingMore ? t('Loading…') : t('Load more')}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      <CreateSiteWizard open={createOpen} origin={createOrigin} onClose={() => setCreateOpen(false)} onCreated={(site) => navigate(`/editor/${site.id}`)} />
      {guestDialog}
    </div>
  )
}
