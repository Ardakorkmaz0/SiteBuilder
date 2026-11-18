import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const minBytes = 20 * 1024
const styleSignals = {
  hover: /:hover\b/i,
  transition: /\btransition(?:-[\w-]+)?\s*:/i,
  keyframes: /@(?:-webkit-)?keyframes\b/i,
}
const scriptSignals = {
  keyboard: /\b(?:keydown|keyup|keypress)\b/i,
  storage: /\blocalStorage\b/i,
  observer: /\bIntersectionObserver\b/i,
  raf: /\brequestAnimationFrame\b/i,
}

function signals(html) {
  const { JSDOM } = createRequire(import.meta.url)('jsdom')
  const fragment = JSDOM.fragment(html)
  const styles = []
  const scripts = []
  for (const node of fragment.querySelectorAll('*')) {
    if (node.localName === 'style') styles.push(node.textContent)
    if (node.localName === 'script') scripts.push(node.textContent)
    for (const attr of node.attributes) {
      if (attr.name === 'style') styles.push(attr.value)
      if (/^on/i.test(attr.name)) scripts.push(attr.value)
    }
  }
  const matches = (lines, patterns) => {
    const source = lines.join('\n')
    return Object.keys(patterns).filter((key) => patterns[key].test(source))
  }
  return [...matches(styles, styleSignals), ...matches(scripts, scriptSignals),
    ...['details', 'canvas', 'audio', 'video', 'form', 'iframe', 'script[src]'].filter((selector) => fragment.querySelector(selector))].sort()
}

function* htmlFiles(dir) {
  for (const name of fs.readdirSync(dir).sort()) {
    const file = path.join(dir, name)
    const stat = fs.lstatSync(file)
    if (stat.isDirectory()) yield* htmlFiles(file)
    if (stat.isFile() && name.endsWith('.html') && stat.size > minBytes) yield file
  }
}

export function fidelityInventory(input) {
  if (!input?.trim()) throw new Error('Set FIDELITY_EXTRA to local lesson folders separated by the platform path delimiter.')
  if (process.env.CI) throw new Error('FIDELITY_EXTRA is local only.')
  const roots = input.split(path.delimiter).filter(Boolean).map((folder) => path.resolve(folder))
  const byDigest = new Map()
  for (const [root, dir] of roots.entries()) {
    for (const file of htmlFiles(dir)) {
      const bytes = fs.readFileSync(file)
      const sha256 = createHash('sha256').update(bytes).digest('hex')
      const occurrence = { root, path: path.relative(dir, file).split(path.sep).join('/') }
      if (byDigest.has(sha256)) byDigest.get(sha256).paths.push(occurrence)
      else byDigest.set(sha256, { sha256, bytes: bytes.length, paths: [occurrence], signals: signals(bytes.toString('utf8')) })
    }
  }
  const entries = [...byDigest.values()]
  const counts = {}
  for (const entry of entries) for (const signal of entry.signals) counts[signal] = (counts[signal] || 0) + 1
  return { version: 1, minBytesExclusive: minBytes, roots, entries, counts }
}

export function extraFidelityPages(input) {
  if (!input) return []
  const { roots, entries } = fidelityInventory(input)
  return entries.map(({ sha256, paths: [first] }) => ({
    name: 'extra/' + sha256, file: path.join(roots[first.root], first.path), checked: false,
  }))
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  console.log(JSON.stringify(fidelityInventory(process.env.FIDELITY_EXTRA), null, 2))
}
