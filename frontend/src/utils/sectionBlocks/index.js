// The section library: ready-made page sections, grouped by what they do.
// Each section is built twice from one definition — English and Turkish copy
// from the same markup — so the block library can drop a section in the
// language the editor is using.
import { collectTranslations } from '../templateCopy.js'
import { TONES, copy, translator } from './kit.js'
import { BANNER_SECTIONS, FOOTER_SECTIONS, HEADER_SECTIONS, UTILITY_SECTIONS } from './chrome.js'
import { COMPARISON_SECTIONS, COMMERCE_SECTIONS, MENU_SECTIONS, PRICING_SECTIONS } from './commerce.js'
import { BLOG_SECTIONS, EVENT_SECTIONS, FAQ_SECTIONS, MEDIA_SECTIONS, PORTFOLIO_SECTIONS } from './content.js'
import { APP_SECTIONS, CONTACT_SECTIONS, CTA_SECTIONS, NEWSLETTER_SECTIONS } from './conversion.js'
import { ABOUT_SECTIONS, FEATURE_SECTIONS, SERVICE_SECTIONS } from './features.js'
import { PROCESS_SECTIONS, STAT_SECTIONS, TIMELINE_SECTIONS } from './flow.js'
import { HERO_SECTIONS } from './heroes.js'
import { LOGO_SECTIONS, SOCIAL_SECTIONS, TEAM_SECTIONS, TESTIMONIAL_SECTIONS } from './social.js'

// Categories in the order the block library lists them — roughly the order
// they appear on a page. The original section blocks (htmlVariants.js) are
// filed into these too.
export const SECTION_CATEGORIES = [
  { id: 'header', name: copy('Headers', 'Üst menüler') },
  { id: 'banner', name: copy('Banners', 'Bantlar') },
  { id: 'hero', name: copy('Heroes', 'Açılış alanları') },
  { id: 'features', name: copy('Features', 'Özellikler') },
  { id: 'about', name: copy('About', 'Hakkında') },
  { id: 'services', name: copy('Services', 'Hizmetler') },
  { id: 'process', name: copy('Process', 'Süreç') },
  { id: 'timeline', name: copy('Timelines', 'Zaman çizelgeleri') },
  { id: 'stats', name: copy('Stats', 'İstatistikler') },
  { id: 'testimonials', name: copy('Testimonials', 'Müşteri yorumları') },
  { id: 'logos', name: copy('Logo clouds', 'Logo alanları') },
  { id: 'team', name: copy('Team', 'Ekip') },
  { id: 'portfolio', name: copy('Portfolio and gallery', 'Portfolyo ve galeri') },
  { id: 'blog', name: copy('Blog', 'Blog') },
  { id: 'media', name: copy('Video and audio', 'Video ve ses') },
  { id: 'events', name: copy('Events', 'Etkinlikler') },
  { id: 'pricing', name: copy('Pricing', 'Fiyatlandırma') },
  { id: 'commerce', name: copy('Shop', 'Mağaza') },
  { id: 'comparison', name: copy('Comparisons', 'Karşılaştırmalar') },
  { id: 'menu', name: copy('Menus and price lists', 'Menüler ve fiyat listeleri') },
  { id: 'faq', name: copy('FAQ', 'SSS') },
  { id: 'cta', name: copy('Calls to action', 'Eylem çağrıları') },
  { id: 'newsletter', name: copy('Newsletter', 'Bülten') },
  { id: 'contact', name: copy('Contact', 'İletişim') },
  { id: 'social', name: copy('Social media', 'Sosyal medya') },
  { id: 'apps', name: copy('Apps and integrations', 'Uygulamalar ve entegrasyonlar') },
  { id: 'footer', name: copy('Footers', 'Alt bilgiler') },
  { id: 'utility', name: copy('Utility pages', 'Yardımcı sayfalar') },
]

const DEFINITIONS = [
  ...HEADER_SECTIONS,
  ...BANNER_SECTIONS,
  ...HERO_SECTIONS,
  ...FEATURE_SECTIONS,
  ...ABOUT_SECTIONS,
  ...SERVICE_SECTIONS,
  ...PROCESS_SECTIONS,
  ...TIMELINE_SECTIONS,
  ...STAT_SECTIONS,
  ...TESTIMONIAL_SECTIONS,
  ...LOGO_SECTIONS,
  ...TEAM_SECTIONS,
  ...PORTFOLIO_SECTIONS,
  ...BLOG_SECTIONS,
  ...MEDIA_SECTIONS,
  ...EVENT_SECTIONS,
  ...PRICING_SECTIONS,
  ...COMMERCE_SECTIONS,
  ...COMPARISON_SECTIONS,
  ...MENU_SECTIONS,
  ...FAQ_SECTIONS,
  ...CTA_SECTIONS,
  ...NEWSLETTER_SECTIONS,
  ...CONTACT_SECTIONS,
  ...SOCIAL_SECTIONS,
  ...APP_SECTIONS,
  ...FOOTER_SECTIONS,
  ...UTILITY_SECTIONS,
]

const EN = translator('en')
const TR = translator('tr')

export const SECTION_BLOCKS = DEFINITIONS.map((definition) => {
  const tone = TONES[definition.tone]
  return {
    id: definition.id,
    category: definition.category,
    label: definition.label.en,
    desc: definition.desc.en,
    size: definition.size,
    dark: tone.dark,
    html: definition.render(EN, tone).trim(),
    htmlTr: definition.render(TR, tone).trim(),
  }
})

export const SECTION_TRANSLATIONS = collectTranslations([
  SECTION_CATEGORIES,
  DEFINITIONS.map((definition) => [definition.label, definition.desc]),
])
