import { useEffect, useRef, useState } from 'react'
import {
  TEMPLATE_COUNT,
  TEMPLATE_LAYOUTS,
  TEMPLATE_LIBRARY,
  TEMPLATE_LIBRARY_GROUPS,
} from '../../utils/templateLibrary.js'
import { localizeTemplateHtml } from '../../utils/templateLocalization.js'
import { useLanguage } from '../../i18n/useLanguage.js'
import { EyeIcon, SearchIcon, StarIcon } from '../icons.jsx'
import { useEscapeToClose } from '../../ui/useEscapeToClose.js'

const DESIGN_W = 1200
const DESIGN_H = 860
const FAVORITES_KEY = 'pwb_template_favorites'
const RECENTS_KEY = 'pwb_template_recents'
const INITIAL_VISIBLE_TEMPLATES = 18
const ALL_TEMPLATES = TEMPLATE_LIBRARY.flatMap((category) => (
  category.variants.map((template) => ({ category, template }))
))
const LAYOUT_NAMES = Object.fromEntries(TEMPLATE_LAYOUTS.map((layout) => [layout.id, layout.name]))
const GROUP_NAMES = Object.fromEntries(TEMPLATE_LIBRARY_GROUPS.flatMap((group) => (
  group.categories.map((category) => [category.id, group.name])
)))

function readIds(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch { return [] }
}

function writeIds(key, ids) {
  try { localStorage.setItem(key, JSON.stringify(ids)) } catch { /* ignore */ }
}

function Thumb({ html }) {
  const { t } = useLanguage()
  const boxRef = useRef(null)
  const [scale, setScale] = useState(0.3)
  useEffect(() => {
    const element = boxRef.current
    if (!element) return undefined
    const update = () => {
      const width = element.clientWidth
      if (width > 0) setScale(width / DESIGN_W)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={boxRef} data-theme-inverted className="relative w-full overflow-hidden border-b border-[var(--studio-border)] bg-white" style={{ aspectRatio: `${DESIGN_W} / ${DESIGN_H}` }}>
      <iframe
        title={t('template preview')}
        srcDoc={html}
        sandbox=""
        tabIndex={-1}
        scrolling="no"
        style={{ width: DESIGN_W, height: DESIGN_H, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}
      />
    </div>
  )
}

export default function TemplatePicker({ open, title, onPick, onClose }) {
  const { language, t } = useLanguage()
  const [activeId, setActiveId] = useState(TEMPLATE_LIBRARY[0].id)
  const [query, setQuery] = useState('')
  const [view, setView] = useState('category') // category | favorites | recent
  const [favorites, setFavorites] = useState(() => readIds(FAVORITES_KEY))
  const [recents, setRecents] = useState(() => readIds(RECENTS_KEY))
  const [preview, setPreview] = useState(null)
  const [contentLanguage, setContentLanguage] = useState(language)
  const [layout, setLayout] = useState('all')
  const [tone, setTone] = useState('all') // all | light | dark
  const [pagination, setPagination] = useState({ key: '', count: INITIAL_VISIBLE_TEMPLATES })
  useEscapeToClose(open, onClose)
  useEscapeToClose(open && !!preview, () => setPreview(null))

  if (!open) return null

  const active = TEMPLATE_LIBRARY.find((category) => category.id === activeId) || TEMPLATE_LIBRARY[0]
  const siteTitle = title || t('My Site')
  const normalizedQuery = query.trim().toLocaleLowerCase(language === 'tr' ? 'tr-TR' : 'en-US')
  // When the result set changes, derive a fresh first page instead of
  // synchronously resetting state in an effect.
  const resultSetKey = [language, activeId, normalizedQuery, view, layout, tone, favorites.join(','), recents.join(',')].join('|')
  const visibleCount = pagination.key === resultSetKey ? pagination.count : INITIAL_VISIBLE_TEMPLATES
  const order = view === 'recent' ? recents : null
  // Layout and light/dark narrow whatever view is showing, so "bento grids in
  // Restaurants" and "every dark page" are both one choice away.
  const matchesStyle = (template) => (
    (layout === 'all' || template.layout === layout)
    && (tone === 'all' || (tone === 'dark') === Boolean(template.dark))
  )
  let entries = view === 'category' && !normalizedQuery
    ? active.variants.filter(matchesStyle).map((template) => ({ category: active, template }))
    : ALL_TEMPLATES.filter(({ category, template }) => {
        if (view === 'favorites' && !favorites.includes(template.id)) return false
        if (view === 'recent' && !recents.includes(template.id)) return false
        if (!matchesStyle(template)) return false
        if (!normalizedQuery) return true
        return [t(category.name), t(template.name), t(template.desc), t(LAYOUT_NAMES[template.layout] || ''), t(GROUP_NAMES[category.id] || '')]
          .join(' ')
          .toLocaleLowerCase(language === 'tr' ? 'tr-TR' : 'en-US')
          .includes(normalizedQuery)
      })
  if (order) entries = [...entries].sort((a, b) => order.indexOf(a.template.id) - order.indexOf(b.template.id))
  const visibleEntries = entries.slice(0, visibleCount)
  const hasMoreEntries = visibleEntries.length < entries.length

  const viewTitle = view === 'favorites'
    ? `★ ${t('Favorites')}`
    : view === 'recent'
      ? `↺ ${t('Recent')}`
      : view === 'all' || normalizedQuery
        ? t('All templates')
        : `${active.icon} ${t(active.name)}`

  function toggleFavorite(templateId) {
    setFavorites((current) => {
      const next = current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [templateId, ...current]
      writeIds(FAVORITES_KEY, next)
      return next
    })
  }

  function choose(template) {
    const nextRecents = [template.id, ...recents.filter((id) => id !== template.id)].slice(0, 10)
    setRecents(nextRecents)
    writeIds(RECENTS_KEY, nextRecents)
    onPick(template, contentLanguage)
  }

  // Five hundred thumbnails are too many to scroll through looking for an
  // idea; a random pick from the current view is a faster way in.
  function surprise() {
    const pool = entries.length ? entries : ALL_TEMPLATES
    setPreview(pool[Math.floor(Math.random() * pool.length)])
  }

  function localizedHtml(template) {
    return localizeTemplateHtml(template.build(siteTitle), contentLanguage)
  }

  return (
    <div className="studio-theme-surface studio-overlay fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-gallery-title"
        className="flex h-[min(52rem,calc(100dvh-1rem))] w-full max-w-6xl flex-col overflow-hidden rounded-[var(--studio-radius-2xl)] border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] shadow-[var(--studio-shadow-lg)] sm:h-[min(52rem,calc(100dvh-2rem))]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-[var(--studio-border)] bg-[var(--studio-panel-raised)]">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <h2 id="template-gallery-title" className="flex flex-wrap items-center gap-2 text-base font-semibold text-[var(--studio-text)]">
                {t('Template gallery')}
                <span className="rounded-full border border-[color-mix(in_srgb,var(--studio-accent)_24%,var(--studio-border))] bg-[var(--studio-accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--studio-accent-hover)]">{t('{count} templates', { count: TEMPLATE_COUNT })}</span>
              </h2>
              <p className="mt-0.5 hidden text-xs text-[var(--studio-text-muted)] sm:block">{t('Search, preview and save favorites before applying a template.')}</p>
            </div>
            <button type="button" aria-label={t('Close')} onClick={onClose} className="studio-icon-btn shrink-0 border border-[var(--studio-border)] bg-[var(--studio-control)]">×</button>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3.5 sm:px-5">
            <label className="studio-input flex min-h-10 min-w-[180px] flex-1 items-center gap-2 px-3">
              <SearchIcon size={15} className="shrink-0 text-[var(--studio-text-faint)]" />
              <span className="sr-only">{t('Search templates')}</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search templates…')} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-[var(--studio-text)] outline-none placeholder:text-[var(--studio-text-faint)]" />
            </label>
            <div className="studio-segment min-h-10">
              {[
                ['all', 'All templates'],
                ['favorites', 'Favorites'],
                ['recent', 'Recent'],
              ].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setView(id)} aria-pressed={view === id} className={view === id ? 'studio-segment-btn studio-segment-btn-active' : 'studio-segment-btn'}>{t(label)}</button>
              ))}
            </div>
          </div>
          {/* Style filters and content language: one row that scrolls sideways
              on a phone instead of stacking four rows above the results. */}
          <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3.5 sm:flex-wrap sm:overflow-visible sm:px-5 [&>*]:shrink-0">
            <label className="flex min-h-10 items-center gap-2 rounded-[var(--studio-radius)] border border-[var(--studio-border)] bg-[var(--studio-control)] px-2.5 text-xs font-semibold text-[var(--studio-text-muted)]">
              <span>{t('Layout')}</span>
              <select value={layout} onChange={(event) => setLayout(event.target.value)} aria-label={t('Template layout')} className="max-w-[9.5rem] rounded-md border-0 bg-[var(--studio-panel-raised)] px-2 py-1 text-[var(--studio-text)] outline-none">
                <option value="all">{t('All layouts')}</option>
                {TEMPLATE_LAYOUTS.map((option) => <option key={option.id} value={option.id}>{t(option.name)}</option>)}
              </select>
            </label>
            <label className="flex min-h-10 items-center gap-2 rounded-[var(--studio-radius)] border border-[var(--studio-border)] bg-[var(--studio-control)] px-2.5 text-xs font-semibold text-[var(--studio-text-muted)]">
              <span>{t('Tone')}</span>
              <select value={tone} onChange={(event) => setTone(event.target.value)} aria-label={t('Light or dark pages')} className="rounded-md border-0 bg-[var(--studio-panel-raised)] px-2 py-1 text-[var(--studio-text)] outline-none">
                <option value="all">{t('Light and dark')}</option>
                <option value="light">{t('Light pages')}</option>
                <option value="dark">{t('Dark pages')}</option>
              </select>
            </label>
            <button type="button" onClick={surprise} className="studio-btn studio-btn-secondary min-h-10 px-3 text-xs">{t('Surprise me')}</button>
            <label className="flex min-h-10 items-center gap-2 rounded-[var(--studio-radius)] border border-[var(--studio-border)] bg-[var(--studio-control)] px-2.5 text-xs font-semibold text-[var(--studio-text-muted)]">
              <span>{t('Content')}</span>
              <select value={contentLanguage} onChange={(event) => setContentLanguage(event.target.value)} aria-label={t('Content language')} className="rounded-md border-0 bg-[var(--studio-panel-raised)] px-2 py-1 text-[var(--studio-text)] outline-none">
                <option value="tr">TR</option>
                <option value="en">EN</option>
              </select>
            </label>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside aria-label={t('Template categories')} className="flex w-full shrink-0 gap-1 overflow-x-auto border-b border-[var(--studio-border)] bg-[var(--studio-panel-muted)] p-2 md:block md:w-56 md:overflow-y-auto md:border-b-0 md:border-r">
            {TEMPLATE_LIBRARY_GROUPS.map((group) => (
              <div key={group.id} role="group" aria-label={t(group.name)} className="contents md:mb-3 md:block">
                <p aria-hidden="true" className="hidden px-3 pb-1 pt-2 text-[11px] font-semibold text-[var(--studio-text-faint)] md:block">{t(group.name)}</p>
                {group.categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => { setActiveId(category.id); setView('category'); setQuery('') }}
                    aria-pressed={view === 'category' && category.id === activeId}
                    className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition md:mb-1 md:w-full ${view === 'category' && category.id === activeId ? 'bg-[var(--studio-accent)] text-white shadow-sm' : 'text-[var(--studio-text)] hover:bg-[var(--studio-control-hover)]'}`}
                  >
                    <span className="text-base">{category.icon}</span>
                    <span className="min-w-0 flex-1 whitespace-nowrap font-medium md:truncate">{t(category.name)}</span>
                    <span className="rounded-full bg-[color-mix(in_srgb,currentColor_10%,transparent)] px-1.5 py-0.5 text-[10px] font-bold">{category.variants.length}</span>
                  </button>
                ))}
              </div>
            ))}
          </aside>

          <div className="min-w-0 flex-1 overflow-y-auto bg-[var(--studio-panel)] p-3 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[var(--studio-text)]">
                {viewTitle}
                <span className="ml-2 text-xs font-normal text-[var(--studio-text-muted)]">{t('{count} results', { count: entries.length })}</span>
              </h3>
            </div>
            {entries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--studio-border-strong)] bg-[var(--studio-panel-muted)] py-16 text-center text-sm text-[var(--studio-text-muted)]">
                <p className="m-0">{t('No templates match this view.')}</p>
                {(layout !== 'all' || tone !== 'all') && (
                  <button type="button" onClick={() => { setLayout('all'); setTone('all') }} className="studio-btn studio-btn-secondary mt-4 min-h-9 px-3 text-xs">{t('Clear filters')}</button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleEntries.map(({ category, template }) => {
                  const favorite = favorites.includes(template.id)
                  return (
                    <article key={template.id} className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] shadow-[var(--studio-shadow-sm)] transition hover:-translate-y-0.5 hover:border-[var(--studio-border-strong)] hover:shadow-[var(--studio-shadow-lg)]">
                      <div className="relative">
                        <Thumb html={localizedHtml(template)} />
                        <button type="button" onClick={() => toggleFavorite(template.id)} aria-label={t(favorite ? 'Remove from favorites' : 'Add to favorites')} aria-pressed={favorite} className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] shadow-[var(--studio-shadow-sm)] transition hover:scale-105 ${favorite ? 'text-amber-500' : 'text-[var(--studio-text-muted)]'}`}><StarIcon size={16} filled={favorite} /></button>
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          {(view !== 'category' || normalizedQuery) && <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--studio-accent-hover)]">{t(category.name)}</span>}
                          {template.layout && <span className="rounded-full border border-[var(--studio-border)] px-1.5 py-px text-[10px] font-semibold text-[var(--studio-text-muted)]">{t(LAYOUT_NAMES[template.layout])}</span>}
                        </div>
                        <div className="text-sm font-semibold text-[var(--studio-text)]">{t(template.name)}</div>
                        <p className="mt-0.5 flex-1 text-xs leading-relaxed text-[var(--studio-text-muted)]">{t(template.desc)}</p>
                        <div className="mt-3 flex gap-2">
                          <button type="button" onClick={() => setPreview({ category, template })} className="studio-btn studio-btn-secondary min-h-9 px-3 text-xs"><EyeIcon size={13} /> {t('Preview')}</button>
                          <button type="button" onClick={() => choose(template)} className="studio-btn studio-btn-primary min-h-9 flex-1 px-3 text-xs">{t('Use this template')}</button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
            {hasMoreEntries && (
              <div className="mt-5 flex justify-center border-t border-[var(--studio-border)] pt-4">
                <button
                  type="button"
                  onClick={() => setPagination({ key: resultSetKey, count: visibleCount + INITIAL_VISIBLE_TEMPLATES })}
                  className="studio-btn studio-btn-secondary min-h-10 px-4 text-sm"
                >
                  {t('Show more templates')}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {preview && (
        <div className="studio-overlay fixed inset-0 z-[70] flex flex-col p-2 sm:p-5" onClick={() => setPreview(null)}>
          <div className="mx-auto flex w-full max-w-7xl items-center gap-3 rounded-t-2xl border border-b-0 border-[var(--studio-border)] bg-[var(--studio-panel-raised)] px-4 py-3 shadow-[var(--studio-shadow-lg)]" onClick={(event) => event.stopPropagation()}>
            <div className="min-w-0 flex-1"><strong className="block truncate text-sm text-[var(--studio-text)]">{t(preview.template.name)}</strong><span className="text-xs text-[var(--studio-text-muted)]">{t(preview.category.name)} · {contentLanguage.toUpperCase()}</span></div>
            <button type="button" onClick={() => choose(preview.template)} className="studio-btn studio-btn-primary min-h-9 px-4 text-sm">{t('Use this template')}</button>
            <button type="button" aria-label={t('Close preview')} onClick={() => setPreview(null)} className="studio-icon-btn shrink-0 border border-[var(--studio-border)] bg-[var(--studio-control)]">×</button>
          </div>
          <iframe title={t('Full-screen template preview')} srcDoc={localizedHtml(preview.template)} sandbox="" className="mx-auto min-h-0 w-full max-w-7xl flex-1 rounded-b-2xl border-0 bg-white" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
