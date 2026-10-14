// The Content tab lists every text a visitor reads. Blocks from the palette
// and the block library are `html` components whose words live in their code,
// and a section's title is its `heading`: none of these were listed, so a
// page built from blocks said "No editable content found".
import { describe, expect, it } from 'vitest'
import { extractSiteContent, updateSchemaContent } from './contentManager.js'

const schema = {
  pages: [{
    id: 'p1',
    name: 'Ana Sayfa',
    components: [
      { id: 'h', type: 'html', props: { code: '<section><h1>Siteme hoş geldiniz</h1><p>Kısa açıklama <a href="#x">bağlantı</a></p><a href="#">Hemen başla</a></section>' } },
      { id: 's', type: 'section', props: { heading: 'Hizmetler', buttonText: 'Bize ulaşın' } },
      { id: 'n', type: 'navbar', props: { brand: 'Kafe' }, children: [{ id: 'c', type: 'html', props: { code: '<p>İçteki</p>' } }] },
    ],
  }],
}

describe('the Content tab', () => {
  it('lists the words inside blocks, section titles and brand names', () => {
    const entries = extractSiteContent(schema)
    const values = entries.map((e) => e.value)
    expect(values).toEqual(expect.arrayContaining(['Siteme hoş geldiniz', 'Hemen başla', 'Hizmetler', 'Bize ulaşın', 'Kafe', 'İçteki']))
    expect(entries.find((e) => e.value === 'Siteme hoş geldiniz').labelKey).toBe('Heading')
    expect(entries.find((e) => e.value === 'Hizmetler').labelKey).toBe('Heading')
    expect(entries.find((e) => e.value === 'Kafe').labelKey).toBe('Brand name')
  })

  it('writes an edit back into the block\'s own code, leaving the rest of it alone', () => {
    const entry = extractSiteContent(schema).find((e) => e.value === 'Siteme hoş geldiniz')
    const next = updateSchemaContent(schema, entry, 'Kadıköy\'ün kahvecisi')
    const code = next.pages[0].components[0].props.code
    expect(code).toContain('<h1>Kadıköy\'ün kahvecisi</h1>')
    expect(code).toContain('<a href="#">Hemen başla</a>')
    expect(schema.pages[0].components[0].props.code).toContain('Siteme hoş geldiniz')

    const nested = extractSiteContent(schema).find((e) => e.value === 'İçteki')
    expect(updateSchemaContent(schema, nested, 'Yeni').pages[0].components[2].children[0].props.code).toBe('<p>Yeni</p>')
  })
})
