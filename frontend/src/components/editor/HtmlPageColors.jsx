import { useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '../../i18n/useLanguage.js'
import { pageColors } from '../../utils/htmlPageColors.js'

// One colour of the page. The picker shows the colour while it is dragged and
// changes the page when it closes (the native "change"), so a pick is one undo
// step, not one per pixel of the drag.
function PageColorSwatch({ color, count, onPick }) {
  const { t } = useLanguage()
  const inputRef = useRef(null)
  const [draft, setDraft] = useState(null)
  const shown = draft ?? color

  useEffect(() => {
    const input = inputRef.current
    if (!input) return undefined
    const commit = () => {
      const next = input.value.toLowerCase()
      setDraft(null)
      if (next !== color) onPick(color, next)
    }
    input.addEventListener('change', commit)
    return () => input.removeEventListener('change', commit)
  }, [color, onPick])

  return (
    <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] px-2 py-1.5 hover:border-[var(--studio-border-strong)]">
      <input
        ref={inputRef}
        type="color"
        value={shown}
        onChange={(event) => setDraft(event.target.value)}
        aria-label={t('Change {color}, used {count} times', { color: color.toUpperCase(), count })}
        className="h-7 w-8 shrink-0 cursor-pointer rounded border border-[var(--studio-border)] bg-transparent p-0"
      />
      <span className="min-w-0 truncate font-mono text-[11px] text-[var(--studio-text)]">{shown.toUpperCase()}</span>
      <span className="ml-auto shrink-0 text-[10px] tabular-nums text-[var(--studio-text-muted)]" aria-hidden="true">×{count}</span>
    </label>
  )
}

// The colours an HTML page uses (utils/htmlPageColors.js), each one a picker.
// An uploaded page rarely uses the variable names the theme knows, so this is
// the way to recolour any page: change one colour and it changes everywhere it
// is written.
export default function HtmlPageColors({ html, onReplace, scopeHint }) {
  const { t } = useLanguage()
  const colors = useMemo(() => pageColors(html), [html])
  if (!colors.length) {
    return <p className="text-[11px] leading-snug text-[var(--studio-text-muted)]">{t('This page sets no colors of its own in its CSS.')}</p>
  }
  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-snug text-[var(--studio-text-muted)]">
        {t('The colors this page uses, most used first. Change one and it changes everywhere it is written.')}
        {scopeHint ? ` ${scopeHint}` : ''}
      </p>
      <ul className="grid grid-cols-2 gap-1.5" aria-label={t('Colors on this page')}>
        {colors.map(({ color, count }) => (
          <li key={color} className="min-w-0">
            <PageColorSwatch color={color} count={count} onPick={onReplace} />
          </li>
        ))}
      </ul>
    </div>
  )
}
