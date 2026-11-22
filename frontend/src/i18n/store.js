// Shared runtime Turkish dictionary registry. Keeping this tiny module separate
// from translations.js lets English sessions avoid downloading the 220 KB
// Turkish copy table until Turkish is actually active, while content libraries
// can still register their own bilingual labels via extendTranslations().
export const TURKISH_TRANSLATIONS = {}

let baseLoaded = false
let basePromise = null

// Base dictionary entries take priority over content-library extensions,
// matching the original order where translations.js loaded before libraries.
export function registerBaseTranslations(dictionary) {
  Object.assign(TURKISH_TRANSLATIONS, dictionary)
  baseLoaded = true
}

export function extendTranslations(dictionary) {
  for (const [english, turkish] of Object.entries(dictionary)) {
    if (!Object.prototype.hasOwnProperty.call(TURKISH_TRANSLATIONS, english)) {
      TURKISH_TRANSLATIONS[english] = turkish
    }
  }
}

export function hasBaseTurkishTranslations() {
  return baseLoaded
}

export function loadTurkishTranslations() {
  if (baseLoaded) return Promise.resolve(TURKISH_TRANSLATIONS)
  if (!basePromise) {
    basePromise = import('./translations.js')
      .then(() => TURKISH_TRANSLATIONS)
      .catch((error) => {
        basePromise = null
        throw error
      })
  }
  return basePromise
}
