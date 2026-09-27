// A thumbnail runs nothing, including the documents a page carries inside it.
import { describe, expect, it } from 'vitest'
import { withoutExecutableScripts } from './htmlRuntime.js'

const parse = (html) => new DOMParser().parseFromString(html, 'text/html')

describe('withoutExecutableScripts', () => {
  it('strips scripts and inline handlers', () => {
    const doc = parse(withoutExecutableScripts('<p onclick="x()">Hi</p><script>alert(1)</script>'))

    expect(doc.querySelector('script')).toBeNull()
    expect(doc.querySelector('p').hasAttribute('onclick')).toBe(false)
    expect(doc.querySelector('p').textContent).toBe('Hi')
  })

  it('strips the scripts of a document embedded in an iframe srcdoc', () => {
    // An HTML embed block carries a whole page this way; inside a script-less
    // thumbnail each of its scripts was blocked and logged as an error.
    const inner = '<p>Inner</p><script>tick()</script><button onclick="go()">Go</button>'
    const outer = `<iframe srcdoc="${inner.replace(/"/g, '&quot;')}"></iframe>`

    const doc = parse(withoutExecutableScripts(outer))
    const nested = parse(doc.querySelector('iframe').getAttribute('srcdoc'))

    expect(nested.querySelector('script')).toBeNull()
    expect(nested.querySelector('button').hasAttribute('onclick')).toBe(false)
    expect(nested.querySelector('p').textContent).toBe('Inner')
  })

  it('drops javascript: addresses, which run when followed or loaded', () => {
    const doc = parse(withoutExecutableScripts('<a href="javascript:steal()">x</a><iframe src=" javascript:run()"></iframe><a href="/about">ok</a>'))

    const [bad, ok] = doc.querySelectorAll('a')
    expect(bad.hasAttribute('href')).toBe(false)
    expect(doc.querySelector('iframe').hasAttribute('src')).toBe(false)
    expect(ok.getAttribute('href')).toBe('/about')
  })

  it('stops following nested documents after a few levels', () => {
    let html = '<script>deep()</script><p>bottom</p>'
    for (let i = 0; i < 6; i += 1) html = `<iframe srcdoc="${html.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe>`

    // Open every nested document for real: inside a srcdoc attribute a script
    // is escaped text, so searching the string would find nothing either way.
    const scriptsIn = (source) => {
      const doc = parse(source)
      return doc.querySelectorAll('script').length
        + [...doc.querySelectorAll('iframe[srcdoc]')].reduce((sum, frame) => sum + scriptsIn(frame.getAttribute('srcdoc')), 0)
    }
    expect(scriptsIn(html)).toBe(1)

    expect(scriptsIn(withoutExecutableScripts(html))).toBe(0)
  })
})
