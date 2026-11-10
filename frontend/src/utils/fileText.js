// Read a text file from the user's disk the way a browser would open it.
//
// File.text() decodes every file as UTF-8. A page saved in another encoding
// (an old Turkish site in windows-1254, a Notepad "Unicode" file) came in with
// each non-English letter replaced by "�", and a linked file or project folder
// was then written back to disk that way.
//
// A file that is valid UTF-8 is read exactly as before. Only a file that is
// not gets a second look: its byte-order mark, the encoding it declares, and
// last the legacy encoding of the user's language.

const SNIFF_LENGTH = 1024

const BYTE_ORDER_MARKS = [
  { bytes: [0xef, 0xbb, 0xbf], encoding: 'utf-8' },
  { bytes: [0xff, 0xfe], encoding: 'utf-16le' },
  { bytes: [0xfe, 0xff], encoding: 'utf-16be' },
]

const META_CHARSET = /(<meta\b[^>]*?\bcharset\s*=\s*["']?\s*)([\w:.-]+)/i
const CSS_CHARSET = /(@charset\s+["'])([^"']+)/i

function markedEncoding(bytes) {
  const mark = BYTE_ORDER_MARKS.find((candidate) => (
    candidate.bytes.every((byte, index) => bytes[index] === byte)
  ))
  return mark ? mark.encoding : ''
}

function decoderFor(label) {
  try {
    return new TextDecoder(label)
  } catch {
    return null
  }
}

function declaredEncoding(bytes) {
  // Every encoding a page can declare this way writes the declaration itself
  // in ASCII, so reading the first bytes as Latin-1 finds it.
  const start = new TextDecoder('latin1').decode(bytes.subarray(0, SNIFF_LENGTH))
  const label = (META_CHARSET.exec(start) || CSS_CHARSET.exec(start))?.[2] || ''
  const decoder = label ? decoderFor(label) : null
  return decoder ? decoder.encoding : ''
}

// What a browser falls back to for a page that names no encoding: the legacy
// encoding of the reader's language. Windows-1254 is Windows-1252 with six
// letters swapped for the Turkish ones.
function legacyEncoding() {
  const languages = typeof navigator !== 'undefined'
    ? (navigator.languages?.length ? navigator.languages : [navigator.language])
    : []
  return languages.some((language) => /^tr\b/i.test(language || '')) ? 'windows-1254' : 'windows-1252'
}

// The text is UTF-8 from here on (everything the app saves, exports and writes
// back to disk is), so a declaration that still named the old encoding would
// make a browser misread the written file.
function declareUtf8(text) {
  const start = text.slice(0, SNIFF_LENGTH)
    .replace(META_CHARSET, '$1utf-8')
    .replace(CSS_CHARSET, '$1utf-8')
  return start + text.slice(SNIFF_LENGTH)
}

// { text, encoding } for a file's bytes. `fallback` is the encoding to assume
// for a file that is not UTF-8 and declares nothing: a stylesheet or script
// takes the encoding of the page that links it.
export function decodeText(bytes, fallback = '') {
  const marked = markedEncoding(bytes)
  if (marked) return { text: new TextDecoder(marked).decode(bytes), encoding: marked }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' }
  } catch {
    // Not UTF-8: look further.
  }
  const encoding = declaredEncoding(bytes) || (fallback && decoderFor(fallback)?.encoding) || legacyEncoding()
  // A file that says it is UTF-8 and is not quite: read what can be read.
  if (encoding === 'utf-8') return { text: new TextDecoder().decode(bytes), encoding }
  return { text: declareUtf8(new TextDecoder(encoding).decode(bytes)), encoding }
}

export async function readFileDecoded(file, fallback = '') {
  if (typeof file?.arrayBuffer !== 'function') return { text: await file.text(), encoding: 'utf-8' }
  return decodeText(new Uint8Array(await file.arrayBuffer()), fallback)
}

export async function readFileText(file, fallback = '') {
  return (await readFileDecoded(file, fallback)).text
}
