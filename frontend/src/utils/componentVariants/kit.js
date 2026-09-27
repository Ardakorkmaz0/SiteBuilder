// Shared helpers for the bilingual component variants. A variant is written
// once as render(T): T(en, tr) picks and escapes the copy for the language
// being built, so every variant ships an English and a Turkish snippet from
// the same markup (see sectionBlocks/kit.js for the same idea at page scale).
export { copy, translator } from '../sectionBlocks/kit.js'

// A variant definition. Its natural frame on the free canvas lives in
// sizes.js, keyed by palette type and id.
export const variant = (id, label, render) => ({ id, label, render })

export const FONT = 'font-family:inherit;box-sizing:border-box;'

// Buttons and link buttons are single <a> elements: on the canvas the embed
// stretches the first element over the whole frame and scales its label.
export const BUTTON = `${FONT}display:inline-flex;align-items:center;justify-content:center;gap:9px;text-decoration:none;font-weight:700;font-size:15.5px;line-height:1.2;cursor:pointer;white-space:nowrap;max-width:100%;`

export const a = (style, label) => `<a href="#" style="${BUTTON}${style}">${label}</a>`

// Badges are single inline spans for the same reason.
export const BADGE = `${FONT}display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;line-height:1.2;white-space:nowrap;`

export const pill = (style, label) => `<span style="${BADGE}${style}">${label}</span>`

// Icons fill their frame: an inline-grid span with a font size tied to the
// frame (vmin), so resizing the box resizes the glyph.
export const glyph = (style, mark, size = 'clamp(18px,42vmin,120px)') => (
  `<span aria-hidden="true" style="display:inline-grid;place-items:center;width:100%;height:100%;font-size:${size};font-weight:800;font-family:system-ui,sans-serif;line-height:1;${style}">${mark}</span>`
)

export const photo = (seed, w, h, style = '', alt = '') => (
  `<img src="https://picsum.photos/seed/${seed}/${w}/${h}" alt="${alt}" loading="lazy" style="display:block;width:100%;height:auto;aspect-ratio:${w}/${h};object-fit:cover;background:linear-gradient(135deg,#e2e8f0,#cbd5e1);${style}" />`
)
