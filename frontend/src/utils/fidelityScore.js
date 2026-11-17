// How closely a converted page draws what the original page drew: the
// conversion fidelity bench (e2e/conversion-fidelity.spec.js) reads every
// word and picture of both pages in a browser, at the same width, and this
// pairs them up and says how far each moved.
//
// A word is matched by its text together with its neighbours first (the
// same three words in a row are nearly always the same place in the text),
// then by its text alone; among candidates the nearest wins. Both passes are
// greedy by distance, which flatters a page a little where a word repeats,
// never the other way round.

// Words on the two sides closer than this (in px) count as in place.
export const NEAR = 4
// Further than this a word is out of place, whatever the reason.
export const FAR = 16

const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))

function keyed(words, keyOf) {
  const out = new Map()
  words.forEach((word, index) => {
    const key = keyOf(words, index)
    if (key === null) return
    if (!out.has(key)) out.set(key, [])
    out.get(key).push(index)
  })
  return out
}

// `run` is the run of text a word came from (one text node): its neighbours
// are only the words of the same run.
const triple = (words, i) => {
  const before = words[i - 1]?.run === words[i].run ? words[i - 1].t : ''
  const after = words[i + 1]?.run === words[i].run ? words[i + 1].t : ''
  return before || after ? `${before}\u0000${words[i].t}\u0000${after}` : null
}
const single = (words, i) => words[i].t

function pairUp(from, to, keyOf, taken, pairs) {
  const there = keyed(to, keyOf)
  const here = keyed(from, keyOf)
  const candidates = []
  for (const [key, mine] of here) {
    const theirs = there.get(key)
    if (!theirs) continue
    for (const i of mine) {
      if (taken.from.has(i)) continue
      for (const j of theirs) if (!taken.to.has(j)) candidates.push([distance(from[i], to[j]), i, j])
    }
  }
  candidates.sort((a, b) => a[0] - b[0])
  for (const [, i, j] of candidates) {
    if (taken.from.has(i) || taken.to.has(j)) continue
    taken.from.add(i)
    taken.to.add(j)
    pairs.push([i, j])
  }
}

const percentile = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0)
const round = (n) => Math.round(n * 1000) / 1000

// `original` and `converted`: { words: [{ t, x, y, w, h, run }], images:
// [{ src, x, y, w, h }] } read at the same width. Shares are of the
// original's words and pictures.
export function scoreFidelity(original, converted, { samples = 5 } = {}) {
  const from = original?.words || []
  const to = converted?.words || []
  const taken = { from: new Set(), to: new Set() }
  const pairs = []
  pairUp(from, to, triple, taken, pairs)
  pairUp(from, to, single, taken, pairs)

  const moved = pairs.map(([i, j]) => ({ word: from[i], by: distance(from[i], to[j]), at: to[j] }))
  const sizeKept = ({ word, at }) => Math.abs(word.w - at.w) <= Math.max(2, word.w * 0.1)
  const near = moved.filter((m) => m.by <= NEAR && sizeKept(m)).length
  const close = moved.filter((m) => m.by <= FAR).length
  const by = moved.map((m) => m.by).sort((a, b) => a - b)

  const images = original?.images || []
  const theirImages = [...(converted?.images || [])]
  let imagesNear = 0
  for (const image of images) {
    const index = theirImages.findIndex((other) => other.src === image.src && distance(image, other) <= FAR)
    if (index >= 0) {
      imagesNear += 1
      theirImages.splice(index, 1)
    }
  }

  const total = from.length || 1
  return {
    words: from.length,
    found: round(pairs.length / total),
    near: round(near / total),
    close: round(close / total),
    median: percentile(by, 0.5),
    p95: percentile(by, 0.95),
    images: images.length,
    imagesNear: images.length ? round(imagesNear / images.length) : 1,
    missing: from.filter((_, i) => !taken.from.has(i)).slice(0, samples).map((w) => w.t),
    worst: moved.sort((a, b) => b.by - a.by).slice(0, samples).filter((m) => m.by > FAR)
      .map((m) => ({ t: m.word.t, from: [Math.round(m.word.x), Math.round(m.word.y)], to: [Math.round(m.at.x), Math.round(m.at.y)] })),
  }
}
