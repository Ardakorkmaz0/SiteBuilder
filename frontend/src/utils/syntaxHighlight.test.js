// Colours for code: they never change the text, and the text cannot get out of
// its spans as markup.
import { describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { HIGHLIGHT_LIMIT, highlightCode } from './syntaxHighlight.js'

const dom = new JSDOM('<!doctype html><body></body>')
function read(html) {
  const box = dom.window.document.createElement('pre')
  box.innerHTML = html
  return box
}
const kinds = (html) => [...read(html).querySelectorAll('span')].map((el) => [el.className.replace('code-t-', ''), el.textContent])

describe('the text underneath', () => {
  it.each([
    ['a whole page', 'html', '<!DOCTYPE html>\n<html lang="en"><head><style>a{color:#fff}</style></head><body class=x>\n<!-- note --><p data-a=\'1\'>Hi & <b>bye</b></p><script>const a = "<b>" // c\n</script></body></html>'],
    ['broken html', 'html', '<div class="x <p> 1 < 2 <!-- open <script>let a = 1'],
    ['nothing but text', 'html', 'plain & simple'],
    ['nothing', 'html', ''],
    ['an unclosed style', 'html', '<style>a{color:red'],
    ['css', 'css', '/* a */ @media (min-width: 10px) { .a > b { color: #fff; margin: 1px 2em; content: "}" } }'],
    ['broken css', 'css', 'a{{color:::;}}} /* open'],
    ['js', 'js', 'async function f(a) { return `x${a}` + \'y\' + 0x1f /* c */ } // end\nf(1)'],
    ['broken js', 'js', 'const s = "open\nlet t = `open'],
  ])('stays as it is: %s', (name, lang, code) => {
    expect(read(highlightCode(code, lang)).textContent).toBe(code)
  })

  it('takes nothing as markup', () => {
    const box = read(highlightCode('<img src=x onerror="alert(1)"><script>alert(1)</script>', 'html'))
    expect(box.querySelector('img')).toBeNull()
    expect(box.querySelector('script')).toBeNull()
    expect(read(highlightCode('"<img src=x>"', 'js')).querySelector('img')).toBeNull()
    expect(read(highlightCode('a{content:"<img>"}', 'css')).querySelector('img')).toBeNull()
    // Between the coloured words too.
    expect(read(highlightCode('<img src=x> const a', 'js')).querySelector('img')).toBeNull()
    expect(read(highlightCode('a <img src=x> b', 'js')).querySelector('img')).toBeNull()
    expect(read(highlightCode('a{b:<img src=x> 1px}', 'css')).querySelector('img')).toBeNull()
  })

  it('is left plain past the limit', () => {
    const long = `<p>${'x'.repeat(HIGHLIGHT_LIMIT)}</p>`
    expect(read(highlightCode(long, 'html')).querySelectorAll('span')).toHaveLength(0)
    expect(read(highlightCode(long, 'html')).textContent).toBe(long)
  })
})

describe('what gets a colour', () => {
  it('in html: tags, attributes, values, comments, the doctype', () => {
    expect(kinds(highlightCode('<!doctype html><!-- c --><a href="x">t</a>'))).toEqual([
      ['keyword', '<!doctype html>'], ['comment', '<!-- c -->'], ['tag', 'a'], ['attr', 'href'], ['string', '"x"'], ['tag', 'a'],
    ])
  })

  it('in html: what a style or a script holds, as its own language', () => {
    expect(kinds(highlightCode('<style>a{color:#fff}</style>'))).toEqual([
      ['tag', 'style'], ['tag', 'a'], ['property', 'color'], ['number', '#fff'], ['tag', 'style'],
    ])
    expect(kinds(highlightCode('<script>const a = 1</script>'))).toEqual([
      ['tag', 'script'], ['keyword', 'const'], ['number', '1'], ['tag', 'script'],
    ])
    // A tag in a script's string is the script's.
    expect(kinds(highlightCode('<script>"<b>"</script>')).map(([kind]) => kind)).toEqual(['tag', 'string', 'tag'])
  })

  it('in css: selectors, at-rules, properties, values, comments', () => {
    expect(kinds(highlightCode('/* c */@media print{a{margin:1px}}', 'css'))).toEqual([
      ['comment', '/* c */'], ['keyword', '@media print'], ['tag', 'a'], ['property', 'margin'], ['number', '1px'],
    ])
  })

  it('in js: keywords, strings, numbers, calls, comments', () => {
    expect(kinds(highlightCode('const a = f("b", 2) // c', 'js'))).toEqual([
      ['keyword', 'const'], ['function', 'f'], ['string', '"b"'], ['number', '2'], ['comment', '// c'],
    ])
  })
})

describe('a long file', () => {
  it('runs what is never closed to its end, as a browser reads it', () => {
    expect(kinds(highlightCode('a{} /*x/*x', 'css'))).toContainEqual(['comment', '/*x/*x'])
    expect(kinds(highlightCode('a /*x/*x', 'js'))).toEqual([['comment', '/*x/*x']])
    expect(kinds(highlightCode('<p>a</p><!--x<!--x', 'html'))).toContainEqual(['comment', '<!--x<!--x'])
    expect(kinds(highlightCode('a = "x\\"y', 'js'))).toContainEqual(['string', '"x\\"y'])
  })

  it('does not take long on what is never closed', () => {
    for (const [code, lang] of [
      ['/*x'.repeat(66000), 'css'],
      ['/*x'.repeat(66000), 'js'],
      ['<!--x'.repeat(39000), 'html'],
      ['<!doctype '.repeat(19000), 'html'],
      ['"a\\'.repeat(66000), 'js'],
      ['`a\\'.repeat(66000), 'js'],
      ['a{b:"c\\'.repeat(28000), 'css'],
    ]) {
      const started = performance.now()
      highlightCode(code, lang)
      expect(performance.now() - started).toBeLessThan(700)
    }
  })

  it('does not take long, however it is broken', () => {
    const started = performance.now()
    for (const [code, lang] of [
      ['<div class="'.repeat(15000), 'html'],
      ['<a '.repeat(50000), 'html'],
      ['a{'.repeat(80000), 'css'],
      ['"'.repeat(150000), 'js'],
      ['/*'.repeat(80000), 'js'],
    ]) highlightCode(code, lang)
    expect(performance.now() - started).toBeLessThan(3000)
  })
})
