// What a saved version changed, as the history list shows it: how large the
// change was and whether Undo could take it back. The numbers come from the
// server (backend/builder/version_summary.py), one summary per version.

// The change a row stands for: of one page when `pageId` is given, of the
// whole site otherwise. Null when the row has no summary, or when it did not
// change that page.
export function versionChange(row, pageId = null) {
  const summary = row?.summary
  if (!summary || typeof summary !== 'object') return null
  const pages = Array.isArray(summary.pages) ? summary.pages : []
  if (pageId) {
    const page = pages.find((entry) => entry?.id === pageId)
    return page ? { size: Number(page.size) || 0, hard: !!page.hard, kind: page.kind, pages: 1 } : null
  }
  return {
    size: Number(summary.size) || 0,
    hard: !!summary.hard,
    kind: summary.first ? 'first' : pages.length ? 'changed' : summary.site ? 'site' : 'none',
    pages: pages.length,
  }
}

// English keys for t(): the words beside the mark.
export function changeLabel(change) {
  if (!change) return ''
  if (change.kind === 'first') return 'First save'
  if (change.hard) return 'Hard to take back'
  if (change.kind === 'site') return 'Site settings changed'
  if (change.size <= 0) return 'No page changed'
  if (change.size < 0.15) return 'Small change'
  if (change.size < 0.5) return 'Medium change'
  return 'Large change'
}

// Yellow for a small change through to red for a page replaced; the hard
// colour for a change only the history can take back; a quiet one for none.
export function changeColor(change) {
  if (!change || change.kind === 'first' || (!change.hard && change.size <= 0)) return 'var(--studio-border-strong)'
  if (change.hard) return 'var(--studio-change-hard)'
  const share = Math.round(Math.max(0, Math.min(1, change.size)) * 100)
  return `color-mix(in srgb, var(--studio-change-high) ${share}%, var(--studio-change-low))`
}
