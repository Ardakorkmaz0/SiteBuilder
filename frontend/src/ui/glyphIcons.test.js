// The editor draws its symbols with one set of line icons (components/icons.jsx,
// components/iconNodes.js): the same drawing, at the same size, on an HTML
// page and on a canvas page. A button that shows a typed character instead —
// ×, ✕, ▸, ✓, ↑ — looks different in every font and on every system, which is
// what the owner asked to be rid of (2026-11-24). This fails on a new one.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = path.resolve('src')
const GLYPH = '[×✕▾▸✓↖⧉⛶↗↑↓☰↻⟳]'
// A glyph alone as an element's content, alone on a JSX line, or as a quoted
// string standing in for an icon; in a JSX expression ({'×'}), at the start of
// a translated label (t('↻ Regenerate')) or before one (↻ {t('Reload')}, and
// the # that stood for the grid), or written into a page as its text.
const PATTERNS = [
  new RegExp(`>\\s*${GLYPH}\\s*<`),
  new RegExp(`^\\s*${GLYPH}\\s*$`),
  new RegExp(`\\?\\s*'${GLYPH}'|'${GLYPH}'\\s*:`),
  new RegExp(`\\}\\s*${GLYPH}\\s*$`),
  new RegExp(`\\{\\s*['"\`]${GLYPH}['"\`]\\s*\\}`),
  new RegExp(`\\bt\\(\\s*['"\`]${GLYPH}`),
  new RegExp(`(?:^|>)\\s*(?:${GLYPH}|#)\\s*\\{\\s*t\\(`),
  new RegExp(`\\.(?:textContent|innerText|innerHTML)\\s*=\\s*['"\`]${GLYPH}['"\`]`),
]
// Text, not icons: each is a decision.
const ALLOWED = [
  ['pages/EditorPage.jsx', '<span className="text-xs text-[var(--studio-text-faint)]">×</span>', 'the × between a custom width and height'],
  // A native list's options hold text only: no icon can stand there.
  ['components/editor/controls.jsx', '<option value="top">↑ {t(\'Top of this page\')}</option>', 'the top of the page, in a link target list'],
  ['components/editor/controls.jsx', '<option value="section"># {t(\'Section on this page\')}</option>', 'a section of the page, in a link target list'],
]

function files(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files(full, out)
    else if (/\.jsx$/.test(entry.name) && !/\.test\.jsx$/.test(entry.name)) out.push(full)
  }
  return out
}

describe('symbols in the editor are drawn as icons', () => {
  it('has no button or mark that shows a typed character as its icon', () => {
    const found = []
    const targets = [
      ...files(path.join(SRC, 'components', 'editor')),
      path.join(SRC, 'pages', 'EditorPage.jsx'),
      path.join(SRC, 'pages', 'CodeProjectPage.jsx'),
    ]
    for (const file of targets) {
      const rel = path.relative(SRC, file).split(path.sep).join('/')
      fs.readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
        const code = line.trim()
        if (code.startsWith('//') || code.startsWith('*') || code.startsWith('{/*')) return
        if (!PATTERNS.some((pattern) => pattern.test(line))) return
        if (ALLOWED.some(([where, text]) => where === rel && line.includes(text))) return
        found.push(`${rel}:${index + 1}: ${code}`)
      })
    }
    expect(found).toEqual([])
  })
})
