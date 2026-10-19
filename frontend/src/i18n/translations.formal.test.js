import { describe, expect, it } from 'vitest'
import { TURKISH_TRANSLATIONS } from './translations.js'

// The Turkish interface addresses the user formally ("siz"), as AGENTS.md
// says. Dozens of strings had drifted to "sen": "Alan adını gir", "projeni",
// "Giriş yaparsan kalır". These forms only ever mean "you" in the singular.
// Word edges are written as (?<!\p{L}) and (?!\p{L}): JavaScript's \b only
// knows ASCII letters, so it never matched before "Ç" in "Çalışmanı".
const INFORMAL = [
  /(?<!\p{L})(sen|senin|sana|seni|sende|senden|seninle)(?!\p{L})/iu,
  /\p{L}+(abilirsin|ebilirsin|ıyorsun|iyorsun|uyorsun|üyorsun|malısın|melisin|acaksın|eceksin)(?!\p{L})/u,
  // "if you …": the tense or mood before it, so "Korsan" (pirate) is no hit.
  /\p{L}+(ar|er|ır|ir|ur|ür|az|ez|yor|ak|ek|y)(san|sen)(?!\p{L})/u,
  // "that you …": yaptığın, eklediğin, olduğun.
  /\p{L}+[dt][ıiuü]ğ[ıiuü]n(?!\p{L})/u,
  // Only words that cannot also be something else: "hesabın" is just as
  // often "of the account", "sayfaların" "of the pages".
  /(?<!\p{L})(geldin|siten|sitende|projen|projeni|çalışman|çalışmanı|teman|sayfanı|ziyaretçini|aramanla)(?!\p{L})/iu,
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
    expect(caught('Çalışmanı kaydet, hazır olduğunda yayınla')).toBe(true)
    expect(caught('Çalışman burada tutulur')).toBe(true)
    expect(caught('Eklediğin bir hesapla giriş yapmış olmaları gerekir.')).toBe(true)
    expect(caught('Devam etmek istiyorsan kaydet.')).toBe(true)
    expect(caught('Giriş yaparsanız kalır.')).toBe(false)
    expect(caught('Web siteniz burada başlıyor')).toBe(false)
    expect(caught('Yalnızca siz açabilirsiniz.')).toBe(false)
    expect(caught('Korsan yazılım kullanmayın.')).toBe(false)
    expect(caught('Düğün ve etkinlik sayfaları')).toBe(false)
    expect(caught('Topluluğun yayınladığı siteleri keşfedin.')).toBe(false)
    expect(caught('Eklediğiniz bir hesapla giriş yapmış olmaları gerekir.')).toBe(false)
  })
})
