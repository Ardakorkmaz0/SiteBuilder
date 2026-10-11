// In-page link targets for the component canvas.
//
// A "section on this page" link is `#<element id>`. On the canvas an element's
// id is the block's section name when it has one (`about`, see anchors.js),
// else its component id — `region_x7k2ab`. The link field used to be a bare
// text box, so the only ids anyone typed were readable ones (`#about`,
// `#contact`, which is also what a new navbar ships with) that no block
// answered to: the link scrolled nowhere on the published site and nothing in
// the editor said so. These helpers list the real targets so the field can
// offer them by name, and tell a dead id from a live one.

import { anchorOf, elementIdFor } from './anchors.js'

function firstLine(value) {
  return String(value ?? '').split(/\r?\n/)[0].trim()
}

// The words a person would recognise a block by.
export function componentTextHint(component) {
  const p = component?.props || {}
  const hint = firstLine(p.heading) || firstLine(p.title) || firstLine(p.text)
    || firstLine(p.label) || firstLine(p.brand) || firstLine(p.alt)
  return hint.length > 40 ? `${hint.slice(0, 39)}…` : hint
}

// Every component on the page, in reading order (top to bottom, then left to
// right), nested ones right after their parent. The component being edited is
// left out — a link to itself is not a destination.
function readingOrder(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const la = a?.layout || {}
    const lb = b?.layout || {}
    return (la.y || 0) - (lb.y || 0) || (la.x || 0) - (lb.x || 0)
  })
}

// A band (section, container) has no words of its own; it is recognised by
// what is in it — the first text inside, in reading order.
function innerTextHint(component) {
  for (const kid of readingOrder(component?.children)) {
    const hint = componentTextHint(kid) || innerTextHint(kid)
    if (hint) return hint
  }
  return ''
}

/** What a block reads as: its own words, else the first words inside it. */
export function blockTextHint(component) {
  return componentTextHint(component) || innerTextHint(component)
}

export function linkSectionsFor(components, { excludeId = null } = {}) {
  const out = []
  const walk = (list, depth) => {
    for (const c of readingOrder(list)) {
      if (!c?.id) continue
      if (c.id !== excludeId) {
        // The id a link must use is the element id: the section name when set.
        out.push({ id: elementIdFor(c), anchor: anchorOf(c), type: c.type, text: componentTextHint(c) || innerTextHint(c), depth })
      }
      if (Array.isArray(c.children) && c.children.length) walk(c.children, depth + 1)
    }
  }
  walk(components, 0)
  return out
}

// Is `href` an in-page anchor that points at nothing on this page?
export function isDeadSectionLink(href, sections) {
  if (typeof href !== 'string' || !href.startsWith('#')) return false
  const id = href.slice(1)
  if (!id || id === 'top') return false
  return !(sections || []).some((s) => s.id === id)
}

// What someone means by what they typed into "External URL". The field writes
// each keystroke as it is, so "example.com" was saved as a link to a page
// called example.com on the site itself, and went nowhere once published.
// Meant for when the field loses focus, not per keystroke: "exam" is on its
// way to "example.com", and completing it mid-word would fight the typing.
// A name that ends like a file ("about.html") is left alone: in a project of
// files that IS the link.
const FILE_ENDINGS = new Set([
  'html', 'htm', 'php', 'asp', 'aspx', 'jsp', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp',
  'css', 'js', 'json', 'xml', 'txt', 'md', 'zip', 'mp3', 'mp4',
])

export function completeExternalUrl(value) {
  const href = String(value ?? '').trim()
  if (!href || /\s/.test(href)) return href
  // In-page, root-relative and relative links are already complete.
  if (/^[#/?.]/.test(href)) return href
  // host:port reads like a scheme ("localhost:3000"), so it goes first.
  if (/^[a-z0-9.-]+:\d+(\/|$)/i.test(href)) return `https://${href}`
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return href
  if (/^[^/@]+@[^/@]+\.[^/@]+$/.test(href)) return `mailto:${href}`
  const host = href.split(/[/?#]/)[0]
  const labels = host.split('.')
  if (labels.length < 2 || labels.some((label) => !/^[a-z0-9-]+$/i.test(label))) return href
  if (FILE_ENDINGS.has(labels[labels.length - 1].toLowerCase())) return href
  return `https://${href}`
}
