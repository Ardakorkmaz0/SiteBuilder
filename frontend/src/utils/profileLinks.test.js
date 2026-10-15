import { describe, expect, it } from 'vitest'
import { profileLinks } from './profileLinks.js'

describe('profileLinks', () => {
  it('turns a website and handles into links', () => {
    expect(profileLinks({ website: 'ada.dev', github: '@ada', twitter: 'https://x.com/ada' })).toEqual([
      { id: 'website', label: 'ada.dev', href: 'https://ada.dev' },
      { id: 'github', label: 'ada', href: 'https://github.com/ada' },
      { id: 'twitter', label: 'x.com/ada', href: 'https://x.com/ada' },
    ])
  })

  // Kept before the server checked links: not an address, so not a link.
  it('leaves out text that cannot be an address', () => {
    expect(profileLinks({ website: 'bu bir adres değil', instagram: 'two words' })).toEqual([])
  })
})
