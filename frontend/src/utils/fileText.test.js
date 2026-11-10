import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeText, readFileDecoded, readFileText } from './fileText.js'

const bytes = (...values) => new Uint8Array(values.flat())
const ascii = (text) => [...text].map((letter) => letter.charCodeAt(0))
const fileOf = (content) => ({ arrayBuffer: async () => content.buffer, text: async () => 'File.text() was used' })

// "ş", "ı", "ğ" and "İ" in each encoding, written out by hand.
const TURKISH_1254 = [0xfe, 0xfd, 0xf0, 0xdd]
const TURKISH_UTF8 = [0xc5, 0x9f, 0xc4, 0xb1, 0xc4, 0x9f, 0xc4, 0xb0]

afterEach(() => vi.unstubAllGlobals())

describe('decodeText', () => {
  it('reads UTF-8 as it always did', () => {
    expect(decodeText(bytes(ascii('<p>'), TURKISH_UTF8, ascii('</p>'))))
      .toEqual({ text: '<p>şığİ</p>', encoding: 'utf-8' })
  })

  it('drops the byte-order mark of a UTF-8 file', () => {
    expect(decodeText(bytes(0xef, 0xbb, 0xbf, ascii('<p>'), TURKISH_UTF8)).text).toBe('<p>şığİ')
  })

  it('trusts valid UTF-8 over a declaration that names another encoding', () => {
    const page = bytes(ascii('<meta charset="windows-1254"><p>'), TURKISH_UTF8)
    expect(decodeText(page)).toEqual({ text: '<meta charset="windows-1254"><p>şığİ', encoding: 'utf-8' })
  })

  it('reads a page in the encoding it declares, and declares UTF-8 from then on', () => {
    const page = bytes(ascii('<html><head><meta charset="windows-1254"></head><p>'), TURKISH_1254, ascii('</p>'))
    expect(decodeText(page)).toEqual({
      text: '<html><head><meta charset="utf-8"></head><p>şığİ</p>',
      encoding: 'windows-1254',
    })
  })

  it('understands the older way of declaring an encoding', () => {
    const page = bytes(
      ascii('<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-9"><p>'),
      TURKISH_1254,
    )
    expect(decodeText(page)).toEqual({
      text: '<meta http-equiv="Content-Type" content="text/html; charset=utf-8"><p>şığİ',
      encoding: 'windows-1254',
    })
  })

  it('reads a stylesheet in the encoding it declares', () => {
    const sheet = bytes(ascii('@charset "windows-1254";\n.a::after{content:"'), TURKISH_1254, ascii('"}'))
    expect(decodeText(sheet).text).toBe('@charset "utf-8";\n.a::after{content:"şığİ"}')
  })

  it('reads a Notepad "Unicode" file, in either byte order', () => {
    // "<p>ş</p>" as UTF-16: "ş" is U+015F.
    const little = bytes(0xff, 0xfe, 0x3c, 0, 0x70, 0, 0x3e, 0, 0x5f, 0x01, 0x3c, 0, 0x2f, 0, 0x70, 0, 0x3e, 0)
    const big = bytes(0xfe, 0xff, 0, 0x3c, 0, 0x70, 0, 0x3e, 0x01, 0x5f, 0, 0x3c, 0, 0x2f, 0, 0x70, 0, 0x3e)
    expect(decodeText(little)).toEqual({ text: '<p>ş</p>', encoding: 'utf-16le' })
    expect(decodeText(big)).toEqual({ text: '<p>ş</p>', encoding: 'utf-16be' })
  })

  it('takes the encoding of the page for a linked file that declares none', () => {
    const script = bytes(ascii('alert("'), TURKISH_1254, ascii('")'))
    expect(decodeText(script, 'windows-1254')).toEqual({ text: 'alert("şığİ")', encoding: 'windows-1254' })
    // Greek: the same four bytes are other letters there.
    expect(decodeText(script, 'windows-1253').text).toBe('alert("ώύπέ")')
  })

  it('falls back to the Turkish encoding for a Turkish reader, the Western one otherwise', () => {
    const page = bytes(ascii('<p>'), TURKISH_1254)
    vi.stubGlobal('navigator', { languages: ['tr-TR', 'en'], language: 'tr-TR' })
    expect(decodeText(page)).toEqual({ text: '<p>şığİ', encoding: 'windows-1254' })
    vi.stubGlobal('navigator', { languages: ['en-US'], language: 'en-US' })
    expect(decodeText(page)).toEqual({ text: '<p>þýðÝ', encoding: 'windows-1252' })
  })

  it('falls back the same way when the declared encoding does not exist', () => {
    vi.stubGlobal('navigator', { languages: ['en-US'], language: 'en-US' })
    const page = bytes(ascii('<meta charset="klingon"><p>'), TURKISH_1254)
    expect(decodeText(page)).toEqual({ text: '<meta charset="utf-8"><p>þýðÝ', encoding: 'windows-1252' })
  })

  it('reads what it can of a file that declares UTF-8 and is not', () => {
    expect(decodeText(bytes(ascii('<meta charset="utf-8">a'), 0xfe, ascii('b'))).text)
      .toBe('<meta charset="utf-8">a�b')
  })
})

describe('readFileText', () => {
  it('decodes the bytes of the file instead of asking the file for UTF-8 text', async () => {
    const file = fileOf(bytes(ascii('<meta charset="windows-1254">'), TURKISH_1254))
    expect(await readFileText(file)).toBe('<meta charset="utf-8">şığİ')
    expect(await readFileDecoded(file)).toEqual({ text: '<meta charset="utf-8">şığİ', encoding: 'windows-1254' })
  })

  it('still reads a file object that only offers text()', async () => {
    expect(await readFileText({ text: async () => '<p>About</p>' })).toBe('<p>About</p>')
  })
})
