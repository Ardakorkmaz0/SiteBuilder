// The palette's core library comes in Turkish too: every readable phrase in
// it is either translated or deliberately the same in both languages.
import { describe, expect, it } from 'vitest'
import { HTML_BLOCKS, HTML_VARIANTS } from './htmlVariants.js'
import { CORE_SNIPPET_SAME, CORE_SNIPPET_TR, turkishSnippet } from './coreSnippetsTr.js'
import { localizedHtml } from '../components/editor/paletteData.js'

const READABLE = ['placeholder', 'alt', 'title', 'aria-label', 'value']

function phrases(html) {
  const out = []
  const template = document.createElement('template')
  template.innerHTML = html
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3 && /[A-Za-z]{2}/.test(child.textContent)) out.push(child.textContent.trim())
      if (child.nodeType === 1 && !['STYLE', 'SCRIPT'].includes(child.tagName)) {
        for (const name of READABLE) {
          const value = child.getAttribute(name)
          if (value && /[A-Za-z]{2}/.test(value)) out.push(value.trim())
        }
        walk(child)
      }
    }
  }
  walk(template.content)
  return out
}

const coreSnippets = [
  ...Object.values(HTML_VARIANTS).flat().filter((v) => !v.htmlTr),
  ...HTML_BLOCKS.filter((b) => !b.htmlTr),
]

describe('the core palette library in Turkish', () => {
  it('leaves no English phrase behind', () => {
    const missing = new Set()
    for (const snippet of coreSnippets) {
      for (const phrase of phrases(snippet.html)) {
        if (!CORE_SNIPPET_TR[phrase] && !CORE_SNIPPET_SAME.has(phrase)) missing.add(phrase)
      }
    }
    expect([...missing]).toEqual([])
  })

  it('translates words and readable attributes, and nothing else', () => {
    const html = '<div style="text-transform:uppercase"><span>Introducing</span><input placeholder="Your email" value="x" data-note="Save"><a href="#">Read more</a> <b>Acme</b></div>'
    const out = turkishSnippet(html)
    expect(out).toContain('<span>Karşınızda</span>')
    expect(out).toContain('placeholder="E-postanız"')
    expect(out).toContain('>Devamını oku</a>')
    expect(out).toContain('data-note="Save"')
    expect(out).toContain('<b>Acme</b>')
    expect(out).toContain('style="text-transform:uppercase"')
  })

  it('reaches what the palette drops on a Turkish page', () => {
    const display = HTML_VARIANTS.heading.find((v) => v.id === 'display')
    expect(localizedHtml(display, 'tr')).toContain('Güçlü bir vitrin başlığı')
    expect(localizedHtml(display, 'en')).toBe(display.html)
    const plain = '<hr style="border:0">'
    expect(turkishSnippet(plain)).toBe(plain)
  })
})
