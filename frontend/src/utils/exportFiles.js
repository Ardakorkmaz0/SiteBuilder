function fileMap(files) {
  return new Map((files || []).map((file) => [file.name, String(file.content || '')]))
}

function safeStyleContent(value) {
  return String(value || '').replace(/<\/\s*style/gi, (match) => match.replace('/', '\\/'))
}

function safeScriptContent(value) {
  return String(value || '').replace(/<\/\s*script/gi, (match) => match.replace('/', '\\/'))
}

// Source workspace HTML belongs to a readable, multi-file project. The visual
// editor, however, stores one portable document. Inline only the four generated
// project references so an edited page keeps working after it is applied.
export function inlineProjectHtml(html, files) {
  const assets = fileMap(files)
  let output = String(html || '')

  output = output.replace(
    /<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']styles\.css["'])[^>]*\/?\s*>/i,
    () => `<style data-pwb-project-styles>\n${safeStyleContent(assets.get('styles.css'))}\n</style>`,
  )
  output = output.replace(
    /<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']custom\.css["'])[^>]*\/?\s*>/i,
    () => `<style data-pwb-custom-styles>\n${safeStyleContent(assets.get('custom.css'))}\n</style>`,
  )
  output = output.replace(
    /<script\b(?=[^>]*\bsrc=["']runtime\.js["'])[^>]*>\s*<\/script\s*>/i,
    () => `<script data-pwb-project-runtime>\n${safeScriptContent(assets.get('runtime.js'))}\n</script>`,
  )
  output = output.replace(
    /<script\b(?=[^>]*\bsrc=["']custom\.js["'])[^>]*>\s*<\/script\s*>/i,
    () => `<script data-pwb-custom-script>\n${safeScriptContent(assets.get('custom.js'))}\n</script>`,
  )

  return output
}

function unusedTokenPrefix(source, prefix) {
  while (source.includes(prefix)) prefix += '_'
  return prefix
}

function minifyCss(css) {
  const source = String(css || '')
  const prefix = unusedTokenPrefix(source, '___PWB_CSS_STRING_')
  const strings = []
  const protectedCss = source.replace(
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g,
    (value) => {
      const token = `${prefix}${strings.length}___`
      strings.push(value)
      return token
    },
  )

  let output = protectedCss
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim()

  strings.forEach((value, index) => {
    output = output.replace(`${prefix}${index}___`, () => value)
  })
  return output
}

// Conservative production export: CSS and document whitespace are compacted,
// while scripts, preformatted text and textareas stay byte-for-byte intact.
export function minifyGeneratedHtml(html) {
  const source = String(html || '')
  const prefix = unusedTokenPrefix(source, '___PWB_HTML_BLOCK_')
  const protectedBlocks = []
  const protect = (value) => {
    const token = `${prefix}${protectedBlocks.length}___`
    protectedBlocks.push(value)
    return token
  }
  let output = source.replace(
    /<(script|pre|textarea|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    (value, tag) => protect(tag.toLowerCase() === 'style'
      ? value.replace(/^(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)$/i, (_, open, css, close) => `${open}${minifyCss(css)}${close}`)
      : value),
  )

  // Protect complete tags before compacting text. Attribute values can contain
  // meaningful spaces, newlines, > characters and comment-looking strings.
  output = output.replace(/<!--[\s\S]*?-->|<(?:"[^"]*"|'[^']*'|[^'">])*>/g, (tag) => (
    tag.startsWith('<!--') && !/^<!--\[if/i.test(tag) ? '' : protect(tag)
  ))
  output = output
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/>\s+</g, '> <')
    .trim()

  protectedBlocks.forEach((value, index) => {
    output = output.replace(`${prefix}${index}___`, () => value)
  })
  return output
}
