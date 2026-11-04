import { describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { schemaToResponsiveHtml } from './responsiveHtml.js'

describe('schemaToResponsiveHtml multiline copy', () => {
  it('preserves line breaks while escaping markup', () => {
    const html = schemaToResponsiveHtml({
      theme: {},
      pages: [{
        id: 'p1',
        name: 'Home',
        components: [{
          id: 'text_multiline',
          type: 'text',
          props: { text: 'One\nTwo <safe>' },
          styles: {},
          layout: { x: 0, y: 0, w: 400, h: 80 },
        }],
      }],
    })

    expect(html).toContain('One<br>Two &lt;safe&gt;')
    expect(html).not.toContain('Two <safe>')
  })
})

// Helpers for the parity tests below: this writer feeds the dashboard
// thumbnails, the Code panel and "Convert to responsive HTML", so anything it
// silently drops is content the user believes they still have.
const box = (id, type, props, extra = {}) => ({
  id, type, props, styles: {}, layout: { x: 0, y: 0, w: 300, h: 60 }, ...extra,
})
const render = (components, page = {}) =>
  schemaToResponsiveHtml({
    theme: {},
    pages: [{ id: 'p1', name: 'Home', background: '#fff', canvasWidth: 1000, components, ...page }],
  })

describe('schemaToResponsiveHtml Section bands', () => {
  const band = () => box('reg1', 'region', { contentWidth: 980 }, {
    styles: { backgroundColor: '#0f172a' },
    layout: { x: 0, y: 0, w: 1000, h: 300 },
    children: [
      box('h1', 'heading', { text: 'Band heading' }, { layout: { x: 40, y: 40, w: 400, h: 60 } }),
      box('t1', 'text', { text: 'Band body' }, { layout: { x: 460, y: 40, w: 400, h: 60 } }),
    ],
  })

  it('renders the band and everything inside it', () => {
    const html = render([band()])
    expect(html).toContain('Band heading')
    expect(html).toContain('Band body')
  })

  it('keeps the band background', () => {
    expect(render([band()])).toMatch(/rh-region[^>]*background-color:#0f172a/)
  })

  it('groups children that sat side by side into one row', () => {
    const html = render([band()])
    expect(html).toMatch(/rh-row[\s\S]*?Band heading[\s\S]*?Band body[\s\S]*?<\/div>/)
  })

  // Hidden on desktop is not hidden on phones: the child stays in the page,
  // marked so the desktop rule hides it. Only one hidden on both is left out.
  it('hides a child on desktop only when it is hidden on desktop only', () => {
    const b = band()
    b.children[1].hidden = true
    const html = render([b])
    expect(html).toContain('Band heading')
    expect(html).toMatch(/class="[^"]*rh-off-pc[^"]*"[^>]*>Band body/)

    b.children[1].hiddenMobile = true
    expect(render([b])).not.toContain('Band body')
  })
})

describe('schemaToResponsiveHtml auto-layout containers', () => {
  const stack = (flow) => box('con1', 'container', { flow, gap: 20 }, {
    layout: { x: 0, y: 0, w: 1000, h: 200 },
    children: [box('c1', 'text', { text: 'Child A' }), box('c2', 'text', { text: 'Child B' })],
  })

  it('flows a Row container instead of pinning its children', () => {
    const html = render([stack('row')])
    expect(html).toMatch(/display:flex;flex-direction:row/)
    expect(html).not.toMatch(/Child A[\s\S]{0,200}position:absolute/)
  })

  it('flows a Grid container', () => {
    expect(render([stack('grid')])).toMatch(/display:grid/)
  })

  it('still pins children of a free container', () => {
    expect(render([stack('free')])).toMatch(/position:absolute/)
  })
})

describe('schemaToResponsiveHtml navbar phone behaviour', () => {
  const nav = (mobileNavMode) => box('nav1', 'navbar', {
    brand: 'Brand', links: [{ label: 'Home', href: '#top' }], mobileNavMode,
  }, { layout: { x: 0, y: 0, w: 1000, h: 70 } })

  it('marks up the hamburger menu mode', () => {
    const html = render([nav('menu')])
    expect(html).toContain('rh-nav-mobile-menu')
    expect(html).toContain('data-builder-mobile-nav-toggle')
    expect(html).toMatch(/rh-nav-mobile-menu[^{]*\{[^}]*position: relative/)
  })

  it('marks up the stacked mode', () => {
    expect(render([nav('stack')])).toContain('rh-nav-mobile-stack')
  })

  it('defaults to the hamburger when nothing is set', () => {
    expect(render([nav(undefined)])).toContain('rh-nav-mobile-menu')
  })
})

describe('schemaToResponsiveHtml embed font', () => {
  it('starts an opted-in embed in the page font', () => {
    const html = schemaToResponsiveHtml({
      theme: { fontFamily: '"Lora", Georgia, serif' },
      pages: [{
        id: 'p1', name: 'Home',
        components: [{
          id: 'html_1', type: 'html',
          props: { code: '<p>Hello</p>', _siteFont: true },
          styles: {},
          layout: { x: 0, y: 0, w: 300, h: 60 },
        }],
      }],
    })
    expect(html).toContain(':root{--pwb-embed-font:&quot;Lora&quot;, Georgia, serif;}')
  })
})

// "Hide on PC" and "Hide on mobile" are per-screen switches. This writer (it
// feeds "Convert to responsive HTML", the Source panel and the thumbnails)
// read them as one: a block hidden on PC was left out altogether, and one
// hidden on mobile was shown on phones.
describe('blocks hidden on one screen size', () => {
  const block = (id, type, props, extra = {}) => ({ id, type, props, styles: {}, layout: { x: 0, y: 0, w: 300, h: 60 }, ...extra })
  const html = schemaToResponsiveHtml({
    theme: {},
    pages: [{
      id: 'p1',
      name: 'Home',
      components: [
        block('phone_only', 'heading', { text: 'Only on phones' }, { hidden: true }),
        block('desk_only', 'text', { text: 'Only on desktops' }, { hiddenMobile: true, layout: { x: 0, y: 100, w: 300, h: 60 } }),
        block('band', 'region', {}, {
          layout: { x: 0, y: 200, w: 1000, h: 300 },
          children: [block('inner_phone', 'text', { text: 'Inner, phones only' }, { hidden: true })],
        }),
        block('always', 'text', { text: 'Everywhere' }, { layout: { x: 0, y: 600, w: 300, h: 60 } }),
      ],
    }],
  })
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const tagOf = (text) => [...doc.querySelectorAll('h2, p')].find((el) => el.textContent === text)

  it('are still in the page, each marked for the size it is hidden on', () => {
    expect(tagOf('Only on phones').classList.contains('rh-off-pc')).toBe(true)
    expect(tagOf('Only on desktops').classList.contains('rh-off-mobile')).toBe(true)
    expect(tagOf('Inner, phones only').classList.contains('rh-off-pc')).toBe(true)
    expect(tagOf('Everywhere').className).not.toMatch(/rh-off/)
  })

  it('come with the two rules that hide them', () => {
    const css = html.replace(/\s+/g, ' ')
    expect(css).toMatch(/@media \(min-width: 769px\) \{ \.rh-off-pc \{ display: none !important; \} \}/)
    expect(css).toMatch(/\.rh-off-mobile \{ display: none !important; \}/)
  })
})

describe('schemaToResponsiveHtml vertical navbar', () => {
  const links = [{ label: 'Home', href: '#top' }, { label: 'Blog', href: '#blog' }]
  const rail = (props = {}, extra = {}) => box('rail', 'navbar', { brand: 'Studio', links, navLayout: 'vertical', ...props }, { layout: { x: 0, y: 0, w: 220, h: 700 }, ...extra })
  const content = [
    box('one', 'heading', { text: 'One', level: 'h1' }, { layout: { x: 260, y: 40, w: 700, h: 60 } }),
    box('two', 'text', { text: 'Two' }, { layout: { x: 260, y: 140, w: 700, h: 60 } }),
  ]
  const write = (components, extra = {}) => new JSDOM(schemaToResponsiveHtml({ theme: {}, ...extra, pages: [{ id: 'p1', name: 'Home', canvasWidth: 1000, components }] })).window.document
  const slotOf = (doc) => doc.getElementById('rail').parentElement

  it('is on the page, with its brand and its links', () => {
    const bar = write([rail(), ...content]).getElementById('rail')
    expect(bar.querySelector('.rh-brand').textContent).toBe('Studio')
    expect([...bar.querySelectorAll('.rh-links a')].map((link) => link.textContent)).toEqual(['Home', 'Blog'])
    expect(bar.querySelector('.rh-nav-vertical')).not.toBeNull()
  })

  it('stands beside the page, whose blocks keep their own rows', () => {
    const doc = write([rail(), ...content])
    const page = slotOf(doc).parentElement
    expect(page.classList.contains('rh-rail-page')).toBe(true)
    const main = page.querySelector(':scope > .rh-rail-main')
    expect(main.querySelector('#one')).not.toBeNull()
    // It overlaps both of them in height: a row shared with it would make columns of them.
    expect(doc.getElementById('one').parentElement).not.toBe(doc.getElementById('two').parentElement)
    expect(main.querySelector('#rail')).toBeNull()
  })

  it('keeps its width and its height for a wide screen', () => {
    const style = slotOf(write([rail()])).getAttribute('style')
    expect(style).toContain('--rh-rail-w:220px')
    expect(style).toContain('--rh-rail-h:700px')
  })

  it.each([['fixed'], ['sticky']])('%s: pinned by a rule of the wide screen, which leaves a phone alone', (scrollBehavior) => {
    const doc = write([rail({ scrollBehavior, pinOffsetY: 12, pinZIndex: 7 })])
    const slot = slotOf(doc)
    expect(slot.classList.contains('rh-rail-pinned')).toBe(true)
    expect(slot.getAttribute('style')).toContain('--rh-rail-top:12px')
    expect(slot.getAttribute('style')).toContain('--rh-rail-z:7')
    expect(doc.getElementById('rail').getAttribute('style') || '').not.toContain('position')
    const wide = [...doc.styleSheets].flatMap((sheet) => [...sheet.cssRules]).find((rule) => rule.media?.mediaText.includes('min-width') && [...rule.cssRules].some((inner) => inner.selectorText === '.rh-rail-pinned > .rh-navbar'))
    expect([...wide.cssRules].find((inner) => inner.selectorText === '.rh-rail-pinned > .rh-navbar').style.getPropertyValue('position')).toBe('fixed')
  })

  it('a bar that is not pinned stays in the flow', () => {
    expect(slotOf(write([rail()])).classList.contains('rh-rail-pinned')).toBe(false)
  })

  it('stands on the side it is on', () => {
    const onRight = (component) => slotOf(write([component])).classList.contains('rh-rail-right')
    expect(onRight(rail())).toBe(false)
    expect(onRight(rail({}, { layout: { x: 780, y: 0, w: 220, h: 700 } }))).toBe(true)
    expect(onRight(rail({ scrollBehavior: 'fixed', pinX: 'right' }))).toBe(true)
    expect(onRight(rail({ scrollBehavior: 'fixed' }, { layout: { x: 780, y: 0, w: 220, h: 700 } }))).toBe(false)
  })

  it('takes its slot with it when it is hidden on one size', () => {
    expect(slotOf(write([rail({}, { hidden: true })])).classList.contains('rh-off-pc')).toBe(true)
    expect(slotOf(write([rail({}, { hiddenMobile: true })])).classList.contains('rh-off-mobile')).toBe(true)
  })

  it('leaves nothing behind when it is hidden on both', () => {
    const doc = write([rail({}, { hidden: true, hiddenMobile: true }), ...content])
    expect(doc.getElementById('rail')).toBeNull()
    expect(doc.querySelector('.rh-rail-page')).toBeNull()
  })

  it('keeps its hover motion and its phone styles on the bar', () => {
    const bar = write([rail({ animHover: 'lift' }, { stylesMobile: { backgroundColor: '#fafafa' } })]).getElementById('rail')
    expect(bar.className).toContain('pwb-hover')
    expect(bar.className).toContain('rh-phone-rail')
  })

  it('leaves a page without one as it was', () => {
    // A script of the owner keeps every rule on the page, so nothing is tidied up after the writer.
    const html = schemaToResponsiveHtml({ theme: {}, customJs: 'go()', pages: [{ id: 'p1', name: 'Home', components: content }] })
    expect(html).not.toContain('rh-rail')
  })
})

describe('schemaToResponsiveHtml a bar or a band inside another block', () => {
  const write = (kid, props = {}) => new JSDOM(schemaToResponsiveHtml({ theme: {}, pages: [{ id: 'p1', name: 'Home', components: [box('parent', 'container', props, { layout: { x: 0, y: 0, w: 600, h: 400 }, children: [kid] })] }] })).window.document
  const brand = { brand: 'Studio', links: [{ label: 'Home', href: '#top' }] }

  it.each([
    ['a vertical navbar', box('kid', 'navbar', { ...brand, navLayout: 'vertical' }), 'Studio'],
    ['a boxed navbar', box('kid', 'navbar', { ...brand, widthMode: 'boxed' }), 'Studio'],
    ['a section', box('kid', 'section', { heading: 'Band' }), 'Band'],
    ['a section band', box('kid', 'region', {}, { children: [box('deep', 'text', { text: 'Deep' })] }), 'Deep'],
  ])('%s is kept', (name, kid, text) => {
    for (const props of [{}, { flow: 'column' }]) {
      const node = write(kid, props).getElementById('kid')
      expect(node).not.toBeNull()
      expect(node.textContent).toContain(text)
    }
  })

  it('a divider is kept', () => {
    expect(write(box('kid', 'divider', {})).getElementById('kid').tagName).toBe('HR')
  })

  it('is placed like any other child of a free container', () => {
    const style = write(box('kid', 'navbar', { ...brand, navLayout: 'vertical' }, { layout: { x: 30, y: 40, w: 200, h: 300 } })).getElementById('kid').getAttribute('style')
    expect(style).toContain('position:absolute;left:30px;top:40px;width:200px;height:300px')
  })

  it('is no slot of its own: it is not the page\'s rail', () => {
    const doc = write(box('kid', 'navbar', { ...brand, navLayout: 'vertical' }))
    expect(doc.querySelector('.rh-rail-page')).toBeNull()
  })
})
