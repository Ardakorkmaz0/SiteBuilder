import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const themeCss = readFileSync(resolve('src/index.css'), 'utf8')

describe('dark theme color contract', () => {
  it('defines the complete semantic palette for dark product surfaces', () => {
    const darkBlock = themeCss.match(/:root\[data-ui-theme="dark"\]\s*\{([\s\S]*?)\n\}/)?.[1] || ''

    for (const token of [
      '--studio-shell',
      '--studio-panel',
      '--studio-panel-raised',
      '--studio-control',
      '--studio-control-hover',
      '--studio-border',
      '--studio-border-strong',
      '--studio-text',
      '--studio-text-muted',
      '--studio-text-faint',
      '--studio-accent',
      '--studio-danger-soft',
      '--studio-success-soft',
      '--studio-warning-soft',
      '--studio-info-soft',
      '--studio-overlay',
      '--studio-focus-ring',
    ]) {
      expect(darkBlock, `${token} should be set by the dark palette`).toContain(`${token}:`)
    }
  })

  it('uses shared overlay and status treatments instead of isolated modal colors', () => {
    expect(themeCss).toContain('.studio-overlay')
    expect(themeCss).toContain('background: var(--studio-overlay)')
    expect(themeCss).toContain('.studio-status-danger')
    expect(themeCss).toContain('.studio-status-success')
    expect(themeCss).toContain('.studio-status-warning')
    expect(themeCss).toContain('.studio-status-info')
  })

  it('does not turn legacy dark neutral cards into purple accent cards', () => {
    const legacyDarkSurface = themeCss.match(
      /\.app-theme-surface \[class\*="bg-\[#111827\]"\]\s*\{([\s\S]*?)\n\}/,
    )?.[1] || ''

    expect(legacyDarkSurface).toContain('var(--studio-panel-raised)')
    expect(legacyDarkSurface).not.toContain('var(--studio-accent)')
  })

  it('keeps the page being designed in the light scheme the published site has', () => {
    // Under a dark scheme every embed iframe on the canvas is painted opaque.
    const siteSurface = themeCss.match(/\n\.site-surface\s*\{([\s\S]*?)\n\}/)?.[1] || ''
    expect(siteSurface).toContain('color-scheme: light;')
    // The dark app's native select styling stays off the page's own selects.
    expect(themeCss).toContain(':root[data-ui-theme="dark"] select:not(.site-surface *) {')
  })
})
