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
import '../../ui/sites-design.css'

function HealthPill({ complete, children }) {
  return <span className={`owner-site-health-pill ${complete ? 'owner-site-health-pill-complete' : ''}`}>
    {complete && <CheckIcon size={11} />}{children}
  </span>
}

export default function OwnerSiteCard({
  site, isPinned, onTogglePin, onDelete, onDuplicate, onExport, busyAction, view = 'grid',
}) {
  const { language, t } = useLanguage()
  const address = siteAddress(site)
  const [menuOpen, setMenuOpen] = useState(false)
  useEscapeToClose(menuOpen, () => setMenuOpen(false))
  const menuRef = useRef(null)
  const popupRef = useRef(null)
  const titleId = useId()
  const menuId = useId()
  const health = site.project_health || {
    score: site.published ? 45 : 20,
    page_count: 1,
    mobile_ready: false,
    seo_ready: false,
    seo_pages: 0,
    seo_total: 1,
    domain_ready: site.domain_status === 'connected',
  }

  useEffect(() => {
    if (!menuOpen) return undefined
    popupRef.current?.querySelector('button:not(:disabled)')?.focus()
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menuOpen])

  const runMenuAction = (action) => {
    setMenuOpen(false)
    action?.(site)
  }

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
            <div ref={menuRef} className="owner-site-card-menu-root" onBlur={(event) => closeWhenFocusLeaves(event.currentTarget, () => setMenuOpen(false))}>
              <button type="button" className="studio-icon-btn owner-site-card-more"
                aria-label={`${t('Project actions')}: ${site.title}`} aria-haspopup="menu" aria-expanded={menuOpen}
                aria-controls={menuOpen ? menuId : undefined}
                onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setMenuOpen(true) } }}
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
