// A block taken from the community library is marked in the page visitors
// receive, so a moderator's takedown can remove it from the live site as well
// as from the draft (backend shared_marks.py).
import { describe, expect, it } from 'vitest'
import { schemaToSingleHtml } from './schemaToFiles.js'

const page = (props) => ({
  theme: {},
  pages: [{ id: 'p1', name: 'Home', components: [{ id: 'e1', type: 'html', props, styles: {}, layout: { x: 0, y: 0, w: 300, h: 100 } }] }],
})

describe('a taken block in the published page', () => {
  it('carries the id of the block it was taken from', () => {
    expect(schemaToSingleHtml(page({ code: '<p>x</p>', _sharedFrom: 42 }))).toContain('<iframe data-pwb-shared-from="42" srcdoc=')
  })

  it('and a block of one\'s own carries nothing', () => {
    expect(schemaToSingleHtml(page({ code: '<p>x</p>' }))).not.toContain('data-pwb-shared-from')
    expect(schemaToSingleHtml(page({ code: '<p>x</p>', _sharedFrom: '"><script>' }))).not.toContain('data-pwb-shared-from')
  })
})
