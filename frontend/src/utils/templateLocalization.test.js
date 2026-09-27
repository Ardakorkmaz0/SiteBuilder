import { describe, expect, it } from 'vitest'
import { localizeTemplateHtml } from './templateLocalization.js'
import { VERTICAL_CATEGORY_SEEDS, VERTICAL_TEMPLATE_TRANSLATIONS } from './templateCatalogData.js'
import { TEMPLATE_LIBRARY } from './templateLibrary.js'

describe('template localization', () => {
  const sample = '<!doctype html><html><body><nav aria-label="Open menu">Home</nav><h1>About</h1><button title="Get in touch">Get in touch</button><script>const label = "Home"</script></body></html>'

  it('sets Turkish document language and translates visible starter copy', () => {
    const html = localizeTemplateHtml(sample, 'tr')
    expect(html).toContain('lang="tr"')
    expect(html).toContain('Ana Sayfa')
    expect(html).toContain('Hakkında')
    expect(html).toContain('İletişime geçin')
    expect(html).toContain('aria-label="Menüyü aç"')
    expect(html).toContain('title="İletişime geçin"')
    expect(html).toContain('const label = "Home"')
  })

  it('keeps English copy while setting the English document language', () => {
    const html = localizeTemplateHtml(sample, 'en')
    expect(html).toContain('lang="en"')
    expect(html).toContain('Get in touch')
  })

  it('meaningfully translates every template category and switches back to English', () => {
    const expectedTurkish = {
      cv: 'Kıdemli Ürün Tasarımcısı',
      portfolio: 'Seçili çalışmalar',
      landing: 'Gerçekten ihtiyacınız olan her şey',
      business: 'Neler yapıyoruz',
      cafe: 'İyi kahve.',
      photo: 'Son kareler',
      blog: 'Atölyeden notlar.',
      event: 'Evleniyoruz.',
      shop: 'Çok satanlar',
      links: 'Son podcast bölümü',
      wellness: 'Daha güçlü bir rutine hazır mısınız?',
      ...Object.fromEntries(
        // A second-wave starter opens with its own hero, layered over the
        // category profile.
        VERTICAL_CATEGORY_SEEDS.map((category) => [category.id, (category.variants[0].hero || category.profile).title.tr]),
      ),
    }

    for (const category of TEMPLATE_LIBRARY) {
      const source = category.variants[0].build('Example')
      const turkish = localizeTemplateHtml(source, 'tr')
      const english = localizeTemplateHtml(source, 'en')

      expect(turkish, category.id).toContain(expectedTurkish[category.id])
      expect(turkish, category.id).not.toBe(english)
      expect(english, category.id).toContain('lang="en"')
    }
  })

  it('keeps every Fitness & Wellness starter meaningfully localised', () => {
    const wellness = TEMPLATE_LIBRARY.find((category) => category.id === 'wellness')
    const markers = {
      'wellness-iron-club': 'Daha güçlü bir rutine hazır mısınız?',
      'wellness-yoga-bloom': 'Matınız sizi bekliyor',
      'wellness-pilates-house': 'İlk seansla başlayın',
      'wellness-personal-coach': 'Önümüzdeki on iki haftayı değerlendirin',
      'wellness-run-collective': 'Başlangıç çizgisinde görüşürüz',
      'wellness-retreat': 'Masadaki yerinizi alın',
      'wellness-nutrition-studio': 'Tek bir görüşmeyle başlayın',
      'wellness-calm-practice': 'İlk dersiniz basit olabilir',
      'wellness-martial-arts': 'Mata adım at',
      'wellness-recovery-studio': 'Haftanıza bir reset verin',
    }

    for (const template of wellness.variants) {
      const turkish = localizeTemplateHtml(template.build('Example'), 'tr')
      expect(turkish, template.id).toContain(markers[template.id])
    }
  })

  it('localises every text item in the vertical template catalog', () => {
    const escapeHtml = (value) => String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')

    const source = `<!doctype html><html><body>${Object.keys(VERTICAL_TEMPLATE_TRANSLATIONS)
      .map((text) => `<span>${escapeHtml(text)}</span>`)
      .join('')}</body></html>`
    const localized = localizeTemplateHtml(source, 'tr')
    const localizedText = new DOMParser().parseFromString(localized, 'text/html').body.textContent

    for (const [english, turkish] of Object.entries(VERTICAL_TEMPLATE_TRANSLATIONS)) {
      expect(localizedText, english).toContain(turkish)
    }
  })
})

describe('the bilingual catalogue', () => {
  // One English phrase can only have one Turkish rendering: the localiser maps
  // text by exact match, so a second meaning would silently overwrite the first
  // in every template that uses the phrase.
  it('never gives one English phrase two Turkish translations', () => {
    const seen = new Map()
    const conflicts = []
    const walk = (value, where) => {
      if (Array.isArray(value)) return value.forEach((entry) => walk(entry, where))
      if (!value || typeof value !== 'object') return
      if (typeof value.en === 'string' && typeof value.tr === 'string') {
        const earlier = seen.get(value.en)
        if (earlier && earlier.tr !== value.tr) conflicts.push(`${value.en}: ${earlier.where} vs ${where}`)
        else seen.set(value.en, { tr: value.tr, where })
        return
      }
      Object.values(value).forEach((entry) => walk(entry, where))
    }
    VERTICAL_CATEGORY_SEEDS.forEach((seed) => walk(seed, seed.id))
    expect(conflicts).toEqual([])
  })

  // The localiser translates whole text nodes. A builder that glues two
  // catalogue strings into one node (a joined list, say) ships English into a
  // Turkish page; this catches it for every vertical starter.
  it('leaves no catalogue text in English on a Turkish page', () => {
    const untranslated = []
    const vertical = new Set(VERTICAL_CATEGORY_SEEDS.map((seed) => seed.id))
    for (const category of TEMPLATE_LIBRARY.filter((entry) => vertical.has(entry.id))) {
      for (const template of category.variants) {
        const turkish = localizeTemplateHtml(template.build('Example'), 'tr')
        const doc = new DOMParser().parseFromString(turkish, 'text/html')
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (node.parentElement?.closest('style,script')) continue
          // A node joined from several strings ("a · b · c") is checked part
          // by part, which is exactly how such a slip shows up.
          for (const part of node.nodeValue.split(/\s[·|]\s/)) {
            const text = part.trim()
            const turkishText = VERTICAL_TEMPLATE_TRANSLATIONS[text]
            if (turkishText && turkishText !== text) untranslated.push(`${template.id}: ${text}`)
          }
        }
        for (const part of doc.title.split(/\s[·|—]\s/)) {
          const text = part.trim()
          const turkishText = VERTICAL_TEMPLATE_TRANSLATIONS[text]
          if (turkishText && turkishText !== text) untranslated.push(`${template.id} <title>: ${text}`)
        }
      }
    }
    expect(untranslated).toEqual([])
  }, 120000)
})
