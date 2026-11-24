import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { ICON_NODES, iconMarkup } from './iconNodes.js'
import { NodeIcon, TrashIcon } from './icons.jsx'

const shapes = (svg) => [...svg.children].map((node) => [node.tagName.toLowerCase(), ...[...node.attributes].map((a) => `${a.name}=${a.value}`).sort()])

describe('icon drawings shared by React and by markup written into a page', () => {
  it('writes the X as its two strokes', () => {
    const markup = iconMarkup('x')
    expect(markup).toContain('<path d="M18 6 6 18"/>')
    expect(markup).toContain('<path d="m6 6 12 12"/>')
    expect(markup).toContain('stroke="currentColor"')
    expect(markup).toContain('aria-hidden="true"')
  })

  it('draws every icon the same way in both, attribute for attribute', () => {
    for (const name of Object.keys(ICON_NODES)) {
      const host = document.createElement('div')
      host.innerHTML = iconMarkup(name)
      const { container, unmount } = render(<NodeIcon name={name} />)
      expect(shapes(container.querySelector('svg')), name).toEqual(shapes(host.querySelector('svg')))
      unmount()
    }
  })

  it('lays drawings over each other: a crossed-out phone is hidden on mobile', () => {
    const host = document.createElement('div')
    host.innerHTML = iconMarkup(['smartphone', 'slash'])
    expect(host.querySelectorAll('svg > *')).toHaveLength(3)
    expect(host.querySelector('path[d="m3 3 18 18"]')).not.toBeNull()
  })

  it('keeps the drawing the panel footer always had for the trash can', () => {
    const { container } = render(<TrashIcon />)
    expect([...container.querySelectorAll('path')].map((p) => p.getAttribute('d')))
      .toEqual(['M4 7h16', 'M10 11v6M14 11v6', 'M6 7l1 14h10l1-14', 'M9 7V4h6v3'])
  })
})
