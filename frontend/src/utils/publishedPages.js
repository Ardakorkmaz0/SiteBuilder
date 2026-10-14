// What a publish actually sends: every page, rendered to a document.
//
// A published site used to be a schema plus the app's own shell, so what a
// visitor received said "Sitebuilder" in its head and drew the page with
// JavaScript afterwards. The writers already produce the real document — the
// in-app viewer renders component pages through schemaToSingleHtml, and an
// uploaded page IS its document — so publishing just has to hand those over.

import { schemaToSingleHtml } from './schemaToFiles.js'
import { pageSeoTitle, withPageSeoTags } from './seoTags.js'
import { withBuilderInteractiveHtml } from './htmlRuntime.js'
import { colorModeFor, withColorModeHtml } from './colorMode.js'
import { pageSlug } from './pageSlug.js'

// The address of a page under /s/<slug>/. The home page has none: it IS the
// site. The server slugifies and de-duplicates again, so this is the wish, not
// the guarantee.
export function pagePath(page, index) {
  if (index === 0) return ''
  return pageSlug(page?.name) || `page-${index + 1}`
}

// The address every page WILL have, in page order. Two pages cannot share one:
// the server gives the later one a suffix (_published_path in validators.py).
// The links written into the pages have to name that address — with two pages
// called "Products", every link to the second one opened the first.
export function pagePaths(pages) {
  const taken = new Set()
  return pages.map((page, index) => {
    let path = pagePath(page, index)
    if (taken.has(path)) {
      const base = path || 'page'
      let n = 2
      while (taken.has(`${base}-${n}`)) n += 1
      path = `${base}-${n}`
    }
    taken.add(path)
    return path
  })
}

// A link to another page is stored as `#<pageId>` — the fragment the in-app
// viewer understands. Served as a real page that link goes nowhere, so it is
// retargeted to the addresses the pages are about to have: in the schema for
// canvas pages, so every writer inherits it, and in the file itself for an
// HTML page (withPublishedHtmlLinks).
export function publishedHref(slug, path) {
  return path ? `/s/${slug}/${path}/` : `/s/${slug}/`
}

function retarget(value, links) {
  if (Array.isArray(value)) return value.map((item) => retarget(item, links))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, inner] of Object.entries(value)) {
      out[key] = key === 'href' && typeof inner === 'string' && links.has(inner)
        ? links.get(inner)
        : retarget(inner, links)
    }
    return out
  }
  return value
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// The same links inside an HTML page, which is published as the file it is.
// Only href attributes that name a page exactly are touched, so the rest of
// the author's markup stays byte for byte.
export function withPublishedHtmlLinks(html, links) {
  if (!links.size || typeof html !== 'string') return html
  let out = html
  for (const [fragment, address] of links) {
    const target = escapeRegExp(fragment)
    out = out
      .replace(new RegExp(`(\\bhref\\s*=\\s*)(["'])${target}\\2`, 'gi'), (_, lead, quote) => `${lead}${quote}${address}${quote}`)
      .replace(new RegExp(`(\\bhref\\s*=\\s*)${target}(?=[\\s>])`, 'gi'), (_, lead) => `${lead}"${address}"`)
  }
  return out
}

export function withPublishedLinks(schema, links) {
  if (!links.size) return schema
  const pages = (Array.isArray(schema?.pages) ? schema.pages : []).map((page) => ({
    ...page,
    components: retarget(page.components, links),
  }))
  return { ...schema, pages }
}

// One page's document: its own file when it was uploaded, with what its Page
// settings say about search and sharing and the runtime the in-app viewer
// adds (its forms go to the owner's inbox; without it a form published as-is
// submitted to nowhere), otherwise the export the viewer already shows, which
// writes both itself.
export function pageDocument(page, schema, siteTitle, htmlMap = {}, links = new Map()) {
  // A switch on any page lets the visitor change the palette on every page.
  const colorMode = colorModeFor(schema, page, htmlMap)
  const authored = htmlMap[page?.id]
  if (typeof authored === 'string' && authored.trim()) {
    return withBuilderInteractiveHtml(withColorModeHtml(withPageSeoTags(withPublishedHtmlLinks(authored, links), page), colorMode))
  }
  const title = pageSeoTitle(page, page?.name || siteTitle || 'My Site')
  try {
    return schemaToSingleHtml({ ...schema, pages: [page] }, title, { colorMode })
  } catch {
    // A page the writer cannot render must not take the whole publish down;
    // it simply is not served until it renders.
    return ''
  }
}

export function publishedPagesFor(schema, htmlMap = {}, siteTitle = '', slug = '') {
  const pages = Array.isArray(schema?.pages) ? schema.pages : []
  const paths = pagePaths(pages)
  // Only with a slug: without one there is no address to point a link at, and
  // a half-rewritten link is worse than the fragment it replaced.
  const links = new Map(
    slug ? pages.map((page, index) => [`#${page.id}`, publishedHref(slug, paths[index])]) : [],
  )
  const linked = withPublishedLinks(schema, links)

  return pages
    .map((page, index) => ({
      path: paths[index],
      title: pageSeoTitle(page, page?.name || siteTitle || 'My Site').slice(0, 200),
      html: pageDocument(linked.pages[index], linked, siteTitle, htmlMap, links),
      noIndex: !!page?.noIndex,
    }))
    .filter((page) => page.html)
}
