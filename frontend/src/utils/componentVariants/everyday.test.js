import { describe, expect, it } from 'vitest'
import { TURKISH_TRANSLATIONS } from '../../i18n/translations.js'
import { listHtmlContentFields, updateHtmlTextAtPath } from '../htmlQuickEdit.js'
import { EVERYDAY_GROUPS } from './everyday.js'
import { WIDGET_CATEGORIES, WIDGETS } from './index.js'

const GROUP_IDS = ['life-portfolio', 'life-events', 'life-kitchen', 'life-travel', 'life-media', 'life-play']
const widgets = WIDGETS.filter(widget => widget.group.startsWith('life-'))
const parse = html => new DOMParser().parseFromString(html, 'text/html').body
const rootStyle = html => {
  const style = parse(html).firstElementChild.style
  return Array.from({ length: style.length }, (_, index) => style.item(index)).sort().map(property => `${property}:${style.getPropertyValue(property)}!${style.getPropertyPriority(property)}`).join(';')
}
const elementStructure = element => ({
  tag: element.tagName,
  attributes: [...element.attributes].map(attribute => [attribute.name, attribute.value]).sort(([a], [b]) => a.localeCompare(b)),
  children: [...element.children].map(elementStructure),
})
const structure = html => [...parse(html).children].map(elementStructure)

describe('everyday widgets', () => {
  it('registers thirty widgets in six distinct groups with translated labels', () => {
    expect(EVERYDAY_GROUPS.map(group => group.id)).toEqual(GROUP_IDS)
    expect(widgets).toHaveLength(30)
    for (const id of GROUP_IDS) {
      expect(WIDGET_CATEGORIES.some(category => category.id === id), id).toBe(true)
      expect(widgets.filter(widget => widget.group === id), id).toHaveLength(5)
    }
    expect(new Set(widgets.map(widget => widget.id)).size).toBe(30)
    for (const widget of widgets) expect(TURKISH_TRANSLATIONS[widget.label], widget.id).toBeTruthy()
  })

  it('uses distinct normalized outer styles, including against older widgets', () => {
    const older = new Set(WIDGETS.filter(widget => !widget.group.startsWith('life-')).map(widget => rootStyle(widget.html)))
    const styles = widgets.map(widget => rootStyle(widget.html))
    expect(new Set(styles).size).toBe(30)
    for (const widget of widgets) {
      expect(older.has(rootStyle(widget.html)), widget.id).toBe(false)
      expect(rootStyle(widget.htmlTr), widget.id).toBe(rootStyle(widget.html))
    }
  })

  it('preserves every element, attribute and style when any panel field is rewritten in either language', () => {
    for (const widget of widgets) {
      for (const source of [widget.html, widget.htmlTr]) {
        const fields = listHtmlContentFields(source, { maxText: 10000 })
        expect(fields.texts.length, widget.id).toBeGreaterThan(0)
        expect(fields.textOverflow, widget.id).toBe(0)
        let edited = source
        const expectedText = fields.texts.map((_, index) => `Edited field ${index + 1}`)
        fields.texts.forEach((field, index) => { edited = updateHtmlTextAtPath(edited, field.path, expectedText[index]) })
        expect(structure(edited), widget.id).toEqual(structure(source))
        expect(listHtmlContentFields(edited, { maxText: 10000 }).texts.map(field => field.text), widget.id).toEqual(expectedText)
      }
    }
  }, 20000) // Every field of 30 widgets in two languages, each write a fresh parse: seconds under a busy CI.

  it('builds both languages with matching markup and no unresolved copy', () => {
    const tags = html => [...html.matchAll(/<\/?[a-z][a-z0-9-]*/gi)].map(match => match[0].toLowerCase())
    for (const widget of widgets) {
      expect(widget.htmlTr, widget.id).toBeTruthy()
      expect(tags(widget.htmlTr), widget.id).toEqual(tags(widget.html))
      expect(widget.htmlTr, widget.id).not.toBe(widget.html)
      for (const html of [widget.html, widget.htmlTr]) expect(html, widget.id).not.toMatch(/undefined|NaN|\[object Object\]/)
    }
  })

  it('localizes prices, distances, weights and radio frequency with decimal commas', () => {
    const values = [
      ['life-menu-arch', ['€6.50', '€12.00'], ['6,50 €', '12,00 €']],
      ['life-market-receipt', ['€3.80', '€1.20', '€1.50', '€6.50'], ['3,80 €', '1,20 €', '1,50 €', '6,50 €']],
      ['life-folded-route', ['6.5 km'], ['6,5 km']],
      ['life-trail-signpost', ['8.5 km'], ['8,5 km']],
      ['life-rpg-satchel', ['7.5 / 12 kg'], ['7,5 / 12 kg']],
      ['life-radio-dial', ['96.4 MHz'], ['96,4 MHz']],
    ]
    for (const [id, english, turkish] of values) {
      const widget = widgets.find(item => item.id === id)
      const en = parse(widget.html).textContent
      const tr = parse(widget.htmlTr).textContent
      for (const value of english) expect(en, id).toContain(value)
      for (const value of turkish) expect(tr, id).toContain(value)
    }
  })

  it('keeps snippets passive and reserves space for properly named native disclosures', () => {
    let disclosures = 0
    for (const widget of widgets) {
      for (const html of [widget.html, widget.htmlTr]) {
        const body = parse(html)
        expect(body.children, widget.id).toHaveLength(1)
        expect(html, widget.id).not.toMatch(/<style\b|<script\b|<link\b|\son[a-z]+\s*=|javascript:/i)
        for (const element of body.querySelectorAll('[href],[src],[action],[formaction]')) {
          for (const attribute of ['href', 'src', 'action', 'formaction']) {
            // DOM parsing resolves entities; ignore controls that browsers
            // remove while reading a URL scheme as well.
            const url = [...(element.getAttribute(attribute) || '')].filter(character => character.charCodeAt(0) > 32).join('')
            expect(url, widget.id).not.toMatch(/^javascript:/i)
          }
        }
        for (const details of body.querySelectorAll('details')) {
          disclosures++
          expect(details.firstElementChild.tagName, widget.id).toBe('SUMMARY')
          expect(details.firstElementChild.textContent.trim(), widget.id).toMatch(/\p{L}/u)
          expect(details.firstElementChild.querySelector('div, section, table, form, ul, ol, li'), widget.id).toBeNull()
          // Real browser checks verify the amount; this guards accidentally
          // dropping the reservation and letting auto-fit shrink it closed.
          expect(body.firstElementChild.style.minHeight, widget.id).toMatch(/^\d+(?:\.\d+)?px$/)
          expect(Number.parseFloat(body.firstElementChild.style.minHeight), widget.id).toBeGreaterThan(0)
        }
        for (const field of body.querySelectorAll('input,select,textarea')) {
          expect(field.getAttribute('name'), widget.id).toBeTruthy()
          expect(field.getAttribute('aria-label') || field.labels?.length, widget.id).toBeTruthy()
        }
        for (const list of body.querySelectorAll('ol')) expect(list.style.listStyleType || list.style.listStyle, widget.id).toBe('decimal')
      }
    }
    expect(disclosures).toBeGreaterThan(0)
  })
})
