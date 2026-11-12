import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clickActions, pageHasShow, pageShowAttrs, pageShowScript, reflowLevel, runActions, showAttrs, shownBy } from './pageShow.js'
import { builderInteractiveTags } from './htmlRuntime.js'

const box = (y, h, extra = {}) => ({ x: 0, y, w: 600, h, ...extra })

describe('where the blocks of a box stand once some are hidden', () => {
  it('moves what stood below a hidden block up by its height and the gap under it', () => {
    // Two steps 10px apart, then the bar of buttons.
    const { ys, cut } = reflowLevel([box(100, 50, { hidden: true }), box(160, 50, { hidden: true }), box(220, 40)])

    expect(ys).toEqual([100, 160, 100])
    expect(cut).toBe(120)
  })

  it('moves up only by the steps that are hidden', () => {
    const { ys, cut } = reflowLevel([box(100, 50), box(160, 50, { hidden: true }), box(220, 40)])

    expect(ys).toEqual([100, 160, 160])
    expect(cut).toBe(60)
  })

  it('keeps a row as tall as a shown block beside the hidden ones', () => {
    const steps = { x: 0, w: 300 }
    const picture = { x: 320, y: 100, w: 280, h: 200 }
    const { ys, cut } = reflowLevel([box(100, 50, { ...steps, hidden: true }), box(160, 50, { ...steps, hidden: true }), picture, box(320, 40)])

    // The bar spans both columns: the picture still fills the row above it.
    expect(ys).toEqual([100, 160, 100, 300])
    expect(cut).toBe(20)
  })

  it('moves a block in another column only by what its own column lost', () => {
    const left = { x: 0, w: 300 }
    const right = { x: 320, w: 280 }
    const { ys } = reflowLevel([box(0, 100, { ...left, hidden: true }), box(120, 40, left), box(0, 40, right), box(60, 40, right)])

    expect(ys).toEqual([0, 0, 0, 60])
  })

  it('moves what stands below a box that got shorter inside', () => {
    const { ys, cut } = reflowLevel([box(0, 300, { cut: 120 }), box(320, 40)])

    expect(ys).toEqual([0, 200])
    expect(cut).toBe(120)
  })

  it('does not count the edges a box is drawn with, which reach from its top to its bottom', () => {
    const edge = { x: 0, w: 4, stretch: true }
    const { ys, cut } = reflowLevel([box(0, 400, edge), box(20, 100, { x: 10, w: 500, hidden: true }), box(140, 40, { x: 10, w: 500 })])

    expect(ys).toEqual([0, 20, 20])
    expect(cut).toBe(120)
  })

  it('gives up the room the reading measured, not down to the next block, when it is known', () => {
    // What a closed box held: the box keeps its padding under the title, so
    // what follows moves up by 40, not by the 60 down to it.
    const { ys, cut } = reflowLevel([box(0, 30), box(40, 30, { hidden: true, bands: [[40, 80]] }), box(100, 40)])

    expect(ys).toEqual([0, 40, 60])
    expect(cut).toBe(40)
  })

  it('gives up only the share inside the box of a room measured from above its top', () => {
    // The rest of a long solution, split from its start: its room began 300px higher.
    const { ys, cut } = reflowLevel([box(0, 50, { hidden: true, bands: [[-300, 70]] }), box(80, 40)])

    expect(ys).toEqual([0, 10])
    expect(cut).toBe(70)
  })

  it('gives up nothing for a hidden block whose room another block of its element carries', () => {
    const { ys } = reflowLevel([box(0, 30, { hidden: true, bands: [[0, 70]] }), box(30, 30, { hidden: true, bands: [] }), box(70, 40)])

    expect(ys).toEqual([0, 30, 0])
  })

  it('does not count the blocks of another part at all', () => {
    // Chapters drawn in the same place: the hidden one's blocks are gone, not room given up.
    const { ys, cut } = reflowLevel([box(0, 100), box(140, 900, { gone: true }), box(140, 300)])

    expect(ys).toEqual([0, 140, 140])
    expect(cut).toBe(0)
  })
})

describe('what a click does to the keys', () => {
  const off = { a: false, b: false, c: false }

  it('shows the next step and takes the last one back', () => {
    const steps = [{ do: 'next', keys: ['a', 'b', 'c'] }]
    let on = runActions(steps, off)
    on = runActions(steps, on)
    expect(on).toEqual({ a: true, b: true, c: false })

    expect(runActions([{ do: 'prev', keys: ['a', 'b', 'c'] }], on)).toEqual({ a: true, b: false, c: false })
  })

  it('shows, hides and turns over each key it names', () => {
    expect(runActions([{ do: 'show', keys: ['a', 'c'] }], off)).toEqual({ a: true, b: false, c: true })
    expect(runActions([{ do: 'hide', keys: ['b'] }], { b: true })).toEqual({ b: false })
    expect(runActions([{ do: 'toggle', keys: ['a', 'front'] }], off)).toEqual({ a: true, b: false, c: false, front: false })
  })
})

describe('what a block and a page carry', () => {
  it('keeps only well-formed keys and known actions', () => {
    expect(shownBy({ shownBy: ['k1', 'K2', 'k1', '"><b>', 'part_one'] })).toEqual(['k1', 'part_one'])
    expect(clickActions({ onClick: [{ do: 'next', keys: ['k1', 'bad key'] }, { do: 'eval', keys: ['k1'] }, { do: 'show', keys: [] }] }))
      .toEqual([{ do: 'next', keys: ['k1'] }])
  })

  it('writes the room the element of each key took, with the keys', () => {
    expect(showAttrs({ shownBy: ['k1', 'k2'], rooms: [['k1', 8, 120.5], ['bad key', 1, 2], ['k2', 0, 0]] }))
      .toBe(' data-pwb-show="k1 k2" data-pwb-room="k1:8:120.5 k2:0:0"')
  })

  it('writes them as attributes, escaped', () => {
    expect(showAttrs({ shownBy: ['k1', 'p_two'], onClick: [{ do: 'toggle', keys: ['k2'] }] }))
      .toBe(' data-pwb-show="k1 p_two" data-pwb-do="[{&quot;do&quot;:&quot;toggle&quot;,&quot;keys&quot;:[&quot;k2&quot;]}]"')
    expect(showAttrs({ text: 'Plain' })).toBe('')
  })

  it('marks a page that shows or hides anything, and only such a page', () => {
    const page = { hiddenKeys: ['k1', 'p_two'], parts: [{ key: 'p_one', label: 'One' }, { key: 'p_two', label: 'Two' }], components: [] }

    expect(pageHasShow(page)).toBe(true)
    expect(pageShowAttrs(page)).toBe(' data-pwb-keys="k1 p_two" data-pwb-parts="p_one p_two"')
    expect(pageHasShow({ components: [{ props: { text: 'x' }, children: [{ props: { onClick: [{ do: 'show', keys: ['k'] }] } }] }] })).toBe(true)
    expect(pageShowAttrs({ components: [{ props: { text: 'x' } }] })).toBe('')
  })
})

// The script the published page runs, in a document whose boxes stand where
// their inline styles say (jsdom lays nothing out).
describe('the published page', () => {
  const read = (el, name) => parseFloat(el.style[name]) || 0
  const geometry = {
    offsetTop: (el) => read(el, 'top'),
    offsetLeft: (el) => read(el, 'left'),
    offsetHeight: (el) => (el.style.display === 'none' ? 0 : read(el, 'height')),
    offsetWidth: (el) => read(el, 'width'),
  }
  const saved = {}
  beforeEach(() => {
    for (const [name, get] of Object.entries(geometry)) {
      saved[name] = Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)
      Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get() { return get(this) } })
    }
    delete window.__pwbShowReady
    delete window.__pwbPageCut
  })
  afterEach(() => {
    for (const [name, descriptor] of Object.entries(saved)) Object.defineProperty(HTMLElement.prototype, name, descriptor)
    document.body.innerHTML = ''
  })

  const at = (y, h, attrs = '', inner = '') => `<div style="position:absolute;left:0px;top:${y}px;width:600px;height:${h}px"${attrs}>${inner}</div>`
  function open(html) {
    document.body.innerHTML = html
    new Function(pageShowScript())()
  }
  const top = (id) => document.getElementById(id).style.top
  const shown = (id) => document.getElementById(id).style.display !== 'none'

  it('opens with the steps hidden, the bar up under the question, and shows them one click at a time', () => {
    open(`<div class="page" data-pwb-keys="s1 s2" style="position:relative;height:400px">
      ${at(0, 300, '', `<div data-pwb-container-root style="position:absolute;left:0px;top:0px;width:600px;height:300px">
        ${at(0, 80).replace('<div', '<div id="question"')}
        ${at(100, 50, ' data-pwb-show="s1"').replace('<div', '<div id="step1"')}
        ${at(160, 50, ' data-pwb-show="s2"').replace('<div', '<div id="step2"')}
        ${at(220, 40, ` data-pwb-do='[{"do":"next","keys":["s1","s2"]}]'`, '<button id="next">Next step</button>').replace('<div', '<div id="bar"')}
      </div>`).replace('<div', '<div id="card"')}
      ${at(320, 40).replace('<div', '<div id="after"')}
    </div>`)

    expect([shown('step1'), shown('step2')]).toEqual([false, false])
    expect(top('bar')).toBe('100px')
    // The card got 120px shorter, and what follows it moved up as much.
    expect(document.getElementById('card').style.height).toBe('180px')
    expect(top('after')).toBe('200px')
    expect(window.__pwbPageCut).toBe(120)

    document.getElementById('next').click()
    expect([shown('step1'), shown('step2')]).toEqual([true, false])
    expect(top('bar')).toBe('160px')
    expect(top('after')).toBe('260px')

    document.getElementById('next').click()
    expect(shown('step2')).toBe(true)
    // Everything shown: back where it was drawn.
    expect(top('bar')).toBe('220px')
    expect(top('after')).toBe('320px')
    expect(document.getElementById('card').style.height).toBe('300px')
  })

  it('shows one part at a time, and a link to a block of another part turns that part on', () => {
    open(`<div class="page" data-pwb-keys="p_two" data-pwb-parts="p_one p_two" style="position:relative;height:1000px">
      ${at(0, 300, ' data-pwb-show="p_one"').replace('<div', '<div id="one"')}
      ${at(0, 1000, ' data-pwb-show="p_two"', '<h1 id="two-title">Two</h1>').replace('<div', '<div id="two"')}
      <a id="to-two" href="#two-title">Part two</a>
    </div>`)

    expect([shown('one'), shown('two')]).toEqual([true, false])
    // The page ends where the part that is shown ends.
    expect(window.__pwbPageCut).toBe(700)

    document.getElementById('to-two').click()
    expect([shown('one'), shown('two')]).toEqual([false, true])
    expect(window.__pwbPageCut).toBe(0)
  })
})

describe('the script a published page gets', () => {
  const RUNTIME = 'data-pwb-keys'

  it('is added to a page with blocks shown by keys, and to no other, even one with a script of its own', () => {
    expect(builderInteractiveTags('<div data-pwb-show="s1">Step</div>')).toContain(RUNTIME)
    expect(builderInteractiveTags('<p>Plain</p>')).not.toContain(RUNTIME)
    expect(builderInteractiveTags('<p>Plain</p><script>console.log(1)</script>')).not.toContain(RUNTIME)
  })
})
