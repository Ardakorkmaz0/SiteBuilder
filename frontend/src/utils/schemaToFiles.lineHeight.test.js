// The canvas draws a text block at the line height it was given. The
// published page drew every text and heading block at 1.15, whatever the
// block said.
import { describe, expect, it } from 'vitest'
import { schemaToSingleHtml } from './schemaToFiles.js'

describe('a published canvas page', () => {
  const page = {
    id: 'p', name: 'Home', mode: 'empty', canvasWidth: 1000, mobileWidth: 390, background: '#ffffff',
    components: [
      { id: 't1', type: 'text', props: { text: 'Plain' }, styles: { fontSize: '16px' }, layout: { x: 0, y: 0, w: 300, h: 40 } },
      { id: 't2', type: 'text', props: { text: 'Airy' }, styles: { fontSize: '16px', lineHeight: '32px' }, layout: { x: 0, y: 60, w: 300, h: 40 } },
      { id: 'h1', type: 'heading', props: { text: 'Tight', level: 'h1' }, styles: { fontSize: '40px', lineHeight: '40px' }, layout: { x: 0, y: 120, w: 300, h: 60 } },
    ],
  }

  it('keeps the line height a text or heading block was given', () => {
    const out = schemaToSingleHtml({ theme: {}, customCss: '', customJs: '', pages: [page] }, 'Olive')

    expect(out).toContain('<p class="m0">Plain</p>')
    expect(out).toContain('<p class="m0" style="line-height:inherit">Airy</p>')
    expect(out).toContain('<h1 class="m0" style="line-height:inherit">Tight</h1>')
  })
})
