// A page can carry web fonts of its own beside the theme's: a page that came
// from an HTML document keeps the fonts that document loaded, whether or not
// they are among the curated ones.
import { describe, expect, it } from 'vitest'
import { fontSpecsFromHref, googleFontHrefForTheme, googleFontLinkTag, pageFontSpecs } from './googleFonts.js'
import { schemaToSingleHtml } from './schemaToFiles.js'

describe('the fonts a stylesheet address asks for', () => {
  it('are read from a css2 address, weights and slants included', () => {
    expect(fontSpecsFromHref('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Source+Sans+3:wght@400;600;700&display=swap'))
      .toEqual(['Playfair Display:ital,wght@0,500;0,700;1,500', 'Source Sans 3:wght@400;600;700'])
  })

  it('are read from the older address', () => {
    expect(fontSpecsFromHref('https://fonts.googleapis.com/css?family=Open+Sans:400,700|Roboto'))
      .toEqual(['Open Sans:wght@400;700', 'Roboto'])
  })

  it('are none for any other address', () => {
    expect(fontSpecsFromHref('https://example.com/css2?family=Inter')).toEqual([])
    expect(fontSpecsFromHref('styles/main.css')).toEqual([])
    expect(fontSpecsFromHref('')).toEqual([])
  })
})

describe('the stylesheet a page asks for', () => {
  it('is as before for a theme alone', () => {
    expect(googleFontHrefForTheme({ fontFamily: '"Inter", sans-serif' }))
      .toBe('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap')
    expect(googleFontHrefForTheme({ fontFamily: 'Georgia, serif' })).toBe('')
  })

  it('adds the page\'s own fonts, and lets the page\'s weights stand for a family both name', () => {
    expect(googleFontHrefForTheme({ fontFamily: 'Georgia, serif' }, ['Fraunces:ital,wght@0,500;1,500', 'Source Sans 3:wght@400;600']))
      .toBe('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;1,500&family=Source+Sans+3:wght@400;600&display=swap')
    expect(googleFontHrefForTheme({ fontFamily: '"Inter", sans-serif' }, ['Inter:wght@800', 'Sora']))
      .toBe('https://fonts.googleapis.com/css2?family=Inter:wght@800&family=Sora&display=swap')
  })

  it('never carries what is not a font name', () => {
    expect(pageFontSpecs({ fonts: ['Inter', 'Inter&family=Evil', 'x"><script>', 7, 'Sora:wght@400;700'] })).toEqual(['Inter', 'Sora:wght@400;700'])
    expect(googleFontLinkTag({ fontFamily: 'Georgia, serif' }, ['Inter"><script>alert(1)</script>'])).toBe('')
  })
})

describe('a published canvas page', () => {
  const page = (extra) => ({
    id: 'p', name: 'Home', mode: 'empty', canvasWidth: 1000, mobileWidth: 390, background: '#ffffff',
    components: [
      { id: 't1', type: 'text', props: { text: 'Plain' }, styles: { fontSize: '16px' }, layout: { x: 0, y: 0, w: 300, h: 40 } },
      { id: 't2', type: 'text', props: { text: 'Airy' }, styles: { fontSize: '16px', lineHeight: '32px' }, layout: { x: 0, y: 60, w: 300, h: 40 } },
      { id: 'h1', type: 'heading', props: { text: 'Tight', level: 'h1' }, styles: { fontSize: '40px', lineHeight: '40px' }, layout: { x: 0, y: 120, w: 300, h: 60 } },
    ],
    ...extra,
  })
  const html = (extra) => schemaToSingleHtml({ theme: {}, customCss: '', customJs: '', pages: [page(extra)] }, 'Olive')

  it('loads the fonts its page names', () => {
    // Beside the theme's: the default stack names Roboto.
    expect(html({ fonts: ['Fraunces:wght@500'] })).toContain('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Fraunces:wght@500&display=swap">')
    expect(html({})).not.toContain('Fraunces')
  })
})
