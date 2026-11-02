import { describe, expect, it } from 'vitest'
import { pageLiveStates } from './pageLiveStates.js'

const home = { id: 'home' }
const about = { id: 'about' }
const contact = { id: 'contact' }

describe('pageLiveStates', () => {
  it('reads the server: live, older, and nothing means not live', () => {
    expect(pageLiveStates([home, about, contact], { home: 'live', about: 'older' })).toEqual({
      home: 'live', about: 'older', contact: 'none',
    })
  })

  it('shows a live page with unsaved edits as older, and only that page', () => {
    const edited = { id: 'about', name: 'Changed' }
    const saved = { pages: [home, about], html: {} }
    expect(pageLiveStates([home, edited], { home: 'live', about: 'live' }, saved)).toEqual({ home: 'live', about: 'older' })
  })

  it('shows a page whose document changed as older', () => {
    const saved = { pages: [home], html: { home: '<h1>a</h1>' } }
    expect(pageLiveStates([home], { home: 'live' }, saved, { home: '<h1>b</h1>' })).toEqual({ home: 'older' })
    expect(pageLiveStates([home], { home: 'live' }, saved, { home: '<h1>a</h1>' })).toEqual({ home: 'live' })
  })

  it('shows the page being typed into as older', () => {
    const saved = { pages: [home, about], html: {} }
    expect(pageLiveStates([home, about], { home: 'live', about: 'live' }, saved, {}, 'about')).toEqual({ home: 'live', about: 'older' })
  })

  it('never lifts an unsent page out of red because of an edit', () => {
    const saved = { pages: [about], html: {} }
    expect(pageLiveStates([{ id: 'about', name: 'Changed' }], {}, saved)).toEqual({ about: 'none' })
  })
})
