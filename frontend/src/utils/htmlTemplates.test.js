// "Start blank HTML" means a blank page: a document with nothing in its body.
import { describe, expect, it } from 'vitest'
import { emptyHtmlDocument } from './htmlTemplates.js'

const bodyOf = (html) => new DOMParser().parseFromString(html, 'text/html').body

describe('emptyHtmlDocument', () => {
  it('has nothing on the page', () => {
    const body = bodyOf(emptyHtmlDocument('Ada'))

    expect(body.children).toHaveLength(0)
    expect(body.textContent.trim()).toBe('')
  })

  it('is still a whole document, titled and ready for phones', () => {
    const html = emptyHtmlDocument('Ada <Studio>')

    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0" />')
    expect(html).toContain('<title>Ada &lt;Studio></title>')
  })

  it('carries the theme, so what is added matches it', () => {
    const html = emptyHtmlDocument('Ada', { primaryColor: '#c2410c', fontFamily: 'Georgia, serif' })

    expect(html).toContain('--accent:#c2410c')
    expect(html).toContain('--font:Georgia, serif')
  })

  it('takes the page language, and nothing that is not one', () => {
    expect(emptyHtmlDocument('Ada', undefined, 'tr')).toContain('<html lang="tr">')
    expect(emptyHtmlDocument('Ada', undefined, '"><script>')).toContain('<html lang="en">')
  })
})
