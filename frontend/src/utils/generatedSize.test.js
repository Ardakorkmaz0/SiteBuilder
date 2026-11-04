// What the editor writes for a page: what the page uses, and not everything the
// builder can do. A page's source is read by people, and carried by every visitor.
import { afterEach, describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { DEFAULT_THEME } from './theme.js'
import { publishedPagesFor } from './publishedPages.js'
import { schemaToFiles, schemaToSingleHtml } from './schemaToFiles.js'
import { schemaToResponsiveHtml } from './responsiveHtml.js'
import { builderInteractiveJs, runtimeNeeds, withBuilderInteractiveHtml, withBuilderRuntimeHtml, withoutBuilderShim, withoutUnusedRules } from './htmlRuntime.js'

const block = (id, type, y, props = {}, styles = {}) => ({ id, type, props, styles, layout: { x: 60, y, w: 500, h: 60 } })
const nav = block('nav', 'navbar', 0, { brand: 'Brand', links: [{ label: 'Home', href: '#' }] }, { backgroundColor: '#1d1d1f', color: '#f5f5f7' })
const plain = [
  nav,
  block('h', 'heading', 120, { text: 'Hello', level: 'h1' }, { color: '#1d1d1f' }),
  block('t', 'text', 200, { text: 'A small page.' }, { color: '#555555' }),
  block('b', 'button', 280, { text: 'Contact', href: '#' }, { backgroundColor: '#0071e3', color: '#ffffff' }),
]
const site = (components, extra = {}) => ({ theme: { ...DEFAULT_THEME }, pages: [{ id: 'home', name: 'Home', background: '#ffffff', components }], ...extra })
const published = (components, extra) => publishedPagesFor(site(components, extra))[0].html
const lines = (text) => text.split('\n').length

describe('a plain page', () => {
  it('stays small', () => {
    const html = published(plain)
    // It was 57 KB and 971 lines. Not to creep back up without anyone noticing.
    expect(new TextEncoder().encode(html).length).toBeLessThan(13_000)
    expect(lines(html)).toBeLessThan(240)
  })

  it('has no code for what it does not use', () => {
    const html = published(plain)
    for (const absent of ['data-builder-motion', 'pwb-anim-armed', 'selectTab', 'postToInbox', 'choosePalette', 'initSticky', 'fitBoxContent', '[data-builder-tabs]', '.nav-vertical {', '.card-title']) {
      expect(html, absent).not.toContain(absent)
    }
  })

  it('has its comments and indentation left in this repository', () => {
    const script = new JSDOM(published(plain)).window.document.querySelector('script[data-builder-interactive]').textContent
    expect(script).not.toMatch(/^\s*\/\//m)
    expect(script).not.toMatch(/^\s+/m)
  })

  it('keeps what it does use: its menu, its links, its layout', () => {
    const html = published(plain)
    for (const present of ['data-builder-mobile-nav-toggle', 'navLabel', 'scrollIntoView', '.mobile-nav-toggle', '.nav-inner', '.p-home', '.c-nav']) {
      expect(html, present).toContain(present)
    }
  })
})

describe('what a page needs comes with it', () => {
  const open = []
  afterEach(() => open.splice(0).forEach((page) => page.window.close()))

  it.each([
    ['tabs', block('x', 'tabs', 400, { tabs: [{ id: 'a', label: 'A' }], activeId: 'a' }), ['selectTab', '[data-builder-tabs]']],
    ['a form field', block('x', 'input', 400, { label: 'Name' }), ['.pwb-ph']],
    ['an HTML block', block('x', 'html', 400, { code: '<p>x</p>' }), ['relayBlockForm', 'followBlockLink']],
    ['a theme switch', block('x', 'themeToggle', 400, { label: 'Theme' }), ['choosePalette', '.pwb-theme-toggle']],
    ['a reveal animation', block('x', 'text', 400, { text: 'x', animIn: 'fade-up' }), ['data-builder-motion', 'pwb-anim-armed']],
    ['a hover effect', block('x', 'text', 400, { text: 'x', hoverEffect: 'lift' }), []],
  ])('%s', (name, component, wanted) => {
    const html = published([...plain, component])
    for (const part of wanted) expect(html, part).toContain(part)
  })

  it('a page that opens dark with no switch still has the palette code', () => {
    expect(published(plain, { colorMode: { start: 'dark' } })).toContain('choosePalette')
  })

  it('a page with a script of its owner gets all of it, since that script can make anything', () => {
    const html = published(plain, { customJs: 'document.body.append("x")' })
    for (const part of ['selectTab', 'postToInbox', 'choosePalette', 'initSticky', 'fitBoxContent', 'data-builder-motion', '.nav-vertical', '--site-soft']) {
      expect(html, part).toContain(part)
    }
  })

  it('a stylesheet of its owner keeps the theme variables it reads', () => {
    const html = published(plain, { customCss: '.mine { color: var(--site-accent); }' })
    expect(html).toContain('--site-accent:')
    expect(html).not.toContain('--site-soft:')
  })

  it('the script still runs, with every part cut away', () => {
    const page = new JSDOM(`<!DOCTYPE html><body><a id="top" href="#">x</a></body>`, { url: 'https://example.test/', runScripts: 'outside-only' })
    open.push(page)
    expect(() => page.window.eval(builderInteractiveJs('<p>nothing</p>'))).not.toThrow()
    page.window.scrollTo = () => {}
    page.window.document.dispatchEvent(new page.window.Event('DOMContentLoaded'))
    const event = new page.window.MouseEvent('click', { bubbles: true, cancelable: true })
    page.window.document.getElementById('top').dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it.each([
    ['tabs', 'data-builder-tab="a"'], ['nav', 'data-builder-mobile-nav'], ['reveal', 'data-pwb-reveal'], ['forms', '<form>'],
    ['forms', '<iframe srcdoc="x">'], ['sticky', 'data-builder-sticky'], ['fit', 'data-pwb-fit="x"'], ['fit', 'data-pwb-container-width="1"'],
    ['fields', '<input>'], ['motion', 'data-anim-in="x"'], ['motion', 'pwb-hover'], ['palette', 'data-pwb-theme-toggle'], ['palette', 'data-pwb-color-mode'],
  ])('reads %s from %s', (need, markup) => {
    expect(runtimeNeeds('<p>x</p>')[need]).toBe(false)
    expect(runtimeNeeds(markup)[need]).toBe(true)
  })

  it('takes an inline handler for a script of its author', () => {
    expect(runtimeNeeds('<button onclick="go()">x</button>').tabs).toBe(true)
    expect(runtimeNeeds('<button ONCLICK = "go()">x</button>').tabs).toBe(true)
    expect(runtimeNeeds('<p>once = 1, online=2</p>').tabs).toBe(false)
  })

  it('finds an inline handler however the tag around it is written', () => {
    expect(runtimeNeeds('<button title="a>b" onclick="go()">x</button>').tabs).toBe(true)
    expect(runtimeNeeds("<button title='a>b' onclick='go()'>x</button>").tabs).toBe(true)
    expect(runtimeNeeds('<img/onerror="go()" src="a.png">').tabs).toBe(true)
    expect(runtimeNeeds('<a href="x"onclick="go()">x</a>').tabs).toBe(true)
    expect(runtimeNeeds('<a href="javascript:go()">x</a>').tabs).toBe(true)
  })

  it('takes a script for the builder\'s only by a real attribute of that name', () => {
    expect(runtimeNeeds('<script title="data-builder-layout">go()</script>').tabs).toBe(true)
    expect(runtimeNeeds("<script title='data-pwb-color-mode'>go()</script>").tabs).toBe(true)
    expect(runtimeNeeds('<script data-builder-layout-of-mine>go()</script>').tabs).toBe(true)
    expect(runtimeNeeds('<script title="a>b" data-builder-layout>x</script>').tabs).toBe(false)
    expect(runtimeNeeds('<script data-builder-layout="">x</script>').tabs).toBe(false)
  })

  it('does not take what a page says for a handler', () => {
    expect(runtimeNeeds('<p>a > b onclick = 1</p>').tabs).toBe(false)
    expect(runtimeNeeds('<p>1 < 2 onclick=3</p>').tabs).toBe(false)
    expect(runtimeNeeds('<a title=" onclick=go()">x</a>').tabs).toBe(false)
  })

  it('reads a broken page without taking long', () => {
    const started = performance.now()
    for (const page of [
      '<a "'.repeat(50000), "<a '".repeat(50000), '<a '.repeat(60000), '<a title="x>'.repeat(15000),
      `<script title="${'<script '.repeat(50000)}data-builder-layout"></script>`,
      `${'<script '.repeat(50000)}data-builder-layout></script>`,
    ]) runtimeNeeds(page)
    expect(performance.now() - started).toBeLessThan(2000)
  })

  it('counts its own scripts as no reason for all of it', () => {
    expect(runtimeNeeds('<script data-builder-layout>x</script>').tabs).toBe(false)
    expect(runtimeNeeds('<script data-pwb-color-mode>x</script>').tabs).toBe(false)
    expect(runtimeNeeds('<script data-pwb-state-reporter>x</script>').tabs).toBe(false)
    expect(runtimeNeeds('<script data-builder-custom-js>x</script>').tabs).toBe(true)
    expect(runtimeNeeds('<script>x</script>').tabs).toBe(true)
    expect(runtimeNeeds('<script src="a.js"></script>').tabs).toBe(true)
    expect(runtimeNeeds(undefined).tabs).toBe(true)
  })
})

describe('every writer', () => {
  it('writes the motion stylesheet once on a page with motion', () => {
    const moving = [...plain, block('x', 'text', 400, { text: 'x', animIn: 'fade-up' })]
    for (const html of [schemaToSingleHtml(site(moving)), schemaToResponsiveHtml(site(moving))]) {
      expect(html.match(/<style data-builder-motion-style>/g)).toHaveLength(1)
    }
  })

  it('drops the responsive writer\'s rules for blocks the page does not have', () => {
    const html = schemaToResponsiveHtml(site(plain))
    expect(html).not.toContain('.rh-card {')
    expect(html).toContain('.rh-container {')
  })

  it('writes none on a page without', () => {
    for (const html of [schemaToSingleHtml(site(plain)), schemaToResponsiveHtml(site(plain))]) {
      expect(html).not.toContain('data-builder-motion')
    }
  })

  it('shares a project\'s runtime by what its pages together need', () => {
    const two = site(plain)
    two.pages.push({ id: 'about', name: 'About', components: [block('x', 'tabs', 100, { tabs: [{ id: 'a', label: 'A' }], activeId: 'a' })] })
    const files = schemaToFiles(two)
    expect(files.find((file) => file.name === 'runtime.js').content).toContain('selectTab')
    expect(files.find((file) => file.name === 'styles.css').content).toContain('[data-builder-tabs]')
    const alone = schemaToFiles(site(plain))
    expect(alone.find((file) => file.name === 'runtime.js').content).not.toContain('selectTab')
    // The theme's variables stay in a file its owner goes on to edit.
    expect(alone.find((file) => file.name === 'styles.css').content).toContain('--site-soft:')
    expect(alone.find((file) => file.name === 'styles.css').content).not.toContain('.card-title')
  })

  it('writes a project\'s code for its pages as they were edited, not as they were drawn', () => {
    const page = '<!doctype html><form><h3 class="card-title">x</h3></form><script src="runtime.js"></script>'
    const files = schemaToFiles(site(plain), { documents: { 'index.html': page } })
    expect(files.find((file) => file.name === 'index.html').content).toBe(page)
    expect(files.find((file) => file.name === 'runtime.js').content).toContain('postToInbox')
    expect(files.find((file) => file.name === 'styles.css').content).toContain('.card-title')
  })
})

describe('an HTML page or block given the shim', () => {
  it('gets what its own markup uses', () => {
    const out = withBuilderInteractiveHtml('<html><body><a href="#">x</a></body></html>')
    expect(out).toContain('data-builder-interactive')
    expect(out).not.toContain('selectTab')
    expect(out).not.toContain('data-builder-motion')
  })

  it('gets the motion it uses', () => {
    expect(withBuilderInteractiveHtml('<html><body><p data-anim-in="fade">x</p></body></html>')).toContain('data-builder-motion')
  })

  it('is left alone when it has it already', () => {
    const once = withBuilderInteractiveHtml('<html><body><p data-anim-in="fade">x</p></body></html>')
    expect(withBuilderInteractiveHtml(once)).toBe(once)
  })
})

describe('a page written by the builder and edited afterwards', () => {
  const written = () => schemaToResponsiveHtml(site(plain))
  const add = (doc, markup) => doc.replace('</body>', `${markup}</body>`)
  const form = '<form><input name="a"><button>Send</button></form>'
  const tabs = '<div data-builder-tabs><button role="tab" data-builder-tab="a">A</button></div>'
  const toggle = '<button data-pwb-theme-toggle>t</button>'

  it.each([
    ['a form', form, ['postToInbox', '.pwb-ph']],
    ['tabs', tabs, ['selectTab', '[role="tablist"]']],
    ['a theme switch', toggle, ['choosePalette', '.pwb-theme-toggle']],
  ])('gets the code for %s it was given', (name, markup, wanted) => {
    const out = withBuilderInteractiveHtml(add(written(), markup))
    for (const part of wanted) expect(out, part).toContain(part)
    // In place of the one it had: only the first copy in a document would run.
    expect(out.match(/<script data-builder-interactive\b/g)).toHaveLength(1)
  })

  it('keeps what it used before', () => {
    const out = withBuilderInteractiveHtml(add(written(), form))
    expect(out).toContain('navLabel')
  })

  it('stays as it is when nothing changed', () => {
    const doc = written()
    expect(withBuilderInteractiveHtml(doc)).toBe(doc)
  })

  it('gets everything while it is being edited, in one copy', () => {
    const out = withBuilderRuntimeHtml(written())
    for (const part of ['postToInbox', 'selectTab', 'choosePalette']) expect(out, part).toContain(part)
    expect(out.match(/<script data-builder-interactive\b/g)).toHaveLength(1)
  })

  it('leaves a document from an earlier version, which has it all, alone', () => {
    const old = '<html><body><form></form><style data-builder-interactive-style>x</style><script data-builder-interactive>old()</script></body></html>'
    expect(withBuilderInteractiveHtml(old)).toContain('old()')
    expect(withBuilderRuntimeHtml(old)).toContain('old()')
  })

  it('is kept without the builder\'s code when it becomes an HTML page', () => {
    const moving = schemaToResponsiveHtml(site([...plain, block('x', 'text', 400, { text: 'x', animIn: 'fade-up' })]))
    const kept = withoutBuilderShim(moving)
    expect(kept).not.toContain('data-builder-interactive')
    expect(kept).not.toContain('data-builder-motion')
    expect(kept).toContain('data-anim-in')
    expect(kept).toContain('Hello')
    // It comes back, for what the page uses, when the page is shown.
    const shown = withBuilderInteractiveHtml(kept)
    expect(shown).toContain('data-builder-interactive')
    expect(shown).toContain('data-builder-motion')
    expect(shown).toContain('navLabel')
  })
})

describe('the rules that are dropped', () => {
  const css = (...rules) => rules.join('\n')

  it('are those no element can match', () => {
    expect(withoutUnusedRules(css('.a { x: 1; }', '.b { x: 1; }'), '<p class="a c"></p>')).toBe('.a { x: 1; }')
  })

  it('are not those a part of a list can match', () => {
    expect(withoutUnusedRules('.a, .b { x: 1; }', '<p class="b"></p>')).toBe('.a, .b { x: 1; }')
  })

  it('look past :not(), which an absent class satisfies', () => {
    expect(withoutUnusedRules('.a:not(.b) { x: 1; }', '<p class="a"></p>')).toBe('.a:not(.b) { x: 1; }')
    expect(withoutUnusedRules('.a .b { x: 1; }', '<p class="a"></p>')).toBe('')
  })

  it('leave anything else alone', () => {
    const others = css('* { x: 1; }', 'body { x: 1; }', 'a.b { x: 1; }', '[data-x] { x: 1; }')
    expect(withoutUnusedRules(others, '<p></p>')).toBe(others)
  })

  it('take an emptied media query with them', () => {
    expect(withoutUnusedRules(css('@media (max-width: 1px) {', '  .b { x: 1; }', '}'), '<p></p>').trim()).toBe('')
    const kept = css('@media (max-width: 1px) {', '  .a { x: 1; }', '}')
    expect(withoutUnusedRules(kept, '<p class="a"></p>')).toBe(kept)
  })

  it('keep the variables something reads, in the stylesheet or the page', () => {
    const vars = css('  --site-a: 1;', '  --site-b: 2;', '  --site-c: 3;', '.x { color: var(--site-a); }')
    expect(withoutUnusedRules(vars, '<p class="x" style="color:var(--site-c)"></p>')).toBe(css('  --site-a: 1;', '  --site-c: 3;', '.x { color: var(--site-a); }'))
  })

  it('stay, all of them, with a script of the owner on the page', () => {
    expect(withoutUnusedRules('.b { x: 1; }', '<script>add()</script>')).toBe('.b { x: 1; }')
  })
})
