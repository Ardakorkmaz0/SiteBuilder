import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { PRESET_IMAGES } from '../../utils/presetImages.js'
import { deleteImage, listImages, uploadImage } from '../../api/images.js'
import {
  listHtmlContentFields,
  updateHtmlHrefAtPath,
  updateHtmlTextAtPath,
} from '../../utils/htmlQuickEdit.js'
import { looksLikePageLink } from '../../utils/pageLinks.js'
import { useLanguage } from '../../i18n/useLanguage.js'
import { apiError } from '../../utils/errors.js'
import { completeExternalUrl } from '../../utils/linkTargets.js'
import { MAX_FILE_BYTES } from '../../utils/sanitize.js'
import { ArrowDownIcon, ArrowUpIcon, NodeIcon, TrashIcon } from '../icons.jsx'

// Shared property controls inherit the active Studio theme.
const inputCls = 'studio-input min-w-0 w-full px-2.5 py-1.5 text-xs'
const labelCls = 'mb-1 block text-[11px] font-medium text-[var(--studio-text-muted)]'

export function LabeledText({ label, value, onChange, placeholder }) {
  return (
    <label className="block min-w-0">
      <span className={labelCls}>{label}</span>
      <input
        type="text"
        className={inputCls}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function LabeledTextarea({ label, value, onChange, placeholder, rows = 3, mono = false }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <textarea
        rows={rows}
        className={inputCls + ' resize-y' + (mono ? ' font-mono text-xs leading-snug' : '')}
        spellCheck={!mono}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

// Image source. Three ways to set it:
//   1. Drop a file on the panel (or click → file picker) → uploaded to the
//      backend, schema stores the public URL.
//   2. "Library" → pick from past uploads.
//   3. Built-in presets (still here for quick prototyping without an upload).
//   4. Paste a URL (advanced — collapsed by default).
// The value is always a plain string (URL or data: URL for legacy schemas).
export function LabeledImage({ label, value, onChange }) {
  const { t } = useLanguage()
  const fileRef = useRef(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [showUrl, setShowUrl] = useState(false)

  async function uploadOne(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErr(t('Please choose an image file.'))
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setErr(t('Image is too large (max 100 MB).'))
      return
    }
    setBusy(true)
    setErr('')
    try {
      const result = await uploadImage(file)
      onChange(result.url)
    } catch (e) {
      setErr(apiError(e, t('Upload failed.')))
    } finally {
      setBusy(false)
    }
  }

  function onFile(e) {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''
    uploadOne(f)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) uploadOne(f)
  }

  return (
    <div className="block">
      <span className={labelCls}>{label}</span>

      {/* Current value preview (or empty placeholder) */}
      {value ? (
        <div className="mb-1.5 flex items-start gap-2">
          <img
            src={value}
            alt=""
            style={{ aspectRatio: '4 / 3' }}
            className="h-14 w-20 rounded-lg border border-[var(--studio-border)] object-cover"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded-lg px-2 py-1 text-xs text-[var(--studio-text-muted)] hover:bg-[var(--studio-control-hover)] hover:text-[var(--studio-text)]"
          >
            {t('Clear')}
          </button>
        </div>
      ) : null}

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragOver(false)
        }}
        onDrop={onDrop}
        onClick={() => !busy && fileRef.current?.click()}
        // Reachable without a mouse: it was a click-only box.
        role="button"
        tabIndex={0}
        aria-label={label ? `${label}: ${t('Upload an image')}` : t('Upload an image')}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          if (!busy) fileRef.current?.click()
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-3 py-3 text-center text-xs transition ${
          dragOver
            ? 'border-[var(--studio-accent)] bg-[var(--studio-accent-soft)] text-[var(--studio-accent-text)]'
            : 'border-[var(--studio-border-strong)] bg-[var(--studio-control)] text-[var(--studio-text-muted)] hover:bg-[var(--studio-control-hover)]'
        }`}
      >
        {busy
          ? t('Uploading…')
          : dragOver
            ? t('Drop to upload')
            : t('Drop an image here or click to upload (max 100 MB)')}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setLibraryOpen((o) => !o)}
          className="studio-btn studio-btn-secondary px-2 py-1 text-xs"
        >
          {libraryOpen ? t('Hide library') : t('My library')}
        </button>
        <button
          type="button"
          onClick={() => setShowUrl((s) => !s)}
          className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--studio-text-muted)] hover:bg-[var(--studio-control-hover)] hover:text-[var(--studio-text)]"
        >
          {showUrl ? t('Hide URL') : t('Paste URL')}
        </button>
      </div>

      {showUrl ? (
        <input
          type="text"
          className={inputCls + ' mt-1.5'}
          value={value ?? ''}
          placeholder="https://…"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}

      {libraryOpen ? <ImageLibrary value={value} onPick={onChange} /> : null}

      {err ? <p className="mt-1 text-xs text-[var(--studio-danger)]">{err}</p> : null}

      {/* Built-in presets */}
      <div className="mt-2">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--studio-text-muted)]">
          {t('Quick presets')}
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {PRESET_IMAGES.map((p) => (
            <button
              key={p.name}
              type="button"
              title={t(p.name)}
              onClick={() => onChange(p.src)}
              style={{ aspectRatio: '4 / 3' }}
              className={`overflow-hidden rounded-lg border ${
                value === p.src
                  ? 'border-[var(--studio-accent)] ring-1 ring-[var(--studio-accent)]'
                  : 'border-[var(--studio-border)] hover:border-[var(--studio-border-strong)]'
              }`}
            >
              <img src={p.src} alt={p.name} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Lazy-fetched gallery of the current user's uploads. Mounted only when the
// user opens the library panel, so the editor doesn't fire an extra request
// for sessions that just use presets or a manual URL.
function ImageLibrary({ value, onPick }) {
  const { t } = useLanguage()
  const [images, setImages] = useState(null) // null = loading, [] = empty
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    listImages()
      .then((rows) => {
        if (!cancelled) setImages(Array.isArray(rows) ? rows : [])
      })
      .catch((e) => {
        if (cancelled) return
        setErr(e?.response?.data?.detail || t('Could not load library.'))
        setImages([])
      })
    return () => { cancelled = true }
  }, [t])

  async function remove(id) {
    if (!window.confirm(t('Delete this image from your library?'))) return
    try {
      await deleteImage(id)
      setImages((prev) => (prev || []).filter((r) => r.id !== id))
    } catch (e) {
      setErr(e?.response?.data?.detail || t('Delete failed.'))
    }
  }

  if (images === null) {
    return <p className="mt-1.5 text-xs text-[var(--studio-text-muted)]">{t('Loading library…')}</p>
  }
  if (images.length === 0) {
    return (
      <p className="mt-1.5 text-xs text-[var(--studio-text-muted)]">
        {err || t('No uploads yet — drop an image above to start your library.')}
      </p>
    )
  }
  return (
    <div className="mt-1.5">
      <div className="grid grid-cols-4 gap-1.5">
        {images.map((img) => (
          <div key={img.id} className="group relative">
            <button
              type="button"
              onClick={() => onPick(img.url)}
              style={{ aspectRatio: '4 / 3' }}
              className={`block w-full overflow-hidden rounded-lg border ${
                value === img.url
                  ? 'border-[var(--studio-accent)] ring-1 ring-[var(--studio-accent)]'
                  : 'border-[var(--studio-border)] hover:border-[var(--studio-border-strong)]'
              }`}
            >
              <img src={img.url} alt={img.alt || ''} className="h-full w-full object-cover" />
            </button>
            <button
              type="button"
              onClick={() => remove(img.id)}
              title={t('Delete from library')}
              aria-label={t('Delete from library')}
              className="absolute right-0.5 top-0.5 rounded-full bg-[var(--studio-panel-raised)] px-1 text-[10px] text-[var(--studio-danger)] opacity-0 shadow focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              <TrashIcon size={10} />
            </button>
          </div>
        ))}
      </div>
      {err ? <p className="mt-1 text-xs text-[var(--studio-danger)]">{err}</p> : null}
    </div>
  )
}

// `fallback` is the colour in use while the setting is empty, so the swatch
// shows what the page shows.
// A wrapping label named only the swatch; the code field beside it was
// announced as its placeholder ("#000000"), so every colour of a theme
// sounded the same. The name now goes to the code field, and the swatch says
// it picks that colour.
// `accepts` is for a setting that can hold nothing but a colour. Only what it
// accepts goes out while typing, and an emptied field goes out on leaving: for
// a gradient stop, emptying drops the gradient the new colour is being typed for.
// `subject` names what the value belongs to, for a field that can change hands
// while it is being typed in.
function pickerHex(color) {
  const raw = String(color || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw
  if (/^#[0-9a-fA-F]{8}$/.test(raw)) return `#${raw.slice(1, 7)}`
  if (/^#[0-9a-fA-F]{3,4}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`
  }
  const m = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,/]+[\d.]+%?)?\s*\)$/i.exec(raw)
  if (m) {
    return '#' + [m[1], m[2], m[3]]
      .map((n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0'))
      .join('')
  }
  return '#000000'
}

export function LabeledColor({ label, value, onChange, fallback, accepts, subject }) {
  const { t } = useLanguage()
  const labelId = useId()
  // What the person is typing ("#7a") until they leave the field; the value that
  // comes back from the page would otherwise overwrite it.
  const [draft, setDraft] = useState(null)
  const [draftSubject, setDraftSubject] = useState(subject)
  if (subject !== draftSubject) {
    setDraftSubject(subject)
    setDraft(null)
  }
  const shown = value || fallback || ''
  const hex = pickerHex(shown)
  return (
    <div className="block min-w-0">
      <span id={labelId} className={labelCls}>{label}</span>
      <div className="flex min-w-0 items-center gap-1.5">
        <input
          type="color"
          className="h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-[var(--studio-border)] bg-[var(--studio-control)] p-0.5"
          aria-label={typeof label === 'string' ? t('Pick a colour: {label}', { label }) : undefined}
          aria-labelledby={typeof label === 'string' ? undefined : labelId}
          value={hex}
          onChange={(e) => {
            setDraft(null)
            onChange(e.target.value)
          }}
        />
        <input
          type="text"
          className={inputCls + ' font-mono'}
          aria-labelledby={labelId}
          value={draft ?? value ?? ''}
          placeholder={fallback || '#000000'}
          onChange={(e) => {
            const raw = e.target.value
            setDraft(raw)
            if (!accepts || accepts(raw)) onChange(raw)
          }}
          onBlur={() => {
            if (accepts && draft !== null && !draft.trim()) onChange('')
            setDraft(null)
          }}
        />
      </div>
    </div>
  )
}

export function LabeledSelect({ label, value, onChange, options }) {
  const current = value ?? ''
  const hasMatch = options.some(([val]) => val === current)
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <select
        className={inputCls}
        value={current}
        onChange={(e) => onChange(e.target.value)}
      >
        {current !== '' && !hasMatch && (
          <option key={current} value={current}>
            {current}
          </option>
        )}
        {options.map(([val, text]) => (
          <option key={val} value={val}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}

// Segmented icon buttons for alignment and compact discrete choices.
// Each option is [value, ariaLabel, iconName, disabled?], drawn strictly from
// components/iconNodes.js via NodeIcon.
export function SegmentedIconButtons({
  label,
  value,
  onChange,
  options,
  allowClear = false,
  inline = false,
}) {
  const group = (
    <div
      role="group"
      aria-label={typeof label === 'string' ? label : undefined}
      className={`flex items-center gap-0.5 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-control)] p-0.5 ${
        inline ? 'shrink-0' : 'w-full'
      }`}
    >
      {options.map(([val, optionLabel, iconName, disabled]) => {
        const active = value !== undefined && value !== null && value !== '' && value === val
        return (
          <button
            key={val}
            type="button"
            disabled={disabled}
            aria-label={optionLabel}
            title={optionLabel}
            aria-pressed={active}
            onClick={() => onChange(allowClear && active ? '' : val)}
            className={`flex items-center justify-center rounded-md py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${
              inline ? 'px-2.5' : 'flex-1 px-2'
            } ${
              active
                ? 'bg-[var(--studio-panel-raised)] text-[var(--studio-accent-text)] shadow-[var(--studio-shadow-sm)] ring-1 ring-[color-mix(in_srgb,var(--studio-accent)_32%,var(--studio-border))]'
                : 'text-[var(--studio-text-muted)] hover:bg-[var(--studio-control-hover)] hover:text-[var(--studio-text)]'
            }`}
          >
            <NodeIcon name={iconName} size={14} />
          </button>
        )
      })}
    </div>
  )

  if (inline) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-[var(--studio-text-muted)]">{label}</span>
        {group}
      </div>
    )
  }

  return (
    <div className="block">
      {label && <span className={labelCls}>{label}</span>}
      {group}
    </div>
  )
}

const ALIGN_BOX_ICONS = {
  left: 'alignBoxLeft',
  center: 'alignBoxCenter',
  right: 'alignBoxRight',
}

// One-click position picker: the three choices sit side by side as pressed-in
// buttons instead of hiding inside a dropdown, so setting where the brand or the
// links sit is a single click and the current choice is visible at a glance.
export function LabeledAlign({ label, value, onChange, options }) {
  const current = value ?? options[0]?.[0]
  return (
    <SegmentedIconButtons
      label={label}
      value={current}
      onChange={onChange}
      options={options.map(([val, text]) => [
        val,
        text,
        ALIGN_BOX_ICONS[val] || 'alignBoxLeft',
      ])}
    />
  )
}

function UnitInputShell({ unit, children }) {
  if (!unit) return children
  return (
    <div className="studio-input flex min-w-0 items-center px-0 py-0">
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none shrink-0 select-none pr-2.5 text-[11px] font-medium text-[var(--studio-text-faint)]"
      >
        {unit}
      </span>
    </div>
  )
}

const bareNumberCls = 'min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-xs text-[var(--studio-text)] placeholder:text-[var(--studio-text-faint)] focus:outline-none'

// One number with an optional unit, e.g. "16px", "-0.02em", "1.5rem", "50%".
const CSS_LENGTH_RE = /^\s*(-?(?:\d+\.?\d*|\.\d+))\s*(px|em|rem|%|vw|vh)?\s*$/i

// A length field that keeps the unit the value already has.
//
// It used to read only the leading number and write every edit back as px, so
// any other unit was silently converted: every heading ships with
// letter-spacing -0.02em, which one click turned into 0.98px; 1.5rem became
// 2.5px, 50% became 51px, and "10px 24px" lost its horizontal padding. The unit
// is now kept and shown; a value that is not a single length (several values,
// calc(), clamp()) is edited as text so nothing is thrown away.
export function LabeledPx({ label, value, onChange, placeholder, subject, defaultUnit = 'px' }) {
  const raw = String(value ?? '')
  const match = CSS_LENGTH_RE.exec(raw)
  const explicitUnit = match?.[2]?.toLowerCase() || ''
  const [lastSubject, setLastSubject] = useState(subject)
  const [lastUnit, setLastUnit] = useState(explicitUnit || defaultUnit)
  const [draft, setDraft] = useState(null)
  const [lastSent, setLastSent] = useState(null)
  if (subject !== lastSubject) {
    setLastSubject(subject)
    setLastUnit(explicitUnit || defaultUnit)
    setDraft(null)
    setLastSent(null)
  } else {
    if (explicitUnit && explicitUnit !== lastUnit) setLastUnit(explicitUnit)
    if (draft !== null && draft !== '' && raw !== lastSent) setDraft(null)
  }
  if (draft === null && raw.trim() && !match) {
    return <LabeledText label={label} value={raw} onChange={onChange} />
  }
  const num = match ? match[1] : ''
  const unit = explicitUnit || (raw.trim() ? defaultUnit : lastUnit)
  const fine = unit === 'em' || unit === 'rem'
  return (
    <label className="block min-w-0">
      <span className={labelCls}>{label}</span>
      <UnitInputShell unit={unit}>
        <input
          type="number"
          step={fine ? 0.01 : 1}
          className={bareNumberCls}
          value={draft ?? num}
          placeholder={placeholder}
          onChange={(e) => {
            const nextRaw = e.target.value
            const sent = nextRaw === '' ? '' : `${nextRaw}${unit}`
            setDraft(nextRaw)
            setLastSent(sent)
            onChange(sent)
          }}
          onBlur={() => {
            setDraft(null)
            setLastSent(null)
          }}
        />
      </UnitInputShell>
    </label>
  )
}

// Whole numbers unless `step` is a fraction. A line height of 1.2 and letter
// spacing of 0.05em used to be rounded on the way in and out: they read as 1
// and 0, and typing 1.5 turned into 2 under the cursor.
export function LabeledNumber({
  label,
  value,
  onChange,
  step = 1,
  allowEmpty = false,
  subject,
  unit,
  placeholder,
}) {
  const fractional = step < 1
  const keepDraft = fractional || allowEmpty
  // What the person is typing ("1.", "0.0") until they leave the field; the
  // value that comes back from the page would otherwise overwrite it.
  const [draft, setDraft] = useState(null)
  const [draftSubject, setDraftSubject] = useState(subject)
  if (subject !== draftSubject) {
    setDraftSubject(subject)
    setDraft(null)
  }
  const isEmpty = allowEmpty && (value === '' || value === null || value === undefined)
  const shown = isEmpty
    ? ''
    : fractional
      ? String(Number(value) || 0)
      : Math.round(value ?? 0)
  return (
    <label className="block min-w-0">
      <span className={labelCls}>{label}</span>
      <UnitInputShell unit={unit}>
        <input
          type="number"
          step={step}
          placeholder={placeholder}
          className={unit ? bareNumberCls : inputCls}
          value={draft ?? shown}
          onChange={(e) => {
            const raw = e.target.value
            if (keepDraft) setDraft(raw)
            // HTML fields opt into the distinction: empty restores the inherited
            // style while 0 is an explicit value. Other integer consumers keep
            // their existing clear-to-zero behavior.
            onChange(raw === '' ? (keepDraft ? '' : 0) : Number(raw))
          }}
          onBlur={() => setDraft(null)}
        />
      </UnitInputShell>
    </label>
  )
}

export function LabeledRange({ label, value, onChange, min = 0, max = 1, step = 0.1 }) {
  const parsed = parseFloat(value)
  const v = Number.isNaN(parsed) ? max : parsed
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={v}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 accent-[var(--studio-accent)]"
        />
        <span className="w-8 text-right font-mono text-[11px] text-[var(--studio-text-muted)]">{v}</span>
      </div>
    </label>
  )
}

export function LabeledCheckbox({ label, checked, onChange, hint }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-0.5">
      <input
        type="checkbox"
        className="h-3.5 w-3.5 cursor-pointer rounded border-[var(--studio-border-strong)] accent-[var(--studio-accent)]"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-xs text-[var(--studio-text)]">{label}</span>
      {hint && <span className="text-[11px] text-[var(--studio-text-muted)]">{hint}</span>}
    </label>
  )
}

// Edit the `tabs` array on a Tabs component: each item is { id, label }. IDs are
// auto-generated and kept stable when labels are renamed, so already-placed
// children stay associated with their tab. Removing the active tab moves its
// children onto the first remaining tab.
// `batch` runs a function whose edits are to count as ONE undo step: adding or
// removing a tab writes the list, the blocks in it and the tab that is showing.
export function TabsEditorControl({ label, value, onChange, activeId, onActiveChange, children, onChildrenChange, batch = (run) => run() }) {
  const { t } = useLanguage()
  const tabs = Array.isArray(value) ? value.filter((tab) => tab && tab.id) : []

  const genId = () => {
    let n = 1
    const taken = new Set(tabs.map((tab) => tab.id))
    while (taken.has(`t${n}`)) n += 1
    return `t${n}`
  }

  const rename = (id, label) =>
    onChange(tabs.map((tab) => (tab.id === id ? { ...tab, label } : tab)))

  const add = () => batch(() => {
    const id = genId()
    onChange([...tabs, { id, label: t('Tab {count}', { count: tabs.length + 1 }) }])
    if (onActiveChange) onActiveChange(id)
  })

  const remove = (id) => {
    if (tabs.length <= 1) return
    const next = tabs.filter((tab) => tab.id !== id)
    batch(() => {
      onChange(next)
      // Reassign any children that pointed at the removed tab.
      if (children && onChildrenChange) {
        onChildrenChange(
          children.map((c) => {
            if ((c.tabId || c.props?.tabId) !== id) return c
            const nextChild = { ...c, tabId: next[0].id }
            if (nextChild.props && 'tabId' in nextChild.props) {
              const nextProps = { ...nextChild.props }
              delete nextProps.tabId
              nextChild.props = nextProps
            }
            return nextChild
          }),
        )
      }
      if (activeId === id && onActiveChange) onActiveChange(next[0].id)
    })
  }

  const move = (id, dir) => {
    const i = tabs.findIndex((tab) => tab.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= tabs.length) return
    const next = [...tabs]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="space-y-2">
        {tabs.map((tab, i) => {
          const sel = activeId === tab.id
          return (
            <div
              key={tab.id}
              className={`rounded-lg border p-2 ${
                sel
                  ? 'border-[var(--studio-accent)] bg-[var(--studio-accent-soft)]'
                  : 'border-[var(--studio-border)] bg-[var(--studio-panel-raised)]'
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => onActiveChange && onActiveChange(tab.id)}
                  className={`text-xs font-semibold ${
                    sel
                      ? 'text-[var(--studio-accent-text)]'
                      : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-accent-text)]'
                  }`}
                  title={t('Show this tab on the canvas')}
                >
                  {sel ? '● ' : ''}{t('Tab')} {i + 1}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(tab.id, -1)}
                    disabled={i === 0}
                    className="rounded-lg px-1 text-xs text-[var(--studio-text-muted)] hover:bg-[var(--studio-control-hover)] disabled:opacity-30"
                    title={t('Move up')}
                    aria-label={t('Move up')}
                  >
                    <ArrowUpIcon size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(tab.id, 1)}
                    disabled={i === tabs.length - 1}
                    className="rounded-lg px-1 text-xs text-[var(--studio-text-muted)] hover:bg-[var(--studio-control-hover)] disabled:opacity-30"
                    title={t('Move down')}
                    aria-label={t('Move down')}
                  >
                    <ArrowDownIcon size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(tab.id)}
                    disabled={tabs.length <= 1}
                    className="text-xs text-[var(--studio-danger)] hover:underline disabled:text-[var(--studio-text-faint)] disabled:no-underline"
                  >
                    {t('Remove')}
                  </button>
                </div>
              </div>
              <textarea
                rows={2}
                className={`${inputCls} resize-y`}
                value={tab.label ?? ''}
                placeholder={t('Tab label')}
                onChange={(e) => rename(tab.id, e.target.value)}
              />
            </div>
          )
        })}
        <button
          type="button"
          onClick={add}
          className="w-full rounded-lg border border-dashed border-[var(--studio-border-strong)] py-1.5 text-xs text-[var(--studio-text-muted)] hover:border-[var(--studio-accent)] hover:text-[var(--studio-accent-text)]"
        >
          {t('+ Add tab')}
        </button>
      </div>
    </div>
  )
}

// Unreal-blueprint-style link target picker: instead of typing a raw href,
// you pick WHERE the link goes — a page, the top of the current page, a named
// section, or an external URL — and the right href is written for you. The
// published page navigates by `#<pageId>` (page switch), `#top` (scroll up),
// or `#<section-id>` (scroll to element), all handled by the runtime.
//
// `sections` ([{ id, label }], optional) are the blocks on the current page. On
// the component canvas an element's id is its component id, so a section link
// is picked from them by name; without the list (HTML pages, whose ids the
// author wrote) the id is typed, as before.
const CUSTOM_SECTION = '__custom'

export function LinkTargetControl({ label, value, onChange, pages = [], sections = null, subject }) {
  const { t } = useLanguage()
  const labelId = useId()
  const href = typeof value === 'string' ? value : ''
  const pageIds = new Set(pages.map((p) => p.id))
  const [lastSubject, setLastSubject] = useState(subject)
  const [keepSectionOnHash, setKeepSectionOnHash] = useState(false)
  const [urlPickedOver, setUrlPickedOver] = useState(null)
  if (subject !== lastSubject) {
    setLastSubject(subject)
    setKeepSectionOnHash(false)
    setUrlPickedOver(null)
  }
  if (keepSectionOnHash && href !== '#') setKeepSectionOnHash(false)
  // A link to a page that has since been deleted. It used to show as a
  // "section on this page" named after the old page id.
  const deletedPage = pages.length > 0 && looksLikePageLink(href) && !pageIds.has(href.slice(1))
  let kind
  if (!href) kind = 'none'
  else if (/^(https?:|mailto:|tel:)/i.test(href)) kind = 'url'
  else if ((href === '#' && !keepSectionOnHash) || href === '#top') kind = 'top'
  else if (href.startsWith('#') && (pageIds.has(href.slice(1)) || deletedPage)) kind = 'page'
  else if (href.startsWith('#')) kind = 'section'
  else kind = 'url'

  // "External URL" picked and nothing typed yet. Picking the type used to
  // write "https://" into the link on the spot — a link to nowhere, saved and
  // published if the person then looked elsewhere. The link keeps what it had
  // until an address is typed; this remembers which value it was picked over,
  // so it lets go by itself once the link changes.
  const typingUrl = urlPickedOver !== null && urlPickedOver === href
  if (typingUrl) kind = 'url'

  const pickable = Array.isArray(sections) && sections.length > 0
  const sectionId = href.replace(/^#/, '')
  const knownSection = pickable && sections.some((s) => s.id === sectionId)

  const setKind = (k) => {
    const wasUrl = kind === 'url' && !typingUrl
    setUrlPickedOver(null)
    setKeepSectionOnHash(false)
    if (k === 'none') onChange('')
    else if (k === 'top') onChange('#top')
    else if (k === 'page') onChange('#' + (pages[0]?.id || ''))
    else if (k === 'section') onChange('#' + (pickable ? sections[0].id : 'section'))
    else if (!wasUrl) setUrlPickedOver(href)
  }

  return (
    <div className="block">
      {label && <span id={labelId} className={labelCls}>{label}</span>}
      <select
        className={inputCls + ' mb-1'}
        aria-labelledby={label ? labelId : undefined}
        value={kind}
        onChange={(e) => setKind(e.target.value)}
      >
        <option value="none">{t('No link')}</option>
        <option value="page">→ {t('Go to page')}</option>
        <option value="top">↑ {t('Top of this page')}</option>
        <option value="section"># {t('Section on this page')}</option>
        <option value="url">{t('External URL')}</option>
      </select>
      {kind === 'page' && (
        <select
          className={inputCls}
          aria-label={t('Go to page')}
          value={href.slice(1)}
          onChange={(e) => onChange('#' + e.target.value)}
        >
          {deletedPage && (
            <option value={href.slice(1)} disabled>
              {t('(deleted page)')}
            </option>
          )}
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      {kind === 'page' && deletedPage && (
        <span role="alert" className="mt-1 block text-[11px] text-[var(--studio-danger)]">
          {t('The page this link went to was deleted. Choose another page.')}
        </span>
      )}
      {kind === 'section' && pickable && (
        <select
          className={inputCls + ' mb-1'}
          aria-label={t('Section on this page')}
          value={knownSection ? sectionId : CUSTOM_SECTION}
          onChange={(e) => onChange(
            '#' + (e.target.value === CUSTOM_SECTION ? (knownSection ? 'section' : sectionId) : e.target.value),
          )}
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
          <option value={CUSTOM_SECTION}>{t('Custom id…')}</option>
        </select>
      )}
      {kind === 'section' && !knownSection && (
        <input
          type="text"
          className={inputCls}
          aria-label={t('section id (e.g. contact)')}
          value={sectionId}
          placeholder={t('section id (e.g. contact)')}
          onChange={(e) => {
            const next = '#' + e.target.value.replace(/^#/, '')
            setKeepSectionOnHash(next === '#')
            onChange(next)
          }}
          onBlur={() => setKeepSectionOnHash(false)}
        />
      )}
      {kind === 'section' && pickable && !knownSection && (
        <p className="studio-status-warning mt-1 rounded-md border px-2 py-1 text-[11px] leading-snug">
          {t('No block on this page is called "#{id}", so this link goes nowhere. Pick a block from the list, or give one the section name "{id}".', { id: sectionId })}
        </p>
      )}
      {kind === 'url' && (
        <input
          type="text"
          className={inputCls}
          // A label names only its first control; the address field said
          // nothing but its placeholder to a screen reader.
          aria-label={t('External URL')}
          value={typingUrl ? '' : href}
          placeholder="https://…"
          autoFocus={typingUrl}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            // Left without typing: the link is what it was.
            if (typingUrl && !e.target.value.trim()) { setUrlPickedOver(null); return }
            const complete = completeExternalUrl(e.target.value)
            if (complete !== e.target.value) onChange(complete)
          }}
        />
      )}
      {kind === 'top' && (
        <p className="text-xs text-[var(--studio-text-faint)]">{t('Clicking scrolls to the top of the page.')}</p>
      )}
    </div>
  )
}

export function LinksEditor({ label, value, onChange, pages = [], sections = null, subject }) {
  const { t } = useLanguage()
  const links = useMemo(() => (Array.isArray(value) ? value : []), [value])
  const [keyState, setKeyState] = useState(() => ({
    subject,
    seq: links.length,
    keys: links.map((_, idx) => `lk_${idx}`),
  }))
  if (subject !== keyState.subject) {
    const base = keyState.seq
    setKeyState({
      subject,
      seq: base + links.length,
      keys: links.map((_, idx) => `lk_${base + idx}`),
    })
  } else if (keyState.keys.length !== links.length) {
    let nextSeq = keyState.seq
    const keys = links.map((_, idx) => keyState.keys[idx] ?? `lk_${nextSeq++}`)
    setKeyState({ subject, seq: nextSeq, keys })
  }
  const keys = keyState.keys

  const update = (i, patch) =>
    onChange(links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const remove = (i) => {
    setKeyState((prev) => ({
      ...prev,
      keys: prev.keys.filter((_, idx) => idx !== i),
    }))
    onChange(links.filter((_, idx) => idx !== i))
  }
  const add = () => {
    setKeyState((prev) => ({
      ...prev,
      seq: prev.seq + 1,
      keys: [...prev.keys, `lk_${prev.seq}`],
    }))
    onChange([...links, { label: t('New link'), href: '#top' }])
  }

  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="space-y-2">
        {links.map((link, i) => (
          <div key={keys[i] ?? i} className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-[var(--studio-text-muted)]">{t('Link')} {i + 1}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs text-[var(--studio-danger)] hover:underline"
              >
                {t('Remove')}
              </button>
            </div>
            <textarea
              rows={2}
              className={`${inputCls} mb-1 resize-y`}
              value={link.label ?? ''}
              placeholder={t('Label')}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <LinkTargetControl
              label=""
              value={link.href ?? ''}
              subject={`${subject ?? 'links'}-${keys[i] ?? i}`}
              onChange={(href) => update(i, { href })}
              pages={pages}
              sections={sections}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="w-full rounded-lg border border-dashed border-[var(--studio-border-strong)] py-1.5 text-xs text-[var(--studio-text-muted)] hover:border-[var(--studio-accent)] hover:text-[var(--studio-accent-text)]"
        >
          {t('+ Add link')}
        </button>
      </div>
    </div>
  )
}

export function HtmlContentControl({ label, value, onChange, pages = [] }) {
  const { t } = useLanguage()
  const code = typeof value === 'string' ? value : ''
  const fields = useMemo(() => listHtmlContentFields(code), [code])
  const hasFields = fields.texts.length > 0 || fields.links.length > 0

  return (
    <div>
      <span className={labelCls}>{label}</span>
      {!hasFields ? (
        <p className="rounded-lg border border-dashed border-[var(--studio-border-strong)] bg-[var(--studio-panel-raised)] p-2 text-xs leading-relaxed text-[var(--studio-text-muted)]">
          {t('No simple text or links found. Use the HTML / CSS / JS editor below.')}
        </p>
      ) : (
        <div className="space-y-3">
          {fields.texts.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--studio-text-faint)]">{t('Text')}</div>
              {fields.texts.map((field) => (
                <LabeledTextarea
                  key={`text-${field.path}`}
                  label={field.labelKey ? t(field.labelKey, field.labelVars) : t(field.label)}
                  value={field.text}
                  rows={2}
                  onChange={(text) => onChange(updateHtmlTextAtPath(code, field.path, text))}
                />
              ))}
              {fields.textOverflow > 0 && (
                <p className="text-[11px] text-[var(--studio-text-faint)]">
                  {t('{count} more text fields are available in the code editor.', { count: fields.textOverflow })}
                </p>
              )}
            </div>
          )}
          {fields.links.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--studio-text-faint)]">{t('Links')}</div>
              {fields.links.map((field) => (
                <LinkTargetControl
                  key={`link-${field.path}`}
                  label={t(field.label)}
                  value={field.href}
                  pages={pages}
                  onChange={(href) => onChange(updateHtmlHrefAtPath(code, field.path, href))}
                />
              ))}
              {fields.linkOverflow > 0 && (
                <p className="text-[11px] text-[var(--studio-text-faint)]">
                  {t('{count} more links are available in the code editor.', { count: fields.linkOverflow })}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
