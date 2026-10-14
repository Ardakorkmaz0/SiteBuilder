// How a preview frame names a page and turns it into a URL. Shared by the
// desktop window (BrowserFrame) and the phone browser (MobileBrowserChrome) so
// the same page reads the same way in both.
import { pageSlug } from '../../utils/pageSlug.js'

export function pageTitle(page, fallback) {
  return String(page?.seoTitle || page?.name || fallback || 'Untitled page').trim()
}

// The same word the page is published under (pageSlug.js).
export function pagePath(page, index) {
  if (index === 0) return '/'
  return `/${pageSlug(page?.slug || page?.name) || `page-${index + 1}`}`
}

export function visiblePageAddress(address, page, index) {
  const raw = String(address || 'preview.sitebuilder.local')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/g, '')
  // A canonical URL already has a path. A bare domain receives the path of the
  // selected design page so the address bar behaves like a real browser.
  return raw.includes('/') ? raw : `${raw}${pagePath(page, index)}`
}
