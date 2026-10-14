// One page, one address word: the published path, the file in the editor's
// list, the exported file and the editor's address bar all agree.
import { describe, expect, it } from 'vitest'
import { pageSlug } from './pageSlug.js'
import { pagePath as publishedPath } from './publishedPages.js'
import { pageFileName } from './pageFiles.js'
import { schemaToFiles } from './schemaToFiles.js'
import { visiblePageAddress } from '../components/editor/browserPageAddress.js'

describe('the address word of a page', () => {
  it('spells Turkish letters out, everywhere', () => {
    const page = { id: 'p2', name: 'Hakkımızda', components: [] }
    expect(pageSlug('Hakkımızda')).toBe('hakkimizda')
    expect(publishedPath(page, 1)).toBe('hakkimizda')
    expect(pageFileName(page, false)).toBe('hakkimizda.html')
    expect(visiblePageAddress('site.sitebuilder.local', page, 1)).toBe('site.sitebuilder.local/hakkimizda')
    const files = schemaToFiles({ theme: {}, pages: [{ id: 'p1', name: 'Ana Sayfa', components: [] }, page] })
    expect(files.map((f) => f.name)).toContain('hakkimizda.html')
  })

  it('handles other accents and leaves nothing usable as empty', () => {
    expect(pageSlug('Çalışmalar & Ödüller')).toBe('calismalar-oduller')
    expect(pageSlug('Café Crème')).toBe('cafe-creme')
    expect(pageSlug('Über uns')).toBe('uber-uns')
    expect(pageSlug('Наши работы')).toBe('')
    expect(pageFileName({ name: 'Наши работы' }, false)).toBe('page.html')
  })
})
