// Fonts a site carries inside itself: the @font-face rules of a document
// that was turned into canvas pages, each with its font file as a data: URI.
// A canvas page draws its text in them only if every place that draws the
// page is given the rules, so they are kept on the schema (`fontFaces`) and
// written into the editor, the preview and the published page.
//
// Only @font-face rules are kept, and only ones whose files are inside the
// rule. Mirrors sanitize_font_faces in backend/builder/validators.py.

export const MAX_FONT_FACES = 1_500_000

const RULE = /@font-face\s*\{[^{}]*\}/gi
const FAMILY = /font-family\s*:\s*(["']?)([^;"'}]+)\1/i

const safeRule = (rule) => !/[<>]|javascript:|expression\(|@import/i.test(rule)
  && [...rule.matchAll(/url\(\s*(["']?)([^)"']*)/gi)].every((match) => /^data:(font|application)\//i.test(match[2].trim()))

// The rules in `css`, each with the family it defines.
export function fontFaceRules(css) {
  const text = typeof css === 'string' ? css : ''
  const rules = []
  let size = 0
  for (const rule of text.match(RULE) || []) {
    const family = (rule.match(FAMILY) || [])[2]?.trim()
    if (!family || !safeRule(rule) || size + rule.length > MAX_FONT_FACES) continue
    size += rule.length
    rules.push({ family, css: rule })
  }
  return rules
}

export const safeFontFaces = (css) => fontFaceRules(css).map((rule) => rule.css).join('\n')

// `existing` with the rules of `added` it does not have yet.
export function mergeFontFaces(existing, added) {
  const have = fontFaceRules(existing).map((rule) => rule.css)
  for (const rule of fontFaceRules(added)) if (!have.includes(rule.css)) have.push(rule.css)
  return safeFontFaces(have.join('\n'))
}

// The rules for the families the blocks are written in.
export function fontFacesUsedBy(css, components) {
  const written = JSON.stringify(components || [])
  return fontFaceRules(css).filter((rule) => written.includes(rule.family)).map((rule) => rule.css).join('\n')
}

// The <style> a published page carries: the rules its own blocks use.
export function fontFaceStyleTag(schema, page) {
  const css = fontFacesUsedBy(schema?.fontFaces, page?.components)
  return css ? `<style data-pwb-fonts>${css}</style>` : ''
}
