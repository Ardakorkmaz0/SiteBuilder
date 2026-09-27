// How things happen and how they add up: process steps, timelines and numbers.
import {
  art, band, body, btn, card, chip, copy, eyebrow, grid, h2, h3, lead, photo, section, stars,
} from './kit.js'

const head = (p, eyebrowText, title, text, align = 'left') => `
  ${eyebrowText ? eyebrow(p, eyebrowText, align) : ''}
  ${h2(p, title, align === 'center' ? 'margin-left:auto;margin-right:auto;max-width:22ch;' : 'max-width:22ch;')}
  ${text ? lead(p, text, align === 'center' ? 'margin-left:auto;margin-right:auto;margin-bottom:42px;' : 'margin-bottom:42px;') : ''}`

export const PROCESS_SECTIONS = [
  section('process-horizontal', 'process', copy('Horizontal steps', 'Yatay adımlar'), copy('Four numbered steps joined by a line', 'Bir çizgiyle birleşen dört numaralı adım'), 'light', (T, p) => band(p, `
    ${head(p, T('How it works', 'Nasıl çalışır'), T('From first call to launch day.', 'İlk görüşmeden yayın gününe.'), '', 'center')}
    <div style="position:relative;">
      <div aria-hidden="true" style="position:absolute;left:12%;right:12%;top:27px;height:2px;background:${p.line};"></div>
      ${grid(190, [
        [T('Discover', 'Keşif'), T('A call to understand your goals.', 'Hedeflerinizi anlamak için bir görüşme.')],
        [T('Plan', 'Plan'), T('A written plan with dates and costs.', 'Tarihleri ve maliyetleri içeren yazılı plan.')],
        [T('Build', 'Geliştirme'), T('Weekly previews you can comment on.', 'Yorum yapabileceğiniz haftalık önizlemeler.')],
        [T('Launch', 'Yayın'), T('Go live, then we keep improving.', 'Yayına alın; biz geliştirmeye devam ederiz.')],
      ].map(([h, t], i) => `<div style="position:relative;text-align:center;"><span style="display:inline-grid;place-items:center;width:56px;height:56px;border-radius:50%;background:${i === 0 ? p.accent : p.card};color:${i === 0 ? p.onAccent : p.accentInk};border:2px solid ${p.accent};font-weight:800;font-size:18px;margin-bottom:16px;">${i + 1}</span>${h3(p, h)}${body(p, t)}</div>`), 24)}
    </div>`, { align: 'center' }), [1000, 450]),

  section('process-vertical', 'process', copy('Vertical steps', 'Dikey adımlar'), copy('Steps down a line with a short note each', 'Bir çizgi boyunca kısa notlu adımlar'), 'soft', (T, p) => band(p, grid(300, [
    `<div>${eyebrow(p, T('The process', 'Süreç'))}${h2(p, T('What happens after you get in touch.', 'Bize ulaştıktan sonra neler olur.'))}${lead(p, T('No surprises, no jargon. Here is exactly what to expect.', 'Sürpriz yok, jargon yok. Tam olarak ne bekleyeceğiniz burada.'))}</div>`,
    `<ol style="list-style:none;margin:0;padding:0;position:relative;">${[
      [T('Day 1', '1. gün'), T('We reply', 'Yanıt veriyoruz'), T('A short email with a few questions and times to talk.', 'Birkaç soru ve görüşme saatleri içeren kısa bir e-posta.')],
      [T('Day 3', '3. gün'), T('We visit', 'Ziyaret ediyoruz'), T('We look at the space and listen to what you need.', 'Alanı inceliyor ve ihtiyaçlarınızı dinliyoruz.')],
      [T('Day 7', '7. gün'), T('You get a quote', 'Teklif alıyorsunuz'), T('A fixed price and a start date, in writing.', 'Yazılı olarak sabit fiyat ve başlangıç tarihi.')],
      [T('Week 3', '3. hafta'), T('We start', 'Başlıyoruz'), T('One team, one project lead, daily updates.', 'Tek ekip, tek proje sorumlusu, günlük bilgilendirme.')],
    ].map(([when, h, t], i, all) => `<li style="position:relative;padding:0 0 ${i === all.length - 1 ? 0 : 28}px 38px;"><span aria-hidden="true" style="position:absolute;left:0;top:4px;width:18px;height:18px;border-radius:50%;background:${p.card};border:4px solid ${p.accent};box-sizing:border-box;"></span>${i < all.length - 1 ? `<span aria-hidden="true" style="position:absolute;left:8px;top:24px;bottom:0;width:2px;background:${p.line};"></span>` : ''}<span style="font-size:13px;font-weight:800;color:${p.accentInk};">${when}</span>${h3(p, h, 'margin-top:4px;')}${body(p, t)}</li>`).join('')}</ol>`,
  ], 48, 'align-items:start;')), [1000, 600]),

  section('process-cards-dark', 'process', copy('Step cards, dark', 'Adım kartları, koyu'), copy('Three numbered cards on dark', 'Koyu zeminde üç numaralı kart'), 'dark', (T, p) => band(p, `
    ${head(p, T('Getting started', 'Başlarken'), T('Three steps, about ten minutes.', 'Üç adım, yaklaşık on dakika.'), '')}
    ${grid(260, [
      [T('Create your account', 'Hesabınızı oluşturun'), T('Sign up with your email; no card needed.', 'E-postanızla kaydolun; kart gerekmez.')],
      [T('Import your data', 'Verilerinizi aktarın'), T('Bring spreadsheets or connect your tools.', 'Tablolarınızı getirin ya da araçlarınızı bağlayın.')],
      [T('Invite the team', 'Ekibi davet edin'), T('Share a link and start working together.', 'Bir bağlantı paylaşın ve birlikte çalışmaya başlayın.')],
    ].map(([h, t], i) => card(p, `<span style="display:block;font-size:56px;font-weight:800;line-height:1;color:${p.accentInk};opacity:0.9;margin-bottom:22px;">0${i + 1}</span>${h3(p, h)}${body(p, t)}`)), 18)}`), [1000, 500]),

  section('process-with-image', 'process', copy('How it works with image', 'Görselli nasıl çalışır'), copy('Numbered steps beside a photo', 'Fotoğrafın yanında numaralı adımlar'), 'ocean', (T, p) => band(p, grid(320, [
    photo('delivery-van', 640, 700, { radius: 24, ratio: '6/7' }),
    `<div>${eyebrow(p, T('How it works', 'Nasıl çalışır'))}${h2(p, T('Fresh groceries in three steps.', 'Üç adımda taze market.'))}${[
      [T('Pick your box', 'Kutunuzu seçin'), T('Choose a size and tell us what you do not eat.', 'Bir boyut seçin ve neleri yemediğinizi söyleyin.')],
      [T('We pack it fresh', 'Taze paketliyoruz'), T('Farmers harvest the day before we deliver.', 'Çiftçiler teslimattan bir gün önce hasat eder.')],
      [T('It arrives at your door', 'Kapınıza gelir'), T('Choose a two-hour slot, skip any week.', 'İki saatlik bir aralık seçin, istediğiniz haftayı atlayın.')],
    ].map(([h, t], i) => `<div style="display:grid;grid-template-columns:48px 1fr;gap:4px 16px;margin-top:24px;"><span style="grid-row:span 2;display:grid;place-items:center;width:48px;height:48px;border-radius:14px;background:${p.accentSoft};color:${p.accentInk};font-weight:800;">${i + 1}</span>${h3(p, h, 'margin:0;')}${body(p, t)}</div>`).join('')}<div style="margin-top:30px;">${btn(p, T('Choose a box', 'Kutu seçin'))}</div></div>`,
  ], 52, 'align-items:center;')), [1000, 690]),

  section('process-onboarding', 'process', copy('Onboarding steps', 'Başlangıç adımları'), copy('Three steps, each with a small screen', 'Her biri küçük bir ekranla üç adım'), 'violet', (T, p) => band(p, `
    ${head(p, T('Onboarding', 'Başlangıç'), T('Up and running before your coffee cools.', 'Kahveniz soğumadan kullanmaya başlayın.'), '', 'center')}
    ${grid(250, [
      [T('Connect', 'Bağlayın'), T('Link your bank or upload a statement.', 'Bankanızı bağlayın ya da ekstre yükleyin.')],
      [T('Categorise', 'Kategorilere ayırın'), T('We sort your spending automatically.', 'Harcamalarınızı otomatik olarak sınıflandırırız.')],
      [T('Relax', 'Rahatlayın'), T('Get a friendly summary every Sunday.', 'Her Pazar samimi bir özet alın.')],
    ].map(([h, t], i) => `<div>${art(p, { ratio: '4/3', angle: 120 + i * 50, radius: 18, extra: 'margin-bottom:18px;' })}<span style="font-size:13px;font-weight:800;color:${p.accentInk};">${T('Step', 'Adım')} ${i + 1}</span>${h3(p, h, 'margin-top:4px;')}${body(p, t)}</div>`), 26)}`, { align: 'center' }), [1000, 640]),

  section('process-roadmap', 'process', copy('Roadmap', 'Yol haritası'), copy('Now, next and later columns', 'Şimdi, sonra ve daha sonra sütunları'), 'light', (T, p) => band(p, `
    ${head(p, T('Roadmap', 'Yol haritası'), T('What we are building next.', 'Sırada ne inşa ediyoruz.'), T('Vote on the features you want most.', 'En çok istediğiniz özelliklere oy verin.'))}
    ${grid(250, [
      [T('Now', 'Şimdi'), [T('Offline mode', 'Çevrim dışı mod'), T('Faster search', 'Daha hızlı arama')]],
      [T('Next', 'Sırada'), [T('Shared calendars', 'Ortak takvimler'), T('Custom fields', 'Özel alanlar'), T('Public API', 'Açık API')]],
      [T('Later', 'Daha sonra'), [T('Desktop app', 'Masaüstü uygulaması'), T('Automations', 'Otomasyonlar')]],
    ].map(([col, items], i) => `<div style="padding:18px;border-radius:18px;background:${p.soft};"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">${chip(p, col, i === 0 ? `background:${p.accent};color:${p.onAccent};` : '')}<span style="color:${p.muted};font-size:13px;">${items.length}</span></div>${items.map((item) => `<div style="padding:14px 16px;margin-bottom:10px;border-radius:12px;background:${p.card};border:1px solid ${p.line};display:flex;justify-content:space-between;gap:10px;"><b style="color:${p.ink};font-size:15px;">${item}</b><span style="color:${p.muted};font-size:13px;">▲ ${[42, 28, 17][i]}</span></div>`).join('')}</div>`), 16)}`), [1000, 570]),
]

export const TIMELINE_SECTIONS = [
  section('timeline-history', 'timeline', copy('Company history', 'Şirket tarihi'), copy('Years on a centred line, alternating sides', 'Ortadaki çizgide, iki yana dağılan yıllar'), 'warm', (T, p) => band(p, `
    ${head(p, T('Our history', 'Tarihçemiz'), T('Forty years, one street.', 'Kırk yıl, tek sokak.'), '', 'center')}
    <div style="position:relative;max-width:820px;margin:0 auto;">
      <div aria-hidden="true" style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:${p.line};transform:translateX(-1px);"></div>
      ${[
        ['1986', T('The first shop', 'İlk dükkân'), T('A counter, one oven and a lot of flour.', 'Bir tezgâh, bir fırın ve bolca un.')],
        ['1999', T('A second oven', 'İkinci fırın'), T('The queue finally got shorter.', 'Kuyruk sonunda kısaldı.')],
        ['2012', T('The next generation', 'Yeni kuşak'), T('Our children took over the mornings.', 'Sabahları artık çocuklarımız yönetiyor.')],
        ['2024', T('The café opens', 'Kafe açılıyor'), T('Tables, coffee and the same bread.', 'Masalar, kahve ve aynı ekmek.')],
      ].map(([year, h, t], i) => `<div style="position:relative;box-sizing:border-box;width:50%;${i % 2 ? 'margin-left:50%;padding:0 0 34px 34px;text-align:left;' : 'padding:0 34px 34px 0;text-align:right;'}"><span aria-hidden="true" style="position:absolute;top:4px;${i % 2 ? 'left:-9px' : 'right:-9px'};width:18px;height:18px;border-radius:50%;background:${p.accent};"></span><b style="display:block;font-size:24px;color:${p.accentInk};">${year}</b>${h3(p, h, 'margin:4px 0;')}${body(p, t)}</div>`).join('')}
    </div>`, { align: 'center' }), [1000, 730]),

  section('timeline-career', 'timeline', copy('Career timeline', 'Kariyer zaman çizelgesi'), copy('Roles, dates and short notes, like a CV', 'Özgeçmiş gibi roller, tarihler ve kısa notlar'), 'light', (T, p) => band(p, `
    ${head(p, T('Experience', 'Deneyim'), T('Where I have worked.', 'Nerelerde çalıştım.'), '')}
    <div style="border-left:2px solid ${p.line};padding-left:28px;">${[
      [T('2022 — now', '2022 — bugün'), T('Lead designer', 'Kıdemli tasarımcı'), 'Northwind', T('Leading design for a product used by 2 million people.', '2 milyon kişinin kullandığı bir ürünün tasarımını yönetiyorum.')],
      ['2019 — 2022', T('Product designer', 'Ürün tasarımcısı'), 'Contoso', T('Designed the mobile app from research to launch.', 'Mobil uygulamayı araştırmadan lansmana tasarladım.')],
      ['2016 — 2019', T('UI designer', 'Arayüz tasarımcısı'), 'Fabrikam', T('Built the first design system for six teams.', 'Altı ekip için ilk tasarım sistemini kurdum.')],
    ].map(([when, role, org, t]) => `<div style="position:relative;margin-bottom:30px;"><span aria-hidden="true" style="position:absolute;left:-37px;top:5px;width:16px;height:16px;border-radius:50%;background:${p.card};border:3px solid ${p.accent};"></span><span style="font-size:13px;font-weight:800;color:${p.accentInk};">${when}</span>${h3(p, `${role} · <span style="color:${p.muted};font-weight:600;">${org}</span>`, 'margin:4px 0 6px;')}${body(p, t)}</div>`).join('')}</div>`, { max: 780 }), [1000, 580]),

  section('timeline-milestones-dark', 'timeline', copy('Milestones', 'Kilometre taşları'), copy('A horizontal row of milestones on dark', 'Koyu zeminde yatay kilometre taşları'), 'dark', (T, p) => band(p, `
    ${head(p, T('Milestones', 'Kilometre taşları'), T('How far we have come.', 'Ne kadar yol aldık.'), '')}
    <div style="border-top:2px solid ${p.line};padding-top:0;">${grid(180, [
      ['2019', T('Founded in a spare room', 'Boş bir odada kuruldu')],
      ['2021', T('First 1,000 customers', 'İlk 1.000 müşteri')],
      ['2023', T('Offices in three cities', 'Üç şehirde ofis')],
      ['2025', T('Carbon neutral', 'Karbon nötr')],
      ['2026', T('100,000 users', '100.000 kullanıcı')],
    ].map(([year, t]) => `<div style="position:relative;padding-top:28px;"><span aria-hidden="true" style="position:absolute;top:-9px;left:0;width:16px;height:16px;border-radius:50%;background:${p.accent};"></span><b style="display:block;font-size:28px;color:${p.ink};margin-bottom:6px;">${year}</b>${body(p, t)}</div>`), 20)}</div>`), [1000, 450]),

  section('timeline-changelog', 'timeline', copy('Changelog', 'Sürüm notları'), copy('Release notes with version tags', 'Sürüm etiketli yayın notları'), 'soft', (T, p) => band(p, `
    ${head(p, T('Changelog', 'Sürüm notları'), T('What is new.', 'Neler yeni.'), '')}
    ${[
      ['v3.2', T('12 September 2026', '12 Eylül 2026'), T('Offline mode', 'Çevrim dışı mod'), [T('Work without a connection; changes sync when you are back.', 'Bağlantı olmadan çalışın; döndüğünüzde değişiklikler senkronize olur.'), T('Faster start-up on older phones.', 'Eski telefonlarda daha hızlı açılış.')]],
      ['v3.1', T('28 August 2026', '28 Ağustos 2026'), T('Shared views', 'Paylaşılan görünümler'), [T('Save a filter and share it with the team.', 'Bir filtreyi kaydedin ve ekiple paylaşın.'), T('Fixed a bug with duplicate reminders.', 'Tekrarlanan hatırlatıcı hatası giderildi.')]],
    ].map(([v, date, h, items]) => card(p, `<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:12px;">${chip(p, v)}<span style="color:${p.muted};font-size:14px;">${date}</span></div>${h3(p, h)}<ul style="margin:8px 0 0;padding-left:20px;color:${p.muted};line-height:1.7;">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`, 'margin-bottom:16px;')).join('')}`, { max: 820 }), [1000, 640]),

  section('timeline-project-phases', 'timeline', copy('Project phases', 'Proje aşamaları'), copy('Phases with dates and progress bars', 'Tarihli ve ilerleme çubuklu aşamalar'), 'forest', (T, p) => band(p, `
    ${head(p, T('Project status', 'Proje durumu'), T('Where the build stands today.', 'İnşaat bugün ne durumda.'), '')}
    ${[
      [T('Design and permits', 'Tasarım ve izinler'), T('Jan — Mar', 'Ocak — Mart'), 100],
      [T('Foundations', 'Temel'), T('Apr — Jun', 'Nisan — Haziran'), 100],
      [T('Structure', 'Kaba inşaat'), T('Jul — Oct', 'Temmuz — Ekim'), 65],
      [T('Interiors', 'İç mekânlar'), T('Nov — Feb', 'Kasım — Şubat'), 10],
    ].map(([h, when, pct]) => `<div style="margin-bottom:22px;"><div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;"><b style="color:${p.ink};">${h}</b><span style="color:${p.muted};font-size:14px;">${when} · ${pct}%</span></div><div style="height:10px;border-radius:999px;background:${p.soft};overflow:hidden;"><div style="width:${pct}%;height:100%;border-radius:999px;background:${p.accent};"></div></div></div>`).join('')}`, { max: 820 }), [1000, 520]),
]

export const STAT_SECTIONS = [
  section('stats-big-numbers', 'stats', copy('Big numbers', 'Büyük rakamlar'), copy('Four large figures divided by thin lines', 'İnce çizgilerle ayrılmış dört büyük rakam'), 'light', (T, p) => band(p, grid(180, [
    ['120+', T('Projects delivered', 'Teslim edilen proje')],
    ['14', T('Years in business', 'Yıllık tecrübe')],
    [T('98%', '%98'), T('Clients who return', 'Geri dönen müşteri')],
    ['9', T('Industry awards', 'Sektör ödülü')],
  ].map(([n, l], i) => `<div style="padding:10px 0 10px ${i ? '24px' : '0'};${i ? `border-left:1px solid ${p.line};` : ''}"><b style="display:block;font-size:clamp(40px,5vw,60px);line-height:1;color:${p.ink};letter-spacing:-0.03em;">${n}</b><span style="display:block;margin-top:10px;color:${p.muted};">${l}</span></div>`), 24), { pad: '64px 24px' }), [1000, 230]),

  section('stats-band-dark', 'stats', copy('Numbers band, dark', 'Rakam bandı, koyu'), copy('Centered figures on a dark band', 'Koyu bantta ortalanmış rakamlar'), 'dark', (T, p) => band(p, `
    ${h2(p, T('Trusted by teams in 40 countries.', '40 ülkede ekiplerin güvendiği araç.'), 'text-align:center;margin-bottom:40px;')}
    ${grid(160, [[T('12,000', '12.000'), T('Teams', 'Ekip')], ['1.2M', T('Tasks a day', 'Günlük görev')], [T('99.99%', '%99,99'), T('Uptime', 'Erişilebilirlik')], ['4.8', T('Average rating', 'Ortalama puan')]].map(([n, l]) => `<div style="text-align:center;"><b style="display:block;font-size:clamp(34px,4vw,48px);color:${p.accentInk};">${n}</b><span style="color:${p.muted};">${l}</span></div>`), 20)}`), [1000, 310]),

  section('stats-trend-cards', 'stats', copy('Stat cards with trend', 'Eğilimli istatistik kartları'), copy('Cards with a figure and a change indicator', 'Rakam ve değişim göstergeli kartlar'), 'soft', (T, p) => band(p, `
    ${head(p, T('This quarter', 'Bu çeyrek'), T('The numbers that matter.', 'Önemli olan rakamlar.'), '')}
    ${grid(210, [
      [T('Revenue', 'Gelir'), '€248K', '+18%', true],
      [T('New customers', 'Yeni müşteri'), '1,204', '+9%', true],
      [T('Churn', 'Kayıp oranı'), '2.1%', '−0.4%', true],
      [T('Support time', 'Destek süresi'), '3h 20m', '+12%', false],
    ].map(([l, n, d, good]) => card(p, `<span style="display:block;color:${p.muted};font-size:14px;margin-bottom:10px;">${l}</span><b style="display:block;font-size:32px;color:${p.ink};margin-bottom:10px;">${n}</b><span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:13px;font-weight:700;background:${good ? '#dcfce7' : '#fee2e2'};color:${good ? '#166534' : '#991b1b'};">${good ? '▲' : '▼'} ${d}</span>`)), 16)}`), [1000, 400]),

  section('stats-with-story', 'stats', copy('Numbers with story', 'Hikâyeli rakamlar'), copy('A heading beside a two-by-two block of figures', 'İkiye iki rakam bloğunun yanında başlık'), 'ocean', (T, p) => band(p, grid(300, [
    `<div>${eyebrow(p, T('Impact', 'Etki'))}${h2(p, T('Small changes, measured every month.', 'Her ay ölçülen küçük değişimler.'))}${lead(p, T('Since 2020 our members have planted trees, cleaned beaches and cut their energy bills.', "2020'den bu yana üyelerimiz ağaç dikti, sahilleri temizledi ve enerji faturalarını düşürdü."), 'margin-bottom:0;')}</div>`,
    grid(160, [[T('48,000', '48.000'), T('Trees planted', 'Dikilen ağaç')], ['320 t', T('Waste collected', 'Toplanan atık')], [T('2,900', '2.900'), T('Volunteers', 'Gönüllü')], [T('−31%', '−%31'), T('Energy use', 'Enerji kullanımı')]].map(([n, l]) => card(p, `<b style="display:block;font-size:34px;color:${p.accentInk};">${n}</b><span style="color:${p.muted};">${l}</span>`)), 14),
  ], 44, 'align-items:center;')), [1000, 400]),

  section('stats-progress', 'stats', copy('Progress bars', 'İlerleme çubukları'), copy('Goals with labelled progress bars', 'Etiketli ilerleme çubuklu hedefler'), 'forest', (T, p) => band(p, grid(300, [
    `<div>${eyebrow(p, T('Our goals for 2026', '2026 hedeflerimiz'))}${h2(p, T('Halfway there, and not slowing down.', 'Yolun yarısındayız ve yavaşlamıyoruz.'))}${btn(p, T('Support the campaign', 'Kampanyayı destekleyin'))}</div>`,
    `<div>${[[T('Meals served', 'Verilen öğün'), 72], [T('Families supported', 'Desteklenen aile'), 58], [T('Volunteer hours', 'Gönüllü saati'), 84], [T('Funds raised', 'Toplanan bağış'), 46]].map(([l, pct]) => `<div style="margin-bottom:20px;"><div style="display:flex;justify-content:space-between;margin-bottom:8px;"><b style="color:${p.ink};">${l}</b><span style="color:${p.accentInk};font-weight:800;">${pct}%</span></div><div style="height:12px;border-radius:999px;background:${p.card};border:1px solid ${p.line};overflow:hidden;"><div style="width:${pct}%;height:100%;background:${p.accent};border-radius:999px;"></div></div></div>`).join('')}</div>`,
  ], 44, 'align-items:center;')), [1000, 410]),

  section('stats-impact', 'stats', copy('Impact figures', 'Etki rakamları'), copy('Figures with icons, like an annual report', 'Yıllık rapor gibi ikonlu rakamlar'), 'warm', (T, p) => band(p, `
    ${head(p, T('Annual report', 'Yıllık rapor'), T('What your support made possible.', 'Desteğinizin mümkün kıldıkları.'), '', 'center')}
    ${grid(200, [['🍲', T('86,000', '86.000'), T('meals shared', 'paylaşılan öğün')], ['🏠', '1,240', T('families housed', 'barınma sağlanan aile')], ['📚', '3,600', T('children in class', 'okula devam eden çocuk')], ['🌱', '52', T('community gardens', 'topluluk bahçesi')]].map(([i, n, l]) => `<div style="text-align:center;"><span aria-hidden="true" style="display:block;font-size:34px;margin-bottom:10px;">${i}</span><b style="display:block;font-size:36px;color:${p.ink};">${n}</b><span style="color:${p.muted};">${l}</span></div>`), 24)}`, { align: 'center' }), [1000, 400]),

  section('stats-rating-summary', 'stats', copy('Rating summary', 'Puan özeti'), copy('Overall score with a star breakdown', 'Genel puan ve yıldız dağılımı'), 'light', (T, p) => band(p, grid(260, [
    `<div style="text-align:center;padding:26px;border-radius:20px;background:${p.soft};"><b style="display:block;font-size:64px;line-height:1;color:${p.ink};">4.8</b><div style="margin:10px 0 6px;">${stars(p, 5)}</div><span style="color:${p.muted};">${T('Based on 1,284 reviews', '1.284 yoruma göre')}</span></div>`,
    `<div>${[[5, 82], [4, 12], [3, 4], [2, 1], [1, 1]].map(([s, pct]) => `<div style="display:grid;grid-template-columns:44px 1fr 44px;gap:12px;align-items:center;margin-bottom:12px;"><span style="color:${p.ink};font-weight:700;">${s} ★</span><div style="height:10px;border-radius:999px;background:${p.soft};overflow:hidden;"><div style="width:${pct}%;height:100%;background:#f59e0b;"></div></div><span style="color:${p.muted};font-size:14px;text-align:right;">${pct}%</span></div>`).join('')}</div>`,
  ], 40, 'align-items:center;'), { max: 860 }), [1000, 330]),

  section('stats-strip', 'stats', copy('Stats strip', 'İstatistik şeridi'), copy('One slim row of five figures', 'Beş rakamdan oluşan ince satır'), 'violet', (T, p) => band(p, `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:20px 30px;">${[['24/7', T('support', 'destek')], ['150+', T('countries', 'ülke')], ['2M', T('users', 'kullanıcı')], ['4.9★', T('rating', 'puan')], ['0', T('ads, ever', 'reklam, asla')]].map(([n, l]) => `<div style="display:flex;align-items:baseline;gap:8px;"><b style="font-size:26px;color:${p.accentInk};">${n}</b><span style="color:${p.muted};">${l}</span></div>`).join('')}</div>`, { pad: '30px 24px', bg: p.soft }), [1000, 90]),
]
