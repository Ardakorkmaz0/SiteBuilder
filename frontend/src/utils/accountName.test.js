import { describe, expect, it } from 'vitest'
import { accountName } from './accountName.js'

const translate = (text) => ({ Guest: 'Misafir' }[text] || text)

describe('accountName', () => {
  it('prefers the name the person chose', () => {
    expect(accountName({ username: 'guest-x7k2m4pq', is_guest: true, display_name: 'Ada' }, translate)).toBe('Ada')
    expect(accountName({ username: 'ada', display_name: 'Ada Studio' }, translate)).toBe('Ada Studio')
  })

  it('calls a guest a guest, not by the random handle', () => {
    expect(accountName({ username: 'guest-x7k2m4pq', is_guest: true }, translate)).toBe('Misafir')
    // What the API sends for a guest who has not chosen a name.
    expect(accountName({ username: 'guest-x7k2m4pq', is_guest: true, display_name: 'guest-x7k2m4pq' }, translate)).toBe('Misafir')
  })

  it('uses an account\'s username, then the fallback', () => {
    expect(accountName({ username: 'ada' }, translate)).toBe('ada')
    expect(accountName(null, translate, 'Account')).toBe('Account')
  })
})
