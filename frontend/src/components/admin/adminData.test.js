import { describe, expect, it } from 'vitest'
import { auditDetail } from './adminData.js'
import { translate } from '../../i18n/language.js'

const tr = (key, variables) => translate('tr', key, variables)

// The server writes an audit entry's detail as English text, and old entries
// keep what was written: the console read "Owner @ada" on a Turkish screen.
describe('an audit entry detail', () => {
  it('is said in the console language for the shapes the server writes', () => {
    expect(auditDetail('Owner @ada', tr)).toBe('Sahibi: @ada')
    expect(auditDetail('Report 12 (spam)', tr)).toBe('12 numaralı şikâyet: Spam veya yanıltıcı')
    expect(auditDetail('Report 3 (malware)', tr)).toBe('3 numaralı şikâyet: Zararlı veya kimlik avı')
    expect(auditDetail('Report 4 (inappropriate)', tr)).toBe('4 numaralı şikâyet: Uygunsuz veya saldırgan')
    expect(auditDetail('Report 6 (copyright)', tr)).toBe('6 numaralı şikâyet: Telif ihlali veya kimliğe bürünme')
    expect(auditDetail('Report 8 (other)', tr)).toBe('8 numaralı şikâyet: Diğer')
    expect(auditDetail('4 copies removed', tr)).toBe('4 kopya silindi')
  })

  it('is left as written when it has another shape', () => {
    expect(auditDetail('email_host, frontend_url', tr)).toBe('email_host, frontend_url')
    expect(auditDetail('Report 5 (new-reason)', tr)).toBe('5 numaralı şikâyet: new-reason')
    expect(auditDetail('', tr)).toBe('')
  })
})
