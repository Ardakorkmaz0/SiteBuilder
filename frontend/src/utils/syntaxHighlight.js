// Colours for code in the source views: the code as HTML, each kind of word in a
// span with a class. Only for looking at: the text underneath never changes, and
// a mistake here is a wrong colour, so the rules stay simple.

const esc = (text) => text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const span = (kind, text) => (text ? `<span class="code-t-${kind}">${esc(text)}</span>` : '')

// Past this a keystroke would wait for the colours.
export const HIGHLIGHT_LIMIT = 200_000

const STRING = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/.source
const JS_KEYWORDS = 'async|await|break|case|catch|class|const|continue|default|delete|do|else|export|extends|false|finally|for|from|function|if|import|in|instanceof|let|new|null|of|return|static|super|switch|this|throw|true|try|typeof|undefined|var|void|while|yield'
const JS = new RegExp(
  `(/\\*[\\s\\S]*?\\*/|//[^\\n]*)|(${STRING}|\`(?:[^\`\\\\]|\\\\[\\s\\S])*\`)|\\b(${JS_KEYWORDS})\\b|\\b(0x[\\da-fA-F]+|\\d[\\d_.]*)\\b|\\b([A-Za-z_$][\\w$]*)(?=\\s*\\()`,
  'g',
)
const CSS_VALUE = new RegExp(`(${STRING})|(#[0-9a-fA-F]{3,8}\\b)|(-?\\d*\\.?\\d+(?:%|[a-zA-Z]+)?)`, 'g')
const JS_KINDS = ['comment', 'string', 'keyword', 'number', 'function']
const VALUE_KINDS = ['string', 'number', 'number']

// `kinds` names the regular expression's groups, in order.
function paint(code, pattern, kinds) {
  let out = ''
  let at = 0
  for (const match of code.matchAll(pattern)) {
    out += esc(code.slice(at, match.index))
    const group = kinds.findIndex((_, i) => match[i + 1] !== undefined)
    out += group === -1 ? esc(match[0]) : span(kinds[group], match[0])
    at = match.index + match[0].length
  }
  return out + esc(code.slice(at))
}

function paintDeclarations(text) {
  return text.split(/(;)/).map((part) => {
    const colon = part.indexOf(':')
    if (colon === -1) return esc(part)
    return span('property', part.slice(0, colon)) + ':' + paint(part.slice(colon + 1), CSS_VALUE, VALUE_KINDS)
  }).join('')
}

function paintCss(code) {
  return code.split(/(\/\*[\s\S]*?\*\/)/).map((part, index) => {
    if (index % 2) return span('comment', part)
    const pieces = part.split(/([{}])/)
    return pieces.map((piece, i) => {
      if (piece === '{' || piece === '}') return piece
      return pieces[i + 1] === '{' ? span(piece.trim().startsWith('@') ? 'keyword' : 'tag', piece) : paintDeclarations(piece)
    }).join('')
  }).join('')
}

const paintJs = (code) => paint(code, JS, JS_KINDS)
const ATTRIBUTE = /([^\s=/"'<>]+)|("[^"]*"|'[^']*')/g
const paintAttributes = (text) => paint(text, ATTRIBUTE, ['attr', 'string'])
const TAG = /<!--[\s\S]*?-->|<!doctype[^>]*>|(<\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)(>?)/gi

function paintHtml(code) {
  const lower = code.toLowerCase()
  let out = ''
  let at = 0
  TAG.lastIndex = 0
  for (let match = TAG.exec(code); match; match = TAG.exec(code)) {
    out += esc(code.slice(at, match.index))
    at = match.index + match[0].length
    if (!match[2]) {
      out += span(match[0].startsWith('<!--') ? 'comment' : 'keyword', match[0])
      continue
    }
    out += esc(match[1]) + span('tag', match[2]) + paintAttributes(match[3]) + esc(match[4])
    const name = match[2].toLowerCase()
    // What a script or a style holds is another language, up to its closing tag.
    if (match[1] === '<' && (name === 'script' || name === 'style')) {
      const end = lower.indexOf(`</${name}`, at)
      const stop = end === -1 ? code.length : end
      out += (name === 'style' ? paintCss : paintJs)(code.slice(at, stop))
      at = stop
      TAG.lastIndex = stop
    }
  }
  return out + esc(code.slice(at))
}

export function highlightCode(code, lang = 'html') {
  const text = String(code ?? '')
  if (text.length > HIGHLIGHT_LIMIT) return esc(text)
  if (lang === 'css') return paintCss(text)
  if (lang === 'js') return paintJs(text)
  return paintHtml(text)
}
