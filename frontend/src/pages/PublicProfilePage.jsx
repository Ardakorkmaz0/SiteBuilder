import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getPublicProfile } from '../api/profile.js'
import { addFavorite, removeFavorite } from '../api/explore.js'
import { useAuthStore } from '../store/authStore.js'
import { apiError } from '../utils/errors.js'
import { useGoBack } from '../utils/useGoBack.js'
import { useScrollRestore } from '../utils/useScrollRestore.js'
import ExploreCard from '../components/dashboard/ExploreCard.jsx'
import WorkspaceLayout from '../components/dashboard/WorkspaceLayout.jsx'
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState.jsx'
import '../ui/profile-design.css'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import { ArrowLeftIcon, GithubIcon, GlobeIcon, InstagramIcon, LinkIcon, MapPinIcon, XSocialIcon } from '../components/icons.jsx'
import { profileLinks } from '../utils/profileLinks.js'
import { useLanguage } from '../i18n/useLanguage.js'
import { useDocumentTitle } from '../utils/useDocumentTitle.js'

const LINK_ICONS = { website: LinkIcon, github: GithubIcon, twitter: XSocialIcon, instagram: InstagramIcon }

function BigAvatar({ url, name }) {
  const letter = (name || '?').trim().charAt(0).toUpperCase()
  if (url) {
    return <img src={url} alt="" className="profile-public-avatar" />
  }
  return (
    <span className="dashboard-avatar profile-public-avatar" aria-hidden="true">
      {letter}
    </span>
  )
}

// A creator's PUBLIC profile (`/u/:id`): their avatar / name / bio + a grid of
// their published sites — exactly what a normal visitor sees. Linked from the
// admin panel so a moderator can inspect an account the way the public does.
export default function PublicProfilePage() {
  const { t, language } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  // Tag the loaded result with the id it belongs to, so switching profiles shows
  // "loading" without a synchronous reset inside the effect (which React 19's
  // lint — rightly — flags).
  const [state, setState] = useState({ id: null, data: null, error: '' })
  const pendingFavorites = useRef(new Set())
  const [favoritingIds, setFavoritingIds] = useState(new Set())
  const [favoriteError, setFavoriteError] = useState({ id: null, message: '' })

  useEffect(() => {
    let alive = true
    getPublicProfile(id)
      .then((d) => alive && setState({ id, data: d, error: '' }))
      .catch((e) => alive && setState({ id, data: null, error: apiError(e, t('This profile is unavailable.')) }))
    return () => { alive = false }
  }, [id, t])

  const ready = state.id === id
  const data = ready ? state.data : null
  useDocumentTitle(data?.display_name || null)
  const error = ready ? state.error : ''
  const goBack = useGoBack('/')
  useScrollRestore(!!data) // restore scroll once the profile + sites have loaded

  async function onToggleFav(site) {
    if (!token) { navigate('/login'); return }
    if (pendingFavorites.current.has(site.id)) return
    pendingFavorites.current.add(site.id)
    setFavoritingIds(new Set(pendingFavorites.current))
    setFavoriteError({ id, message: '' })
    const next = !site.is_favorited
    try {
      await (next ? addFavorite(site.id) : removeFavorite(site.id))
      // A late save belongs to the profile that started it. Keep confirmed
      // stars until success, as on Explore and Favorites.
      setState((previous) => previous.id !== id || !previous.data ? previous : {
        ...previous,
        data: {
          ...previous.data,
          sites: previous.data.sites.map((item) => item.id === site.id && item.is_favorited !== next ? {
            ...item,
            is_favorited: next,
            favorite_count: Math.max(0, (item.favorite_count || 0) + (next ? 1 : -1)),
          } : item),
        },
      })
    } catch (requestError) {
      setFavoriteError((previous) => previous.id === id ? { id, message: apiError(requestError) } : previous)
    } finally {
      pendingFavorites.current.delete(site.id)
      setFavoritingIds(new Set(pendingFavorites.current))
    }
  }

  return (
    <div className="dashboard-page workspace-page public-profile-design">
      <header className="dashboard-header">
        <div className="dashboard-header-inner profile-public-header">
          <div className="flex min-w-0 items-center gap-2">
            <Link to="/" aria-label={t('Sitebuilder home')} className="dashboard-brand shrink-0">
              <span className="brand-mark">S</span>
              <span className="hidden text-sm font-bold tracking-tight text-[var(--studio-text)] sm:block">Sitebuilder</span>
            </Link>
            <span className="mx-1 hidden h-5 w-px bg-[var(--studio-border)] sm:block" aria-hidden />
            <button type="button" onClick={goBack} className="studio-btn min-h-9 px-2.5">
              <ArrowLeftIcon size={15} /> {t('Back')}
            </button>
          </div>
          <LanguageSwitcher className="ml-auto" />
        </div>
      </header>

      <WorkspaceLayout id="public-profile-main">
        {favoriteError.id === id && favoriteError.message && (
          <p role="alert" className="studio-status-danger mb-5 rounded-xl border px-4 py-3 text-sm">{favoriteError.message}</p>
        )}
        {error ? (
          <DashboardEmptyState title={error} kind="sites">
            <Link to="/" className="studio-btn studio-btn-primary">{t('Back to Explore')}</Link>
          </DashboardEmptyState>
        ) : !data ? (
          <div role="status" className="workspace-panel profile-loading" aria-label={t('Loading…')}>
            <div className="flex items-center gap-5">
              <div className="h-24 w-24 shrink-0 rounded-full bg-[var(--studio-control)]" />
              <div className="min-w-0 flex-1">
                <div className="h-6 w-52 max-w-full rounded bg-[var(--studio-control)]" />
                <div className="mt-3 h-4 w-32 rounded bg-[var(--studio-control)]" />
                <div className="mt-4 h-3 w-full max-w-xl rounded bg-[var(--studio-control)]" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <section className="workspace-panel profile-public-hero" aria-labelledby="public-profile-name">
              <div className="profile-public-identity">
                <BigAvatar url={data.avatar_url} name={data.display_name} />
                <div className="min-w-0 flex-1">
                  <h1 id="public-profile-name" className="profile-public-name">{data.display_name}</h1>
                  <div className="mt-1 text-sm text-[var(--studio-text-faint)]">
                    @{data.username}
                    {data.headline && <span className="font-medium text-[var(--studio-text-muted)]"> · {data.headline}</span>}
                  </div>
                  {data.bio && <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--studio-text-muted)]">{data.bio}</p>}
                  {(data.location || profileLinks(data).length > 0) && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--studio-text-muted)]">
                      {data.location && (
                        <span className="profile-public-link"><MapPinIcon size={13} /> {data.location}</span>
                      )}
                      {profileLinks(data).map(({ id, label, href }) => {
                        const ChipIcon = LINK_ICONS[id] || LinkIcon
                        return (
                          <a
                            key={id}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="profile-public-link"
                          >
                            <ChipIcon size={13} /> <span className="truncate">{label}</span>
                          </a>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="profile-public-stat">
                  <GlobeIcon size={18} className="text-[var(--studio-text-muted)]" />
                  <div>
                    <div className="text-xl font-bold text-[var(--studio-text)]">{data.sites.length}</div>
                    <div className="text-[11px] font-semibold text-[var(--studio-text-muted)]">{t('Sites')}</div>
                    {data.date_joined && <div className="mt-2 text-xs text-[var(--studio-text-faint)]">{new Date(data.date_joined).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')}</div>}
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="public-sites-heading">
              <div className="workspace-heading profile-sites-heading">
                <div>
                  <h2 id="public-sites-heading" className="text-xl font-semibold text-[var(--studio-text)] sm:text-2xl">{t('Sites')}</h2>
                </div>
                <span className="dashboard-status">{data.sites.length}</span>
              </div>
              {data.sites.length === 0 ? (
                <DashboardEmptyState title={t('No published sites yet')} description={t('When {name} publishes a site, it shows up here.', { name: data.display_name })} kind="sites">
                  <Link to="/" className="studio-btn studio-btn-secondary">{t('Back to Explore')}</Link>
                </DashboardEmptyState>
              ) : (
                <div className="workspace-grid">
                  {data.sites.map((site) => (
                    <ExploreCard key={site.id} redesigned site={site} onToggleFav={onToggleFav} favoriting={favoritingIds.has(site.id)} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </WorkspaceLayout>
    </div>
  )
}
