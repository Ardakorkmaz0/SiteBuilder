import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronDownIcon, NodeIcon } from '../icons.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'
import { closeWhenFocusLeaves } from '../../ui/closeWhenFocusLeaves.js'
import { useEscapeToClose } from '../../ui/useEscapeToClose.js'
import {
  DEVICE_CATEGORIES,
  FOLD_STATE_LABELS,
  FOLD_STATE_ORDER,
  foldableOrder,
} from '../../utils/deviceCatalog.js'

// The screen a page is designed and previewed on, picked from cards instead of
// a long list: desktops, tablets, phones and foldables, each drawn in its own
// proportions. A foldable is one card with a switch between its screens
// (outer / inner, or one, two and three panels on a tri-fold).
//
// `items`: { id, name, w, h, category, group?, state?, hinge? }. A `w` of 0
// is the responsive size, which follows the area. The same picker serves HTML
// pages (htmlDevices.js) and canvas pages (the canvas presets); what a pick
// does, including switching between PC and Mobile, is the caller's `onPick`.
const CATEGORY_ICON = Object.fromEntries(DEVICE_CATEGORIES.map(([id, , icon]) => [id, icon]))

const sizeText = (item) => (item.w ? (item.h ? `${item.w}×${item.h}` : `${item.w}`) : '')
const stateLabel = (item, translate) => translate(FOLD_STATE_LABELS[item.state] || item.state)

// The device's outline at its own aspect ratio, at most 22px either way. An
// open foldable shows its crease. A size with no height (the responsive one,
// a canvas's standard width) has no proportions: its type's icon stands in.
function Outline({ w, h, hinge, category }) {
  if (!w || !h) return <NodeIcon name={CATEGORY_ICON[category] || 'monitor'} size={20} />
  const ratio = w / h
  const width = ratio >= 1 ? 22 : Math.max(8, Math.round(22 * ratio))
  const height = ratio >= 1 ? Math.max(8, Math.round(22 / ratio)) : 22
  const creases = hinge === 'thirds' ? ['33.333%', '66.667%'] : hinge ? ['50%'] : []
  return (
    <span
      aria-hidden="true"
      data-outline={`${width}x${height}`}
      className="relative inline-block shrink-0 rounded-[3px] border-[1.5px] border-current"
      style={{ width, height }}
    >
      {creases.map((at) => (
        hinge === 'horizontal'
          ? <span key={at} className="absolute inset-x-0 h-px bg-current opacity-60" style={{ top: at }} />
          : <span key={at} className="absolute inset-y-0 w-px bg-current opacity-60" style={{ left: at }} />
      ))}
    </span>
  )
}

// Cards in the order the picker shows them: single devices as listed, each
// foldable once (at its place in the catalog) with its states in order.
function cardsOf(items) {
  const cards = []
  const groups = new Map()
  for (const item of items) {
    if (!item.group) {
      cards.push({ key: item.id, category: item.category, items: [item] })
    } else if (groups.has(item.group)) {
      groups.get(item.group).items.push(item)
    } else {
      const card = { key: item.group, category: item.category, group: item.group, items: [item] }
      groups.set(item.group, card)
      cards.push(card)
    }
  }
  for (const card of groups.values()) {
    card.items.sort((a, b) => FOLD_STATE_ORDER.indexOf(a.state) - FOLD_STATE_ORDER.indexOf(b.state))
  }
  // A total order (a single device ranks before every foldable): a comparator
  // that called a device and a foldable equal left the foldables shuffled.
  const rank = (card) => (card.group ? foldableOrder(card.group) : -1)
  return cards.sort((a, b) => rank(a) - rank(b))
}

// The list keeps this far from the end of the area it opens in.
const LIST_EDGE = 8

// Where the list can be seen: the window, less whatever its ancestors clip
// (the stage cuts off what overflows it, so a list hanging past its right end
// lost its cards there). The window is the page's own width where that is
// smaller: `innerWidth` counts a vertical scrollbar's room too.
function roomFor(el) {
  const doc = el.ownerDocument
  const view = doc.defaultView
  let left = 0
  let right = Math.min(...[view.innerWidth, doc.documentElement.clientWidth].filter((width) => width > 0))
  for (let node = el.parentElement; node; node = node.parentElement) {
    const style = view.getComputedStyle(node)
    if ([style.overflowX, style.overflow].some((value) => value && value !== 'visible')) {
      const box = node.getBoundingClientRect()
      left = Math.max(left, box.left)
      right = Math.min(right, box.right)
    }
  }
  return { left, right }
}

// In a stage bar (an @container) `collapse` keeps only the button's icon below
// 900px, where the bar is short of room; the name and size come back above.
export default function DevicePicker({ items, value, onPick, fallbackLabel = '', collapse = false, laptopFrame = false, onLaptopFrameToggle }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('all')
  const rootRef = useRef(null)
  const activeRef = useRef(null)
  const current = items.find((item) => item.id === value) || null
  const close = () => setOpen(false)
  useEscapeToClose(open, close)

  // It opens left-aligned with its button, moved left as far as it must to end
  // inside the area it can be seen in, and no wider than that area: when it
  // opens, and again whenever the window is resized while it is open.
  const dialogRef = useRef(null)
  useLayoutEffect(() => {
    const root = rootRef.current
    const dialog = dialogRef.current
    if (!open || !root || !dialog) return undefined
    const place = () => {
      const room = roomFor(root)
      const rootLeft = root.getBoundingClientRect().left
      dialog.style.width = ''
      // The width it lays out at. Its box on screen is smaller while the menu's
      // opening animation (scale .97) runs: measured then, the list was placed
      // for 427px, grew to 440 and ran 13px past the window's edge.
      const natural = dialog.offsetWidth || dialog.getBoundingClientRect().width
      const width = Math.min(natural, Math.max(0, room.right - room.left - LIST_EDGE * 2))
      const left = Math.max(
        Math.min(0, room.right - LIST_EDGE - (rootLeft + width)),
        room.left + LIST_EDGE - rootLeft,
      )
      dialog.style.width = width < natural ? `${Math.round(width)}px` : ''
      dialog.style.left = left ? `${Math.round(left)}px` : ''
    }
    place()
    const view = root.ownerDocument.defaultView
    view.addEventListener('resize', place)
    return () => view.removeEventListener('resize', place)
  }, [open])

  // It opens on the screen in use: that card (or that state's switch) has the
  // keyboard and is scrolled into view. Picking a type keeps the keyboard on
  // the type buttons.
  useEffect(() => {
    if (!open || !activeRef.current) return
    activeRef.current.focus({ preventScroll: true })
    activeRef.current.scrollIntoView?.({ block: 'nearest' })
  }, [open])

  const sections = useMemo(() => {
    const cards = cardsOf(items)
    return DEVICE_CATEGORIES
      .filter(([id]) => category === 'all' || category === id)
      .map(([id, label]) => ({ id, label, cards: cards.filter((card) => card.category === id) }))
      .filter((section) => section.cards.length)
  }, [items, category])

  const pick = (id) => {
    setOpen(false)
    if (id !== value) onPick?.(id)
  }
  // Every opening shows all types, so the screen in use is always among them.
  const toggle = () => {
    if (!open) setCategory('all')
    setOpen(!open)
  }
  // The button shows the device and its size. A foldable's screen is told by
  // its size there; its name for a screen reader and its tooltip add it in
  // words, after the words shown, so a spoken "click" can still find it.
  const shownName = current ? t(current.name) : fallbackLabel
  const currentSize = current ? sizeText(current) : ''
  const described = [shownName, currentSize].filter(Boolean).join(' ') +
    (current?.group ? ` · ${stateLabel(current, t)}` : '')
  const roomOnly = collapse ? 'hidden @[900px]:inline' : ''

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onBlur={() => { if (open) closeWhenFocusLeaves(rootRef.current, close) }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t('Screen size')}: ${described}`}
        title={described}
        className="studio-btn studio-btn-secondary max-w-[220px] px-2 py-1.5 text-xs"
      >
        <NodeIcon name={CATEGORY_ICON[current?.category] || 'monitor'} size={14} className="shrink-0" />
        <span className={`min-w-0 truncate font-medium ${roomOnly}`}>{shownName}</span>
        {currentSize && <span className={`shrink-0 tabular-nums text-[var(--studio-text-faint)] ${roomOnly}`}>{currentSize}</span>}
        <ChevronDownIcon size={12} className="shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={close} />
          <div
            ref={dialogRef}
            role="dialog"
            aria-label={t('Screen size')}
            className="studio-menu absolute left-0 top-[calc(100%+6px)] z-40 w-[min(calc(100vw-2rem),440px)] p-2"
          >
            <div role="group" aria-label={t('Device type')} className="studio-segment mb-2 flex w-full">
              {[['all', 'All'], ...DEVICE_CATEGORIES].map(([id, label, icon]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={category === id}
                  onClick={() => setCategory(id)}
                  className={`studio-segment-btn flex min-w-0 flex-1 items-center justify-center gap-1 px-1 ${category === id ? 'studio-segment-btn-active' : ''}`}
                >
                  {icon && <NodeIcon name={icon} size={13} className="shrink-0" />}
                  <span className="truncate text-[11px]">{t(label)}</span>
                </button>
              ))}
            </div>
            {current?.laptop && onLaptopFrameToggle && (
              <label className="mb-2 flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-xs text-[var(--studio-text)] hover:bg-[var(--studio-control-hover)]">
                {t('Laptop case')}
                <input
                  type="checkbox"
                  role="switch"
                  checked={laptopFrame}
                  onChange={onLaptopFrameToggle}
                  className="size-4 shrink-0 accent-[var(--studio-accent)]"
                />
              </label>
            )}
            <div className="max-h-[min(60vh,480px)] space-y-3 overflow-y-auto overscroll-contain pr-0.5">
              {sections.map((section) => (
                <section key={section.id} aria-label={t(section.label)}>
                  <h3 className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--studio-text-faint)]">
                    {t(section.label)}
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {section.cards.map((card) => {
                      const active = card.items.some((item) => item.id === value)
                      const frame = `flex min-w-0 items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                        active
                          ? 'border-[var(--studio-accent)] bg-[var(--studio-accent-soft)]'
                          : 'border-[var(--studio-border)] bg-[var(--studio-panel)] hover:border-[var(--studio-border-strong)]'
                      }`
                      if (!card.group) {
                        const item = card.items[0]
                        return (
                          <button
                            key={card.key}
                            ref={active ? activeRef : undefined}
                            type="button"
                            data-device={item.id}
                            aria-pressed={active}
                            onClick={() => pick(item.id)}
                            className={frame}
                          >
                            <span className="grid h-7 w-7 shrink-0 place-items-center text-[var(--studio-text-muted)]">
                              <Outline w={item.w} h={item.h} category={item.category} />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-semibold text-[var(--studio-text)]">{t(item.name)}</span>
                              {' '}
                              <span className="block text-[10px] tabular-nums text-[var(--studio-text-faint)]">
                                {sizeText(item) || t('Follows the area')}
                              </span>
                            </span>
                          </button>
                        )
                      }
                      // A foldable: one card, and a switch between its screens.
                      const shown = card.items.find((item) => item.id === value) || card.items[0]
                      return (
                        <div key={card.key} data-device-group={card.group} className={`col-span-2 ${frame}`}>
                          <span className="grid h-7 w-7 shrink-0 place-items-center text-[var(--studio-text-muted)]">
                            <Outline w={shown.w} h={shown.h} hinge={shown.hinge} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-[var(--studio-text)]">{t(shown.name)}</span>
                            <span className="block text-[10px] tabular-nums text-[var(--studio-text-faint)]">{sizeText(shown)}</span>
                          </span>
                          <span role="group" aria-label={t(shown.name)} className="studio-segment shrink-0">
                            {card.items.map((item) => (
                              <button
                                key={item.id}
                                ref={item.id === value ? activeRef : undefined}
                                type="button"
                                data-device={item.id}
                                aria-pressed={item.id === value}
                                title={`${stateLabel(item, t)} · ${sizeText(item)}`}
                                onClick={() => pick(item.id)}
                                className={`studio-segment-btn px-2 ${item.id === value ? 'studio-segment-btn-active' : ''}`}
                              >
                                <span className="text-[11px]">{stateLabel(item, t)}</span>
                              </button>
                            ))}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
