import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Heading } from './components.jsx'

// A heading's tag is drawn at a line height of 1.15 whatever the block was
// given, so a heading with a line height of its own did not show it.
describe('a heading on the canvas', () => {
  it('takes the line height it was given', () => {
    const { container } = render(<Heading props={{ text: 'Olive', level: 'h1' }} style={{ fontSize: '40px', lineHeight: '60px' }} />)

    expect(container.querySelector('h1').getAttribute('style')).toContain('line-height: inherit')
  })

  it('keeps 1.15 when it was given none', () => {
    const { container } = render(<Heading props={{ text: 'Olive', level: 'h1' }} style={{ fontSize: '40px' }} />)

    expect(container.querySelector('h1').getAttribute('style')).toContain('line-height: 1.15')
  })
})
