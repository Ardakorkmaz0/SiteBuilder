import { describe, expect, it } from 'vitest'
import { inlineProjectHtml, minifyGeneratedHtml } from './exportFiles.js'

describe('inlineProjectHtml', () => {
  it('escapes closing-tag slashes without changing authored case or whitespace', () => {
    const output = inlineProjectHtml('<link rel="stylesheet" href="custom.css"><script src="custom.js"></script>', [
      { name: 'custom.css', content: '.x::after{content:"</StYlE> | </ STYLE>"}' },
      { name: 'custom.js', content: 'const value = "</ScRiPt> | </ \\tSCRIPT>"' },
    ])
    const doc = new DOMParser().parseFromString(output, 'text/html')
    const evaluateValue = new Function(`${doc.querySelector('script').textContent}; return value`)
    expect(evaluateValue()).toBe('</ScRiPt> | </ \tSCRIPT>')
    expect(doc.querySelector('style').textContent).toContain('.x::after{content:"<\\/StYlE> | <\\/ STYLE>"}')
  })
  it('preserves literal replacement tokens in authored CSS and JavaScript', () => {
    const css = '.price::after{content:"$& $$ $` $\'"}'
    const script = 'window.example = "$& $$ $` $\'"'
    const output = inlineProjectHtml('<link rel="stylesheet" href="custom.css"><script src="custom.js"></script>', [
      { name: 'custom.css', content: css },
      { name: 'custom.js', content: script },
    ])
    expect(output).toContain(css)
    expect(output).toContain(script)
    expect(output).not.toContain('href="custom.css"')
  })
  it('turns linked source-project assets into a portable document', () => {
    const html = `<!doctype html><html><head>
      <link rel="stylesheet" href="styles.css" />
      <link href="custom.css" rel="stylesheet">
      <script src="runtime.js"></script>
    </head><body><h1>Edited</h1><script src="custom.js"></script></body></html>`
    const output = inlineProjectHtml(html, [
      { name: 'styles.css', content: 'body { color: red; }' },
      { name: 'custom.css', content: '.custom { display: block; }' },
      { name: 'runtime.js', content: 'window.runtimeReady = true' },
      { name: 'custom.js', content: 'window.customReady = true' },
    ])

    expect(output).toContain('<style data-pwb-project-styles>')
    expect(output).toContain('<style data-pwb-custom-styles>')
    expect(output).toContain('<script data-pwb-project-runtime>')
    expect(output).toContain('<script data-pwb-custom-script>')
    expect(output).not.toContain('href="styles.css"')
    expect(output).not.toContain('src="runtime.js"')
    expect(output).toContain('<h1>Edited</h1>')
  })
})

describe('minifyGeneratedHtml', () => {
  it('preserves replacement tokens when restoring scripts, CSS strings and tags', () => {
    const script = 'window.example = "$& $$ $` $\'"'
    const css = '.x{content:"$& $$ $` $\'"}'
    const html = `<p title="$& $$ $\u0060 $'">Example</p><style>${css}</style><script>${script}</script>`
    const output = minifyGeneratedHtml(html)
    expect(output).toContain(`<script>${script}</script>`)
    expect(output).toContain(`<style>${css}</style>`)
    expect(output).toContain('<p title="$& $$ $` $\'">')
  })
  it('preserves whitespace and comment-like text inside HTML attributes', () => {
    const html = '<div title="two  spaces&#10;here" data-template="<!--keep-->"> One </div>'
    const output = minifyGeneratedHtml(html)
    const doc = new DOMParser().parseFromString(output, 'text/html')
    expect(doc.querySelector('div').title).toBe('two  spaces\nhere')
    expect(doc.querySelector('div').dataset.template).toBe('<!--keep-->')
  })

  it('keeps authored text that resembles its internal placeholders', () => {
    const script = 'window.example = 1\n  + 2'
    const html = `<p>___PWB_HTML_BLOCK_0___</p><script>${script}</script><style>.x{content:"___PWB_CSS_STRING_1___"}.y{content:"literal"}</style>`
    const output = minifyGeneratedHtml(html)
    expect(output).toContain('<p>___PWB_HTML_BLOCK_0___</p>')
    expect(output).toContain(`<script>${script}</script>`)
    expect(output).toContain('.x{content:"___PWB_CSS_STRING_1___"}.y{content:"literal"}')
  })
  it('compacts generated markup and CSS without rewriting executable or preformatted content', () => {
    const script = 'const value = 1\nvalue\n  + 2'
    const pre = 'first\n    second'
    const html = `<!doctype html>
      <!-- generated note -->
      <html><head><style>
        /* note */
        body { color: red; padding: 0 10px; }
      </style></head><body>
        <div>One</div>
        <div>Two</div>
        <pre>${pre}</pre>
        <script>${script}</script>
      </body></html>`
    const output = minifyGeneratedHtml(html)

    expect(output.length).toBeLessThan(html.length)
    expect(output).toContain('body{color:red;padding:0 10px}')
    expect(output).toContain(`<pre>${pre}</pre>`)
    expect(output).toContain(`<script>${script}</script>`)
    expect(output).not.toContain('generated note')
  })
})
