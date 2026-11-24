// The drawings behind the editor's line icons, as plain data, so the same
// icon can be drawn by React (components/icons.jsx) and written as SVG text
// into a page the editor does not render with React (the toolbar over a
// selected element of an HTML page lives inside that page's frame).
//
// 24px grid, round caps and joins, stroke in currentColor. Several drawings
// are adapted from Lucide (https://lucide.dev), ISC License:
//   Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as
//   part of Feather (MIT). All other copyright (c) for Lucide are held by
//   Lucide Contributors 2022.
//   Permission to use, copy, modify, and/or distribute this software for any
//   purpose with or without fee is hereby granted, provided that the above
//   copyright notice and this permission notice appear in all copies.
//   THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES.

export const ICON_STROKE_WIDTH = 1.8

// name → list of [tag, attributes]. Attribute names are written as SVG spells
// them, which for these shapes is also what React accepts.
export const ICON_NODES = {
  copy: [
    ['rect', { x: 8, y: 8, width: 11, height: 11, rx: 2 }],
    ['path', { d: 'M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3' }],
  ],
  trash: [
    ['path', { d: 'M4 7h16' }],
    ['path', { d: 'M10 11v6M14 11v6' }],
    ['path', { d: 'M6 7l1 14h10l1-14' }],
    ['path', { d: 'M9 7V4h6v3' }],
  ],
  x: [
    ['path', { d: 'M18 6 6 18' }],
    ['path', { d: 'm6 6 12 12' }],
  ],
  cornerLeftUp: [
    ['path', { d: 'M14 9 9 4 4 9' }],
    ['path', { d: 'M20 20h-7a4 4 0 0 1-4-4V4' }],
  ],
  arrowUp: [
    ['path', { d: 'M12 19V5' }],
    ['path', { d: 'm5 12 7-7 7 7' }],
  ],
  arrowDown: [
    ['path', { d: 'M12 5v14' }],
    ['path', { d: 'm19 12-7 7-7-7' }],
  ],
  // One step towards the viewer / away from it: the square in front is the
  // one that moves.
  bringForward: [
    ['rect', { x: 8, y: 8, width: 8, height: 8, rx: 2 }],
    ['path', { d: 'M4 10a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2' }],
    ['path', { d: 'M14 20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2' }],
  ],
  sendBackward: [
    ['rect', { x: 14, y: 14, width: 8, height: 8, rx: 2 }],
    ['rect', { x: 2, y: 2, width: 8, height: 8, rx: 2 }],
    ['path', { d: 'M7 14v1a2 2 0 0 0 2 2h1' }],
    ['path', { d: 'M14 7h1a2 2 0 0 1 2 2v1' }],
  ],
  maximize: [
    ['path', { d: 'M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5' }],
  ],
  minimize: [
    ['path', { d: 'M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5' }],
  ],
  monitor: [
    ['rect', { x: 3, y: 4, width: 18, height: 13, rx: 2 }],
    ['path', { d: 'M8 21h8M12 17v4' }],
  ],
  smartphone: [
    ['rect', { x: 6, y: 2, width: 12, height: 20, rx: 2.5 }],
    ['path', { d: 'M11 18h2' }],
  ],
  // Drawn over a device to say "hidden on this screen".
  slash: [
    ['path', { d: 'm3 3 18 18' }],
  ],
  share: [
    ['circle', { cx: 18, cy: 5, r: 3 }],
    ['circle', { cx: 6, cy: 12, r: 3 }],
    ['circle', { cx: 18, cy: 19, r: 3 }],
    ['path', { d: 'm8.6 13.5 6.8 4M15.4 6.5l-6.8 4' }],
  ],
  plus: [
    ['path', { d: 'M12 5v14M5 12h14' }],
  ],
  minus: [
    ['path', { d: 'M5 12h14' }],
  ],
  check: [
    ['path', { d: 'm5 12 4.5 4.5L19 7' }],
  ],
  chevronDown: [
    ['path', { d: 'm6 9 6 6 6-6' }],
  ],
  chevronRight: [
    ['path', { d: 'm9 18 6-6-6-6' }],
  ],
  externalLink: [
    ['path', { d: 'M15 3h6v6' }],
    ['path', { d: 'M10 14 21 3' }],
    ['path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }],
  ],
  // What a block or an element is: the same drawing for a canvas block and
  // for the HTML element of that kind (elementKindIcons.js).
  menu: [
    ['path', { d: 'M4 6h16M4 12h16M4 18h16' }],
  ],
  heading: [
    ['path', { d: 'M6 12h12' }],
    ['path', { d: 'M6 20V4M18 20V4' }],
  ],
  text: [
    ['path', { d: 'M21 6H3M15 12H3M17 18H3' }],
  ],
  button: [
    ['rect', { x: 3, y: 7, width: 18, height: 10, rx: 3 }],
    ['path', { d: 'M8 12h8' }],
  ],
  link: [
    ['path', { d: 'M10 13a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7L11 6' }],
    ['path', { d: 'M14 11a4 4 0 0 0-5.7 0L5.7 13.6a4 4 0 0 0 5.7 5.7L13 18' }],
  ],
  band: [
    ['rect', { x: 2, y: 7, width: 20, height: 10, rx: 2 }],
    ['path', { d: 'M6 12h9' }],
  ],
  region: [
    ['rect', { x: 3, y: 3, width: 18, height: 7, rx: 1.5 }],
    ['rect', { x: 3, y: 14, width: 9, height: 7, rx: 1.5 }],
    ['rect', { x: 16, y: 14, width: 5, height: 7, rx: 1.5 }],
  ],
  card: [
    ['rect', { x: 3, y: 4, width: 18, height: 16, rx: 2 }],
    ['path', { d: 'M3 10h18M7 15h6' }],
  ],
  list: [
    ['path', { d: 'M9 6h12M9 12h12M9 18h12' }],
    ['path', { d: 'M4 6h.01M4 12h.01M4 18h.01' }],
  ],
  quote: [
    ['path', { d: 'M8 7H4v5h4v1a4 4 0 0 1-4 4' }],
    ['path', { d: 'M20 7h-4v5h4v1a4 4 0 0 1-4 4' }],
  ],
  badge: [
    ['circle', { cx: 12, cy: 12, r: 9 }],
    ['circle', { cx: 12, cy: 12, r: 2 }],
  ],
  star: [
    ['path', { d: 'M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L4.5 9.7l5.9-.9z' }],
  ],
  input: [
    ['rect', { x: 2, y: 7, width: 20, height: 10, rx: 2 }],
    ['path', { d: 'M7 10v4' }],
  ],
  halfCircle: [
    ['circle', { cx: 12, cy: 12, r: 9 }],
    ['path', { d: 'M12 3v18' }],
  ],
  select: [
    ['rect', { x: 3, y: 6, width: 18, height: 12, rx: 2 }],
    ['path', { d: 'm14 11 2 2 2-2' }],
  ],
  alert: [
    ['circle', { cx: 12, cy: 12, r: 9 }],
    ['path', { d: 'M12 16v-4M12 8h.01' }],
  ],
  accordion: [
    ['path', { d: 'm3 10 2.5-2.5L3 5M3 19l2.5-2.5L3 14' }],
    ['path', { d: 'M10 6h11M10 12h11M10 18h11' }],
  ],
  container: [
    ['rect', { x: 3, y: 5, width: 18, height: 14, rx: 2 }],
    ['rect', { x: 7, y: 9, width: 6, height: 6, rx: 1 }],
  ],
  tabs: [
    ['rect', { x: 3, y: 8, width: 18, height: 12, rx: 2 }],
    ['path', { d: 'M3 10V6a2 2 0 0 1 2-2h4l2 4' }],
  ],
  code: [
    ['path', { d: 'm8 9-4 3 4 3' }],
    ['path', { d: 'm16 9 4 3-4 3' }],
  ],
  divider: [
    ['path', { d: 'M3 12h18' }],
    ['path', { d: 'm8 8 4-4 4 4M16 16l-4 4-4-4' }],
  ],
  spacer: [
    ['path', { d: 'M12 2v20' }],
    ['path', { d: 'm8 18 4 4 4-4M8 6l4-4 4 4' }],
  ],
  table: [
    ['rect', { x: 3, y: 4, width: 18, height: 16, rx: 2 }],
    ['path', { d: 'M3 10h18M3 15h18M10 4v16' }],
  ],
  // The tabs of the properties panel.
  file: [
    ['path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }],
    ['path', { d: 'M14 2v6h6' }],
  ],
  palette: [
    ['path', { d: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-.4-.2-.8-.5-1.1-.3-.3-.5-.7-.5-1.1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4-4-7-9-7z' }],
    ['circle', { cx: 7.5, cy: 11.5, r: 1, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 9.5, cy: 7.5, r: 1, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 14.5, cy: 7.5, r: 1, fill: 'currentColor', stroke: 'none' }],
  ],
  move: [
    ['path', { d: 'M12 4v16M8 7l4-3 4 3M8 17l4 3 4-3' }],
  ],
  sparkles: [
    ['path', { d: 'M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z' }],
    ['path', { d: 'M18 15l.7 2 .3.3 2 .7-2 .7-.3.3-.7 2-.7-2-.3-.3-2-.7 2-.7.3-.3z' }],
  ],
  // The tools of the canvas palette.
  pointer: [
    ['path', { d: 'M4.04 4.69a.5.5 0 0 1 .65-.65l16 6.5a.5.5 0 0 1-.06.95l-6.13 1.58a2 2 0 0 0-1.43 1.43l-1.58 6.13a.5.5 0 0 1-.95.06z' }],
  ],
  type: [
    ['path', { d: 'M4 7V4h16v3' }],
    ['path', { d: 'M12 4v16' }],
    ['path', { d: 'M9 20h6' }],
  ],
  square: [
    ['rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }],
  ],
  image: [
    ['rect', { x: 3, y: 4, width: 18, height: 16, rx: 2 }],
    ['circle', { cx: 8.5, cy: 9.5, r: 1.5 }],
    ['path', { d: 'm21 16-4.5-4.5L7 21' }],
  ],
}

const escapeAttr = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// The icon as SVG text, for markup the editor writes outside React. Several
// names draw on top of each other: ['monitor', 'slash'] is "hidden on PC".
export function iconMarkup(names, { size = 18 } = {}) {
  const list = Array.isArray(names) ? names : [names]
  const parts = list.flatMap((name) => ICON_NODES[name] || []).map(([tag, attrs]) => (
    `<${tag} ${Object.entries(attrs).map(([key, value]) => `${key}="${escapeAttr(value)}"`).join(' ')}/>`
  ))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${ICON_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${parts.join('')}</svg>`
}
