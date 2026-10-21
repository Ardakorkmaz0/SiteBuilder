import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { getProfile, updateProfile, uploadAvatar } from '../api/profile.js'
import { fetchMe } from '../api/auth.js'
import { listSites } from '../api/sites.js'
import { useAuthStore } from '../store/authStore.js'
import { apiError } from '../utils/errors.js'
import { formatRelativeActivity, orderSites } from '../utils/siteSort.js'
import { useScrollRestore } from '../utils/useScrollRestore.js'
import DashboardHeader, { DashboardAvatar } from '../components/dashboard/DashboardHeader.jsx'
import WorkspaceLayout from '../components/dashboard/WorkspaceLayout.jsx'
import '../ui/profile-design.css'
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  GithubIcon,
  GlobeIcon,
  InstagramIcon,
  LinkIcon,
  MapPinIcon,
  PlusIcon,
  XSocialIcon,
} from '../components/icons.jsx'
import { profileLinks } from '../utils/profileLinks.js'
import { useLanguage } from '../i18n/useLanguage.js'
import { useDocumentTitle } from '../utils/useDocumentTitle.js'
import { accountName } from '../utils/accountName.js'

const LINK_ICONS = { website: LinkIcon, github: GithubIcon, twitter: XSocialIcon, instagram: InstagramIcon }

// The sites used to live on this page, under #projects. An address kept from
// then (a bookmark, an open tab's menu) still reaches them.
export default function ProfilePage() {
  const { hash } = useLocation()
  if (hash === '#projects') return <Navigate to="/sites" replace />
  return <Profile />
}

function Profile() {
  const { language, t } = useLanguage()
  useDocumentTitle(t('Profile'))
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  // Modern-profile meta — a single object keeps the six optional fields tidy.
  const [meta, setMeta] = useState({ headline: '', location: '', website: '', github: '', twitter: '', instagram: '' })
  const setMetaField = (key) => (event) => {
    setMeta((m) => ({ ...m, [key]: event.target.value }))
    setLinkError((current) => (current?.field === key ? null : current))
  }
  // A link the server refused ("Enter a web address…") is said under that
  // field and the cursor goes there. In the banner at the top of the page it
  // was out of sight of the Save button that caused it.
  const [linkError, setLinkError] = useState(null)
  const linkFieldProps = (key) => ({
    id: `profile-${key}`,
    'aria-invalid': linkError?.field === key || undefined,
    'aria-describedby': linkError?.field === key ? `profile-${key}-error` : undefined,
  })
  const linkErrorText = (key) => (linkError?.field === key
    ? <p id={`profile-${key}-error`} className="mt-1 text-xs text-[var(--studio-danger)]">{linkError.message}</p>
    : null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const fileRef = useRef(null)

  const [sites, setSites] = useState([])
  const [sitesLoading, setSitesLoading] = useState(true)

  useEffect(() => {
    getProfile()
      .then((result) => {
        setProfile(result)
        setDisplayName(result.display_name || '')
        setBio(result.bio || '')
        setMeta({
          headline: result.headline || '',
          location: result.location || '',
          website: result.website || '',
          github: result.github || '',
          twitter: result.twitter || '',
          instagram: result.instagram || '',
        })
      })
      .catch((requestError) => setError(apiError(requestError)))
      .finally(() => setLoading(false))
    listSites()
      .then(setSites)
      .catch((requestError) => setError(apiError(requestError)))
      .finally(() => setSitesLoading(false))
  }, [])

  const stats = useMemo(() => ({
    total: sites.length,
    published: sites.filter((site) => site.published).length,
    views: sites.reduce((total, site) => total + (site.view_count || 0), 0),
    favorites: sites.reduce((total, site) => total + (site.favorite_count || 0), 0),
  }), [sites])
  const recentActivity = useMemo(() => orderSites(sites).slice(0, 4), [sites])

  useScrollRestore(!loading && !sitesLoading)

  async function refreshHeader() {
    try {
      setUser(await fetchMe())
    } catch {
      // Updating the profile succeeded; a header refresh failure is non-fatal.
    }
  }

  async function onSave(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setLinkError(null)
    setSaved(false)
    try {
      const result = await updateProfile({ display_name: displayName, bio, ...meta })
      setProfile(result)
      await refreshHeader()
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } catch (requestError) {
      const field = ['website', 'github', 'twitter', 'instagram'].find((key) => requestError?.response?.data?.[key])
      if (field) {
        setLinkError({ field, message: apiError(requestError) })
        document.getElementById(`profile-${field}`)?.focus()
      } else {
        setError(apiError(requestError))
      }
    } finally {
      setSaving(false)
    }
  }

  async function onAvatar(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const result = await uploadAvatar(file)
      setProfile(result)
      await refreshHeader()
    } catch (requestError) {
      setError(apiError(requestError))
    } finally {
      setUploading(false)
    }
  }

  const profileUser = {
    ...user,
    avatar_url: profile?.avatar_url || user?.avatar_url,
    display_name: profile?.display_name || user?.display_name,
    username: profile?.username || user?.username,
  }
  const profileName = accountName(profileUser, t, t('Creator'))
  const launchSteps = [
    { done: Boolean(profile?.display_name && profile?.bio), label: t('Complete your public profile') },
    { done: sites.length > 0, label: t('Create your first project') },
    { done: stats.published > 0, label: t('Publish a site') },
    { done: stats.views > 0, label: t('Get your first visitor') },
  ]
  const completedLaunchSteps = launchSteps.filter((step) => step.done).length

  return (
    <div className="dashboard-page workspace-page profile-design-page">
      <a href="#profile-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-[var(--studio-panel-raised)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--studio-accent-hover)] focus:shadow-lg">
        {t('Skip to content')}
      </a>
      <DashboardHeader current="profile" />

      <WorkspaceLayout id="profile-main">
        <div className="workspace-heading">
          <div>
            <div>
              <h1 className="text-2xl font-semibold text-[var(--studio-text)] sm:text-3xl">{t('Profile')}</h1>
              <p className="mt-1 text-sm text-[var(--studio-text-muted)]">{t('Your public identity across Sitebuilder.')}</p>
            </div>
          </div>
          {user?.id && (
            <Link to={`/u/${user.id}`} className="studio-btn studio-btn-secondary min-h-10 px-3.5">
              <GlobeIcon size={15} /> {t('View public profile')}
            </Link>
          )}
        </div>

        {error && (
          <div role="alert" className="studio-status-danger mb-5 rounded-xl border px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="workspace-panel profile-loading" role="status" aria-label={t('Loading…')}>
            <div className="h-20 w-20 rounded-full bg-[var(--studio-control)]" />
            <div className="mt-4 h-5 w-48 rounded bg-[var(--studio-control)]" />
          </div>
        ) : (
          <section className="workspace-panel profile-identity-card" aria-labelledby="profile-name">
            <div className="profile-identity-layout">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative w-fit">
                  <DashboardAvatar user={profileUser} size={86} />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml"
                    onChange={onAvatar}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    title={profile?.avatar_url ? t('Change photo') : t('Upload photo')}
                    className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] text-[var(--studio-text)] shadow-md hover:bg-[var(--studio-control-hover)]"
                  >
                    {uploading ? <span className="text-xs">…</span> : <PlusIcon size={15} />}
                  </button>
                </div>
                <div className="min-w-0">
                  <h2 id="profile-name" className="truncate text-2xl font-semibold text-[var(--studio-text)]">{profileName}</h2>
                  {(!user?.is_guest || profile?.headline) && (
                    <p className="mt-0.5 text-sm font-medium text-[var(--studio-text-muted)]">
                      {!user?.is_guest && <>@{profileUser.username}</>}
                      {profile?.headline && <span className="text-[var(--studio-text)]">{user?.is_guest ? '' : ' · '}{profile.headline}</span>}
                    </p>
                  )}
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--studio-text-muted)]">
                    {profile?.bio || t('Add a short bio so visitors know who is behind your sites.')}
                  </p>
                  {(profile?.location || profileLinks(profile).length > 0) && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-[var(--studio-text-muted)]">
                      {profile?.location && (
                        <span className="flex items-center gap-1"><MapPinIcon size={13} /> {profile.location}</span>
                      )}
                      {profileLinks(profile).map(({ id, label, href }) => {
                        const ChipIcon = LINK_ICONS[id] || LinkIcon
                        return (
                          <a
                            key={id}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex max-w-44 items-center gap-1 hover:text-[var(--studio-accent-hover)]"
                          >
                            <ChipIcon size={13} /> <span className="truncate">{label}</span>
                          </a>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Keep account totals alongside the identity without competing with
                  the editable sections below. */}
              <dl className="profile-stat-grid">
                {[
                  ['Sites', stats.total],
                  ['Published', stats.published],
                  ['Total views', stats.views],
                  ['Favorites', stats.favorites],
                ].map(([label, value]) => (
                  <div key={label} className="dashboard-figure">
                    <dt>{t(label)}</dt>
                    <dd>{Number(value).toLocaleString()}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        <div className="profile-page-sections">
          <section className="workspace-panel profile-details-panel" aria-labelledby="profile-details-heading">
            <h2 id="profile-details-heading" className="text-lg font-semibold text-[var(--studio-text)]">{t('Profile details')}</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--studio-text-muted)]">{t('Update the name and bio shown across Sitebuilder.')}</p>

            {!loading && (
              <form onSubmit={onSave} className="profile-details-form">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="profile-display-name" className="mb-1.5 block text-xs font-semibold text-[var(--studio-text-muted)]">{t('Display name')}</label>
                    <input
                      className="studio-input w-full px-3 py-2 text-sm"
                      id="profile-display-name"
                      placeholder={user?.is_guest ? t('Your name') : profile?.username}
                      value={displayName}
                      maxLength={80}
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-headline" className="mb-1.5 block text-xs font-semibold text-[var(--studio-text-muted)]">{t('Headline')}</label>
                    <input
                      className="studio-input w-full px-3 py-2 text-sm"
                      id="profile-headline"
                      placeholder={t('e.g. Product designer')}
                      value={meta.headline}
                      maxLength={80}
                      onChange={setMetaField('headline')}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label htmlFor="profile-bio" className="text-xs font-semibold text-[var(--studio-text-muted)]">{t('Bio')}</label>
                    <span className="text-xs text-[var(--studio-text-faint)]">{bio.length}/300</span>
                  </div>
                  <textarea
                    className="studio-input min-h-28 w-full resize-y px-3 py-2 text-sm"
                    maxLength={300}
                    id="profile-bio"
                    placeholder={t('A line or two about you…')}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="profile-location" className="mb-1.5 block text-xs font-semibold text-[var(--studio-text-muted)]">{t('Location')}</label>
                    <input
                      className="studio-input w-full px-3 py-2 text-sm"
                      id="profile-location"
                      placeholder={t('e.g. Istanbul')}
                      value={meta.location}
                      maxLength={80}
                      onChange={setMetaField('location')}
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-website" className="mb-1.5 block text-xs font-semibold text-[var(--studio-text-muted)]">{t('Website')}</label>
                    <input
                      className="studio-input w-full px-3 py-2 text-sm"
                      {...linkFieldProps('website')}
                      placeholder={t('yoursite.com')}
                      value={meta.website}
                      maxLength={200}
                      onChange={setMetaField('website')}
                    />
                    {linkErrorText('website')}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-[var(--studio-text-muted)]">{t('Social links')}</p>
                  <p className="mb-2 text-[11px] leading-4 text-[var(--studio-text-faint)]">{t('A handle (@you) or a full link: both work.')}</p>
                  <div className="profile-social-fields">
                    {[
                      ['github', GithubIcon, 'GitHub'],
                      ['twitter', XSocialIcon, 'X (Twitter)'],
                      ['instagram', InstagramIcon, 'Instagram'],
                    ].map(([key, SocialIcon, label]) => (
                      <div key={key}>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--studio-text-faint)]"><SocialIcon size={14} /></span>
                          <input
                            className="studio-input w-full py-2 pl-9 pr-3 text-sm"
                            {...linkFieldProps(key)}
                            placeholder={label}
                            aria-label={label}
                            value={meta[key]}
                            maxLength={100}
                            onChange={setMetaField(key)}
                          />
                        </div>
                        {linkErrorText(key)}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button type="submit" disabled={saving} className="studio-btn studio-btn-primary min-h-9 px-4">
                    {saving ? t('Saving…') : t('Save profile')}
                  </button>
                  {saved && <span role="status" className="flex items-center gap-1 text-xs font-semibold text-[var(--studio-success)]"><CheckIcon size={14} /> {t('Saved')}</span>}
                </div>
              </form>
            )}
          </section>

          <div className="profile-support-grid">
            <section className="workspace-panel profile-support-panel" aria-labelledby="launch-checklist-heading">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="launch-checklist-heading" className="font-semibold text-[var(--studio-text)]">{t('Make your workspace ready')}</h2>
                </div>
                <span className="text-xs font-bold text-[var(--studio-accent-hover)]">{completedLaunchSteps}/{launchSteps.length}</span>
              </div>
              <div className="profile-checklist-progress mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--studio-control)]">
                <span className="block h-full rounded-full bg-[var(--studio-accent)]" style={{ width: `${completedLaunchSteps / launchSteps.length * 100}%` }} />
              </div>
              <div className="mt-4 space-y-2.5">
                {launchSteps.map((step) => (
                  <div key={step.label} className="flex items-center gap-2 text-xs">
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${step.done ? 'border-[var(--studio-success)] bg-[var(--studio-success-soft)] text-[var(--studio-success)]' : 'border-[var(--studio-border)] text-[var(--studio-text-faint)]'}`}>
                      {step.done && <CheckIcon size={12} />}
                    </span>
                    <span className={step.done ? 'text-[var(--studio-text-muted)] line-through' : 'font-medium text-[var(--studio-text)]'}>{step.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {recentActivity.length > 0 && (
              <section className="workspace-panel profile-support-panel" aria-labelledby="activity-heading">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="activity-heading" className="font-semibold text-[var(--studio-text)]">{t('Recent changes')}</h2>
                  <Link to="/sites" className="flex items-center gap-1 text-xs font-semibold text-[var(--studio-accent-hover)] hover:underline">
                    {t('All sites')} <ArrowRightIcon size={13} />
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {recentActivity.map((site) => (
                    <Link key={site.id} to={`/editor/${site.id}`} className="flex items-start gap-3 rounded-lg p-1.5 hover:bg-[var(--studio-control-hover)]">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--studio-control)] text-[var(--studio-text-muted)]"><ClockIcon size={13} /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-[var(--studio-text)]">{site.title}</span>
                        <span className="mt-0.5 block text-xs text-[var(--studio-text-faint)]">{t('Edited {time}', { time: formatRelativeActivity(site.updated_at, language) })}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </WorkspaceLayout>
    </div>
  )
}
