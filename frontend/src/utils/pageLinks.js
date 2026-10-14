// Links that lead to a page from the rest of the site: its id as an anchor
// ("#page_…"), in an HTML page's document or in a component's link. Counted
// before the page is deleted, so the person knows what will stop working.

const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function countInComponents(components, target, htmlHref) {
  let count = 0
  const walk = (value) => {
    if (typeof value === 'string') {
      if (value === target) count += 1
      else count += (value.match(htmlHref) || []).length
    } else if (Array.isArray(value)) {
      value.forEach(walk)
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(walk)
    }
  }
  for (const component of components || []) walk({ props: component.props, children: component.children })
  return count
}

export function countLinksToPage(pages, pageId, htmlMap = {}) {
  if (!pageId) return 0
  const target = `#${pageId}`
  const htmlHref = new RegExp(`href\\s*=\\s*["']${escapeRe(target)}["']`, 'g')
  let count = 0
  for (const page of pages || []) {
    if (page.id === pageId) continue
    const html = htmlMap[page.id] ?? page.html ?? ''
    count += (String(html).match(htmlHref) || []).length
    count += countInComponents(page.components, target, htmlHref)
  }
  return count
}

// A page id written as a link ("#page_…"): the shape every page id has.
export function looksLikePageLink(href) {
  return /^#page_[a-z0-9_-]+$/i.test(String(href || ''))
}
