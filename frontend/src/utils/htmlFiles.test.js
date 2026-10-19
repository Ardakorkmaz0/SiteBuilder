// linkedFilesFor surfaces the CSS/JS an HTML page directly references, resolved
// to real paths in the in-memory project map — it powers the "Linked by this
// page" shortcut in the Code-project explorer.
import { describe, expect, it } from 'vitest'
import {
  assemblePreviewHtml,
  htmlFilesToDocument,
  linkedFilesFor,
  matchingCssRules,
  needsBuildToRender,
  parseCssRules,
} from './htmlFiles.js'
import { serializeDocument } from './htmlPlacement.js'

const mapOf = (...paths) =>
  new Map(paths.map((p) => [p, { path: p, kind: p.endsWith('.css') ? 'css' : 'js', content: '' }]))

const sourceFile = (path, content, type = '') => ({
  name: path.split('/').pop(),
  webkitRelativePath: path,
  type,
  text: async () => content,
  arrayBuffer: async () => new TextEncoder().encode(content).buffer,
})
const assetEntry = (path, content) => ({
  path,
  kind: 'asset',
  handle: { getFile: async () => sourceFile(path, content, 'image/png') },
})
const parseHtml = (html) => new DOMParser().parseFromString(html, 'text/html')

describe('portable HTML imports', () => {
  it('preserves case and whitespace in JS and CSS closing-tag string values', async () => {
    const script = 'const value = "</ScRiPt> | </ \\tSCRIPT>"'
    const css = '.x::after{content:"</StYlE> | </ STYLE>"}'
    const html = '<link rel="stylesheet" href="theme.css"><script src="app.js"></script>'
    const imported = parseHtml(await htmlFilesToDocument([
      sourceFile('index.html', html),
      sourceFile('app.js', script),
      sourceFile('theme.css', css),
    ]))
    const preview = parseHtml(await assemblePreviewHtml(html, 'index.html', new Map([
      ['app.js', { path: 'app.js', kind: 'js', content: script }],
      ['theme.css', { path: 'theme.css', kind: 'css', content: css }],
    ])))
    for (const doc of [imported, preview]) {
      const evaluateValue = new Function(`${doc.querySelector('script').textContent}; return value`)
      expect(evaluateValue()).toBe('</ScRiPt> | </ \tSCRIPT>')
      expect(doc.querySelector('style').textContent).toBe('.x::after{content:"<\\/StYlE> | <\\/ STYLE>"}')
    }
  })
  it('treats the selected upload folder as the site root for absolute references', async () => {
    const out = await htmlFilesToDocument([
      sourceFile('my-site/pages/index.html', '<link rel="stylesheet" href="/css/theme.css"><img src="/images/logo.png">'),
      sourceFile('my-site/css/theme.css', 'body{color:green}'),
      sourceFile('my-site/images/logo.png', 'right'),
      sourceFile('my-site/other/logo.png', 'wrong'),
    ])
    const doc = parseHtml(out)
    expect(doc.querySelector('style').textContent).toBe('body{color:green}')
    expect(doc.querySelector('img').src).toBe('data:image/png;base64,cmlnaHQ=')
  })

  it('keeps data URL candidates intact while importing local srcset files', async () => {
    const out = await htmlFilesToDocument([
      sourceFile('index.html', '<img srcset="data:image/png;base64,aGVsbG8= 1x, large.png 2x">'),
      sourceFile('large.png', 'large'),
    ])
    expect(parseHtml(out).querySelector('img').getAttribute('srcset')).toBe('data:image/png;base64,aGVsbG8= 1x, data:image/png;base64,bGFyZ2U= 2x')
  })
  it('resolves parent segments and prefers the stylesheet beside a nested page', async () => {
    const out = await htmlFilesToDocument([
      sourceFile('site/pages/index.html', '<link rel="stylesheet" href="../css/theme.css"><img src="../img/logo.png">'),
      sourceFile('css/theme.css', 'body{color:red}'),
      sourceFile('site/css/theme.css', 'body{color:green}'),
      sourceFile('img/logo.png', 'wrong'),
      sourceFile('site/img/logo.png', 'right'),
    ])
    const doc = parseHtml(out)
    expect(doc.querySelector('style').textContent).toBe('body{color:green}')
    expect(doc.querySelector('img').src).toBe('data:image/png;base64,cmlnaHQ=')
  })

  it('prefers a page-relative stylesheet to a same-named root file', async () => {
    const out = await htmlFilesToDocument([
      sourceFile('pages/index.html', '<link rel="stylesheet" href="theme.css">'),
      sourceFile('theme.css', 'body{color:red}'),
      sourceFile('pages/theme.css', 'body{color:green}'),
    ])
    expect(parseHtml(out).querySelector('style').textContent).toBe('body{color:green}')
  })

  it('decodes Unicode and spaces in browser-style asset references', async () => {
    const out = await htmlFilesToDocument([
      sourceFile('index.html', '<img src="g%C3%B6rsel%20bir.png">'),
      sourceFile('görsel bir.png', 'image'),
    ])
    expect(parseHtml(out).querySelector('img').src).toBe('data:image/png;base64,aW1hZ2U=')
  })

  it('keeps external JS and CSS closing-tag text inside their original elements', async () => {
    const script = 'window.example = "</script><p id=escaped-script>bad</p>"'
    const css = '.example::after{content:"</style><p id=escaped-style>bad</p>"}'
    const out = await htmlFilesToDocument([
      sourceFile('index.html', '<link rel="stylesheet" href="theme.css"><script src="app.js"></script><p id="after">After</p>'),
      sourceFile('theme.css', css),
      sourceFile('app.js', script),
    ])
    const doc = parseHtml(out)
    expect(doc.querySelector('#escaped-script')).toBeNull()
    expect(doc.querySelector('#escaped-style')).toBeNull()
    expect(doc.querySelector('#after').textContent).toBe('After')
    expect(doc.querySelector('script').textContent).toContain('<\\/script>')
    expect(doc.querySelector('style').textContent).toContain('<\\/style>')
  })

  it('preserves media restrictions when replacing a linked stylesheet', async () => {
    const out = await htmlFilesToDocument([
      sourceFile('index.html', '<link rel="stylesheet" href="print.css" media="print" title="Print theme">'),
      sourceFile('print.css', 'body{display:none}'),
    ])
    expect(parseHtml(out).querySelector('style').getAttribute('media')).toBe('print')
  })
})

describe('live preview file resolution', () => {
  it('resolves parent segments before normalization and root paths from the project root', () => {
    const files = mapOf('site/css/theme.css', 'site/pages/css/theme.css', 'css/theme.css')
    expect(linkedFilesFor('site/pages/index.html', '<link rel="stylesheet" href="../css/theme.css">', files)).toEqual(['site/css/theme.css'])
    expect(linkedFilesFor('site/pages/index.html', '<link rel="stylesheet" href="/css/theme.css">', files)).toEqual(['css/theme.css'])
  })

  it('does not choose an arbitrary file when basename fallback is ambiguous', () => {
    expect(linkedFilesFor('index.html', '<script src="missing/app.js"></script>', mapOf('a/app.js', 'b/app.js'))).toEqual([])
  })

  it('inlines responsive images without corrupting existing data URL candidates', async () => {
    const files = new Map([
      ['small.png', assetEntry('small.png', 'small')],
      ['large.png', assetEntry('large.png', 'large')],
    ])
    const html = '<img srcset="data:image/png;base64,aGVsbG8= 1x, large.png 2x"><source srcset="small.png 320w, large.png 640w">'
    const out = await assemblePreviewHtml(html, 'index.html', files)
    const doc = parseHtml(out)
    expect(doc.querySelector('img').getAttribute('srcset')).toBe('data:image/png;base64,aGVsbG8= 1x, data:image/png;base64,bGFyZ2U= 2x')
    expect(doc.querySelector('source').getAttribute('srcset')).toBe('data:image/png;base64,c21hbGw= 320w, data:image/png;base64,bGFyZ2U= 640w')
    const edit = parseHtml(await assemblePreviewHtml(html, 'index.html', files, { forEdit: true }))
    expect(edit.querySelector('source').getAttribute('srcset')).toBe('small.png 320w, large.png 640w')
  })

  it('keeps inlined preview JS and CSS from becoming HTML elements', async () => {
    const files = new Map([
      ['theme.css', { path: 'theme.css', kind: 'css', content: '.x{content:"</style><p id=bad-css>"}' }],
      ['app.js', { path: 'app.js', kind: 'js', content: 'window.x="</script><p id=bad-js>"' }],
    ])
    const doc = parseHtml(await assemblePreviewHtml('<link rel="stylesheet" href="theme.css"><script src="app.js"></script>', 'index.html', files))
    expect(doc.querySelector('#bad-js')).toBeNull()
    expect(doc.querySelector('#bad-css')).toBeNull()
  })
})

describe('linkedFilesFor', () => {
  it('resolves root-relative <link> and <script src>, skipping external URLs', () => {
    const html = `<!doctype html><head>
      <link rel="stylesheet" href="css/style.css">
      <link rel="stylesheet" href="https://cdn.example.com/x.css">
      <script src="js/main.js"></script>
    </head><body></body>`
    const out = linkedFilesFor('index.html', html, mapOf('css/style.css', 'js/main.js'))
    expect(out).toEqual(['css/style.css', 'js/main.js'])
  })

  it('resolves references relative to a page in a subfolder', () => {
    const html = `<link rel="stylesheet" href="../css/style.css">`
    const out = linkedFilesFor('pages/about.html', html, mapOf('css/style.css'))
    expect(out).toEqual(['css/style.css'])
  })

  it('de-duplicates repeated references', () => {
    const html = `<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="./style.css">`
    const out = linkedFilesFor('index.html', html, mapOf('style.css'))
    expect(out).toEqual(['style.css'])
  })

  it('omits references with no matching file in the map', () => {
    const html = `<script src="missing.js"></script>`
    expect(linkedFilesFor('index.html', html, mapOf('css/style.css'))).toEqual([])
  })

  it("resolves Django {% static %} links via the basename fallback", () => {
    const html = `<link rel="stylesheet" href="{% static 'css/theme.css' %}">`
    const out = linkedFilesFor('templates/base.html', html, mapOf('static/css/theme.css'))
    expect(out).toEqual(['static/css/theme.css'])
  })
})

describe('assemblePreviewHtml — template projects', () => {
  const mapWith = (entries) =>
    new Map(entries.map((e) => [e.path, { content: '', ...e }]))

  const djangoMap = () =>
    mapWith([
      { path: 'templates/base.html', kind: 'html' },
      { path: 'static/css/theme.css', kind: 'css', content: 'p{color:rgb(1,2,3)}' },
    ])

  const djangoHtml =
    `<head><link rel="stylesheet" href="{% static 'css/theme.css' %}"></head>` +
    `<body>{% if user %}<p>Hi {{ user.name }}</p>{% endif %}</body>`

  it('VIEW inlines a {% static %} stylesheet and strips template tags', async () => {
    const out = await assemblePreviewHtml(djangoHtml, 'templates/base.html', djangoMap(), { forEdit: false })
    expect(out).toContain('color:rgb(1,2,3)') // theme.css inlined
    expect(out).not.toMatch(/\{%/) // no {% … %} left
    expect(out).not.toMatch(/\{\{/) // no {{ … }} left
    expect(out).toContain('<p>Hi </p>') // inner content kept, variable removed
  })

  it('EDIT keeps the raw template intact so saving preserves every tag', async () => {
    const out = await assemblePreviewHtml(djangoHtml, 'templates/base.html', djangoMap(), { forEdit: true })
    expect(out).toMatch(/\{%\s*static\s+'css\/theme\.css'\s*%\}/) // original link ref kept
    expect(out).toContain('data-pwb-injected') // styled via injected <style> (stripped on save)
    expect(out).toContain('color:rgb(1,2,3)')
  })

  it('EDIT wraps template tags in chips that serializeDocument unwraps back to exact text', async () => {
    const out = await assemblePreviewHtml(djangoHtml, 'templates/base.html', djangoMap(), { forEdit: true })
    // Tags are chipped in the edit canvas…
    expect(out).toMatch(/<span data-pwb-tt[^>]*>\{% if user %\}<\/span>/)
    expect(out).toMatch(/<span data-pwb-tt[^>]*>\{\{ user\.name \}\}<\/span>/)
    // …and unwrap to plain text on save (no chips, exact tags restored).
    const doc = new DOMParser().parseFromString(out, 'text/html')
    const saved = serializeDocument(doc)
    expect(saved).not.toContain('data-pwb-tt')
    expect(saved).toContain('{% if user %}')
    expect(saved).toContain('{{ user.name }}')
    expect(saved).not.toContain('data-pwb-injected') // injected style still stripped
  })
})

describe('parseCssRules', () => {
  it('finds top-level rules with their selector start offset', () => {
    const css = '.brand { color: red }\n.title , h2 { font-size: 20px }'
    const rules = parseCssRules(css)
    expect(rules.map((r) => r.selector)).toEqual(['.brand', '.title , h2'])
    expect(css.slice(rules[0].index, rules[0].index + 6)).toBe('.brand')
    expect(css.slice(rules[1].index)).toMatch(/^\.title/)
  })

  it('descends into @media and skips @keyframes/@font-face', () => {
    const css = '@font-face{src:url(x)} @media (max-width:600px){ .col { width: 100% } }'
    const rules = parseCssRules(css)
    expect(rules).toHaveLength(1)
    expect(rules[0].selector).toBe('.col')
    expect(css.slice(rules[0].index)).toMatch(/^\.col/)
  })
})

describe('needsBuildToRender', () => {
  it('flags a Vite/React bundler entry whose module script is not a real file', () => {
    const html = '<body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>'
    expect(needsBuildToRender(html, 'index.html', new Map())).toBe('bundler')
  })

  it('does NOT flag a module script that resolves to a project file', () => {
    const html = '<body><script type="module" src="app.js"></script></body>'
    const map = new Map([['app.js', { path: 'app.js', kind: 'js', content: '' }]])
    expect(needsBuildToRender(html, 'index.html', map)).toBe('')
  })

  it('flags a server template by its tags', () => {
    expect(needsBuildToRender('<body>{% block content %}{% endblock %}</body>', 'base.html', new Map())).toBe('template')
  })

  it('returns empty for a plain static page', () => {
    const html = '<head><link rel="stylesheet" href="style.css"></head><body><h1>Hi</h1></body>'
    const map = new Map([['style.css', { path: 'style.css', kind: 'css', content: '' }]])
    expect(needsBuildToRender(html, 'index.html', map)).toBe('')
  })
})

describe('matchingCssRules', () => {
  const cssFiles = [{ path: 'static/css/theme.css', content: '.brand{color:green} .brand:hover{color:blue} .other{x:y}' }]

  it('returns the rules whose selector matches the element (pseudo-states ignored)', () => {
    const el = document.createElement('a')
    el.className = 'brand'
    document.body.appendChild(el)
    const out = matchingCssRules(el, cssFiles)
    el.remove()
    expect(out.map((r) => r.selector)).toEqual(['.brand', '.brand:hover'])
    expect(out[0].path).toBe('static/css/theme.css')
  })

  it('returns nothing for an element no rule matches', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const out = matchingCssRules(el, cssFiles)
    el.remove()
    expect(out).toEqual([])
  })
})


describe('portable local reference semantics', () => {
  it.each(['import', 'preview'])('preserves SVG fragments when %s converts local assets to data URLs', async (mode) => {
    const html = '<style>.logo{mask-image:url("sprite.svg?v=2#logo")}</style>' +
      '<img src="sprite.svg#logo"><source srcset="sprite.svg#logo 1x, sprite.svg#detail 2x">' +
      '<svg><use href="sprite.svg#logo"></use></svg>'
    const svg = sourceFile('sprite.svg', 'svg', 'image/svg+xml')
    const out = mode === 'import'
      ? await htmlFilesToDocument([sourceFile('index.html', html), svg])
      : await assemblePreviewHtml(html, 'index.html', new Map([
        ['sprite.svg', { path: 'sprite.svg', kind: 'asset', handle: { getFile: async () => svg } }],
      ]))
    const doc = parseHtml(out)
    expect(doc.querySelector('img').getAttribute('src')).toBe('data:image/svg+xml;base64,c3Zn#logo')
    expect(doc.querySelector('use').getAttribute('href')).toBe('data:image/svg+xml;base64,c3Zn#logo')
    expect(doc.querySelector('source').getAttribute('srcset')).toBe('data:image/svg+xml;base64,c3Zn#logo 1x, data:image/svg+xml;base64,c3Zn#detail 2x')
    expect(doc.querySelector('style').textContent).toBe('.logo{mask-image:url("data:image/svg+xml;base64,c3Zn#logo")}')
  })

  it.each(['../assets/', '/assets/'])('resolves an imported document base %s from the selected folder root', async (base) => {
    const html = `<base href="${base}"><link rel="stylesheet" href="css/theme.css"><script src="app.js"></script>` +
      '<style>.inline{background:url(logo.png)}</style><img src="logo.png">'
    const out = await htmlFilesToDocument([
      sourceFile('site/pages/index.html', html),
      sourceFile('site/assets/css/theme.css', '.linked{background:url(../logo.png)}'),
      sourceFile('site/assets/app.js', 'window.fromBase = true'),
      sourceFile('site/assets/logo.png', 'right'),
      sourceFile('site/pages/css/theme.css', '.wrong{color:red}'),
      sourceFile('site/pages/app.js', 'window.fromBase = false'),
      sourceFile('site/pages/logo.png', 'wrong'),
    ])
    const doc = parseHtml(out)
    expect(doc.querySelector('base').getAttribute('href')).toBe(base)
    expect(doc.querySelector('img').getAttribute('src')).toBe('data:image/png;base64,cmlnaHQ=')
    expect(doc.querySelector('script').textContent).toBe('window.fromBase = true')
    expect([...doc.querySelectorAll('style')].map((style) => style.textContent)).toEqual([
      '.linked{background:url("data:image/png;base64,cmlnaHQ=")}',
      '.inline{background:url("data:image/png;base64,cmlnaHQ=")}',
    ])
  })

  it.each([false, true])('honors the document base in a code preview (forEdit=%s) without changing its source references', async (forEdit) => {
    const html = '<base href="../assets/"><link rel="stylesheet" href="css/theme.css">' +
      '<script type="module" src="app.js"></script><img src="logo.png">'
    const files = new Map([
      ['assets/css/theme.css', { path: 'assets/css/theme.css', kind: 'css', content: '.linked{background:url(../logo.png)}' }],
      ['assets/app.js', { path: 'assets/app.js', kind: 'js', content: 'window.fromBase = true' }],
      ['assets/logo.png', assetEntry('assets/logo.png', 'right')],
      ['pages/css/theme.css', { path: 'pages/css/theme.css', kind: 'css', content: '.wrong{color:red}' }],
      ['pages/logo.png', assetEntry('pages/logo.png', 'wrong')],
    ])
    const doc = parseHtml(await assemblePreviewHtml(html, 'pages/index.html', files, { forEdit }))
    expect(doc.querySelector('base').getAttribute('href')).toBe('../assets/')
    expect(doc.querySelector('style').textContent).toBe('.linked{background:url("data:image/png;base64,cmlnaHQ=")}')
    expect(linkedFilesFor('pages/index.html', html, files)).toEqual(['assets/css/theme.css', 'assets/app.js'])
    expect(needsBuildToRender(html, 'pages/index.html', files)).toBe('')
    if (forEdit) {
      const saved = parseHtml(serializeDocument(doc))
      expect(saved.querySelector('base').getAttribute('href')).toBe('../assets/')
      expect(saved.querySelector('link').getAttribute('href')).toBe('css/theme.css')
      expect(saved.querySelector('script').getAttribute('src')).toBe('app.js')
      expect(saved.querySelector('img').getAttribute('src')).toBe('logo.png')
      expect(saved.querySelector('style')).toBeNull()
    } else {
      expect(doc.querySelector('script').textContent).toBe('window.fromBase = true')
      expect(doc.querySelector('img').getAttribute('src')).toBe('data:image/png;base64,cmlnaHQ=')
    }
  })

  it.each(['https://cdn.example/assets/', '//cdn.example/assets/', 'file:///assets/'])('never substitutes local files for references under a non-project base %s', async (base) => {
    const html = `<base href="${base}"><link rel="stylesheet" href="theme.css">` +
      '<script type="module" src="app.js"></script><style>.inline{background:url(/logo.png)}</style><img src="/logo.png">'
    const files = new Map([
      ['theme.css', { path: 'theme.css', kind: 'css', content: '.wrong{color:red}' }],
      ['app.js', { path: 'app.js', kind: 'js', content: 'window.wrong = true' }],
      ['logo.png', assetEntry('logo.png', 'wrong')],
    ])
    const imported = await htmlFilesToDocument([
      sourceFile('index.html', html), sourceFile('theme.css', '.wrong{color:red}'),
      sourceFile('app.js', 'window.wrong = true'), sourceFile('logo.png', 'wrong'),
    ])
    const preview = await assemblePreviewHtml(html, 'index.html', files)
    for (const output of [imported, preview]) {
      const doc = parseHtml(output)
      expect(doc.querySelector('base').getAttribute('href')).toBe(base)
      expect(doc.querySelector('link').getAttribute('href')).toBe('theme.css')
      expect(doc.querySelector('script').getAttribute('src')).toBe('app.js')
      expect(doc.querySelector('img').getAttribute('src')).toBe('/logo.png')
      expect(doc.querySelector('style').textContent).toBe('.inline{background:url(/logo.png)}')
    }
    expect(linkedFilesFor('index.html', html, files)).toEqual([])
    expect(needsBuildToRender(html, 'index.html', files)).toBe('')
  })
})


describe('editable HTML reference preservation', () => {
  it.each(['style element', 'style attribute'])('keeps authored asset URLs in a saved %s', async (where) => {
    const html = where === 'style element'
      ? '<base href="../assets/"><style>.hero{background:url("logo.png")}</style>'
      : '<base href="../assets/"><div style="background:url(logo.png)">Hero</div>'
    const files = new Map([['assets/logo.png', assetEntry('assets/logo.png', 'right')]])
    const edit = parseHtml(await assemblePreviewHtml(html, 'pages/index.html', files, { forEdit: true }))
    const saved = parseHtml(serializeDocument(edit))
    const viewed = parseHtml(await assemblePreviewHtml(html, 'pages/index.html', files))
    expect(saved.querySelector('base').getAttribute('href')).toBe('../assets/')
    if (where === 'style element') {
      expect(saved.querySelector('style').textContent).toBe('.hero{background:url("logo.png")}')
      expect(viewed.querySelector('style').textContent).toBe('.hero{background:url("data:image/png;base64,cmlnaHQ=")}')
    } else {
      expect(saved.querySelector('div').getAttribute('style')).toBe('background:url(logo.png)')
      expect(viewed.querySelector('div').getAttribute('style')).toBe('background:url("data:image/png;base64,cmlnaHQ=")')
    }
  })

  it.each(['pages#draft', 'pages?draft'])('treats %s as a literal local directory when resolving base href', async (folder) => {
    const html = '<base href="./"><link rel="stylesheet" href="theme.css">'
    const files = new Map([
      [`${folder}/theme.css`, { path: `${folder}/theme.css`, kind: 'css', content: 'body{color:green}' }],
      ['theme.css', { path: 'theme.css', kind: 'css', content: 'body{color:red}' }],
    ])
    const preview = parseHtml(await assemblePreviewHtml(html, `${folder}/index.html`, files))
    const imported = parseHtml(await htmlFilesToDocument([
      sourceFile(`${folder}/index.html`, html),
      sourceFile(`${folder}/theme.css`, 'body{color:green}'),
      sourceFile('theme.css', 'body{color:red}'),
    ]))
    expect(preview.querySelector('style').textContent).toBe('body{color:green}')
    expect(imported.querySelector('style').textContent).toBe('body{color:green}')
    expect(linkedFilesFor(`${folder}/index.html`, html, files)).toEqual([`${folder}/theme.css`])
  })
})
