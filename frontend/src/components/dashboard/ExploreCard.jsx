import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import SitePreview from './SitePreview.jsx'
import { ArrowRightIcon, CopyIcon, StarIcon, EyeIcon, PinIcon, MoreHorizontalIcon } from '../icons.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'
import { useEscapeToClose } from '../../ui/useEscapeToClose.js'
import './explore-card-design.css'

function Avatar({ url, name, size = 20 }) {
  const letter = (name || '?').trim().charAt(0).toUpperCase()
  if (url) {
    return <img src={url} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <span
      aria-hidden="true"
      className="grid place-items-center rounded-full bg-[var(--studio-accent-soft)] font-semibold text-[var(--studio-accent-hover)]"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {letter}
    </span>
  )
}

// One card on the Explore / Favorites grid: a live public thumbnail, owner
// attribution, view + favorite counts, and a star toggle.
//
// `onTogglePin` is passed only for a superuser (the server refuses anyone
// else); without it the card renders exactly as it always did. The "Pinned"
// badge is shown to everybody, because a site sitting above the ranking should
// say why it is there rather than look like the most popular thing today.
export default function ExploreCard({
  site, onToggleFav, onRemix, onTogglePin,
  remixing = false, favoriting = false, pinning = false, redesigned = false,
}) {
  const { t } = useLanguage()
  const favoriteLabel = site.is_favorited ? t('Unfavorite') : t('Favorite')
  const pinLabel = site.pinned ? t('Unpin from the home page') : t('Pin to the home page')
  // Every card has the same controls: each one names its site as well.
  const titleId = useId()

  if (redesigned) {
    return <ExploreDesignCard site={site} titleId={titleId} onToggleFav={onToggleFav} onRemix={onRemix}
      onTogglePin={onTogglePin} remixing={remixing} favoriting={favoriting} pinning={pinning} />
  }

  return (
    <article className="dashboard-site-card group">
      <div className="dashboard-site-card-media">
        <Link
          to={`/site/${site.slug}`}
          className="dashboard-site-card-preview"
          title={t('Open the live site')}
          aria-describedby={titleId}
        >
          <SitePreview site={site} source="public" height={164} framed={false} />
        </Link>
        <button
          type="button"
          onClick={() => onToggleFav?.(site)}
          disabled={favoriting}
          aria-busy={favoriting}
          aria-pressed={site.is_favorited}
          title={favoriteLabel}
          aria-label={favoriteLabel}
          aria-describedby={titleId}
          className={`dashboard-site-card-favorite ${site.is_favorited ? 'dashboard-site-card-favorite-active' : ''}`}
        >
          <StarIcon size={17} filled={site.is_favorited} />
        </button>
        {onTogglePin && (
          <button
            type="button"
            onClick={() => onTogglePin(site)}
            disabled={pinning}
            aria-busy={pinning}
            aria-pressed={!!site.pinned}
            title={pinLabel}
            aria-label={pinLabel}
            aria-describedby={titleId}
            className={`dashboard-site-card-pin ${site.pinned ? 'dashboard-site-card-pin-active' : ''}`}
          >
            <PinIcon size={16} />
          </button>
        )}
        {site.pinned && (
          <span className="dashboard-site-card-pinned-badge">
            <PinIcon size={12} /> {t('Pinned')}
          </span>
        )}
      </div>

      <div className="dashboard-site-card-body">
        <div className="min-w-0">
          {site.category && site.category !== 'other' && (
            <span className="dashboard-site-card-category">
              {t(site.category.charAt(0).toUpperCase() + site.category.slice(1))}
            </span>
          )}
          <Link to={`/site/${site.slug}`} className="dashboard-site-card-title-link">
            <h2 id={titleId} className="truncate text-base font-bold tracking-[-0.025em] text-[var(--studio-text)]">{site.title}</h2>
          </Link>
        </div>

        <div className="dashboard-site-card-byline">
          <div className="min-w-0">
            {site.owner_id ? (
              <Link
                to={`/u/${site.owner_id}`}
                title={t('Profile')}
                className="dashboard-site-card-owner"
              >
                <Avatar url={site.owner_avatar_url} name={site.owner_display_name} size={22} />
                <span className="truncate">{site.owner_display_name}</span>
              </Link>
            ) : (
              <span className="dashboard-site-card-owner">
                <Avatar url={site.owner_avatar_url} name={site.owner_display_name} size={22} />
                <span className="truncate">{site.owner_display_name}</span>
              </span>
            )}
          </div>

          <div className="dashboard-site-card-metrics">
            <span title={t('Views')} className="flex items-center gap-1"><EyeIcon size={13} /> {site.view_count}</span>
            <span aria-hidden="true" className="dashboard-site-card-metric-dot" />
            <span title={t('Favorites')} className="flex items-center gap-1"><StarIcon size={13} /> {site.favorite_count}</span>
          </div>
        </div>

        <div className="dashboard-site-card-actions">
          {onRemix && (
            <button
              type="button"
              disabled={remixing}
              onClick={() => onRemix(site)}
              aria-describedby={titleId}
              className="dashboard-site-card-remix"
            >
              <CopyIcon size={13} /> {remixing ? t('Creating copy…') : t('Use as template')}
            </button>
          )}
          <Link to={`/site/${site.slug}`} aria-describedby={titleId} className="dashboard-site-card-open">
            <span>{t('View')}</span>
            <span className="dashboard-site-card-open-icon"><ArrowRightIcon size={13} /></span>
          </Link>
        </div>
      </div>
    </article>
  )
}

// Opt-in while the rest of the dashboard is redesigned in later stages.
// The feed does not expose a description yet; its category and tags provide
// the short context without downloading or inspecting the owner's HTML.
function ExploreDesignCard({ site, titleId, onToggleFav, onRemix, onTogglePin, remixing, favoriting, pinning }) {
  const { t } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const popupRef = useRef(null)
  const menuId = useId()
  useEscapeToClose(menuOpen, () => setMenuOpen(false))

  useEffect(() => {
    if (!menuOpen) return undefined
    popupRef.current?.querySelector('button:not(:disabled)')?.focus()
    const closeOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [menuOpen])

  const favoriteLabel = site.is_favorited ? t('Unfavorite') : t('Favorite')
  const pinLabel = site.pinned ? t('Unpin from the home page') : t('Pin to the home page')
  const category = site.category && site.category !== 'other'
    ? t(site.category.charAt(0).toUpperCase() + site.category.slice(1)) : ''
  const tags = Array.isArray(site.tags) ? site.tags.filter((tag) => typeof tag === 'string').slice(0, 2) : []
  const context = typeof site.description === 'string' && site.description.trim()
    ? site.description.trim() : [category, ...tags].filter(Boolean).join(' · ')
  const hasActions = !!(onToggleFav || onRemix || onTogglePin)

  function runAction(action) {
    setMenuOpen(false)
    action(site)
  }

  function onMenuKeyDown(event) {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(event.key)) return
    const actions = [...popupRef.current.querySelectorAll('button:not(:disabled)')]
    if (!actions.length) return
    event.preventDefault()
    const current = actions.indexOf(document.activeElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? actions.length - 1
      : (current + (event.key === 'ArrowDown' ? 1 : -1) + actions.length) % actions.length
    actions[next].focus()
  }

  return (
    <article className="dashboard-site-card explore-card-design" aria-labelledby={titleId}>
      <div className="explore-card-design-media">
        <Link to={`/site/${site.slug}`} className="dashboard-site-card-preview" title={t('Open the live site')} aria-describedby={titleId}>
          <SitePreview site={site} source="public" height={200} framed={false} />
        </Link>
        {site.pinned && <span className="explore-card-design-pinned"><PinIcon size={12} /> {t('Pinned')}</span>}
      </div>
      <div className="explore-card-design-body">
        <div className="explore-card-design-title-row">
          <Link to={`/site/${site.slug}`} className="explore-card-design-title"><h2 id={titleId}>{site.title}</h2></Link>
          <span className="explore-card-design-favorites" title={t('Favorites')}>
            <StarIcon size={14} filled={site.is_favorited} aria-hidden="true" />
            <span className="sr-only">{t('Favorites')}:</span> {(site.favorite_count || 0).toLocaleString()}
          </span>
        </div>
        {context && <p className="explore-card-design-context">{context}</p>}
        <div className="explore-card-design-bottom">
          {site.owner_id ? (
            <Link to={`/u/${site.owner_id}`} className="explore-card-design-owner" title={t('Profile')}>
              <Avatar url={site.owner_avatar_url} name={site.owner_display_name} size={22} />
              <span>{site.owner_display_name}</span>
            </Link>
          ) : (
            <span className="explore-card-design-owner">
              <Avatar url={site.owner_avatar_url} name={site.owner_display_name} size={22} />
              <span>{site.owner_display_name}</span>
            </span>
          )}
          <div className="explore-card-design-actions">
            <Link to={`/site/${site.slug}`} aria-describedby={titleId} className="explore-card-design-view">{t('View')} <ArrowRightIcon size={14} /></Link>
            {hasActions && (
              <div ref={menuRef} className="explore-card-design-menu-root" onBlur={(event) => {
                if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
              }}>
                <button type="button" aria-label={t('More actions')} aria-describedby={titleId} aria-haspopup="menu"
                  aria-expanded={menuOpen} aria-controls={menuOpen ? menuId : undefined}
                  onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setMenuOpen(true) } }}
                  onClick={() => setMenuOpen((open) => !open)} className="explore-card-design-more">
                  <MoreHorizontalIcon size={18} />
                </button>
                {menuOpen && (
                  <div ref={popupRef} id={menuId} role="menu" aria-label={t('More actions')} aria-describedby={titleId}
                    className="explore-card-design-menu" onKeyDown={onMenuKeyDown}>
                    {onToggleFav && <button type="button" role="menuitemcheckbox" aria-checked={!!site.is_favorited}
                      aria-describedby={titleId} disabled={favoriting} aria-busy={favoriting}
                      onClick={() => runAction(onToggleFav)}><StarIcon size={15} filled={site.is_favorited} /> {favoriteLabel}</button>}
                    {onRemix && <button type="button" role="menuitem" aria-describedby={titleId} disabled={remixing}
                      aria-busy={remixing} onClick={() => runAction(onRemix)}><CopyIcon size={15} /> {remixing ? t('Creating copy…') : t('Use as template')}</button>}
                    {onTogglePin && <button type="button" role="menuitemcheckbox" aria-checked={!!site.pinned}
                      aria-describedby={titleId} disabled={pinning} aria-busy={pinning}
                      onClick={() => runAction(onTogglePin)}><PinIcon size={15} /> {pinLabel}</button>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
