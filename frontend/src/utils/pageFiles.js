import { pageSlug } from './pageSlug.js'

// File-name flavored label for a page in an HTML-mode site: the first page
// publishes as index.html, the rest are slugified from the page name.
export function pageFileName(page, isHome) {
  if (isHome) return 'index.html'
  return `${pageSlug(page?.name) || 'page'}.html`
}
