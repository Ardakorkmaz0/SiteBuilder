// Formatting inside a text block, kept as runs beside its plain text.
import { describe, expect, it } from 'vitest'
import { richHtml, richPiece, richPlainText, richRuns } from './richText.js'

const PNG = 'data:image/png;base64,iVBORw0KGgo='

describe('the runs of a block', () => {
  it("apply while they spell the block's text, and not once the text was changed", () => {
    const rich = [{ t: 'Fresh ', b: '700' }, { t: 'bread' }]

    expect(richPlainText(rich)).toBe('Fresh bread')
    expect(richRuns({ text: 'Fresh bread', rich })).toEqual(rich)
    expect(richRuns({ text: 'Fresh rye', rich })).toBeNull()
    expect(richRuns({ text: 'x' })).toBeNull()
  })
})

describe('a run as it is drawn', () => {
  it('keeps the marks it may have, each checked', () => {
    expect(richPiece({ t: 'a', b: '700', i: 'italic', u: 'underline', c: 'red', bg: '#fff', f: "'Fira Sans'", z: '18px', v: 'super' }).css).toEqual([
      ['font-weight', '700'], ['font-style', 'italic'], ['text-decoration', 'underline'], ['color', 'red'],
      ['background-color', '#fff'], ['font-family', "'Fira Sans'"], ['font-size', '18px'], ['vertical-align', 'super'],
    ])
    expect(richPiece({ t: 'a', b: 'heavy', c: 'red;background:url(x)', f: 'x<y', z: '18em', v: 'middle' }).css).toEqual([])
  })

  it('takes a picture only from an image, with the room it took in its line', () => {
    expect(richPiece({ img: PNG, w: 13, h: 24, va: -8.3, ml: -1.2, mr: 0.4 })).toMatchObject({ kind: 'image', width: 13, height: 24, shift: -8.3, marginLeft: -1.2, marginRight: 0.4 })
    expect(richPiece({ img: PNG, w: 13, h: 24 })).toMatchObject({ marginLeft: -1, marginRight: -1 })
    expect(richPiece({ img: 'javascript:alert(1)', w: 10, h: 10 })).toBeNull()
  })
})

describe('the runs on a published page', () => {
  it('are escaped HTML, a link around a run included', () => {
    const html = richHtml({
      text: 'a <b> & c',
      rich: [{ t: 'a ' }, { t: '<b>', b: '700', href: '#x' }, { t: ' & c', c: 'red' }],
    })

    expect(html).toBe('a <a href="#x" style="color:inherit"><span style="font-weight:700">&lt;b&gt;</span></a><span style="color:red"> &amp; c</span>')
  })

  it('draw an inline picture at its size and place', () => {
    expect(richHtml({ text: '', rich: [{ img: PNG, w: 13, h: 24, va: -8, ml: -1, mr: 0.5, alt: 'y' }] }))
      .toBe(`<img src="${PNG}" alt="y" style="display:inline-block;width:13px;height:24px;vertical-align:-8px;max-width:none;margin:0 0.5px 0 -1px">`)
  })

  it('are nothing for a block without runs', () => {
    expect(richHtml({ text: 'Plain' })).toBe('')
  })
})
