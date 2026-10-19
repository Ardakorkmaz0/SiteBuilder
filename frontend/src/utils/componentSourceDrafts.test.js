import { describe, expect, it } from 'vitest'
import { schemaToFiles } from './schemaToFiles.js'
import { componentSourceHtml, pendingComponentSourceDrafts } from './componentSourceDrafts.js'

const schema = { theme: {}, pages: [{ id: 'home', name: 'Home', components: [] }] }

describe('component source document conversion', () => {
  const html = '<!doctype html>\n<html><head><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="custom.css"></head>\n<body>  Authored text\n<script src="runtime.js"></script><script src="custom.js"></script></body></html>\n'
  const files = [
    { name: 'styles.css', content: '.generated { display: block; }' },
    { name: 'custom.css', content: '.custom { color: red; }' },
    { name: 'runtime.js', content: 'window.generated = true;' },
    { name: 'custom.js', content: 'window.custom = true;' },
  ]

  it('keeps authored documents byte-for-byte even when their asset names match generated project assets', () => {
    expect(componentSourceHtml({ ownDocument: true }, html, files)).toBe(html)
  })

  it('embeds the generated project assets in canvas source documents', () => {
    expect(componentSourceHtml({ ownDocument: false }, html, files)).toBe(
      '<!doctype html>\n<html><head><style data-pwb-project-styles>\n.generated { display: block; }\n</style><style data-pwb-custom-styles>\n.custom { color: red; }\n</style></head>\n<body>  Authored text\n<script data-pwb-project-runtime>\nwindow.generated = true;\n</script><script data-pwb-custom-script>\nwindow.custom = true;\n</script></body></html>\n',
    )
  })
})

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
