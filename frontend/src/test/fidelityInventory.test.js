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

it('assigns each inventory signal to the lesson using it, not to prose, unrelated attributes or another language', () => {
  vi.stubEnv('CI', '')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lesson-signals-'))
  const cases = [
    ['hover', '<style>button:hover { color: blue }</style>', ['hover']],
    ['transition', '<div style="transition-duration: 1s"></div>', ['transition']],
    ['frames', '<style>@-webkit-keyframes appear { to { opacity: 1 } }</style>', ['keyframes']],
    ['keys', '<script>document.addEventListener("keyup", refresh)</script>', ['keyboard']],
    ['progress', '<button onclick="localStorage.getItem(\'progress\')">Read</button>', ['storage']],
    ['reveal', '<script>new IntersectionObserver(reveal)</script>', ['observer']],
    ['draw', '<script>requestAnimationFrame(draw)</script>', ['raf']],
    ['disclosure', '<details><summary>Notes</summary>Closed</details>', ['details']],
    ['painting', '<canvas></canvas><canvas></canvas>', ['canvas']],
    ['sound', '<audio controls></audio>', ['audio']],
    ['film', '<video muted></video>', ['video']],
    ['submit', '<form><button>Send</button></form>', ['form']],
    ['island', '<iframe title="Lesson"></iframe>', ['iframe']],
    ['library', '<script src="./lesson.js"></script>', ['script[src]']],
    ['decoys', `<!-- <form><audio></audio></form> -->
      <p data-example="localStorage :hover" title="requestAnimationFrame">
        &lt;canvas&gt; details iframe video keydown IntersectionObserver @keyframes
      </p><style>.localStorage { color: red } .requestAnimationFrame:hovering { transitioning: none } @keyframesExample {}</style>
      <script>const css = 'a:hover { transition: color 2s } @keyframes slide {}';
      const labels = ['localStorageQuota', 'requestAnimationFrames', 'onkeydown', 'IntersectionObserverEntry']</script>`, []],
  ]
  try {
    for (const [name, html] of cases) fs.writeFileSync(path.join(root, name + '.html'), html.padEnd(20481))
    const { entries } = fidelityInventory(root)
    const byPath = Object.fromEntries(entries.map(entry => [entry.paths[0].path, entry.signals]))
    for (const [name, , expected] of cases) expect(byPath[name + '.html'], name).toEqual(expected)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})
