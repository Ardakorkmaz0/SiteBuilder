import { afterEach, describe, expect, it } from 'vitest'
import { markSurface, surfaceFor } from './surface.js'

describe('surfaceFor', () => {
  it.each([
    ['/editor/12', 'editor'],
    ['/editor', 'editor'],
    ['/code', 'editor'],
    ['/code/', 'editor'],
    ['/', 'app'],
    ['/login', 'app'],
    ['/site/my-site', 'app'],
    ['/editorial-notes', 'app'],
    ['/codex', 'app'],
  ])('puts %s on the %s surface', (path, surface) => {
    expect(surfaceFor(path)).toBe(surface)
  })
})

describe('markSurface', () => {
  afterEach(() => { delete document.documentElement.dataset.surface })

  it('marks the document so portalled dialogs pick the theme up too', () => {
    markSurface('/favorites')
    expect(document.documentElement.dataset.surface).toBe('app')
    markSurface('/editor/3')
    expect(document.documentElement.dataset.surface).toBe('editor')
  })
})
