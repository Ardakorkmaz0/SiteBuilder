import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { fidelityInventory, extraFidelityPages } from '../../e2e/fidelityInventory.js'

afterEach(() => vi.unstubAllEnvs())

it('manifests large HTML by bytes, counts each content once and never executes lesson code', () => {
  vi.stubEnv('CI', '')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lesson-inventory-'))
  try {
    const sub = path.join(root, 'chapter')
    fs.mkdirSync(sub)
    const lesson = '<style>b:hover{transition:color 1s}</style><canvas></canvas><p>localStorage</p><button onclick="requestAnimationFrame(draw)">Run</button><script>throw Error("must not run")</script>'.padEnd(20481)
    fs.writeFileSync(path.join(root, 'copy.html'), lesson)
    fs.writeFileSync(path.join(sub, 'source.html'), lesson)
    fs.writeFileSync(path.join(root, 'small.html'), ' '.repeat(20480))
    fs.symlinkSync(root, path.join(sub, 'loop'), 'dir')
    const result = fidelityInventory(root)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]).toMatchObject({
      bytes: 20481, paths: [{ root: 0, path: 'chapter/source.html' }, { root: 0, path: 'copy.html' }],
    })
    expect(result.counts).toEqual({ canvas: 1, hover: 1, transition: 1, raf: 1 })
    expect(extraFidelityPages(root)).toEqual([{ name: expect.stringMatching(/^extra\/[a-f0-9]{64}$/), file: path.join(sub, 'source.html'), checked: false }])
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

it('never collects private files on CI and needs no corpus on ordinary runs', () => {
  vi.stubEnv('CI', 'true')
  expect(extraFidelityPages()).toEqual([])
  expect(() => extraFidelityPages('/missing-private-folder')).toThrow('local only')
})
