// Edit mode can't run the page's scripts, so it used to show the document in
// its cold state: dark mode off, every accordion shut, every canvas a script
// fills left empty — and no way to edit around any of it. These pin the bridge
// that carries View's state over, and the rule that none of it reaches the
// saved file.
import { describe, expect, it } from 'vitest'
import { liveStateDiff, restoreAuthoredState, withLiveState } from './htmlLiveState.js'
import { serializeDocument } from './htmlPlacement.js'
import { applyElementMotion } from './htmlMotion.js'
import { applyElementPatch } from './htmlElementEdit.js'

const authored = `<!DOCTYPE html><html lang="en" class="scroll-smooth"><head><title>t</title></head>
<body class="bg-white">
  <button id="menu" aria-expanded="false">Menu</button>
  <div id="panel" class="hidden">Behind the click</div>
  <div id="canvas"></div>
</body></html>`

// The same document after someone clicked around in View: dark mode on, the
// panel opened, and the canvas filled by the page's own script.
const live = `<!DOCTYPE html><html lang="en" class="scroll-smooth dark"><head><title>t</title></head>
<body class="bg-white">
  <button id="menu" aria-expanded="true">Menu</button>
  <div id="panel" class="block">Behind the click</div>
  <div id="canvas"><section class="hero">Built at runtime</section></div>
  <script data-pwb-state-reporter>/* injected */</scr` + `ipt>
</body></html>`

const parse = (html) => new DOMParser().parseFromString(html, 'text/html')

describe('liveStateDiff', () => {
  it('reports what the page\'s own scripts changed', () => {
    const changed = liveStateDiff(authored, live).attrs.map((entry) => entry.attrs)

    expect(changed).toContainEqual({ class: 'scroll-smooth dark' })
    expect(changed).toContainEqual({ 'aria-expanded': 'true' })
    expect(changed).toContainEqual({ class: 'block' })
  })

  it('reports the content a script built', () => {
    const { added } = liveStateDiff(authored, live)
    expect(added.map((entry) => entry.html)).toEqual(['<section class="hero">Built at runtime</section>'])
  })

  it('leaves our own injected scripts out of it', () => {
    const { added } = liveStateDiff(authored, live)
    expect(added.some((entry) => entry.html.includes('state-reporter'))).toBe(false)
  })

  it('leaves untouched elements out of it', () => {
    expect(liveStateDiff(authored, authored)).toEqual({ attrs: [], added: [] })
  })

  it('ignores content, and anything that is not interaction state', () => {
    const edited = authored.replace('Behind the click', 'Different words').replace('id="menu"', 'id="other"')
    expect(liveStateDiff(authored, edited)).toEqual({ attrs: [], added: [] })
  })

  it('reports nothing when View sent nothing', () => {
    // The reporter skips a document too big to carry; that is not the same as
    // "the page dropped every attribute it had".
    expect(liveStateDiff(authored, '')).toEqual({ attrs: [], added: [] })
  })

  // An insertion in the middle used to shift every later sibling onto the
  // wrong element, so the walk gave up at the first one.
  it('keeps matching the author\'s elements after an inserted one', () => {
    const withBanner = live.replace('<button id="menu"', '<div class="cookie-banner">Accept?</div><button id="menu"')
    const { attrs, added } = liveStateDiff(authored, withBanner)

    expect(added.some((entry) => entry.html.includes('cookie-banner'))).toBe(true)
    expect(attrs.map((entry) => entry.attrs)).toContainEqual({ 'aria-expanded': 'true' })
  })
})

describe('withLiveState', () => {
  it('shows the document the way View is showing it', () => {
    const doc = parse(withLiveState(authored, liveStateDiff(authored, live)))

    expect(doc.documentElement.className).toBe('scroll-smooth dark')
    expect(doc.getElementById('panel').className).toBe('block')
    expect(doc.getElementById('menu').getAttribute('aria-expanded')).toBe('true')
    expect(doc.querySelector('#canvas .hero')?.textContent).toBe('Built at runtime')
  })

  it('marks runtime content as furniture, not as the author\'s document', () => {
    const doc = parse(withLiveState(authored, liveStateDiff(authored, live)))
    const section = doc.querySelector('#canvas section')

    // The editor skips [data-pwb-chrome] on click, so nobody types into
    // content that a save is going to drop.
    expect(section.getAttribute('data-pwb-chrome')).toBe('')
    expect(section.getAttribute('data-pwb-injected')).toBe('live-state')
  })

  it('records what it replaced so a save can undo it', () => {
    const out = withLiveState(authored, liveStateDiff(authored, live))
    const state = JSON.parse(parse(out).getElementById('panel').getAttribute('data-pwb-state'))

    expect(state.was).toEqual({ class: 'hidden' })
    expect(state.now).toEqual({ class: 'block' })
  })

  it('does nothing without a diff', () => {
    expect(withLiveState(authored, { attrs: [], added: [] })).toBe(authored)
    expect(withLiveState(authored, null)).toBe(authored)
  })
})

describe('what a save writes back', () => {
  it('is the author\'s document, not the borrowed state', () => {
    const shown = parse(withLiveState(authored, liveStateDiff(authored, live)))

    const saved = serializeDocument(shown)

    expect(saved).not.toContain('Built at runtime')
    expect(saved).not.toContain('data-pwb-state')
    expect(saved).toMatch(/<html[^>]*class="scroll-smooth"/)
    expect(parse(saved).getElementById('panel').className).toBe('hidden')
    expect(parse(saved).getElementById('menu').getAttribute('aria-expanded')).toBe('false')
  })
})

describe('restoreAuthoredState', () => {
  it('puts the author\'s own attributes back', () => {
    const doc = parse(withLiveState(authored, liveStateDiff(authored, live)))
    restoreAuthoredState(doc.documentElement)

    expect(doc.documentElement.className).toBe('scroll-smooth')
    expect(doc.getElementById('panel').className).toBe('hidden')
    expect(doc.querySelectorAll('[data-pwb-state]')).toHaveLength(0)
  })

  // The borrowed value is only borrowed until the author overrules it.
  it('keeps a value the author changed by hand', () => {
    const doc = parse(withLiveState(authored, liveStateDiff(authored, live)))
    doc.getElementById('menu').setAttribute('aria-expanded', 'mixed')

    restoreAuthoredState(doc.documentElement)

    expect(doc.getElementById('menu').getAttribute('aria-expanded')).toBe('mixed')
    expect(doc.documentElement.className).toBe('scroll-smooth')
  })
})

// class and style hold many things at once. An edit to one of them used to
// keep everything the page's scripts had put in the attribute as well.
describe('an edit to an element that is showing borrowed state', () => {
  const page = (body) => `<!DOCTYPE html><html><head><title>t</title></head><body>${body}</body></html>`

  it('saves a hover effect without the class the reveal script added', () => {
    const file = page('<div id="card" class="card" data-anim-in="fade-up">Card</div>')
    const running = page('<div id="card" class="card pwb-in" data-anim-in="fade-up">Card</div>')
    const doc = parse(withLiveState(file, liveStateDiff(file, running)))
    const card = doc.getElementById('card')
    expect(card.className).toBe('card pwb-in')

    applyElementMotion(card, { animHover: 'lift' })

    const saved = parse(serializeDocument(doc)).getElementById('card')
    expect(saved.className).toBe('card pwb-hover pwb-hover-lift')
  })

  it('keeps a class the script took away, and drops one the author took away', () => {
    const file = page('<div id="panel" class="panel hidden pwb-hover pwb-hover-grow">Panel</div>')
    const running = page('<div id="panel" class="panel open pwb-hover pwb-hover-grow">Panel</div>')
    const doc = parse(withLiveState(file, liveStateDiff(file, running)))

    applyElementMotion(doc.getElementById('panel'), { animHover: 'none' })

    expect(parse(serializeDocument(doc)).getElementById('panel').className).toBe('panel hidden')
  })

  it('saves a colour without the inline styles the script wrote', () => {
    const file = page('<div id="panel" style="height: 0px;">Panel</div><p id="plain">Text</p>')
    const running = page('<div id="panel" style="height: 240px; opacity: 1;">Panel</div><p id="plain" style="opacity: 1;">Text</p>')
    const doc = parse(withLiveState(file, liveStateDiff(file, running)))

    applyElementPatch(doc.getElementById('panel'), { color: '#ff0000' })
    applyElementPatch(doc.getElementById('plain'), { color: '#ff0000' })

    const saved = parse(serializeDocument(doc))
    expect(saved.getElementById('panel').style.height).toBe('0px')
    expect(saved.getElementById('panel').style.opacity).toBe('')
    expect(saved.getElementById('panel').style.color).toBe('rgb(255, 0, 0)')
    expect(saved.getElementById('plain').getAttribute('style')).toMatch(/^color: ?(rgb\(255, 0, 0\)|#ff0000);?$/)
  })

  it('keeps the author\'s value for the very thing the script had changed', () => {
    const file = page('<div id="panel" style="height: 0px;">Panel</div>')
    const running = page('<div id="panel" style="height: 240px;">Panel</div>')
    const doc = parse(withLiveState(file, liveStateDiff(file, running)))

    applyElementPatch(doc.getElementById('panel'), { height: 300 })

    expect(parse(serializeDocument(doc)).getElementById('panel').style.height).toBe('300px')
  })

  it('leaves the author\'s own text alone when nothing was edited', () => {
    const file = page('<div id="panel" class="a   b" style="height:0">Panel</div>')
    const running = page('<div id="panel" class="a b open" style="height: 240px;">Panel</div>')
    const doc = parse(withLiveState(file, liveStateDiff(file, running)))

    expect(serializeDocument(doc)).toContain('<div id="panel" class="a   b" style="height:0">')
  })
})
