// Search for the block library: finds a component by what it is called in
// either language, by a word that means the same thing ("foto" finds images,
// "fiyat" pricing tables), with one typo forgiven ("galri" finds the gallery),
// and keeps a "might be related" list so a query never ends on an empty page.
//
// The index is built once; a query is a pass over prefolded strings with no
// debounce, a few milliseconds for the whole library.
import { TURKISH_TRANSLATIONS } from '../i18n/translations.js'

const FOLD = { ı: 'i', ş: 's', ç: 'c', ğ: 'g', ö: 'o', ü: 'u', â: 'a', î: 'i', û: 'u' }

// Lower case without accents, Turkish letters folded to their plain twin, and
// everything that is not a letter or a digit read as a space.
export function foldText(value) {
  return String(value || '')
    .toLocaleLowerCase('tr')
    .replace(/[ışçğöüâîû]/g, (letter) => FOLD[letter])
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

const words = (value) => foldText(value).split(' ').filter(Boolean)

// Words that mean the same thing to someone looking for a component. Each
// group is one idea; a query word that names it finds every block that names
// it in any of these words. Written folded (see foldText).
const CONCEPTS = [
  'image images photo photos picture pictures gorsel gorseller resim resimler foto fotograf fotograflar img',
  'gallery galeri album albumler portfolio portfolyo vitrin showcase',
  'navbar nav navigation menu menuler gezinti header ustmenu',
  'button buttons btn buton dugme dugmeler cta',
  'link links baglanti baglantilar',
  'heading headings title titles baslik basliklar headline',
  'text paragraph metin metinler yazi paragraf',
  'price prices pricing fiyat fiyatlar fiyatlandirma ucret ucretler paket paketler tarife',
  'testimonial testimonials review reviews yorum yorumlar referans referanslar rating puan degerlendirme',
  'faq sss question questions soru sorular',
  'contact iletisim mail email eposta adres telefon phone',
  'form forms field fields input inputs girdi alan alanlar',
  'countdown timer sayac geri sayim zamanlayici',
  'video videos film filmler youtube medya media',
  'map maps harita haritalar konum location route rota',
  'team ekip takim people kisiler staff',
  'footer footers altbilgi',
  'hero heroes acilis banner bant',
  'card cards kart kartlar',
  'list lists liste listeler madde',
  'icon icons ikon simge simgeler',
  'badge badges rozet rozetler etiket tag tags label',
  'quote quotes alinti alintilar',
  'divider dividers ayirici cizgi separator',
  'select dropdown secim secici',
  'accordion akordeon details acilir',
  'tab tabs sekme sekmeler',
  'progress ilerleme yuzde percent',
  'calendar takvim date tarih event events etkinlik etkinlikler',
  'shop store magaza urun urunler product products cart sepet alisveris commerce',
  'social sosyal instagram share paylas follow takip',
  'newsletter bulten abone subscribe',
  'blog article articles makale makaleler news haber haberler',
  'stat stats statistics istatistik istatistikler metric metrics',
  'timeline zaman cizelgesi process surec step steps adim adimlar',
  'logo logos marka brand',
  'formula formulas formul formuller equation denklem math matematik',
  'exam exams sinav sinavlar vize quiz test question soru',
  'note notes not notlar study calisma ders',
  'code kod terminal sql program',
  'food yemek tarif recipe recipes mutfak kitchen restaurant restoran',
  'travel seyahat gezi tatil trip',
  'music muzik plak record sarki song concert konser',
  'game games oyun oyunlar score skor',
  'ticket tickets bilet biletler invitation davet davetiye',
]

const CONCEPT_WORDS = CONCEPTS.map((group) => group.split(' '))
// Word → the concepts it belongs to.
const WORD_CONCEPTS = new Map()
CONCEPT_WORDS.forEach((group, index) => {
  for (const word of group) {
    if (!WORD_CONCEPTS.has(word)) WORD_CONCEPTS.set(word, [])
    WORD_CONCEPTS.get(word).push(index)
  }
})

// Optimal string alignment distance, stopping early past `max`.
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let before = null
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
      if (before && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, before[j - 2] + 1)
      }
      current.push(value)
      best = Math.min(best, value)
    }
    if (best > max) return max + 1
    before = previous
    previous = current
  }
  return previous[b.length]
}

const allowedTypos = (word) => (word.length >= 7 ? 2 : word.length >= 4 ? 1 : 0)

/** One searchable record per entry: its words in both languages, folded. */
export function buildSearchIndex(entries) {
  const vocabulary = new Set()
  const records = entries.map((entry) => {
    const label = [entry.label, TURKISH_TRANSLATIONS[entry.label]].filter(Boolean).join(' ')
    const rest = [entry.desc, TURKISH_TRANSLATIONS[entry.desc], entry.categoryLabel, TURKISH_TRANSLATIONS[entry.categoryLabel], entry.use?.type]
      .filter(Boolean).join(' ')
    const labelWords = new Set(words(label))
    const categoryWords = new Set(words([entry.categoryLabel, TURKISH_TRANSLATIONS[entry.categoryLabel], entry.use?.type].filter(Boolean).join(' ')))
    const allWords = new Set([...labelWords, ...words(rest)])
    for (const word of allWords) vocabulary.add(word)
    const concepts = new Set()
    const labelConcepts = new Set()
    const categoryConcepts = new Set()
    for (const word of allWords) {
      for (const concept of WORD_CONCEPTS.get(word) || []) {
        concepts.add(concept)
        if (labelWords.has(word)) labelConcepts.add(concept)
        if (categoryWords.has(word)) categoryConcepts.add(concept)
      }
    }
    return {
      entry,
      labelText: foldText(label),
      allText: ` ${[...allWords].join(' ')} `,
      labelWords: [...labelWords],
      allWords: [...allWords],
      categoryWords: [...categoryWords],
      concepts,
      labelConcepts,
      categoryConcepts,
    }
  })
  return { records, vocabulary: [...vocabulary] }
}

// What a query word can mean: the concepts it names (whole word, or the start
// of one once it is three letters long) and the library words it is one or two
// typos away from.
function readWord(index, word) {
  const concepts = new Set(WORD_CONCEPTS.get(word) || [])
  if (word.length >= 3) {
    CONCEPT_WORDS.forEach((group, concept) => {
      if (group.some((member) => member.startsWith(word))) concepts.add(concept)
    })
  }
  const typos = new Set()
  const max = allowedTypos(word)
  if (max) {
    for (const known of index.vocabulary) {
      if (known !== word && !known.startsWith(word) && editDistance(word, known, max) <= max) typos.add(known)
    }
    // A misspelt concept word ("galri") means its concept too.
    for (const known of WORD_CONCEPTS.keys()) {
      if (known !== word && editDistance(word, known, max) <= max) {
        for (const concept of WORD_CONCEPTS.get(known)) concepts.add(concept)
      }
    }
  }
  return { word, concepts, typos }
}

// A word that names the kind of block ("görsel" for the Image components) puts
// that kind ahead of blocks that only mention the word.
function kindBonus(record, read) {
  if (record.categoryWords.some((known) => known === read.word || (read.word.length >= 3 && known.startsWith(read.word)))) return 30
  for (const concept of read.concepts) if (record.categoryConcepts.has(concept)) return 25
  return 0
}

function scoreWord(record, read) {
  const score = scoreOwnWord(record, read)
  return score > 0 ? score + kindBonus(record, read) : 0
}

function scoreOwnWord(record, read) {
  const { word } = read
  let score = 0
  for (const known of record.labelWords) {
    if (known === word) score = Math.max(score, 100)
    else if (known.startsWith(word)) score = Math.max(score, 70)
  }
  if (score < 50 && word.length >= 3 && record.labelText.includes(word)) score = 50
  if (score < 40) {
    for (const known of record.allWords) {
      if (known === word) score = Math.max(score, 40)
      else if (known.startsWith(word)) score = Math.max(score, 30)
    }
  }
  if (score < 45) {
    for (const concept of read.concepts) {
      if (record.labelConcepts.has(concept)) score = Math.max(score, 45)
      else if (record.concepts.has(concept)) score = Math.max(score, 35)
    }
  }
  if (score < 20 && word.length >= 3 && record.allText.includes(word)) score = 20
  if (score < 15) {
    for (const known of record.allWords) {
      if (read.typos.has(known)) { score = 15; break }
    }
  }
  return score
}

/**
 * Entries for a query, best first. `best` matches every word of the query;
 * `related` matches some of them, or shares a kind with the best ones.
 * `suggestion` is the query with a misspelt word corrected, or null.
 */
export function searchComponents(index, query, { relatedLimit = 12 } = {}) {
  const queryWords = words(query)
  if (!queryWords.length) return { best: [], related: [], suggestion: null }
  const reads = queryWords.map((word) => readWord(index, word))
  const folded = queryWords.join(' ')
  const best = []
  const partial = []
  for (const record of index.records) {
    const scores = reads.map((read) => scoreWord(record, read))
    const total = scores.reduce((sum, value) => sum + value, 0)
    if (!total) continue
    // The name begins with, or holds, the query as whole words: "form" lifts
    // "Contact form", not "Formula card" (which only starts with the letters).
    const spaced = ` ${record.labelText} `
    let bonus = 0
    if (record.labelText === folded) bonus = 120
    else if (spaced.startsWith(` ${folded} `)) bonus = 60
    else if (spaced.includes(` ${folded} `)) bonus = 30
    else if (record.labelText.startsWith(folded)) bonus = 10
    const item = { record, score: total + bonus }
    if (scores.every(Boolean)) best.push(item)
    else partial.push(item)
  }
  const order = (a, b) => b.score - a.score
  best.sort(order)
  partial.sort(order)

  // Related: the near misses, then more of the kinds the best results are.
  const seen = new Set(best.map((item) => item.record))
  const related = []
  const add = (record) => {
    if (related.length >= relatedLimit || seen.has(record)) return
    seen.add(record)
    related.push(record.entry)
  }
  partial.forEach((item) => add(item.record))
  const kinds = new Set(best.slice(0, 3).map((item) => item.record.entry.categoryId))
  for (const record of index.records) {
    if (kinds.has(record.entry.categoryId)) add(record)
  }

  // A word the library does not know but is a typo or two away from: offer
  // the corrected query.
  let suggestion = null
  const fixed = reads.map((read) => {
    const known = WORD_CONCEPTS.has(read.word) || index.vocabulary.some((item) => item.startsWith(read.word))
    if (known || !read.typos.size) return read.word
    let closest = read.word
    let distance = Infinity
    for (const candidate of read.typos) {
      const d = editDistance(read.word, candidate, 2)
      if (d < distance || (d === distance && candidate < closest)) { distance = d; closest = candidate }
    }
    return closest
  })
  if (fixed.join(' ') !== folded) suggestion = fixed.join(' ')

  return { best: best.map((item) => item.record.entry), related, suggestion }
}

// One shown character (a code point) folded: one letter for most, nothing
// for a combining accent, itself for anything else (an emoji).
function foldPiece(character) {
  return [...character.toLocaleLowerCase('tr')]
    .map((letter) => FOLD[letter] || letter)
    .join('')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/**
 * The shown text cut into pieces, `match` on the ones a query word finds
 * ("gorsel" marks "Görsel"), for highlighting a result's name.
 */
export function highlightParts(text, query) {
  const characters = [...String(text || '')]
  // Each code unit of the folded text, mapped back to the character it came
  // from: an emoji is two units of one character, an accent none.
  let folded = ''
  const from = []
  const pieces = characters.map((character, index) => {
    const piece = foldPiece(character)
    for (let i = 0; i < piece.length; i++) from.push(index)
    folded += piece
    return piece
  })
  const marks = new Array(characters.length).fill(false)
  for (const word of words(query)) {
    if (word.length < 2) continue
    for (let at = folded.indexOf(word); at !== -1; at = folded.indexOf(word, at + 1)) {
      for (let i = at; i < at + word.length; i++) marks[from[i]] = true
    }
  }
  // A combining accent goes with the letter before it.
  pieces.forEach((piece, index) => {
    if (!piece && index > 0) marks[index] = marks[index - 1]
  })
  const parts = []
  characters.forEach((character, index) => {
    const last = parts[parts.length - 1]
    if (last && last.match === marks[index]) last.text += character
    else parts.push({ text: character, match: marks[index] })
  })
  return parts
}
