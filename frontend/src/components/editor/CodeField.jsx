// A source field with its code in colour. A <textarea> has one colour, so the
// colours are drawn behind it and its own text is see-through: typing, undo and
// selecting stay the browser's. With colours off it is the plain field.
import { useDeferredValue, useRef } from 'react'
import { useLanguage } from '../../i18n/useLanguage.js'
import { highlightCode } from '../../utils/syntaxHighlight.js'
import { setCodeColors, useCodeColors } from './useCodeColors.js'

export function CodeField({ ref, value, lang = 'html', className = '', ...props }) {
  const colors = useCodeColors()
  const behind = useRef(null)
  // Typing goes first, the colours catch up.
  const shown = useDeferredValue(value)
  // Its own font and size in both cases: code-field-text keeps them out of the
  // rule that gives every field the page's font.
  if (!colors) return <textarea ref={ref} value={value} className={`${className} code-field-text`} {...props} />
  const follow = (event) => {
    if (!behind.current) return
    behind.current.scrollTop = event.target.scrollTop
    behind.current.scrollLeft = event.target.scrollLeft
  }
  return (
    <div className="code-field">
      {/* The last line break would not make a row of its own otherwise. */}
      <pre ref={behind} aria-hidden="true" className={`${className} code-field-behind`} dangerouslySetInnerHTML={{ __html: `${highlightCode(shown, lang)}\n` }} />
      <textarea ref={ref} value={value} onScroll={follow} className={`${className} code-field-text code-field-input`} {...props} />
    </div>
  )
}

// The same colours for code that cannot be edited.
export function CodeText({ value, lang = 'html' }) {
  const colors = useCodeColors()
  return colors
    ? <code dangerouslySetInnerHTML={{ __html: highlightCode(value, lang) }} />
    : <code>{value}</code>
}

export function CodeColorsToggle({ className = '' }) {
  const { t } = useLanguage()
  const colors = useCodeColors()
  return (
    <button type="button" aria-pressed={colors} onClick={() => setCodeColors(!colors)} className={`code-colors-toggle ${className}`}>
      {t('Code colors')}
    </button>
  )
}
