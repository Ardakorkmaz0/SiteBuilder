// A block's own look and the styles its owner wrote, as one style object.
//
// React writes a style object key by key: on a rerender it clears the keys that
// are gone and sets the ones whose value changed, and touches nothing else. An
// object that holds a shorthand next to one of its longhands therefore loses a
// value whenever one of the two changes: an alert drawn with `border` lost its
// whole border once its owner emptied the border colour.
//
// So a look is written in the properties an owner can set (borderWidth,
// borderStyle, borderColor, backgroundColor), where the owner's value simply
// takes the look's place. And a shorthand the owner writes replaces the parts of
// the look it covers, as the same two declarations cascade in the stylesheet of
// the published page.
const SIDES = ['Top', 'Right', 'Bottom', 'Left']
const sides = (before, after = '') => SIDES.map((side) => `${before}${side}${after}`)

const BORDER_PARTS = [...sides('border', 'Width'), ...sides('border', 'Style'), ...sides('border', 'Color')]

// Every shorthand in ALLOWED_STYLE_KEYS, and what it decides.
const COVERED = {
  padding: sides('padding'),
  margin: sides('margin'),
  gap: ['rowGap', 'columnGap'],
  borderWidth: sides('border', 'Width'),
  borderStyle: sides('border', 'Style'),
  borderColor: sides('border', 'Color'),
  border: ['borderWidth', 'borderStyle', 'borderColor', ...BORDER_PARTS],
}

// An emptied value is no declaration: it neither covers the look nor clears it.
export function layerStyles(look, styles) {
  const out = { ...look }
  const own = Object.entries(styles || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
  for (const [key] of own) {
    for (const covered of COVERED[key] || []) delete out[covered]
  }
  return Object.assign(out, Object.fromEntries(own))
}
