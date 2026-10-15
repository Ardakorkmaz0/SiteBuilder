import { describe, expect, it } from 'vitest'
import { applyElementPatch, describeElement, duplicateElement, moveElement, setElementLink } from './htmlElementEdit.js'
import { serializeDocument } from './htmlPlacement.js'

describe('HTML content survives editing and a saved-document parse', () => {
  it('round-trips Turkish, emoji, combining characters and literal markup across multiline edits', () => {
    document.body.innerHTML = '<h2 id="copy">Old <strong>formatted</strong> text</h2>'
    const heading = document.getElementById('copy')
    const text = 'İstanbul – ışık 👩🏽‍💻 e\u0301\nİkinci <satır> & "alıntı"\n'
    applyElementPatch(heading, { text })
    const restored = new DOMParser().parseFromString(serializeDocument(document), 'text/html')
    expect(describeElement(restored.getElementById('copy')).text).toBe(text)
    expect(restored.querySelector('satır')).toBeNull()
  })

  it('edits a textarea default as raw text, so saved newlines never turn into literal br markup', () => {
    document.body.innerHTML = '<textarea id="message">Original message</textarea>'
    const textarea = document.getElementById('message')
    const text = 'Merhaba 👋\nİkinci satır <literal> & güvenli\nSon satır'
    applyElementPatch(textarea, { text })
    expect(textarea.value).toBe(text)
    const restored = new DOMParser().parseFromString(serializeDocument(document), 'text/html')
    expect(restored.getElementById('message').value).toBe(text)
    expect(restored.getElementById('message').innerHTML).not.toContain('<br>')
  })

  it('updates both the displayed textarea value and its saved default after it was interacted with', () => {
    document.body.innerHTML = '<textarea id="message">Original</textarea>'
    const textarea = document.getElementById('message')
    textarea.value = 'Previous interaction'
    applyElementPatch(textarea, { text: 'New default' })
    expect(textarea.value).toBe('New default')
    expect(textarea.defaultValue).toBe('New default')
  })

  it('keeps an internal jump attached to a duplicated nested block when reordered', () => {
    document.body.innerHTML = '<main><article id="a"><h2 id="target">İlk başlık</h2><a href="#target">Jump</a></article><article id="b">Second</article></main>'
    const clone = duplicateElement(document.getElementById('a'))
    expect(moveElement(clone, 'down')).toBe(true)
    expect([...document.querySelectorAll('article')].map((node) => node.id)).toEqual(['a', 'b', 'a-2'])
    expect(clone.querySelector('a').getAttribute('href')).toBe('#target-2')
    expect(document.getElementById('target-2')).toBe(clone.querySelector('h2'))
  })

  it('removes only a generated link wrapper while preserving nested rich content and its target id', () => {
    document.body.innerHTML = '<section><p id="copy">İçerik <strong>kalın</strong><br>Yeni satır</p></section>'
    const paragraph = document.getElementById('copy')
    setElementLink(paragraph, '#contact')
    setElementLink(paragraph, '')
    expect(paragraph.parentElement.tagName).toBe('SECTION')
    expect(paragraph.id).toBe('copy')
    expect(paragraph.querySelector('strong').textContent).toBe('kalın')
    expect(paragraph.querySelector('br')).not.toBeNull()
  })
})
