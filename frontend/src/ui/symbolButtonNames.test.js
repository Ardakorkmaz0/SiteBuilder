// A button whose only content is a symbol (×, ‹, ↑, ⬆, «) is named by that
// symbol: a screen reader says "times" or "left-pointing angle", and a
// `title` does not help, because a button's own content wins over its title.
// Every such button says what it does in aria-label. This test finds the ones
// that do not, so a new ✕ cannot slip back in.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = path.resolve('src')

function sources(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sources(full)
    return /\.jsx$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : []
  })
}

describe('symbol-only buttons', () => {
  it('all carry a name', () => {
    const unnamed = []
    for (const file of sources(SRC)) {
      const text = fs.readFileSync(file, 'utf8')
      for (const match of text.matchAll(/>\s*([^\w\s{}<>]{1,3})\s*<\/button>/g)) {
        const start = text.lastIndexOf('<button', match.index)
        const opening = text.slice(start, match.index)
        if (/aria-label(ledby)?=/.test(opening)) continue
        const line = text.slice(0, start).split('\n').length
        unnamed.push(`${path.relative(SRC, file)}:${line} ${match[1]}`)
      }
    }
    expect(unnamed).toEqual([])
  })
})
