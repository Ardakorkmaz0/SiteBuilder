// Authoring helpers for the bilingual template catalogue. Every visible string
// is written as { en, tr } side by side, so a starter can never ship its
// English copy without the Turkish one. Kept in a module of its own so the
// category seed files (templateSeeds/) and the catalogue index can share them
// without importing each other.

export const copy = (en, tr = en) => ({ en, tr })

export const item = (heading, headingTr, text, textTr) => ({
  heading: copy(heading, headingTr),
  text: copy(text, textTr),
})

// The original starters: pack + page family + a name.
export const variant = (id, pack, family, name, trName = name) => ({
  id,
  pack,
  family,
  name: copy(name, trName),
})

// Second-wave starters also carry their own hero copy, layered over the
// category profile at build time: `hero` is { badge, title, lead }, each a
// copy(). `name` is a copy() too.
export const starter = (id, pack, family, name, hero) => ({
  id,
  pack,
  family,
  name,
  hero,
})

export const profile = (data) => data

export const templateText = (value) => value?.en ?? String(value || '')

// English → Turkish for every { en, tr } pair found anywhere inside `value`.
export function collectTranslations(value, output = {}) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectTranslations(entry, output))
    return output
  }
  if (!value || typeof value !== 'object') return output
  if (typeof value.en === 'string' && typeof value.tr === 'string') {
    output[value.en] = value.tr
    return output
  }
  Object.values(value).forEach((entry) => collectTranslations(entry, output))
  return output
}
