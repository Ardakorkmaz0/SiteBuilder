import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import SitePreview from './SitePreview.jsx'
import {
  ArrowRightIcon, CheckIcon, ClockIcon, CodeIcon, CopyIcon, EyeIcon,
  FileIcon, GlobeIcon, MoreHorizontalIcon, PinIcon, StarIcon, TrashIcon,
} from '../icons.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'
import { siteAddress } from '../../utils/siteAddress.js'
import { formatRelativeActivity } from '../../utils/siteSort.js'
import { useEscapeToClose } from '../../ui/useEscapeToClose.js'
import { closeWhenFocusLeaves } from '../../ui/closeWhenFocusLeaves.js'
import { useCompactDashboard } from '../../utils/useCompactDashboard.js'
import '../../ui/sites-design.css'

function HealthPill({ complete, children }) {
  return <span className={`owner-site-health-pill ${complete ? 'owner-site-health-pill-complete' : ''}`}>
    {complete && <CheckIcon size={11} />}{children}
  </span>
}

function projectHealth(site) {
  return site.project_health || {
    score: site.published ? 45 : 20,
    page_count: 1,
    mobile_ready: false,
    seo_ready: false,
    seo_pages: 0,
    seo_total: 1,
    domain_ready: site.domain_status === 'connected',
  }
}

// The ⋯ menu of a project card, the same on both faces: it opens on the
// first action, arrows and Home/End move through it, Esc and a click or Tab
// elsewhere close it.
function useActionsMenu() {
  const [menuOpen, setMenuOpen] = useState(false)
  useEscapeToClose(menuOpen, () => setMenuOpen(false))
  const menuRef = useRef(null)
  const popupRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    popupRef.current?.querySelector('button:not(:disabled)')?.focus()
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menuOpen])

  function onMenuKeyDown(event) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const actions = [...popupRef.current.querySelectorAll('button:not(:disabled)')]
    if (!actions.length) return
    event.preventDefault()
    const current = actions.indexOf(document.activeElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? actions.length - 1
      : (current + (event.key === 'ArrowDown' ? 1 : -1) + actions.length) % actions.length
    actions[next].focus()
  }

  return {
    menuOpen,
    setMenuOpen,
    menuRef,
    popupRef,
    onMenuKeyDown,
    onTriggerKeyDown: (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setMenuOpen(true)
      }
    },
    onRootBlur: (event) => closeWhenFocusLeaves(event.currentTarget, () => setMenuOpen(false)),
  }
}

// Phones and tablets draw the compact card, desktops the original one
// (utils/useCompactDashboard.js).
export default function OwnerSiteCard(props) {
  return useCompactDashboard() ? <CompactOwnerSiteCard {...props} /> : <DesktopOwnerSiteCard {...props} />
}

function CompactOwnerSiteCard({
  site, isPinned, onTogglePin, onDelete, onDuplicate, onExport, busyAction, view = 'grid',
}) {
  const { language, t } = useLanguage()
  const address = siteAddress(site)
  const { menuOpen, setMenuOpen, menuRef, popupRef, onMenuKeyDown, onTriggerKeyDown, onRootBlur } = useActionsMenu()
  const titleId = useId()
  const menuId = useId()
  const health = projectHealth(site)

  const runMenuAction = (action) => {
    setMenuOpen(false)
    action?.(site)
  }

  return (
    <article className={`owner-site-card ${view === 'list' ? 'owner-site-card-list' : ''}`} aria-labelledby={titleId}>
      <Link to={`/editor/${site.id}`} tabIndex={-1} aria-hidden="true" className="owner-site-card-preview">
        <SitePreview site={site} source="owner" height={view === 'list' ? 146 : 190} framed={false} />
        {isPinned && <span className="owner-site-card-pinned"><PinIcon size={12} /> {t('Pinned')}</span>}
      </Link>

      <div className="owner-site-card-body">
        <div className="owner-site-card-heading">
          <div className="min-w-0">
            <h3 id={titleId}>{site.title}</h3>
            <p>{site.published ? address?.label : `/site/${site.slug}`}</p>
          </div>
          <div className="owner-site-card-state">
            <span className={`dashboard-status ${site.published ? 'dashboard-status-live' : ''}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              {site.published ? t('Published') : t('Draft')}
            </span>
            <div ref={menuRef} className="owner-site-card-menu-root" onBlur={onRootBlur}>
              <button type="button" className="studio-icon-btn owner-site-card-more"
                aria-label={`${t('Project actions')}: ${site.title}`} aria-haspopup="menu" aria-expanded={menuOpen}
                aria-controls={menuOpen ? menuId : undefined}
                onKeyDown={onTriggerKeyDown}
                onClick={() => setMenuOpen((open) => !open)}>
                <MoreHorizontalIcon size={17} />
              </button>
              {menuOpen && <div ref={popupRef} id={menuId} role="menu" aria-label={`${t('Project actions')}: ${site.title}`}
                className="owner-site-card-menu" onKeyDown={onMenuKeyDown}>
                <button role="menuitem" type="button" onClick={() => runMenuAction(onTogglePin)}>
                  <PinIcon size={14} /> {isPinned ? t('Unpin project') : t('Pin project')}
                </button>
                <button role="menuitem" type="button" disabled={busyAction === `duplicate-${site.id}`} aria-busy={busyAction === `duplicate-${site.id}`}
                  onClick={() => runMenuAction(onDuplicate)}><CopyIcon size={14} /> {busyAction === `duplicate-${site.id}` ? t('Duplicating…') : t('Duplicate')}</button>
                <button role="menuitem" type="button" disabled={busyAction === `export-${site.id}`} aria-busy={busyAction === `export-${site.id}`}
                  onClick={() => runMenuAction(onExport)}><CodeIcon size={14} /> {busyAction === `export-${site.id}` ? t('Preparing…') : t('Export project')}</button>
                <div className="owner-site-card-menu-divider" />
                <button role="menuitem" type="button" onClick={() => runMenuAction(onDelete)} className="owner-site-card-delete"><TrashIcon size={14} /> {t('Delete site')}</button>
              </div>}
            </div>
          </div>
        </div>

        <div className="owner-site-card-details">
          <div className="owner-site-card-health">
            <div className="owner-site-card-health-label"><span>{t('Project readiness')}</span><span>{health.score}%</span></div>
            <div className="owner-site-card-health-track"><span style={{ width: `${health.score}%` }} /></div>
            <div className="owner-site-card-health-pills">
              <HealthPill complete={health.mobile_ready}>{t('Mobile')}</HealthPill>
              <HealthPill complete={health.seo_ready}>{t('SEO {done}/{total}', { done: health.seo_pages, total: health.seo_total })}</HealthPill>
              {site.custom_domain && <HealthPill complete={health.domain_ready}>{t('Domain')}</HealthPill>}
            </div>
          </div>
          <div className="owner-site-card-metrics">
            <span><EyeIcon size={13} /><span className="sr-only">{t('Views')}:</span> {(site.view_count || 0).toLocaleString()}</span>
            <span><StarIcon size={13} /><span className="sr-only">{t('Favorites')}:</span> {(site.favorite_count || 0).toLocaleString()}</span>
            <span><FileIcon size={12} />{t('{count} pages', { count: health.page_count || 1 })}</span>
            {site.updated_at && <span className="owner-site-card-updated"><ClockIcon size={12} /><span>{t('Edited {time}', { time: formatRelativeActivity(site.updated_at, language) })}</span></span>}
          </div>
        </div>
        <div className="owner-site-card-actions">
          <Link to={`/editor/${site.id}`} aria-label={`${t('Continue editing')}: ${site.title}`} className="owner-site-card-edit">
            {t('Continue editing')} <ArrowRightIcon size={14} />
          </Link>
          {site.published && address && <a href={address.href} target="_blank" rel="noreferrer"
            title={t('Open the live site at {address}', { address: address.label })}
            className="studio-icon-btn studio-btn-secondary"><GlobeIcon size={15} /></a>}
        </div>
      </div>
    </article>
  )
}

function DesktopHealthPill({ complete, children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${
      complete
        ? 'border-[color-mix(in_srgb,var(--studio-success)_25%,var(--studio-border))] bg-[color-mix(in_srgb,var(--studio-success)_10%,var(--studio-panel-raised))] text-[var(--studio-success)]'
        : 'border-[var(--studio-border)] bg-[var(--studio-control)] text-[var(--studio-text-muted)]'
    }`}>
      {complete && <CheckIcon size={11} />}
      {children}
    </span>
  )
}

function DesktopOwnerSiteCard({
  site,
  isPinned,
  onTogglePin,
  onDelete,
  onDuplicate,
  onExport,
  busyAction,
}) {
  const { language, t } = useLanguage()
  const address = siteAddress(site)
  const { menuOpen, setMenuOpen, menuRef, popupRef, onMenuKeyDown, onTriggerKeyDown, onRootBlur } = useActionsMenu()
  const menuId = useId()
  const health = projectHealth(site)

  const runMenuAction = (action) => {
    setMenuOpen(false)
    action?.(site)
  }

  return (
    <article className="sb-frame group relative flex h-full flex-col overflow-visible rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] transition-[border-color,box-shadow] duration-150 hover:border-[color-mix(in_srgb,var(--studio-accent)_40%,var(--studio-border))] hover:shadow-[var(--studio-shadow)]">
      {isPinned && (
        <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--studio-accent)_30%,var(--studio-border))] bg-[color-mix(in_srgb,var(--studio-panel-raised)_90%,transparent)] px-2.5 py-1 text-[10px] font-bold text-[var(--studio-accent-hover)] shadow-sm backdrop-blur">
          <PinIcon size={11} /> {t('Pinned')}
        </span>
      )}
      {/* The picture is a mouse shortcut to "Continue editing" below. It has no
          words of its own, so the keyboard and screen readers skip it rather
          than meet a link called nothing. */}
      <Link to={`/editor/${site.id}`} tabIndex={-1} aria-hidden="true" className="block overflow-hidden rounded-t-[calc(var(--studio-radius-lg)-1px)] border-b border-[var(--studio-border)] bg-[var(--studio-control)]">
        <SitePreview site={site} source="owner" height={160} framed={false} />
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-[1.125rem]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[0.95rem] font-semibold text-[var(--studio-text)]">{site.title}</h3>
            {/* The address worth sharing: the site's own domain when one is
                connected, else the served page. `/site/<slug>` is the showcase
                page, not the site. */}
            <p className="mt-0.5 truncate text-[11px] text-[var(--studio-text-faint)]">
              {site.published ? address?.label : `/site/${site.slug}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className={`dashboard-status ${site.published ? 'dashboard-status-live' : ''}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              {site.published ? t('Published') : t('Draft')}
            </span>
            <div ref={menuRef} className="relative" onBlur={onRootBlur}>
              <button
                type="button"
                className="studio-icon-btn h-8 w-8"
                aria-label={`${t('Project actions')}: ${site.title}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls={menuOpen ? menuId : undefined}
                onKeyDown={onTriggerKeyDown}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <MoreHorizontalIcon size={16} />
              </button>
              {menuOpen && (
                <div ref={popupRef} id={menuId} role="menu" aria-label={`${t('Project actions')}: ${site.title}`} onKeyDown={onMenuKeyDown} className="absolute right-0 top-9 z-30 w-48 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] p-1.5 text-xs text-[var(--studio-text)] shadow-[var(--studio-shadow-lg)]">
                  <button role="menuitem" type="button" onClick={() => runMenuAction(onTogglePin)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--studio-control-hover)]">
                    <PinIcon size={14} /> {isPinned ? t('Unpin project') : t('Pin project')}
                  </button>
                  <button role="menuitem" type="button" disabled={busyAction === `duplicate-${site.id}`} onClick={() => runMenuAction(onDuplicate)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--studio-control-hover)] disabled:opacity-50">
                    <CopyIcon size={14} /> {busyAction === `duplicate-${site.id}` ? t('Duplicating…') : t('Duplicate')}
                  </button>
                  <button role="menuitem" type="button" disabled={busyAction === `export-${site.id}`} onClick={() => runMenuAction(onExport)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--studio-control-hover)] disabled:opacity-50">
                    <CodeIcon size={14} /> {busyAction === `export-${site.id}` ? t('Preparing…') : t('Export project')}
                  </button>
                  <div className="my-1 border-t border-[var(--studio-border)]" />
                  <button role="menuitem" type="button" onClick={() => runMenuAction(onDelete)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[var(--studio-danger)] hover:bg-[color-mix(in_srgb,var(--studio-danger)_8%,transparent)]">
                    <TrashIcon size={14} /> {t('Delete site')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-[var(--studio-text-muted)]">
            <span>{t('Project readiness')}</span>
            <span className="text-[var(--studio-text)]">{health.score}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--studio-control)]">
            <span className="block h-full rounded-full bg-[var(--studio-accent)] transition-[width]" style={{ width: `${health.score}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <DesktopHealthPill complete={health.mobile_ready}>{t('Mobile')}</DesktopHealthPill>
            <DesktopHealthPill complete={health.seo_ready}>{t('SEO {done}/{total}', { done: health.seo_pages, total: health.seo_total })}</DesktopHealthPill>
            {site.custom_domain && <DesktopHealthPill complete={health.domain_ready}>{t('Domain')}</DesktopHealthPill>}
          </div>
        </div>

        {/* The figures carry their names for a screen reader; on screen the
            icon says it. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-[var(--studio-text-faint)]">
          <span className="flex items-center gap-1"><EyeIcon size={13} /> <span className="sr-only">{t('Views')}:</span> {(site.view_count || 0).toLocaleString()}</span>
          <span className="flex items-center gap-1"><StarIcon size={13} /> <span className="sr-only">{t('Favorites')}:</span> {(site.favorite_count || 0).toLocaleString()}</span>
          <span className="flex items-center gap-1"><FileIcon size={12} /> {t('{count} pages', { count: health.page_count || 1 })}</span>
          {site.updated_at && (
            <span className="ml-auto flex min-w-0 items-center gap-1">
              <ClockIcon size={12} /> <span className="truncate">{t('Edited {time}', { time: formatRelativeActivity(site.updated_at, language) })}</span>
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center gap-2 border-t border-[var(--studio-border)] pt-3.5">
          <Link to={`/editor/${site.id}`} aria-label={`${t('Continue editing')}: ${site.title}`} className="studio-btn studio-btn-accent min-h-9 flex-1 px-3">
            {t('Continue editing')} <ArrowRightIcon size={14} />
          </Link>
          {site.published && address && (
            <a
              href={address.href}
              target="_blank"
              rel="noreferrer"
              title={t('Open the live site at {address}', { address: address.label })}
              className="studio-icon-btn studio-btn-secondary h-9 w-9"
            >
              <GlobeIcon size={15} />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
