import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import CodeFileEditor from './CodeFileEditor.jsx'

describe('CodeFileEditor reveal scroll sync', () => {
  it('syncs the highlighted backdrop scrollTop when revealing a distant CSS rule', () => {
    localStorage.setItem('pwb_language', 'en')
    const filler = Array.from({ length: 45 }, (_, i) => `.line-${i} { color: #111; }`).join('\n')
    const target = '.target-rule { color: #e11d48; }'
    const content = `${filler}\n${target}\n.end { margin: 0; }`
    const index = content.indexOf(target)

    const { container } = render(
      <LanguageProvider>
        <CodeFileEditor
          file={{ path: 'styles.css', name: 'styles.css', kind: 'css', content }}
          onChange={vi.fn()}
          reveal={{ index, length: target.length }}
        />
      </LanguageProvider>,
    )

    const textarea = screen.getByRole('textbox')
    const backdrop = container.querySelector('.code-field-behind')
    expect(backdrop).not.toBeNull()
    expect(textarea.scrollTop).toBeGreaterThan(0)
    expect(backdrop.scrollTop).toBe(textarea.scrollTop)
  })
})
