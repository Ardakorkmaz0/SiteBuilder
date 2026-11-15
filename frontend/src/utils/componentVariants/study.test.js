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
    const looks = study.map((widget) => parse(widget.html).firstElementChild.getAttribute('style'))
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
      }
    }
  })

  it('writes Turkish numbers with a decimal comma', () => {
    const constants = study.find((widget) => widget.id === 'study-constant-tiles')
    expect(constants.htmlTr).toContain('3,14159')
    expect(constants.html).toContain('3.14159')
    const table = study.find((widget) => widget.id === 'study-results-table')
    expect(table.htmlTr).toContain('1,414214')
  })

  it('keeps every badge, cell and bar when the side panel rewrites a text', () => {
    // A field whose words sit beside a styled inline piece is written back as
    // plain text and the piece is lost. Only these mark words inside a running
    // sentence (a blank, a fraction, a highlight, a keyword, a footnote mark).
    const sentences = new Set([
      'study-fill-blanks', 'study-formula-card', 'study-formula-flashcard',
      'study-highlighted-notes', 'study-query-result', 'study-side-note',
    ])
    const styled = (html) => parse(html).querySelectorAll('[style]').length
    for (const widget of study.filter((item) => !sentences.has(item.id))) {
      let html = widget.htmlTr
      for (const field of listHtmlContentFields(html, { maxText: 200 }).texts) {
        html = updateHtmlTextAtPath(html, field.path, field.text)
      }
      expect(styled(html), widget.id).toBe(styled(widget.htmlTr))
    }
  })

  it('numbers its ordered lists itself, whatever the page resets', () => {
    for (const widget of study) {
      for (const list of parse(widget.html).querySelectorAll('ol')) {
        expect(list.getAttribute('style'), widget.id).toContain('list-style:decimal')
      }
    }
  })
})
