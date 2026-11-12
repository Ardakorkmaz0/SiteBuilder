// Fonts a site carries inside itself, as @font-face rules with their files.
import { describe, expect, it } from 'vitest'
import { fontFaceRules, fontFaceStyleTag, fontFacesUsedBy, mergeFontFaces, safeFontFaces } from './fontFaces.js'

const OKUL = '@font-face{font-family:"Okul";src:url(data:font/woff2;base64,AAAA) format("woff2")}'
const YAZI = "@font-face{font-family:'Yazi';font-weight:700;src:url(data:font/woff2;base64,BBBB)}"

describe('the rules a site keeps', () => {
  it('are @font-face rules whose files are inside them, and nothing else', () => {
    const css = `${OKUL}body{color:red}@font-face{font-family:Bad;src:url(https://evil.example/f.woff2)}${YAZI}@font-face{font-family:X;src:url(data:font/woff2;base64,A)}</style><script>@import url(x.css);`

    expect(fontFaceRules(css).map((rule) => rule.family)).toEqual(['Okul', 'Yazi', 'X'])
    expect(safeFontFaces(css)).toBe(`${OKUL}\n${YAZI}\n@font-face{font-family:X;src:url(data:font/woff2;base64,A)}`)
    expect(safeFontFaces('@font-face{font-family:Y;src:url(data:font/woff2;base64,A)}</style>')).toBe('@font-face{font-family:Y;src:url(data:font/woff2;base64,A)}')
    expect(safeFontFaces(42)).toBe('')
  })

  it('are added to without being repeated', () => {
    expect(mergeFontFaces(OKUL, `${OKUL}\n${YAZI}`)).toBe(`${OKUL}\n${YAZI}`)
  })
})

describe('the rules a page carries', () => {
  const blocks = [{ styles: { fontFamily: "Okul, Georgia, serif" } }]

  it('are the ones for the families its blocks are written in', () => {
    expect(fontFacesUsedBy(`${OKUL}\n${YAZI}`, blocks)).toBe(OKUL)
    expect(fontFaceStyleTag({ fontFaces: `${OKUL}\n${YAZI}` }, { components: blocks })).toBe(`<style data-pwb-fonts>${OKUL}</style>`)
    expect(fontFaceStyleTag({}, { components: blocks })).toBe('')
  })
})
