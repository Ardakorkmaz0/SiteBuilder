import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { HTML_BLOCKS } from '../../utils/htmlVariants.js'
import { WIDGETS, WIDGET_CATEGORIES, WIDGET_TYPE } from '../../utils/componentVariants/index.js'
import { SECTION_CATEGORIES } from '../../utils/sectionBlocks/index.js'
import { LayersIcon, SearchIcon } from '../icons.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'
import { useEscapeToClose } from '../../ui/useEscapeToClose.js'
import {
  ADDABLE_PALETTE_ITEMS,
  NATIVE_CANVAS_TYPES,
  WIDE_HTML,
  blockSize,
  htmlSize,
  localizedHtml,
  previewSrcDoc,
  variantsForType,
} from './paletteData.js'

// Webflow-style block library: a full overlay with a category rail, search and
// large live previews. It is a DISCOVERY surface — picking a block closes the
// overlay and hands off to the existing placement flows (tap-to-place on the
// free canvas via onArm, direct insert in HTML mode via onPick). The compact
// sidebar palette keeps drag-and-drop for users who know what they want.

// Larger sibling of the sidebar's HtmlPreview — same trusted template HTML,
// scaled to a roomier card.
// A snippet with a known frame (the widgets) is scaled to fit the card whole.
function fitStyle([w, h]) {
  const scale = Math.max(0.3, Math.min(0.9, 156 / w, 92 / h))
  return { width: w, transform: `scale(${scale.toFixed(3)})`, transformOrigin: 'center', flexShrink: 0, pointerEvents: 'none' }
}

function BigPreview({ html, wide, fit }) {
  return (
    <div className="flex h-[104px] w-full items-center justify-center overflow-hidden rounded-lg bg-[#f8fafc]">
      <div
        style={
          fit
            ? fitStyle(fit)
            : wide
              ? { width: 560, transform: 'scale(0.34)', transformOrigin: 'center', flexShrink: 0, pointerEvents: 'none' }
              : { transform: 'scale(0.9)', transformOrigin: 'center', pointerEvents: 'none' }
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

// Section previews render in a sandboxed iframe (their markup is bigger and
// uses full-page layout, which would leak styles into the modal as raw HTML).
function SectionPreview({ html }) {
  const { t } = useLanguage()
  return (
    <iframe
      title={t('Palette preview')}
      sandbox=""
      loading="lazy"
      srcDoc={previewSrcDoc(html, true)}
      className="pointer-events-none h-[104px] w-full rounded-lg bg-white"
    />
  )
}

function LibraryCard({ entry, onUse }) {
  const { language, t } = useLanguage()
  const label = t(entry.label)
  const html = localizedHtml(entry, language)
  return (
    <button
      type="button"
      onClick={() => onUse(entry)}
      title={`${label} — ${t(entry.desc || entry.label)}`}
      className="group flex flex-col rounded-xl border border-[var(--studio-border,#e5e7eb)] bg-[var(--studio-panel-raised,#ffffff)] p-2 text-left transition hover:border-[var(--studio-accent,#4f46e5)] hover:shadow-md"
    >
      {entry.kind === 'section'
        ? <SectionPreview html={html} />
        : <BigPreview html={html} wide={entry.wide} fit={entry.fit} />}
      <span className="mt-2 truncate text-xs font-semibold text-[var(--studio-text,#374151)]">{label}</span>
      <span className="truncate text-[11px] text-[var(--studio-text-faint,#9ca3af)]">
        {t(entry.categoryLabel)}
      </span>
    </button>
  )
}

const SECTION_CATEGORY_NAMES = new Map(SECTION_CATEGORIES.map((category) => [category.id, category.name.en]))
const WIDGET_CATEGORY_NAMES = new Map(WIDGET_CATEGORIES.map((category) => [category.id, category.name.en]))

// Flatten the whole palette into searchable entries once per open. Sections
// are filed by their library category (`section:hero`, `section:footer`…),
// widgets by their group (`widget:rating`…), components by palette type.
function buildEntries() {
  const entries = []
  for (const block of HTML_BLOCKS) {
    const [w, h] = blockSize(block.id)
    entries.push({
      kind: 'section',
      key: `section-${block.id}`,
      categoryId: `section:${block.category}`,
      categoryLabel: SECTION_CATEGORY_NAMES.get(block.category) || 'Sections',
      label: block.label,
      desc: block.desc || '',
      html: block.html,
      htmlTr: block.htmlTr,
      wide: true,
      use: { type: 'section', preset: block.id, w, h, label: block.label },
    })
  }
  for (const widget of WIDGETS) {
    const [w, h] = htmlSize(WIDGET_TYPE, widget)
    entries.push({
      kind: 'variant',
      key: `widget-${widget.id}`,
      categoryId: `widget:${widget.group}`,
      categoryLabel: WIDGET_CATEGORY_NAMES.get(widget.group),
      label: widget.label,
      desc: widget.label,
      html: widget.html,
      htmlTr: widget.htmlTr,
      fit: [w, h],
      use: { type: WIDGET_TYPE, preset: widget.id, w, h, label: widget.label },
    })
  }
  for (const item of ADDABLE_PALETTE_ITEMS) {
    for (const variant of variantsForType(item.type)) {
      const [w, h] = htmlSize(item.type, variant)
      const native = NATIVE_CANVAS_TYPES.has(item.type)
      entries.push({
        kind: 'variant',
        key: `${item.type}-${variant.id}`,
        categoryId: item.type,
        categoryLabel: item.label,
        label: variant.label === 'Default' ? item.label : variant.label,
        desc: item.label,
        html: variant.html,
        htmlTr: variant.htmlTr,
        wide: WIDE_HTML.has(item.type),
        native,
        use: { type: item.type, preset: variant.id === 'default' ? null : variant.id, w, h, label: variant.label },
      })
    }
  }
  return entries
}

// Hundreds of live previews would be slow to mount at once; the grid shows a
// page at a time and grows on request.
const PAGE_SIZE = 36

function matchesCategory(entry, category) {
  if (category === 'all') return true
  if (category === 'sections') return entry.kind === 'section'
  if (category === 'widgets') return entry.categoryId.startsWith('widget:')
  return entry.categoryId === category
}

export default function BlockLibrary({ open, onClose, onPickComponent, onArmPlacement }) {
  const { language, t } = useLanguage()
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const entries = useMemo(() => buildEntries(), [])
  // The rail: everything, then sections by what they do, then components.
  const groups = useMemo(() => {
    const count = (id) => entries.filter((entry) => matchesCategory(entry, id)).length
    return [
      { id: 'top', label: null, items: [{ id: 'all', label: 'All blocks', count: entries.length }] },
      {
        id: 'sections',
        label: 'Sections',
        items: [
          { id: 'sections', label: 'All sections', count: count('sections') },
          ...SECTION_CATEGORIES
            .map((item) => ({ id: `section:${item.id}`, label: item.name.en, count: count(`section:${item.id}`), nested: true }))
            .filter((item) => item.count > 0),
        ],
      },
      {
        id: 'widgets',
        label: 'Widgets',
        items: [
          { id: 'widgets', label: 'All widgets', count: count('widgets') },
          ...WIDGET_CATEGORIES.map((item) => ({ id: `widget:${item.id}`, label: item.name.en, count: count(`widget:${item.id}`), nested: true })),
        ],
      },
      {
        id: 'components',
        label: 'Components',
        items: ADDABLE_PALETTE_ITEMS.map((item) => ({ id: item.type, label: item.label, count: count(item.type) })),
      },
    ]
  }, [entries])
  useEscapeToClose(open, onClose)

  if (!open) return null

  const q = query.trim().toLocaleLowerCase('tr')
  const visible = entries.filter((entry) => {
    if (!q) return matchesCategory(entry, category)
    // Search spans EVERYTHING (ignores the active category) and matches the
    // English label, description and category and their Turkish translations.
    const haystack = [entry.label, t(entry.label), entry.desc, t(entry.desc), entry.categoryLabel, t(entry.categoryLabel)]
      .join(' ')
      .toLocaleLowerCase('tr')
    return haystack.includes(q)
  })
  const shown = visible.slice(0, limit)

  const chooseCategory = (id) => {
    setCategory(id)
    setQuery('')
    setLimit(PAGE_SIZE)
  }

  const use = (entry) => {
    const html = localizedHtml(entry, language)
    if (onPickComponent) {
      onPickComponent(entry.use.type, html)
    } else {
      onArmPlacement?.(entry.native ? entry.use : { ...entry.use, html })
    }
    onClose()
  }

  return createPortal(
    <div
      className="studio-theme-surface studio-overlay fixed inset-0 z-[2147483000] flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      data-block-library=""
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-library-title"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[min(760px,94vh)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[var(--studio-panel,#ffffff)] shadow-2xl"
      >
        {/* Header: title + search + close */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--studio-border,#e5e7eb)] px-4 py-3 sm:px-5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--studio-accent)] text-white">
            <LayersIcon size={15} />
          </span>
          <h2 id="block-library-title" className="text-sm font-bold text-[var(--studio-text,#111827)]">{t('Block library')}</h2>
          <label className="relative ml-auto min-w-0 flex-1 sm:max-w-xs">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--studio-text-faint,#9ca3af)]">
              <SearchIcon size={14} />
            </span>
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setLimit(PAGE_SIZE)
              }}
              placeholder={t('Search blocks')}
              className="w-full rounded-lg border border-[var(--studio-border,#d1d5db)] bg-[var(--studio-control,#f9fafb)] py-1.5 pl-8 pr-3 text-sm text-[var(--studio-text,#111827)] outline-none focus:border-[var(--studio-accent,#4f46e5)]"
            />
          </label>
          <button
            type="button"
            onClick={onClose}
            title={t('Close')}
            className="rounded-lg px-2 py-1 text-sm text-[var(--studio-text-faint,#9ca3af)] hover:bg-[var(--studio-control-hover,#f3f4f6)] hover:text-[var(--studio-text,#374151)]"
          >
            ✕
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Category rail (desktop) */}
          <nav className="hidden w-52 shrink-0 overflow-y-auto border-r border-[var(--studio-border,#e5e7eb)] p-2 sm:block">
            {groups.map((group) => (
              <div key={group.id} className={group.label ? 'mt-3' : ''}>
                {group.label && (
                  <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--studio-text-faint,#9ca3af)]">
                    {t(group.label)}
                  </div>
                )}
                {group.items.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => chooseCategory(cat.id)}
                    aria-current={category === cat.id && !q ? 'true' : undefined}
                    className={`flex w-full items-center gap-2 rounded-lg py-1.5 pr-2.5 text-left text-xs font-medium transition ${
                      cat.nested ? 'pl-5' : 'pl-2.5'
                    } ${
                      category === cat.id && !q
                        ? 'bg-[var(--studio-control,#eef2ff)] font-semibold text-[var(--studio-accent,#4f46e5)]'
                        : 'text-[var(--studio-text-muted,#6b7280)] hover:bg-[var(--studio-control-hover,#f3f4f6)] hover:text-[var(--studio-text,#374151)]'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{t(cat.label)}</span>
                    <span className="text-[10px] text-[var(--studio-text-faint,#9ca3af)]">{cat.count}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Category picker (mobile): a native select, since the rail has
                dozens of entries in groups. */}
            <div className="shrink-0 border-b border-[var(--studio-border,#f1f1f4)] p-2 sm:hidden">
              <select
                value={category}
                onChange={(e) => chooseCategory(e.target.value)}
                aria-label={t('Block category')}
                className="w-full rounded-lg border border-[var(--studio-border,#d1d5db)] bg-[var(--studio-control,#f9fafb)] px-2.5 py-1.5 text-sm text-[var(--studio-text,#111827)] outline-none focus:border-[var(--studio-accent,#4f46e5)]"
              >
                {groups.map((group) => {
                  const options = group.items.map((cat) => (
                    <option key={cat.id} value={cat.id}>{`${t(cat.label)} (${cat.count})`}</option>
                  ))
                  return group.label
                    ? <optgroup key={group.id} label={t(group.label)}>{options}</optgroup>
                    : options
                })}
              </select>
            </div>

            {/* Cards */}
            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              {visible.length === 0 ? (
                <p className="mt-10 text-center text-sm text-[var(--studio-text-muted,#6b7280)]">
                  {t('No blocks match your search')}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                    {shown.map((entry) => (
                      <LibraryCard key={entry.key} entry={entry} onUse={use} />
                    ))}
                  </div>
                  {visible.length > shown.length && (
                    <div className="mt-4 flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setLimit((current) => current + PAGE_SIZE)}
                        className="rounded-lg border border-[var(--studio-border,#e5e7eb)] bg-[var(--studio-panel-raised,#ffffff)] px-4 py-1.5 text-xs font-semibold text-[var(--studio-text,#374151)] transition hover:border-[var(--studio-accent,#4f46e5)]"
                      >
                        {t('Show more')}
                      </button>
                      <span className="text-[11px] text-[var(--studio-text-faint,#9ca3af)]">
                        {t('Showing {shown} of {total}', { shown: shown.length, total: visible.length })}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--studio-border,#e5e7eb)] px-4 py-2 text-[11px] text-[var(--studio-text-muted,#6b7280)] sm:px-5">
          {onPickComponent
            ? t('Click a block to insert it into the page.')
            : t('Click a block, then click on the canvas to place it.')}
          {' '}
          {t('Bootstrap variants use Bootstrap class markup and include dependency-free fallback styles.')}
        </div>
      </div>
    </div>,
    document.body,
  )
}
