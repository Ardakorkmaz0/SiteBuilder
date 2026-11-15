import { describe, expect, it } from 'vitest'
import { TURKISH_TRANSLATIONS } from '../../i18n/translations.js'
import { listHtmlContentFields, updateHtmlTextAtPath } from '../htmlQuickEdit.js'
import { WIDGET_CATEGORIES, WIDGETS } from './index.js'
import { STUDY_GROUPS } from './study.js'

const parse = (html) => new DOMParser().parseFromString(html, 'text/html').body
const study = WIDGETS.filter((widget) => widget.group.startsWith('study-'))

describe('study widgets', () => {
  it('reach the block library in six named groups', () => {
    expect(STUDY_GROUPS.map((group) => group.id)).toEqual([
      'study-exam', 'study-formulas', 'study-notes', 'study-tech', 'study-steps', 'study-planning',
    ])
    for (const group of STUDY_GROUPS) {
      expect(WIDGET_CATEGORIES.some((category) => category.id === group.id), group.id).toBe(true)
      expect(study.filter((widget) => widget.group === group.id).length, group.id).toBeGreaterThanOrEqual(6)
    }
    expect(TURKISH_TRANSLATIONS['Step-by-step solutions']).toBe('Adım adım çözümler')
    expect(TURKISH_TRANSLATIONS['Exam question with solution']).toBe('Çözümlü sınav sorusu')
  })

  it('gives no two of them the same outer look', () => {
    // The library's older pieces were one palette with colours swapped; each
    // study widget is drawn in a look of its own, so no outer box repeats.
    // Compared as the browser reads them, so a stray ';' or space is no disguise.
    const looks = study.map((widget) => parse(widget.html).firstElementChild.style.cssText)
    expect(new Set(looks).size).toBe(study.length)
  })

  it('reveals answers with a summary a visitor can click, without a script', () => {
    const reveals = study.filter((widget) => widget.html.includes('<details'))
    expect(reveals.map((widget) => widget.id)).toEqual(expect.arrayContaining([
      'study-question-paper', 'study-options-explained', 'study-true-false-board', 'study-fill-blanks',
      'study-hint-ladder', 'study-formula-flashcard', 'study-step-timeline', 'study-flashcard-stack',
    ]))
    for (const widget of reveals) {
      for (const details of parse(widget.htmlTr).querySelectorAll('details')) {
        expect(details.firstElementChild.tagName, widget.id).toBe('SUMMARY')
        expect(details.firstElementChild.textContent.trim(), widget.id).not.toBe('')
        // A summary holds phrasing content only.
        expect(details.firstElementChild.querySelector('div, p, ol, ul, table'), widget.id).toBeNull()
      }
    }
  })

  it('writes Turkish numbers with a decimal comma', () => {
    const constants = study.find((widget) => widget.id === 'study-constant-tiles')
    expect(constants.htmlTr).toContain('3,14159')
    expect(constants.html).toContain('3.14159')
    // A point between digits, not a thousands group of three: a decimal. Only
    // program output (<pre>), a clock time and a book section keep the point.
    const decimal = /\d\.(?:\d{1,2}|\d{4,})(?!\d)/g
    const kept = new Set(['9.30', '2.3'])
    for (const widget of study) {
      const body = parse(widget.htmlTr)
      body.querySelectorAll('pre').forEach((pre) => pre.remove())
      const found = (body.textContent.match(decimal) || []).filter((match) => !kept.has(match))
      expect(found, widget.id).toEqual([])
    }
  })

  it('keeps every element and its look when the side panel edits a text', () => {
    // Every element with its attributes, in order: a fraction, a <sub>, a
    // styled blank or an italic title must survive a corrected word.
    const structure = (html) => [...parse(html).querySelectorAll('*')]
      .map((el) => `${el.tagName}${[...el.attributes].map((a) => ` ${a.name}=${a.value}`).join('')}`)
    // The Turkish build: the same markup as the English one (componentVariants.test.js),
    // and the writer does not depend on the language.
    for (const widget of study) {
      for (const source of [widget.htmlTr]) {
        const fields = listHtmlContentFields(source, { maxText: 200 }).texts
        expect(fields.length, widget.id).toBeGreaterThan(0)
        let html = source
        const written = fields.map((field) => {
          const middle = Math.floor(field.text.length / 2)
          const text = `${field.text.slice(0, middle)}Ω${field.text.slice(middle)}`
          html = updateHtmlTextAtPath(html, field.path, text)
          return text
        })
        expect(structure(html), widget.id).toEqual(structure(source))
        expect(listHtmlContentFields(html, { maxText: 200 }).texts.map((field) => field.text), widget.id).toEqual(written)
      }
    }
  }, 20000) // Every field of 41 widgets, each write a fresh parse: over a second alone.

  it('numbers its ordered lists itself, whatever the page resets', () => {
    for (const widget of study) {
      for (const list of parse(widget.html).querySelectorAll('ol')) {
        expect(list.getAttribute('style'), widget.id).toContain('list-style:decimal')
      }
    }
  })
})
