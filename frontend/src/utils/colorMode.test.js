// Light and dark: which colours follow the other palette, what the published
// page carries for it, and that a site without a switch is written as before.
import { afterEach, describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  colorModeCss,
  colorModeFor,
  colorModeHeadTags,
  colorModeScript,
  contrastProblems,
  hasThemeToggle,
  pagesWithoutThemeToggle,
  parseColor,
  viewColorMode,
  suggestedAltTheme,
  withColorModeComponents,
  withColorModeHtml,
  withColorModePage,
} from './colorMode.js'
import { DEFAULT_THEME, THEME_PRESETS, presetTheme, themedStyles } from './theme.js'
import { builderInteractiveJs } from './htmlRuntime.js'
import { schemaToFiles, schemaToSingleHtml } from './schemaToFiles.js'
import { pageToResponsiveHtml } from './pageCode.js'
import { schemaToResponsiveHtml } from './responsiveHtml.js'
import { publishedPagesFor } from './publishedPages.js'
import { htmlEmbedDocument } from './htmlEmbedDocument.js'
import { htmlEmbedDocumentOptions } from './htmlSnippetSizing.js'
import { themeSwitchSpot, themeToggleHtml } from './themeToggle.js'

const toggle = { id: 'tt', type: 'themeToggle', props: { label: 'Dark mode' }, styles: themedStyles('themeToggle', {}, DEFAULT_THEME), layout: { x: 0, y: 0, w: 44, h: 44 } }
const block = (type, styles, extra = {}) => ({ id: `${type}-${Math.random().toString(36).slice(2, 6)}`, type, props: {}, styles, layout: { x: 0, y: 0, w: 200, h: 80 }, ...extra })
const site = (components = [toggle], extra = {}) => ({
  theme: { ...DEFAULT_THEME },
  pages: [{ id: 'home', name: 'Home', background: '#ffffff', components }],
  ...extra,
})
const modeOf = (schema) => colorModeFor(schema, schema.pages[0])

describe('when a site has the other palette', () => {
  it('only with a switch on some page, or when it follows the device', () => {
    expect(modeOf(site([]))).toBeNull()
    expect(modeOf(site([], { colorMode: { followDevice: true } }))).not.toBeNull()
    // A switch on another page counts: the visitor carries the choice across.
    const two = site([])
    two.pages.push({ id: 'about', name: 'About', components: [toggle] })
    expect(modeOf(two)).not.toBeNull()
    expect(hasThemeToggle(site([]), { home: '<button data-pwb-theme-toggle>x</button>' })).toBe(true)
  })

  it('when the owner opens it in the palette it is not designed in, or on the device', () => {
    expect(modeOf(site([], { colorMode: { start: 'dark' } }))).toMatchObject({ base: 'light', alt: 'dark', initial: 'dark', followDevice: false })
    expect(modeOf(site([], { colorMode: { start: 'system' } }))).toMatchObject({ followDevice: true })
    expect(modeOf(site([], { colorMode: { start: 'system' } })).initial).toBeUndefined()
    // Opening as designed needs no second palette, and writes the page as before.
    expect(modeOf(site([], { colorMode: { start: 'light' } }))).toBeNull()
    expect(modeOf(site([toggle], { colorMode: { start: 'light' } }))).toMatchObject({ initial: 'light' })
    expect(modeOf(site([], { colorMode: { start: 'blue' } }))).toBeNull()
  })

  it('switches a light site to dark and a dark one to light', () => {
    expect(modeOf(site())).toMatchObject({ base: 'light', alt: 'dark' })
    const slate = site([toggle], { theme: presetTheme(THEME_PRESETS.find((preset) => preset.id === 'slate')) })
    expect(modeOf(slate)).toMatchObject({ base: 'dark', alt: 'light' })
  })

  it('suggests a dark palette whose brand colour still reads on it', () => {
    const dark = suggestedAltTheme({ ...DEFAULT_THEME, primaryColor: '#1e3a8a' })
    expect(dark.backgroundColor).toBe('#111317')
    // The navy brand colour is lifted until it stands out on the dark page.
    expect(dark.primaryColor).not.toBe('#1e3a8a')
  })

  it('suggests button text that reads on the brand colour, not only by its brightness', () => {
    // A mid green: white gives 3.2:1 here, a brightness rule still picks it.
    const dark = suggestedAltTheme({ ...DEFAULT_THEME, primaryColor: '#6e9b23' })
    expect(dark.primaryColor).toBe('#6e9b23')
    expect(dark.buttonTextColor).toBe('#111111')
    // White stays where it is enough.
    expect(suggestedAltTheme({ ...DEFAULT_THEME, primaryColor: '#7c3aed' }).buttonTextColor).toBe('#ffffff')
    // Where neither white nor a near black reaches it, black does.
    expect(suggestedAltTheme({ ...DEFAULT_THEME, primaryColor: '#777777' }).buttonTextColor).toBe('#000000')
  })

  it('keeps what the owner set for the other palette', () => {
    const mode = modeOf(site([toggle], { colorMode: { theme: { backgroundColor: '#000000' } } }))
    expect(mode.other.backgroundColor).toBe('#000000')
    expect(colorModeCss(mode)).toContain('--pwb-alt-bg:#000000')
    expect(colorModeCss(mode)).toMatch(/^\[data-pwb-theme="dark"\]\{/)
    // The page's own CSS reads --site-*: it follows too.
    expect(colorModeCss(mode)).toContain('--site-bg:#000000')
  })
})

describe('which pages have no switch', () => {
  it('tells the canvas pages from the HTML pages', () => {
    const schema = {
      theme: {},
      pages: [
        { id: 'with', components: [{ id: 'box', type: 'container', children: [toggle] }] },
        { id: 'bare', mode: 'empty', components: [] },
        { id: 'doc', mode: 'html', html: '<p>Hi</p>', components: [] },
        { id: 'doc-switch', mode: 'html', html: '<button data-pwb-theme-toggle>x</button>', components: [] },
        { id: 'mapped', components: [] },
      ],
    }
    const without = pagesWithoutThemeToggle(schema, { mapped: '<p>Authored</p>' })
    expect(without.canvas.map((page) => page.id)).toEqual(['bare'])
    expect(without.html.map((page) => page.id)).toEqual(['doc', 'mapped'])
  })
})

describe('where a switch is added for the owner', () => {
  it('goes in the top right corner, under a bar across the top', () => {
    expect(themeSwitchSpot({ components: [] }, 1200)).toEqual({ x: 1132, y: 24 })
    const barred = { components: [{ type: 'navbar', layout: { y: 0, h: 64 } }] }
    expect(themeSwitchSpot(barred, 1200)).toEqual({ x: 1132, y: 80 })
    // A bar further down the page is not in the way.
    const lower = { components: [{ type: 'navbar', layout: { y: 300, h: 64 } }] }
    expect(themeSwitchSpot(lower, 1200)).toEqual({ x: 1132, y: 24 })
    // A bar down the side of the page leaves the corner free.
    const side = { components: [{ type: 'navbar', props: { navLayout: 'vertical' }, layout: { y: 0, w: 200, h: 600 } }] }
    expect(themeSwitchSpot(side, 1200)).toEqual({ x: 1132, y: 24 })
  })
})

describe('the switch with three choices', () => {
  const three = { ...toggle, props: { label: 'Color theme', states: 'three', lightLabel: 'Açık', darkLabel: 'Koyu', deviceLabel: 'Cihaz "x"' } }
  const check = (html) => {
    const doc = new JSDOM(html).window.document
    const group = doc.querySelector('[role=radiogroup]')
    expect(group.tagName).toBe('DIV')
    expect(group.getAttribute('aria-label')).toBe('Color theme')
    expect(group.getAttribute('data-pwb-theme-toggle')).toBe('choices')
    expect(group.classList.contains('pwb-theme-choices')).toBe(true)
    const radios = [...group.querySelectorAll('button[role=radio]')]
    expect(radios.map((radio) => [radio.getAttribute('data-pwb-theme-choose'), radio.getAttribute('aria-label')]))
      .toEqual([['light', 'Açık'], ['dark', 'Koyu'], ['system', 'Cihaz "x"']])
    expect(doc.querySelector('.pwb-theme-toggle')).toBeNull()
  }

  it('is written as a radio group by every writer', () => {
    const schema = site([three])
    check(publishedPagesFor(schema)[0].html)
    check(schemaToFiles(schema).find((file) => file.name === 'index.html').content)
    check(schemaToResponsiveHtml(schema, 'x', { colorMode: modeOf(schema) }))
    check(themeToggleHtml(three.props))
  })

  it('counts as the site\'s switch, in an HTML page too', () => {
    expect(hasThemeToggle(site([three]))).toBe(true)
    expect(hasThemeToggle(site([]), { home: themeToggleHtml(three.props) })).toBe(true)
  })

  it('keeps the two-way switch a pressed button', () => {
    const button = new JSDOM(themeToggleHtml({ label: 'Theme' })).window.document.querySelector('button')
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.getAttribute('data-pwb-theme-toggle')).toBe('')
    expect(button.classList.contains('pwb-theme-toggle')).toBe(true)
  })
})

describe('which colours follow', () => {
  const mode = modeOf(site())
  const one = (component) => withColorModeComponents([component], mode)[0]

  it('the theme colours, each to its own role', () => {
    expect(one(block('text', themedStyles('text', {}, DEFAULT_THEME))).styles.color).toBe('var(--pwb-alt-text, #1d1d1f)')
    const button = one(block('button', themedStyles('button', {}, DEFAULT_THEME))).styles
    expect(button.backgroundColor).toBe('var(--pwb-alt-primary, #0071e3)')
    expect(button.color).toBe('var(--pwb-alt-button-text, #ffffff)')
    // White is the page and the cards at once; a card's white is the card's.
    expect(one(block('card', themedStyles('card', {}, DEFAULT_THEME))).styles.backgroundColor).toBe('var(--pwb-alt-surface, #ffffff)')
    const navbar = one(block('navbar', themedStyles('navbar', {}, DEFAULT_THEME))).styles
    expect([navbar.backgroundColor, navbar.color]).toEqual(['var(--pwb-alt-header, #1d1d1f)', 'var(--pwb-alt-header-text, #f5f5f7)'])
  })

  it('the page background', () => {
    expect(withColorModePage(site().pages[0], mode).background).toBe('var(--pwb-alt-bg, #ffffff)')
  })

  it('not a colour the owner picked, nor the text on it', () => {
    const promo = one(block('card', { backgroundColor: '#ffcc00', color: '#1d1d1f', borderColor: '#d2d2d7' }))
    expect(promo.styles).toMatchObject({ backgroundColor: '#ffcc00', color: '#1d1d1f', borderColor: '#d2d2d7' })
    // Its children keep their text too: on yellow, dark text must stay dark.
    const box = one(block('container', { backgroundColor: '#ffcc00' }, { children: [block('text', { color: '#1d1d1f' })] }))
    expect(box.children[0].styles.color).toBe('#1d1d1f')
  })

  it('a form field, part by part', () => {
    const field = one(block('input', {}, { props: { fieldBackgroundColor: '#ffffff', fieldColor: '#1d1d1f', fieldBorderColor: '#cbd5e1', labelColor: '#1d1d1f' } }))
    expect(field.props.fieldBackgroundColor).toBe('var(--pwb-alt-surface, #ffffff)')
    expect(field.props.fieldColor).toBe('var(--pwb-alt-text, #1d1d1f)')
    expect(field.props.fieldBorderColor).toBe('var(--pwb-alt-border, #cbd5e1)')
    expect(field.props.labelColor).toBe('var(--pwb-alt-text, #1d1d1f)')
  })

  it('never twice', () => {
    const text = one(block('text', { color: '#1d1d1f' }))
    expect(withColorModeComponents([text], mode)[0].styles.color).toBe(text.styles.color)
    const embed = one(block('html', {}, { props: { code: '<p style="color:#1d1d1f">x</p>' } }))
    expect(withColorModeComponents([embed], mode)[0].props.code).toBe(embed.props.code)
  })

  it('inside an HTML block too, whose document carries the palette in its head', () => {
    const embed = one(block('html', {}, { props: { code: '<p style="color:#1d1d1f">x</p>' } }))
    // The code is only re-coloured: nothing is added beside the block's own
    // element, which would stop a lone card or button being one.
    expect(embed.props.code).toBe('<p style="color:var(--pwb-alt-text, #1d1d1f)">x</p>')
    expect(embed.props._colorModeCss).toContain('--pwb-alt-text:')
    const doc = new JSDOM(htmlEmbedDocument(embed.props.code, htmlEmbedDocumentOptions(embed))).window.document
    expect(doc.head.querySelector('style[data-pwb-color-mode]').textContent).toContain('--pwb-alt-text:')
    expect(doc.querySelector('script')).toBeNull()
    // A frame painted in another scheme than its page's is a white box.
    expect(embed.props._colorModeCss).not.toContain('color-scheme')
  })
})

describe('a colour however it is written', () => {
  it.each([
    ['#fff', '#ffffff', 1],
    ['#1D1D1F', '#1d1d1f', 1],
    ['#ffffff80', '#ffffff', 128 / 255],
    ['#fff8', '#ffffff', 136 / 255],
    ['rgb(29, 29, 31)', '#1d1d1f', 1],
    ['rgb(29 29 31)', '#1d1d1f', 1],
    ['rgba(0,0,0,.5)', '#000000', 0.5],
    ['rgb(0 0 0 / 25%)', '#000000', 0.25],
    ['rgb(100%, 100%, 100%)', '#ffffff', 1],
    ['hsl(0, 0%, 100%)', '#ffffff', 1],
    ['hsl(120 100% 25%)', '#008000', 1],
    ['hsla(240, 100%, 50%, .4)', '#0000ff', 0.4],
    ['hsl(120deg 100% 50%)', '#00ff00', 1],
    ['hsl(.5turn 100% 50%)', '#00ffff', 1],
    ['hsl(200grad 100% 50%)', '#00ffff', 1],
    ['hsl(3.14159265rad 100% 50%)', '#00ffff', 1],
    ['white', '#ffffff', 1],
    ['GREY', '#808080', 1],
  ])('%s', (written, hex, alpha) => {
    const color = parseColor(written)
    expect(color.hex).toBe(hex)
    expect(color.alpha).toBeCloseTo(alpha, 3)
  })

  it.each(['transparent', 'red', 'currentColor', 'rgb(1,2)', 'rgb(a,b,c)', '#12', '', 'var(--x)'])('not %s', (written) => {
    expect(parseColor(written)).toBeNull()
  })

  const mode = modeOf(site())
  const one = (component) => withColorModeComponents([component], mode)[0]

  it('follows the palette as it would written in hex', () => {
    expect(one(block('text', { color: 'rgb(29, 29, 31)' })).styles.color).toBe('var(--pwb-alt-text, rgb(29, 29, 31))')
    expect(one(block('text', { color: 'hsl(240, 3%, 12%)' })).styles.color).toBe('var(--pwb-alt-text, hsl(240, 3%, 12%))')
    expect(one(block('text', { color: 'black' })).styles.color).toBe('var(--pwb-alt-text, black)')
    expect(one(block('card', { backgroundColor: 'white' })).styles.backgroundColor).toBe('var(--pwb-alt-surface, white)')
    expect(one(block('card', { border: '1px solid silver' })).styles.border).toBe('1px solid var(--pwb-alt-border, silver)')
  })

  it('keeps its opacity in both palettes', () => {
    expect(one(block('text', { color: 'rgba(29, 29, 31, 0.5)' })).styles.color).toBe('color-mix(in srgb, var(--pwb-alt-text, #1d1d1f) 50%, transparent)')
    expect(one(block('text', { color: '#1d1d1f80' })).styles.color).toBe('color-mix(in srgb, var(--pwb-alt-text, #1d1d1f) 50.2%, transparent)')
    const header = withColorModeHtml('<head><style>.bar{background:rgba(255,255,255,.9)}</style></head>', mode)
    expect(header).toContain('.bar{background:color-mix(in srgb, var(--pwb-alt-bg, #ffffff) 90%, transparent)}')
  })

  it('never twice', () => {
    const text = one(block('text', { color: 'rgba(29, 29, 31, 0.5)' }))
    expect(withColorModeComponents([text], mode)[0].styles.color).toBe(text.styles.color)
  })

  it('leaves alone what only looks like one', () => {
    expect(one(block('card', { background: 'url(white.png)' })).styles.background).toBe('url(white.png)')
    // A longer name is that name, not the short one at its start.
    expect(one(block('section', { backgroundColor: 'whitesmoke' })).styles.backgroundColor).toBe('var(--pwb-alt-soft, whitesmoke)')
    expect(one(block('card', { backgroundColor: 'red' })).styles.backgroundColor).toBe('red')
    expect(one(block('text', { color: 'rgb(200, 30, 30)' })).styles.color).toBe('rgb(200, 30, 30)')
    expect(withColorModeHtml('<head><style>.a{background:var(--white);color:offwhite}</style></head>', mode)).toContain('.a{background:var(--white);color:offwhite}')
  })

  it('reads a faint tint as the page behind it, so the text on it still follows', () => {
    const tint = one(block('card', { backgroundColor: 'rgba(120, 30, 30, 0.1)', color: '#1d1d1f' }))
    expect(tint.styles.color).toBe('var(--pwb-alt-text, #1d1d1f)')
    // A solid colour of the owner's own keeps the text on it, as in hex.
    const solid = one(block('card', { backgroundColor: 'rgba(255, 204, 0, 0.9)', color: '#1d1d1f' }))
    expect(solid.styles.color).toBe('#1d1d1f')
  })

  it('does not read a tint as the page when the other palette\'s text cannot be read on it', () => {
    const strong = one(block('card', { backgroundColor: 'rgba(255, 255, 0, 0.49)', color: '#1d1d1f' }))
    expect(strong.styles.color).toBe('#1d1d1f')
  })

  it('takes a text on a solid role colour to that colour\'s own text role', () => {
    const button = one(block('button', { backgroundColor: '#0071e3', color: 'white' }))
    expect(button.styles.color).toBe('var(--pwb-alt-button-text, white)')
  })

  it('in an HTML page: single quotes, and a palette in rgb', () => {
    expect(withColorModeHtml("<body><p style='color:#1d1d1f'>x</p></body>", mode)).toContain("style='color:var(--pwb-alt-text, #1d1d1f)'")
    const html = '<html><head><style>:root{--bg:rgb(11,18,32);--ink:rgba(232,237,244,1);--accent:rgba(1,2,3,.5)}</style></head><body></body></html>'
    const schema = site([])
    schema.pages[0] = { ...schema.pages[0], mode: 'html', html: `${html}<button data-pwb-theme-toggle>x</button>` }
    // It is read as a page designed dark, whose palette is in its own variables.
    expect(modeOf(schema)).toMatchObject({ base: 'dark', alt: 'light' })
    // A see-through colour names no palette: the theme's stays.
    expect(modeOf(schema).light.primaryColor).toBe(DEFAULT_THEME.primaryColor)
    expect(withColorModeHtml(html, modeOf(schema))).toContain('--bg:var(--pwb-alt-bg, rgb(11,18,32))')
    expect(withColorModeHtml(html, modeOf(schema))).toContain('--accent:color-mix(in srgb, var(--pwb-alt-primary, #010203) 50%, transparent)')
  })
})

describe('an image with a version for the other palette', () => {
  const picture = (extra = {}) => block('image', { objectFit: 'cover' }, { id: 'pic', props: { src: 'https://a.test/light.png', srcOther: 'https://a.test/dark.png', alt: 'Logo', ...extra } })
  const images = (html) => [...new JSDOM(html).window.document.querySelectorAll('img')]
    .map((img) => [img.getAttribute('src'), img.className.includes('pwb-on-light') ? 'light' : img.className.includes('pwb-on-dark') ? 'dark' : null, img.getAttribute('alt'), img.getAttribute('loading')])
  const both = [['https://a.test/light.png', 'light', 'Logo', null], ['https://a.test/dark.png', 'dark', 'Logo', 'lazy']]

  it('is written twice by every writer, the other one loading only when it is needed', () => {
    const schema = site([toggle, picture()])
    expect(images(publishedPagesFor(schema)[0].html)).toEqual(both)
    expect(images(schemaToFiles(schema).find((file) => file.name === 'index.html').content)).toEqual(both)
    expect(images(schemaToResponsiveHtml(schema, 'x', { colorMode: modeOf(schema) }))).toEqual(both)
  })

  it('inside a parent too, keeping the id on the one that opens', () => {
    const box = block('container', {}, { id: 'box', children: [picture()] })
    expect(images(publishedPagesFor(site([toggle, box]))[0].html)).toEqual(both)
  })

  it('is written once on a site with one palette, where it can never show', () => {
    expect(images(publishedPagesFor(site([picture()]))[0].html)).toEqual([['https://a.test/light.png', null, 'Logo', null]])
  })

  it('belongs to the palette the page is not designed in', () => {
    const slate = site([toggle, picture()], { theme: presetTheme(THEME_PRESETS.find((preset) => preset.id === 'slate')) })
    expect(images(publishedPagesFor(slate)[0].html).map(([src, on]) => [src, on])).toEqual([
      ['https://a.test/light.png', 'dark'],
      ['https://a.test/dark.png', 'light'],
    ])
  })

  it('does not carry an address a page must not load', () => {
    const [page] = publishedPagesFor(site([toggle, picture({ srcOther: 'javascript:alert(1)' })]))
    expect(page.html).not.toContain('javascript:alert')
  })

  it('shows only the one for the palette on', () => {
    const css = new JSDOM(colorModeHeadTags(modeOf(site()))).window.document.querySelector('style').textContent
    expect(css).toContain('[data-pwb-theme="light"] .pwb-on-dark,[data-pwb-theme="dark"] .pwb-on-light{display:none!important}')
  })
})

describe('a tab row', () => {
  const mode = modeOf(site())
  const tabs = (props, styles = {}) => withColorModeComponents([block('tabs', styles, { props })], mode)[0]
  const look = {
    tabTextColor: '#6b7280', tabBackgroundColor: 'transparent', tablistBorderColor: '#e5e7eb', tablistBackgroundColor: '#f3f4f6',
    panelBackgroundColor: '#ffffff', panelBorderColor: '#d2d2d7',
  }

  it('follows the palette, part by part', () => {
    expect(tabs(look).props).toMatchObject({
      tabTextColor: 'var(--pwb-alt-muted, #6b7280)',
      tabBackgroundColor: 'transparent',
      tablistBorderColor: 'var(--pwb-alt-border, #e5e7eb)',
      tablistBackgroundColor: 'var(--pwb-alt-soft, #f3f4f6)',
      panelBackgroundColor: 'var(--pwb-alt-surface, #ffffff)',
      panelBorderColor: 'var(--pwb-alt-border, #d2d2d7)',
    })
  })

  it('keeps an active tab\'s text readable on its own colour', () => {
    const filled = tabs({ activeTabBackgroundColor: '#0071e3', activeTabColor: '#ffffff' }).props
    expect(filled.activeTabBackgroundColor).toBe('var(--pwb-alt-primary, #0071e3)')
    expect(filled.activeTabColor).toBe('var(--pwb-alt-button-text, #ffffff)')
    const plain = tabs({ activeTabBackgroundColor: '#eff3fb', activeTabColor: '#1d1d1f' }).props
    expect(plain.activeTabColor).toBe('var(--pwb-alt-text, #1d1d1f)')
    const own = tabs({ activeTabBackgroundColor: '#ffcc00', activeTabColor: '#1d1d1f' }).props
    expect(own).toMatchObject({ activeTabBackgroundColor: '#ffcc00', activeTabColor: '#1d1d1f' })
  })

  it('stays as designed inside a box with a colour of the owner\'s own', () => {
    const box = withColorModeComponents([block('container', { backgroundColor: '#ffcc00' }, { children: [block('tabs', {}, { props: look })] })], mode)[0]
    expect(box.children[0].props.tabTextColor).toBe('#6b7280')
  })

  it('reaches the published page', () => {
    const [page] = publishedPagesFor(site([toggle, block('tabs', {}, { props: { ...look, tabs: [{ id: 't1', label: 'One' }], activeId: 't1' } })]))
    expect(page.html).toContain('--builder-tab-color:var(--pwb-alt-muted, #6b7280)')
  })
})

describe('whether the other palette can be read', () => {
  it('names each pair that falls short', () => {
    const palette = { backgroundColor: '#111317', surfaceColor: '#1a1d23', textColor: '#333333', mutedColor: '#a3a9b3', primaryColor: '#60a5fa', buttonTextColor: '#111111', accentColor: '#60a5fa', headerColor: '#0b0c0f', headerTextColor: '#eceef1' }
    expect(contrastProblems(palette)).toEqual([
      { role: 'textColor', on: 'backgroundColor', min: 4.5, ratio: 1.4 },
      { role: 'textColor', on: 'surfaceColor', min: 4.5, ratio: 1.3 },
    ])
  })

  it('holds text to the higher bar', () => {
    expect(contrastProblems({ backgroundColor: '#111317', textColor: '#777777' })).toEqual([{ role: 'textColor', on: 'backgroundColor', min: 4.5, ratio: 4.1 }])
  })

  it('asks less of a colour that only has to be seen', () => {
    const palette = { backgroundColor: '#ffffff', primaryColor: '#808080' }
    expect(contrastProblems(palette)).toEqual([])
    expect(contrastProblems({ backgroundColor: '#ffffff', primaryColor: '#b0b0b0' })).toEqual([{ role: 'primaryColor', on: 'backgroundColor', min: 3, ratio: 2.1 }])
  })

  it('finds nothing wrong with black on white', () => {
    expect(contrastProblems({ backgroundColor: '#ffffff', surfaceColor: '#ffffff', textColor: '#000000', mutedColor: '#000000' })).toEqual([])
  })

  it.each(THEME_PRESETS.map((preset) => [preset.id, preset]))('finds nothing wrong with what it suggests for %s', (id, preset) => {
    expect(contrastProblems(suggestedAltTheme(presetTheme(preset)))).toEqual([])
  })
})

describe('the editor\'s View', () => {
  const html = '<html><head></head><body>x</body></html>'
  const schema = { theme: { ...DEFAULT_THEME }, pages: [{ id: 'doc', mode: 'html', html, components: [] }] }

  it('shows an HTML page in the other palette before it has a switch', () => {
    expect(viewColorMode(schema, schema.pages[0], false, {})).toBeNull()
    expect(viewColorMode(schema, schema.pages[0], true, {})).toMatchObject({ initial: 'dark', alt: 'dark' })
  })

  it('reads the page\'s own palette from the document being edited', () => {
    const edited = { doc: '<html><head><style>:root{--bg:#0b1220}</style></head></html>' }
    expect(viewColorMode(schema, schema.pages[0], true, edited)).toMatchObject({ base: 'dark', alt: 'light', initial: 'light' })
  })
})

describe('the published page', () => {
  it('is written as before when the site has one palette', () => {
    const plain = site([block('text', { color: '#1d1d1f' }, { props: { text: 'Hi' } })])
    expect(schemaToSingleHtml(plain, 'x', { colorMode: null })).toBe(schemaToSingleHtml(plain, 'x'))
    expect(publishedPagesFor(plain)[0].html).not.toContain('data-pwb-color-mode')
  })

  it('carries both palettes and the switch', () => {
    const [page] = publishedPagesFor(site([toggle, block('text', { color: '#1d1d1f' }, { props: { text: 'Hi' } })]))
    expect(page.html).toContain('<style data-pwb-color-mode>')
    expect(page.html).toContain('var(--pwb-alt-text, #1d1d1f)')
    const doc = new JSDOM(page.html).window.document
    const button = doc.querySelector('button[data-pwb-theme-toggle]')
    expect(button.getAttribute('aria-label')).toBe('Dark mode')
    expect(button.getAttribute('type')).toBe('button')
    // The head script runs before the body's styles are read.
    expect(doc.head.querySelector('script[data-pwb-color-mode]')).not.toBeNull()
  })

  it('tells the browser which palette is on, leaving the frames on the page out', () => {
    const css = new JSDOM(colorModeHeadTags(modeOf(site()))).window.document.querySelector('style').textContent
    expect(css).toContain('[data-pwb-theme="dark"]{color-scheme:dark}')
    expect(css).toContain('[data-pwb-theme="light"]{color-scheme:light}')
    expect(css).toContain('[data-pwb-theme] iframe{color-scheme:normal}')
  })

  it('reads an HTML page\'s own palette: a dark template switches to light', () => {
    // A template keeps its own colours; the site theme stays the default light one.
    const html = '<html><head><style>:root{--bg:#0b1220;--ink:#e8edf4;--accent:#38bdf8}</style></head><body><button data-pwb-theme-toggle>x</button></body></html>'
    const schema = site([])
    schema.pages[0] = { ...schema.pages[0], mode: 'html', html }
    const mode = modeOf(schema)
    expect(mode).toMatchObject({ base: 'dark', alt: 'light' })
    expect(mode.other.backgroundColor).toBe('#ffffff')
    const out = withColorModeHtml(html, mode)
    expect(out).toContain('--bg:var(--pwb-alt-bg, #0b1220)')
    expect(colorModeCss(mode)).toMatch(/^\[data-pwb-theme="light"\]\{--pwb-alt-bg:#ffffff/)
    // A dark palette the owner kept for the site's light pages is not used
    // here: it would make a dark page darker.
    const kept = { ...schema, colorMode: { theme: { backgroundColor: '#000000' } } }
    expect(modeOf(kept).other.backgroundColor).toBe('#ffffff')
  })

  it('switches an HTML page by its own palette variables and plain colours', () => {
    const html = '<!DOCTYPE html><html><head><style>:root{--text:#222222;--brand:#e11d48}body{background:#fff;color:#111}.promo{background:#ffcc00;color:#111}</style></head>'
      + '<body><p style="color:#1d1d1f">a</p><iframe srcdoc="&lt;p style=&quot;color:#1d1d1f&quot;&gt;"></iframe><script>var s = "color:#111"</script></body></html>'
    const out = withColorModeHtml(html, modeOf(site()))
    expect(out).toContain('--text:var(--pwb-alt-text, #222222)')
    expect(out).toContain('--brand:var(--pwb-alt-primary, #e11d48)')
    expect(out).toContain('body{background:var(--pwb-alt-bg, #fff);color:var(--pwb-alt-text, #111)}')
    expect(out).toContain('.promo{background:#ffcc00;color:#111}')
    expect(out).toContain('<p style="color:var(--pwb-alt-text, #1d1d1f)">')
    // Another document, and a script's text, are left alone.
    expect(out).toContain('srcdoc="&lt;p style=&quot;color:#1d1d1f&quot;&gt;"')
    expect(out).toContain('var s = "color:#111"')
    expect(out.indexOf('data-pwb-color-mode')).toBeLessThan(out.indexOf('</head>'))
  })
})

describe('the downloaded site', () => {
  const text = { id: 't', type: 'text', props: { text: 'Hi' }, styles: { color: '#1d1d1f' }, layout: { x: 10, y: 80, w: 200, h: 40 } }

  it('carries both palettes in the project and the single-file page', () => {
    const schema = site([toggle, text])
    const files = schemaToFiles(schema)
    const index = files.find((file) => file.name === 'index.html').content
    expect(index).toContain('<style data-pwb-color-mode>')
    expect(files.find((file) => file.name === 'styles.css').content).toContain('var(--pwb-alt-text, #1d1d1f)')
    // The design itself is kept as it is stored.
    expect(files.find((file) => file.name === 'schema.json').content).not.toContain('--pwb-alt-')
    const single = pageToResponsiveHtml(schema.pages[0], 'Home', schema)
    expect(single).toContain('<style data-pwb-color-mode>')
    expect(single).toContain('var(--pwb-alt-text, #1d1d1f)')
  })

  it('is written as before when the site has one palette', () => {
    const schema = site([text])
    expect(schemaToFiles(schema).find((file) => file.name === 'index.html').content).not.toContain('data-pwb-color-mode')
    expect(pageToResponsiveHtml(schema.pages[0], 'Home', schema)).not.toContain('var(--pwb-alt-')
  })

  it('in the responsive code, sets the other palette after the page\'s own variables', () => {
    const schema = site([toggle, text])
    const html = schemaToResponsiveHtml(schema, 'x', { colorMode: modeOf(schema) })
    // Both rules weigh the same, so the later one is the one that holds.
    expect(html.indexOf('--site-text: #1d1d1f')).toBeGreaterThan(-1)
    expect(html.indexOf('--site-text:#eceef1')).toBeGreaterThan(html.indexOf('--site-text: #1d1d1f'))
  })
})

describe('in the visitor\'s browser', () => {
  const pages = []
  afterEach(() => pages.splice(0).forEach((page) => page.window.close()))

  const slate = presetTheme(THEME_PRESETS.find((preset) => preset.id === 'slate'))

  function visit({ stored = null, url = 'https://example.test/', prefersDark = false, follow = false, sandboxed = false, schema = null, head = '', body = '', stillLoading = false } = {}) {
    const mode = schema ? modeOf(schema) : { ...modeOf(site()), followDevice: follow }
    const page = new JSDOM(
      `<!DOCTYPE html><html><head>${head}</head><body>${body}<button data-pwb-theme-toggle aria-pressed="false">x</button>`
        + '<a id="about" href="/about/">About</a><a id="jump" href="#top">Top</a><a id="away" href="https://elsewhere.test/">Away</a>'
        + `${themeToggleHtml({ states: 'three' })}<a id="sibling" href="/s/site-a/about/">Same site</a><a id="neighbour" href="/s/site-b/">Another site</a><a id="neighbour-prefix" href="/s/site-a-2/">Similar name</a></body></html>`,
      { url, runScripts: 'outside-only' },
    )
    pages.push(page)
    const { window } = page
    if (stored) window.localStorage.setItem('pwb-color-mode', stored)
    // The builder's own /s/ pages are sandboxed: storage throws there.
    if (sandboxed) Object.defineProperty(window, 'localStorage', { get() { throw new window.DOMException('sandboxed', 'SecurityError') } })
    // A device with no preference answers "light", as browsers do.
    let deviceDark = prefersDark
    const listeners = []
    window.matchMedia = (query) => ({
      get matches() { return query.includes(deviceDark ? 'dark' : 'light') },
      addEventListener: (type, listener) => listeners.push(listener),
    })
    window.setDevice = (dark) => {
      deviceDark = dark
      listeners.forEach((listener) => listener())
    }
    window.eval(colorModeScript(mode))
    if (stillLoading) Object.defineProperty(window.document, 'readyState', { value: 'interactive', configurable: true })
    window.eval(builderInteractiveJs())
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'))
    return window
  }
  const theme = (window) => window.document.documentElement.getAttribute('data-pwb-theme')
  const press = (window) => window.document.querySelector('[data-pwb-theme-toggle]')
    .dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))

  it('starts in the palette the site was designed in', () => {
    expect(theme(visit())).toBe('light')
    // The device's preference counts only when the owner said so.
    expect(theme(visit({ prefersDark: true }))).toBe('light')
    expect(theme(visit({ prefersDark: true, follow: true }))).toBe('dark')
  })

  describe('the visitor choosing the device', () => {
    const picked = (window, value) => window.document.querySelector(`[data-pwb-theme-choose="${value}"]`)
    const choose = (window, value) => picked(window, value).dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
    const root = (window) => window.document.documentElement
    const startDark = () => site([toggle], { colorMode: { start: 'dark' } })

    it('outranks what the owner chose, from the address, from storage and from the server', () => {
      expect(theme(visit({ schema: startDark(), url: 'https://example.test/?pwb-theme=system', sandboxed: true }))).toBe('light')
      expect(theme(visit({ schema: startDark(), stored: 'system' }))).toBe('light')
      expect(theme(visit({ schema: startDark(), stored: 'system', prefersDark: true }))).toBe('dark')
    })

    it('is shown as the choice whichever palette the device gives', () => {
      expect(root(visit({ stored: 'system', prefersDark: true })).getAttribute('data-pwb-theme-pick')).toBe('system')
      expect(root(visit({ schema: startDark() })).getAttribute('data-pwb-theme-pick')).toBe('dark')
      expect(root(visit({ schema: site([toggle], { colorMode: { start: 'system' } }) })).getAttribute('data-pwb-theme-pick')).toBe('system')
      expect(root(visit()).getAttribute('data-pwb-theme-pick')).toBe('light')
    })

    it('marks the choice on the radio group and makes it the one Tab stop', () => {
      const window = visit({ prefersDark: true })
      choose(window, 'system')
      expect(theme(window)).toBe('dark')
      expect(picked(window, 'system').getAttribute('aria-checked')).toBe('true')
      expect(picked(window, 'system').getAttribute('tabindex')).toBe('0')
      expect(picked(window, 'light').getAttribute('aria-checked')).toBe('false')
      expect(picked(window, 'light').getAttribute('tabindex')).toBe('-1')
      expect(window.localStorage.getItem('pwb-color-mode')).toBe('system')
    })

    it('without storage, rides in the address like the others', () => {
      const window = visit({ sandboxed: true })
      choose(window, 'system')
      expect(window.location.search).toBe('?pwb-theme=system')
      const about = window.document.getElementById('about')
      about.addEventListener('click', (event) => event.preventDefault())
      about.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
      expect(about.getAttribute('href')).toBe('https://example.test/about/?pwb-theme=system')
    })

    it('moves and chooses with the arrow keys, wrapping at the ends', () => {
      const window = visit()
      const press = (value, key) => picked(window, value).dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
      press('light', 'ArrowRight')
      expect(theme(window)).toBe('dark')
      expect(window.document.activeElement).toBe(picked(window, 'dark'))
      press('dark', 'ArrowRight')
      expect(root(window).getAttribute('data-pwb-theme-pick')).toBe('system')
      press('system', 'ArrowRight')
      expect(root(window).getAttribute('data-pwb-theme-pick')).toBe('light')
      press('light', 'ArrowLeft')
      expect(root(window).getAttribute('data-pwb-theme-pick')).toBe('system')
    })
  })

  describe('the browser\'s own bar', () => {
    const bar = (window) => window.document.querySelector('meta[name="theme-color"]').getAttribute('content')
    const head = '<meta name="theme-color" content="#123456">'

    it('takes the page\'s color in the other palette, and goes back', () => {
      const window = visit({ head })
      expect(bar(window)).toBe('#123456')
      press(window)
      expect(bar(window)).toBe('#111317')
      press(window)
      expect(bar(window)).toBe('#123456')
    })

    it('is right from the start on a page that opens in the other palette, and goes back from there', () => {
      const window = visit({ head, stored: 'dark' })
      expect(bar(window)).toBe('#111317')
      press(window)
      expect(bar(window)).toBe('#123456')
    })

    it('follows the device with the page', () => {
      const window = visit({ head, schema: site([toggle], { colorMode: { start: 'system' } }) })
      window.setDevice(true)
      expect(bar(window)).toBe('#111317')
      window.setDevice(false)
      expect(bar(window)).toBe('#123456')
    })

    it('stays out of a page that set no color for it', () => {
      const window = visit()
      press(window)
      expect(window.document.querySelector('meta[name="theme-color"]')).toBeNull()
    })
  })

  describe('an HTML block on a page opening in the other palette', () => {
    const body = '<iframe srcdoc="<p>x</p>"></iframe>'
    const after = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })
    const waits = (window) => window.document.documentElement.hasAttribute('data-pwb-theme-wait')

    it('waits only then', () => {
      expect(waits(visit())).toBe(false)
      expect(waits(visit({ stored: 'light' }))).toBe(false)
      expect(waits(visit({ stored: 'dark' }))).toBe(true)
    })

    it('is let go a little after it is told, when it loads', async () => {
      const window = visit({ stored: 'dark', body, stillLoading: true })
      const frame = window.document.querySelector('iframe')
      await after(90)
      expect(frame.style.animation).toBe('')
      frame.dispatchEvent(new window.Event('load'))
      expect(frame.style.animation).toBe('')
      await after(90)
      expect(frame.style.animation).toContain('none')
    })

    it('is let go when the page has loaded, if it loaded before the runtime ran', async () => {
      const window = visit({ stored: 'dark', body, stillLoading: true })
      const frame = window.document.querySelector('iframe')
      await after(90)
      expect(frame.style.animation).toBe('')
      window.dispatchEvent(new window.Event('load'))
      await after(90)
      expect(frame.style.animation).toContain('none')
    })

    it('has a way out in the stylesheet, for a page whose runtime never came', () => {
      const css = new JSDOM(colorModeHeadTags(modeOf(site()))).window.document.querySelector('style').textContent
      expect(css).toContain('[data-pwb-theme-wait] iframe[srcdoc]{animation:pwb-frame-in 0s linear 3s both}')
      expect(css).toContain('@keyframes pwb-frame-in{from{visibility:hidden}to{visibility:visible}}')
    })
  })

  describe('when the device changes while the page is open', () => {
    const pressed = (window) => window.document.querySelector('button[data-pwb-theme-toggle]').getAttribute('aria-pressed')

    it('a page on the device follows it, and the switch says so', () => {
      const window = visit({ schema: site([toggle], { colorMode: { start: 'system' } }) })
      expect(theme(window)).toBe('light')
      window.setDevice(true)
      expect([theme(window), pressed(window)]).toEqual(['dark', 'true'])
      window.setDevice(false)
      expect([theme(window), pressed(window)]).toEqual(['light', 'false'])
    })

    it('a choice of the visitor stays', () => {
      const window = visit({ schema: site([toggle], { colorMode: { start: 'system' } }) })
      press(window)
      expect(theme(window)).toBe('dark')
      window.setDevice(false)
      expect(theme(window)).toBe('dark')
    })

    it('a site opening in the owner\'s palette stays', () => {
      const window = visit({ schema: site([toggle], { colorMode: { start: 'dark' } }) })
      window.setDevice(false)
      expect(theme(window)).toBe('dark')
    })
  })

  it('on the device means the device, for a site designed dark too', () => {
    const schema = site([toggle], { theme: slate, colorMode: { start: 'system' } })
    expect(theme(visit({ schema }))).toBe('light')
    expect(theme(visit({ schema, prefersDark: true }))).toBe('dark')
    // A site saved before the choice existed has only the old box.
    const older = site([toggle], { theme: slate, colorMode: { followDevice: true } })
    expect(theme(visit({ schema: older }))).toBe('light')
  })

  it('opens in what the owner chose, whatever the device says', () => {
    const dark = site([toggle], { colorMode: { start: 'dark' } })
    expect(theme(visit({ schema: dark }))).toBe('dark')
    const light = site([toggle], { theme: slate, colorMode: { start: 'light' } })
    expect(theme(visit({ schema: light, prefersDark: true }))).toBe('light')
  })

  it('lets the visitor\'s own choice outrank the owner\'s', () => {
    const schema = site([toggle], { colorMode: { start: 'dark' } })
    expect(theme(visit({ schema, stored: 'light' }))).toBe('light')
    expect(theme(visit({ schema, url: 'https://example.test/?pwb-theme=light', sandboxed: true }))).toBe('light')
  })

  it('remembers the choice, in storage or in the address', () => {
    expect(theme(visit({ stored: 'dark' }))).toBe('dark')
    expect(theme(visit({ url: 'https://example.test/about/?pwb-theme=dark', sandboxed: true }))).toBe('dark')
  })

  it('switches, and says so on the button', () => {
    const window = visit()
    const button = window.document.querySelector('[data-pwb-theme-toggle]')
    press(window)
    expect([theme(window), button.getAttribute('aria-pressed')]).toEqual(['dark', 'true'])
    expect(window.localStorage.getItem('pwb-color-mode')).toBe('dark')
    // With storage the address stays clean.
    expect(window.location.search).toBe('')
    press(window)
    expect([theme(window), button.getAttribute('aria-pressed')]).toEqual(['light', 'false'])
  })

  it('switches an HTML block when the page around it says so, and only then', () => {
    const window = visit()
    const root = window.document.documentElement
    window.dispatchEvent(new window.MessageEvent('message', { data: { type: 'pwb-color-mode-set', mode: 'dark' }, source: window.parent }))
    expect(root.getAttribute('data-pwb-theme')).toBe('dark')
    // Anyone else (the block's own frames, another tab) is not listened to.
    window.dispatchEvent(new window.MessageEvent('message', { data: { type: 'pwb-color-mode-set', mode: 'light' }, source: null }))
    expect(root.getAttribute('data-pwb-theme')).toBe('dark')
  })

  it('without storage, keeps the choice in the address and takes it to the site\'s other pages', () => {
    const window = visit({ sandboxed: true })
    press(window)
    expect(window.location.search).toBe('?pwb-theme=dark')
    const link = (id) => window.document.getElementById(id)
    for (const id of ['about', 'jump', 'away']) {
      link(id).addEventListener('click', (event) => event.preventDefault())
      link(id).dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
    }
    expect(link('about').getAttribute('href')).toBe('https://example.test/about/?pwb-theme=dark')
    // A jump within the page and another site are left alone.
    expect(link('jump').getAttribute('href')).toBe('#top')
    expect(link('away').getAttribute('href')).toBe('https://elsewhere.test/')
    press(window)
    expect(window.location.search).toBe('?pwb-theme=light')
  })

  it('without storage, keeps going back to the designed palette when the site opens in the other', () => {
    const schema = site([toggle], { colorMode: { start: 'dark' } })
    const window = visit({ schema, sandboxed: true })
    press(window)
    expect(theme(window)).toBe('light')
    // A reload reads this address: without it the site would open dark again.
    expect(theme(visit({ schema, sandboxed: true, url: window.location.href }))).toBe('light')
  })

  it('without storage, takes going back to the designed palette to the next page', () => {
    const schema = site([toggle], { colorMode: { start: 'dark' } })
    const window = visit({ schema, sandboxed: true })
    press(window)
    const about = window.document.getElementById('about')
    about.addEventListener('click', (event) => event.preventDefault())
    about.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(about.getAttribute('href')).toBe('https://example.test/about/?pwb-theme=light')
    expect(theme(visit({ schema, sandboxed: true, url: about.href }))).toBe('light')
  })

  it.each(['auxclick', 'contextmenu'])('without storage, takes the choice along on a link opened by %s', (type) => {
    const window = visit({ sandboxed: true })
    press(window)
    const about = window.document.getElementById('about')
    about.dispatchEvent(new window.MouseEvent(type, { bubbles: true, cancelable: true }))
    expect(about.getAttribute('href')).toBe('https://example.test/about/?pwb-theme=dark')
  })

  describe('with a choice the server remembered', () => {
    // The server writes it on the script itself, so the script has to run from
    // its own tag here.
    function served({ chosen, url = 'https://example.test/', schema = site(), stored = null }) {
      const attribute = chosen ? ` data-pwb-chosen="${chosen}"` : ''
      const page = new JSDOM(
        `<!DOCTYPE html><html><head><script data-pwb-color-mode${attribute}>${colorModeScript(modeOf(schema))}</script></head><body></body></html>`,
        {
          url,
          runScripts: 'dangerously',
          beforeParse(window) {
            if (stored) window.localStorage.setItem('pwb-color-mode', stored)
            else Object.defineProperty(window, 'localStorage', { get() { throw new window.DOMException('sandboxed', 'SecurityError') } })
            window.matchMedia = (query) => ({ matches: query.includes('light') })
          },
        },
      )
      pages.push(page)
      return page.window
    }

    it('takes the device as a choice', () => {
      expect(theme(served({ chosen: 'system', schema: site([toggle], { colorMode: { start: 'dark' } }) }))).toBe('light')
    })

    it('opens in it, over what the owner chose', () => {
      expect(theme(served({ chosen: 'dark' }))).toBe('dark')
      expect(theme(served({ chosen: 'light', schema: site([toggle], { colorMode: { start: 'dark' } }) }))).toBe('light')
    })

    it('over the device', () => {
      expect(theme(served({ chosen: 'dark', schema: site([toggle], { colorMode: { start: 'system' } }) }))).toBe('dark')
    })

    it('but not over the address, which is newer', () => {
      expect(theme(served({ chosen: 'dark', url: 'https://example.test/?pwb-theme=light' }))).toBe('light')
    })

    it('nor over storage, on a page that has it', () => {
      expect(theme(served({ chosen: 'dark', stored: 'light' }))).toBe('light')
    })

    it('and ignores a value that is no palette', () => {
      expect(theme(served({ chosen: 'blue', schema: site([toggle], { colorMode: { start: 'dark' } }) }))).toBe('dark')
    })

    it('opens as the owner chose without one', () => {
      expect(theme(served({ schema: site([toggle], { colorMode: { start: 'dark' } }) }))).toBe('dark')
    })
  })

  it('without storage and without a choice, leaves the address and the links alone', () => {
    const window = visit({ schema: site([toggle], { colorMode: { start: 'dark' } }), sandboxed: true })
    const about = window.document.getElementById('about')
    about.addEventListener('click', (event) => event.preventDefault())
    about.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(about.getAttribute('href')).toBe('/about/')
    expect(window.location.search).toBe('')
  })

  it('on the builder\'s address, takes the choice along only inside the site', () => {
    const window = visit({ sandboxed: true, url: 'https://example.test/s/site-a/?pwb-theme=dark' })
    const click = (id) => {
      const link = window.document.getElementById(id)
      link.addEventListener('click', (event) => event.preventDefault())
      link.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
      return link.getAttribute('href')
    }
    expect(click('sibling')).toBe('https://example.test/s/site-a/about/?pwb-theme=dark')
    // The server would keep this as the other site's choice, for a year.
    expect(click('neighbour')).toBe('/s/site-b/')
    expect(click('neighbour-prefix')).toBe('/s/site-a-2/')
    // The app itself, on the same host, is not part of the site either.
    expect(click('about')).toBe('/about/')
  })

  it.each([
    ['?pwb-theme=%64ark', 'dark'],
    ['?pwb-theme=dark&pwb-theme=light', 'dark'],
    ['?pwb-theme=light&pwb-theme=dark', 'light'],
    ['?pwb-theme=blue&pwb-theme=dark', 'light'],
    ['?other=1&pwb-theme=dark', 'dark'],
    ['?xpwb-theme=dark', 'light'],
  ])('reads the address as the server does: %s is %s', (search, expected) => {
    expect(theme(visit({ sandboxed: true, url: `https://example.test/${search}` }))).toBe(expected)
  })

  it('lets a value in the address that is no palette leave storage in charge', () => {
    expect(theme(visit({ stored: 'dark', url: 'https://example.test/?pwb-theme=blue' }))).toBe('dark')
  })

  it('without storage, keeps the choice on an address with a jump in it', () => {
    const window = visit({ sandboxed: true, url: 'https://example.test/#top' })
    press(window)
    expect(window.location.href).toBe('https://example.test/?pwb-theme=dark#top')
  })

  it('with storage, takes an old choice out of the address, which would outrank the new one', () => {
    const window = visit({ url: 'https://example.test/about/?pwb-theme=dark&x=1' })
    expect(theme(window)).toBe('dark')
    press(window)
    expect(window.localStorage.getItem('pwb-color-mode')).toBe('light')
    expect(window.location.search).toBe('?x=1')
  })
})
