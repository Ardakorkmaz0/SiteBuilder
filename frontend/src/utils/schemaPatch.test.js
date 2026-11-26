import { describe, expect, it } from 'vitest'
import {
  advanceSyncedRevision,
  buildSchemaPatch,
  forgetSyncedSite,
  indexSchema,
  prepareSiteSave,
  rememberSyncedSite,
  stableJson,
} from './schemaPatch.js'

describe('schemaPatch', () => {
  it('treats objects with identical keys in different order as unchanged', () => {
    expect(stableJson({ b: 2, a: 1, nested: { y: true, x: false } }))
      .toBe(stableJson({ a: 1, nested: { x: false, y: true }, b: 2 }))
  })

  it('keeps unchanged pages and components by id and sends full pages for newly added pages', () => {
    const base = {
      theme: { primaryColor: '#0071e3' },
      customCss: '',
      customJs: '',
      fontFaces: '@font-face {}',
      pages: [
        {
          id: 'p1',
          name: 'Home',
          htmlBackup: '<div>big</div>',
          components: [
            { id: 'c1', type: 'text', props: { text: 'Stay' }, styles: {}, layout: { x: 0, y: 0, w: 100, h: 30 } },
            { id: 'c2', type: 'text', props: { text: 'Before' }, styles: {}, layout: { x: 0, y: 40, w: 100, h: 30 } },
          ],
        },
        {
          id: 'p2',
          name: 'Unchanged',
          htmlBackup: '<div>big2</div>',
          components: [{ id: 'c3', type: 'heading', props: { text: 'Title' }, styles: {}, layout: { x: 0, y: 0, w: 200, h: 40 } }],
        },
      ],
    }

    const snap = indexSchema(base)
    const next = {
      ...base,
      pages: [
        {
          ...base.pages[0],
          components: [
            base.pages[0].components[0],
            { ...base.pages[0].components[1], props: { text: 'After' } },
          ],
        },
        base.pages[1],
        { id: 'p3', name: 'Added', components: [] },
      ],
    }

    const patch = buildSchemaPatch(snap, next)
    expect(patch.theme).toBeUndefined()
    expect(patch.fontFaces).toBeUndefined()
    expect(patch.pages[0]).toEqual({
      op: 'patch',
      id: 'p1',
      components: [
        { keep: 'c1' },
        { set: next.pages[0].components[1] },
      ],
    })
    expect(patch.pages[1]).toEqual({ op: 'keep', id: 'p2' })
    expect(patch.pages[2]).toEqual({ op: 'full', page: { id: 'p3', name: 'Added', components: [] } })
  })

  it('invalidates synced cache when revision jumps unexpectedly or forgetSyncedSite is called', () => {
    const schema = { theme: {}, pages: [{ id: 'home', name: 'Home', components: [] }] }
    rememberSyncedSite({ id: 99, revision: 2, schema, html: '' })
    advanceSyncedRevision(99, 2, 5) // jumped by >1 (another tab saved)
    const prepared = prepareSiteSave(99, { title: 'Test', schema, html: '', base_revision: 5 })
    expect(prepared.method).toBe('put')

    rememberSyncedSite({ id: 99, revision: 5, schema, html: '' })
    forgetSyncedSite(99)
    expect(prepareSiteSave(99, { title: 'Test', schema, html: '', base_revision: 5 }).method).toBe('put')
  })
})
