// Things to look at and read: work, articles, answers, media and dates.
import {
  art, band, body, btn, buttons, card, chip, copy, eyebrow, grid, h2, h3, lead, photo, section,
} from './kit.js'

const head = (p, eyebrowText, title, text, align = 'left') => `
  ${eyebrowText ? eyebrow(p, eyebrowText, align) : ''}
  ${h2(p, title, align === 'center' ? 'margin-left:auto;margin-right:auto;max-width:22ch;' : 'max-width:22ch;')}
  ${text ? lead(p, text, align === 'center' ? 'margin-left:auto;margin-right:auto;margin-bottom:42px;' : 'margin-bottom:42px;') : ''}`

// A heading row with a "see all" link on the right.
const headRow = (p, eyebrowText, title, link) => `
  <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:16px;margin-bottom:30px;">
    <div>${eyebrowText ? eyebrow(p, eyebrowText) : ''}${h2(p, title, 'margin:0;max-width:22ch;')}</div>
    <a href="#" style="color:${p.accentInk};font-weight:700;text-decoration:none;">${link}</a>
  </div>`

const project = (p, seed, title, tags, ratio = '4/3') => (
  `<a href="#" style="display:block;text-decoration:none;text-align:left;">${photo(seed, 800, 600, { ratio, radius: 18, extra: 'margin-bottom:14px;' })}${h3(p, title, 'margin-bottom:4px;')}<span style="color:${p.muted};font-size:14.5px;">${tags}</span></a>`
)

const post = (p, seed, tag, title, excerpt, meta) => (
  `<article style="display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:${p.card};border:1px solid ${p.line};text-align:left;">${photo(seed, 720, 460, { radius: 0 })}<div style="padding:22px;display:flex;flex-direction:column;gap:10px;flex:1;">${chip(p, tag, 'align-self:flex-start;')}${h3(p, title, 'margin:0;font-size:19px;')}${body(p, excerpt)}<span style="margin-top:auto;padding-top:8px;color:${p.muted};font-size:13.5px;">${meta}</span></div></article>`
)

const faqItem = (p, question, answer, open = false, extra = '') => (
  `<details${open ? ' open' : ''} style="border-bottom:1px solid ${p.line};padding:18px 0;${extra}"><summary style="cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:16px;font-weight:700;font-size:17px;color:${p.ink};">${question}<span aria-hidden="true" style="color:${p.accentInk};font-weight:800;">+</span></summary><p style="margin:12px 0 0;color:${p.muted};line-height:1.65;font-size:15.5px;">${answer}</p></details>`
)

const dateBlock = (p, day, month, solid = false) => (
  `<div style="flex-shrink:0;display:grid;place-items:center;width:68px;height:72px;border-radius:14px;${solid ? `background:${p.accent};color:${p.onAccent};` : `background:${p.accentSoft};color:${p.accentInk};`}text-align:center;line-height:1.05;"><b style="font-size:26px;">${day}</b><span style="font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">${month}</span></div>`
)

export const PORTFOLIO_SECTIONS = [
  section('portfolio-grid', 'portfolio', copy('Project grid', 'Proje ızgarası'), copy('Six projects with titles and tags', 'Başlık ve etiketlerle altı proje'), 'light', (T, p) => band(p, `
    ${headRow(p, T('Selected work', 'Seçilmiş işler'), T('Projects we are proud of.', 'Gurur duyduğumuz projeler.'), T('All projects →', 'Tüm projeler →'))}
    ${grid(280, [
      project(p, 'work-cafe', T('Harbour Café', 'Liman Kafe'), T('Branding · Website', 'Marka · Web sitesi')),
      project(p, 'work-app', T('Pulse fitness app', 'Pulse fitness uygulaması'), T('Product design', 'Ürün tasarımı')),
      project(p, 'work-book', T('Atlas of small towns', 'Küçük kasabalar atlası'), T('Editorial', 'Editoryal')),
      project(p, 'work-shop', T('Linen & Co. shop', 'Linen & Co. mağazası'), T('E-commerce', 'E-ticaret')),
      project(p, 'work-museum', T('City museum signage', 'Şehir müzesi yönlendirme'), T('Wayfinding', 'Yön bulma')),
      project(p, 'work-festival', T('Summer sound festival', 'Yaz ses festivali'), T('Campaign', 'Kampanya')),
    ], 26)}`), [1000, 900]),

  section('portfolio-masonry', 'portfolio', copy('Masonry gallery', 'Duvar galeri'), copy('Photos of different heights in columns', 'Sütunlarda farklı yükseklikte fotoğraflar'), 'soft', (T, p) => band(p, `
    ${head(p, T('Gallery', 'Galeri'), T('A look around.', 'Şöyle bir göz atın.'), '', 'center')}
    <div style="columns:3 220px;column-gap:14px;">${[['m-1', 600, 800], ['m-2', 600, 450], ['m-3', 600, 700], ['m-4', 600, 600], ['m-5', 600, 820], ['m-6', 600, 420], ['m-7', 600, 640], ['m-8', 600, 500]].map(([seed, w, h]) => photo(seed, w, h, { radius: 14, extra: 'margin-bottom:14px;break-inside:avoid;' })).join('')}</div>`, { align: 'center' }), [1000, 1280]),

  section('portfolio-featured-case', 'portfolio', copy('Featured case study', 'Öne çıkan vaka'), copy('One large project with results and a link', 'Sonuçları ve bağlantısıyla tek büyük proje'), 'dark', (T, p) => band(p, grid(320, [
    photo('case-hero', 900, 700, { radius: 22 }),
    `<div>
      ${chip(p, T('Case study', 'Vaka çalışması'))}
      ${h2(p, T('A new home for a 90-year-old bookshop.', '90 yıllık bir kitapçıya yeni bir yuva.'), 'margin-top:16px;')}
      ${body(p, T('We rebuilt the shop’s website, catalogue and newsletter so regulars could order from home and new readers could find them.', 'Müdavimlerin evden sipariş verebilmesi ve yeni okurların onları bulabilmesi için dükkânın web sitesini, kataloğunu ve bültenini yeniden kurduk.'), 'font-size:17px;margin-bottom:24px;')}
      <div style="display:flex;flex-wrap:wrap;gap:30px;margin-bottom:28px;">${[['+180%', T('online orders', 'çevrimiçi sipariş')], ['4 wk', T('from brief to launch', 'brieften yayına')]].map(([n, l]) => `<div><b style="display:block;font-size:32px;color:${p.accentInk};letter-spacing:-0.02em;">${n}</b><span style="color:${p.muted};">${l}</span></div>`).join('')}</div>
      ${btn(p, T('Read the case study', 'Vaka çalışmasını okuyun'))}
    </div>`,
  ], 46, 'align-items:center;')), [1000, 540]),

  section('portfolio-filter-tabs', 'portfolio', copy('Filterable work', 'Filtrelenebilir işler'), copy('Category tabs above a three-column grid', 'Üç sütunlu ızgaranın üstünde kategori sekmeleri'), 'light', (T, p) => band(p, `
    ${head(p, '', T('Our work', 'İşlerimiz'), '', 'center')}
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-bottom:30px;">${[T('All', 'Tümü'), T('Branding', 'Marka'), T('Web', 'Web'), T('Print', 'Basılı'), T('Motion', 'Hareketli')].map((label, i) => `<a href="#" style="padding:9px 18px;border-radius:999px;font-weight:700;font-size:14.5px;text-decoration:none;${i === 0 ? `background:${p.ink};color:${p.bg};` : `border:1px solid ${p.line};color:${p.ink};`}">${label}</a>`).join('')}</div>
    ${grid(260, ['tab-1', 'tab-2', 'tab-3', 'tab-4', 'tab-5', 'tab-6'].map((seed, i) => `<a href="#" style="position:relative;display:block;border-radius:16px;overflow:hidden;">${photo(seed, 600, 600, { radius: 0, ratio: '1/1' })}<span style="position:absolute;left:12px;bottom:12px;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,0.92);color:#0f172a;font-weight:700;font-size:13.5px;">${[T('Branding', 'Marka'), T('Web', 'Web'), T('Print', 'Basılı'), T('Motion', 'Hareketli'), T('Web', 'Web'), T('Branding', 'Marka')][i]}</span></a>`), 14)}`, { align: 'center' }), [1000, 920]),

  section('portfolio-alternating', 'portfolio', copy('Alternating projects', 'Dönüşümlü projeler'), copy('Projects in wide rows, image left then right', 'Görsel sırayla solda ve sağda, geniş satırlarda projeler'), 'warm', (T, p) => band(p, `
    ${head(p, T('Portfolio', 'Portfolyo'), T('Three recent projects.', 'Son üç proje.'), '')}
    <div style="display:grid;gap:48px;">${[
      ['alt-1', T('Olive grove guest house', 'Zeytinlik pansiyonu'), T('A stone farmhouse turned into six calm rooms.', 'Altı sakin odaya dönüştürülen bir taş çiftlik evi.')],
      ['alt-2', T('Riverside apartments', 'Nehir kenarı daireler'), T('Forty homes around a shared garden.', 'Ortak bir bahçenin etrafında kırk konut.')],
      ['alt-3', T('Neighbourhood library', 'Mahalle kütüphanesi'), T('Light, timber and a reading room for kids.', 'Işık, ahşap ve çocuklar için bir okuma odası.')],
    ].map(([seed, title, text], i) => `<div style="display:flex;flex-wrap:wrap;${i % 2 ? 'flex-direction:row-reverse;' : ''}gap:32px;align-items:center;"><div style="flex:1 1 320px;">${photo(seed, 800, 560, { radius: 20 })}</div><div style="flex:1 1 280px;"><span style="color:${p.accentInk};font-weight:800;">0${i + 1}</span>${h3(p, title, 'font-size:clamp(22px,2.6vw,28px);margin-top:8px;')}${body(p, text, 'font-size:17px;margin-bottom:18px;')}<a href="#" style="color:${p.accentInk};font-weight:700;text-decoration:none;">${T('View project →', 'Projeyi görün →')}</a></div></div>`).join('')}</div>`), [1000, 1350]),

  section('portfolio-bento', 'portfolio', copy('Bento gallery', 'Bento galeri'), copy('One large photo beside four small ones', 'Dört küçük fotoğrafın yanında bir büyük fotoğraf'), 'noir', (T, p) => band(p, `
    ${headRow(p, T('Recent', 'Son işler'), T('Fresh from the studio.', 'Stüdyodan taze.'), T('See the archive →', 'Arşive göz atın →'))}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px;">
      ${photo('bento-main', 900, 900, { radius: 18, ratio: '1/1' })}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${['bento-a', 'bento-b', 'bento-c', 'bento-d'].map((seed) => photo(seed, 400, 400, { radius: 14, ratio: '1/1' })).join('')}</div>
    </div>`), [1000, 730]),

  section('portfolio-numbered-list', 'portfolio', copy('Project index', 'Proje dizini'), copy('A numbered list of projects with year and type', 'Yıl ve türüyle numaralı proje listesi'), 'light', (T, p) => band(p, `
    ${head(p, T('Index', 'Dizin'), T('Everything we have made.', 'Yaptığımız her şey.'), '')}
    <div>${[
      [T('North Sea ferry terminal', 'Kuzey Denizi feribot terminali'), T('Architecture', 'Mimari'), '2025'],
      [T('Maple coffee roasters', 'Maple kahve kavurucuları'), T('Identity', 'Kimlik'), '2025'],
      [T('Open data portal', 'Açık veri portalı'), T('Digital', 'Dijital'), '2024'],
      [T('Winter lights festival', 'Kış ışıkları festivali'), T('Campaign', 'Kampanya'), '2024'],
      [T('Clinic wayfinding', 'Klinik yön bulma'), T('Signage', 'Yönlendirme'), '2023'],
    ].map(([title, type, year], i) => `<a href="#" style="display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:16px;align-items:baseline;padding:20px 0;border-top:1px solid ${p.line};text-decoration:none;"><span style="color:${p.muted};font-weight:700;">0${i + 1}</span><span style="font-size:clamp(19px,2.4vw,26px);font-weight:700;color:${p.ink};">${title} <small style="display:inline-block;font-size:14px;font-weight:600;color:${p.muted};">· ${type}</small></span><span style="color:${p.muted};">${year}</span></a>`).join('')}</div>`), [1000, 590]),

  section('portfolio-before-after', 'portfolio', copy('Before and after', 'Önce ve sonra'), copy('Two photos side by side with labels', 'Etiketli yan yana iki fotoğraf'), 'forest', (T, p) => band(p, `
    ${head(p, T('Transformation', 'Dönüşüm'), T('The same garden, one season apart.', 'Aynı bahçe, bir mevsim arayla.'), '', 'center')}
    ${grid(300, [[T('Before', 'Önce'), 'garden-before'], [T('After', 'Sonra'), 'garden-after']].map(([label, seed], i) => `<div style="position:relative;">${photo(seed, 800, 600, { radius: 20 })}<span style="position:absolute;top:14px;left:14px;padding:6px 14px;border-radius:999px;font-weight:800;font-size:14px;${i ? `background:${p.accent};color:${p.onAccent};` : 'background:rgba(255,255,255,0.92);color:#0f172a;'}">${label}</span></div>`), 16)}`, { align: 'center' }), [1000, 640]),

  section('portfolio-carousel', 'portfolio', copy('Project carousel', 'Proje karuseli'), copy('Wide cards that scroll sideways', 'Yana kayan geniş kartlar'), 'violet', (T, p) => band(p, `
    ${headRow(p, T('Showcase', 'Vitrin'), T('Made with our builder.', 'Site oluşturucumuzla yapıldı.'), T('Submit your site →', 'Sitenizi gönderin →'))}
    <div style="display:flex;gap:18px;overflow-x:auto;padding-bottom:14px;scroll-snap-type:x mandatory;">${[
      ['car-1', T('Bloom florist', 'Bloom çiçekçi')],
      ['car-2', T('Tidewater surf school', 'Tidewater sörf okulu')],
      ['car-3', T('Kaya law office', 'Kaya hukuk bürosu')],
      ['car-4', T('Nomad coffee cart', 'Nomad kahve arabası')],
    ].map(([seed, title]) => `<a href="#" style="flex:0 0 min(84%,420px);scroll-snap-align:start;text-decoration:none;">${photo(seed, 840, 560, { radius: 18, extra: 'margin-bottom:12px;' })}<b style="color:${p.ink};font-size:17px;">${title}</b></a>`).join('')}</div>`), [1000, 630]),

  section('portfolio-awards-strip', 'portfolio', copy('Work with awards', 'Ödüllü işler'), copy('Three projects each with an award badge', 'Her biri ödül rozetli üç proje'), 'ocean', (T, p) => band(p, `
    ${head(p, T('Recognition', 'Takdir'), T('Work that got noticed.', 'Dikkat çeken işler.'), '', 'center')}
    ${grid(260, [
      ['aw-1', T('Coastal trail maps', 'Kıyı yürüyüş haritaları'), T('Gold · Print design', 'Altın · Basılı tasarım')],
      ['aw-2', T('Rain museum app', 'Yağmur müzesi uygulaması'), T('Best mobile experience', 'En iyi mobil deneyim')],
      ['aw-3', T('Seed bank identity', 'Tohum bankası kimliği'), T('Shortlisted · Branding', 'Kısa liste · Marka')],
    ].map(([seed, title, award]) => card(p, `${photo(seed, 700, 500, { radius: 12, extra: 'margin-bottom:16px;' })}${chip(p, `★ ${award}`, 'margin-bottom:10px;')}${h3(p, title, 'margin:0;')}`, 'padding:14px 14px 20px;text-align:left;')), 18)}`, { align: 'center' }), [1000, 580]),
]

export const BLOG_SECTIONS = [
  section('blog-three-posts', 'blog', copy('Latest posts', 'Son yazılar'), copy('Three article cards with image, tag and date', 'Görsel, etiket ve tarihli üç yazı kartı'), 'soft', (T, p) => band(p, `
    ${headRow(p, T('Journal', 'Günlük'), T('Notes, news and how-tos.', 'Notlar, haberler ve nasıl yapılır.'), T('All articles →', 'Tüm yazılar →'))}
    ${grid(270, [
      post(p, 'post-1', T('Guide', 'Rehber'), T('How to write a homepage in one afternoon', 'Bir öğleden sonrada ana sayfa nasıl yazılır'), T('A simple outline that works for almost any small business.', 'Neredeyse her küçük işletmeye uyan basit bir taslak.'), T('12 May · 6 min read', '12 Mayıs · 6 dk okuma')),
      post(p, 'post-2', T('News', 'Haber'), T('Our new booking calendar is here', 'Yeni rezervasyon takvimimiz yayında'), T('Take deposits, send reminders and sync with your phone.', 'Kapora alın, hatırlatma gönderin ve telefonunuzla eşitleyin.'), T('3 May · 3 min read', '3 Mayıs · 3 dk okuma')),
      post(p, 'post-3', T('Story', 'Hikâye'), T('From market stall to three shops', 'Pazar tezgâhından üç dükkâna'), T('What one baker learned about growing slowly.', 'Bir fırıncının yavaş büyümek hakkında öğrendikleri.'), T('28 Apr · 8 min read', '28 Nis · 8 dk okuma')),
    ], 20)}`), [1000, 720]),

  section('blog-featured-list', 'blog', copy('Featured post and list', 'Öne çıkan yazı ve liste'), copy('One big story beside a list of recent posts', 'Son yazılar listesinin yanında büyük bir hikâye'), 'light', (T, p) => band(p, grid(320, [
    `<a href="#" style="display:block;text-decoration:none;">${photo('feat-post', 900, 600, { radius: 20, extra: 'margin-bottom:18px;' })}${chip(p, T('Featured', 'Öne çıkan'), 'margin-bottom:12px;')}${h2(p, T('The quiet return of the neighbourhood shop.', 'Mahalle dükkânının sessiz dönüşü.'), 'font-size:clamp(24px,3vw,32px);')}${body(p, T('Why people are walking to buy bread again, and what it means for small businesses.', 'İnsanlar neden yeniden yürüyerek ekmek almaya gidiyor ve bu küçük işletmeler için ne anlama geliyor.'), 'font-size:16.5px;')}</a>`,
    `<div>${[
      [T('Five mistakes on pricing pages', 'Fiyat sayfalarında beş hata'), T('9 min', '9 dk')],
      [T('Photographing products with a phone', 'Telefonla ürün fotoğrafı çekmek'), T('7 min', '7 dk')],
      [T('What to put in a welcome email', 'Hoş geldin e-postasına ne yazılır'), T('4 min', '4 dk')],
      [T('A calmer way to plan your week', 'Haftanızı planlamanın daha sakin yolu'), T('5 min', '5 dk')],
    ].map(([title, time], i) => `<a href="#" style="display:flex;gap:16px;align-items:center;padding:16px 0;${i ? `border-top:1px solid ${p.line};` : ''}text-decoration:none;"><div style="width:92px;flex-shrink:0;">${photo(`side-${i}`, 200, 200, { radius: 12, ratio: '1/1' })}</div><div><b style="display:block;color:${p.ink};font-size:16px;line-height:1.35;margin-bottom:4px;">${title}</b><span style="color:${p.muted};font-size:13.5px;">${time}</span></div></a>`).join('')}</div>`,
  ], 40, 'align-items:start;')), [1000, 660]),

  section('blog-text-list', 'blog', copy('Text-only article list', 'Yalnızca metin yazı listesi'), copy('Dates, titles and excerpts without images', 'Görselsiz tarih, başlık ve özetler'), 'warm', (T, p) => band(p, `
    ${head(p, T('Writing', 'Yazılar'), T('Essays and notes.', 'Denemeler ve notlar.'), '')}
    <div>${[
      ['2025-06-02', T('June 2, 2025', '2 Haziran 2025'), T('On doing fewer things, better', 'Daha az şeyi daha iyi yapmak üzerine'), T('A year of saying no, and what it made room for.', 'Hayır demekle geçen bir yıl ve açtığı alan.')],
      ['2025-04-18', T('April 18, 2025', '18 Nisan 2025'), T('Letters from the workshop', 'Atölyeden mektuplar'), T('Tools, mistakes and the chair that took six tries.', 'Aletler, hatalar ve altı denemede biten sandalye.')],
      ['2025-02-09', T('February 9, 2025', '9 Şubat 2025'), T('Why we still print a catalogue', 'Neden hâlâ katalog basıyoruz'), T('Paper is slow, and that turns out to be the point.', 'Kâğıt yavaştır ve asıl mesele de bu çıkıyor.')],
    ].map(([iso, date, title, excerpt]) => `<article style="display:flex;flex-wrap:wrap;gap:8px 30px;padding:26px 0;border-top:1px solid ${p.line};"><time datetime="${iso}" style="flex:0 0 180px;color:${p.muted};font-size:14.5px;">${date}</time><div style="flex:1 1 320px;">${h3(p, `<a href="#" style="color:inherit;text-decoration:none;">${title}</a>`, 'font-size:22px;')}${body(p, excerpt)}</div></article>`).join('')}</div>`, { max: 900 }), [1000, 590]),

  section('blog-dark-magazine', 'blog', copy('Magazine layout, dark', 'Dergi düzeni, koyu'), copy('Large lead story with two smaller ones', 'Büyük ana haber ve iki küçük haber'), 'dark', (T, p) => band(p, `
    ${headRow(p, T('Magazine', 'Dergi'), T('This week’s reading.', 'Bu haftanın okumaları.'), T('Subscribe →', 'Abone olun →'))}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:20px;">
      <a href="#" style="position:relative;display:block;border-radius:20px;overflow:hidden;min-height:380px;text-decoration:none;">${photo('mag-lead', 900, 900, { radius: 0, extra: 'position:absolute;inset:0;height:100%;' })}<div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,rgba(0,0,0,0.85));"></div><div style="position:absolute;left:24px;right:24px;bottom:24px;">${chip(p, T('Cover story', 'Kapak konusu'), 'margin-bottom:12px;')}<h3 style="margin:0;color:#fff;font-size:clamp(22px,2.8vw,30px);line-height:1.2;">${T('Inside the night markets of the old port', 'Eski limanın gece pazarlarının içinden')}</h3></div></a>
      <div style="display:grid;gap:20px;">${[
        ['mag-2', T('Food', 'Yemek'), T('A week of one-pot dinners', 'Tek tencerede bir haftalık akşam yemeği')],
        ['mag-3', T('Travel', 'Seyahat'), T('Three villages worth the slow train', 'Yavaş trene değecek üç köy')],
      ].map(([seed, tag, title]) => `<a href="#" style="display:flex;gap:16px;align-items:center;padding:14px;border-radius:18px;background:${p.card};border:1px solid ${p.line};text-decoration:none;"><div style="width:120px;flex-shrink:0;">${photo(seed, 300, 300, { radius: 12, ratio: '1/1' })}</div><div>${chip(p, tag, 'margin-bottom:8px;')}<b style="display:block;color:${p.ink};font-size:17px;line-height:1.35;">${title}</b></div></a>`).join('')}</div>
    </div>`), [1000, 640]),

  section('blog-categories', 'blog', copy('Browse by topic', 'Konuya göre göz atın'), copy('Topic tiles with article counts', 'Yazı sayılarıyla konu kutuları'), 'light', (T, p) => band(p, `
    ${head(p, T('Topics', 'Konular'), T('Find what you need.', 'İhtiyacınız olanı bulun.'), '', 'center')}
    ${grid(200, [
      ['✎', T('Writing', 'Yazma'), 24], ['◎', T('Marketing', 'Pazarlama'), 31], ['₺', T('Pricing', 'Fiyatlandırma'), 12], ['☺', T('Customers', 'Müşteriler'), 18], ['⚙', T('Tools', 'Araçlar'), 27], ['✦', T('Design', 'Tasarım'), 22],
    ].map(([glyph, name, count]) => `<a href="#" style="display:flex;align-items:center;gap:14px;padding:18px 20px;border-radius:16px;background:${p.card};border:1px solid ${p.line};text-decoration:none;text-align:left;"><span aria-hidden="true" style="display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:${p.accentSoft};color:${p.accentInk};font-weight:800;font-size:19px;">${glyph}</span><span><b style="display:block;color:${p.ink};">${name}</b><span style="color:${p.muted};font-size:13.5px;">${count} ${T('articles', 'yazı')}</span></span></a>`), 14)}`, { align: 'center' }), [1000, 420]),

  section('blog-author-note', 'blog', copy('Author note', 'Yazar notu'), copy('A short bio box that closes an article', 'Bir yazıyı kapatan kısa biyografi kutusu'), 'soft', (T, p) => band(p, card(p, `
    <div style="display:flex;flex-wrap:wrap;gap:22px;align-items:center;">
      <div style="width:96px;flex-shrink:0;">${photo('author', 200, 200, { radius: 999, ratio: '1/1' })}</div>
      <div style="flex:1 1 280px;">
        <p style="margin:0 0 4px;color:${p.muted};font-size:13.5px;font-weight:700;">${T('Written by', 'Yazan')}</p>
        ${h3(p, 'Elena Petrova', 'font-size:20px;margin-bottom:6px;')}
        ${body(p, T('Elena writes about small businesses and the tools that help them. She lives by the sea with two cats and too many plants.', 'Elena küçük işletmeler ve onlara yardımcı olan araçlar hakkında yazıyor. Deniz kenarında iki kedi ve fazlaca bitkiyle yaşıyor.'))}
      </div>
      ${btn(p, T('More from Elena', 'Elena’nın diğer yazıları'), 'ghost')}
    </div>`, 'padding:28px;'), { max: 860, pad: '40px 24px' }), [1000, 270]),
]

export const FAQ_SECTIONS = [
  section('faq-accordion', 'faq', copy('FAQ accordion', 'SSS akordeon'), copy('Questions that open and close, no scripts needed', 'Açılıp kapanan sorular, betik gerekmez'), 'light', (T, p) => band(p, `
    ${head(p, T('FAQ', 'SSS'), T('Questions, answered.', 'Sorular, yanıtlarıyla.'), '', 'center')}
    <div style="text-align:left;">${[
      [T('How long does setup take?', 'Kurulum ne kadar sürer?'), T('Most people are up and running in under ten minutes. We can also move your old site over for you.', 'Çoğu kişi on dakikadan kısa sürede hazır olur. Eski sitenizi sizin için de taşıyabiliriz.')],
      [T('Can I cancel at any time?', 'İstediğim zaman iptal edebilir miyim?'), T('Yes. There are no contracts, and you keep access until the end of the period you paid for.', 'Evet. Sözleşme yok ve ödediğiniz dönemin sonuna kadar erişiminiz devam eder.')],
      [T('Do you offer refunds?', 'İade yapıyor musunuz?'), T('If you are not happy in the first 30 days, write to us and we will refund you in full.', 'İlk 30 günde memnun kalmazsanız bize yazın, ücretin tamamını iade edelim.')],
      [T('Is my data safe?', 'Verilerim güvende mi?'), T('Your data is encrypted, backed up daily and stored in the EU.', 'Verileriniz şifrelenir, her gün yedeklenir ve AB’de saklanır.')],
    ].map(([q, a], i) => faqItem(p, q, a, i === 0)).join('')}</div>`, { align: 'center', max: 780 }), [1000, 510]),

  section('faq-two-columns', 'faq', copy('FAQ in two columns', 'İki sütunlu SSS'), copy('Six short answers laid out in a grid', 'Izgarada altı kısa yanıt'), 'soft', (T, p) => band(p, `
    ${head(p, T('Good to know', 'Bilmekte fayda var'), T('Frequently asked questions.', 'Sıkça sorulan sorular.'), '')}
    ${grid(300, [
      [T('Where do you deliver?', 'Nereye teslimat yapıyorsunuz?'), T('Across the country, usually in two working days.', 'Ülkenin her yerine, genellikle iki iş gününde.')],
      [T('Can I change my order?', 'Siparişimi değiştirebilir miyim?'), T('Yes, until it leaves our workshop. Just reply to your confirmation email.', 'Evet, atölyemizden çıkana kadar. Onay e-postanızı yanıtlamanız yeterli.')],
      [T('Do you do gift wrapping?', 'Hediye paketi yapıyor musunuz?'), T('Every order can be wrapped for free, with a handwritten note.', 'Her sipariş el yazısı bir notla ücretsiz paketlenebilir.')],
      [T('What if it does not fit?', 'Olmazsa ne olacak?'), T('Returns are free within 30 days, no questions asked.', '30 gün içinde iade ücretsizdir, soru sorulmaz.')],
      [T('Do you have a shop?', 'Mağazanız var mı?'), T('Our studio shop is open Thursday to Saturday.', 'Stüdyo mağazamız perşembeden cumartesiye açık.')],
      [T('How do I care for it?', 'Bakımı nasıl yapılır?'), T('Every piece comes with a small card of care instructions.', 'Her parça küçük bir bakım talimatı kartıyla gelir.')],
    ].map(([q, a]) => `<div>${h3(p, q, 'font-size:17px;')}${body(p, a)}</div>`), 32)}`), [1000, 570]),

  section('faq-split-contact', 'faq', copy('FAQ with contact box', 'İletişim kutulu SSS'), copy('Questions on one side, a help card on the other', 'Bir yanda sorular, diğer yanda yardım kartı'), 'forest', (T, p) => band(p, grid(300, [
    `<div>${eyebrow(p, T('Support', 'Destek'))}${h2(p, T('Still have questions?', 'Hâlâ sorunuz mu var?'))}${body(p, T('Can’t find the answer you are looking for? Our team replies within a working day.', 'Aradığınız yanıtı bulamadınız mı? Ekibimiz bir iş günü içinde yanıt verir.'), 'font-size:17px;margin-bottom:22px;')}${card(p, `<b style="display:block;color:${p.ink};margin-bottom:4px;">${T('Talk to a person', 'Bir insanla konuşun')}</b>${body(p, T('Monday to Friday, 9:00–18:00', 'Pazartesi–Cuma, 09.00–18.00'), 'margin-bottom:16px;')}${btn(p, T('Contact support', 'Destekle iletişime geçin'))}`)}</div>`,
    `<div>${[
      [T('Do I need to be technical?', 'Teknik bilgi gerekiyor mu?'), T('Not at all. If you can write an email, you can build a page.', 'Hiç gerekmiyor. E-posta yazabiliyorsanız sayfa da yapabilirsiniz.')],
      [T('Can I use my own domain?', 'Kendi alan adımı kullanabilir miyim?'), T('Yes, on every paid plan. We walk you through it step by step.', 'Evet, tüm ücretli planlarda. Adım adım yol gösteririz.')],
      [T('What happens to my site if I stop paying?', 'Ödemeyi bırakırsam siteme ne olur?'), T('It is paused, not deleted. You can export everything at any time.', 'Silinmez, duraklatılır. Her şeyi istediğiniz zaman dışa aktarabilirsiniz.')],
      [T('Is there a discount for charities?', 'Hayır kurumlarına indirim var mı?'), T('Registered charities get 50% off every plan.', 'Kayıtlı hayır kurumları tüm planlarda %50 indirim alır.')],
    ].map(([q, a], i) => faqItem(p, q, a, i === 0)).join('')}</div>`,
  ], 48, 'align-items:start;')), [1000, 490]),

  section('faq-dark-cards', 'faq', copy('FAQ cards, dark', 'SSS kartları, koyu'), copy('Collapsible questions in dark rounded cards', 'Koyu yuvarlak kartlarda katlanabilir sorular'), 'dark', (T, p) => band(p, `
    ${head(p, '', T('Everything you wanted to ask.', 'Sormak istediğiniz her şey.'), '', 'center')}
    <div style="display:grid;gap:12px;text-align:left;">${[
      [T('Which payment methods do you accept?', 'Hangi ödeme yöntemlerini kabul ediyorsunuz?'), T('All major cards, bank transfer and invoices for yearly plans.', 'Tüm büyük kartlar, havale ve yıllık planlar için fatura.')],
      [T('Can I invite my team?', 'Ekibimi davet edebilir miyim?'), T('Yes. Add as many people as your plan allows and choose what each can edit.', 'Evet. Planınızın izin verdiği kadar kişi ekleyin ve her birinin neyi düzenleyebileceğini seçin.')],
      [T('Do you have an API?', 'API’niz var mı?'), T('A full REST API is available on the Business plan.', 'Kurumsal planda eksiksiz bir REST API sunuluyor.')],
    ].map(([q, a], i) => `<div style="padding:4px 22px;border-radius:16px;background:${p.card};border:1px solid ${p.line};">${faqItem(p, q, a, i === 0, 'border-bottom:0;')}</div>`).join('')}</div>`, { align: 'center', max: 780 }), [1000, 520]),

  section('faq-categories', 'faq', copy('FAQ by topic', 'Konuya göre SSS'), copy('Topic tabs above a short list of questions', 'Kısa soru listesinin üstünde konu sekmeleri'), 'ocean', (T, p) => band(p, `
    ${head(p, T('Help centre', 'Yardım merkezi'), T('How can we help?', 'Nasıl yardımcı olabiliriz?'), '', 'center')}
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-bottom:26px;">${[T('Orders', 'Siparişler'), T('Shipping', 'Kargo'), T('Returns', 'İadeler'), T('Account', 'Hesap')].map((label, i) => `<a href="#" style="padding:9px 18px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14.5px;${i === 1 ? `background:${p.accent};color:${p.onAccent};` : `background:${p.card};border:1px solid ${p.line};color:${p.ink};`}">${label}</a>`).join('')}</div>
    <div style="text-align:left;">${[
      [T('How much does shipping cost?', 'Kargo ücreti ne kadar?'), T('Free over €50. Below that, a flat €4.90 anywhere in the country.', '€50 üzeri ücretsiz. Altında ülkenin her yerine sabit €4,90.')],
      [T('Can I track my parcel?', 'Kargomu takip edebilir miyim?'), T('Yes, you get a tracking link by email as soon as it ships.', 'Evet, gönderildiği anda e-postayla takip bağlantısı alırsınız.')],
      [T('Do you ship abroad?', 'Yurt dışına gönderim yapıyor musunuz?'), T('We ship to 30 countries. Costs are shown at checkout.', '30 ülkeye gönderim yapıyoruz. Ücretler ödeme adımında gösterilir.')],
    ].map(([q, a], i) => faqItem(p, q, a, i === 0)).join('')}</div>`, { align: 'center', max: 780 }), [1000, 520]),

  section('faq-search', 'faq', copy('Help search', 'Yardım araması'), copy('A search field with popular questions below', 'Altında popüler sorularla bir arama alanı'), 'violet', (T, p) => band(p, `
    ${h2(p, T('Search our help centre', 'Yardım merkezimizde arayın'), 'margin-left:auto;margin-right:auto;')}
    <div style="display:flex;gap:8px;max-width:560px;margin:22px auto 22px;padding:6px;border-radius:14px;background:${p.card};border:1px solid ${p.line};"><span aria-hidden="true" style="display:grid;place-items:center;padding:0 8px;color:${p.muted};">⌕</span><input type="search" placeholder="${T('Try “change my password”', '“Şifremi değiştir” diye deneyin')}" aria-label="${T('Search help articles', 'Yardım yazılarında arayın')}" style="flex:1;min-width:0;border:0;outline:0;background:transparent;color:${p.ink};font:inherit;font-size:15.5px;" />${btn(p, T('Search', 'Ara'), 'solid', 'padding:10px 18px;')}</div>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;"><span style="color:${p.muted};font-size:14px;align-self:center;">${T('Popular:', 'Popüler:')}</span>${[T('Reset password', 'Şifre sıfırlama'), T('Invoices', 'Faturalar'), T('Custom domain', 'Özel alan adı'), T('Delete account', 'Hesabı silme')].map((label) => chip(p, label)).join('')}</div>`, { align: 'center', bg: p.soft, max: 820 }), [1000, 330]),
]

export const MEDIA_SECTIONS = [
  section('media-video-feature', 'media', copy('Featured video', 'Öne çıkan video'), copy('A wide video frame with a play button', 'Oynat düğmeli geniş video çerçevesi'), 'noir', (T, p) => band(p, `
    ${head(p, T('Watch', 'İzleyin'), T('See it in ninety seconds.', 'Doksan saniyede görün.'), '', 'center')}
    <div style="position:relative;border-radius:24px;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,0.5);">${photo('video-wide', 1600, 900, { radius: 0 })}<a href="#" aria-label="${T('Play video', 'Videoyu oynat')}" style="position:absolute;inset:0;margin:auto;display:grid;place-items:center;width:92px;height:92px;border-radius:50%;background:${p.accent};color:${p.onAccent};font-size:30px;text-decoration:none;">▶</a></div>`, { align: 'center' }), [1000, 780]),

  section('media-podcast', 'media', copy('Podcast episodes', 'Podcast bölümleri'), copy('Cover art and a list of episodes with durations', 'Kapak görseli ve süreli bölüm listesi'), 'warm', (T, p) => band(p, grid(300, [
    `<div>${art(p, { ratio: '1/1', radius: 24, extra: 'margin-bottom:20px;' })}${h2(p, T('The Small Shop Show', 'Küçük Dükkân Programı'), 'font-size:clamp(24px,2.8vw,32px);')}${body(p, T('Weekly conversations with people who run independent businesses.', 'Bağımsız işletme yürüten insanlarla haftalık sohbetler.'))}</div>`,
    `<div>${[
      ['42', T('Opening a second location', 'İkinci şubeyi açmak'), '48:12'],
      ['41', T('Pricing without guilt', 'Suçluluk duymadan fiyatlandırmak'), '39:40'],
      ['40', T('Hiring your first employee', 'İlk çalışanınızı işe almak'), '52:05'],
      ['39', T('When to say no to a client', 'Bir müşteriye ne zaman hayır denir'), '35:18'],
    ].map(([n, title, time], i) => `<div style="display:flex;align-items:center;gap:16px;padding:16px 0;${i ? `border-top:1px solid ${p.line};` : ''}"><a href="#" aria-label="${T('Play episode', 'Bölümü oynat')} ${n}" style="flex-shrink:0;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:${i === 0 ? p.accent : p.accentSoft};color:${i === 0 ? p.onAccent : p.accentInk};text-decoration:none;">▶</a><div style="flex:1;"><span style="color:${p.muted};font-size:13px;">${T('Episode', 'Bölüm')} ${n}</span><b style="display:block;color:${p.ink};">${title}</b></div><span style="color:${p.muted};font-size:14px;">${time}</span></div>`).join('')}</div>`,
  ], 44, 'align-items:start;')), [1000, 740]),

  section('media-video-grid', 'media', copy('Video library', 'Video kütüphanesi'), copy('Six video thumbnails with durations', 'Süreleriyle altı video küçük resmi'), 'light', (T, p) => band(p, `
    ${headRow(p, T('Tutorials', 'Eğitimler'), T('Learn at your own pace.', 'Kendi hızınızda öğrenin.'), T('All videos →', 'Tüm videolar →'))}
    ${grid(260, [
      ['vid-1', T('Getting started', 'Başlarken'), '4:12'], ['vid-2', T('Adding your products', 'Ürünlerinizi eklemek'), '6:30'], ['vid-3', T('Taking payments', 'Ödeme almak'), '5:05'],
      ['vid-4', T('Custom domains', 'Özel alan adları'), '3:48'], ['vid-5', T('Writing for search', 'Arama için yazmak'), '8:20'], ['vid-6', T('Inviting your team', 'Ekibinizi davet etmek'), '2:55'],
    ].map(([seed, title, time]) => `<a href="#" style="display:block;text-decoration:none;"><div style="position:relative;margin-bottom:12px;">${photo(seed, 640, 360, { radius: 14 })}<span style="position:absolute;right:10px;bottom:10px;padding:3px 8px;border-radius:6px;background:rgba(0,0,0,0.78);color:#fff;font-size:12.5px;font-weight:700;">${time}</span><span aria-hidden="true" style="position:absolute;inset:0;margin:auto;display:grid;place-items:center;width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.92);color:#0f172a;">▶</span></div><b style="color:${p.ink};">${title}</b></a>`), 20)}`), [1000, 690]),

  section('media-audio-player', 'media', copy('Audio player', 'Ses oynatıcı'), copy('A single track card with a progress bar', 'İlerleme çubuklu tek parça kartı'), 'teal', (T, p) => band(p, card(p, `
    <div style="display:flex;flex-wrap:wrap;gap:22px;align-items:center;">
      <div style="width:120px;flex-shrink:0;">${art(p, { ratio: '1/1', radius: 16 })}</div>
      <div style="flex:1 1 280px;">
        <span style="color:${p.accentInk};font-weight:700;font-size:13.5px;">${T('New single', 'Yeni tekli')}</span>
        ${h3(p, T('Harbour Lights', 'Liman Işıkları'), 'font-size:22px;margin:4px 0 2px;')}
        <span style="color:${p.muted};">The Quiet Hours</span>
        <div style="display:flex;align-items:center;gap:12px;margin-top:16px;"><a href="#" aria-label="${T('Play', 'Oynat')}" style="display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:${p.accent};color:${p.onAccent};text-decoration:none;">▶</a><div style="flex:1;height:6px;border-radius:99px;background:${p.line};"><div style="width:38%;height:100%;border-radius:99px;background:${p.accent};"></div></div><span style="color:${p.muted};font-size:13px;">1:24 / 3:41</span></div>
      </div>
    </div>`, 'padding:26px;'), { max: 760, pad: 'clamp(40px,6vw,64px) 24px' }), [1000, 310]),

  section('media-press-kit', 'media', copy('Press kit', 'Basın kiti'), copy('Downloadable logos, photos and fact sheet', 'İndirilebilir logolar, fotoğraflar ve bilgi notu'), 'soft', (T, p) => band(p, `
    ${head(p, T('Press', 'Basın'), T('Press kit and media assets.', 'Basın kiti ve medya dosyaları.'), T('Everything you need to write about us, free to use with credit.', 'Hakkımızda yazmak için ihtiyacınız olan her şey; kaynak göstererek ücretsiz kullanabilirsiniz.'))}
    ${grid(220, [
      ['◆', T('Logo pack', 'Logo paketi'), 'SVG · PNG · 2.4 MB'],
      ['▣', T('Product photos', 'Ürün fotoğrafları'), 'JPG · 38 MB'],
      ['☰', T('Fact sheet', 'Bilgi notu'), 'PDF · 320 KB'],
      ['☺', T('Founder portraits', 'Kurucu portreleri'), 'JPG · 12 MB'],
    ].map(([glyph, name, meta]) => `<a href="#" style="display:flex;align-items:center;gap:14px;padding:18px;border-radius:16px;background:${p.card};border:1px solid ${p.line};text-decoration:none;"><span aria-hidden="true" style="display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:${p.accentSoft};color:${p.accentInk};font-size:19px;">${glyph}</span><span style="flex:1;"><b style="display:block;color:${p.ink};">${name}</b><span style="color:${p.muted};font-size:13px;">${meta}</span></span><span aria-hidden="true" style="color:${p.accentInk};font-weight:800;">↓</span></a>`), 14)}
    <p style="margin:26px 0 0;color:${p.muted};">${T('Press enquiries:', 'Basın talepleri:')} <a href="#" style="color:${p.accentInk};font-weight:700;">press@example.com</a></p>`), [1000, 550]),
]

export const EVENT_SECTIONS = [
  section('events-list', 'events', copy('Upcoming events', 'Yaklaşan etkinlikler'), copy('Date blocks with titles, places and a button', 'Başlık, yer ve düğmeyle tarih blokları'), 'light', (T, p) => band(p, `
    ${head(p, T('What’s on', 'Programda neler var'), T('Upcoming events.', 'Yaklaşan etkinlikler.'), '')}
    <div style="display:grid;gap:14px;">${[
      ['14', T('Jun', 'Haz'), T('Summer wine tasting', 'Yaz şarap tadımı'), T('The cellar · 19:00', 'Mahzen · 19.00')],
      ['21', T('Jun', 'Haz'), T('Live jazz on the terrace', 'Terasta canlı caz'), T('Rooftop · 20:30', 'Çatı katı · 20.30')],
      ['05', T('Jul', 'Tem'), T('Kids’ pizza workshop', 'Çocuklar için pizza atölyesi'), T('Kitchen · 11:00', 'Mutfak · 11.00')],
    ].map(([day, month, title, where], i) => card(p, `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:20px;">${dateBlock(p, day, month, i === 0)}<div style="flex:1 1 220px;">${h3(p, title, 'margin-bottom:4px;')}<span style="color:${p.muted};">${where}</span></div>${btn(p, T('Reserve a seat', 'Yer ayırtın'), i === 0 ? 'solid' : 'ghost', 'padding:10px 20px;')}</div>`, 'padding:18px 22px;')).join('')}</div>`, { max: 900 }), [1000, 610]),

  section('events-cards', 'events', copy('Event cards', 'Etkinlik kartları'), copy('Three events with photos and price', 'Fotoğraf ve fiyatlarıyla üç etkinlik'), 'rose', (T, p) => band(p, `
    ${headRow(p, T('Workshops', 'Atölyeler'), T('Learn something with your hands.', 'Ellerinizle bir şey öğrenin.'), T('Full calendar →', 'Tüm takvim →'))}
    ${grid(260, [
      ['ev-1', T('Sat 12 Jul', '12 Tem Cmt'), T('Beginner pottery', 'Başlangıç seramik'), '€45'],
      ['ev-2', T('Sun 20 Jul', '20 Tem Paz'), T('Natural dyeing', 'Doğal boyama'), '€55'],
      ['ev-3', T('Sat 2 Aug', '2 Ağu Cmt'), T('Bookbinding', 'Kitap ciltleme'), '€40'],
    ].map(([seed, when, title, price]) => `<article style="border-radius:20px;overflow:hidden;background:${p.card};border:1px solid ${p.line};">${photo(seed, 700, 460, { radius: 0 })}<div style="padding:20px;"><span style="color:${p.accentInk};font-weight:700;font-size:14px;">${when}</span>${h3(p, title, 'margin:6px 0 14px;')}<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;"><b style="color:${p.ink};font-size:18px;">${price}</b>${btn(p, T('Book', 'Kaydolun'), 'soft', 'padding:9px 18px;font-size:14px;')}</div></div></article>`), 18)}`), [1000, 650]),

  section('events-countdown', 'events', copy('Event countdown', 'Etkinlik geri sayımı'), copy('Big date, countdown boxes and a ticket button', 'Büyük tarih, geri sayım kutuları ve bilet düğmesi'), 'dark', (T, p) => band(p, `
    ${chip(p, T('Annual conference', 'Yıllık konferans'))}
    ${h2(p, T('Makers Summit 2026', 'Üreticiler Zirvesi 2026'), 'font-size:clamp(34px,5vw,56px);margin:18px auto 10px;')}
    ${body(p, T('October 8–9 · Istanbul Congress Centre', '8–9 Ekim · İstanbul Kongre Merkezi'), 'font-size:18px;margin-bottom:30px;')}
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-bottom:32px;">${[['24', T('days', 'gün')], ['09', T('hours', 'saat')], ['41', T('minutes', 'dakika')], ['18', T('seconds', 'saniye')]].map(([n, l]) => `<div style="min-width:92px;padding:18px 10px;border-radius:16px;background:${p.card};border:1px solid ${p.line};"><b style="display:block;font-size:36px;color:${p.ink};font-variant-numeric:tabular-nums;">${n}</b><span style="color:${p.muted};font-size:13px;">${l}</span></div>`).join('')}</div>
    <div style="display:flex;justify-content:center;">${buttons(btn(p, T('Get tickets', 'Bilet alın')), btn(p, T('See the programme', 'Programı görün'), 'ghost'))}</div>`, { align: 'center', max: 820, extra: `background:radial-gradient(700px 360px at 50% 0%, ${p.accent}3a, transparent 65%),${p.bg};` }), [1000, 510]),

  section('events-schedule', 'events', copy('Event schedule', 'Etkinlik programı'), copy('A day’s agenda with times and speakers', 'Saat ve konuşmacılarla günlük program'), 'soft', (T, p) => band(p, `
    ${head(p, T('Programme', 'Program'), T('Day one schedule.', 'Birinci gün programı.'), '')}
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px;">${[T('Day 1', '1. gün'), T('Day 2', '2. gün')].map((label, i) => `<a href="#" style="padding:8px 18px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px;${i === 0 ? `background:${p.accent};color:${p.onAccent};` : `border:1px solid ${p.line};color:${p.ink};background:${p.card};`}">${label}</a>`).join('')}</div>
    <div style="border-radius:18px;overflow:hidden;border:1px solid ${p.line};background:${p.card};">${[
      ['09:00', T('Doors open and coffee', 'Kapılar açılıyor, kahve'), ''],
      ['10:00', T('Opening keynote: building for people', 'Açılış konuşması: insanlar için üretmek'), 'Aylin Çınar'],
      ['11:30', T('Panel: running a studio of five', 'Panel: beş kişilik bir stüdyo yönetmek'), T('Four guests', 'Dört konuk')],
      ['13:00', T('Lunch in the garden', 'Bahçede öğle yemeği'), ''],
      ['14:30', T('Workshop: pricing your work', 'Atölye: emeğinizi fiyatlandırmak'), 'Martin Hale'],
    ].map(([time, title, who], i) => `<div style="display:grid;grid-template-columns:80px minmax(0,1fr);gap:16px;padding:16px 20px;${i ? `border-top:1px solid ${p.line};` : ''}"><b style="color:${p.accentInk};font-variant-numeric:tabular-nums;">${time}</b><div><b style="display:block;color:${p.ink};">${title}</b>${who ? `<span style="color:${p.muted};font-size:14px;">${who}</span>` : ''}</div></div>`).join('')}</div>`, { max: 900 }), [1000, 620]),

  section('events-speakers', 'events', copy('Speakers', 'Konuşmacılar'), copy('Speaker photos with names and talk titles', 'Ad ve konuşma başlıklarıyla konuşmacı fotoğrafları'), 'violet', (T, p) => band(p, `
    ${head(p, T('Speakers', 'Konuşmacılar'), T('Hear from people who have done it.', 'Bunu yapmış insanları dinleyin.'), '', 'center')}
    ${grid(200, [
      ['spk-1', 'Aylin Çınar', T('Building for people', 'İnsanlar için üretmek')],
      ['spk-2', 'Martin Hale', T('Pricing your work', 'Emeğinizi fiyatlandırmak')],
      ['spk-3', 'Rana Yücel', T('Designing calm products', 'Sakin ürünler tasarlamak')],
      ['spk-4', 'Jonas Berg', T('Small teams, big work', 'Küçük ekipler, büyük işler')],
    ].map(([seed, name, talk]) => `<div style="text-align:center;"><div style="width:min(160px,70%);margin:0 auto 14px;">${photo(seed, 320, 320, { radius: 999, ratio: '1/1' })}</div>${h3(p, name, 'font-size:17px;margin-bottom:2px;')}<span style="color:${p.muted};font-size:14.5px;">${talk}</span></div>`), 24)}`, { align: 'center' }), [1000, 500]),

  section('events-venue', 'events', copy('Venue and tickets', 'Mekân ve biletler'), copy('Venue details beside ticket options', 'Bilet seçeneklerinin yanında mekân bilgileri'), 'forest', (T, p) => band(p, grid(300, [
    `<div>${photo('venue', 800, 560, { radius: 20, extra: 'margin-bottom:18px;' })}${h3(p, T('The Old Mill', 'Eski Değirmen'), 'font-size:22px;')}${body(p, T('Riverside Road 12 · Ten minutes’ walk from the central station, with bike parking and step-free access.', 'Nehir Yolu 12 · Merkez istasyona on dakika yürüme mesafesinde, bisiklet parkı ve basamaksız giriş.'))}</div>`,
    `<div style="display:grid;gap:14px;">${[
      [T('Day pass', 'Günlük bilet'), '€35', T('One day, all talks and lunch', 'Bir gün, tüm konuşmalar ve öğle yemeği')],
      [T('Full pass', 'Tam bilet'), '€60', T('Both days, workshops and dinner', 'İki gün, atölyeler ve akşam yemeği')],
      [T('Student', 'Öğrenci'), '€15', T('Both days with a valid student card', 'Geçerli öğrenci kartıyla iki gün')],
    ].map(([name, price, note], i) => `<label style="display:flex;align-items:center;gap:14px;padding:18px 20px;border-radius:16px;background:${p.card};border:${i === 1 ? `2px solid ${p.accent}` : `1px solid ${p.line}`};cursor:pointer;"><input type="radio" name="ticket"${i === 1 ? ' checked' : ''} style="accent-color:${p.accent};width:18px;height:18px;" /><span style="flex:1;"><b style="display:block;color:${p.ink};">${name}</b><span style="color:${p.muted};font-size:14px;">${note}</span></span><b style="color:${p.ink};font-size:20px;">${price}</b></label>`).join('')}${btn(p, T('Continue to checkout', 'Ödemeye geçin'), 'solid', 'display:block;text-align:center;')}</div>`,
  ], 40, 'align-items:start;')), [1000, 590]),
]
