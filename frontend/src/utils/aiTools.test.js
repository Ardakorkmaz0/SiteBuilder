// executeTool against the real store: the id guard, the four capability tools
// added for motion / SEO / navbar placement / sections, and the change-request
// classifier behind the "you called nothing" self-check.
//
// These run the actual editor store, so a regression that makes a tool a silent
// no-op — the failure mode that let the assistant report success for work that
// never happened — shows up here rather than in the user's site.
import { describe, expect, it, beforeEach } from 'vitest'
import { executeTool, looksLikeChangeRequest } from './aiAssistant.js'
import { useEditorStore, selectCurrentPage } from '../store/editorStore.js'

function page() {
  return selectCurrentPage(useEditorStore.getState())
}

function add(type) {
  const before = page().components.map((c) => c.id)
  useEditorStore.getState().addComponent(type)
  return page().components.map((c) => c.id).find((id) => !before.includes(id))
}

beforeEach(() => {
  const s = useEditorStore.getState()
  s.loadSchema({
    theme: {},
    pages: [{ id: 'page_home', name: 'Home', components: [], background: '#ffffff' }],
  })
})

describe('a parent that is full', () => {
  const full = {
    id: 'box', type: 'container', props: {}, styles: {}, layout: { x: 0, y: 0, w: 500, h: 500 },
    children: Array.from({ length: 60 }, (_, index) => ({ id: `kid${index}`, type: 'heading', props: {}, styles: {}, layout: { x: 0, y: 0, w: 100, h: 40 } })),
  }
  beforeEach(() => {
    useEditorStore.getState().loadSchema({ theme: {}, pages: [{ id: 'page_home', name: 'Home', components: [full] }] })
  })

  it('reports a copy that was refused instead of success', () => {
    const result = executeTool('duplicateComponent', { id: 'kid3' })

    expect(result.ok).toBe(false)
    expect(page().components[0].children.length).toBe(60)
  })

  it('reports a block that was refused instead of success', () => {
    const result = executeTool('addComponent', { type: 'heading', parentId: 'box' })

    expect(result.ok).toBe(false)
    expect(page().components[0].children.length).toBe(60)
  })
})

describe('id validation', () => {
  it('rejects a made-up id instead of reporting success', () => {
    const res = executeTool('updateProps', { id: 'nope_123', patch: { text: 'x' } })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/not found/i)
  })

  it('names the ids that do exist so the model can retry', () => {
    const id = add('text')
    const res = executeTool('updateStyles', { id: 'ghost', patch: { color: '#fff' } })
    expect(res.error).toContain(id)
  })

  it('still applies the change when the id is real', () => {
    const id = add('text')
    expect(executeTool('updateProps', { id, patch: { text: 'Hello' } }).ok).toBe(true)
    expect(page().components.find((c) => c.id === id).props.text).toBe('Hello')
  })

  it('rejects an unknown parentId rather than silently placing at top level', () => {
    const res = executeTool('addComponent', { type: 'text', parentId: 'ghost' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/Parent not found/i)
  })

  it('rejects an unknown page id', () => {
    const res = executeTool('selectPage', { id: 'page_ghost' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/Page not found/i)
  })
})

describe('setMotion', () => {
  it('writes the entrance, hover, speed and delay props', () => {
    const id = add('card')
    const res = executeTool('setMotion', { id, animIn: 'fade-up', animHover: 'lift', animSpeed: 'fast', animDelay: 120 })
    expect(res.ok).toBe(true)
    const props = page().components.find((c) => c.id === id).props
    expect(props).toMatchObject({ animIn: 'fade-up', animHover: 'lift', animSpeed: 'fast', animDelay: 120 })
  })

  it('clamps the delay into the supported range', () => {
    const id = add('card')
    executeTool('setMotion', { id, animDelay: 99999 })
    expect(page().components.find((c) => c.id === id).props.animDelay).toBe(3000)
  })

  it('rejects an invented animation name and lists the real ones', () => {
    const id = add('card')
    const res = executeTool('setMotion', { id, animIn: 'explode' })
    expect(res.ok).toBe(false)
    expect(res.error).toContain('fade-up')
    expect(page().components.find((c) => c.id === id).props.animIn).toBeUndefined()
  })

  it('refuses to animate a pinned bar, which cannot animate', () => {
    const id = add('navbar')
    executeTool('updateProps', { id, patch: { scrollBehavior: 'fixed' } })
    const res = executeTool('setMotion', { id, animIn: 'fade' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/pinned/i)
  })

  it('needs at least one field', () => {
    const id = add('card')
    expect(executeTool('setMotion', { id }).ok).toBe(false)
  })
})

describe('setPageMeta', () => {
  it('writes SEO fields to the current page by default', () => {
    const res = executeTool('setPageMeta', { seoTitle: 'Arda — Designer', seoDescription: 'Portfolio of an interface designer.' })
    expect(res.ok).toBe(true)
    expect(page().seoTitle).toBe('Arda — Designer')
    expect(page().seoDescription).toBe('Portfolio of an interface designer.')
  })

  it('truncates rather than storing an unbounded description', () => {
    executeTool('setPageMeta', { seoDescription: 'x'.repeat(500) })
    expect(page().seoDescription.length).toBe(200)
  })

  it('rejects an unknown page', () => {
    expect(executeTool('setPageMeta', { pageId: 'ghost', seoTitle: 'x' }).ok).toBe(false)
  })
})

describe('setNavbarLayout', () => {
  it('sets placement props on a navbar', () => {
    const id = add('navbar')
    const res = executeTool('setNavbarLayout', { id, linksAlign: 'center', brandAlign: 'left', linkGap: 24, scrollBehavior: 'sticky' })
    expect(res.ok).toBe(true)
    expect(page().components.find((c) => c.id === id).props).toMatchObject({
      linksAlign: 'center', brandAlign: 'left', linkGap: 24, scrollBehavior: 'sticky',
    })
  })

  it('refuses a component that is not a navbar', () => {
    const id = add('text')
    const res = executeTool('setNavbarLayout', { id, linksAlign: 'center' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/not a navbar/i)
  })

  it('rejects an out-of-vocabulary value', () => {
    const id = add('navbar')
    const res = executeTool('setNavbarLayout', { id, linksAlign: 'justified' })
    expect(res.ok).toBe(false)
    expect(res.error).toContain('center')
  })
})

describe('addSection', () => {
  it('creates a region and returns an id usable as a parent', () => {
    const res = executeTool('addSection', { background: '#0f172a', height: 500 })
    expect(res.ok).toBe(true)
    const band = page().components.find((c) => c.id === res.id)
    expect(band.type).toBe('region')
    // Background must land in styles: props go through the server allowlist.
    expect(band.styles.backgroundColor).toBe('#0f172a')
    expect(band.layout.h).toBe(500)
    expect(executeTool('addComponent', { type: 'heading', parentId: res.id }).ok).toBe(true)
  })
})

describe('looksLikeChangeRequest', () => {
  it('treats edits as change requests', () => {
    expect(looksLikeChangeRequest('add a navbar')).toBe(true)
    expect(looksLikeChangeRequest('sayfaya bir buton ekle')).toBe(true)
    expect(looksLikeChangeRequest('make the hero blue')).toBe(true)
  })

  it('treats meta questions and slash commands as conversation', () => {
    expect(looksLikeChangeRequest('what can you do?')).toBe(false)
    expect(looksLikeChangeRequest('neler yapabilirsin')).toBe(false)
    expect(looksLikeChangeRequest('/help')).toBe(false)
    expect(looksLikeChangeRequest('')).toBe(false)
  })
})

describe('id validation across pages', () => {
  // The snapshot lists every page, so the model reaches for ids that exist but
  // are not reachable: the store's updaters only ever touch the current page,
  // so those calls used to be silent no-ops reported as success.
  function twoPages() {
    const id = add('heading')
    executeTool('updateProps', { id, patch: { text: 'ORIGINAL' } })
    useEditorStore.getState().addPage('Second')
    const second = useEditorStore.getState().schema.pages[1].id
    useEditorStore.getState().selectPage(second)
    return id
  }

  it('refuses an id that lives on another page and names that page', () => {
    const id = twoPages()
    const res = executeTool('updateProps', { id, patch: { text: 'CHANGED' } })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/selectPage/)
    expect(res.error).toContain('Second')
    expect(useEditorStore.getState().schema.pages[0].components[0].props.text).toBe('ORIGINAL')
  })

  it('refuses a cross-page delete instead of reporting a phantom success', () => {
    const id = twoPages()
    expect(executeTool('removeComponent', { id }).ok).toBe(false)
    expect(useEditorStore.getState().schema.pages[0].components).toHaveLength(1)
  })

  it('refuses cross-page setMotion, replaceComponentText and centerHorizontally', () => {
    const id = twoPages()
    expect(executeTool('setMotion', { id, animIn: 'fade-up' }).ok).toBe(false)
    expect(executeTool('replaceComponentText', { id, text: 'x' }).ok).toBe(false)
    expect(executeTool('centerHorizontally', { id }).ok).toBe(false)
    const original = useEditorStore.getState().schema.pages[0].components[0]
    expect(original.props.animIn).toBeUndefined()
    expect(original.props.text).toBe('ORIGINAL')
  })

  it('works again once the model switches to that page', () => {
    const id = twoPages()
    const home = useEditorStore.getState().schema.pages[0].id
    expect(executeTool('selectPage', { id: home }).ok).toBe(true)
    expect(executeTool('updateProps', { id, patch: { text: 'CHANGED' } }).ok).toBe(true)
    expect(useEditorStore.getState().schema.pages[0].components[0].props.text).toBe('CHANGED')
  })

  it('only lists ids from the current page in the not-found error', () => {
    const id = twoPages()
    useEditorStore.getState().addComponent('text')
    const res = executeTool('updateProps', { id: 'ghost_1', patch: {} })
    expect(res.error).not.toContain(id)
    expect(res.error).toMatch(/text_/)
  })
})

describe('setLayout argument validation', () => {
  // The id was guarded but the VALUES were not, so a patch like {x:"left"}
  // stored NaN in the layout and still reported ok:true.
  it('refuses a non-numeric coordinate instead of storing NaN', () => {
    const id = add('heading')
    const before = { ...page().components[0].layout }
    const res = executeTool('setLayout', { id, patch: { x: 'left' } })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/must be a number/)
    expect(page().components[0].layout).toEqual(before)
  })

  it('refuses null and rejects the whole call, not just the bad key', () => {
    const id = add('heading')
    const res = executeTool('setLayout', { id, patch: { x: 120, y: null } })
    expect(res.ok).toBe(false)
    expect(page().components[0].layout.x).not.toBe(120)
  })

  it('needs at least one coordinate', () => {
    const id = add('heading')
    expect(executeTool('setLayout', { id, patch: {} }).ok).toBe(false)
    expect(executeTool('setLayout', { id }).ok).toBe(false)
  })

  it('accepts and rounds real numbers', () => {
    const id = add('heading')
    const res = executeTool('setLayout', { id, patch: { x: 120.4, y: 60.6 } })
    expect(res.ok).toBe(true)
    expect(res.applied).toEqual({ x: 120, y: 61 })
    expect(page().components[0].layout).toMatchObject({ x: 120, y: 61 })
  })

  it('accepts a numeric string, since models often quote numbers', () => {
    const id = add('heading')
    expect(executeTool('setLayout', { id, patch: { x: '80' } }).ok).toBe(true)
    expect(page().components[0].layout.x).toBe(80)
  })
})

// A tool that did nothing must say so. "ok" for a component that was never
// created is how the assistant ends a turn with "I added a footer" over a page
// that has none.
describe('addComponent that adds nothing', () => {
  it('refuses a component type that does not exist and lists the real ones', () => {
    const res = executeTool('addComponent', { type: 'footer' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/footer/)
    expect(res.error).toContain('heading')
    expect(page().components).toHaveLength(0)
  })

  it('refuses a parent that cannot hold components', () => {
    const heading = add('heading')
    const res = executeTool('addComponent', { type: 'text', parentId: heading })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/container|section|tabs/i)
    expect(page().components).toHaveLength(1)
  })

  it('still reports the new id when the component was created', () => {
    const res = executeTool('addComponent', { type: 'heading' })
    expect(res.ok).toBe(true)
    expect(res.id).toBe(page().components[0].id)
  })
})

describe('setActiveTab', () => {
  it('refuses a tab the block does not have', () => {
    const tabs = add('tabs')
    const res = executeTool('setActiveTab', { id: tabs, tabId: 'no-such-tab' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/no-such-tab/)
  })

  it('refuses a block that is not a tabs block', () => {
    const heading = add('heading')
    expect(executeTool('setActiveTab', { id: heading, tabId: 't1' }).ok).toBe(false)
  })
})

describe('alignComponent', () => {
  it('refuses a mode that is not one of the six', () => {
    const heading = add('heading')
    const res = executeTool('alignComponent', { id: heading, mode: 'centre' })
    expect(res.ok).toBe(false)
    expect(res.error).toContain('centerH')
  })
})

// A call the store accepts is not yet a change the page shows. Every case
// here used to come back { ok: true } while the page stayed as it was, lost
// something, or kept a value nothing reads.
function find(id) {
  const walk = (list) => {
    for (const c of list || []) {
      if (c.id === id) return c
      const inside = walk(c.children)
      if (inside) return inside
    }
    return null
  }
  return walk(page().components)
}

function load(components, pageFields = {}) {
  useEditorStore.getState().loadSchema({
    theme: {},
    pages: [{ id: 'page_home', name: 'Home', components, background: '#ffffff', ...pageFields }],
  })
}

const block = (id, type, extra = {}) => ({
  id, type, props: {}, styles: {}, layout: { x: 0, y: 0, w: 200, h: 40 }, ...extra,
})

describe('a style patch', () => {
  beforeEach(() => load([block('h', 'heading', { styles: { color: '#111111' } })]))

  it('written as JSON text is read as the object it spells', () => {
    const res = executeTool('updateStyles', { id: 'h', patch: '{"color":"#ff0000"}' })

    expect(res.ok).toBe(true)
    expect(find('h').styles).toEqual({ color: '#ff0000' })
  })

  it('that is not an object is refused and leaves the block alone', () => {
    for (const patch of ['make it red', ['color', 'red'], undefined, {}]) {
      const res = executeTool('updateStyles', { id: 'h', patch })

      expect(res.ok).toBe(false)
      expect(find('h').styles).toEqual({ color: '#111111' })
    }
  })

  it('with a style the page does not draw is refused, with the styles that work', () => {
    const res = executeTool('updateStyles', { id: 'h', patch: { justifyContent: 'center' } })

    expect(res.ok).toBe(false)
    expect(res.error).toContain('"justifyContent" is not a supported style')
    expect(res.error).toContain('backgroundColor, backgroundImage, color')
    expect(find('h').styles).toEqual({ color: '#111111' })
  })

  it('in CSS spelling lands on the key the page reads', () => {
    expect(executeTool('updateStyles', { id: 'h', patch: { 'background-color': '#000000', 'font-size': '40px' } }).ok).toBe(true)
    expect(find('h').styles).toEqual({ color: '#111111', backgroundColor: '#000000', fontSize: '40px' })

    expect(executeTool('updateStyles', { id: 'h', patch: { background: '#123456' } }).ok).toBe(true)
    expect(find('h').styles.backgroundColor).toBe('#123456')

    expect(executeTool('updateStyles', { id: 'h', patch: { background: 'linear-gradient(90deg, #000, #fff)' } }).ok).toBe(true)
    expect(find('h').styles.backgroundImage).toBe('linear-gradient(90deg, #000, #fff)')
    expect(find('h').styles).not.toHaveProperty('background')
  })

  it('with a value the page drops is refused, and the block keeps its colour', () => {
    const picture = executeTool('updateStyles', { id: 'h', patch: { backgroundImage: 'url(https://example.com/a.png)' } })
    expect(picture.ok).toBe(false)
    expect(picture.error).toContain('url()')

    const object = executeTool('updateStyles', { id: 'h', patch: { color: { r: 255, g: 0, b: 0 } } })
    expect(object.ok).toBe(false)

    expect(find('h').styles).toEqual({ color: '#111111' })
  })
})

describe('a props patch', () => {
  beforeEach(() => load([
    block('b', 'button', { props: { text: 'Buy', href: '#buy', icon: '' } }),
    block('h', 'heading', { props: { text: 'Hello', level: 'h1' } }),
    block('l', 'list', { props: { text: 'One\nTwo', ordered: '' } }),
  ]))

  it('with a prop the block does not have is refused, with the props it has', () => {
    const res = executeTool('updateProps', { id: 'b', patch: { label: 'Order now' } })

    expect(res.ok).toBe(false)
    expect(res.error).toContain('a button has no "label" prop')
    expect(res.error).toContain('Props of a button: text, href, icon')
    expect(find('b').props).toEqual({ text: 'Buy', href: '#buy', icon: '' })
  })

  it('carrying a style is sent to updateStyles', () => {
    const res = executeTool('updateProps', { id: 'h', patch: { color: '#ff0000' } })

    expect(res.ok).toBe(false)
    expect(res.error).toContain('"color" is a style, not a prop: set it with updateStyles')
    expect(find('h').props).toEqual({ text: 'Hello', level: 'h1' })
  })

  it('that is not an object is refused and writes nothing', () => {
    for (const patch of ['new text', ['text', 'x'], undefined, {}]) {
      expect(executeTool('updateProps', { id: 'h', patch }).ok).toBe(false)
      expect(find('h').props).toEqual({ text: 'Hello', level: 'h1' })
    }
  })

  it('keeps a choice field to the choices the block offers', () => {
    expect(executeTool('updateProps', { id: 'h', patch: { level: 2 } }).ok).toBe(true)
    expect(find('h').props.level).toBe('h2')

    const bad = executeTool('updateProps', { id: 'h', patch: { level: 'h9' } })
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('"level" must be one of: "h1", "h2", "h3"')
    expect(find('h').props.level).toBe('h2')

    // An on/off field is stored as '' and '1', not as true and false.
    expect(executeTool('updateProps', { id: 'l', patch: { ordered: true } }).ok).toBe(true)
    expect(find('l').props.ordered).toBe('1')
    expect(executeTool('updateProps', { id: 'l', patch: { ordered: false } }).ok).toBe(true)
    expect(find('l').props.ordered).toBe('')
  })

  it('still sets the props a block really has', () => {
    expect(executeTool('updateProps', { id: 'b', patch: { text: 'Order now', href: '#order' } }).ok).toBe(true)
    expect(find('b').props).toEqual({ text: 'Order now', href: '#order', icon: '' })
    // A heading can be wrapped in a link, and any block can carry an anchor.
    expect(executeTool('updateProps', { id: 'h', patch: { href: '/about', anchor: 'top' } }).ok).toBe(true)
    expect(find('h').props).toEqual({ text: 'Hello', level: 'h1', href: '/about', anchor: 'top' })
  })

  it('with a value that is not text, a number or true/false is refused', () => {
    const res = executeTool('updateProps', { id: 'h', patch: { text: { en: 'Hello' } } })

    expect(res.ok).toBe(false)
    expect(find('h').props.text).toBe('Hello')
  })
})

describe('addComponent coordinates', () => {
  it('refuses a coordinate that is not a number', () => {
    const res = executeTool('addComponent', { type: 'heading', x: 'left', y: 10 })

    expect(res.ok).toBe(false)
    expect(res.error).toContain('addComponent x must be a number')
    expect(page().components).toHaveLength(0)
  })

  it('puts a block at 0, 0 when asked to, and at 24, 24 when not told', () => {
    const corner = executeTool('addComponent', { type: 'heading', x: 0, y: 0 })
    expect(find(corner.id).layout).toMatchObject({ x: 0, y: 0 })

    const placed = executeTool('addComponent', { type: 'heading', x: '120', y: 300.4 })
    expect(find(placed.id).layout).toMatchObject({ x: 120, y: 300 })

    const anywhere = executeTool('addComponent', { type: 'heading' })
    expect(find(anywhere.id).layout).toMatchObject({ x: 24, y: 24 })
  })
})

describe('duplicateComponent', () => {
  it('answers with the id of the copy', () => {
    load([block('h', 'heading', { props: { text: 'Hello', level: 'h1' } })])

    const res = executeTool('duplicateComponent', { id: 'h' })

    expect(res.ok).toBe(true)
    expect(res.id).not.toBe('h')
    expect(find(res.id).props.text).toBe('Hello')
    expect(page().components).toHaveLength(2)
  })
})

describe('site-wide code', () => {
  beforeEach(() => {
    useEditorStore.getState().setCustomCss('body { color: red; }')
    useEditorStore.getState().setCustomJs('console.log(1)')
  })

  it('is not wiped by a call that arrives without its code', () => {
    for (const args of [{}, { code: { css: 'a{}' } }, { code: null }, undefined]) {
      expect(executeTool('setCustomCss', args).ok).toBe(false)
      expect(executeTool('setCustomJs', args).ok).toBe(false)
    }
    expect(useEditorStore.getState().schema.customCss).toBe('body { color: red; }')
    expect(useEditorStore.getState().schema.customJs).toBe('console.log(1)')
  })

  it('is replaced by a string, and cleared by an empty one', () => {
    expect(executeTool('setCustomCss', { code: 'a { color: blue; }' }).ok).toBe(true)
    expect(useEditorStore.getState().schema.customCss).toBe('a { color: blue; }')
    expect(executeTool('setCustomCss', { code: '' }).ok).toBe(true)
    expect(useEditorStore.getState().schema.customCss).toBe('')
  })

  it('longer than the site keeps is refused, not cut in the middle of a rule', () => {
    const res = executeTool('setCustomCss', { code: 'a{}'.repeat(6667) })

    expect(res.ok).toBe(false)
    expect(res.error).toContain('20001 characters and the limit is 20000')
    expect(useEditorStore.getState().schema.customCss).toBe('body { color: red; }')
  })
})

describe('addPage', () => {
  it('names the page with text, never a number or an object', () => {
    executeTool('addPage', { name: 42 })
    expect(useEditorStore.getState().schema.pages.map((p) => p.name)).toEqual(['Home', '42'])

    const res = executeTool('addPage', { name: { en: 'About' } })
    expect(res.ok).toBe(false)
    expect(useEditorStore.getState().schema.pages).toHaveLength(2)
  })
})

describe('updateTheme', () => {
  it('refuses a key the theme does not have, with the keys it has', () => {
    for (const patch of [{ primary: '#ff0000' }, { accentColour: '#ff0000' }, 'blue', undefined, {}]) {
      const res = executeTool('updateTheme', { patch })

      expect(res.ok).toBe(false)
      expect(res.error).toContain('primaryColor, buttonTextColor, textColor')
    }
    expect(useEditorStore.getState().schema.theme.primaryColor).toBe('#0071e3')
  })

  it('applies the keys the theme has', () => {
    const res = executeTool('updateTheme', { patch: { primaryColor: '#ff0000', radius: 8 } })

    expect(res.ok).toBe(true)
    expect(useEditorStore.getState().schema.theme.primaryColor).toBe('#ff0000')
    expect(useEditorStore.getState().schema.theme.radius).toBe('8')
  })
})

describe('centerHorizontally', () => {
  it('centres a block in what holds it, not in the page', () => {
    load([
      block('box', 'container', {
        layout: { x: 500, y: 0, w: 400, h: 300 },
        children: [block('kid', 'heading', { layout: { x: 0, y: 10, w: 100, h: 40 } })],
      }),
      block('top', 'heading', { layout: { x: 0, y: 400, w: 200, h: 40 } }),
    ], { canvasWidth: 1000 })

    expect(executeTool('centerHorizontally', { id: 'kid' })).toEqual({ ok: true, x: 150 })
    expect(find('kid').layout.x).toBe(150)

    expect(executeTool('centerHorizontally', { id: 'top' })).toEqual({ ok: true, x: 400 })
    expect(find('top').layout.x).toBe(400)
  })

  it('says so on a page that stacks its blocks, where x is not used', () => {
    load([block('top', 'heading', { layout: { x: 0, y: 0, w: 200, h: 40 } })], { flowMode: true })

    const res = executeTool('centerHorizontally', { id: 'top' })

    expect(res.ok).toBe(false)
    expect(res.error).toContain('textAlign')
    expect(find('top').layout.x).toBe(0)
  })
})

describe('setLinks', () => {
  const links = [{ label: 'Home', href: '#home' }, { label: 'About', href: '#about' }]
  beforeEach(() => load([
    block('nav', 'navbar', { props: { brand: 'Acme', links } }),
    block('h', 'heading', { props: { text: 'Hello', level: 'h1' } }),
  ]))

  it('only writes to a navbar', () => {
    const res = executeTool('setLinks', { id: 'h', links: [{ label: 'Home', href: '#home' }] })

    expect(res.ok).toBe(false)
    expect(res.error).toContain('is a heading, not a navbar')
    expect(find('h').props).toEqual({ text: 'Hello', level: 'h1' })
  })

  it('keeps the navbar as it is when the links are not a list of { label, href }', () => {
    for (const bad of ['Home, About', undefined, ['Home', 'About'], [{ href: '#x' }]]) {
      expect(executeTool('setLinks', { id: 'nav', links: bad }).ok).toBe(false)
      expect(find('nav').props.links).toEqual(links)
    }
  })

  it('replaces the links', () => {
    const res = executeTool('setLinks', { id: 'nav', links: [{ label: 'Menu', href: '/menu' }, { label: 'Contact' }] })

    expect(res).toEqual({ ok: true, count: 2 })
    expect(find('nav').props.links).toEqual([{ label: 'Menu', href: '/menu' }, { label: 'Contact', href: '' }])
  })
})

describe('setSelectOptions', () => {
  beforeEach(() => load([
    block('s', 'select', { props: { label: 'Size', options: 'One\nTwo' } }),
    block('h', 'heading', { props: { text: 'Hello', level: 'h1' } }),
  ]))

  it('only writes to a block that offers choices', () => {
    expect(executeTool('setSelectOptions', { id: 'h', options: ['A', 'B'] }).ok).toBe(false)
    expect(find('h').props).toEqual({ text: 'Hello', level: 'h1' })
  })

  it('keeps the choices when it is not given a list of them', () => {
    for (const bad of ['Small, Large', undefined, [], [{ label: 'Small' }], ['Small', '']]) {
      expect(executeTool('setSelectOptions', { id: 's', options: bad }).ok).toBe(false)
      expect(find('s').props.options).toBe('One\nTwo')
    }
  })

  it('replaces the choices', () => {
    expect(executeTool('setSelectOptions', { id: 's', options: ['Small', 'Large', 3] })).toEqual({ ok: true, count: 3 })
    expect(find('s').props.options).toBe('Small\nLarge\n3')
  })
})

describe('setTabs', () => {
  const tabs = [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }]
  beforeEach(() => load([
    block('tabs', 'tabs', {
      props: { tabs, activeId: 'two' },
      layout: { x: 0, y: 0, w: 600, h: 300 },
      children: [
        block('in_one', 'heading', { tabId: 'one' }),
        block('in_two', 'heading', { tabId: 'two' }),
      ],
    }),
    block('h', 'heading', { props: { text: 'Hello', level: 'h1' } }),
  ]))

  it('moves the blocks of a tab that is gone into the first tab', () => {
    const res = executeTool('setTabs', { id: 'tabs', tabs: [{ id: 'one', label: 'First' }, { id: 'three', label: 'Third' }] })

    expect(res.ok).toBe(true)
    expect(res.tabIds).toEqual(['one', 'three'])
    expect(find('tabs').props.tabs).toEqual([{ id: 'one', label: 'First' }, { id: 'three', label: 'Third' }])
    expect(find('in_one').tabId).toBe('one')
    expect(find('in_two').tabId).toBe('one')
    // The tab that was showing is gone, so the first one shows.
    expect(find('tabs').props.activeId).toBe('one')
  })

  it('keeps the tab that is showing when it is still there', () => {
    executeTool('setTabs', { id: 'tabs', tabs: [{ id: 'one', label: 'One' }, { id: 'two', label: 'Second' }, { id: 'new', label: 'New' }] })

    expect(find('tabs').props.activeId).toBe('two')
    expect(find('in_two').tabId).toBe('two')
  })

  it('gives a tab without a usable id one the server accepts', () => {
    const res = executeTool('setTabs', { id: 'tabs', tabs: [{ label: 'Pricing Plans' }, { id: 'faq & help', label: 'FAQ' }] })

    expect(res.tabIds).toEqual(['Pricing-Plans', 'faq-help'])
    expect(find('tabs').props.tabs).toEqual([{ id: 'Pricing-Plans', label: 'Pricing Plans' }, { id: 'faq-help', label: 'FAQ' }])
  })

  it('leaves the tabs alone when the call cannot work', () => {
    const calls = [
      { id: 'tabs', tabs: [] },
      { id: 'tabs', tabs: 'One, Two' },
      { id: 'tabs', tabs: ['One', 'Two'] },
      { id: 'tabs', tabs: [{ id: 'a', label: 'A' }, { id: 'a', label: 'B' }] },
      { id: 'tabs', tabs: [{ id: 'a', label: 'A' }], activeId: 'missing' },
    ]
    for (const args of calls) {
      expect(executeTool('setTabs', args).ok).toBe(false)
      expect(find('tabs').props).toEqual({ tabs, activeId: 'two' })
    }
    expect(executeTool('setTabs', { id: 'h', tabs: [{ id: 'a', label: 'A' }] }).ok).toBe(false)
    expect(find('h').props).toEqual({ text: 'Hello', level: 'h1' })
  })
})

describe('replaceComponentText', () => {
  beforeEach(() => load([block('h', 'heading', { props: { text: 'Hello', level: 'h1' } })]))

  it('keeps the text when the call brings none', () => {
    for (const text of [undefined, null, { en: 'Hi' }, ['Hi']]) {
      expect(executeTool('replaceComponentText', { id: 'h', text }).ok).toBe(false)
      expect(find('h').props).toEqual({ text: 'Hello', level: 'h1' })
    }
  })

  it('refuses a field the block does not have', () => {
    const res = executeTool('replaceComponentText', { id: 'h', text: 'Hi', field: 'title' })

    expect(res.ok).toBe(false)
    expect(res.error).toContain('A heading has no "title" field')
    expect(find('h').props).toEqual({ text: 'Hello', level: 'h1' })
  })

  it('writes text and numbers', () => {
    expect(executeTool('replaceComponentText', { id: 'h', text: 'Welcome' })).toEqual({ ok: true, field: 'text' })
    expect(find('h').props.text).toBe('Welcome')
    executeTool('replaceComponentText', { id: 'h', text: 2026 })
    expect(find('h').props.text).toBe('2026')
  })
})

describe('distributeSiblings', () => {
  const three = [
    block('a', 'heading', { layout: { x: 0, y: 0, w: 200, h: 40 } }),
    block('b', 'heading', { layout: { x: 0, y: 100, w: 200, h: 40 } }),
    block('c', 'heading', { layout: { x: 0, y: 500, w: 200, h: 40 } }),
  ]

  it('evens out three blocks', () => {
    load(three)

    expect(executeTool('distributeSiblings', { axis: 'y' })).toEqual({ ok: true, count: 3 })
    expect(['a', 'b', 'c'].map((id) => find(id).layout.y)).toEqual([0, 250, 500])
  })

  it('refuses an axis it does not know instead of picking one', () => {
    load(three)

    expect(executeTool('distributeSiblings', { axis: 'z' }).ok).toBe(false)
    expect(executeTool('distributeSiblings', {}).ok).toBe(false)
    expect(['a', 'b', 'c'].map((id) => find(id).layout.y)).toEqual([0, 100, 500])
  })

  it('says so when there are too few blocks to even out', () => {
    load(three.slice(0, 2))

    const res = executeTool('distributeSiblings', { axis: 'y' })

    expect(res.ok).toBe(false)
    expect(res.error).toContain('there are 2 here')
  })
})

describe('addSection background', () => {
  it('makes no band when the colour is one the page would drop', () => {
    for (const background of ['javascript:alert(1)', 'url(https://example.com/a.png)', { color: '#000' }]) {
      expect(executeTool('addSection', { background }).ok).toBe(false)
    }
    expect(page().components).toHaveLength(0)
  })

  it('takes a colour or a gradient', () => {
    const plain = executeTool('addSection', { background: '#0f172a' })
    expect(find(plain.id).styles.backgroundColor).toBe('#0f172a')

    const gradient = executeTool('addSection', { background: 'linear-gradient(#000, #333)' })
    expect(find(gradient.id).styles.backgroundImage).toBe('linear-gradient(#000, #333)')
  })
})

describe('applyTemplate', () => {
  it('counts the blocks it made', () => {
    const res = executeTool('applyTemplate', { name: 'blog' })
    const count = (list) => (list || []).reduce((sum, c) => sum + 1 + count(c.children), 0)

    expect(res.ok).toBe(true)
    expect(count(page().components)).toBeGreaterThan(4)
    expect(res.componentsCreated).toBe(count(page().components))
  })
})

describe('alignComponent where there is nothing to align in', () => {
  const kid = block('kid', 'heading', { layout: { x: 0, y: 10, w: 100, h: 40 } })

  it('answers with where the block now is', () => {
    load([block('box', 'container', { layout: { x: 0, y: 0, w: 400, h: 300 }, children: [kid] })])

    expect(executeTool('alignComponent', { id: 'kid', mode: 'right' })).toEqual({ ok: true, x: 300, y: 10 })
    expect(find('kid').layout).toMatchObject({ x: 300, y: 10 })
  })

  it('says so for a top-level block on a page that stacks its blocks', () => {
    load([block('top', 'heading', { layout: { x: 0, y: 0, w: 200, h: 40 } })], { flowMode: true })

    const res = executeTool('alignComponent', { id: 'top', mode: 'right' })

    expect(res.ok).toBe(false)
    expect(res.error).toContain('moveToStart')
    expect(find('top').layout.x).toBe(0)
  })

  it('says so for the middle or bottom of a page, which has no height of its own', () => {
    load([block('top', 'heading', { layout: { x: 0, y: 30, w: 200, h: 40 } })])

    for (const mode of ['middleV', 'bottom']) {
      const res = executeTool('alignComponent', { id: 'top', mode })

      expect(res.ok).toBe(false)
      expect(res.error).toContain('setLayout')
    }
    expect(find('top').layout.y).toBe(30)
  })

  it('says so for a block its container places, and names the container', () => {
    load([block('box', 'container', { props: { flow: 'row' }, layout: { x: 0, y: 0, w: 400, h: 300 }, children: [kid] })])

    const res = executeTool('alignComponent', { id: 'kid', mode: 'right' })

    expect(res.ok).toBe(false)
    expect(res.error).toContain('updateProps on "box"')
    expect(find('kid').layout.x).toBe(0)
  })
})
