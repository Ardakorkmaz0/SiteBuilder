import { publishedPagesFor } from '../src/utils/publishedPages.js'
import { themeToggleHtml, THEME_TOGGLE_CSS } from '../src/utils/themeToggle.js'

const block = (id, type, text, y = 120) => ({ id, type, props: { text }, styles: {}, layout: { x: 40, y, w: 400, h: 64 } })
const toggle = (id) => ({ ...block(id, 'themeToggle', '', 30), props: { states: 'three', label: 'Color theme', showLabel: 'on' }, layout: { x: 40, y: 30, w: 300, h: 44 } })
const bar = (id, vertical = false) => ({ ...block(id, 'navbar', '', 0), props: { brand: 'Review', links: [], ...(vertical ? { navLayout: 'vertical' } : {}) }, layout: { x: 0, y: 0, w: vertical ? 200 : 1200, h: vertical ? 600 : 72 } })
export const rawDocument = (label, extra = '') => `<!doctype html><html><head><style>:root{--bg:#ffffff;--ink:#171723}body{background:var(--bg);color:var(--ink)}${THEME_TOGGLE_CSS}</style></head><body><h1>${label}</h1>${themeToggleHtml({ states: 'three', label: 'Color theme', showLabel: 'on' })}${extra}</body></html>`

export function reviewSchema(label, { otherSlug = '', mixed = false } = {}) {
  const home = { id: 'home', name: 'Home', canvasWidth: 1200, components: [toggle('home-switch'), block('heading', 'heading', `${label} home`), { ...block('about-link', 'button', 'About', 210), props: { text: 'About', href: '#about' } }] }
  const about = { id: 'about', name: 'About', canvasWidth: 1200, components: [toggle('about-switch'), block('about-heading', 'heading', `${label} about`)] }
  if (otherSlug) home.components.push({ ...block('other-link', 'button', 'Other site', 300), props: { text: 'Other site', href: `/s/${otherSlug}/` } })
  const pages = [home, about]
  if (mixed) pages.push({ id: 'document', name: 'Document', mode: 'html', html: rawDocument(`${label} document`), components: [] })
  return { theme: { backgroundColor: '#ffffff', textColor: '#171723' }, colorMode: { start: 'light', theme: { backgroundColor: '#111317' } }, pages }
}

export function bulkSchema({ vertical = false } = {}) {
  return { theme: { backgroundColor: '#ffffff' }, pages: [
    { id: 'home', name: 'Home', canvasWidth: 1200, components: [bar('bar', vertical), block('selected-heading', 'heading', 'Selected heading')] },
    { id: 'flow', name: 'Flow', flowMode: true, canvasWidth: 1200, components: [bar('flow-bar'), block('flow-heading', 'heading', 'Flow heading'), block('flow-text', 'text', 'Flow body', 220)] },
    { id: 'document', name: 'Document', mode: 'html', html: '<!doctype html><html><body><h1>HTML remains unchanged</h1></body></html>', components: [] },
  ] }
}

export function reviewPublication(schema, title, slug) {
  const htmlMap = Object.fromEntries(schema.pages.filter((page) => page.html).map((page) => [page.id, page.html]))
  return publishedPagesFor(schema, htmlMap, title, slug)
}
