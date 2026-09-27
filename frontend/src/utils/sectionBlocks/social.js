// People: what customers say, who you work with, who you are and where to
// follow along.
import {
  avatar, band, body, btn, buttons, card, copy, eyebrow, grid, h2, h3, lead, photo, section, stars,
} from './kit.js'

const head = (p, eyebrowText, title, text, align = 'left') => `
  ${eyebrowText ? eyebrow(p, eyebrowText, align) : ''}
  ${h2(p, title, align === 'center' ? 'margin-left:auto;margin-right:auto;max-width:22ch;' : 'max-width:22ch;')}
  ${text ? lead(p, text, align === 'center' ? 'margin-left:auto;margin-right:auto;margin-bottom:42px;' : 'margin-bottom:42px;') : ''}`

const person = (p, letter, name, role, size = 44) => (
  `<div style="display:flex;align-items:center;gap:12px;">${avatar(p, letter, size)}<div style="text-align:left;"><b style="display:block;color:${p.ink};font-size:15px;">${name}</b><span style="color:${p.muted};font-size:14px;">${role}</span></div></div>`
)

const quote = (p, text, extra = '') => (
  `<blockquote style="margin:0 0 20px;font-size:16.5px;line-height:1.65;color:${p.ink};${extra}">“${text}”</blockquote>`
)

const review = (p, T, text, letter, name, role, count = 5) => card(p, `
  <div style="margin-bottom:14px;">${stars(p, count)}</div>
  ${quote(p, text)}
  ${person(p, letter, name, role)}`, 'display:flex;flex-direction:column;justify-content:space-between;')

// Word marks drawn in type, so logo rows never depend on image files.
const LOGOS = [
  ['Northwind', 'font-weight:900;letter-spacing:-0.04em;'],
  ['lumen', 'font-weight:300;letter-spacing:0.08em;text-transform:lowercase;'],
  ['ACME CO', 'font-weight:800;letter-spacing:0.18em;font-size:15px;'],
  ['Orbit', 'font-style:italic;font-weight:800;'],
  ['Halcyon', 'font-family:Georgia,serif;font-weight:700;'],
  ['kite+', 'font-weight:900;'],
  ['Meridian', 'font-weight:600;letter-spacing:0.02em;'],
  ['PARCEL', 'font-weight:900;letter-spacing:0.12em;font-size:15px;'],
]

const logo = (p, [name, style], extra = '') => (
  `<span style="display:inline-flex;align-items:center;justify-content:center;min-height:48px;font-size:22px;color:${p.muted};${style}${extra}">${name}</span>`
)

const SOCIAL = [
  ['Instagram', 'IG'],
  ['LinkedIn', 'in'],
  ['YouTube', '▶'],
  ['TikTok', '♪'],
  ['X', 'X'],
  ['Facebook', 'f'],
]

const socialIcon = (p, glyph, size = 42, solid = false) => (
  `<a href="#" aria-label="${glyph}" style="display:inline-grid;place-items:center;width:${size}px;height:${size}px;border-radius:999px;text-decoration:none;font-weight:800;font-size:${Math.round(size * 0.36)}px;${solid ? `background:${p.accent};color:${p.onAccent};` : `border:1.5px solid ${p.line};color:${p.ink};`}">${glyph}</a>`
)

export const TESTIMONIAL_SECTIONS = [
  section('testimonials-three-cards', 'testimonials', copy('Three reviews', 'Üç yorum'), copy('Three star-rated quotes in cards', 'Kartlarda üç yıldızlı yorum'), 'soft', (T, p) => band(p, `
    ${head(p, T('Reviews', 'Yorumlar'), T('Loved by the people who use it.', 'Kullananlar tarafından seviliyor.'), '', 'center')}
    ${grid(260, [
      review(p, T, T('We moved our whole shop over in an afternoon. Sales went up the very first week.', 'Bütün mağazamızı bir öğleden sonra taşıdık. Satışlar daha ilk hafta arttı.'), 'E', 'Elif Aydın', T('Shop owner', 'Mağaza sahibi')),
      review(p, T, T('Clear, fast and friendly. Every question got a real answer within the hour.', 'Net, hızlı ve güler yüzlü. Her soruya bir saat içinde gerçek bir yanıt geldi.'), 'M', 'Mark Jensen', T('Studio lead', 'Stüdyo yöneticisi')),
      review(p, T, T('The first tool our whole team actually enjoys opening in the morning.', 'Bütün ekibimizin sabahları açmaktan gerçekten keyif aldığı ilk araç.'), 'S', 'Selin Kaya', T('Operations manager', 'Operasyon müdürü')),
    ], 20, 'text-align:left;')}`, { align: 'center' }), [1000, 520]),

  section('testimonials-big-quote', 'testimonials', copy('Single large quote', 'Tek büyük alıntı'), copy('One centred quote with the author below', 'Altında yazarıyla ortalanmış tek alıntı'), 'light', (T, p) => band(p, `
    <div aria-hidden="true" style="font-size:90px;line-height:0.6;color:${p.accent};font-family:Georgia,serif;margin-bottom:20px;">“</div>
    <blockquote style="margin:0 auto 30px;font-size:clamp(22px,3vw,32px);line-height:1.4;font-weight:600;letter-spacing:-0.01em;color:${p.ink};max-width:30ch;">${T('They listened more than they talked, and the result was better than anything we had pictured.', 'Konuşmaktan çok dinlediler ve sonuç hayal ettiğimiz her şeyden daha iyi oldu.')}</blockquote>
    <div style="display:inline-flex;">${person(p, 'D', 'Deniz Arslan', T('Founder, Arslan Bakery', 'Kurucu, Arslan Fırını'), 52)}</div>`, { align: 'center', max: 860 }), [1000, 450]),

  section('testimonials-dark-grid', 'testimonials', copy('Review wall, dark', 'Yorum duvarı, koyu'), copy('Six short quotes in a dark masonry wall', 'Koyu zeminde altı kısa alıntıdan duvar'), 'dark', (T, p) => band(p, `
    ${head(p, T('Wall of love', 'Sevgi duvarı'), T('Thousands of teams, one feeling.', 'Binlerce ekip, tek bir his.'), '', 'center')}
    <div style="columns:3 260px;column-gap:18px;text-align:left;">${[
      [T('Setup took ten minutes. I keep waiting for the catch.', 'Kurulum on dakika sürdü. Hâlâ bir bit yeniği arıyorum.'), 'A', 'Ada Lin', '@adalin'],
      [T('Replaced three tools and a spreadsheet nobody understood. Our Monday meeting is now fifteen minutes.', 'Üç aracın ve kimsenin anlamadığı bir tablonun yerini aldı. Pazartesi toplantımız artık on beş dakika.'), 'K', 'Kerem Öz', '@keremoz'],
      [T('Support answered on a Sunday. On a Sunday!', 'Destek ekibi pazar günü yanıt verdi. Pazar günü!'), 'J', 'Julia Brandt', '@jbrandt'],
      [T('The reports are so clean I send them to clients as they are.', 'Raporlar o kadar temiz ki müşterilere olduğu gibi gönderiyorum.'), 'B', 'Burak Tan', '@buraktan'],
      [T('Finally something that works the same on my phone as on my laptop.', 'Sonunda telefonumda da dizüstünde olduğu gibi çalışan bir şey.'), 'N', 'Nora Silva', '@norasilva'],
      [T('Our clients noticed the difference before we told them.', 'Müşterilerimiz farkı biz söylemeden fark etti.'), 'O', 'Ozan Demir', '@ozandemir'],
    ].map(([text, letter, name, handle]) => `<div style="break-inside:avoid;margin:0 0 18px;padding:22px;border-radius:18px;background:${p.card};border:1px solid ${p.line};">${quote(p, text, 'font-size:15.5px;margin-bottom:16px;')}${person(p, letter, name, handle, 38)}</div>`).join('')}</div>`, { align: 'center' }), [1000, 660]),

  section('testimonials-split-photo', 'testimonials', copy('Quote with photo', 'Fotoğraflı alıntı'), copy('A customer story beside their photo', 'Müşteri hikâyesi fotoğrafının yanında'), 'warm', (T, p) => band(p, grid(300, [
    photo('customer-portrait', 600, 680, { radius: 24 }),
    `<div>
      ${eyebrow(p, T('Customer story', 'Müşteri hikâyesi'))}
      ${quote(p, T('We went from a paper diary to a full calendar of bookings in one season. I finally take weekends off.', 'Bir sezonda kâğıt ajandadan dolu bir rezervasyon takvimine geçtik. Sonunda hafta sonları tatil yapabiliyorum.'), 'font-size:clamp(20px,2.4vw,26px);line-height:1.45;font-weight:600;')}
      ${person(p, 'H', 'Hande Yıldız', T('Owner, Olive Tree Yoga', 'Sahibi, Zeytin Ağacı Yoga'), 50)}
      <div style="display:flex;flex-wrap:wrap;gap:34px;margin-top:32px;padding-top:26px;border-top:1px solid ${p.line};">${[['3×', T('more bookings', 'daha fazla rezervasyon')], ['6 h', T('saved every week', 'her hafta kazanılan zaman')]].map(([n, l]) => `<div><b style="display:block;font-size:34px;color:${p.accentInk};letter-spacing:-0.02em;">${n}</b><span style="color:${p.muted};">${l}</span></div>`).join('')}</div>
    </div>`,
  ], 48, 'align-items:center;')), [1000, 680]),

  section('testimonials-rating-summary', 'testimonials', copy('Rating summary', 'Puan özeti'), copy('Average score with a bar for each star', 'Ortalama puan ve her yıldız için çubuk'), 'light', (T, p) => band(p, grid(300, [
    `<div>
      ${eyebrow(p, T('Ratings', 'Puanlar'))}
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:8px;"><b style="font-size:64px;letter-spacing:-0.04em;color:${p.ink};">4.9</b><span style="color:${p.muted};">/ 5</span></div>
      <div style="margin-bottom:8px;">${stars(p, 5)}</div>
      ${body(p, T('Based on 1,284 verified reviews', '1.284 doğrulanmış yoruma göre'), 'margin-bottom:26px;')}
      ${[[5, 88], [4, 9], [3, 2], [2, 1], [1, 0]].map(([n, pct]) => `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;font-size:14px;color:${p.muted};"><span style="width:14px;">${n}</span><div style="flex:1;height:8px;border-radius:99px;background:${p.soft};overflow:hidden;"><div style="width:${pct}%;height:100%;background:${p.accent};"></div></div><span style="width:34px;text-align:right;">${pct}%</span></div>`).join('')}
    </div>`,
    `<div style="display:grid;gap:16px;">${[
      [T('Arrived a day early and fits perfectly.', 'Bir gün erken geldi ve tam oldu.'), 'Z', 'Zeynep', 5],
      [T('Great quality. The colour is a little darker than the photos.', 'Kalite harika. Renk fotoğraflardakinden biraz daha koyu.'), 'T', 'Tom', 4],
      [T('Third order, still impressed by the packaging.', 'Üçüncü siparişim, paketlemeye hâlâ hayranım.'), 'L', 'Leyla', 5],
    ].map(([text, letter, name, n]) => card(p, `<div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:10px;">${person(p, letter, name, T('Verified buyer', 'Doğrulanmış alıcı'), 36)}${stars(p, n)}</div>${body(p, text, `color:${p.ink};`)}`, 'padding:20px;')).join('')}</div>`,
  ], 48, 'align-items:start;')), [1000, 570]),

  section('testimonials-logo-quotes', 'testimonials', copy('Quotes with company names', 'Şirket adlı alıntılar'), copy('Two long quotes signed by companies', 'Şirketlerce imzalanmış iki uzun alıntı'), 'ocean', (T, p) => band(p, `
    ${head(p, T('Case studies', 'Vaka çalışmaları'), T('Teams that switched and never looked back.', 'Geçiş yapıp bir daha geri bakmayan ekipler.'), '')}
    ${grid(360, [
      [LOGOS[0], T('We cut our reporting time from two days to two hours, and the numbers are finally the same everywhere.', 'Raporlama süremizi iki günden iki saate indirdik ve rakamlar nihayet her yerde aynı.'), 'C', 'Cem Uslu', T('Head of Finance', 'Finans Direktörü')],
      [LOGOS[4], T('Onboarding a new hire used to take a month. Now they ship something useful in their first week.', 'Yeni bir çalışanın alışması eskiden bir ay sürerdi. Artık ilk haftalarında işe yarar bir şey çıkarıyorlar.'), 'R', 'Rachel Moss', T('VP Engineering', 'Mühendislik Başkan Yrd.')],
    ].map(([mark, text, letter, name, role]) => card(p, `${logo(p, mark, `color:${p.ink};margin-bottom:18px;min-height:0;`)}${quote(p, text, 'font-size:18px;')}${person(p, letter, name, role)}`, 'padding:32px;')), 20)}`), [1000, 550]),

  section('testimonials-slider', 'testimonials', copy('Quote slider', 'Alıntı kaydırıcı'), copy('One quote with arrows and dots', 'Oklar ve noktalarla tek alıntı'), 'violet', (T, p) => band(p, `
    ${card(p, `
      <div style="display:flex;justify-content:center;margin-bottom:18px;">${stars(p, 5)}</div>
      ${quote(p, T('The easiest decision we made all year. Our customers keep telling us how simple booking has become.', 'Yılın en kolay kararıydı. Müşterilerimiz rezervasyonun ne kadar kolaylaştığını söyleyip duruyor.'), 'font-size:clamp(19px,2.2vw,24px);font-weight:600;margin-bottom:26px;')}
      <div style="display:flex;justify-content:center;">${person(p, 'I', 'Irmak Şahin', T('Clinic manager', 'Klinik müdürü'), 48)}</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-top:28px;">
        <a href="#" aria-label="${T('Previous', 'Önceki')}" style="display:inline-grid;place-items:center;width:40px;height:40px;border-radius:50%;border:1.5px solid ${p.line};color:${p.ink};text-decoration:none;">←</a>
        <span style="display:flex;gap:7px;">${[0, 1, 2, 3].map((i) => `<i style="display:block;width:${i === 0 ? 22 : 8}px;height:8px;border-radius:99px;background:${i === 0 ? p.accent : p.line};"></i>`).join('')}</span>
        <a href="#" aria-label="${T('Next', 'Sonraki')}" style="display:inline-grid;place-items:center;width:40px;height:40px;border-radius:50%;background:${p.accent};color:${p.onAccent};text-decoration:none;">→</a>
      </div>`, 'padding:clamp(28px,5vw,52px);')}`, { align: 'center', max: 760, bg: p.soft }), [1000, 560]),

  section('testimonials-video', 'testimonials', copy('Video testimonial', 'Video yorum'), copy('A play button on a customer video with a quote', 'Müşteri videosunda oynat düğmesi ve alıntı'), 'noir', (T, p) => band(p, grid(320, [
    `<div style="position:relative;border-radius:22px;overflow:hidden;">${photo('video-interview', 800, 520, { radius: 0 })}<a href="#" aria-label="${T('Play video', 'Videoyu oynat')}" style="position:absolute;inset:0;margin:auto;display:grid;place-items:center;width:78px;height:78px;border-radius:50%;background:${p.accent};color:${p.onAccent};font-size:26px;text-decoration:none;box-shadow:0 18px 40px rgba(0,0,0,0.45);">▶</a><span style="position:absolute;left:16px;bottom:16px;padding:5px 10px;border-radius:8px;background:rgba(0,0,0,0.7);color:#fff;font-size:13px;font-weight:700;">2:14</span></div>`,
    `<div>
      ${eyebrow(p, T('Watch the story', 'Hikâyeyi izleyin'))}
      ${h2(p, T('How a family winery doubled its online sales.', 'Bir aile şaraphanesi çevrimiçi satışlarını nasıl ikiye katladı.'))}
      ${quote(p, T('We thought selling online was for big brands. Two years later it is half our business.', 'Çevrimiçi satışın büyük markalara göre olduğunu düşünürdük. İki yıl sonra işimizin yarısı oldu.'), `color:${p.muted};`)}
      ${person(p, 'G', 'Giulia Ferro', T('Ferro Wines', 'Ferro Şarapları'))}
    </div>`,
  ], 44, 'align-items:center;')), [1000, 460]),

  section('testimonials-marquee', 'testimonials', copy('Review strip', 'Yorum şeridi'), copy('A row of short reviews that scrolls sideways', 'Yana kayan kısa yorumlar şeridi'), 'rose', (T, p) => band(p, `
    ${head(p, '', T('What guests are saying.', 'Misafirlerimiz ne diyor.'), '', 'center')}
    <div style="display:flex;gap:16px;overflow-x:auto;padding:4px 2px 14px;scroll-snap-type:x mandatory;text-align:left;">${[
      [T('Best brunch in the neighbourhood, hands down.', 'Mahallenin açık ara en iyi brunch’ı.'), 'Ece'],
      [T('The staff remembered our names on the second visit.', 'Çalışanlar ikinci gelişimizde isimlerimizi hatırladı.'), 'Paul'],
      [T('Cosy, bright and the coffee is serious.', 'Samimi, aydınlık ve kahvesi gerçekten iddialı.'), 'Aylin'],
      [T('Came for the cake, stayed for three hours.', 'Kek için geldik, üç saat kaldık.'), 'Marta'],
      [T('Our go-to spot for every birthday now.', 'Artık her doğum günü için ilk tercihimiz.'), 'Emre'],
    ].map(([text, name], i) => `<div style="flex:0 0 min(78%,280px);scroll-snap-align:start;">${card(p, `${stars(p, 5)}${quote(p, text, 'margin:12px 0 14px;font-size:15.5px;')}<b style="color:${p.ink};font-size:14px;">${name}</b>`, `height:100%;${i === 0 ? `border-color:${p.accent};` : ''}`)}</div>`).join('')}</div>`, { align: 'center' }), [1000, 430]),

  section('testimonials-press', 'testimonials', copy('Press quotes', 'Basın alıntıları'), copy('Short lines from newspapers and magazines', 'Gazete ve dergilerden kısa cümleler'), 'light', (T, p) => band(p, `
    ${eyebrow(p, T('In the press', 'Basında biz'), 'center')}
    ${grid(240, [
      [T('“A small shop with a very big idea.”', '“Çok büyük bir fikri olan küçük bir dükkân.”'), 'The Weekly'],
      [T('“The most thoughtful design we have seen this year.”', '“Bu yıl gördüğümüz en özenli tasarım.”'), 'Design Daily'],
      [T('“Worth the trip across town.”', '“Şehrin öbür ucundan gelmeye değer.”'), 'City Guide'],
    ].map(([text, source]) => `<figure style="margin:0;padding:10px 18px;text-align:center;"><p style="margin:0 0 16px;font-family:Georgia,serif;font-size:21px;line-height:1.45;font-style:italic;color:${p.ink};">${text}</p><figcaption style="font-weight:800;letter-spacing:0.16em;text-transform:uppercase;font-size:13px;color:${p.muted};">${source}</figcaption></figure>`), 28)}`, { align: 'center', pad: 'clamp(44px,6vw,72px) 24px' }), [1000, 260]),
]

export const LOGO_SECTIONS = [
  section('logos-row', 'logos', copy('Logo row', 'Logo satırı'), copy('Trusted-by line with six company names', 'Altı şirket adıyla “bize güvenenler” satırı'), 'light', (T, p) => band(p, `
    <p style="margin:0 0 24px;color:${p.muted};font-size:14px;font-weight:600;">${T('Trusted by teams at', 'Bize güvenen ekipler')}</p>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:clamp(24px,5vw,56px);">${LOGOS.slice(0, 6).map((mark) => logo(p, mark)).join('')}</div>`, { align: 'center', pad: '44px 24px' }), [1000, 180]),

  section('logos-grid-cards', 'logos', copy('Logo grid', 'Logo ızgarası'), copy('Eight logos in bordered tiles with a heading', 'Başlıkla birlikte çerçeveli kutularda sekiz logo'), 'soft', (T, p) => band(p, `
    ${head(p, T('Customers', 'Müşteriler'), T('Chosen by 4,000 companies worldwide.', 'Dünya genelinde 4.000 şirket tercih ediyor.'), '', 'center')}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(max(140px,calc((100% - 42px) / 4)),1fr));gap:14px;">${LOGOS.map((mark) => `<div style="display:grid;place-items:center;padding:26px 16px;border-radius:16px;background:${p.card};border:1px solid ${p.line};">${logo(p, mark)}</div>`).join('')}</div>`, { align: 'center' }), [1000, 510]),

  section('logos-dark-band', 'logos', copy('Logo band, dark', 'Logo bandı, koyu'), copy('Company names on a dark strip with a number', 'Koyu şeritte şirket adları ve bir rakam'), 'dark', (T, p) => band(p, `
    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:28px;">
      <p style="margin:0;max-width:260px;color:${p.ink};font-size:17px;line-height:1.5;"><b style="color:${p.accentInk};">12,000+</b> ${T('businesses run on our platform every day.', 'işletme her gün platformumuzda çalışıyor.')}</p>
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:clamp(20px,4vw,44px);">${LOGOS.slice(2, 7).map((mark) => logo(p, mark)).join('')}</div>
    </div>`, { pad: '40px 24px' }), [1000, 140]),

  section('logos-with-stats', 'logos', copy('Logos with results', 'Sonuçlu logolar'), copy('Each company name paired with one result', 'Her şirket adı bir sonuçla eşleşmiş'), 'forest', (T, p) => band(p, `
    ${head(p, T('Results', 'Sonuçlar'), T('Real numbers from real customers.', 'Gerçek müşterilerden gerçek rakamlar.'), '')}
    ${grid(220, [
      [LOGOS[0], '+42%', T('more repeat orders', 'daha fazla tekrar sipariş')],
      [LOGOS[3], '−30%', T('fewer support tickets', 'daha az destek talebi')],
      [LOGOS[6], '2.5×', T('faster checkout', 'daha hızlı ödeme')],
      [LOGOS[1], '9 h', T('saved per week', 'haftada kazanılan süre')],
    ].map(([mark, n, l]) => card(p, `${logo(p, mark, `color:${p.ink};min-height:0;margin-bottom:20px;font-size:19px;`)}<b style="display:block;font-size:36px;letter-spacing:-0.03em;color:${p.accentInk};">${n}</b>${body(p, l)}`)), 16)}`), [1000, 480]),

  section('logos-partners', 'logos', copy('Partners and awards', 'Ortaklar ve ödüller'), copy('Partner names beside award badges', 'Ödül rozetlerinin yanında ortak adları'), 'warm', (T, p) => band(p, grid(300, [
    `<div>${eyebrow(p, T('Partners', 'Ortaklar'))}${h2(p, T('In good company.', 'İyi bir çevredeyiz.'), 'font-size:clamp(26px,3vw,34px);')}<div style="display:flex;flex-wrap:wrap;gap:12px 30px;margin-top:10px;">${LOGOS.slice(3, 8).map((mark) => logo(p, mark, 'font-size:19px;')).join('')}</div></div>`,
    `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;">${[
      [T('Best new shop', 'En iyi yeni dükkân'), '2025'],
      [T('Design award', 'Tasarım ödülü'), '2024'],
      [T('Customer choice', 'Müşterilerin seçimi'), '2024'],
    ].map(([title, year]) => `<div style="display:grid;justify-items:center;align-content:start;gap:6px;padding:22px 10px;border-radius:999px 999px 20px 20px;background:${p.card};border:1px solid ${p.line};text-align:center;"><span aria-hidden="true" style="font-size:26px;color:${p.accent};">★</span><b style="color:${p.ink};font-size:15px;">${title}</b><span style="color:${p.muted};font-size:13px;">${year}</span></div>`).join('')}</div>`,
  ], 40, 'align-items:center;')), [1000, 420]),
]

const member = (p, seed, name, role, extra = '') => (
  `<div style="text-align:left;">${photo(seed, 480, 560, { radius: 18, extra: 'margin-bottom:14px;' })}${h3(p, name, 'margin-bottom:2px;font-size:17px;')}<span style="color:${p.muted};font-size:14.5px;">${role}</span>${extra}</div>`
)

export const TEAM_SECTIONS = [
  section('team-photo-grid', 'team', copy('Team grid', 'Ekip ızgarası'), copy('Four people with photos, names and roles', 'Fotoğraf, ad ve unvanlarıyla dört kişi'), 'light', (T, p) => band(p, `
    ${head(p, T('Our team', 'Ekibimiz'), T('The people behind the work.', 'İşin arkasındaki insanlar.'), T('A small team that answers its own emails.', 'E-postalarını kendisi yanıtlayan küçük bir ekip.'), 'center')}
    ${grid(210, [
      member(p, 'team-ayse', 'Ayşe Demir', T('Founder', 'Kurucu')),
      member(p, 'team-leo', 'Leo Martin', T('Design lead', 'Tasarım lideri')),
      member(p, 'team-mert', 'Mert Koç', T('Engineering', 'Yazılım')),
      member(p, 'team-sara', 'Sara Holm', T('Customer care', 'Müşteri ilişkileri')),
    ], 22)}`, { align: 'center' }), [1000, 670]),

  section('team-cards-social', 'team', copy('Team cards with links', 'Bağlantılı ekip kartları'), copy('Round avatars, short bios and social links', 'Yuvarlak avatarlar, kısa biyografiler ve sosyal bağlantılar'), 'soft', (T, p) => band(p, `
    ${head(p, T('Meet us', 'Tanışalım'), T('Friendly faces, serious skills.', 'Güler yüzlü, işini bilen insanlar.'), '', 'center')}
    ${grid(240, [
      ['E', 'Emir Aksoy', T('Head chef', 'Şef'), T('Twenty years in kitchens from Izmir to Lyon.', 'İzmir’den Lyon’a mutfaklarda yirmi yıl.')],
      ['C', 'Clara Voss', T('Pastry', 'Pastacı'), T('Bakes everything on the dessert menu, every morning.', 'Tatlı menüsündeki her şeyi her sabah kendisi pişiriyor.')],
      ['Y', 'Yusuf Er', T('Front of house', 'Salon müdürü'), T('Knows the wine list and most regulars by heart.', 'Şarap listesini ve müdavimlerin çoğunu ezbere bilir.')],
    ].map(([letter, name, role, bio]) => card(p, `<div style="display:flex;justify-content:center;margin-bottom:16px;">${avatar(p, letter, 84)}</div>${h3(p, name, 'margin-bottom:2px;')}<p style="margin:0 0 12px;color:${p.accentInk};font-weight:700;font-size:14px;">${role}</p>${body(p, bio, 'margin-bottom:18px;')}<div style="display:flex;justify-content:center;gap:8px;">${socialIcon(p, 'in', 34)}${socialIcon(p, 'IG', 34)}</div>`, 'text-align:center;')), 20)}`, { align: 'center' }), [1000, 600]),

  section('team-founders', 'team', copy('Founders', 'Kurucular'), copy('Two founders side by side with a longer note', 'Yan yana iki kurucu ve uzunca bir not'), 'warm', (T, p) => band(p, `
    ${head(p, T('Founders', 'Kurucular'), T('Started at a kitchen table in 2016.', '2016’da bir mutfak masasında başladı.'), '')}
    ${grid(340, [
      ['founder-one', 'Nazlı Ekinci', T('Co-founder · Product', 'Kurucu ortak · Ürün'), T('Spent ten years building tools for hospitals before deciding small businesses deserved the same care.', 'Küçük işletmelerin de aynı özeni hak ettiğine karar vermeden önce on yıl hastaneler için araçlar geliştirdi.')],
      ['founder-two', 'Daniel Reyes', T('Co-founder · Operations', 'Kurucu ortak · Operasyon'), T('Ran a chain of cafés and knows exactly how long a Saturday rush feels.', 'Bir kafe zinciri yönetti ve bir cumartesi yoğunluğunun ne kadar uzun sürdüğünü çok iyi bilir.')],
    ].map(([seed, name, role, bio]) => `<div style="display:grid;grid-template-columns:minmax(0,130px) 1fr;gap:20px;align-items:start;">${photo(seed, 300, 360, { radius: 16 })}<div>${h3(p, name, 'font-size:20px;margin-bottom:4px;')}<p style="margin:0 0 12px;color:${p.accentInk};font-weight:700;font-size:14px;">${role}</p>${body(p, bio)}</div></div>`), 36)}`), [1000, 440]),

  section('team-dark-hiring', 'team', copy('Team with hiring card', 'İşe alım kartlı ekip'), copy('Team photos on dark with a “join us” tile', 'Koyu zeminde ekip fotoğrafları ve “bize katılın” kutusu'), 'dark', (T, p) => band(p, `
    ${head(p, T('Team', 'Ekip'), T('Remote from day one, in nine countries.', 'İlk günden uzaktan, dokuz ülkede.'), '')}
    ${grid(200, [
      member(p, 'dark-team-1', 'Ines Duarte', T('Engineering', 'Yazılım')),
      member(p, 'dark-team-2', 'Kaan Bilgin', T('Design', 'Tasarım')),
      member(p, 'dark-team-3', 'Priya Nair', T('Data', 'Veri')),
      `<a href="#" style="display:flex;flex-direction:column;justify-content:flex-end;gap:10px;min-height:260px;padding:22px;border-radius:18px;border:1.5px dashed ${p.accent};background:${p.accentSoft};text-decoration:none;"><span style="font-size:34px;color:${p.accentInk};">+</span><b style="color:${p.ink};font-size:18px;">${T('This could be you', 'Burada siz olabilirsiniz')}</b><span style="color:${p.muted};font-size:14.5px;">${T('See open positions →', 'Açık pozisyonları görün →')}</span></a>`,
    ], 20)}`), [1000, 600]),

  section('team-list-compact', 'team', copy('Compact team list', 'Kompakt ekip listesi'), copy('Names and roles in a tidy two-column list', 'Düzenli iki sütunlu listede ad ve unvanlar'), 'light', (T, p) => band(p, grid(280, [
    `<div>${eyebrow(p, T('Who we are', 'Biz kimiz'))}${h2(p, T('Twelve specialists, one studio.', 'On iki uzman, tek stüdyo.'))}${body(p, T('Architects, engineers and a very patient project manager.', 'Mimarlar, mühendisler ve çok sabırlı bir proje yöneticisi.'), 'font-size:17px;')}</div>`,
    `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:0 28px;">${[
      ['A', 'Arda Güneş', T('Principal architect', 'Baş mimar')],
      ['L', 'Lena Frank', T('Interiors', 'İç mimari')],
      ['B', 'Berk Çelik', T('Structural engineer', 'Statik mühendisi')],
      ['M', 'Mina Özer', T('Landscape', 'Peyzaj')],
      ['T', 'Tomás Gil', T('Project manager', 'Proje yöneticisi')],
      ['D', 'Dila Sarı', T('Visualisation', 'Görselleştirme')],
    ].map(([letter, name, role]) => `<div style="padding:14px 0;border-bottom:1px solid ${p.line};">${person(p, letter, name, role, 40)}</div>`).join('')}</div>`,
  ], 48, 'align-items:start;')), [1000, 580]),

  section('team-leadership-rows', 'team', copy('Leadership rows', 'Yönetim satırları'), copy('Leaders in wide rows with photo, bio and link', 'Fotoğraf, biyografi ve bağlantıyla geniş satırlarda yöneticiler'), 'ocean', (T, p) => band(p, `
    ${head(p, T('Leadership', 'Yönetim'), T('The people accountable to you.', 'Size karşı sorumlu olan kişiler.'), '')}
    <div style="display:grid;gap:16px;">${[
      ['lead-1', 'Oya Tuncer', T('Chief Executive', 'Genel Müdür'), T('Leads strategy and spends one day a month on the support desk.', 'Stratejiyi yönetir ve ayda bir gününü destek masasında geçirir.')],
      ['lead-2', 'Henrik Lund', T('Chief Technology Officer', 'Teknoloji Direktörü'), T('Keeps the platform fast, safe and boring in the best way.', 'Platformu hızlı, güvenli ve en iyi anlamda sıkıcı tutar.')],
      ['lead-3', 'Seda Kurt', T('Chief Customer Officer', 'Müşteri Deneyimi Direktörü'), T('Makes sure every promise on this page is kept.', 'Bu sayfadaki her sözün tutulmasını sağlar.')],
    ].map(([seed, name, role, bio]) => card(p, `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:22px;"><div style="width:96px;flex-shrink:0;">${photo(seed, 200, 200, { radius: 999 })}</div><div style="flex:1 1 260px;">${h3(p, name, 'margin-bottom:2px;')}<p style="margin:0 0 8px;color:${p.accentInk};font-weight:700;font-size:14px;">${role}</p>${body(p, bio)}</div>${btn(p, T('Profile', 'Profil'), 'ghost', 'padding:10px 18px;')}</div>`, 'padding:20px 24px;')).join('')}</div>`), [1000, 730]),

  section('team-group-photo', 'team', copy('Group photo', 'Grup fotoğrafı'), copy('One wide team photo with a caption and numbers', 'Geniş ekip fotoğrafı, açıklama ve rakamlar'), 'forest', (T, p) => band(p, `
    ${photo('team-group', 1400, 620, { radius: 24, extra: 'margin-bottom:30px;' })}
    ${grid(260, [
      `<div>${h2(p, T('Forty people who love what they do.', 'Yaptığı işi seven kırk kişi.'), 'font-size:clamp(26px,3vw,36px);')}</div>`,
      `<div style="display:flex;flex-wrap:wrap;gap:30px;">${[['40', T('people', 'kişi')], ['11', T('languages', 'dil')], ['4.8', T('team rating', 'ekip puanı')]].map(([n, l]) => `<div><b style="display:block;font-size:34px;letter-spacing:-0.03em;color:${p.accentInk};">${n}</b><span style="color:${p.muted};">${l}</span></div>`).join('')}</div>`,
    ], 30, 'align-items:center;')}`), [1000, 700]),
]

export const SOCIAL_SECTIONS = [
  section('social-instagram-grid', 'social', copy('Photo feed', 'Fotoğraf akışı'), copy('Six square photos with a follow button', 'Takip düğmeli altı kare fotoğraf'), 'light', (T, p) => band(p, `
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:18px;margin-bottom:26px;">
      <div>${eyebrow(p, '@yoursite')}${h2(p, T('Follow along.', 'Bizi takip edin.'), 'margin:0;')}</div>
      ${btn(p, T('Follow on Instagram', 'Instagram’da takip edin'), 'ghost')}
    </div>
    ${grid(150, ['feed-1', 'feed-2', 'feed-3', 'feed-4', 'feed-5', 'feed-6'].map((seed) => photo(seed, 400, 400, { radius: 14 })), 10)}`), [1000, 410]),

  section('social-follow-band', 'social', copy('Follow us band', 'Takip bandı'), copy('A coloured band with round social icons', 'Yuvarlak sosyal simgeli renkli bant'), 'violet', (T, p) => band(p, `
    ${h2(p, T('Say hello on social.', 'Sosyal medyada merhaba deyin.'), 'margin-left:auto;margin-right:auto;')}
    ${body(p, T('Behind the scenes, new work and the occasional office dog.', 'Kamera arkası, yeni işler ve arada bir ofis köpeği.'), 'margin:0 auto 26px;max-width:480px;font-size:17px;')}
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px;">${SOCIAL.map(([, glyph]) => socialIcon(p, glyph, 52, true)).join('')}</div>`, { align: 'center', bg: p.soft, pad: 'clamp(48px,7vw,80px) 24px' }), [1000, 330]),

  section('social-channel-cards', 'social', copy('Channel cards', 'Kanal kartları'), copy('One card per channel with follower counts', 'Takipçi sayılarıyla kanal başına bir kart'), 'dark', (T, p) => band(p, `
    ${head(p, T('Community', 'Topluluk'), T('Join 80,000 people who build with us.', 'Bizimle üreten 80.000 kişiye katılın.'), '', 'center')}
    ${grid(220, [
      ['▶', 'YouTube', '42K', T('Weekly tutorials', 'Haftalık eğitimler')],
      ['in', 'LinkedIn', '18K', T('Company news', 'Şirket haberleri')],
      ['#', T('Forum', 'Forum'), '12K', T('Ask and answer', 'Sorun ve yanıtlayın')],
      ['IG', 'Instagram', '9K', T('Behind the scenes', 'Kamera arkası')],
    ].map(([glyph, name, count, note]) => `<a href="#" style="display:block;padding:24px;border-radius:18px;background:${p.card};border:1px solid ${p.line};text-decoration:none;text-align:left;"><span aria-hidden="true" style="display:inline-grid;place-items:center;width:44px;height:44px;border-radius:999px;background:${p.accent};color:${p.onAccent};font-weight:800;font-size:16px;">${glyph}</span><b style="display:block;margin-top:16px;color:${p.ink};font-size:17px;">${name}</b><span style="display:block;color:${p.muted};font-size:14.5px;margin-bottom:12px;">${note}</span><b style="color:${p.accentInk};font-size:24px;">${count}</b></a>`), 16)}`, { align: 'center' }), [1000, 600]),

  section('social-share-bar', 'social', copy('Share bar', 'Paylaşım çubuğu'), copy('A slim “share this page” row with icons', 'Simgeli ince “bu sayfayı paylaşın” satırı'), 'light', (T, p) => band(p, `
    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding:18px 22px;border-radius:16px;border:1px solid ${p.line};background:${p.soft};">
      <b style="color:${p.ink};">${T('Enjoyed this? Share it with a friend.', 'Beğendiniz mi? Bir arkadaşınızla paylaşın.')}</b>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">${SOCIAL.slice(1, 6).map(([, glyph]) => socialIcon(p, glyph, 38)).join('')}${btn(p, T('Copy link', 'Bağlantıyı kopyalayın'), 'soft', 'padding:9px 16px;font-size:14px;')}</div>
    </div>`, { pad: '28px 24px', max: 900 }), [1000, 140]),

  section('social-community-cta', 'social', copy('Community invite', 'Topluluk daveti'), copy('Avatars, a member count and a join button', 'Avatarlar, üye sayısı ve katıl düğmesi'), 'teal', (T, p) => band(p, `
    <div style="display:flex;justify-content:center;margin-bottom:22px;">${['A', 'K', 'M', 'S', 'D', 'E'].map((letter, i) => `<span style="margin-left:${i ? -12 : 0}px;border-radius:999px;border:3px solid ${p.bg};">${avatar(p, letter, 48, 60 * i)}</span>`).join('')}</div>
    ${h2(p, T('A friendly place to ask anything.', 'Her şeyi sorabileceğiniz samimi bir yer.'), 'margin-left:auto;margin-right:auto;')}
    ${body(p, T('Over 6,000 members share tips, answer questions and show what they have made.', '6.000’den fazla üye ipuçları paylaşıyor, soruları yanıtlıyor ve yaptıklarını gösteriyor.'), 'margin:0 auto 26px;max-width:520px;font-size:17px;')}
    <div style="display:flex;justify-content:center;">${buttons(btn(p, T('Join the community', 'Topluluğa katılın')), btn(p, T('Browse topics', 'Konulara göz atın'), 'ghost'))}</div>`, { align: 'center', max: 760 }), [1000, 460]),
]
