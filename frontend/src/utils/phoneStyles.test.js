// A block's phone styles (stylesMobile) on the written page, as the Renderer
// draws them. Most blocks inside a page have their look written inline, where
// only an !important rule of the phone's media block can reach them.
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import { RenderComponent } from '../components/renderer/Renderer.jsx'
import { DEFAULT_THEME } from './theme.js'
import { publishedPagesFor } from './publishedPages.js'
import { schemaToFiles } from './schemaToFiles.js'
import { schemaToResponsiveHtml } from './responsiveHtml.js'

const PHONE = { backgroundColor: '#fafafa' }
const FAFAFA = 'rgb(250, 250, 250)'
const RED = 'rgb(255, 0, 0)'
const block = (id, type, styles = {}, extra = {}) => ({ id, type, props: {}, styles, layout: { x: 10, y: 10, w: 340, h: 100 }, ...extra })
const site = (components, page = {}, extra = {}) => ({ theme: { ...DEFAULT_THEME }, pages: [{ id: 'home', name: 'Home', background: '#ffffff', canvasWidth: 1000, mobileWidth: 390, components, ...page }], ...extra })
const open = (html) => new JSDOM(html).window.document
const published = (schema) => open(publishedPagesFor(schema)[0].html)

function inlineValue(el, property) {
  const found = (el.getAttribute('style') || '').split(';').map((part) => part.split(':')).filter(([name]) => name.trim() === property)
  return found.length ? found[found.length - 1].slice(1).join(':').trim() : null
}

function phoneRules(doc) {
  return [...doc.styleSheets]
    .flatMap((sheet) => [...sheet.cssRules])
    .filter((rule) => rule.media && rule.media.mediaText.includes('max-width: 768px'))
    .flatMap((rule) => [...rule.cssRules])
}

// What a phone shows on `el`: the phone's rules outrank its inline style only
// with !important, as in a browser. jsdom applies no media query, so this reads
// the cascade itself. It also hands a stylesheet's colours back as rgb().
function onPhone(el, property) {
  const matching = phoneRules(el.ownerDocument).filter((rule) => el.matches(rule.selectorText) && rule.style.getPropertyValue(property))
  const strong = matching.filter((rule) => rule.style.getPropertyPriority(property) === 'important').pop()
  const value = strong ? strong.style.getPropertyValue(property) : inlineValue(el, property)
  return value ?? matching.pop()?.style.getPropertyValue(property) ?? null
}

// What a wider screen shows: no rule outside the media block says anything here.
const onDesktop = inlineValue

// What the Renderer draws for a phone: the node the writers have to match.
const drawnOnPhone = (component) => open(renderToStaticMarkup(createElement(RenderComponent, { component, viewport: 'mobile' }))).body.firstElementChild

describe('the look of a block written inline', () => {
  const inner = (doc, id) => doc.querySelector(`.c-${id}`).firstElementChild

  it.each([
    ['a free container with nothing in it', block('x', 'container')],
    ['a free container with a child', block('x', 'container', {}, { children: [block('kid', 'text')] })],
    ['a container in auto-layout', block('x', 'container', {}, { props: { flow: 'column' }, children: [block('kid', 'text')] })],
    ['a section band', block('x', 'region')],
    ['tabs', block('x', 'tabs', {}, { props: { tabs: [{ id: 'a', label: 'A' }], activeId: 'a' } })],
    ['a select', block('x', 'select', {}, { props: { label: 'L', options: ['a'] } })],
    ['an alert', block('x', 'alert', {}, { props: { text: 'x' } })],
    ['an accordion', block('x', 'accordion', {}, { props: { title: 't', text: 'x' } })],
    ['an HTML block', block('x', 'html', {}, { props: { code: '<p>x</p>' } })],
  ])('%s takes its phone background', (name, component) => {
    const doc = published(site([{ ...component, stylesMobile: PHONE }]))
    const node = inner(doc, 'x')
    expect(onPhone(node, 'background-color')).toBe(FAFAFA)
    expect(onDesktop(node, 'background-color')).toBeNull()
  })

  it('a phone colour outranks the colour of the block as well', () => {
    const doc = published(site([block('x', 'container', { backgroundColor: '#fafafa' }, { stylesMobile: { backgroundColor: 'transparent' } })]))
    const node = inner(doc, 'x')
    expect(onPhone(node, 'background-color')).toBe('transparent')
    expect(onDesktop(node, 'background-color')).toBe('#fafafa')
  })

  it('on a flow page too', () => {
    const doc = published(site([block('x', 'container', {}, { stylesMobile: PHONE })], { flowMode: true }))
    expect(onPhone(inner(doc, 'x'), 'background-color')).toBe(FAFAFA)
  })

  it('a block with a link keeps it, and the node inside it takes the colour', () => {
    const doc = published(site([block('x', 'alert', {}, { props: { text: 'x', href: 'https://a.test/' }, stylesMobile: PHONE })]))
    const node = doc.querySelector('.c-x a > div')
    expect(onPhone(node, 'background-color')).toBe(FAFAFA)
  })

  it('reaches the stylesheet of an exported project', () => {
    const files = schemaToFiles(site([block('x', 'container', {}, { stylesMobile: PHONE })]))
    const page = files.find((file) => file.name === 'index.html').content
    const css = files.find((file) => file.name === 'styles.css').content
    const doc = open(page.replace('<link rel="stylesheet" href="styles.css" />', `<style>${css}</style>`))
    expect(onPhone(inner(doc, 'x'), 'background-color')).toBe(FAFAFA)
  })

  describe('what the Renderer decides by itself on a block', () => {
    const TABS = { tabs: [{ id: 'a', label: 'A' }], activeId: 'a' }
    // Written so that the value a phone style asks for is never the Renderer's.
    it.each([
      ['an HTML block', block('x', 'html', {}, { props: { code: '<p>x</p>' } }), { display: 'inline', width: '10px', height: '900px', border: '1px solid red', overflow: 'visible' }],
      ['tabs', block('x', 'tabs', {}, { props: TABS }), { display: 'block', overflow: 'hidden' }],
      ['a container in auto-layout', block('x', 'container', {}, { props: { flow: 'grid' } }), { display: 'block', gap: '99px', height: '10px' }],
      ['a free container', block('x', 'container'), { display: 'flex' }],
    ])('%s stays decided', (name, component, asked) => {
      const toKey = (property) => property.replace(/-([a-z])/g, (m, letter) => letter.toUpperCase())
      const stylesMobile = { opacity: '0.5', ...Object.fromEntries(Object.entries(asked).map(([property, value]) => [toKey(property), value])) }
      const phone = { ...component, stylesMobile }
      const node = inner(published(site([phone])), 'x')
      const drawn = drawnOnPhone(phone)
      expect(onPhone(node, 'opacity')).toBe('0.5')
      expect(inlineValue(drawn, 'opacity')).toBe('0.5')
      for (const [property, value] of Object.entries(asked)) {
        expect(inlineValue(drawn, property), `the Renderer's ${property}`).not.toBe(value)
        expect(onPhone(node, property), `the page's ${property}`).not.toBe(value)
      }
    })

    it('a height it leaves to the block reaches the page', () => {
      const phone = block('x', 'container', {}, { stylesMobile: { height: '333px' } })
      expect(inlineValue(drawnOnPhone(phone), 'height')).toBe('333px')
      expect(onPhone(inner(published(site([phone])), 'x'), 'height')).toBe('333px')
    })
  })
})

describe('a child inside another block', () => {
  const inContainer = (child, props = {}) => site([block('box', 'container', {}, { props, children: [child] })])

  it('takes its phone colour in a free container', () => {
    const doc = published(inContainer(block('kid', 'heading', { color: '#111111' }, { props: { text: 'x', level: 'h2' }, stylesMobile: { color: '#ff0000' } })))
    const node = doc.querySelector('#kid').firstElementChild
    expect(onPhone(node, 'color')).toBe(RED)
    expect(onDesktop(node, 'color')).toBe('#111111')
  })

  it('in an auto-layout container', () => {
    const doc = published(inContainer(block('kid', 'text', { color: '#111111' }, { props: { text: 'x' }, stylesMobile: { color: '#ff0000' } }), { flow: 'column' }))
    expect(onPhone(doc.querySelector('#kid').firstElementChild, 'color')).toBe(RED)
  })

  it('in a section band', () => {
    const doc = published(site([block('band', 'region', {}, { children: [block('kid', 'text', { color: '#111111' }, { props: { text: 'x' }, stylesMobile: { color: '#ff0000' } })] })]))
    expect(onPhone(doc.querySelector('#kid').firstElementChild, 'color')).toBe(RED)
  })

  it('in a tab panel', () => {
    const doc = published(site([block('tabs', 'tabs', {}, { props: { tabs: [{ id: 'a', label: 'A' }], activeId: 'a' }, children: [block('kid', 'text', { color: '#111111' }, { props: { text: 'x' }, tabId: 'a', stylesMobile: { color: '#ff0000' } })] })]))
    expect(onPhone(doc.querySelector('#kid').firstElementChild, 'color')).toBe(RED)
  })

  it('several levels down', () => {
    const deep = block('kid', 'text', { color: '#111111' }, { props: { text: 'x' }, stylesMobile: { color: '#ff0000' } })
    const doc = published(inContainer(block('mid', 'container', {}, { stylesMobile: PHONE, children: [deep] })))
    expect(onPhone(doc.querySelector('#mid').firstElementChild, 'background-color')).toBe(FAFAFA)
    expect(onPhone(doc.querySelector('#kid').firstElementChild, 'color')).toBe(RED)
  })

  it('a child that fits its box', () => {
    const doc = published(inContainer(block('kid', 'text', { color: '#111111' }, { props: { text: 'x', fit: 'box' }, stylesMobile: { color: '#ff0000' } })))
    expect(onPhone(doc.querySelector('#kid [data-pwb-fit-root]').firstElementChild, 'color')).toBe(RED)
  })

  it('an image, in both of its copies', () => {
    const picture = block('kid', 'image', {}, { props: { src: 'https://a.test/l.png', srcOther: 'https://a.test/d.png', alt: 'x' }, stylesMobile: { opacity: '0.5' } })
    const doc = published(site([block('switch', 'themeToggle', {}, { props: { label: 'Theme' } }), block('box', 'container', {}, { children: [picture] })]))
    const images = [...doc.querySelectorAll('#kid img')]
    expect(images).toHaveLength(2)
    for (const image of images) expect(onPhone(image, 'opacity')).toBe('0.5')
  })

  it('an image with one copy', () => {
    const doc = published(inContainer(block('kid', 'image', {}, { props: { src: 'https://a.test/l.png', alt: 'x' }, stylesMobile: { opacity: '0.5' } })))
    expect(onPhone(doc.querySelector('#kid img'), 'opacity')).toBe('0.5')
  })

  it('is left out with what is hidden on both sizes, and all that is in it', () => {
    const inner = block('deep', 'text', {}, { props: { text: 'x' }, stylesMobile: { color: '#ff0000' } })
    const gone = block('kid', 'container', {}, { hidden: true, hiddenMobile: true, stylesMobile: PHONE, children: [inner] })
    // A script of the owner keeps every rule on the page, so nothing is tidied up after the writer.
    const html = publishedPagesFor({ ...inContainer(gone), customJs: 'go()' })[0].html
    expect(html).not.toContain('ci-kid')
    expect(html).not.toContain('ci-deep')
  })

  it('further down too', () => {
    const gone = block('kid', 'text', {}, { props: { text: 'x' }, hidden: true, hiddenMobile: true, stylesMobile: { color: '#ff0000' } })
    const html = publishedPagesFor({ ...inContainer(block('mid', 'container', {}, { children: [gone] })), customJs: 'go()' })[0].html
    expect(html).not.toContain('ci-kid')
  })
})

describe('what a page without phone styles pays', () => {
  it('nothing', () => {
    const html = publishedPagesFor(site([
      block('x', 'container', { backgroundColor: '#eeeeee' }, { children: [block('p', 'image', {}, { props: { src: 'https://a.test/a.png', alt: 'a' } })] }),
      block('t', 'alert', {}, { props: { text: 'x' } }),
    ]))[0].html
    expect(html).not.toContain('.ci-')
    expect(open(html).querySelector('.c-x').firstElementChild.hasAttribute('class')).toBe(false)
    expect(open(html).querySelector('.c-t').firstElementChild.hasAttribute('class')).toBe(false)
    expect(open(html).querySelector('#p img').hasAttribute('class')).toBe(false)
  })

  it('nothing for styles that say nothing', () => {
    const html = publishedPagesFor(site([
      block('x', 'container', {}, { stylesMobile: {} }),
      block('y', 'container', {}, { stylesMobile: { position: 'fixed', backgroundImage: 'url(https://a.test/x.png)' } }),
    ]))[0].html
    expect(html).not.toContain('ci-x')
    expect(html).not.toContain('ci-y')
  })

  it('one rule for each block that has them', () => {
    const doc = published(site([block('x', 'container', {}, { stylesMobile: { backgroundColor: '#fafafa', color: '#111111' } }), block('y', 'container')]))
    expect(phoneRules(doc).filter((rule) => rule.selectorText.startsWith('.ci-')).map((rule) => rule.selectorText)).toEqual(['.ci-x'])
  })
})

describe('a phone style that tries to leave the stylesheet', () => {
  it('stays in it', () => {
    const value = 'red;}</style><script>window.bad=1</script><style>a{'
    const doc = published(site([block('x', 'container', {}, { stylesMobile: { backgroundColor: value } })]))
    expect(doc.querySelector('script:not([data-builder-interactive]):not([data-builder-layout])')).toBeNull()
    expect(doc.querySelector('.c-x')).not.toBeNull()
  })
})

describe('the writer of a page converted to HTML', () => {
  const written = (components, options) => open(schemaToResponsiveHtml(site(components), 'x', options))

  it.each([
    ['a heading', block('x', 'heading', {}, { props: { text: 'x', level: 'h2' } })],
    ['a card', block('x', 'card', {}, { props: { title: 't', text: 'x' } })],
    ['a button', block('x', 'button', {}, { props: { text: 'x', href: '#' } })],
    ['a container', block('x', 'container')],
    ['tabs', block('x', 'tabs', {}, { props: { tabs: [{ id: 'a', label: 'A' }], activeId: 'a' } })],
    ['an alert', block('x', 'alert', {}, { props: { text: 'x' } })],
    ['an accordion', block('x', 'accordion', {}, { props: { title: 't', text: 'x' } })],
    ['a navbar', block('x', 'navbar', {}, { props: { brand: 'b', links: [] } })],
    ['a section', block('x', 'section', {}, { props: { heading: 'h' } })],
    ['a section band', block('x', 'region')],
  ])('%s takes its phone background', (name, component) => {
    const doc = written([{ ...component, stylesMobile: PHONE }])
    const node = doc.getElementById('x')
    expect(onPhone(node, 'background-color')).toBe(FAFAFA)
    expect(onDesktop(node, 'background-color')).toBeNull()
  })

  it('a phone colour outranks the colour of the block', () => {
    const doc = written([block('x', 'container', { backgroundColor: '#fafafa' }, { stylesMobile: { backgroundColor: 'transparent' } })])
    expect(onPhone(doc.getElementById('x'), 'background-color')).toBe('transparent')
    expect(onDesktop(doc.getElementById('x'), 'background-color')).toBe('#fafafa')
  })

  it('a child inside another block', () => {
    const kid = block('kid', 'text', { color: '#111111' }, { props: { text: 'x' }, stylesMobile: { color: '#ff0000' } })
    for (const props of [{}, { flow: 'column' }]) {
      const doc = written([block('box', 'container', {}, { props, stylesMobile: PHONE, children: [kid] })])
      expect(onPhone(doc.getElementById('box'), 'background-color')).toBe(FAFAFA)
      expect(onPhone(doc.getElementById('kid'), 'color')).toBe(RED)
    }
  })

  it('a child of a band or a tab', () => {
    const kid = block('kid', 'text', { color: '#111111' }, { props: { text: 'x' }, tabId: 'a', stylesMobile: { color: '#ff0000' } })
    expect(onPhone(written([block('band', 'region', {}, { children: [kid] })]).getElementById('kid'), 'color')).toBe(RED)
    expect(onPhone(written([block('tabs', 'tabs', {}, { props: { tabs: [{ id: 'a', label: 'A' }], activeId: 'a' }, children: [kid] })]).getElementById('kid'), 'color')).toBe(RED)
  })

  it('an image, in both of its copies', () => {
    const doc = open(schemaToResponsiveHtml(site([block('x', 'image', {}, { props: { src: 'https://a.test/l.png', _otherSrc: 'https://a.test/d.png', _baseMode: 'light', _otherMode: 'dark', alt: 'x' }, stylesMobile: { opacity: '0.5' } })])))
    const images = [...doc.querySelectorAll('img')]
    expect(images).toHaveLength(2)
    for (const image of images) expect(onPhone(image, 'opacity')).toBe('0.5')
  })

  it('leaves the size of a block to the flow, as it does on a wide screen', () => {
    const doc = written([block('x', 'card', {}, { props: { title: 't' }, stylesMobile: { width: '50px', height: '50px', maxWidth: '50px', minHeight: '50px', display: 'inline', gap: '9px', objectFit: 'fill', color: '#ff0000' } })])
    const node = doc.getElementById('x')
    expect(phoneRules(doc).find((rule) => node.matches(rule.selectorText) && rule.style.getPropertyValue('color')).style.length).toBe(1)
  })

  it('writes nothing for a page without phone styles', () => {
    const html = schemaToResponsiveHtml(site([block('x', 'card', {}, { props: { title: 't' } })]))
    expect(html).not.toContain('rh-phone-')
    // Not even a blank line where the rules would be.
    expect(html).toMatch(/\.rh-wrap \{ gap: 24px; padding: 28px 0; \}\n\s*\}/)
  })

  it('stays in its stylesheet', () => {
    const doc = written([block('x', 'card', {}, { props: { title: 't' }, stylesMobile: { color: 'red;}</style><script>window.bad=1</script><style>a{' } })])
    expect(doc.querySelector('script:not([data-builder-interactive])')).toBeNull()
    expect(doc.getElementById('x')).not.toBeNull()
  })
})

// The answer withColorModeComponents gives for a child on the phone's surface
// (colorMode.test.js) used to stop at the published page. In the other palette a
// pale surface has dark muted text on it: on the page itself that text cannot be read.
describe('a colour judged on the phone surface', () => {
  const themed = (container) => ({
    theme: { ...DEFAULT_THEME, backgroundColor: '#ffffff', textColor: '#111111', mutedColor: '#54595f', surfaceColor: '#fafafa' },
    colorMode: { start: 'dark', theme: { backgroundColor: '#111317', surfaceColor: '#bbbbbb', textColor: '#e8edf4', mutedColor: '#111111' } },
    pages: [{ id: 'home', name: 'Home', components: [container] }],
  })
  const card = (color) => block('kid', 'card', { backgroundColor: 'rgba(255,0,0,.1)', color }, { props: { title: 'x' } })

  it('reaches the child when only the phone has the surface', () => {
    const html = publishedPagesFor(themed(block('box', 'container', {}, { stylesMobile: { backgroundColor: '#fafafa' }, children: [card('#54595f')] })))[0].html
    const node = open(html).querySelector('#kid').firstElementChild
    expect(onDesktop(node, 'color')).toBe('#54595f')
    expect(node.classList.contains('ci-kid')).toBe(true)
    // Read as written: jsdom loses the !important of a value with var() in it.
    expect(html).toContain('.ci-kid { color: var(--pwb-alt-muted, #54595f) !important; }')
  })

  it('reaches the child when the phone has no surface', () => {
    const doc = published(themed(block('box', 'container', { backgroundColor: '#fafafa' }, { stylesMobile: { backgroundColor: 'transparent' }, children: [card('#888888')] })))
    const node = doc.querySelector('#kid').firstElementChild
    expect(onDesktop(node, 'color')).toBe('var(--pwb-alt-muted, #888888)')
    expect(onPhone(node, 'color')).toBe('rgb(136, 136, 136)')
  })
})

// A navbar's phone menu and a section's button take their colours from the block,
// on a part of it that is written inline. A phone colour on the block has to reach
// them too, or the Renderer's dark text on a white menu is dark text on a dark one.
describe('the colours of a part of a block', () => {
  const BAR = { backgroundColor: '#111111', color: '#ffffff' }
  const LIGHT = { backgroundColor: '#ffffff', color: '#222222' }
  const bar = (extra = {}, props = {}) => block('x', 'navbar', BAR, { props: { brand: 'B', links: [{ label: 'H', href: '#' }], ...props }, stylesMobile: LIGHT, ...extra })
  const band = (extra = {}, props = {}) => block('x', 'section', BAR, { props: { heading: 'H', buttonText: 'Go', buttonHref: '#', ...props }, stylesMobile: LIGHT, ...extra })
  const WHITE = 'rgb(255, 255, 255)'
  const DARK = 'rgb(34, 34, 34)'
  const menuRules = (doc) => phoneRules(doc).filter((rule) => rule.selectorText.endsWith('nav-inner') && rule.style.getPropertyValue('--builder-nav-menu-bg') + rule.style.getPropertyValue('--rh-nav-menu-bg'))
  const buttonRules = (doc) => phoneRules(doc).filter((rule) => rule.selectorText.endsWith('> a'))

  describe.each([
    ['published', (component, extra) => published(site([component], {}, extra)), '.nav-inner', '.section-inner a', '--builder-nav-menu-bg'],
    ['converted to HTML', (component, extra) => open(schemaToResponsiveHtml(site([component], {}, extra))), '.rh-nav-inner', '.rh-section a', '--rh-nav-menu-bg'],
  ])('%s', (name, write, menu, button, variable) => {
    it('the menu takes the phone background', () => {
      const doc = write(bar())
      const inner = doc.querySelector(menu)
      expect(inlineValue(inner, variable)).toBe('#111111')
      const [rule] = menuRules(doc)
      expect(inner.matches(rule.selectorText)).toBe(true)
      expect(rule.style.getPropertyValue(variable)).toBe('#ffffff')
      expect(rule.style.getPropertyPriority(variable)).toBe('important')
    })

    it('a menu it does not have writes nothing', () => {
      // A script of the owner keeps every rule on the page, so nothing is tidied up after the writer.
      expect(menuRules(write(bar({}, { mobileNavMode: 'stack' }), { customJs: 'go()' }))).toEqual([])
      expect(menuRules(write(bar({}, { navLayout: 'vertical' }), { customJs: 'go()' }))).toEqual([])
    })

    it('a phone style that is not the background writes nothing for the menu', () => {
      expect(menuRules(write(bar({ stylesMobile: { color: '#222222' } })))).toEqual([])
    })

    it('the button takes the phone colours, as the Renderer draws them', () => {
      const component = band()
      const node = write(component).querySelector(button)
      const drawn = drawnOnPhone(component).querySelector('a')
      expect(inlineValue(drawn, 'background')).toBe('#222222')
      expect(inlineValue(drawn, 'color')).toBe('#ffffff')
      expect(onPhone(node, 'background')).toBe(DARK)
      expect(onPhone(node, 'color')).toBe(WHITE)
    })

    it('the button keeps what the phone does not change', () => {
      const component = band({ stylesMobile: { color: '#222222' } })
      const node = write(component).querySelector(button)
      expect(inlineValue(drawnOnPhone(component).querySelector('a'), 'color')).toBe('#111111')
      expect(onPhone(node, 'background')).toBe(DARK)
      expect(onPhone(node, 'color')).toBe('rgb(17, 17, 17)')
    })

    it('a button it does not have writes nothing', () => {
      expect(buttonRules(write(band({}, { buttonText: '' })))).toEqual([])
    })

    it('a phone style that is no colour writes nothing for the button', () => {
      expect(buttonRules(write(band({ stylesMobile: { fontSize: '14px' } })))).toEqual([])
    })

    it('a value that tries to leave the stylesheet stays in it', () => {
      const value = 'red;}</style><script>window.bad=1</script><style>a{'
      for (const component of [bar({ stylesMobile: { backgroundColor: value } }), band({ stylesMobile: { color: value } })]) {
        expect(write(component).querySelector('script:not([data-builder-interactive]):not([data-builder-layout])')).toBeNull()
      }
    })
  })

  it('the button of a section that fits its box', () => {
    const doc = published(site([band({}, { fit: 'box' })]))
    const node = doc.querySelector('.ci-x .section-inner a')
    expect(onPhone(node, 'background')).toBe(DARK)
    expect(onPhone(node, 'color')).toBe(WHITE)
  })

  it('the parts of a block inside another', () => {
    const doc = published(site([block('box', 'container', {}, { children: [band()] })]))
    const node = doc.querySelector('#x .section-inner a')
    expect(onPhone(node, 'background')).toBe(DARK)
    expect(onPhone(node, 'color')).toBe(WHITE)
  })

  it('on a flow page too', () => {
    const doc = published(site([band()], { flowMode: true }))
    expect(onPhone(doc.querySelector('.section-inner a'), 'background')).toBe(DARK)
    expect(menuRules(published(site([bar()], { flowMode: true })))).toHaveLength(1)
  })

  it('reaches the stylesheet of an exported project', () => {
    const css = schemaToFiles(site([bar()])).find((file) => file.name === 'styles.css').content
    expect(css).toContain('.c-x > .nav-inner { --builder-nav-menu-bg: #ffffff !important; }')
  })

  it('a phone colour that follows the palette keeps following it', () => {
    const themed = (component) => ({
      theme: { ...DEFAULT_THEME, headerColor: '#abcdef' },
      colorMode: { start: 'dark', theme: { backgroundColor: '#111317', headerColor: '#22262e' } },
      pages: [{ id: 'home', name: 'Home', components: [component] }],
    })
    const html = publishedPagesFor(themed(bar({ stylesMobile: { backgroundColor: '#abcdef' } })))[0].html
    expect(html).toContain('.c-x > .nav-inner { --builder-nav-menu-bg: var(--pwb-alt-header, #abcdef) !important; }')
  })
})
