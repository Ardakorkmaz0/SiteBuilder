// Light and dark: which colours follow the other palette, what the published
// page carries for it, and that a site without a switch is written as before.
import { afterEach, describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  colorModeCss,
  colorModeFor,
  colorModeHeadTags,
  colorModeScript,
  hasThemeToggle,
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

  it('keeps what the owner set for the other palette', () => {
    const mode = modeOf(site([toggle], { colorMode: { theme: { backgroundColor: '#000000' } } }))
    expect(mode.other.backgroundColor).toBe('#000000')
    expect(colorModeCss(mode)).toContain('--pwb-alt-bg:#000000')
    expect(colorModeCss(mode)).toMatch(/^\[data-pwb-theme="dark"\]\{/)
    // The page's own CSS reads --site-*: it follows too.
    expect(colorModeCss(mode)).toContain('--site-bg:#000000')
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
    expect(html.indexOf('--site-bg: #ffffff')).toBeGreaterThan(-1)
    expect(html.indexOf('--site-bg:#111317')).toBeGreaterThan(html.indexOf('--site-bg: #ffffff'))
  })
})

describe('in the visitor\'s browser', () => {
  const pages = []
  afterEach(() => pages.splice(0).forEach((page) => page.window.close()))

  const slate = presetTheme(THEME_PRESETS.find((preset) => preset.id === 'slate'))

  function visit({ stored = null, url = 'https://example.test/', prefersDark = false, follow = false, sandboxed = false, schema = null } = {}) {
    const mode = schema ? modeOf(schema) : { ...modeOf(site()), followDevice: follow }
    const page = new JSDOM(
      '<!DOCTYPE html><html><head></head><body><button data-pwb-theme-toggle aria-pressed="false">x</button>'
        + '<a id="about" href="/about/">About</a><a id="jump" href="#top">Top</a><a id="away" href="https://elsewhere.test/">Away</a></body></html>',
      { url, runScripts: 'outside-only' },
    )
    pages.push(page)
    const { window } = page
    if (stored) window.localStorage.setItem('pwb-color-mode', stored)
    // The builder's own /s/ pages are sandboxed: storage throws there.
    if (sandboxed) Object.defineProperty(window, 'localStorage', { get() { throw new window.DOMException('sandboxed', 'SecurityError') } })
    // A device with no preference answers "light", as browsers do.
    window.matchMedia = (query) => ({ matches: query.includes(prefersDark ? 'dark' : 'light') })
    window.eval(colorModeScript(mode))
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
    function served({ chosen, url = 'https://example.test/', schema = site() }) {
      const attribute = chosen ? ` data-pwb-chosen="${chosen}"` : ''
      const page = new JSDOM(
        `<!DOCTYPE html><html><head><script data-pwb-color-mode${attribute}>${colorModeScript(modeOf(schema))}</script></head><body></body></html>`,
        {
          url,
          runScripts: 'dangerously',
          beforeParse(window) {
            Object.defineProperty(window, 'localStorage', { get() { throw new window.DOMException('sandboxed', 'SecurityError') } })
            window.matchMedia = (query) => ({ matches: query.includes('light') })
          },
        },
      )
      pages.push(page)
      return page.window
    }

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
