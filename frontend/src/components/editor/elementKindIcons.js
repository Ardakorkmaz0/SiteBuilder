// What a selected thing is, as one icon: a heading block on a canvas page and
// an <h1> on an HTML page show the same drawing (components/iconNodes.js).

// Canvas block type → drawing. The component list (Sidebar) and the
// properties panel header both read it through the registry's `icon`.
export const COMPONENT_KIND_ICONS = {
  navbar: 'menu',
  heading: 'heading',
  text: 'text',
  button: 'button',
  linkbutton: 'link',
  image: 'image',
  section: 'band',
  region: 'region',
  card: 'card',
  list: 'list',
  quote: 'quote',
  badge: 'badge',
  icon: 'star',
  input: 'input',
  themeToggle: 'halfCircle',
  select: 'select',
  alert: 'alert',
  accordion: 'accordion',
  container: 'container',
  tabs: 'tabs',
  html: 'code',
  divider: 'divider',
  spacer: 'spacer',
}

// HTML tag → the drawing of the block that tag would be on a canvas page.
const TAG_KIND_ICONS = {
  h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading',
  p: 'text', span: 'text', label: 'text', strong: 'text', em: 'text', small: 'text',
  a: 'link',
  button: 'button',
  img: 'image', picture: 'image', figure: 'image', svg: 'image', video: 'image',
  ul: 'list', ol: 'list', li: 'list',
  blockquote: 'quote',
  nav: 'menu',
  header: 'region', footer: 'region', section: 'region', main: 'region', article: 'region', aside: 'region',
  input: 'input', textarea: 'input', form: 'input',
  select: 'select',
  details: 'accordion', summary: 'accordion',
  table: 'table', thead: 'table', tbody: 'table', tr: 'table', td: 'table', th: 'table',
  hr: 'divider',
  iframe: 'code', script: 'code', pre: 'code', code: 'code',
}

export function componentKindIcon(type) {
  return COMPONENT_KIND_ICONS[type] || 'container'
}

export function htmlTagKindIcon(tag) {
  return TAG_KIND_ICONS[String(tag || '').toLowerCase()] || 'container'
}
