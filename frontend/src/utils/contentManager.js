import { readElementMultilineText, writeElementMultilineText } from './domMultilineText.js'
import { listHtmlContentFields, updateHtmlTextAtPath } from './htmlQuickEdit.js'

const HTML_SELECTOR = 'h1,h2,h3,p,a,button,img'
// The props a visitor reads. `heading`, `brand`, `buttonText` and `author`
// were missing, so a section's own title never showed up here.
const COMPONENT_FIELDS = ['heading', 'title', 'subtitle', 'text', 'label', 'brand', 'buttonText', 'description', 'author', 'alt', 'src']

// What each entry is, as a translation key (the panel shows it in the
// editor's language; it used to say "h1" or "heading · text").
const TAG_KIND = { h1: 'Heading', h2: 'Heading', h3: 'Heading', p: 'Paragraph', a: 'Link text', button: 'Button', img: 'Image alternative text' }
const FIELD_KIND = {
  heading: 'Heading', title: 'Title', subtitle: 'Subtitle', text: 'Text', label: 'Label', brand: 'Brand name',
  buttonText: 'Button text', description: 'Description', author: 'Author', alt: 'Image alternative text', src: 'Image address',
}

function parseHtml(html) {
  if (!html?.trim() || typeof DOMParser === 'undefined') return null
  try { return new DOMParser().parseFromString(html, 'text/html') } catch { return null }
}

function componentEntries(page, components, parentPath = [], result = []) {
  ;(components || []).forEach((component, index) => {
    const path = [...parentPath, index]
    // Everything dropped from the palette or the block library is an `html`
    // component: its words are in its code, which this list never read — a
    // page built from blocks showed "no editable content".
    if (component.type === 'html' && typeof component.props?.code === 'string') {
      for (const field of listHtmlContentFields(component.props.code).texts) {
        if (!field.text.trim()) continue
        const kind = String(field.labelKey || '').replace(/: \{text\}$/, '')
        result.push({
          id: `embed:${page.id}:${path.join('.')}:${field.path}`,
          source: 'embed', pageId: page.id, pageName: page.name,
          path, embedPath: field.path, value: field.text,
          label: field.label, labelKey: kind || 'Text', labelVars: field.labelVars || {},
        })
      }
    }
    for (const field of COMPONENT_FIELDS) {
      const value = component.props?.[field]
      if (typeof value !== 'string' || (!value.trim() && field !== 'alt')) continue
      result.push({
        id: `component:${page.id}:${path.join('.')}:${field}`,
        source: 'component', pageId: page.id, pageName: page.name,
        path, field, value,
        label: `${component.type || 'component'} · ${field}`,
        labelKey: FIELD_KIND[field] || field,
      })
    }
    componentEntries(page, component.children, path, result)
  })
  return result
}

export function extractSiteContent(schema = {}, pageHtmlMap = {}) {
  const result = []
  for (const page of schema.pages || []) {
    const html = pageHtmlMap[page.id] ?? page.html ?? ''
    if (page.mode === 'html' || html.trim()) {
      const doc = parseHtml(html)
      ;[...(doc?.querySelectorAll(HTML_SELECTOR) || [])].forEach((node, index) => {
        const isImage = node.tagName === 'IMG'
        const field = isImage ? 'alt' : 'text'
        const value = isImage ? node.getAttribute('alt') || '' : readElementMultilineText(node)
        if (!value.trim() && !isImage) return
        result.push({
          id: `html:${page.id}:${index}:${field}`,
          source: 'html', pageId: page.id, pageName: page.name,
          index, field, value,
          label: isImage ? 'Image alternative text' : node.tagName.toLowerCase(),
          labelKey: TAG_KIND[node.tagName.toLowerCase()] || 'Text',
        })
      })
      continue
    }
    componentEntries(page, page.components, [], result)
  }
  return result
}

export function updateHtmlContent(html, entry, value) {
  const doc = parseHtml(html)
  const node = doc?.querySelectorAll(HTML_SELECTOR)?.[entry.index]
  if (!doc || !node) return html
  if (entry.field === 'alt') node.setAttribute('alt', value)
  else writeElementMultilineText(node, value)
  return '<!doctype html>\n' + doc.documentElement.outerHTML
}

export function updateSchemaContent(schema, entry, value) {
  const next = structuredClone(schema)
  const page = next.pages?.find((item) => item.id === entry.pageId)
  if (!page) return schema
  let items = page.components || []
  let component = null
  for (const index of entry.path || []) {
    component = items[index]
    if (!component) return schema
    items = component.children || []
  }
  if (entry.source === 'embed') {
    const code = String(component.props?.code || '')
    component.props = { ...(component.props || {}), code: updateHtmlTextAtPath(code, entry.embedPath, value) }
    return next
  }
  component.props = { ...(component.props || {}), [entry.field]: value }
  return next
}
