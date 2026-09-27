// Publishing hands the server a document per page. These pin what goes in it:
// the page's own head (so a scraper reads the page, not the builder's name),
// an uploaded page's own file untouched, and an address per page.
import { describe, expect, it } from 'vitest'
import { pagePath, publishedPagesFor } from './publishedPages.js'

const page = (id, name, extra = {}) => ({
  id,
  name,
  components: [{ id: `${id}-h`, type: 'heading', props: { text: name }, layout: { x: 0, y: 0, w: 400, h: 60 } }],
  ...extra,
})

const schema = {
  theme: {},
  pages: [
    page('home', 'Home', { seoTitle: 'Ada — Portfolio', seoDescription: 'Selected work.' }),
    page('about', 'About us'),
    page('draft', 'Draft', { noIndex: true }),
  ],
}

describe('pagePath', () => {
  it('gives the home page no address of its own', () => {
    expect(pagePath(schema.pages[0], 0)).toBe('')
  })

  it('turns a page name into a url segment', () => {
    expect(pagePath({ name: 'About us' }, 1)).toBe('about-us')
    expect(pagePath({ name: 'Çalışmalar & Projeler' }, 1)).toBe('calismalar-projeler')
    expect(pagePath({ name: 'Über uns' }, 1)).toBe('uber-uns')
    expect(pagePath({ name: '   ' }, 2)).toBe('page-3')
  })
})

describe('publishedPagesFor', () => {
  it('renders every page with its own head', () => {
    const pages = publishedPagesFor(schema, {}, 'Ada')

    expect(pages.map((item) => item.path)).toEqual(['', 'about-us', 'draft'])
    expect(pages[0].title).toBe('Ada — Portfolio')
    expect(pages[0].html).toContain('<title>Ada — Portfolio</title>')
    expect(pages[0].html).toContain('Selected work.')
    expect(pages[1].html).toContain('About us')
  })

  it('carries the "hide from search engines" flag through', () => {
    const pages = publishedPagesFor(schema, {}, 'Ada')
    expect(pages.map((item) => item.noIndex)).toEqual([false, false, true])
  })

  // An uploaded page is already a document; re-rendering it from the schema
  // would publish an empty canvas instead of the user's own markup.
  it('publishes an uploaded page as the file it is', () => {
    const uploaded = '<!DOCTYPE html><html><head><title>Mine</title></head><body>hi</body></html>'
    const pages = publishedPagesFor(schema, { about: uploaded }, 'Ada')

    expect(pages[1].html).toBe(uploaded)
  })

  it("gives an uploaded page the sharing image set in its Page settings", () => {
    const uploaded = '<!DOCTYPE html><html><head><title>Mine</title>'
      + '<meta property="og:image" content="https://old.example/a.png"><meta property="og:type" content="article">'
      + '</head><body>hi</body></html>'
    const withImage = {
      ...schema,
      pages: [schema.pages[0], { ...schema.pages[1], seoImage: 'https://cdn.example/card.png' }],
    }

    const html = publishedPagesFor(withImage, { about: uploaded }, 'Ada')[1].html

    // The setting replaces the file's own tag rather than adding a second one.
    expect(html.match(/og:image/g)).toHaveLength(1)
    expect(html).toContain('<meta property="og:image" content="https://cdn.example/card.png" />')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
    // What the author wrote and the settings leave alone stays.
    expect(html).toContain('<meta property="og:type" content="article">')
    expect(html).toContain('<title>Mine</title>')
    expect(html.indexOf('og:image')).toBeLessThan(html.indexOf('</head>'))
  })

  it('never puts the tags in front of the doctype of a page with no head', () => {
    const uploaded = '<!doctype html><p>hi</p>'
    const withImage = { ...schema, pages: [{ ...schema.pages[0], seoImage: 'https://cdn.example/card.png' }] }

    const html = publishedPagesFor(withImage, { home: uploaded }, 'Ada')[0].html

    expect(html.startsWith('<!doctype html><meta')).toBe(true)
  })

  it('leaves out a page that cannot be rendered rather than failing the publish', () => {
    const broken = { theme: {}, pages: [page('home', 'Home'), { id: 'bad', name: 'Bad', components: 'not-a-list' }] }
    const pages = publishedPagesFor(broken, {}, 'Ada')

    expect(pages.map((item) => item.path)).toEqual([''])
  })

  // A cross-page link is stored as #<pageId>: the fragment the in-app viewer
  // understands and a served page does not.
  it('points cross-page links at the addresses the pages will have', () => {
    const withNav = {
      theme: {},
      pages: [
        {
          id: 'home', name: 'Home',
          components: [{
            id: 'nav', type: 'navbar',
            props: { brand: 'Ada', links: [{ label: 'About', href: '#about' }, { label: 'Docs', href: 'https://x.dev' }] },
            layout: { x: 0, y: 0, w: 1000, h: 70 },
          }],
        },
        { id: 'about', name: 'About us', components: [] },
      ],
    }

    const [home] = publishedPagesFor(withNav, {}, 'Ada', 'ada-site')

    expect(home.html).toContain('/s/ada-site/about-us/')
    expect(home.html).not.toContain('href="#about"')
    // An outside link is left exactly as it was.
    expect(home.html).toContain('https://x.dev')
  })

  it('leaves the fragments alone when there is no address yet', () => {
    const [home] = publishedPagesFor({ theme: {}, pages: [{ id: 'home', name: 'Home', components: [{ id: 'b', type: 'button', props: { text: 'Go', href: '#other' }, layout: { x: 0, y: 0, w: 120, h: 40 } }] }, { id: 'other', name: 'Other', components: [] }] }, {}, 'Ada')
    expect(home.html).toContain('#other')
  })
  it('survives a schema with no pages at all', () => {
    expect(publishedPagesFor({}, {}, 'Ada')).toEqual([])
  })
})
