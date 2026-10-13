import { describe, expect, it } from 'vitest'
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
