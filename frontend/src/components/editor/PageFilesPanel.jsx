import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEditorStore } from '../../store/editorStore.js'
import { pageFileName } from '../../utils/pageFiles.js'
import { countLinksToPage } from '../../utils/pageLinks.js'
import { FileIcon, FileCodeIcon, FolderIcon, LinkIcon, LayersIcon } from '../icons.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'
import { useEscapeToClose } from '../../ui/useEscapeToClose.js'
import { useInitialDialogFocus } from '../../ui/useInitialDialogFocus.js'

// VS Code-style file explorer, shared by BOTH editor modes: every page is a
// "file", optionally grouped under collapsible folders (page.folder).
//  - click a file        → open that page
//  - click the ACTIVE file → toggle its source/code view (like re-clicking a
//    tab in VS Code) via onActiveClick
//  - hover actions        → rename, per-file HTML import (HTML mode), delete
//  - right click          → those, plus going live and staying off the public site
//  - the file's colour    → green live, blue an older version live, red not live
// `mode`: 'html' shows has-document dots + import; 'pages' is the component
// editor variant (every page always "has" content).

// The page a chooser just created, until a page list shows and focuses it.
let newPageToFocus = null
const rememberNewPage = (pageId) => { newPageToFocus = pageId }
const forgetNewPage = (pageId) => { if (newPageToFocus === pageId) newPageToFocus = null }

export default function PageFilesPanel({
  htmlMap = {},
  mode = 'html',
  linkArmed = false,
  onLinkToPage,
  onSelect,
  onActiveClick,
  onImportInto,
  onBeforePageChange,
  // { [page id]: 'live' | 'older' | 'none' }. Without it files have no colour.
  liveStates,
  privatePages = [],
  onSendLive,
  onSetHidden,
}) {
  const { t } = useLanguage()
  const pages = useEditorStore((s) => s.schema.pages)
  const currentPageId = useEditorStore((s) => s.currentPageId)
  const selectPage = useEditorStore((s) => s.selectPage)
  const addPage = useEditorStore((s) => s.addPage)
  const renamePage = useEditorStore((s) => s.renamePage)
  const deletePage = useEditorStore((s) => s.deletePage)

  const openPage = onSelect || selectPage
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')
  const [collapsed, setCollapsed] = useState(() => new Set())
  // New-page mode chooser: null when closed, otherwise { folder } for the page
  // about to be created. The user picks Empty canvas vs HTML page.
  const [addPrompt, setAddPrompt] = useState(null)
  const importRef = useRef(null)
  const importTarget = useRef(null)
  // The open file menu: { pageId, x, y }.
  const [menu, setMenu] = useState(null)

  const createPage = (mode) => {
    if (!addPrompt) return
    onBeforePageChange?.()
    addPage(t('New Page'), addPrompt.folder, mode)
    setAddPrompt(null)
    // The new page takes the keyboard (it went back to "+ File", which said
    // nothing about the page that now exists). Kept outside this panel: a
    // page in the other editor mode is listed by a freshly mounted one.
    rememberNewPage(useEditorStore.getState().currentPageId)
    setRefocusTick((tick) => tick + 1)
  }

  // Enter or Esc in the name field: the field goes away with the keyboard in
  // it, and focus fell to the top of the page. The page's own button takes it.
  const rootRef = useRef(null)
  const refocusPageRef = useRef(null)
  const [refocusTick, setRefocusTick] = useState(0)
  useEffect(() => {
    if (editingId) return
    const pageId = refocusPageRef.current || newPageToFocus
    if (!pageId) return
    const buttons = rootRef.current?.querySelectorAll('[data-page-button]') || []
    const button = [...buttons].find((item) => item.dataset.pageButton === pageId)
    if (!button) return
    refocusPageRef.current = null
    forgetNewPage(pageId)
    button.focus()
  }, [editingId, refocusTick, pages])

  const commitRename = () => {
    if (editingId && draft.trim()) {
      onBeforePageChange?.()
      renamePage(editingId, draft.trim())
    }
    setEditingId(null)
  }

  const toggleFolder = (name) =>
    setCollapsed((s) => {
      const next = new Set(s)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  // Group pages by folder, keeping first-appearance order. '' = root files.
  const groups = []
  const byFolder = new Map()
  for (const page of pages) {
    const folder = page.folder || ''
    if (!byFolder.has(folder)) {
      byFolder.set(folder, [])
      groups.push(folder)
    }
    byFolder.get(folder).push(page)
  }

  const folderCount = groups.filter(Boolean).length

  const startRename = (page) => {
    setEditingId(page.id)
    setDraft(page.name || '')
  }
  const startImport = (page) => {
    importTarget.current = page.id
    importRef.current?.click()
  }
  const confirmDelete = (page, fname) => {
    // Links to it from the other pages stop working: say how many.
    const links = countLinksToPage(pages, page.id, htmlMap)
    const question = links
      ? t('Delete "{name}" ({file})? {count} link(s) on other pages lead to it and will stop working until you point them elsewhere.', { name: page.name, file: fname, count: links })
      : t('Delete "{name}" ({file})?', { name: page.name, file: fname })
    if (window.confirm(question)) {
      onBeforePageChange?.()
      deletePage(page.id)
    }
  }

  const menuPage = menu ? pages.find((item) => item.id === menu.pageId) : null
  const closeMenu = () => {
    const pageId = menu?.pageId
    setMenu(null)
    if (pageId) rootRef.current?.querySelector(`[data-page-button="${CSS.escape(pageId)}"]`)?.focus()
  }
  const menuItems = (page) => {
    const isHome = page.id === pages[0]?.id
    const hiddenFromPublic = privatePages.includes(page.id)
    return [
      ...(onSendLive ? [{
        label: t('Go live'),
        // Nothing to send when what is live is this file as it stands.
        disabled: liveStates?.[page.id] === 'live',
        action: 'live',
      }] : []),
      ...(onSetHidden ? [{
        label: t('Do not show in public'),
        checked: hiddenFromPublic,
        // The home page answers at the site's own address.
        disabled: isHome,
        hint: isHome ? t('The home page cannot be hidden.') : undefined,
        action: 'hide',
      }] : []),
      ...((onSendLive || onSetHidden) ? [{ divider: true }] : []),
      { label: t('Rename page'), action: 'rename' },
      ...(mode === 'html' ? [{ label: t('Import an HTML file into this page'), action: 'import' }] : []),
      ...(pages.length > 1 ? [{ label: t('Delete page'), danger: true, action: 'delete' }] : []),
    ]
  }
  const pickMenuItem = (action, page) => {
    if (action === 'live') onSendLive(page.id)
    if (action === 'hide') onSetHidden(page.id, !privatePages.includes(page.id))
    if (action === 'rename') startRename(page)
    if (action === 'import') startImport(page)
    if (action === 'delete') confirmDelete(page, pageFileName(page, page.id === pages[0]?.id))
  }

  const renderFile = (page, indented) => {
    const isHome = page.id === pages[0]?.id
    const fname = pageFileName(page, isHome)
    const hasHtml = mode === 'pages' || !!(htmlMap[page.id] || '').trim()
    const active = page.id === currentPageId
    const liveState = liveStates?.[page.id]
    const hiddenFromPublic = privatePages.includes(page.id)
    return (
      <div
        key={page.id}
        data-live-state={liveState}
        onContextMenu={(event) => {
          event.preventDefault()
          // From the keyboard (the menu key) there is no pointer to open at.
          const box = event.currentTarget.getBoundingClientRect()
          setMenu({ pageId: page.id, x: event.clientX || box.left + 24, y: event.clientY || box.bottom })
        }}
        className={`group relative flex items-center gap-1.5 rounded-md py-1 pr-1 text-sm transition ${
          indented ? 'pl-5' : 'pl-2'
        } ${active ? 'bg-[#eef2ff]' : 'hover:bg-[#f3f4f6]'}`}
      >
        {active && <span className="absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-[#4f46e5]" />}
        <span className={`shrink-0 ${LIVE_STATE_COLOR[liveState] || 'text-[var(--studio-text-muted)]'}`}>
          {hasHtml ? <FileCodeIcon size={14} /> : <FileIcon size={14} />}
        </span>
        {editingId === page.id ? (
          <input
            autoFocus
            aria-label={t('Page name')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // The same Enter's keypress would reach the page button that
                // takes focus next and click it (opening the code panel).
                e.preventDefault()
                refocusPageRef.current = editingId
                commitRename()
              }
              if (e.key === 'Escape') {
                refocusPageRef.current = editingId
                setEditingId(null)
              }
            }}
            className="w-full min-w-0 rounded border border-[#4f46e5] px-1 py-0.5 text-[12.5px] focus:outline-none"
          />
        ) : (
          <button
            type="button"
            data-page-button={page.id}
            onClick={() => {
              // Link tool waiting for a target → bind the picked link to this
              // page instead of navigating. bindSourceToPage returns true only
              // when a source link was armed, so this never blocks normal
              // navigation when the link tool isn't mid-bind.
              if (onLinkToPage && onLinkToPage(page.id)) return
              if (active) onActiveClick?.(page.id)
              else openPage(page.id)
            }}
            title={
              linkArmed
                ? t('Link the selected element to {name}', { name: page.name })
                : active
                  ? t('{name} — click again to {action}', { name: page.name, action: t(mode === 'html' ? 'open/close the source code' : 'open/close the code panel') })
                  : t('Open {name}', { name: page.name })
            }
            className={`min-w-0 flex-1 truncate text-left font-mono text-[12.5px] ${
              linkArmed
                ? 'rounded bg-[#eef2ff] px-1 text-[#4f46e5] ring-1 ring-[#c7d2fe]'
                : `${active ? 'font-semibold' : ''} ${LIVE_STATE_COLOR[liveState] || (active ? 'text-[#4f46e5]' : 'text-[#374151]')}`
            }`}
          >
            {fname}
          </button>
        )}
        {liveState && <span className="sr-only">{t(LIVE_STATE_LABEL[liveState])}</span>}
        {hiddenFromPublic && (
          <span title={t('Hidden from the public')} className="shrink-0 rounded bg-[var(--studio-control)] px-1 text-[9px] font-bold uppercase text-[var(--studio-text-muted)]">
            {t('hidden')}
          </span>
        )}
        {mode === 'html' && !(htmlMap[page.id] || '').trim() && (
          <span className="shrink-0 rounded bg-[#f3f4f6] px-1 text-[9px] font-bold uppercase text-[var(--studio-text-faint)]">
            {t('empty')}
          </span>
        )}
        {/* Shown on hover, and while the keyboard is on this row: hidden
            outright, they could not be reached without a mouse. */}
        <span className="hidden shrink-0 gap-0.5 group-hover:flex group-focus-within:flex">
          <button
            type="button"
            title={t('Rename page')}
            aria-label={`${t('Rename page')}: ${page.name}`}
            onClick={() => startRename(page)}
            className="rounded px-1 text-xs text-[var(--studio-text-faint)] hover:bg-white hover:text-[#374151]"
          >
            ✎
          </button>
          {mode === 'html' && (
            <button
              type="button"
              title={t('Import an HTML file into this page')}
              aria-label={`${t('Import an HTML file into this page')}: ${page.name}`}
              onClick={() => startImport(page)}
              className="rounded px-1 text-xs text-[var(--studio-text-faint)] hover:bg-white hover:text-[#374151]"
            >
              ⬆
            </button>
          )}
          {pages.length > 1 && (
            <button
              type="button"
              title={t('Delete page')}
              aria-label={`${t('Delete page')}: ${page.name}`}
              onClick={() => confirmDelete(page, fname)}
              className="rounded px-1 text-xs text-[var(--studio-text-faint)] hover:bg-white hover:text-red-600"
            >
              ✕
            </button>
          )}
        </span>
      </div>
    )
  }

  return (
    <div ref={rootRef}>
      {linkArmed && (
        <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-2 py-1.5 text-[11px] font-medium text-[#1e40af]">
          <LinkIcon size={13} /> {t('Click a page to link the selected element to it.')}
        </div>
      )}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--studio-text-muted)]">
          {t('Explorer')}
        </h2>
        <span className="flex gap-0.5">
          <button
            type="button"
            onClick={() => setAddPrompt({ folder: '' })}
            title={t('New page (file)')}
            className="rounded-md px-1.5 py-0.5 text-xs font-semibold text-[#4f46e5] hover:bg-[#eef2ff]"
          >
            {t('+ File')}
          </button>
          <button
            type="button"
            onClick={() => setAddPrompt({ folder: t('Folder {count}', { count: folderCount + 1 }) })}
            title={t('New page inside a new folder')}
            className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold text-[#4f46e5] hover:bg-[#eef2ff]"
          >
            + <FolderIcon size={13} />
          </button>
        </span>
      </div>

      <input
        ref={importRef}
        type="file"
        accept=".html,.htm"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file || !importTarget.current) return
          onImportInto?.(importTarget.current, await file.text())
        }}
      />

      <div className="space-y-0.5">
        {groups.map((folder) => {
          const items = byFolder.get(folder) || []
          if (!folder) return items.map((p) => renderFile(p, false))
          const isCollapsed = collapsed.has(folder)
          return (
            <div key={folder}>
              <button
                type="button"
                onClick={() => toggleFolder(folder)}
                aria-expanded={!isCollapsed}
                className="flex w-full items-center gap-1.5 rounded-md py-1 pl-1 pr-2 text-left text-[12.5px] font-semibold text-[#374151] hover:bg-[#f3f4f6]"
              >
                <span className="w-3 text-[10px] text-[var(--studio-text-faint)]">{isCollapsed ? '▸' : '▾'}</span>
                <FolderIcon size={14} className="text-[var(--studio-text-muted)]" />
                <span className="min-w-0 truncate">{folder}</span>
                <span className="ml-auto text-[10px] font-normal text-[var(--studio-text-faint)]">{items.length}</span>
              </button>
              {!isCollapsed && items.map((p) => renderFile(p, true))}
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-[var(--studio-text-faint)]">
        {mode === 'html'
          ? t('Each page is its own HTML file — the first one publishes as the home page. Click the open file again to view its source code.')
          : t('Pages of your design. Click the open page again to toggle the code panel.')}
      </p>

      {liveStates && (
        <p className="mt-2 text-xs leading-relaxed text-[var(--studio-text-faint)]">
          {t('Green: live as it stands. Blue: an older version is live. Red: not live. Right-click a file for options.')}
        </p>
      )}

      {addPrompt && <NewPageModePrompt onPick={createPage} onCancel={() => setAddPrompt(null)} />}
      {menuPage && (
        <FileMenu
          x={menu.x}
          y={menu.y}
          label={t('Options for {name}', { name: pageFileName(menuPage, menuPage.id === pages[0]?.id) })}
          onClose={closeMenu}
          items={menuItems(menuPage)}
          onPick={(action) => pickMenuItem(action, menuPage)}
        />
      )}
    </div>
  )
}

const LIVE_STATE_COLOR = {
  live: 'text-[var(--studio-success)]',
  older: 'text-[var(--studio-info)]',
  none: 'text-[var(--studio-danger)]',
}
const LIVE_STATE_LABEL = { live: 'Live', older: 'Older version live', none: 'Not live' }

// A file's right-click menu, at the pointer, drawn over everything: the list
// sits in a scrolling rail that would cut it off. Arrow keys move, Esc or a
// click elsewhere closes it, and focus goes back to the file.
function FileMenu({ x, y, label, items, onPick, onClose }) {
  const ref = useRef(null)
  const [position, setPosition] = useState({ left: x, top: y })
  useEscapeToClose(true, onClose)

  useLayoutEffect(() => {
    const box = ref.current.getBoundingClientRect()
    setPosition({
      left: Math.max(8, Math.min(x, window.innerWidth - box.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - box.height - 8)),
    })
    ref.current.querySelector('button:not(:disabled)')?.focus()
  }, [x, y])

  useEffect(() => {
    const closeOutside = (event) => {
      if (!ref.current?.contains(event.target)) onClose()
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [onClose])

  const moveFocus = (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const buttons = [...ref.current.querySelectorAll('button:not(:disabled)')]
    const index = buttons.indexOf(document.activeElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    buttons[(index + step + buttons.length) % buttons.length]?.focus()
  }

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      onKeyDown={moveFocus}
      onContextMenu={(event) => event.preventDefault()}
      style={position}
      className="studio-theme-surface fixed z-[130] w-56 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] p-1.5 text-xs text-[var(--studio-text)] shadow-[var(--studio-shadow-lg)]"
    >
      {items.map((item) => (item.divider ? (
        <div key="divider" className="my-1 border-t border-[var(--studio-border)]" />
      ) : (
        <button
          key={item.label}
          type="button"
          role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
          aria-checked={item.checked}
          disabled={item.disabled}
          title={item.hint}
          onClick={() => {
            onClose()
            onPick(item.action)
          }}
          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--studio-control-hover)] disabled:cursor-not-allowed disabled:opacity-50 ${item.danger ? 'text-[var(--studio-danger)]' : ''}`}
        >
          <span aria-hidden className="w-3 shrink-0">{item.checked ? '✓' : ''}</span>
          <span className="min-w-0 flex-1">{item.label}</span>
        </button>
      )))}
    </div>,
    document.body,
  )
}

// Asked before a new page exists: an empty canvas or an HTML document. It is
// a modal dialog like the others: it takes the keyboard, keeps Tab inside,
// and Esc (or Cancel) puts focus back on the button that opened it.
function NewPageModePrompt({ onPick, onCancel }) {
  const { t } = useLanguage()
  const id = useId()
  const ref = useInitialDialogFocus(true)
  useEscapeToClose(true, onCancel)
  const keepTabInside = (event) => {
    if (event.key !== 'Tab') return
    const buttons = ref.current.querySelectorAll('button')
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
      event.preventDefault(); last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus()
    }
  }
  return (
    <div
      className="studio-theme-surface studio-overlay fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onKeyDown={keepTabInside}
        className="w-full max-w-sm rounded-xl border border-[var(--studio-border)] bg-[var(--studio-panel)] p-5 text-[var(--studio-text)] shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={`${id}-title`} className="text-base font-bold text-[#111827]">{t('How should this page start?')}</h3>
        <p id={`${id}-description`} className="mt-1 text-sm text-[var(--studio-text-muted)]">
          {t('Each page can use a different mode. You can switch a page later from its toolbar.')}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onPick('empty')}
            className="flex flex-col items-start gap-1 rounded-lg border border-[#e5e7eb] bg-white p-3 text-left hover:border-[#4f46e5] hover:bg-[#eef2ff]"
          >
            <LayersIcon size={20} className="text-[#4f46e5]" />
            <span className="text-sm font-semibold text-[#111827]">{t('Empty canvas')}</span>
            <span className="text-[11px] leading-snug text-[var(--studio-text-muted)]">
              {t('Drag-and-drop components on a blank canvas.')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onPick('html')}
            className="flex flex-col items-start gap-1 rounded-lg border border-[#e5e7eb] bg-white p-3 text-left hover:border-[#4f46e5] hover:bg-[#eef2ff]"
          >
            <FileCodeIcon size={20} className="text-[#4f46e5]" />
            <span className="text-sm font-semibold text-[#111827]">{t('HTML page')}</span>
            <span className="text-[11px] leading-snug text-[var(--studio-text-muted)]">
              {t('Upload, paste, or author a full HTML document.')}
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 w-full rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-sm text-[#374151] hover:bg-[#f3f4f6]"
        >
          {t('Cancel')}
        </button>
      </div>
    </div>
  )
}
