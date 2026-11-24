// The bar over a selected element is one bar: on an HTML page (built inside
// the page's frame, HtmlWorkspace) and on a canvas page (CanvasSelectionActions)
// it shows the same icons at the same size on screen. Sizes and placement are
// in canvasSelectionActionsLayout.js; this is what each button draws.

export const SELECTION_ICON_SIZE = 18

// Action id → drawing in components/iconNodes.js.
export const SELECTION_ACTION_ICONS = {
  parent: 'cornerLeftUp',
  duplicate: 'copy',
  fit: 'minimize',
  up: 'arrowUp',
  down: 'arrowDown',
  backward: 'sendBackward',
  forward: 'bringForward',
  'vis-pc': 'monitor',
  'vis-mobile': 'smartphone',
  spotlight: 'maximize',
  share: 'share',
  delete: 'trash',
  deselect: 'x',
}

// The drawings for one action; a device that is hidden is crossed out.
export function selectionActionIcon(id, { off = false } = {}) {
  const icon = SELECTION_ACTION_ICONS[id]
  return off ? [icon, 'slash'] : [icon]
}

// The bar is dark in both themes, so these are fixed colours.
export const SELECTION_BAR_BACKGROUND = '#111827'
export const SELECTION_BAR_BORDER = 'rgba(255,255,255,0.18)'
export const SELECTION_BAR_SHADOW = '0 8px 22px rgba(15,23,42,0.3)'
export const SELECTION_BUTTON_HOVER = 'rgba(255,255,255,0.1)'
export const SELECTION_DANGER_HOVER = '#991b1b'
