import { describe, expect, it } from 'vitest'
import { readElementMultilineText, writeElementMultilineText } from './domMultilineText.js'

const element = (html) => {
  const box = document.createElement('div')
  box.innerHTML = html
  return box.firstElementChild
}

const write = (html, text) => {
  const el = element(html)
  writeElementMultilineText(el, text)
  return el
}

describe('writing copy back into an element', () => {
  it('writes plain copy and turns newlines into line breaks', () => {
    expect(write('<p>Old</p>', 'One\nTwo').innerHTML).toBe('One<br>Two')
    expect(write('<p>Old</p>', '<script>x</script>').innerHTML).toBe('&lt;script&gt;x&lt;/script&gt;')
  })

  it('keeps a subscript when a letter beside it is corrected', () => {
    expect(write('<span>f(x<sub>n</sub>)</span>', 'g(xn)').innerHTML).toBe('g(x<sub>n</sub>)')
  })

  it('writes a change inside the formatted part into that part', () => {
    expect(write('<span>f(x<sub>n</sub>)</span>', 'f(xk)').innerHTML).toBe('f(x<sub>k</sub>)')
  })

  it('keeps an empty styled blank between the words', () => {
    const blank = '<span style="border-bottom:2px solid"></span>'
    expect(write(`<p>Halves with every ${blank}, so</p>`, 'Halves with each , so').innerHTML)
      .toBe(`Halves with each ${blank}, so`)
  })

  it('keeps a bold lead when the rest of the sentence changes', () => {
    expect(write('<p><b>Soar:</b> rules fire in cycles.</p>', 'Soar: rules run in cycles.').innerHTML)
      .toBe('<b>Soar:</b> rules run in cycles.')
  })

  it('adds a line break inside formatted copy', () => {
    expect(write('<p><b>Lead</b> rest</p>', 'Lead\nrest').innerHTML).toBe('<b>Lead</b><br>rest')
  })

  it('removes copy that runs across a formatted part', () => {
    const el = write('<p>a <i>bc</i> d</p>', 'a d')
    expect(readElementMultilineText(el)).toBe('a d')
    expect(el.innerHTML).toBe('a <i></i>d')
  })

  it('reads back exactly what was written', () => {
    for (const [html, text] of [
      ['<p>x<sup>2</sup> + y</p>', 'x2 + 2y'],
      ['<p>a<br>b <b>c</b></p>', 'a\nb\nc!'],
      ['<p><b>all</b> of it</p>', 'something new'],
    ]) {
      expect(readElementMultilineText(write(html, text)), html).toBe(text)
    }
  })
})

describe('writing copy back into preformatted text', () => {
  it('keeps newlines as text inside <pre>', () => {
    expect(write('<pre>$ run\nok</pre>', '$ run\nok!').innerHTML).toBe('$ run\nok!')
    expect(write('<pre><b>$</b> run\nok</pre>', '$ run\nfine').innerHTML).toBe('<b>$</b> run\nfine')
  })
})
