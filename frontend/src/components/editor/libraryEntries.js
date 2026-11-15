// Every block the library offers, flattened into one list of entries: the
// cards it shows and the records its search reads.
import { HTML_BLOCKS } from '../../utils/htmlVariants.js'
import { WIDGETS, WIDGET_CATEGORIES, WIDGET_TYPE } from '../../utils/componentVariants/index.js'
import { SECTION_CATEGORIES } from '../../utils/sectionBlocks/index.js'
import {
  ADDABLE_PALETTE_ITEMS,
  NATIVE_CANVAS_TYPES,
  WIDE_HTML,
  blockSize,
  htmlSize,
  variantsForType,
} from './paletteData.js'

const SECTION_CATEGORY_NAMES = new Map(SECTION_CATEGORIES.map((category) => [category.id, category.name.en]))
const WIDGET_CATEGORY_NAMES = new Map(WIDGET_CATEGORIES.map((category) => [category.id, category.name.en]))

// Flatten the whole palette into searchable entries once per open. Sections
// are filed by their library category (`section:hero`, `section:footer`…),
// widgets by their group (`widget:rating`…), components by palette type.
export function buildEntries() {
  const entries = []
  for (const block of HTML_BLOCKS) {
    const [w, h] = blockSize(block.id)
    entries.push({
      kind: 'section',
      key: `section-${block.id}`,
      categoryId: `section:${block.category}`,
      categoryLabel: SECTION_CATEGORY_NAMES.get(block.category) || 'Sections',
      label: block.label,
      desc: block.desc || '',
      html: block.html,
      htmlTr: block.htmlTr,
      wide: true,
      use: { type: 'section', preset: block.id, w, h, label: block.label },
    })
  }
  for (const widget of WIDGETS) {
    const [w, h] = htmlSize(WIDGET_TYPE, widget)
    entries.push({
      kind: 'variant',
      key: `widget-${widget.id}`,
      categoryId: `widget:${widget.group}`,
      categoryLabel: WIDGET_CATEGORY_NAMES.get(widget.group),
      label: widget.label,
      desc: widget.label,
      html: widget.html,
      htmlTr: widget.htmlTr,
      fit: [w, h],
      use: { type: WIDGET_TYPE, preset: widget.id, w, h, label: widget.label },
    })
  }
  for (const item of ADDABLE_PALETTE_ITEMS) {
    for (const variant of variantsForType(item.type)) {
      const [w, h] = htmlSize(item.type, variant)
      const native = NATIVE_CANVAS_TYPES.has(item.type) || !!variant.native
      entries.push({
        kind: 'variant',
        key: `${item.type}-${variant.id}`,
        categoryId: item.type,
        categoryLabel: item.label,
        label: variant.label === 'Default' ? item.label : variant.label,
        desc: item.label,
        html: variant.html,
        htmlTr: variant.htmlTr,
        wide: WIDE_HTML.has(item.type),
        native,
        use: { type: item.type, preset: variant.id === 'default' ? null : variant.id, w, h, label: variant.label },
      })
    }
  }
  return entries
}

export function matchesCategory(entry, category) {
  if (category === 'all') return true
  if (category === 'sections') return entry.kind === 'section'
  if (category === 'widgets') return entry.categoryId.startsWith('widget:')
  return entry.categoryId === category
}
