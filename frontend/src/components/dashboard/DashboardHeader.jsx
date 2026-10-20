import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore, useIsGuest } from '../../store/authStore.js'
import { useLanguage } from '../../i18n/useLanguage.js'
import { accountName } from '../../utils/accountName.js'
import { useEscapeToClose } from '../../ui/useEscapeToClose.js'
import { useMediaQuery } from '../../utils/useMediaQuery.js'
import LanguageSwitcher from '../LanguageSwitcher.jsx'
import DashboardGlobalSearch from './DashboardGlobalSearch.jsx'
import AppInfo from './AppInfo.jsx'
import './dashboard-navigation.css'
import '../../ui/dashboard-theme.css'
import {
  ChevronDownIcon,
  FolderIcon,
  GlobeIcon,
  LayersIcon,
  MoreHorizontalIcon,
  LogOutIcon,
  SearchIcon,
  ShieldIcon,
  StarIcon,
  UserIcon,
} from '../icons.jsx'

export function DashboardAvatar({ user, size = 32 }) {
  const { t } = useLanguage()
  const letter = (accountName(user, t) || '?').trim().charAt(0).toLocaleUpperCase()
  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <span className="dashboard-avatar" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden>
      {letter}
    </span>
  )
}

const NAV_ITEMS = [
  { id: 'explore', label: 'Explore', to: '/', icon: GlobeIcon },
  { id: 'projects', label: 'My sites', to: '/sites', icon: FolderIcon },
  { id: 'community', label: 'Blocks', to: '/community', icon: LayersIcon },
  { id: 'favorites', label: 'Favorites', to: '/favorites', icon: StarIcon },
  { id: 'profile', label: 'Profile', to: '/profile', icon: UserIcon },
]
const PHONE_ITEMS = NAV_ITEMS.filter(({ id }) => ['explore', 'projects', 'favorites'].includes(id))

// Search stays a deliberate action in the chrome; the full search page already
// has its own field and does not need a second one.
export default function DashboardHeader({ current = '', showSearch = true }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const isGuest = useIsGuest()
  const logout = useAuthStore((state) => state.logout)
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const accountRef = useRef(null)
  const accountTriggerRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const mobileTriggerRef = useRef(null)
  const searchRef = useRef(null)
  const searchTriggerRef = useRef(null)
  const searchId = useId()
  const accountId = useId()
  const menuId = useId()
  const displayName = accountName(user, t, t('Account'))
  const isNarrow = useMediaQuery('(max-width: 1023.98px)')

  useEscapeToClose(accountOpen, () => setAccountOpen(false))
  useEscapeToClose(mobileOpen, () => setMobileOpen(false))
  useEscapeToClose(searchOpen, () => setSearchOpen(false))

  useEffect(() => {
    const closeOutside = (event) => {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false)
      if (!mobileMenuRef.current?.contains(event.target) && !mobileTriggerRef.current?.contains(event.target)) setMobileOpen(false)
      if (!searchRef.current?.contains(event.target) && !searchTriggerRef.current?.contains(event.target)) setSearchOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])

  useEffect(() => {
    if (searchOpen) searchRef.current?.querySelector('input[type="search"]')?.focus()
  }, [searchOpen])

  function onLogout() {
    if (isGuest && !window.confirm(t('Signing out of a guest session cannot be undone: there is no password to come back with, and what you made stays behind. Create an account first?'))) return
    logout()
    navigate('/login')
  }

  function closeNavigation() {
    setAccountOpen(false)
    setMobileOpen(false)
    setSearchOpen(false)
  }

  return (
    <>
      <header className="dashboard-header">
        <div data-testid="explore-header-inner" className="dashboard-header-inner">
          <Link to="/" aria-label={t('Sitebuilder home')} className="dashboard-brand" onClick={closeNavigation}>
            <span className="brand-mark" aria-hidden="true">S</span>
            <span className="dashboard-brand-name">Sitebuilder</span>
          </Link>

          <nav aria-label={t('Navigation')} className="dashboard-primary-nav">
            {NAV_ITEMS.map(({ id, label, to, icon: NavIcon }) => (
              <Link key={id} to={to} onClick={closeNavigation} aria-current={current === id ? 'page' : undefined}
                className={`dashboard-nav-link ${current === id ? 'dashboard-nav-link-active' : ''}`}>
                <NavIcon size={16} {...(id === 'favorites' ? { filled: current === id } : {})} />
                {t(label)}
              </Link>
            ))}
          </nav>

          <div className="dashboard-header-tools">
            {isGuest && (
              <Link to="/register" className="dashboard-guest-link"
                title={t('You are browsing as a guest: your work lives in this browser only. Create an account to publish it and to reach it from anywhere.')}>
                {t('Guest')} · {t('Create my account')}
              </Link>
            )}
            {showSearch && (
              <button ref={searchTriggerRef} type="button" aria-label={t('Search')} aria-expanded={searchOpen}
                aria-controls={searchOpen ? searchId : undefined} className="studio-icon-btn dashboard-search-trigger"
                onClick={() => { setAccountOpen(false); setMobileOpen(false); setSearchOpen((open) => !open) }}>
                <SearchIcon size={19} />
              </button>
            )}
            <div className="dashboard-guide-control"><AppInfo /></div>
            <LanguageSwitcher className="dashboard-header-language" />
            <div ref={accountRef} className="dashboard-account">
              <button ref={accountTriggerRef} type="button" className="dashboard-account-trigger"
                aria-label={t('Account menu')} aria-expanded={accountOpen} aria-controls={accountOpen ? accountId : undefined}
                onClick={() => { setMobileOpen(false); setSearchOpen(false); setAccountOpen((open) => !open) }}>
                <DashboardAvatar user={user} />
                <span className="dashboard-account-name">{displayName}</span>
                <ChevronDownIcon size={14} className={`dashboard-account-chevron ${accountOpen ? 'rotate-180' : ''}`} />
              </button>
              {accountOpen && (
                <div id={accountId} className="studio-menu dashboard-account-menu">
                  <div className="flex items-center gap-3 px-2 py-2.5">
                    <DashboardAvatar user={user} size={40} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--studio-text)]">{displayName}</p>
                      {!isGuest && <p className="truncate text-xs text-[var(--studio-text-muted)]">@{user?.username}</p>}
                    </div>
                  </div>
                  <div className="my-1 border-t studio-divider" />
                  <Link to="/profile" onClick={closeNavigation} className="studio-menu-item"><UserIcon size={16} /> {t('Profile')}</Link>
                  <Link to="/sites" onClick={closeNavigation} className="studio-menu-item"><FolderIcon size={16} /> {t('My sites')}</Link>
                  {isGuest && <Link to="/register" onClick={closeNavigation} className="studio-menu-item">{t('Create my account')}</Link>}
                  {user?.is_staff && <Link to="/admin" onClick={closeNavigation} className="studio-menu-item"><ShieldIcon size={16} /> {t('Admin')}</Link>}
                  <div className="my-1 border-t studio-divider" />
                  <button type="button" onClick={onLogout} className="studio-menu-item text-[var(--studio-danger)]"><LogOutIcon size={16} /> {t('Log out')}</button>
                </div>
              )}
            </div>
            <button ref={mobileTriggerRef} type="button" aria-label={t('Open menu')} aria-expanded={mobileOpen}
              aria-controls={mobileOpen ? menuId : undefined} className="studio-icon-btn dashboard-overflow-trigger"
              onClick={() => { setAccountOpen(false); setSearchOpen(false); setMobileOpen((open) => !open) }}>
              <MoreHorizontalIcon size={20} />
            </button>
          </div>
        </div>

        {searchOpen && showSearch && (
          <div ref={searchRef} id={searchId} className="dashboard-search-panel">
            <DashboardGlobalSearch onNavigate={() => setSearchOpen(false)} />
            <button type="button" onClick={() => setSearchOpen(false)} aria-label={t('Close search')} className="studio-icon-btn">×</button>
          </div>
        )}

        {mobileOpen && (
          <div ref={mobileMenuRef} id={menuId} className="dashboard-mobile-menu">
            <nav aria-label={t('Mobile navigation')} className="grid gap-1">
              {NAV_ITEMS.map(({ id, label, to, icon: NavIcon }) => (
                <Link key={id} to={to} onClick={closeNavigation} aria-current={current === id ? 'page' : undefined}
                  className={`studio-menu-item ${current === id ? 'dashboard-mobile-link-active' : ''}`}>
                  <NavIcon size={16} /> {t(label)}
                </Link>
              ))}
              {user?.is_staff && <Link to="/admin" onClick={closeNavigation} className="studio-menu-item"><ShieldIcon size={16} /> {t('Admin')}</Link>}
              <div className="my-1 border-t studio-divider" />
              <div className="dashboard-mobile-preferences">
                <span>{t('Appearance')} · {t('Language')}</span><LanguageSwitcher />
              </div>
              <div className="dashboard-mobile-guide"><AppInfo /></div>
              <button type="button" onClick={onLogout} className="studio-menu-item text-[var(--studio-danger)]"><LogOutIcon size={16} /> {t('Log out')}</button>
            </nav>
          </div>
        )}
      </header>
      {isNarrow && <nav aria-label={t('Quick navigation')} className="dashboard-bottom-nav">
        {PHONE_ITEMS.map(({ id, label, to, icon: NavIcon }) => (
          <Link key={id} to={to} onClick={closeNavigation} aria-current={current === id ? 'page' : undefined}>
            <NavIcon size={20} {...(id === 'favorites' ? { filled: current === id } : {})} />
            <span>{t(label)}</span>
          </Link>
        ))}
      </nav>}
    </>
  )
}
