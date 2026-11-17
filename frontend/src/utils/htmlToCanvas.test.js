// A measured HTML page becomes canvas blocks. The measurements here are
// written by hand, the way htmlPageMeasure.js reports them from a browser.
import { describe, expect, it } from 'vitest'
import { alphaOf, canvasFromMeasured, canvasPageFromMeasured, hexOf } from './htmlToCanvas.js'
import { sanitizeImageSrc } from './sanitize.js'

const CLEAR = 'rgba(0, 0, 0, 0)'
const BASE = {
  color: 'rgb(17, 24, 39)', backgroundColor: CLEAR, backgroundImage: 'none', backgroundSize: 'auto',
  fontSize: '16px', fontWeight: '400', fontFamily: 'Inter, sans-serif', fontStyle: 'normal',
  textAlign: 'start', textDecorationLine: 'none', textTransform: 'none', lineHeight: '24px',
  letterSpacing: 'normal', boxShadow: 'none', opacity: '1', objectFit: 'fill',
  paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px',
  borderTopWidth: '0px', borderRightWidth: '0px', borderBottomWidth: '0px', borderLeftWidth: '0px',
  borderTopStyle: 'none', borderRightStyle: 'none', borderBottomStyle: 'none', borderLeftStyle: 'none',
  borderTopColor: 'rgb(17, 24, 39)', borderRightColor: 'rgb(17, 24, 39)', borderBottomColor: 'rgb(17, 24, 39)', borderLeftColor: 'rgb(17, 24, 39)',
  borderTopLeftRadius: '0px', borderTopRightRadius: '0px', borderBottomRightRadius: '0px', borderBottomLeftRadius: '0px',
  listStyleType: 'disc', position: 'static', display: 'block',
}

const node = (tag, [x, y, w, h], extra = {}, s = {}) => ({ tag, rect: { x, y, w, h }, s: { ...BASE, ...s }, ...extra })
const text = (tag, rect, words, s = {}, extra = {}) => node(tag, rect, { kind: 'text', text: words, ...extra }, s)
const page = (kids, extra = {}) => ({
  width: 1200, height: 2000, background: ['rgb(250, 247, 242)', CLEAR], fontFamily: 'Inter, sans-serif',
  title: 'Olive', description: 'A café', language: 'tr', scripts: 0,
  root: node('body', [0, 0, 1200, 2000], { kids }),
  ...extra,
})

function convert(measured) {
  let n = 0
  return canvasFromMeasured(measured, { makeId: (type) => `${type}_${(n += 1)}` })
}

const TEXT_LOOK = { color: 'rgb(17, 24, 39)', fontSize: '16px', fontWeight: '400', fontFamily: 'Inter, sans-serif', textAlign: 'left', lineHeight: '24px', padding: '0px' }

describe('a full-width part of the page', () => {
  it('becomes a section holding its pieces where the browser drew them', () => {
    const result = convert(page([
      node('section', [0, 100, 1200, 400], {
        kids: [
          text('h1', [100, 160, 600, 60], 'Fresh bread', { fontSize: '48px', fontWeight: '700', lineHeight: '52.8px' }),
          text('p', [100, 240.4, 480, 48], 'Baked every morning.'),
        ],
      }, { backgroundColor: 'rgb(15, 23, 42)' }),
    ]))

    expect(result.components).toEqual([{
      id: 'region_3',
      type: 'region',
      props: { contentWidth: 1200 },
      styles: { backgroundColor: 'rgb(15, 23, 42)', overflow: 'hidden' },
      layout: { x: 0, y: 100, w: 1200, h: 400 },
      children: [
        {
          id: 'heading_1',
          type: 'heading',
          props: { text: 'Fresh bread', level: 'h1' },
          styles: { ...TEXT_LOOK, fontSize: '48px', fontWeight: '700', lineHeight: '52.8px' },
          layout: { x: 100, y: 60, w: 601, h: 60 },
        },
        {
          id: 'text_2',
          type: 'text',
          props: { text: 'Baked every morning.' },
          styles: TEXT_LOOK,
          layout: { x: 100, y: 140, w: 481, h: 48 },
        },
      ],
    }])
    expect(result.canvasWidth).toBe(1200)
    expect(result.background).toBe('#faf7f2')
    expect(result.report).toEqual({ native: 3, html: 0, tooLarge: 0, scripts: 0, hidden: 0 })
  })

  it('is looked through when it only wraps other full-width parts', () => {
    const result = convert(page([
      node('div', [0, 0, 1200, 900], {
        kids: [
          node('section', [0, 0, 1200, 300], { kids: [text('p', [40, 40, 300, 24], 'One')] }),
          node('section', [0, 300, 1200, 600], { kids: [text('p', [40, 340, 300, 24], 'Two')] }),
        ],
      }),
    ]))

    expect(result.components.map((c) => [c.type, c.layout.y, c.layout.h, c.children.length])).toEqual([
      ['region', 0, 300, 1],
      ['region', 300, 600, 1],
    ])
    // A section that paints nothing is still a section: its pieces move together.
    expect(result.components[0].styles.backgroundColor).toBe('transparent')
  })

  it('measures "full width" against the page, not the window with its scrollbar', () => {
    const measured = page([node('section', [0, 0, 1185, 300], { kids: [text('p', [40, 40, 300, 24], 'One')] })])
    measured.root.rect.w = 1185

    const result = convert(measured)

    expect(result.canvasWidth).toBe(1185)
    expect(result.components[0]).toMatchObject({ type: 'region', layout: { x: 0, y: 0, w: 1185, h: 300 }, props: { contentWidth: 1185 } })
  })
})

describe('a piece of text', () => {
  const inSection = (kid) => convert(page([node('section', [0, 0, 1200, 400], { kids: [kid] })])).components[0].children[0]

  it('is a heading for h1 to h3, and the smallest heading for h4 to h6', () => {
    expect(inSection(text('h2', [0, 0, 400, 40], 'Menu')).props).toEqual({ text: 'Menu', level: 'h2' })
    expect(inSection(text('h5', [0, 0, 400, 40], 'Small print')).props).toEqual({ text: 'Small print', level: 'h3' })
  })

  // A button block centres its words; a link, painted or not, keeps the
  // alignment its words were given (a menu of links set to the left).
  it('is text that carries its link when it is a link, painted or not, and a button only when it was one', () => {
    const painted = inSection(text('a', [40, 40, 160, 48], 'Order now', { backgroundColor: 'rgb(79, 70, 229)', color: 'rgb(255, 255, 255)', textAlign: 'left', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', borderBottomRightRadius: '8px', borderBottomLeftRadius: '8px' }, { href: '/order' }))
    expect(painted).toMatchObject({
      type: 'text',
      props: { text: 'Order now', href: '/order' },
      styles: { backgroundColor: 'rgb(79, 70, 229)', color: 'rgb(255, 255, 255)', borderRadius: '8px', textAlign: 'left' },
      layout: { x: 40, y: 40, w: 161, h: 48 },
    })

    const link = inSection(text('a', [40, 40, 60, 24], 'About', { textDecorationLine: 'underline' }, { href: '#about' }))
    expect(link).toMatchObject({ type: 'text', props: { text: 'About', href: '#about' }, styles: { textDecoration: 'underline' } })

    const button = inSection(text('button', [40, 40, 120, 40], 'Send', { backgroundColor: 'rgb(0, 0, 0)' }))
    expect(button).toMatchObject({ type: 'button', props: { text: 'Send', href: '', icon: '' }, styles: { textAlign: 'center' } })
  })

  it('keeps its padding to the hundredth, so a line that just fitted still fits', () => {
    const cell = inSection(text('th', [40, 40, 90, 39], 'Gerçek', { paddingTop: '7.2px', paddingRight: '12.6px', paddingBottom: '7.2px', paddingLeft: '12.6px' }))

    expect(cell.styles.padding).toBe('7.2px 12.6px 7.2px 12.6px')
  })

  it('keeps the look it was written in', () => {
    const quote = inSection(text('p', [0, 0, 400, 60], 'So good.', {
      fontStyle: 'italic', letterSpacing: '0.5px', textTransform: 'uppercase', textAlign: 'center', fontVariantNumeric: 'lining-nums tabular-nums',
      paddingTop: '8px', paddingRight: '16px', paddingBottom: '8px', paddingLeft: '16px',
      backgroundColor: 'rgb(254, 243, 199)', boxShadow: 'rgba(0, 0, 0, 0.1) 0px 1px 2px 0px', opacity: '0.8',
    }))

    expect(quote.styles).toEqual({
      ...TEXT_LOOK,
      textAlign: 'center',
      fontStyle: 'italic',
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      fontVariantNumeric: 'lining-nums tabular-nums',
      backgroundColor: 'rgb(254, 243, 199)',
      boxShadow: 'rgba(0, 0, 0, 0.1) 0px 1px 2px 0px',
      opacity: '0.8',
      padding: '8px 16px 8px 16px',
    })
  })
})

describe('words that are not in the middle of their element', () => {
  const inSection = (kid) => convert(page([node('section', [0, 0, 1200, 400], { kids: [kid] })])).components[0].children

  it('become a block where the words were drawn', () => {
    const tall = text('p', [40, 100, 300, 120], 'At the top', { paddingLeft: '12px', paddingTop: '6px' }, { ink: { x: 52, y: 106, w: 80, h: 24 } })

    expect(inSection(tall)).toMatchObject([{ type: 'text', layout: { x: 40, y: 106, w: 301, h: 24 }, styles: { padding: '0px 0px 0px 12px' } }])
  })

  it('leave their box behind them as a shape when it has a look of its own', () => {
    const cell = text('div', [40, 100, 300, 120], 'At the top', { backgroundColor: 'rgb(254, 243, 199)' }, { ink: { x: 40, y: 100, w: 80, h: 24 } })

    const made = inSection(cell)
    expect(made.map((c) => [c.type, c.layout])).toEqual([
      ['spacer', { x: 40, y: 100, w: 300, h: 120 }],
      ['text', { x: 40, y: 100, w: 301, h: 24 }],
    ])
    expect(made[0].styles).toEqual({ backgroundColor: 'rgb(254, 243, 199)' })
    expect(made[1].styles.backgroundColor).toBeUndefined()
  })

  it('stay one block when they are in the middle, as in a badge or a button', () => {
    const badge = text('span', [40, 100, 90, 28], 'New', { backgroundColor: 'rgb(254, 243, 199)' }, { ink: { x: 60, y: 103, w: 50, h: 22 } })
    const button = text('button', [40, 200, 160, 60], 'Order', { backgroundColor: 'rgb(79, 70, 229)' }, { ink: { x: 80, y: 200, w: 60, h: 20 } })

    expect(inSection(badge)).toMatchObject([{ type: 'text', layout: { x: 40, y: 100, w: 91, h: 28 }, styles: { backgroundColor: 'rgb(254, 243, 199)' } }])
    expect(inSection(button)).toMatchObject([{ type: 'button', layout: { x: 40, y: 200, w: 161, h: 60 } }])
  })
})

describe('a box with a look of its own', () => {
  const card = (kids, s = {}) => node('div', [100, 200, 300, 220], { kids }, { backgroundColor: 'rgb(255, 255, 255)', ...s })

  it('becomes a container, and what it holds is placed inside it', () => {
    const result = convert(page([node('section', [0, 150, 1200, 400], { kids: [card([text('h3', [120, 220, 260, 28], 'Sourdough')])] })]))

    const box = result.components[0].children[0]
    expect(box).toMatchObject({
      type: 'container',
      styles: { backgroundColor: 'rgb(255, 255, 255)', padding: '0px', borderRadius: '0px' },
      layout: { x: 100, y: 50, w: 300, h: 220 },
    })
    expect(box.children).toMatchObject([{ type: 'heading', props: { text: 'Sourdough', level: 'h3' }, layout: { x: 20, y: 20, w: 261, h: 28 } }])
  })

  it('draws a line for a border that is on one side only', () => {
    const result = convert(page([
      node('section', [0, 0, 1200, 80], { kids: [text('p', [40, 28, 200, 24], 'Olive')] }, { borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: 'rgb(229, 231, 235)' }),
    ]))

    // The canvas keeps no block thinner than 4px: the line is drawn 2px thick
    // at the bottom of a 4px box, so it ends where the section ends.
    expect(result.components[0].children.map((c) => [c.type, c.layout])).toEqual([
      ['text', { x: 40, y: 28, w: 201, h: 24 }],
      ['spacer', { x: 0, y: 76, w: 1200, h: 4 }],
    ])
    expect(result.components[0].children[1].styles).toEqual({
      backgroundImage: 'linear-gradient(rgb(229, 231, 235), rgb(229, 231, 235))',
      backgroundSize: '100% 2px',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'left bottom',
    })
  })

  it('with nothing inside it is a plain shape', () => {
    const bar = node('div', [100, 300, 240, 6], { kids: [] }, { backgroundColor: 'rgb(79, 70, 229)', borderTopLeftRadius: '3px', borderTopRightRadius: '3px', borderBottomRightRadius: '3px', borderBottomLeftRadius: '3px' })
    const result = convert(page([node('section', [0, 150, 1200, 400], { kids: [bar] })]))

    expect(result.components[0].children).toEqual([{
      id: 'spacer_1',
      type: 'spacer',
      props: {},
      styles: { backgroundColor: 'rgb(79, 70, 229)', borderRadius: '3px' },
      layout: { x: 100, y: 150, w: 240, h: 6 },
    }])
  })

  it('counts what it holds from inside its border', () => {
    const framed = card([text('p', [121, 221, 100, 24], 'Inside')], {
      borderTopWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderLeftWidth: '1px',
      borderTopStyle: 'solid', borderRightStyle: 'solid', borderBottomStyle: 'solid', borderLeftStyle: 'solid',
      borderTopColor: 'rgb(0, 0, 0)', borderRightColor: 'rgb(0, 0, 0)', borderBottomColor: 'rgb(0, 0, 0)', borderLeftColor: 'rgb(0, 0, 0)',
    })
    const result = convert(page([node('section', [0, 150, 1200, 400], { kids: [framed] })]))

    const box = result.components[0].children[0]
    expect(box.styles.border).toBe('1px solid rgb(0, 0, 0)')
    expect(box.children[0].layout).toEqual({ x: 20, y: 20, w: 101, h: 24 })
  })

  it('shows a background picture as an image under what it holds', () => {
    const result = convert(page([
      node('section', [0, 0, 1200, 500], { kids: [text('h1', [100, 200, 500, 60], 'Welcome')] }, { backgroundImage: 'url("https://example.com/hero.jpg")', backgroundSize: 'cover' }),
    ]))

    expect(result.components[0].children.map((c) => c.type)).toEqual(['image', 'heading'])
    expect(result.components[0].children[0]).toMatchObject({ props: { src: 'https://example.com/hero.jpg', alt: '' }, styles: { objectFit: 'cover' }, layout: { x: 0, y: 0, w: 1200, h: 500 } })
  })

  it('that is nested deeper than a section can hold is drawn, with its pieces laid over it', () => {
    const inner = node('div', [140, 260, 200, 100], { kids: [text('p', [150, 270, 100, 24], 'Deep')] }, { backgroundColor: 'rgb(243, 244, 246)' })
    const result = convert(page([node('section', [0, 150, 1200, 400], { kids: [card([inner])] })]))

    const box = result.components[0].children[0]
    expect(box.children.map((c) => [c.type, c.layout.x, c.layout.y, (c.children || []).length])).toEqual([
      ['spacer', 40, 60, 0],
      ['text', 50, 70, 0],
    ])
  })
})

describe('what the canvas has no block for', () => {
  it('is kept as an HTML block, and counted', () => {
    const result = convert(page([
      node('section', [0, 0, 1200, 400], { kids: [node('table', [40, 40, 600, 200], { kind: 'html', code: '<table><tr><td>1</td></tr></table>' })] }),
    ]))

    expect(result.components[0].children).toMatchObject([{ type: 'html', props: { code: '<table><tr><td>1</td></tr></table>' }, layout: { x: 40, y: 40, w: 601, h: 200 } }])
    expect(result.report).toMatchObject({ native: 1, html: 1, tooLarge: 0 })
  })

  it('is left out and counted when it is larger than a block can hold', () => {
    const result = convert(page([
      node('section', [0, 0, 1200, 400], { kids: [node('table', [40, 40, 600, 200], { kind: 'html', code: 'x'.repeat(51201) })] }),
    ]))

    expect(result.components[0].children).toEqual([])
    expect(result.report).toMatchObject({ html: 0, tooLarge: 1 })
  })
})

describe('pictures, lists and lines', () => {
  it('carry over as their own blocks, and a link around a picture stays on it', () => {
    const result = convert(page([
      node('section', [0, 0, 1200, 600], {
        kids: [
          node('a', [40, 40, 200, 120], { href: '/home', kids: [node('img', [40, 40, 200, 120], { kind: 'image', src: 'https://example.com/logo.png', alt: 'Olive' }, { objectFit: 'cover' })] }),
          node('ul', [40, 200, 300, 72], { kind: 'list', ordered: false, items: ['Rye', 'Wheat', 'Corn'] }),
          node('hr', [40, 300, 600, 2], { kind: 'line' }, { borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'rgb(209, 213, 219)' }),
        ],
      }),
    ]))

    expect(result.components[0].children).toMatchObject([
      { type: 'image', props: { src: 'https://example.com/logo.png', alt: 'Olive', href: '/home' }, styles: { objectFit: 'cover' }, layout: { x: 40, y: 40, w: 200, h: 120 } },
      { type: 'list', props: { text: 'Rye\nWheat\nCorn', ordered: '' } },
      { type: 'spacer', styles: { backgroundImage: 'linear-gradient(rgb(209, 213, 219), rgb(209, 213, 219))', backgroundSize: '100% 1px', backgroundPosition: 'left top' }, layout: { x: 40, y: 300, w: 600, h: 4 } },
    ])
  })
})

describe('a bar of links at the top', () => {
  const link = (x, words, href) => text('a', [x, 22, 60, 20], words, { color: 'rgb(55, 65, 81)', fontSize: '15px' }, { href })
  const header = (kids, s = {}) => node('header', [0, 0, 1200, 64], { kids }, { backgroundColor: 'rgb(255, 255, 255)', ...s })

  it('becomes a navbar, which folds into a menu on a phone', () => {
    const result = convert(page([header([
      text('#text', [32, 20, 80, 24], 'Olive'),
      node('nav', [900, 22, 268, 20], { kids: [link(900, 'Menu', '#menu'), link(1004, 'About', '#about'), link(1108, 'Contact', '#contact')] }),
    ], { position: 'sticky' })]))

    expect(result.components).toMatchObject([{
      type: 'navbar',
      props: {
        brand: 'Olive',
        links: [{ label: 'Menu', href: '#menu' }, { label: 'About', href: '#about' }, { label: 'Contact', href: '#contact' }],
        navLayout: 'horizontal', brandAlign: 'left', linksAlign: 'right', linkGap: 44, mobileNavMode: 'menu', widthMode: 'full',
        scrollBehavior: 'sticky',
      },
      styles: { backgroundColor: 'rgb(255, 255, 255)', color: 'rgb(55, 65, 81)', fontSize: '15px', padding: '0px 32px' },
      layout: { x: 0, y: 0, w: 1200, h: 64 },
    }])
  })

  it('stays a section when it holds something a navbar cannot show', () => {
    const logo = node('a', [32, 12, 120, 40], { href: '/', kids: [node('img', [32, 12, 120, 40], { kind: 'image', src: 'https://example.com/logo.png', alt: '' })] })
    const result = convert(page([header([logo, link(900, 'Menu', '#menu'), link(1004, 'About', '#about')])]))

    expect(result.components[0].type).toBe('region')
    expect(result.components[0].children.map((c) => c.type)).toEqual(['image', 'text', 'text'])
  })
})

describe('more pieces than one parent may hold', () => {
  it('are gathered into containers of their own, none of them lost', () => {
    const kids = Array.from({ length: 130 }, (_, index) => text('p', [40, 20 + index * 30, 300, 24], `Line ${index + 1}`))
    const result = convert(page([node('section', [0, 0, 1200, 4000], { kids })]))

    const groups = result.components[0].children
    expect(groups.map((g) => [g.type, g.children.length])).toEqual([['container', 40], ['container', 40], ['container', 40], ['container', 10]])
    expect(groups[1].layout).toEqual({ x: 40, y: 1220, w: 301, h: 1194 })
    expect(groups[1].children[0]).toMatchObject({ props: { text: 'Line 41' }, layout: { x: 0, y: 0 } })
    expect(groups.flatMap((g) => g.children.map((c) => c.props.text))).toHaveLength(130)
  })

  it('are gathered even when nearly all of them run down the whole box', () => {
    // Sixty bars and one label: setting the bars aside leaves as many pieces as before.
    const bars = Array.from({ length: 60 }, (_, index) => node('div', [index * 10, 0, 5, 100], {}, { backgroundColor: 'rgb(255, 0, 0)' }))
    const label = text('p', [700, 0, 40, 10], 'Label', { fontSize: '10px', lineHeight: '10px' })
    const result = convert(page([node('section', [0, 0, 1200, 120], { kids: [...bars, label] }, { backgroundColor: 'rgb(255, 255, 255)' })]))

    const groups = result.components[0].children
    expect(groups.map((g) => [g.type, g.children.length])).toEqual([['container', 40], ['container', 21]])
  })

  it('leave what runs down the whole box out of the groups, so no group lies over the others', () => {
    const kids = Array.from({ length: 70 }, (_, index) => text('p', [40, 20 + index * 30, 300, 24], `Line ${index + 1}`))
    const edge = node('div', [0, 0, 4, 2140], {}, { backgroundColor: 'rgb(216, 208, 191)' })
    const bottom = node('div', [0, 2136, 1200, 4], {}, { backgroundColor: 'rgb(216, 208, 191)' })
    const result = convert(page([node('section', [0, 0, 1200, 2140], { kids: [edge, ...kids, bottom] })]))

    const children = result.components[0].children
    expect(children.map((c) => [c.type, c.layout.y, c.layout.h])).toEqual([
      ['spacer', 0, 2140],
      ['spacer', 2136, 4],
      ['container', 20, 1194],
      ['container', 1220, 894],
    ])
  })
})

describe('colours and fonts', () => {
  it('reads how solid a colour is, and writes a page background as a hex', () => {
    expect(alphaOf('rgba(0, 0, 0, 0)')).toBe(0)
    expect(alphaOf('rgb(1, 2, 3)')).toBe(1)
    expect(alphaOf('rgba(1, 2, 3, 0.5)')).toBe(0.5)
    expect(hexOf('rgb(15, 23, 42)')).toBe('#0f172a')
    expect(hexOf('rgba(15, 23, 42, 0.4)')).toBe('#ffffff')
  })

  it('takes the page background from <html> when <body> has none', () => {
    expect(convert(page([], { background: [CLEAR, 'rgb(0, 0, 0)'] })).background).toBe('#000000')
  })

  it('hands on how many parts the page was not showing, and how many scripts it has', () => {
    expect(convert(page([], { hiddenParts: 12, scripts: 5 })).report).toEqual({ native: 0, html: 0, tooLarge: 0, scripts: 5, hidden: 12 })
  })

  it('hands on the web fonts the document asked for', () => {
    expect(convert(page([], { fonts: ['Fraunces:ital,wght@0,500;1,500', 'Inter'] })).fonts).toEqual(['Fraunces:ital,wght@0,500;1,500', 'Inter'])
    expect(convert(page([])).fonts).toEqual([])
  })
})

describe('an element that links lead to', () => {
  it('gives its id to its block as an anchor, once, and only an id the canvas can keep', () => {
    const result = convert(page([
      node('section', [0, 0, 1200, 400], {
        id: 'menu',
        kids: [
          text('h2', [40, 40, 400, 40], 'Menu', {}, { id: 'prices' }),
          text('p', [40, 100, 400, 24], 'Twice', {}, { id: 'prices' }),
          text('p', [40, 140, 400, 24], 'Odd', {}, { id: 'Not An Anchor' }),
        ],
      }),
    ]))

    const section = result.components[0]
    expect(section.props).toEqual({ contentWidth: 1200, anchor: 'menu' })
    expect(section.children.map((c) => c.props)).toEqual([
      { text: 'Menu', level: 'h2', anchor: 'prices' },
      { text: 'Twice' },
      { text: 'Odd' },
    ])
  })

  it('that has no look of its own hands its id to the first block made from what it held', () => {
    const result = convert(page([
      node('article', [340, 0, 600, 300], {
        id: 'hill',
        kids: [text('h2', [340, 40, 600, 40], 'Hill descending'), text('p', [340, 100, 600, 24], 'Step by step')],
      }),
      node('article', [340, 300, 600, 300], {
        id: 'lr',
        kids: [text('h2', [340, 340, 600, 40], 'Learning rate', {}, { id: 'lr-title' })],
      }),
    ]))

    expect(result.components.map((c) => [c.props.text, c.props.anchor])).toEqual([
      ['Hill descending', 'hill'],
      ['Step by step', undefined],
      // Its first block answers to an id of its own already.
      ['Learning rate', 'lr-title'],
    ])
  })
})

// A page that shows its chapters one at a time: each state the reader put it
// in is a reading of its own, with the ids that were on show in it.
describe('a page that shows its parts one at a time', () => {
  const side = () => node('aside', [0, 0, 300, 900], {
    kids: [text('a', [20, 30, 200, 24], 'Costs', {}, { href: '#costs' })],
  }, { backgroundColor: 'rgb(242, 237, 225)', position: 'fixed' })
  const footer = () => text('p', [340, 860, 400, 24], 'Notes 2026')
  const state = (kids, offKeys = []) => ({
    width: 1200, height: 900, viewHeight: 900, background: ['rgb(255, 255, 255)', CLEAR], fontFamily: 'Inter', title: 'Notes', description: '', language: 'en', offKeys,
    root: node('body', [0, 0, 1200, 900], { kids: [side(), ...kids, footer()] }),
  })
  const measured = (states, offKeys = []) => ({
    ...state([text('h1', [340, 40, 600, 60], 'Introduction', {}, { id: 'intro' })], offKeys),
    fonts: ['Fraunces:wght@500'],
    scripts: 2,
    states: states.map(([kids, off], index) => ({ label: `Part ${index + 2}`, data: state(kids, off) })),
  })
  function build(states, offKeys) {
    let n = 0
    return canvasPageFromMeasured(measured(states, offKeys), { makeId: (type) => `${type}_${(n += 1)}` })
  }
  const costs = () => [
    text('h1', [340, 40, 600, 60], 'Costs', {}, { id: 'costs' }),
    text('p', [340, 120, 600, 24], 'Also the intro', {}, { id: 'intro' }),
  ]

  it('stays one page, each part where it was drawn and shown by its own key, what all parts share once', () => {
    const page = build([[costs()]])

    expect(page.components.map((c) => [c.type, c.props.text ?? c.props.scrollBehavior, c.layout.y, c.props.shownBy])).toEqual([
      ['container', 'fixed', 0, undefined],
      ['text', 'Notes 2026', 860, undefined],
      ['heading', 'Introduction', 40, ['p0']],
      ['heading', 'Costs', 40, ['p1']],
      ['text', 'Also the intro', 120, ['p1']],
    ])
    expect(page.parts).toEqual([{ key: 'p0', label: 'Introduction' }, { key: 'p1', label: 'Part 2' }])
    expect(page.hiddenKeys).toEqual(['p1'])
    expect(page.partCount).toBe(2)
    expect(page.fonts).toEqual(['Fraunces:wght@500'])
    expect(page.report).toMatchObject({ native: 6, html: 0, hidden: 0, scripts: 2 })
  })

  it('keeps one block per anchor, so a link to a part finds the part', () => {
    const page = build([[costs()]])

    expect(page.components[0].children.find((c) => c.props.href).props.href).toBe('#costs')
    expect(page.components.map((c) => c.props.anchor)).toEqual([undefined, undefined, 'intro', 'costs', undefined])
  })

  it('opens with what a click shows hidden, in the part it opens on and in every other', () => {
    const page = build([[costs(), ['k2', 'k1']]], ['k1'])

    expect(page.hiddenKeys).toEqual(['p1', 'k1', 'k2'])
  })

  it('is the page as it opened when it hides nothing a link leads to', () => {
    const page = build([], ['k1'])

    expect(page.parts).toEqual([])
    expect(page.hiddenKeys).toEqual(['k1'])
    expect(page.components).toHaveLength(3)
  })
})

describe('what a click on the page shows and hides', () => {
  it('rides on every block made from the element it was learnt on', () => {
    const result = convert(page([
      node('div', [340, 100, 600, 80], { keys: ['k1'], kids: [text('p', [340, 100, 600, 24], 'Square the errors.'), text('p', [340, 140, 600, 24], 'Then add them.')] }),
      text('button', [340, 200, 120, 32], 'Next step', {}, { actions: [{ do: 'next', keys: ['k1', 'k2'] }] }),
      node('div', [340, 260, 600, 80], { keys: ['k3'], kids: [text('p', [340, 270, 600, 24], 'Inside a box', {}, { keys: ['k4'] })] }, { backgroundColor: 'rgb(255, 253, 248)' }),
    ]))

    expect(result.components.map((c) => [c.props.text ?? c.type, c.props.shownBy, c.props.onClick])).toEqual([
      ['Square the errors.', ['k1'], undefined],
      ['Then add them.', ['k1'], undefined],
      ['Next step', undefined, [{ do: 'next', keys: ['k1', 'k2'] }]],
      ['container', ['k3'], undefined],
    ])
    // A block inside a box keeps its own key; the box's hides it with the box.
    expect(result.components[3].children[0].props.shownBy).toEqual(['k4'])
  })

  it('carries the room its element took on the topmost of its blocks, counted from the top of the element', () => {
    const result = convert(page([
      node('li', [340, 100, 600, 90], { keys: ['k1'], room: 102, kids: [text('h5', [380, 110, 400, 24], 'Square the errors.'), text('p', [380, 140, 400, 48], 'Then add them.')] }),
    ]))

    expect(result.components.map((c) => c.props.rooms)).toEqual([[['k1', 10, 102]], [['k1', 0, 0]]])
  })
})

describe('a field of the page', () => {
  const field = (tag, rect, field, s = {}) => node(tag, rect, { kind: 'field', field }, {
    backgroundColor: 'rgb(255, 253, 248)', color: 'rgb(31, 35, 40)', fontSize: '16.56px', fontFamily: 'Etiket, sans-serif',
    paddingTop: '7.56px', paddingRight: '10.8px', paddingBottom: '7.56px', paddingLeft: '10.8px',
    borderTopWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderLeftWidth: '1px',
    borderTopStyle: 'solid', borderRightStyle: 'solid', borderBottomStyle: 'solid', borderLeftStyle: 'solid',
    borderTopColor: 'rgb(143, 134, 114)', borderRightColor: 'rgb(143, 134, 114)', borderBottomColor: 'rgb(143, 134, 114)', borderLeftColor: 'rgb(143, 134, 114)',
    borderTopLeftRadius: '4px', borderTopRightRadius: '4px', borderBottomRightRadius: '4px', borderBottomLeftRadius: '4px',
    ...s,
  })
  const inSection = (kid) => convert(page([node('section', [0, 0, 1200, 400], { kids: [kid] })])).components[0].children[0]

  it('is the canvas input block, drawn as the page drew it', () => {
    expect(inSection(field('input', [23, 123, 239, 41.2], { type: 'search', placeholder: 'örnek: RMSE', options: [], prompt: '' }))).toMatchObject({
      type: 'input',
      props: {
        label: '', placeholder: 'örnek: RMSE', inputType: 'search',
        fieldBackgroundColor: 'rgb(255, 253, 248)', fieldColor: 'rgb(31, 35, 40)',
        fieldBorderColor: 'rgb(143, 134, 114)', fieldBorderWidth: '1px', fieldBorderRadius: '4px',
        fieldPadding: '7.56px 10.8px 7.56px 10.8px', fieldHeight: '41.2px', fieldFontSize: '16.56px',
      },
      styles: { fontFamily: 'Etiket, sans-serif', fontSize: '16.56px', color: 'rgb(31, 35, 40)' },
      layout: { x: 23, y: 123, w: 239, h: 42 },
    })
  })

  it('is the canvas select block with its choices, and its prompt as the placeholder', () => {
    const select = inSection(field('select', [40, 40, 200, 40], { type: 'select', placeholder: '', options: ['MSE', 'MAE'], prompt: 'Seçin' }))

    expect(select).toMatchObject({ type: 'select', props: { options: 'MSE\nMAE', placeholder: 'Seçin' } })
    expect(select.props.inputType).toBeUndefined()
  })
})

describe('a box the page keeps in place on the screen', () => {
  const side = (s = {}) => node('aside', [0, 0, 300, 900], {
    kids: [text('a', [20, 30, 200, 48], '2021 ve 2023 Vize Çözümleri', {}, { href: '#giris' })],
  }, { backgroundColor: 'rgb(242, 237, 225)', position: 'fixed', ...s })

  it('stays down the side of the screen, at any screen height, and is hidden on a phone', () => {
    const [panel] = convert(page([side()], { viewHeight: 900 })).components
    expect(panel.type).toBe('container')
    expect(panel.props).toEqual({ scrollBehavior: 'fixed', pinX: 'left', pinY: 'top', pinOffsetX: 0, pinOffsetY: 0, pinHeight: 'full' })
    expect(panel.styles.height).toBe('100%')
    expect(panel.hiddenMobile).toBe(true)
    expect(panel.layout).toEqual({ x: 0, y: 0, w: 300, h: 900 })
  })

  it('keeps a small fixed box at its distance from the screen corner it sat in', () => {
    const button = node('div', [1080, 800, 100, 60], {
      kids: [text('a', [1090, 815, 80, 30], 'Yukarı', {}, { href: '#top' })],
    }, { backgroundColor: 'rgb(31, 78, 140)', position: 'fixed' })
    const [box] = convert(page([button], { viewHeight: 900 })).components
    expect(box.props).toEqual({ scrollBehavior: 'fixed', pinX: 'right', pinY: 'bottom', pinOffsetX: 20, pinOffsetY: 40 })
    expect(box.hiddenMobile).toBeUndefined()
  })

  it('leaves a box that scrolls with the page where it is', () => {
    const [panel] = convert(page([side({ position: 'static' })], { viewHeight: 900 })).components
    expect(panel.props.scrollBehavior).toBeUndefined()
    expect(panel.hiddenMobile).toBeUndefined()
  })

  it('preserves fixed and sticky pinning on root leaves, unpainted fixed wrappers, sticky regions, and bare shapes', () => {
    const measured = page([
      text('button', [1120, 800, 56, 56], '+', { position: 'fixed', backgroundColor: 'rgb(37, 99, 235)', color: 'rgb(255, 255, 255)' }),
      node('div', [20, 100, 220, 180], {
        kids: [text('div', [20, 100, 220, 180], 'Floating card', { backgroundColor: 'rgb(241, 245, 249)' })],
      }, { position: 'fixed' }),
      node('header', [0, 0, 1200, 64], {
        kids: [text('span', [24, 20, 120, 24], 'StickyBrand', { color: 'rgb(255, 255, 255)' })],
      }, { position: 'sticky', backgroundColor: 'rgb(15, 23, 42)' }),
      node('div', [20, 20, 80, 10], {}, { position: 'fixed', backgroundColor: 'rgb(239, 68, 68)' }),
    ], { viewHeight: 900 })
    const result = convert(measured)
    const fab = result.components.find((c) => c.type === 'button' && c.props.text === '+')
    const floating = result.components.find((c) => JSON.stringify(c).includes('Floating card'))
    const header = result.components.find((c) => c.type === 'region' && JSON.stringify(c).includes('StickyBrand'))
    const bar = result.components.find((c) => c.type === 'spacer' && c.layout.w === 80)

    expect(fab.props.scrollBehavior).toBe('fixed')
    expect(floating.props.scrollBehavior).toBe('fixed')
    expect(header.props.scrollBehavior).toBe('sticky')
    expect(bar.props.scrollBehavior).toBe('fixed')
  })
})

describe('converted canvas fidelity regressions', () => {
  it('converts a button with an SVG icon and text span into a native button block', () => {
    const result = convert(page([
      node('button', [40, 40, 140, 42], {
        kids: [
          node('svg', [50, 50, 18, 18], { kind: 'image', src: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }),
          text('span', [76, 50, 80, 20], 'Run', { color: 'rgb(255, 255, 255)' }),
        ],
      }, { backgroundColor: 'rgb(37, 99, 235)', color: 'rgb(255, 255, 255)' }),
    ]))
    expect(result.components).toHaveLength(1)
    expect(result.components[0]).toMatchObject({
      type: 'button',
      props: { text: 'Run' },
      styles: { backgroundColor: 'rgb(37, 99, 235)', color: 'rgb(255, 255, 255)' },
    })
  })

  it('keeps fitChildren within server MAX_NESTING_DEPTH = 4 even when >60 cards each hold >2400 blocks', () => {
    const depthOf = (list, d = 0) => list.reduce((mx, c) => Math.max(mx, d, ...(c.children?.length ? [depthOf(c.children, d + 1)] : [])), d)
    const cards = Array.from({ length: 65 }, (_, k) => node(
      'div',
      [20 + (k % 5) * 220, 40 + Math.floor(k / 5) * 140, 200, 120],
      {
        kids: Array.from({ length: 2450 }, (_, i) => text(
          'div',
          [24 + (i % 10) * 16, 44 + Math.floor(i / 10) * 10, 14, 8],
          `${i}`,
          { backgroundColor: 'rgb(241, 245, 249)' },
        )),
      },
      { backgroundColor: 'rgb(255, 255, 255)' },
    ))
    const result = convert(page([node('section', [0, 0, 1200, 2200], { kids: cards }, { backgroundColor: 'rgb(226, 232, 240)' })]))
    expect(depthOf(result.components)).toBeLessThanOrEqual(4)
  }, 20000) // About 1.5 s alone: 65 cards of 2,400 blocks. CI runs it beside the rest of the suite.

  it('normalizes valid mixed-case HTML ids to lowercase anchors and retargets matching links', () => {
    const result = convert(page([
      text('h2', [40, 40, 400, 40], 'About Us', { fontSize: '28px' }, { id: 'aboutUs' }),
      text('a', [40, 100, 160, 24], 'Jump', { color: 'rgb(37, 99, 235)' }, { href: '#aboutUs' }),
    ]))
    const heading = result.components.find((c) => c.type === 'heading')
    const link = result.components.find((c) => c.type === 'text')
    expect(heading.props.anchor).toBe('aboutus')
    expect(link.props.href).toBe('#aboutus')
  })

  it('deduplicates fixed navigation chrome across states when active item emphasis changes', () => {
    const makeNav = (active) => node('nav', [0, 0, 260, 900], {
      kids: [0, 1].map((i) => text('a', [20, 40 + i * 40, 200, 30], `Chapter ${i + 1}`, {
        color: i === active ? 'rgb(37, 99, 235)' : 'rgb(71, 85, 105)',
        fontWeight: i === active ? '700' : '400',
      }, { href: `#ch${i}` })),
    }, { position: 'fixed', backgroundColor: 'rgb(248, 250, 252)' })
    const makeDoc = (idx) => page([makeNav(idx), text('h1', [300, 40, 600, 50], `Content ${idx + 1}`)], { viewHeight: 900 })
    const result = canvasPageFromMeasured({
      ...makeDoc(0),
      states: [{ label: 'Ch2', data: makeDoc(1) }],
    })
    const navs = result.components.filter((c) => JSON.stringify(c).includes('Chapter 1'))
    expect(navs).toHaveLength(1)
    expect(navs[0].props.shownBy).toBeUndefined()
  })

  it('formats elliptical border-radius with CSS slash syntax and emits edgeLines on unpainted and flattened boxes', () => {
    const result = convert(page([
      node('div', [40, 40, 500, 180], {
        kids: [
          node('tr', [56, 60, 468, 36], {
            kids: [text('td', [56, 66, 200, 24], 'Row 1')],
          }, {
            borderBottomWidth: '1px',
            borderBottomStyle: 'solid',
            borderBottomColor: 'rgb(216, 208, 191)',
          }),
          node('div', [56, 110, 468, 50], {
            kids: [
              node('div', [56, 110, 468, 50], {
                kids: [text('p', [70, 122, 300, 24], 'Step detail')],
              }, {
                backgroundColor: 'rgb(255, 253, 248)',
                borderLeftWidth: '3px',
                borderLeftStyle: 'solid',
                borderLeftColor: 'rgb(31, 78, 140)',
              }),
            ],
          }, { backgroundColor: 'rgb(248, 244, 234)' }),
        ],
      }, {
        backgroundColor: 'rgb(255, 255, 255)',
        borderTopLeftRadius: '14px 18px',
        borderTopRightRadius: '22px 12px',
        borderBottomRightRadius: '12px 20px',
        borderBottomLeftRadius: '18px 14px',
      }),
    ]))

    const card = result.components[0]
    expect(card.styles.borderRadius).toBe('14px 22px 12px 18px / 18px 12px 20px 14px')
    const spacers = JSON.stringify(card.children)
    expect(spacers).toContain('linear-gradient(rgb(216, 208, 191), rgb(216, 208, 191))')
    expect(spacers).toContain('linear-gradient(rgb(31, 78, 140), rgb(31, 78, 140))')
  })

  it('keeps flashcards and multi-part quiz option buttons as containers instead of flattening them into centered buttons', () => {
    const result = convert(page([
      node('button', [40, 40, 280, 160], {
        actions: [{ do: 'flip', keys: ['k1', 'k2'] }],
        kids: [
          text('span', [56, 56, 240, 40], 'Soru yüzü', {}, { keys: ['k1'] }),
          text('span', [56, 56, 240, 60], 'Cevap yüzü', {}, { keys: ['k2'] }),
        ],
      }, { backgroundColor: 'rgb(255, 253, 248)' }),
      node('button', [360, 40, 480, 56], {
        actions: [{ do: 'show', keys: ['k3'] }],
        kids: [
          text('span', [376, 54, 28, 28], 'A)', { fontWeight: '700' }),
          text('span', [412, 54, 300, 28], 'Validation hatası en düşük olan model'),
        ],
      }, { backgroundColor: 'rgb(255, 253, 248)' }),
    ]))

    expect(result.components.map((c) => [c.type, c.props.onClick?.[0]?.do, c.children.length])).toEqual([
      ['container', 'flip', 2],
      ['container', 'show', 2],
    ])
    expect(result.components[0].children.map((c) => [c.props.text, c.props.shownBy])).toEqual([
      ['Soru yüzü', ['k1']],
      ['Cevap yüzü', ['k2']],
    ])
  })

  it('deduplicates fixed sidebar chrome when progress counters change across states and takes chapter title from content h1', () => {
    const makeSidebar = (step) => node('aside', [0, 0, 280, 900], {
      kids: [
        text('h2', [20, 20, 220, 28], 'Sidebar Title'),
        text('span', [20, 56, 120, 18], `${step} / 2 tamamlandı`),
        node('div', [20, 80, 100 * step, 6], {}, { backgroundColor: 'rgb(31, 78, 140)' }),
        text('a', [20, 110, 220, 28], '1. Giriş', {}, { href: '#giris' }),
        text('a', [20, 144, 220, 28], '2. Metrikler', {}, { href: '#metrikler' }),
      ],
    }, { position: 'fixed', backgroundColor: 'rgb(242, 237, 225)' })
    const state0 = page([makeSidebar(0), text('h1', [320, 40, 600, 48], 'Hata Metrikleri', {}, { id: 'giris' })], { viewHeight: 900 })
    const state1 = page([makeSidebar(1), text('h1', [320, 40, 600, 48], 'Sınıflandırma', {}, { id: 'metrikler' })], { viewHeight: 900 })
    const result = canvasPageFromMeasured({
      ...state0,
      states: [{ label: '2. Metrikler', data: state1 }],
    })

    const sidebars = result.components.filter((c) => c.type === 'container' && c.props.scrollBehavior === 'fixed')
    expect(sidebars).toHaveLength(1)
    expect(sidebars[0].props.shownBy).toBeUndefined()
    expect(result.parts[0]).toEqual({ key: 'p0', label: 'Hata Metrikleri' })
  })

  it('keeps a full-height side menu full height when a horizontal scrollbar shortens it to 885 of 900px', () => {
    const [panel] = convert(page([
      node('aside', [0, 0, 300, 885], {
        kids: [text('a', [20, 30, 200, 48], 'Giriş', {}, { href: '#giris' })],
      }, { backgroundColor: 'rgb(242, 237, 225)', position: 'fixed' }),
    ], { viewHeight: 900 })).components
    expect(panel.props.pinHeight).toBe('full')
    expect(panel.styles.height).toBe('100%')
  })

  it('writes one shared side menu when some parts measure it shorter under a horizontal scrollbar', () => {
    const makeSidebar = (height) => node('aside', [0, 0, 300, height], {
      kids: [
        text('a', [20, 110, 220, 28], '1. Giriş', {}, { href: '#giris' }),
        text('a', [20, 144, 220, 28], '2. Metrikler', {}, { href: '#metrikler' }),
        text('a', [20, 178, 220, 28], '3. Sınav', {}, { href: '#sinav' }),
      ],
    }, { position: 'fixed', backgroundColor: 'rgb(242, 237, 225)' })
    const chapter = (height, title, id) => page([
      makeSidebar(height),
      text('h1', [320, 40, 600, 48], title, {}, { id }),
    ], { viewHeight: 900 })
    const result = canvasPageFromMeasured({
      ...chapter(900, 'Giriş', 'giris'),
      states: [
        { label: 'Metrikler', data: chapter(885, 'Metrikler', 'metrikler') },
        { label: 'Sınav', data: chapter(900, 'Sınav', 'sinav') },
      ],
    })

    const menus = result.components.filter((c) => c.props.scrollBehavior === 'fixed')
    expect(menus).toHaveLength(1)
    expect(menus[0].props.shownBy).toBeUndefined()
    expect(menus[0].props.pinHeight).toBe('full')
  })
})

// The reader reads the page again at a phone's width (htmlPageMeasure.js
// readPhone): `m` is where a node stood there, `ms` the styles that changed.
describe('a page read at a phone\'s width too', () => {
  const phonePage = (kids) => page(kids, {
    phone: { width: 390, height: 1400 },
    root: node('body', [0, 0, 1200, 2000], { kids, m: { x: 0, y: 0, w: 390, h: 1400 } }),
  })

  it('puts each block where the page put it on a phone, in its parent\'s phone box', () => {
    const result = convert(phonePage([
      node('section', [0, 100, 1200, 300], {
        m: { x: 0, y: 60, w: 390, h: 500 },
        kids: [
          text('p', [40, 140, 500, 24], 'Left column', {}, { m: { x: 16, y: 76, w: 358, h: 48 } }),
          text('p', [600, 140, 500, 24], 'Right column', {}, { m: { x: 16, y: 140, w: 358, h: 48 } }),
        ],
      }),
    ]))

    const [section] = result.components
    expect(section.mobileLayout).toEqual({ x: 0, y: 60, w: 390, h: 500 })
    expect(section.children.map((c) => c.mobileLayout)).toEqual([
      { x: 16, y: 16, w: 358, h: 48 },
      { x: 16, y: 80, w: 358, h: 48 },
    ])
    expect(result.mobileWidth).toBe(390)
    // Nothing used only while building is left on the blocks.
    expect(JSON.stringify(result.components)).not.toMatch(/"_(from|drawn|phone|styleFrom)"/)
  })

  it('hides on the phone what the page does not show there, and what that holds', () => {
    const result = convert(phonePage([
      node('section', [0, 0, 1200, 300], {
        m: { x: 0, y: 0, w: 390, h: 300 },
        kids: [
          node('div', [40, 40, 500, 100], {
            m: { hidden: true },
            kids: [text('a', [40, 40, 80, 24], 'Home', {}, { href: '#home', m: { x: 0, y: 0, w: 80, h: 24 } })],
          }, { backgroundColor: 'rgb(238, 238, 238)' }),
          text('p', [600, 40, 300, 24], 'Brand', {}, { m: { x: 16, y: 16, w: 300, h: 24 } }),
        ],
      }),
    ]))

    const kids = result.components[0].children
    const hidden = (list) => list.flatMap((c) => [c, ...hidden(c.children || [])]).filter((c) => c.hiddenMobile)
    expect(hidden(kids).map((c) => c.props.text || c.type)).toEqual(expect.arrayContaining(['Home']))
    expect(kids.find((c) => c.props.text === 'Brand').hiddenMobile).toBeUndefined()
    expect(kids.find((c) => c.props.text === 'Brand').mobileLayout).toEqual({ x: 16, y: 16, w: 300, h: 24 })
  })

  it('keeps a list item\'s number beside the item\'s first line, the size it was, in the item\'s font', () => {
    const result = convert(phonePage([
      node('section', [0, 0, 1200, 400], {
        m: { x: 0, y: 0, w: 390, h: 600 },
        kids: [
          node('li', [80, 100, 600, 48], {
            m: { x: 40, y: 300, w: 310, h: 96 },
            ms: { fontSize: '15px', lineHeight: '22px' },
            kids: [
              text('span', [54, 100, 22, 24], '2.', { textAlign: 'right' }),
              text('p', [80, 100, 600, 48], 'An item that runs to two lines on a desktop and four on a phone.', {}, { m: { x: 40, y: 300, w: 310, h: 96 }, ms: { fontSize: '15px', lineHeight: '22px' } }),
            ],
          }),
        ],
      }),
    ]))

    const all = (list) => list.flatMap((c) => [c, ...all(c.children || [])])
    const number = all(result.components).find((c) => c.props?.text === '2.')
    // 26 px left of the item and level with its top, as on the desktop; not
    // stretched over the item's four lines.
    expect(number.mobileLayout).toEqual({ x: 14, y: 300, w: 23, h: 24 })
    expect(number.stylesMobile).toEqual({ fontSize: '15px', lineHeight: '22px' })
  })

  it('gives a block the text size and padding the page gives it on a phone', () => {
    const result = convert(phonePage([
      node('section', [0, 0, 1200, 300], {
        m: { x: 0, y: 0, w: 390, h: 300 },
        kids: [
          text('h1', [40, 40, 600, 80], 'Title of the page', { fontSize: '48px', lineHeight: '56px', paddingTop: '12px', paddingRight: '24px', paddingBottom: '12px', paddingLeft: '24px' }, {
            m: { x: 16, y: 16, w: 358, h: 100 },
            ms: { fontSize: '30px', lineHeight: '36px', paddingRight: '8px', paddingLeft: '8px' },
          }),
        ],
      }),
    ]))

    const [title] = result.components[0].children
    expect(title.styles).toMatchObject({ fontSize: '48px', padding: '12px 24px 12px 24px' })
    expect(title.stylesMobile).toEqual({ fontSize: '30px', lineHeight: '36px', padding: '12px 8px 12px 8px' })
  })

  it('hides on the desktop what the page shows only on a phone, and puts it where the phone shows it', () => {
    const result = convert(phonePage([
      node('section', [0, 0, 1200, 300], {
        m: { x: 0, y: 0, w: 390, h: 400 },
        kids: [
          text('p', [40, 40, 500, 24], 'On both', {}, { m: { x: 16, y: 60, w: 358, h: 48 } }),
          node('div', [16, 8, 358, 40], {
            phoneOnly: true,
            m: { x: 16, y: 8, w: 358, h: 40 },
            kids: [text('button', [24, 12, 120, 32], 'Contents', { backgroundColor: 'rgb(0, 0, 0)' }, { m: { x: 24, y: 12, w: 120, h: 32 } })],
          }, { backgroundColor: 'rgb(238, 238, 238)' }),
        ],
      }),
    ]))

    const all = (list) => list.flatMap((c) => [c, ...all(c.children || [])])
    const blocks = all(result.components)
    const contents = blocks.find((c) => c.props?.text === 'Contents')
    expect(contents.hidden).toBe(true)
    expect(contents.hiddenMobile).toBeUndefined()
    const bar = blocks.find((c) => c.type === 'container')
    expect(bar.children).toEqual([contents])
    expect(bar.mobileLayout).toEqual({ x: 16, y: 8, w: 358, h: 40 })
    expect(contents.mobileLayout).toEqual({ x: 8, y: 4, w: 120, h: 32 })
    expect(blocks.find((c) => c.props?.text === 'On both').hidden).toBeUndefined()
    // Its blocks stand at their phone layout on a phone, not at the desktop
    // drawing scaled down.
    expect(bar.props.phoneLayout).toBe(true)
    // The bar's paint is hidden on the desktop as well.
    expect(blocks.filter((c) => c.styles?.backgroundColor === 'rgb(238, 238, 238)').map((c) => c.hidden)).toEqual([true])
    expect(result.components[0].hidden).toBeUndefined()
  })

  it('leaves the phone layout to be worked out when the page was not read at a phone\'s width', () => {
    const result = convert(page([
      node('section', [0, 0, 1200, 300], { kids: [
        text('p', [40, 40, 500, 24], 'Only a desktop reading'),
        node('div', [40, 100, 300, 120], { kids: [text('p', [60, 120, 200, 24], 'In a card')] }, { backgroundColor: 'rgb(238, 238, 238)' }),
      ] }),
    ]))
    const all = (list) => list.flatMap((c) => [c, ...all(c.children || [])])
    // A card without a phone reading is drawn scaled on the phone, as before.
    expect(all(result.components).find((c) => c.type === 'container').props.phoneLayout).toBeUndefined()

    expect(result.mobileWidth).toBeUndefined()
    expect(result.components[0].mobileLayout).toBeUndefined()
    expect(result.components[0].children[0].mobileLayout).toBeUndefined()
  })
})

// AI-written pages often write an SVG straight into the address:
// "data:image/svg+xml;utf8,<svg …>". The published page (sanitizeImageSrc)
// and the server take a data: picture only base64-encoded, so such a
// picture used to vanish from the published page.
describe('a picture written into the page as a data: address', () => {
  const RECT = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 4'><rect width='4' height='4' fill='#c86b3c'/></svg>"
  const RECT_64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA0IDQnPjxyZWN0IHdpZHRoPSc0JyBoZWlnaHQ9JzQnIGZpbGw9JyNjODZiM2MnLz48L3N2Zz4='
  const picture = (src) => node('img', [40, 40, 200, 120], { kind: 'image', src, alt: 'A square' })
  const blocksOf = (kids) => {
    const all = (list) => list.flatMap((c) => [c, ...all(c.children || [])])
    return all(convert(page([node('section', [0, 0, 1200, 400], { kids })])).components)
  }

  it('is carried base64-encoded, so the published page keeps it', () => {
    const [escaped] = blocksOf([picture(`data:image/svg+xml;utf8,${encodeURIComponent(RECT)}`)]).filter((c) => c.type === 'image')
    expect(escaped.props.src).toBe(RECT_64)
    expect(sanitizeImageSrc(escaped.props.src)).toBe(RECT_64)

    const [plain] = blocksOf([picture(`data:image/svg+xml,${RECT.replace('#', '%23')}`)]).filter((c) => c.type === 'image')
    expect(plain.props.src).toBe(RECT_64)
  })

  it('keeps letters beyond ASCII and leaves an address that is already base64 alone', () => {
    const [letters] = blocksOf([picture(`data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"><text>ş</text></svg>')}`)]).filter((c) => c.type === 'image')
    expect(letters.props.src).toBe('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjx0ZXh0PsWfPC90ZXh0Pjwvc3ZnPg==')

    const [kept] = blocksOf([picture(RECT_64)]).filter((c) => c.type === 'image')
    expect(kept.props.src).toBe(RECT_64)
  })

  it('is carried base64-encoded behind a box and inside a line of text too', () => {
    const behind = blocksOf([node('div', [40, 40, 300, 200], { kids: [text('p', [60, 60, 200, 24], 'Over the picture')] }, { backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(RECT)}")` })])
    expect(behind.filter((c) => c.type === 'image').map((c) => c.props.src)).toEqual([RECT_64])

    const inline = blocksOf([text('p', [40, 40, 400, 24], 'A square here', {}, { runs: [{ t: 'A square ' }, { img: `data:image/svg+xml;utf8,${encodeURIComponent(RECT)}`, w: 16, h: 16, va: 0, alt: '' }, { t: ' here' }] })])
    expect(inline.find((c) => c.type === 'text').props.rich[1].img).toBe(RECT_64)
  })
})
