import { beforeEach, describe, expect, it } from 'vitest'
import { apiError } from './errors.js'

describe('apiError', () => {
  beforeEach(() => localStorage.setItem('pwb_language', 'tr'))

  it('localizes stable backend error codes', () => {
    expect(apiError({ response: { data: { code: 'site_not_found', detail: 'Site not found.' } } }))
      .toBe('Site bulunamadı.')
  })

  it('localizes DRF validation codes without relying on English details', () => {
    expect(apiError({ response: { data: {
      code: 'validation_error',
      username: ['This field is required.'],
      error_codes: { username: ['required'] },
    } } })).toBe('Bu alan zorunludur.')
  })

  it('says a failed sign-in in Turkish, not DRF\'s English sentence', () => {
    // What the sign-in endpoint actually returns for a wrong password.
    expect(apiError({ response: { data: {
      code: 'validation_error',
      non_field_errors: ['Unable to log in with provided credentials.'],
      error_codes: { non_field_errors: ['authorization'] },
    } } })).toBe('Kullanıcı adı veya şifre hatalı.')
  })

  it('tells a suspended account why it cannot sign in', () => {
    expect(apiError({ response: { status: 403, data: {
      code: 'account_suspended', detail: 'This account is suspended. Contact support if you think this is a mistake.',
    } } })).toBe('Bu hesap askıya alındı. Bir hata olduğunu düşünüyorsanız destekle iletişime geçin.')
  })

  it('says which sign-up rule failed rather than "enter a valid value"', () => {
    // The register endpoint's own answers.
    expect(apiError({ response: { data: {
      code: 'validation_error',
      username: ['This username is already taken.'],
      error_codes: { username: ['unique'] },
    } } })).toBe('Bu kullanıcı adı zaten alınmış.')
    expect(apiError({ response: { data: {
      code: 'validation_error',
      password: ['This password is too common.', 'This password is entirely numeric.'],
      error_codes: { password: ['password_too_common', 'password_entirely_numeric'] },
    } } })).toBe('Bu şifre çok yaygın.')
  })

  it('falls back to the code\'s line for a sentence it cannot say in Turkish', () => {
    expect(apiError({ response: { data: {
      code: 'validation_error',
      username: ['Some sentence nobody translated.'],
      error_codes: { username: ['unique'] },
    } } })).toBe('Bu değer zaten kullanılıyor.')
  })

  it('shows the server\'s own sentence in English', () => {
    localStorage.setItem('pwb_language', 'en')
    expect(apiError({ response: { data: {
      code: 'validation_error',
      username: ['This username is already taken.'],
      error_codes: { username: ['unique'] },
    } } })).toBe('This username is already taken.')
  })

  it('keeps English messages when English is selected', () => {
    localStorage.setItem('pwb_language', 'en')
    expect(apiError({ response: { data: { code: 'permission_denied', detail: 'Forbidden' } } }))
      .toBe('You do not have permission to do that.')
  })
})

// An unhandled server error arrives as text: Django's whole debug traceback in
// development, an HTML error page in production. It was shown verbatim.
describe('apiError on a text response', () => {
  beforeEach(() => localStorage.setItem('pwb_language', 'tr'))
  const traceback = 'OperationalError at /api/explore/\nno such column: builder_site.moderation_blocked\nRequest Method: GET\nDjango Version: 6.0.5\nTraceback (most recent call last): ...'

  it('turns a debug traceback into one sentence with the status', () => {
    const message = apiError({ response: { status: 500, data: traceback } })
    expect(message).toBe('Sunucuda bir hata oluştu (500). Lütfen biraz sonra tekrar deneyin.')
    expect(message).not.toMatch(/Traceback|moderation_blocked/)
  })

  it('does not paint a production HTML error page as text', () => {
    const message = apiError({ response: { status: 502, data: '<html><body><h1>Bad Gateway</h1></body></html>' } })
    expect(message).toContain('502')
    expect(message).not.toContain('<')
  })

  it('still shows a short plain message from a 4xx', () => {
    localStorage.setItem('pwb_language', 'en')
    expect(apiError({ response: { status: 400, data: 'Title is required.' } })).toBe('Title is required.')
  })

  it('names a moderator takedown', () => {
    expect(apiError({ response: { status: 403, data: { code: 'site_moderated', detail: 'x' } } }))
      .toBe('Bu site bir moderatör tarafından kaldırıldı.')
  })
})

describe('apiError when the dev database is behind the code', () => {
  it('says what to run instead of showing a traceback', () => {
    localStorage.setItem('pwb_language', 'tr')
    const message = apiError({ response: { status: 500, data: { code: 'database_outdated', detail: 'x' } } })
    expect(message).toContain('python manage.py migrate')
    expect(message).toContain('Veritabanı')
  })
})
