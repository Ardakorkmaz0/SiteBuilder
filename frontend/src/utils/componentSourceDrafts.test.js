import { describe, expect, it } from 'vitest'
import { schemaToFiles } from './schemaToFiles.js'
import { pendingComponentSourceDrafts } from './componentSourceDrafts.js'

const schema = { theme: {}, pages: [{ id: 'home', name: 'Home', components: [] }] }

describe('pending component source drafts', () => {
  it('keeps a component source edit separate from its generated canvas document', () => {
    expect(pendingComponentSourceDrafts({ 'index.html': '<h1>Pending canvas source</h1>' }, schema, {}))
      .toEqual({ 'index.html': '<h1>Pending canvas source</h1>' })
  })

  it('does not count a draft that now matches the generated canvas', () => {
    const generated = schemaToFiles(schema).find((file) => file.name === 'index.html').content
    expect(pendingComponentSourceDrafts({ 'index.html': generated }, schema, {})).toEqual({})
  })

  it('compares authored HTML pages against their live document instead of the empty canvas', () => {
    const htmlSchema = { theme: {}, pages: [{ id: 'home', name: 'Home', mode: 'html', components: [] }] }
    expect(pendingComponentSourceDrafts(
      { 'index.html': '<h1>Applied authored HTML</h1>' }, htmlSchema, { home: '<h1>Applied authored HTML</h1>' },
    )).toEqual({})
    expect(pendingComponentSourceDrafts(
      { 'index.html': '<h1>Pending authored HTML</h1>' }, htmlSchema, { home: '<h1>Applied authored HTML</h1>' },
    )).toEqual({ 'index.html': '<h1>Pending authored HTML</h1>' })
  })
})
