// A style value written with double quotes (a font name like "Fira Sans",
// as the browser writes it and as the panel lets the owner type it) ended
// the style attribute it was written into: everything after it in that
// attribute was lost, the font among it, on the published page.
import { describe, expect, it } from 'vitest'
import { schemaToSingleHtml } from './schemaToFiles.js'
import { schemaToResponsiveHtml } from './responsiveHtml.js'

const page = {
  id: 'p', name: 'Home', mode: 'empty', canvasWidth: 1000, mobileWidth: 390, background: '#ffffff',
  // Inside a section, where a block's look is written into its tag.
  components: [{
    id: 'band', type: 'region', props: { contentWidth: 1000 }, styles: {}, layout: { x: 0, y: 0, w: 1000, h: 200 },
    children: [{
      id: 'quoted', type: 'text', props: { text: 'Hello' },
      styles: { fontFamily: '"Fira Sans", "Noto Sans", sans-serif', fontSize: '18px', color: 'rgb(1, 2, 3)' },
      layout: { x: 10, y: 10, w: 300, h: 40 },
    }],
  }],
}
const schema = { theme: {}, customCss: '', customJs: '', pages: [page] }

function styleOf(html, find) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return find(doc)?.getAttribute('style') || ''
}

describe('a style value with double quotes', () => {
  it('keeps the whole style attribute on the published page', () => {
    const style = styleOf(schemaToSingleHtml(schema, 'Olive'), (doc) => doc.getElementById('quoted')?.querySelector('[style*="font-size"]'))

    expect(style).toContain("font-family: 'Fira Sans', 'Noto Sans', sans-serif;")
    expect(style).toContain('font-size: 18px;')
    expect(style).toContain('color: rgb(1, 2, 3);')
  })

  it('keeps the whole style attribute in the responsive HTML', () => {
    const style = styleOf(schemaToResponsiveHtml(schema, 'Olive'), (doc) => [...doc.querySelectorAll('p')].find((p) => p.textContent === 'Hello'))

    expect(style).toContain("'Fira Sans', 'Noto Sans', sans-serif")
    expect(style).toContain('rgb(1, 2, 3)')
  })
})
