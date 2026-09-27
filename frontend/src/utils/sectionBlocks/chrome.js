// The frame around a page: headers, banners, footers and the odd utility
// page (not found, coming soon). Headers wrap instead of collapsing into a
// menu button, so they stay usable on a phone without any script.
import {
  art, band, body, btn, buttons, chip, copy, eyebrow, FONT_BASE, grid, h1, h2, input, section,
} from './kit.js'

const brand = (p, name, mark = '◆') => (
  `<a href="#" style="display:inline-flex;align-items:center;gap:9px;font-weight:800;font-size:19px;letter-spacing:-0.01em;color:${p.ink};text-decoration:none;"><span aria-hidden="true" style="display:inline-grid;place-items:center;width:32px;height:32px;border-radius:10px;background:${p.accent};color:${p.onAccent};font-size:15px;">${mark}</span>${name}</a>`
)

const links = (p, items, extra = '', active = -1) => (
  `<nav style="display:flex;flex-wrap:wrap;gap:4px 22px;${extra}">${items.map((label, i) => `<a href="#" style="color:${i === active ? p.ink : p.muted};font-weight:${i === active ? 700 : 600};font-size:15px;text-decoration:none;">${label}</a>`).join('')}</nav>`
)

const bar = (p, inner, extra = '') => (
  `<header style="${FONT_BASE}padding:16px 24px;background:${p.bg};color:${p.ink};border-bottom:1px solid ${p.line};${extra}"><div style="max-width:1120px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px 24px;">${inner}</div></header>`
)

const NAV = (T) => [T('Home', 'Ana sayfa'), T('Services', 'Hizmetler'), T('Work', 'İşler'), T('About', 'Hakkımızda'), T('Contact', 'İletişim')]

const footerColumn = (p, title, items) => (
  `<div><b style="display:block;margin-bottom:14px;color:${p.ink};font-size:14.5px;">${title}</b><ul style="list-style:none;margin:0;padding:0;display:grid;gap:10px;">${items.map((item) => `<li><a href="#" style="color:${p.muted};text-decoration:none;font-size:14.5px;">${item}</a></li>`).join('')}</ul></div>`
)

const socialRow = (p, size = 36) => (
  `<div style="display:flex;gap:8px;">${['IG', 'in', 'X', '▶'].map((glyph) => `<a href="#" aria-label="${glyph}" style="display:inline-grid;place-items:center;width:${size}px;height:${size}px;border-radius:999px;border:1px solid ${p.line};color:${p.ink};text-decoration:none;font-weight:800;font-size:${Math.round(size * 0.36)}px;">${glyph}</a>`).join('')}</div>`
)

const footer = (p, inner, extra = '') => (
  `<footer style="${FONT_BASE}padding:clamp(48px,6vw,72px) 24px 28px;background:${p.bg};color:${p.ink};${extra}"><div style="max-width:1120px;margin:0 auto;">${inner}</div></footer>`
)

const legal = (p, T, year = '2026', name = 'Studio North') => (
  `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;margin-top:40px;padding-top:22px;border-top:1px solid ${p.line};color:${p.muted};font-size:13.5px;"><span>© ${year} ${name}. ${T('All rights reserved.', 'Tüm hakları saklıdır.')}</span><span style="display:flex;flex-wrap:wrap;gap:18px;"><a href="#" style="color:inherit;text-decoration:none;">${T('Privacy', 'Gizlilik')}</a><a href="#" style="color:inherit;text-decoration:none;">${T('Terms', 'Koşullar')}</a><a href="#" style="color:inherit;text-decoration:none;">${T('Cookies', 'Çerezler')}</a></span></div>`
)

export const HEADER_SECTIONS = [
  section('header-simple', 'header', copy('Simple header', 'Basit üst menü'), copy('Logo, links and one button', 'Logo, bağlantılar ve bir düğme'), 'light', (T, p) => bar(p, `
    ${brand(p, 'Studio North')}
    ${links(p, NAV(T), '', 0)}
    ${btn(p, T('Get in touch', 'İletişime geçin'), 'solid', 'padding:10px 20px;font-size:14.5px;')}`), [1000, 80]),

  section('header-centered-logo', 'header', copy('Centred logo header', 'Ortalanmış logolu üst menü'), copy('Links split either side of a central logo', 'Ortadaki logonun iki yanına bölünmüş bağlantılar'), 'warm', (T, p) => bar(p, `
    ${links(p, [T('Menu', 'Menü'), T('Wine', 'Şarap'), T('Events', 'Etkinlikler')], 'flex:1 1 200px;')}
    <a href="#" style="font-family:Georgia,serif;font-size:26px;font-weight:700;font-style:italic;color:${p.ink};text-decoration:none;">Olivo</a>
    <div style="flex:1 1 200px;display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:6px 22px;">${links(p, [T('Private dining', 'Özel yemek'), T('Contact', 'İletişim')])}${btn(p, T('Book', 'Rezervasyon'), 'solid', 'padding:9px 18px;font-size:14px;')}</div>`, 'border-bottom:0;padding:20px 24px;'), [1000, 80]),

  section('header-dark', 'header', copy('Dark header', 'Koyu üst menü'), copy('Logo, links, sign-in link and button on dark', 'Koyu zeminde logo, bağlantılar, giriş bağlantısı ve düğme'), 'dark', (T, p) => bar(p, `
    ${brand(p, 'Orbitly', '◎')}
    ${links(p, [T('Product', 'Ürün'), T('Pricing', 'Fiyatlar'), T('Customers', 'Müşteriler'), T('Docs', 'Belgeler')])}
    <div style="display:flex;align-items:center;gap:16px;"><a href="#" style="color:${p.ink};font-weight:600;font-size:15px;text-decoration:none;">${T('Sign in', 'Giriş yapın')}</a>${btn(p, T('Start free', 'Ücretsiz başlayın'), 'solid', 'padding:10px 18px;font-size:14.5px;')}</div>`), [1000, 80]),

  section('header-with-topbar', 'header', copy('Header with top bar', 'Üst şeritli menü'), copy('Contact details above the main navigation', 'Ana menünün üstünde iletişim bilgileri'), 'ocean', (T, p) => `
    <div style="${FONT_BASE}padding:8px 24px;background:${p.accentInk};color:#fff;font-size:13.5px;"><div style="max-width:1120px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 20px;"><span>☎ +90 212 555 01 01 · ✉ info@example.com</span><span>${T('Mon–Sat 8:00–18:00', 'Pzt–Cmt 08.00–18.00')}</span></div></div>
    ${bar(p, `${brand(p, T('Harbour Clinic', 'Liman Kliniği'), '+')}${links(p, [T('Treatments', 'Tedaviler'), T('Doctors', 'Doktorlar'), T('Prices', 'Fiyatlar'), T('Contact', 'İletişim')])}${btn(p, T('Book an appointment', 'Randevu alın'), 'solid', 'padding:10px 18px;font-size:14.5px;')}`)}`, [1000, 110]),

  section('header-shop', 'header', copy('Shop header', 'Mağaza üst menüsü'), copy('Search field, account and cart with a count', 'Arama alanı, hesap ve adetli sepet'), 'light', (T, p) => bar(p, `
    ${brand(p, 'Linen & Co.', 'L')}
    <form role="search" style="flex:1 1 260px;max-width:420px;">${input(p, T('Search products', 'Ürün arayın'), 'search', `padding:10px 16px;border-radius:999px;background:${p.soft};`)}</form>
    <div style="display:flex;align-items:center;gap:18px;">
      <a href="#" style="color:${p.ink};font-weight:600;font-size:15px;text-decoration:none;">${T('Account', 'Hesabım')}</a>
      <a href="#" style="display:inline-flex;align-items:center;gap:8px;color:${p.ink};font-weight:700;font-size:15px;text-decoration:none;">${T('Cart', 'Sepet')} <span style="display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:${p.accent};color:${p.onAccent};font-size:12.5px;">2</span></a>
    </div>`), [1000, 80]),

  section('header-pill', 'header', copy('Floating pill header', 'Yüzen hap menü'), copy('A rounded menu bar floating over the page', 'Sayfanın üzerinde yüzen yuvarlak menü çubuğu'), 'violet', (T, p) => `
    <div style="${FONT_BASE}padding:18px 16px;background:${p.soft};"><div style="max-width:980px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 22px;padding:10px 10px 10px 20px;border-radius:999px;background:${p.card};border:1px solid ${p.line};box-shadow:0 14px 34px rgba(31,21,53,0.1);">
      ${brand(p, 'Nimbus', '☁')}
      ${links(p, [T('Features', 'Özellikler'), T('Pricing', 'Fiyatlar'), T('Blog', 'Blog')])}
      ${btn(p, T('Try it free', 'Ücretsiz deneyin'), 'solid', 'padding:10px 20px;border-radius:999px;font-size:14.5px;')}
    </div></div>`, [1000, 100]),

  section('header-editorial', 'header', copy('Editorial masthead', 'Editoryal künye'), copy('Large title with date and sections below', 'Büyük başlık, altında tarih ve bölümler'), 'light', (T, p) => `
    <header style="${FONT_BASE}padding:22px 24px 0;background:${p.bg};color:${p.ink};text-align:center;">
      <div style="max-width:1120px;margin:0 auto;">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;color:${p.muted};font-size:13px;"><span>${T('Tuesday, 12 May 2026', '12 Mayıs 2026, Salı')}</span><a href="#" style="color:${p.accentInk};font-weight:700;text-decoration:none;">${T('Subscribe', 'Abone olun')}</a></div>
        <a href="#" style="display:block;margin:10px 0 16px;font-family:Georgia,serif;font-size:clamp(34px,6vw,64px);font-weight:700;letter-spacing:-0.02em;color:${p.ink};text-decoration:none;">The Harbour Review</a>
        <div style="border-top:3px double ${p.ink};border-bottom:1px solid ${p.line};padding:12px 0;">${links(p, [T('News', 'Haberler'), T('Culture', 'Kültür'), T('Food', 'Yemek'), T('Travel', 'Seyahat'), T('Opinion', 'Görüş'), T('Podcasts', 'Podcast')], 'justify-content:center;')}</div>
      </div>
    </header>`, [1000, 180]),

  section('header-noir-minimal', 'header', copy('Minimal header, dark', 'Minimal üst menü, koyu'), copy('A name on the left and three words on the right', 'Solda bir ad, sağda üç kelime'), 'noir', (T, p) => bar(p, `
    <a href="#" style="font-weight:900;font-size:20px;letter-spacing:-0.03em;color:${p.ink};text-decoration:none;">m.kaya<span style="color:${p.accent};">.</span></a>
    ${links(p, [T('Work', 'İşler'), T('About', 'Hakkımda'), T('Contact', 'İletişim')], 'gap:4px 28px;')}`, 'border-bottom:0;padding:22px 24px;'), [1000, 70]),
]

export const BANNER_SECTIONS = [
  section('banner-announcement', 'banner', copy('Announcement bar', 'Duyuru çubuğu'), copy('A thin coloured strip with a link', 'Bağlantılı ince renkli şerit'), 'light', (T, p) => `
    <div style="${FONT_BASE}padding:10px 24px;background:${p.accent};color:${p.onAccent};text-align:center;font-size:14.5px;font-weight:600;">${T('Free delivery on orders over €50 this week.', 'Bu hafta €50 üzeri siparişlerde teslimat ücretsiz.')} <a href="#" style="color:inherit;font-weight:800;">${T('Shop now →', 'Alışverişe başlayın →')}</a></div>`, [1000, 40]),

  section('banner-cookie', 'banner', copy('Cookie notice', 'Çerez bildirimi'), copy('A consent card with accept and settings buttons', 'Kabul ve ayar düğmeli onay kartı'), 'light', (T, p) => `
    <div style="${FONT_BASE}padding:18px 16px;background:transparent;"><div role="dialog" aria-label="${T('Cookie settings', 'Çerez ayarları')}" style="max-width:760px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:16px 22px;padding:20px 22px;border-radius:18px;background:${p.card};border:1px solid ${p.line};box-shadow:0 20px 50px rgba(15,23,42,0.14);color:${p.ink};">
      <p style="flex:1 1 320px;margin:0;font-size:14.5px;line-height:1.6;color:${p.muted};"><b style="color:${p.ink};">${T('We use cookies.', 'Çerez kullanıyoruz.')}</b> ${T('Some are needed for the site to work; others help us understand how it is used.', 'Bazıları sitenin çalışması için gerekli; diğerleri nasıl kullanıldığını anlamamıza yardımcı olur.')} <a href="#" style="color:${p.accentInk};">${T('Read more', 'Devamını okuyun')}</a></p>
      ${buttons(btn(p, T('Settings', 'Ayarlar'), 'ghost', 'padding:10px 18px;font-size:14.5px;'), btn(p, T('Accept all', 'Tümünü kabul edin'), 'solid', 'padding:10px 18px;font-size:14.5px;'))}
    </div></div>`, [1000, 150]),

  section('banner-promo-dark', 'banner', copy('Promotion banner, dark', 'Kampanya bandı, koyu'), copy('Sale headline with a countdown chip and button', 'Geri sayım etiketi ve düğmeli indirim başlığı'), 'noir', (T, p) => band(p, `
    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:18px;">
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:14px;"><b style="font-size:clamp(22px,3vw,30px);letter-spacing:-0.02em;">${T('Summer sale: up to 40% off', 'Yaz indirimi: %40’a varan')}</b>${chip(p, T('Ends in 2 days', '2 gün kaldı'))}</div>
      ${btn(p, T('See the offers', 'Fırsatları görün'))}
    </div>`, { pad: '26px 24px' }), [1000, 100]),

  section('banner-info-alert', 'banner', copy('Notice banner', 'Bilgi bandı'), copy('An information strip with an icon and close link', 'Simge ve kapatma bağlantılı bilgi şeridi'), 'soft', (T, p) => `
    <div style="${FONT_BASE}padding:14px 24px;background:${p.accentSoft};color:${p.ink};border-bottom:1px solid ${p.line};"><div style="max-width:1120px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;">
      <span aria-hidden="true" style="display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:${p.accent};color:${p.onAccent};font-weight:900;font-size:14px;">i</span>
      <p style="flex:1 1 300px;margin:0;font-size:14.5px;line-height:1.5;">${T('Our shop is closed on 1 May. Online orders will ship on 2 May.', 'Mağazamız 1 Mayıs’ta kapalıdır. Çevrimiçi siparişler 2 Mayıs’ta kargolanacaktır.')}</p>
      <a href="#" style="color:${p.accentInk};font-weight:700;font-size:14px;text-decoration:none;">${T('Dismiss', 'Kapat')}</a>
    </div></div>`, [1000, 60]),

  section('banner-gradient-launch', 'banner', copy('Launch banner', 'Lansman bandı'), copy('A gradient strip announcing something new', 'Yeni bir şeyi duyuran degrade şerit'), 'violet', (T, p) => `
    <div style="${FONT_BASE}padding:12px 24px;background:linear-gradient(90deg, ${p.accentInk}, #db2777);color:#fff;text-align:center;font-size:14.5px;"><span style="display:inline-block;margin-right:10px;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,0.2);font-weight:800;font-size:12.5px;">${T('New', 'Yeni')}</span>${T('Version 3.0 is here, with a faster editor and dark mode.', 'Sürüm 3.0 yayında: daha hızlı düzenleyici ve koyu mod.')} <a href="#" style="color:#fff;font-weight:800;">${T('See what’s new', 'Yenilikleri görün')}</a></div>`, [1000, 50]),

  section('banner-app-install', 'banner', copy('App install prompt', 'Uygulama yükleme önerisi'), copy('A small bar suggesting the mobile app', 'Mobil uygulamayı öneren küçük çubuk'), 'light', (T, p) => `
    <div style="${FONT_BASE}padding:12px 16px;background:${p.soft};border-bottom:1px solid ${p.line};"><div style="max-width:760px;margin:0 auto;display:flex;align-items:center;gap:12px;">
      <span aria-hidden="true" style="flex-shrink:0;display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:${p.accent};color:${p.onAccent};font-weight:900;">◆</span>
      <div style="flex:1;min-width:0;"><b style="display:block;color:${p.ink};font-size:14.5px;">${T('Get the app', 'Uygulamayı edinin')}</b><span style="color:${p.muted};font-size:13px;">${T('Faster booking, offline tickets', 'Daha hızlı rezervasyon, çevrimdışı biletler')}</span></div>
      ${btn(p, T('Open', 'Aç'), 'solid', 'padding:8px 16px;border-radius:999px;font-size:14px;')}
    </div></div>`, [1000, 70]),
]

export const FOOTER_SECTIONS = [
  section('footer-columns', 'footer', copy('Footer with columns', 'Sütunlu alt bilgi'), copy('Brand, four link columns and a legal line', 'Marka, dört bağlantı sütunu ve yasal satır'), 'light', (T, p) => footer(p, `
    ${grid(160, [
      `<div>${brand(p, 'Studio North')}${body(p, T('Websites and brands for small businesses.', 'Küçük işletmeler için web siteleri ve markalar.'), 'margin-top:14px;font-size:14.5px;')}</div>`,
      footerColumn(p, T('Studio', 'Stüdyo'), [T('About', 'Hakkımızda'), T('Team', 'Ekip'), T('Careers', 'Kariyer')]),
      footerColumn(p, T('Services', 'Hizmetler'), [T('Websites', 'Web siteleri'), T('Branding', 'Marka'), T('Content', 'İçerik')]),
      footerColumn(p, T('Resources', 'Kaynaklar'), [T('Blog', 'Blog'), T('Guides', 'Rehberler'), T('Help', 'Yardım')]),
      footerColumn(p, T('Contact', 'İletişim'), ['hello@example.com', '+90 212 555 01 01']),
    ], 30)}
    ${legal(p, T)}`, `border-top:1px solid ${p.line};`), [1000, 300]),

  section('footer-dark-newsletter', 'footer', copy('Footer with sign-up, dark', 'Kayıtlı alt bilgi, koyu'), copy('Newsletter form, link columns and social icons', 'Bülten formu, bağlantı sütunları ve sosyal simgeler'), 'dark', (T, p) => footer(p, `
    ${grid(260, [
      `<div>${brand(p, 'Orbitly', '◎')}<p style="margin:16px 0 14px;color:${p.muted};font-size:14.5px;line-height:1.6;">${T('Get product news once a month.', 'Ürün haberlerini ayda bir alın.')}</p><form style="display:flex;flex-wrap:wrap;gap:8px;"><div style="flex:1 1 180px;">${input(p, T('Email', 'E-posta'), 'email', 'padding:11px 14px;')}</div><button type="submit" style="${FONT_BASE}padding:11px 18px;border:0;border-radius:12px;background:${p.accent};color:${p.onAccent};font-weight:700;cursor:pointer;">${T('Join', 'Katılın')}</button></form></div>`,
      grid(130, [
        footerColumn(p, T('Product', 'Ürün'), [T('Features', 'Özellikler'), T('Pricing', 'Fiyatlar'), T('Changelog', 'Değişiklikler')]),
        footerColumn(p, T('Company', 'Şirket'), [T('About', 'Hakkımızda'), T('Careers', 'Kariyer'), T('Press', 'Basın')]),
        footerColumn(p, T('Support', 'Destek'), [T('Help centre', 'Yardım merkezi'), T('Status', 'Durum'), T('Contact', 'İletişim')]),
      ], 24),
    ], 44)}
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px;margin-top:40px;padding-top:22px;border-top:1px solid ${p.line};"><span style="color:${p.muted};font-size:13.5px;">© 2026 Orbitly Inc.</span>${socialRow(p)}</div>`), [1000, 320]),

  section('footer-minimal-center', 'footer', copy('Minimal centred footer', 'Minimal ortalanmış alt bilgi'), copy('Logo, a row of links and copyright', 'Logo, bir bağlantı satırı ve telif hakkı'), 'soft', (T, p) => footer(p, `
    <div style="display:grid;justify-items:center;gap:20px;text-align:center;">
      ${brand(p, 'Nimbus', '☁')}
      ${links(p, NAV(T), 'justify-content:center;')}
      ${socialRow(p)}
      <span style="color:${p.muted};font-size:13.5px;">© 2026 Nimbus. ${T('Made with care in Izmir.', 'İzmir’de özenle yapıldı.')}</span>
    </div>`, `background:${p.soft};`), [1000, 260]),

  section('footer-big-cta', 'footer', copy('Footer with big call to action', 'Büyük eylem çağrılı alt bilgi'), copy('Huge closing line above slim footer links', 'İnce alt bağlantıların üstünde dev kapanış satırı'), 'noir', (T, p) => footer(p, `
    <p style="margin:0 0 10px;color:${p.muted};">${T('Have a project in mind?', 'Aklınızda bir proje mi var?')}</p>
    <a href="#" style="display:inline-block;margin-bottom:48px;font-size:clamp(30px,8vw,104px);font-weight:900;line-height:0.95;letter-spacing:-0.045em;overflow-wrap:anywhere;color:${p.ink};text-decoration:none;">hello@studio.com <span style="color:${p.accent};">↗</span></a>
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:18px;padding-top:22px;border-top:1px solid ${p.line};">${links(p, ['Instagram', 'LinkedIn', 'Dribbble', 'Behance'])}<span style="color:${p.muted};font-size:13.5px;">© 2026 Studio North</span></div>`), [1000, 290]),

  section('footer-restaurant', 'footer', copy('Restaurant footer', 'Restoran alt bilgisi'), copy('Address, opening hours and reservations', 'Adres, çalışma saatleri ve rezervasyon'), 'warm', (T, p) => footer(p, `
    ${grid(220, [
      `<div><a href="#" style="font-family:Georgia,serif;font-size:28px;font-weight:700;font-style:italic;color:${p.ink};text-decoration:none;">Olivo</a>${body(p, T('Seasonal cooking from the Aegean coast.', 'Ege kıyısından mevsimlik mutfak.'), 'margin-top:10px;font-size:14.5px;')}</div>`,
      `<div><b style="display:block;margin-bottom:12px;font-size:14.5px;">${T('Find us', 'Bizi bulun')}</b>${body(p, T('Kordon Boyu 14, Alsancak, Izmir', 'Kordon Boyu 14, Alsancak, İzmir'), 'font-size:14.5px;')}<a href="#" style="display:inline-block;margin-top:8px;color:${p.accentInk};font-weight:700;text-decoration:none;font-size:14.5px;">${T('Get directions →', 'Yol tarifi alın →')}</a></div>`,
      `<div><b style="display:block;margin-bottom:12px;font-size:14.5px;">${T('Hours', 'Saatler')}</b>${body(p, `${T('Tue–Sun', 'Sal–Paz')} 12:00–23:00<br/>${T('Monday closed', 'Pazartesi kapalı')}`, 'font-size:14.5px;')}</div>`,
      `<div><b style="display:block;margin-bottom:12px;font-size:14.5px;">${T('Reservations', 'Rezervasyon')}</b>${body(p, '+90 232 555 22 11', 'font-size:14.5px;margin-bottom:12px;')}${btn(p, T('Book a table', 'Masa ayırtın'), 'solid', 'padding:10px 18px;font-size:14.5px;')}</div>`,
    ], 30)}
    ${legal(p, T, '2026', 'Olivo')}`, `border-top:1px solid ${p.line};`), [1000, 400]),

  section('footer-shop', 'footer', copy('Shop footer', 'Mağaza alt bilgisi'), copy('Service promises above help and shop links', 'Yardım ve mağaza bağlantılarının üstünde hizmet vaatleri'), 'light', (T, p) => footer(p, `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:14px;margin-bottom:40px;">${[['⇄', T('Free returns', 'Ücretsiz iade'), T('Within 30 days', '30 gün içinde')], ['⛟', T('Fast delivery', 'Hızlı teslimat'), T('In 1–2 working days', '1–2 iş gününde')], ['✓', T('Secure payment', 'Güvenli ödeme'), T('Cards and wallets', 'Kartlar ve cüzdanlar')]].map(([glyph, title, note]) => `<div style="display:flex;gap:12px;align-items:center;padding:16px;border-radius:14px;background:${p.soft};"><span aria-hidden="true" style="display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:${p.accentSoft};color:${p.accentInk};font-weight:800;">${glyph}</span><span><b style="display:block;font-size:14.5px;">${title}</b><span style="color:${p.muted};font-size:13px;">${note}</span></span></div>`).join('')}</div>
    ${grid(150, [
      footerColumn(p, T('Shop', 'Mağaza'), [T('New in', 'Yeni gelenler'), T('Bestsellers', 'Çok satanlar'), T('Gift cards', 'Hediye kartları')]),
      footerColumn(p, T('Help', 'Yardım'), [T('Shipping', 'Kargo'), T('Returns', 'İadeler'), T('Size guide', 'Beden rehberi')]),
      footerColumn(p, T('About', 'Hakkında'), [T('Our story', 'Hikâyemiz'), T('Stores', 'Mağazalar'), T('Journal', 'Günlük')]),
      `<div><b style="display:block;margin-bottom:14px;font-size:14.5px;">${T('Follow us', 'Bizi takip edin')}</b>${socialRow(p)}</div>`,
    ], 26)}
    ${legal(p, T, '2026', 'Linen & Co.')}`, `border-top:1px solid ${p.line};`), [1000, 390]),

  section('footer-accent', 'footer', copy('Colour footer', 'Renkli alt bilgi'), copy('A footer on the accent colour with contact details', 'Vurgu renginde iletişim bilgili alt bilgi'), 'forest', (T, p) => `
    <footer style="${FONT_BASE}padding:clamp(48px,6vw,72px) 24px 28px;background:${p.accentInk};color:#fff;"><div style="max-width:1120px;margin:0 auto;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:30px;">
        <div><b style="font-size:22px;">${T('Green Hands Gardening', 'Yeşil Eller Bahçıvanlık')}</b><p style="margin:12px 0 0;line-height:1.6;color:rgba(255,255,255,0.82);font-size:14.5px;">${T('Garden design and care since 2009.', '2009’dan beri bahçe tasarımı ve bakımı.')}</p></div>
        <div style="display:grid;gap:8px;font-size:14.5px;"><b>${T('Contact', 'İletişim')}</b><a href="#" style="color:#fff;text-decoration:none;">hello@greenhands.example</a><a href="#" style="color:#fff;text-decoration:none;">+90 216 555 33 44</a></div>
        <div style="display:grid;gap:8px;font-size:14.5px;"><b>${T('Service area', 'Hizmet bölgesi')}</b><span style="color:rgba(255,255,255,0.82);">${T('Kadıköy, Üsküdar, Ataşehir and nearby', 'Kadıköy, Üsküdar, Ataşehir ve çevresi')}</span></div>
      </div>
      <div style="margin-top:40px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.22);font-size:13.5px;color:rgba(255,255,255,0.78);">© 2026 ${T('Green Hands Gardening', 'Yeşil Eller Bahçıvanlık')}</div>
    </div></footer>`, [1000, 230]),

  section('footer-app', 'footer', copy('App footer', 'Uygulama alt bilgisi'), copy('Store buttons, links and language picker', 'Mağaza düğmeleri, bağlantılar ve dil seçici'), 'violet', (T, p) => footer(p, `
    ${grid(220, [
      `<div>${brand(p, 'Pocketly', '◉')}${body(p, T('The budgeting app for real life.', 'Gerçek hayat için bütçe uygulaması.'), 'margin:14px 0 18px;font-size:14.5px;')}<div style="display:flex;flex-wrap:wrap;gap:8px;">${['App Store', 'Google Play'].map((store) => `<a href="#" style="padding:9px 16px;border-radius:10px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700;font-size:13.5px;">${store}</a>`).join('')}</div></div>`,
      footerColumn(p, T('App', 'Uygulama'), [T('Features', 'Özellikler'), T('Security', 'Güvenlik'), T('Pricing', 'Fiyatlar')]),
      footerColumn(p, T('Company', 'Şirket'), [T('About', 'Hakkımızda'), T('Blog', 'Blog'), T('Careers', 'Kariyer')]),
    ], 30)}
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:14px;margin-top:40px;padding-top:22px;border-top:1px solid ${p.line};"><span style="color:${p.muted};font-size:13.5px;">© 2026 Pocketly</span><select name="language" aria-label="${T('Language', 'Dil')}" style="${FONT_BASE}padding:8px 12px;border-radius:10px;border:1px solid ${p.line};background:${p.card};color:${p.ink};font-size:14px;"><option>English</option><option>Türkçe</option><option>Deutsch</option></select></div>`, `background:${p.soft};`), [1000, 310]),

  section('footer-sitemap', 'footer', copy('Large sitemap footer', 'Geniş site haritalı alt bilgi'), copy('Six columns of links for bigger sites', 'Büyük siteler için altı bağlantı sütunu'), 'dark', (T, p) => footer(p, `
    ${grid(120, [
      footerColumn(p, T('Products', 'Ürünler'), [T('Websites', 'Web siteleri'), T('Online shop', 'Çevrimiçi mağaza'), T('Bookings', 'Rezervasyonlar'), T('Email', 'E-posta')]),
      footerColumn(p, T('Solutions', 'Çözümler'), [T('Restaurants', 'Restoranlar'), T('Clinics', 'Klinikler'), T('Studios', 'Stüdyolar'), T('Shops', 'Mağazalar')]),
      footerColumn(p, T('Resources', 'Kaynaklar'), [T('Templates', 'Şablonlar'), T('Guides', 'Rehberler'), T('Webinars', 'Web seminerleri'), T('Blog', 'Blog')]),
      footerColumn(p, T('Support', 'Destek'), [T('Help centre', 'Yardım merkezi'), T('Community', 'Topluluk'), T('Status', 'Durum'), T('Contact', 'İletişim')]),
      footerColumn(p, T('Company', 'Şirket'), [T('About', 'Hakkımızda'), T('Careers', 'Kariyer'), T('Press', 'Basın'), T('Partners', 'Ortaklar')]),
      footerColumn(p, T('Legal', 'Yasal'), [T('Privacy', 'Gizlilik'), T('Terms', 'Koşullar'), T('Cookies', 'Çerezler'), T('Accessibility', 'Erişilebilirlik')]),
    ], 24)}
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px;margin-top:44px;padding-top:22px;border-top:1px solid ${p.line};">${brand(p, 'Buildwell', 'B')}<span style="color:${p.muted};font-size:13.5px;">© 2026 Buildwell Ltd.</span>${socialRow(p, 34)}</div>`), [1000, 490]),

  section('footer-personal', 'footer', copy('Personal site footer', 'Kişisel site alt bilgisi'), copy('A friendly sign-off with email and links', 'E-posta ve bağlantılarla samimi bir kapanış'), 'rose', (T, p) => footer(p, `
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:24px;">
      <div>${h2(p, T('Thanks for stopping by.', 'Uğradığınız için teşekkürler.'), 'font-size:clamp(24px,3vw,34px);')}<a href="#" style="color:${p.accentInk};font-weight:700;font-size:17px;">hello@elifdesign.example</a></div>
      ${links(p, ['Instagram', 'LinkedIn', T('Newsletter', 'Bülten'), T('Résumé', 'Özgeçmiş')])}
    </div>
    <p style="margin:36px 0 0;color:${p.muted};font-size:13.5px;">© 2026 Elif Aydın</p>`, `border-top:1px solid ${p.line};`), [1000, 210]),
]

export const UTILITY_SECTIONS = [
  section('utility-404', 'utility', copy('Page not found', 'Sayfa bulunamadı'), copy('A friendly 404 with a way back', 'Geri dönüş yolu sunan samimi bir 404'), 'light', (T, p) => band(p, `
    <p style="margin:0 0 10px;font-size:clamp(80px,16vw,160px);font-weight:900;line-height:1;letter-spacing:-0.06em;color:${p.accent};">404</p>
    ${h2(p, T('This page has wandered off.', 'Bu sayfa kaybolmuş.'), 'margin-left:auto;margin-right:auto;')}
    ${body(p, T('The link may be old, or the page may have moved. Let’s get you back on track.', 'Bağlantı eski olabilir ya da sayfa taşınmış olabilir. Sizi doğru yola geri götürelim.'), 'margin:0 auto 28px;max-width:460px;font-size:17px;')}
    <div style="display:flex;justify-content:center;">${buttons(btn(p, T('Back to home', 'Ana sayfaya dönün')), btn(p, T('Contact us', 'Bize ulaşın'), 'ghost'))}</div>`, { align: 'center', max: 760 }), [1000, 520]),

  section('utility-coming-soon', 'utility', copy('Coming soon', 'Çok yakında'), copy('A launch page with sign-up and countdown', 'Kayıt ve geri sayımlı lansman sayfası'), 'teal', (T, p) => band(p, `
    ${chip(p, T('Opening this spring', 'Bu bahar açılıyor'))}
    ${h1(p, T('Something good is brewing.', 'Güzel bir şeyler demleniyor.'), 'margin:20px auto 16px;max-width:16ch;')}
    ${body(p, T('A small coffee roastery with a big window onto the street. Leave your email and we will invite you to the opening.', 'Sokağa açılan büyük bir camı olan küçük bir kahve kavurma evi. E-postanızı bırakın, sizi açılışa davet edelim.'), 'margin:0 auto 28px;max-width:500px;font-size:17px;')}
    <form style="display:flex;flex-wrap:wrap;gap:10px;max-width:460px;margin:0 auto 30px;"><div style="flex:1 1 220px;">${input(p, T('Your email address', 'E-posta adresiniz'), 'email')}</div><button type="submit" style="${FONT_BASE}padding:13px 24px;border:0;border-radius:12px;background:${p.accent};color:${p.onAccent};font-weight:700;font-size:15.5px;cursor:pointer;">${T('Notify me', 'Bana haber verin')}</button></form>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;">${[['32', T('days', 'gün')], ['14', T('hours', 'saat')], ['05', T('minutes', 'dakika')]].map(([n, l]) => `<div style="min-width:84px;padding:14px 8px;border-radius:14px;background:${p.card};border:1px solid ${p.line};"><b style="display:block;font-size:30px;font-variant-numeric:tabular-nums;">${n}</b><span style="color:${p.muted};font-size:13px;">${l}</span></div>`).join('')}</div>`, { align: 'center', max: 820, pad: 'clamp(70px,10vw,120px) 24px', extra: `background:radial-gradient(700px 400px at 50% 0%, ${p.accent}2e, transparent 65%),${p.bg};` }), [1000, 630]),

  section('utility-breadcrumbs', 'utility', copy('Breadcrumbs and title', 'İçerik haritası ve başlık'), copy('A page title with the path above it', 'Üstünde yol bilgisi olan sayfa başlığı'), 'soft', (T, p) => band(p, `
    <nav aria-label="${T('Breadcrumb', 'İçerik haritası')}" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;font-size:14px;color:${p.muted};"><a href="#" style="color:${p.muted};text-decoration:none;">${T('Home', 'Ana sayfa')}</a><span aria-hidden="true">/</span><a href="#" style="color:${p.muted};text-decoration:none;">${T('Services', 'Hizmetler')}</a><span aria-hidden="true">/</span><span style="color:${p.ink};font-weight:600;" aria-current="page">${T('Garden design', 'Bahçe tasarımı')}</span></nav>
    ${h1(p, T('Garden design', 'Bahçe tasarımı'), 'font-size:clamp(32px,4.6vw,52px);')}
    ${body(p, T('From a first sketch to the last plant in the ground.', 'İlk eskizden toprağa dikilen son bitkiye kadar.'), 'font-size:18px;max-width:560px;')}`, { pad: 'clamp(40px,6vw,64px) 24px', bg: p.soft }), [1000, 250]),

  section('utility-pagination', 'utility', copy('Pagination', 'Sayfalama'), copy('Previous, page numbers and next', 'Önceki, sayfa numaraları ve sonraki'), 'light', (T, p) => band(p, `
    <nav aria-label="${T('Pages', 'Sayfalar')}" style="display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px;">
      <a href="#" style="padding:9px 14px;border-radius:10px;border:1px solid ${p.line};color:${p.ink};text-decoration:none;font-weight:600;font-size:14.5px;">← ${T('Previous', 'Önceki')}</a>
      ${['1', '2', '3', '…', '9'].map((n, i) => (n === '…' ? `<span style="padding:9px 8px;color:${p.muted};">…</span>` : `<a href="#"${i === 1 ? ' aria-current="page"' : ''} style="display:inline-grid;place-items:center;min-width:40px;height:40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14.5px;${i === 1 ? `background:${p.accent};color:${p.onAccent};` : `color:${p.ink};`}">${n}</a>`)).join('')}
      <a href="#" style="padding:9px 14px;border-radius:10px;border:1px solid ${p.line};color:${p.ink};text-decoration:none;font-weight:600;font-size:14.5px;">${T('Next', 'Sonraki')} →</a>
    </nav>`, { pad: '32px 24px' }), [1000, 110]),

  section('utility-maintenance', 'utility', copy('Maintenance notice', 'Bakım bildirimi'), copy('A calm “back soon” page on dark', 'Koyu zeminde sakin bir “yakında döneceğiz” sayfası'), 'dark', (T, p) => band(p, `
    <div style="width:min(220px,60%);margin:0 auto 28px;">${art(p, { ratio: '1/1', radius: 999 })}</div>
    ${h2(p, T('We’ll be back shortly.', 'Kısa süre içinde döneceğiz.'), 'margin-left:auto;margin-right:auto;')}
    ${body(p, T('We are making a few improvements. The site will be available again at 14:00.', 'Birkaç iyileştirme yapıyoruz. Site saat 14.00’te yeniden erişilebilir olacak.'), 'margin:0 auto 22px;max-width:460px;font-size:17px;')}
    <p style="margin:0;color:${p.muted};font-size:14.5px;">${T('Urgent?', 'Acil mi?')} <a href="#" style="color:${p.accentInk};font-weight:700;">support@example.com</a></p>`, { align: 'center', max: 700 }), [1000, 560]),

  section('utility-thank-you', 'utility', copy('Thank you message', 'Teşekkür mesajı'), copy('A confirmation after a form or order', 'Form ya da sipariş sonrası onay'), 'forest', (T, p) => band(p, `
    <span aria-hidden="true" style="display:inline-grid;place-items:center;width:76px;height:76px;border-radius:50%;background:${p.accent};color:${p.onAccent};font-size:36px;font-weight:900;margin-bottom:22px;">✓</span>
    ${eyebrow(p, T('Order #10482', 'Sipariş #10482'), 'center')}
    ${h2(p, T('Thank you! Your order is on its way.', 'Teşekkürler! Siparişiniz yola çıktı.'), 'margin-left:auto;margin-right:auto;')}
    ${body(p, T('We have sent a confirmation to your email. You will get a tracking link as soon as it ships.', 'Onayı e-postanıza gönderdik. Gönderildiği anda bir takip bağlantısı alacaksınız.'), 'margin:0 auto 28px;max-width:480px;font-size:17px;')}
    <div style="display:flex;justify-content:center;">${buttons(btn(p, T('Continue shopping', 'Alışverişe devam edin')), btn(p, T('View order', 'Siparişi görüntüleyin'), 'ghost'))}</div>`, { align: 'center', max: 760 }), [1000, 480]),
]
