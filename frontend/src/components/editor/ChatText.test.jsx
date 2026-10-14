// A reply's Markdown is shown as formatting, and nothing in a reply can
// become markup.
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import ChatText from './ChatText.jsx'

describe('an assistant reply', () => {
  it('shows bold, code, headings and lists as such', () => {
    const { container } = render(
      <div><ChatText text={'## Neler yapabilirim\n**Sayfa:** bileşen ekle\n- Renkleri `updateTheme` ile değiştir\n- Yazı tipi\n\n1. Bir\n2. İki'} /></div>,
    )
    expect(container.querySelector('p.font-semibold').textContent).toBe('Neler yapabilirim')
    expect(container.querySelector('strong').textContent).toBe('Sayfa:')
    expect([...container.querySelectorAll('ul li')].map((li) => li.textContent)).toEqual(['Renkleri updateTheme ile değiştir', 'Yazı tipi'])
    expect(container.querySelector('code').textContent).toBe('updateTheme')
    expect(container.querySelectorAll('ol li')).toHaveLength(2)
    expect(container.textContent).not.toContain('**')
  })

  it('keeps markup in a reply as text', () => {
    const { container } = render(<div><ChatText text={'<img src=x onerror="alert(1)"> **<b>hi</b>**'} /></div>)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
    expect(container.textContent).toContain('<img src=x onerror="alert(1)">')
  })
})
