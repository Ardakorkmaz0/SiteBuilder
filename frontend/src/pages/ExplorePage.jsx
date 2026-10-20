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

export default function ExplorePage() {
  const { t } = useLanguage()
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
    const heading = feedHeadingRef.current
    if (!heading) return
    const top = heading.getBoundingClientRect().top + window.scrollY
    const headerHeight = document.querySelector('.dashboard-header')?.getBoundingClientRect().height || 0
    window.scrollTo({ top: Math.max(0, top - headerHeight - 24), behavior: 'auto' })
  }, [items.length, category])

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
