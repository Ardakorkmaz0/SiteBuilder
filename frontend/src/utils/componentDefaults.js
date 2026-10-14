// The text a component starts with, in the editor's language. The registry's
// defaults are English; a Turkish user who dropped a navigation bar got "My
// Personal Site · Home · About · Contact", tabs said "Tab one", and every
// component the AI added carried English copy until it was rewritten. The
// preset text has always followed the language (componentPresets.js); this is
// the same for the defaults underneath it.
import { registry } from '../components/registry.jsx'
import { detectInitialLanguage } from '../i18n/language.js'

const OPTIONS_TR = 'Seçenek 1\nSeçenek 2\nSeçenek 3'

export const DEFAULT_PROPS_TR = {
  navbar: {
    brand: 'Kişisel Sitem',
    links: [
      { label: 'Ana sayfa', href: '#' },
      { label: 'Hakkımda', href: '#about' },
      { label: 'İletişim', href: '#contact' },
    ],
  },
  heading: { text: 'Siteme hoş geldiniz' },
  text: { text: 'Ziyaretçilere kim olduğunuzu ve ne yaptığınızı bir iki cümleyle anlatın.' },
  button: { text: 'Bana ulaşın' },
  linkbutton: { text: "GitHub'ımı ziyaret edin" },
  section: {
    heading: 'Bölüm başlığı',
    text: 'Bu bölümün neyle ilgili olduğunu tanıtan kısa bir paragraf.',
  },
  card: { title: 'Kart başlığı', text: 'Bu kart için açıklayıcı bir metin.' },
  list: { text: 'İlk öğe\nİkinci öğe\nÜçüncü öğe' },
  quote: {
    text: 'Tasarım yalnızca neye benzediği ve nasıl hissettirdiği değildir. Tasarım, nasıl çalıştığıdır.',
  },
  badge: { text: 'Yeni' },
  input: { label: 'E-posta', placeholder: 'siz@ornek.com', options: OPTIONS_TR },
  select: { label: 'Bir seçenek seçin', options: OPTIONS_TR, placeholder: 'Seçin…' },
  themeToggle: { label: 'Koyu mod' },
  alert: { text: 'Uygun — tüm kontroller geçti.' },
  accordion: {
    title: 'Gelişmiş ayarlar',
    text: 'Başlığa tıklanınca açılan içerik — JavaScript gerekmez.',
  },
  tabs: {
    tabs: [
      { id: 't1', label: 'Birinci sekme' },
      { id: 't2', label: 'İkinci sekme' },
      { id: 't3', label: 'Üçüncü sekme' },
    ],
  },
  html: {
    code: '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#eef2ff;color:#3730a3;font:600 16px system-ui">HTML, CSS ve JS kodunuz buraya</div>',
  },
}

// A fresh copy of the type's starting props in `language`.
export function defaultPropsFor(type, language = detectInitialLanguage()) {
  const base = registry[type]?.defaultProps || {}
  const local = language === 'tr' ? DEFAULT_PROPS_TR[type] : null
  return structuredClone(local ? { ...base, ...local } : base)
}
