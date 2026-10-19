import { describe, expect, it } from 'vitest'
import { TURKISH_TRANSLATIONS } from './translations.js'

// The Turkish interface addresses the user formally ("siz"), as AGENTS.md
// says. Dozens of strings had drifted to "sen": "Alan adını gir", "projeni",
// "Giriş yaparsan kalır". These forms only ever mean "you" in the singular.
const INFORMAL = [
  /\b(sen|senin|sana|seni|sende|senden)\b/i,
  /\p{L}+(abilirsin|ebilirsin|ıyorsun|iyorsun|uyorsun|üyorsun)(?!\p{L})/u,
  /\p{L}+(rsan|rsen)(?!\p{L})/u,
  // Only words that cannot also be something else: "hesabın" is just as
  // often "of the account", "sayfaların" "of the pages".
  /\b(istediğin|yaptığın|yaptıkların|geldin|siten|sitende|projen|projeni|çalışman|çalışmanı|teman)(?!\p{L})/iu,
]

// Requests the user writes to the AI assistant, shown as examples: there the
// user is the one speaking, to the assistant.
const SPOKEN_TO_THE_ASSISTANT = /^e\.g\./i

describe('the Turkish interface', () => {
  it('addresses the user formally', () => {
    const informal = Object.entries(TURKISH_TRANSLATIONS)
      .filter(([english]) => !SPOKEN_TO_THE_ASSISTANT.test(english))
      .filter(([, turkish]) => INFORMAL.some((pattern) => pattern.test(turkish)))
      .map(([english, turkish]) => `${english} → ${turkish}`)
    expect(informal).toEqual([])
  })

  it('the check catches the forms it is for', () => {
    const caught = (text) => INFORMAL.some((pattern) => pattern.test(text))
    expect(caught('Giriş yaparsan kalır.')).toBe(true)
    expect(caught('Misafir olarak geziyorsun.')).toBe(true)
    expect(caught('Yalnızca sen açabilirsin.')).toBe(true)
    expect(caught('Web siten burada başlıyor')).toBe(true)
    expect(caught('Giriş yaparsanız kalır.')).toBe(false)
    expect(caught('Web siteniz burada başlıyor')).toBe(false)
    expect(caught('Yalnızca siz açabilirsiniz.')).toBe(false)
  })
})
