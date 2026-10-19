import { describe, expect, it } from 'vitest'
import { localizeTemplateHtml } from './templateLocalization.js'
import { VERTICAL_CATEGORY_SEEDS, VERTICAL_TEMPLATE_TRANSLATIONS } from './templateCatalogData.js'
import { TEMPLATE_LIBRARY } from './templateLibrary.js'
import { resumeTemplate } from './htmlTemplates.js'

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

  it.each([
    ['resume', resumeTemplate],
    ...TEMPLATE_LIBRARY.find((category) => category.id === 'cv').variants.map((template) => [template.id, template.build]),
  ])('translates the ongoing employment date in the %s CV starter', (id, build) => {
    const source = build('Example')
    const turkish = new DOMParser().parseFromString(localizeTemplateHtml(source, 'tr'), 'text/html')
    const english = new DOMParser().parseFromString(localizeTemplateHtml(source, 'en'), 'text/html')

    expect(turkish.body.textContent, id).toContain('2022 — Günümüz')
    expect(turkish.body.textContent).not.toContain('Present')
    expect(english.body.textContent).toContain('2022 — Present')
    expect(english.body.textContent).not.toContain('Günümüz')
  })

  it('localizes the known CV date placeholder without changing links, identifiers or executable text', () => {
    const source = '<!doctype html><html><head><style>#Present::after { content: "2022 — Present"; }</style></head><body><a id="Present" href="/2022-Present">2022 — Present</a><p>Present Studio</p><p>2021 — Present</p><script>const date = "2022 — Present";</script><pre>2022 — Present</pre><code>2022 — Present</code></body></html>'
    const doc = new DOMParser().parseFromString(localizeTemplateHtml(source, 'tr'), 'text/html')

    expect(doc.querySelector('a').textContent).toBe('2022 — Günümüz')
    expect(doc.querySelector('a').id).toBe('Present')
    expect(doc.querySelector('a').getAttribute('href')).toBe('/2022-Present')
    expect([...doc.querySelectorAll('p')].map((paragraph) => paragraph.textContent)).toEqual(['Present Studio', '2021 — Present'])
    expect(doc.querySelector('style').textContent).toBe('#Present::after { content: "2022 — Present"; }')
    expect(doc.querySelector('script').textContent).toBe('const date = "2022 — Present";')
    expect(doc.querySelector('pre').textContent).toBe('2022 — Present')
    expect(doc.querySelector('code').textContent).toBe('2022 — Present')
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

// Every template, rendered in Turkish, next to its English render: text that
// is word-for-word the same in both was never translated. A sentence that
// wraps over source lines, a search box's "Section title…" and a feature
// list's "✓ Feature" used to slip through, and so did a few whole paragraphs.
describe('a Turkish template', () => {
  // Names stay names: products, a coffee, an address book.
  const NAMES = new Set([
    'HTML & CSS', 'hello@example.com', 'shop@example.com', 'linkedin.com/in/example',
    'Atlas Dashboard', 'Mono E-commerce', 'Fieldnotes App', 'Beacon Identity',
    'Pulse Landing', 'Orbit Design System', 'Flat white',
  ])

  function texts(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('script, style, noscript, code, pre').forEach((element) => element.remove())
    const out = []
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) out.push(node.nodeValue.replace(/\s+/g, ' ').trim())
    doc.body.querySelectorAll('[placeholder], [aria-label], [alt], [title]').forEach((element) => {
      for (const attribute of ['placeholder', 'aria-label', 'alt', 'title']) {
        if (element.hasAttribute(attribute)) out.push(element.getAttribute(attribute))
      }
    })
    out.push(doc.title)
    return out
  }

  it('has no English left in it', () => {
    const untranslated = new Set()
    for (const category of TEMPLATE_LIBRARY) {
      for (const template of category.variants) {
        const source = template.build('Zeytin')
        const english = texts(localizeTemplateHtml(source, 'en'))
        const turkish = texts(localizeTemplateHtml(source, 'tr'))
        english.forEach((text, index) => {
          const words = text.replace(/Zeytin/g, '').match(/[A-Za-z]{3,}/g) || []
          if (text === turkish[index] && words.length >= 2 && !NAMES.has(text)) untranslated.add(text)
        })
      }
    }
    expect([...untranslated]).toEqual([])
  // 500 templates, each parsed twice: slow beside the parallel suite.
  }, 120000)
})
