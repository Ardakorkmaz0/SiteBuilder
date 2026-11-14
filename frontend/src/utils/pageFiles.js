import { pageSlug } from './pageSlug.js'

// File-name flavored label for a page in an HTML-mode site: the first page
// publishes as index.html, the rest are slugified from the page name.
export function pageFileName(page, isHome, pages = null) {
  if (Array.isArray(pages)) {
    const names = pageFileNames(pages)
    if (names.has(page?.id)) return names.get(page.id)
  }
  if (isHome) return 'index.html'
  return `${pageSlug(page?.name) || 'page'}.html`
}

// Unique file names in page order, matching schemaToFiles deduplication so
// two pages with identical names resolve to e.g. about.html and about-2.html.
export function pageFileNameList(pages = []) {
  const used = new Set()
  return pages.map((page, index) => {
    const base = index === 0 ? 'index' : (pageSlug(page?.name) || 'page')
    let name = `${base}.html`
    let n = 2
    while (used.has(name)) name = `${base}-${n++}.html`
    used.add(name)
    return name
  })
}

export function pageFileNames(pages = []) {
  const names = pageFileNameList(pages)
  const out = new Map()
  pages.forEach((page, index) => {
    out.set(page?.id, names[index])
  })
  return out
}
