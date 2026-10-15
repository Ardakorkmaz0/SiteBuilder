// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { zipFiles } from './zip.js'

// Read the public ZIP record structure rather than mirroring writer helpers.
const decoder = new TextDecoder()
async function inspectZip(files) {
  const bytes = new Uint8Array(await zipFiles(files).arrayBuffer())
  const view = new DataView(bytes.buffer)
  const end = bytes.length - 22
  expect(view.getUint32(end, true)).toBe(0x06054b50)
  const entries = []
  let central = view.getUint32(end + 16, true)
  for (let i = 0; i < view.getUint16(end + 10, true); i++) {
    expect(view.getUint32(central, true)).toBe(0x02014b50)
    const nameLength = view.getUint16(central + 28, true)
    const local = view.getUint32(central + 42, true)
    const size = view.getUint32(central + 24, true)
    const dataStart = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
    expect(view.getUint32(local, true)).toBe(0x04034b50)
    entries.push({
      name: decoder.decode(bytes.subarray(central + 46, central + 46 + nameLength)),
      content: decoder.decode(bytes.subarray(dataStart, dataStart + size)),
      crc: view.getUint32(local + 14, true),
      centralFlags: view.getUint16(central + 8, true),
      localFlags: view.getUint16(local + 6, true),
    })
    central += 46 + nameLength + view.getUint16(central + 30, true) + view.getUint16(central + 32, true)
  }
  expect(central).toBe(end)
  return entries
}

describe('zipFiles', () => {
  it('marks Unicode filenames as UTF-8 in both headers for archive extractors', async () => {
    const entries = await inspectZip([{ name: 'sayfalar/İletişim 🌍.html', content: '<h1>Merhaba dünya</h1>' }])
    expect(entries[0].name).toBe('sayfalar/İletişim 🌍.html')
    expect(entries[0].content).toBe('<h1>Merhaba dünya</h1>')
    expect(entries[0].localFlags & 0x800).toBe(0x800)
    expect(entries[0].centralFlags & 0x800).toBe(0x800)
  })

  it('round trips JSON, empty files and UTF-8 content at their recorded offsets', async () => {
    const state = { pages: [{ name: 'İletişim', html: '<p>🌍</p>' }] }
    const entries = await inspectZip([
      { name: 'index.html', content: '<p>🌍</p>' },
      { name: 'schema.json', content: JSON.stringify(state) },
      { name: 'custom.js', content: '' },
      { name: 'checksum.txt', content: '123456789' },
    ])
    expect(entries.map((entry) => entry.name)).toEqual(['index.html', 'schema.json', 'custom.js', 'checksum.txt'])
    expect(JSON.parse(entries[1].content)).toEqual(state)
    expect(entries[2].content).toBe('')
    expect(entries[3].crc).toBe(0xcbf43926)
  })

  it('writes a readable empty archive', async () => {
    expect(await inspectZip([])).toEqual([])
  })
})
