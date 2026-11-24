// The tool palette over the stage, the same on a canvas page and on an HTML
// page: Select, and three things to add where the page is clicked (on a
// canvas page, a drag draws the box they get). One placement each: afterwards
// the palette is back on Select.
export const PALETTE_TOOLS = [
  { id: 'select', icon: 'pointer', label: 'Select', key: 'v' },
  { id: 'text', icon: 'type', label: 'Text', key: 't', type: 'text' },
  { id: 'box', icon: 'square', label: 'Box', key: 'r', type: 'container' },
  { id: 'image', icon: 'image', label: 'Image', key: 'i', type: 'image' },
]

export function paletteToolForKey(key) {
  const lower = String(key || '').toLowerCase()
  return PALETTE_TOOLS.find((tool) => tool.key === lower) || null
}

export function paletteToolOfType(type) {
  return PALETTE_TOOLS.find((tool) => tool.type && tool.type === type) || null
}
