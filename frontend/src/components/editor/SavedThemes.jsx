import { useEffect, useState } from 'react'
import { getSavedThemes, putSavedThemes } from '../../api/profile.js'
import { apiError } from '../../utils/errors.js'
import { normalizeTheme, sameTheme } from '../../utils/theme.js'
import { useLanguage } from '../../i18n/useLanguage.js'

// One theme as a button: three dots of its own colors and its name. Shared by
// the presets and the saved themes, so both read the same way.
export function ThemeSwatchButton({ theme, name, active = false, title, onClick }) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium transition ${
        active
          ? 'border-[var(--studio-accent)] bg-[var(--studio-accent-soft)] text-[var(--studio-text)]'
          : 'border-[var(--studio-border)] bg-[var(--studio-panel-raised)] text-[var(--studio-text)] hover:border-[var(--studio-accent)]'
      }`}
    >
      <span className="flex shrink-0 -space-x-1" aria-hidden>
        {[theme.primaryColor, theme.headerColor, theme.softColor].map((color, index) => (
          <span key={index} className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: color }} />
        ))}
      </span>
      {/* Two lines rather than an ellipsis: in a narrow rail a truncated
          name read "Sıca…", which names nothing. */}
      <span className="line-clamp-2 min-w-0 leading-tight">{name}</span>
    </button>
  )
}

// The person's own themes: the current colors and fonts saved under a name,
// kept on their account so the next site can wear them too. Saving under a
// name that exists replaces that theme instead of adding a twin.
export default function SavedThemes({ theme, onApply }) {
  const { t } = useLanguage()
  const [themes, setThemes] = useState(null)
  const [limit, setLimit] = useState(24)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getSavedThemes()
      .then((data) => {
        if (!alive) return
        setThemes(Array.isArray(data?.themes) ? data.themes : [])
        if (data?.limit) setLimit(data.limit)
      })
      .catch((err) => {
        if (!alive) return
        setThemes([])
        setError(apiError(err, t('Your saved themes could not be loaded.')))
      })
    return () => { alive = false }
  }, [t])

  async function write(next) {
    setBusy(true)
    setError('')
    try {
      const data = await putSavedThemes(next)
      setThemes(data.themes)
      return true
    } catch (err) {
      setError(apiError(err, t('The theme could not be saved.')))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function save(event) {
    event.preventDefault()
    const label = name.trim().slice(0, 60)
    if (!label || !themes) return
    const same = themes.find((item) => item.name.toLowerCase() === label.toLowerCase())
    const entry = { id: same?.id || `t${Date.now().toString(36)}`, name: label, theme: normalizeTheme(theme) }
    const next = same
      ? themes.map((item) => (item.id === same.id ? entry : item))
      : [entry, ...themes]
    if (await write(next)) setName('')
  }

  const full = themes && themes.length >= limit

  return (
    <div className="space-y-2">
      <form onSubmit={save} className="flex gap-1.5">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          placeholder={t('Name this theme')}
          aria-label={t('Name this theme')}
          className="studio-input min-w-0 flex-1 px-2 py-1.5 text-xs"
        />
        <button
          type="submit"
          disabled={busy || !name.trim() || !themes || (full && !themes.some((item) => item.name.toLowerCase() === name.trim().toLowerCase()))}
          className="studio-btn studio-btn-secondary shrink-0 px-2.5 py-1.5 text-xs disabled:opacity-50"
        >
          {t('Save theme')}
        </button>
      </form>
      {error && <p role="alert" className="text-[11px] text-[var(--studio-danger)]">{error}</p>}
      {themes === null ? (
        <p className="text-[11px] text-[var(--studio-text-muted)]">{t('Loading your themes…')}</p>
      ) : themes.length === 0 ? (
        <p className="text-[11px] leading-snug text-[var(--studio-text-muted)]">
          {t('Save the colors and fonts above as your own theme, then use it on any of your sites.')}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {themes.map((item) => (
            <li key={item.id} className="flex min-w-0 items-center gap-1">
              <div className="grid min-w-0 flex-1">
                <ThemeSwatchButton
                  theme={item.theme}
                  name={item.name}
                  active={sameTheme(item.theme, theme)}
                  title={t('Use the "{name}" theme and apply it to the whole site', { name: item.name })}
                  onClick={() => onApply(item)}
                />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => write(themes.filter((other) => other.id !== item.id))}
                title={t('Delete the "{name}" theme', { name: item.name })}
                aria-label={t('Delete the "{name}" theme', { name: item.name })}
                className="studio-icon-btn h-7 w-7 shrink-0 text-base leading-none disabled:opacity-50"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {full && (
        <p className="text-[11px] text-[var(--studio-text-muted)]">
          {t('You have {count} saved themes, the most there can be. Delete one to save another.', { count: limit })}
        </p>
      )}
    </div>
  )
}
