// The one way a page name becomes the word in its address and file name. The
// published address, the file in the editor's file list, the exported file
// and the editor's address bar each had their own rule, and only the
// published one knew Turkish letters: "Hakkımızda" was published at
// /hakkimizda, listed and exported as hakk-m-zda.html, and shown as
// /hakkımızda in the editor.
//
// Dotless ı has no canonical decomposition, so NFKD alone drops it and
// "Çalışmalar" becomes "cal-smalar". The letters that matter most here are
// mapped by hand; NFKD then handles the accents of every other language.
const TRANSLITERATE = { ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ç: 'c', Ç: 'c', ö: 'o', Ö: 'o', ü: 'u', Ü: 'u', ß: 'ss', æ: 'ae', ø: 'o', å: 'a', đ: 'd', ł: 'l' }

// '' when nothing usable is left (a name in another script): callers add
// their own fallback.
export function pageSlug(name) {
  return String(name || '')
    .trim()
    .replace(/[^ -~]/g, (char) => TRANSLITERATE[char] ?? char)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 140)
    .replace(/^-+|-+$/g, '')
}
