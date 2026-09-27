// Asking for the next step: calls to action, sign-ups, contact and apps.
import {
  art, avatar, band, body, btn, buttons, card, checklist, chip, copy, eyebrow, FONT_BASE, grid, h2, h3, input, lead, photo, section, textarea,
} from './kit.js'

const centred = (inner) => `<div style="display:flex;justify-content:center;">${inner}</div>`

const field = (p, label, control) => (
  `<label style="display:grid;gap:6px;font-size:14px;font-weight:600;color:${p.ink};">${label}${control}</label>`
)

const select = (p, label, name, options) => (
  `<select name="${name}" aria-label="${label}" style="${FONT_BASE}width:100%;padding:13px 16px;border-radius:12px;border:1px solid ${p.line};background:${p.card};color:${p.ink};font-size:15px;">${options.map((option) => `<option>${option}</option>`).join('')}</select>`
)

const signup = (p, T, placeholder, cta, max = 480) => (
  `<form style="display:flex;flex-wrap:wrap;gap:10px;max-width:${max}px;"><div style="flex:1 1 220px;">${input(p, placeholder, 'email')}</div><button type="submit" style="${FONT_BASE}padding:13px 24px;border-radius:12px;border:0;background:${p.accent};color:${p.onAccent};font-weight:700;font-size:15.5px;cursor:pointer;">${cta}</button></form>`
)

const contactLine = (p, glyph, label, value) => (
  `<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:18px;"><span aria-hidden="true" style="flex-shrink:0;display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:${p.accentSoft};color:${p.accentInk};font-weight:800;">${glyph}</span><div><span style="display:block;color:${p.muted};font-size:13.5px;">${label}</span><b style="color:${p.ink};">${value}</b></div></div>`
)

const storeButton = (small, name, dark = true) => (
  `<a href="#" style="display:inline-flex;flex-direction:column;justify-content:center;padding:10px 20px;border-radius:12px;text-decoration:none;line-height:1.15;${dark ? 'background:#0f172a;color:#fff;' : 'background:#fff;color:#0f172a;'}"><small style="font-size:11px;opacity:0.75;">${small}</small><b style="font-size:16px;">${name}</b></a>`
)

export const CTA_SECTIONS = [
  section('cta-banner-solid', 'cta', copy('Solid call to action', 'Dolgun eylem çağrısı'), copy('A bold coloured band with a headline and button', 'Başlık ve düğmeli canlı renkli bant'), 'light', (T, p) => band(p, `
    <div style="padding:clamp(36px,6vw,64px);border-radius:28px;background:${p.accent};color:${p.onAccent};text-align:center;">
      <h2 style="margin:0 auto 14px;font-size:clamp(28px,4vw,44px);font-weight:800;line-height:1.1;letter-spacing:-0.02em;max-width:20ch;color:${p.onAccent};">${T('Ready when you are.', 'Siz hazır olduğunuzda biz hazırız.')}</h2>
      <p style="margin:0 auto 28px;max-width:520px;font-size:18px;line-height:1.6;opacity:0.9;">${T('Start free today and have your site live before lunch.', 'Bugün ücretsiz başlayın, siteniz öğle yemeğinden önce yayında olsun.')}</p>
      ${centred(buttons(btn(p, T('Start for free', 'Ücretsiz başlayın'), 'light'), btn(p, T('Talk to us', 'Bizimle konuşun'), 'outlineLight')))}
    </div>`, { pad: 'clamp(40px,6vw,72px) 24px' }), [1000, 480]),

  section('cta-split-image', 'cta', copy('Call to action with photo', 'Fotoğraflı eylem çağrısı'), copy('Text and buttons beside a rounded photo', 'Yuvarlatılmış fotoğrafın yanında metin ve düğmeler'), 'warm', (T, p) => band(p, card(p, grid(300, [
    `<div style="padding:clamp(8px,2vw,20px);">${eyebrow(p, T('Book a table', 'Masa ayırtın'))}${h2(p, T('Dinner is better with a view.', 'Akşam yemeği manzarayla daha güzel.'))}${lead(p, T('Reserve online in thirty seconds, or call us for groups of eight or more.', 'Otuz saniyede çevrimiçi rezervasyon yapın ya da sekiz kişi ve üzeri gruplar için bizi arayın.'))}${buttons(btn(p, T('Reserve now', 'Hemen ayırtın')), btn(p, '+90 212 555 01 01', 'ghost'))}</div>`,
    photo('cta-dinner', 700, 520, { radius: 20 }),
  ], 32, 'align-items:center;'), `padding:clamp(18px,3vw,28px);background:${p.soft};border:0;`)), [1000, 640]),

  section('cta-dark-glow', 'cta', copy('Dark call to action', 'Koyu eylem çağrısı'), copy('Centred text on a glowing dark panel', 'Parıltılı koyu panelde ortalanmış metin'), 'dark', (T, p) => band(p, `
    ${h2(p, T('Stop juggling tools. Start shipping.', 'Araçlar arasında gidip gelmeyi bırakın. Üretmeye başlayın.'), 'margin-left:auto;margin-right:auto;font-size:clamp(30px,4.4vw,50px);')}
    ${lead(p, T('Join 12,000 teams who plan, build and launch in one place.', 'Tek yerde planlayan, geliştiren ve yayına alan 12.000 ekibe katılın.'), 'margin-left:auto;margin-right:auto;')}
    ${centred(buttons(btn(p, T('Create your account', 'Hesabınızı oluşturun')), btn(p, T('Book a demo', 'Demo ayarlayın'), 'ghost')))}
    <p style="margin:20px 0 0;color:${p.muted};font-size:14px;">${T('No card needed · Cancel any time', 'Kart gerekmez · İstediğiniz zaman iptal')}</p>`, { align: 'center', max: 820, extra: `background:radial-gradient(600px 300px at 50% 110%, ${p.accent}4d, transparent 70%),${p.bg};` }), [1000, 420]),

  section('cta-inline-strip', 'cta', copy('Inline call to action', 'Satır içi eylem çağrısı'), copy('A slim bar with text on the left, button on the right', 'Solda metin, sağda düğme olan ince çubuk'), 'soft', (T, p) => band(p, `
    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px;padding:26px 30px;border-radius:20px;background:${p.card};border:1px solid ${p.line};">
      <div>${h3(p, T('Have a project in mind?', 'Aklınızda bir proje mi var?'), 'font-size:22px;margin-bottom:4px;')}${body(p, T('Tell us about it and get a quote within two days.', 'Bize anlatın, iki gün içinde teklif alın.'))}</div>
      ${btn(p, T('Get a quote', 'Teklif alın'))}
    </div>`, { pad: '32px 24px' }), [1000, 180]),

  section('cta-gradient-cards', 'cta', copy('Two-path call to action', 'İki yollu eylem çağrısı'), copy('Two cards for two kinds of visitor', 'İki tür ziyaretçi için iki kart'), 'violet', (T, p) => band(p, grid(300, [
    card(p, `${chip(p, T('For individuals', 'Bireyler için'))}${h3(p, T('Build your own site', 'Kendi sitenizi yapın'), 'font-size:24px;margin:16px 0 8px;')}${body(p, T('Pick a template, change the words and publish in minutes.', 'Bir şablon seçin, yazıları değiştirin ve dakikalar içinde yayınlayın.'), 'margin-bottom:22px;')}${btn(p, T('Start building', 'Oluşturmaya başlayın'))}`, 'padding:34px;'),
    card(p, `${chip(p, T('For companies', 'Şirketler için'), `background:rgba(255,255,255,0.18);color:${p.onAccent};`)}<h3 style="margin:16px 0 8px;font-size:24px;color:${p.onAccent};">${T('Let us build it for you', 'Sizin için biz yapalım')}</h3><p style="margin:0 0 22px;line-height:1.65;color:${p.onAccent};opacity:0.9;">${T('A dedicated team designs, writes and launches your site.', 'Özel bir ekip sitenizi tasarlar, yazar ve yayına alır.')}</p>${btn(p, T('Talk to sales', 'Satışla görüşün'), 'light')}`, `padding:34px;background:linear-gradient(135deg, ${p.accent}, ${p.accentInk});border:0;`),
  ], 20)), [1000, 430]),

  section('cta-app-download', 'cta', copy('Download the app', 'Uygulamayı indirin'), copy('Store buttons beside a drawn phone', 'Çizilmiş telefonun yanında mağaza düğmeleri'), 'ocean', (T, p) => band(p, `<div style="border-radius:28px;background:${p.accentInk};padding:clamp(30px,5vw,56px);overflow:hidden;">${grid(280, [
    `<div><h2 style="margin:0 0 14px;font-size:clamp(28px,3.6vw,40px);font-weight:800;line-height:1.12;color:#fff;">${T('Take it with you.', 'Yanınızda taşıyın.')}</h2><p style="margin:0 0 26px;font-size:17.5px;line-height:1.6;color:rgba(255,255,255,0.85);">${T('Check bookings, reply to messages and see sales from anywhere.', 'Rezervasyonları kontrol edin, mesajları yanıtlayın ve satışları her yerden görün.')}</p><div style="display:flex;flex-wrap:wrap;gap:10px;">${storeButton(T('Download on the', 'İndirin'), 'App Store', false)}${storeButton(T('Get it on', 'Hemen edinin'), 'Google Play', false)}</div></div>`,
    `<div style="display:flex;justify-content:center;"><div style="width:min(100%,220px);aspect-ratio:9/17;border-radius:36px;background:#0f172a;padding:10px;box-shadow:0 30px 60px rgba(0,0,0,0.35);"><div style="height:100%;border-radius:28px;background:linear-gradient(180deg,#ffffff,${p.accentSoft});padding:26px 14px;display:grid;align-content:start;gap:10px;"><div style="height:8px;width:50%;border-radius:6px;background:${p.accent}66;"></div><div style="padding:14px;border-radius:14px;background:${p.accent};color:#fff;font-weight:800;font-size:20px;">+12 ${T('bookings', 'rezervasyon')}</div><div style="height:44px;border-radius:12px;background:#fff;border:1px solid ${p.line};"></div><div style="height:44px;border-radius:12px;background:#fff;border:1px solid ${p.line};"></div></div></div></div>`,
  ], 28, 'align-items:center;')}</div>`, { pad: 'clamp(40px,6vw,72px) 24px' }), [1000, 710]),

  section('cta-checklist', 'cta', copy('Call to action with checklist', 'Kontrol listeli eylem çağrısı'), copy('Benefits list beside a sign-up card', 'Kayıt kartının yanında avantaj listesi'), 'forest', (T, p) => band(p, grid(300, [
    `<div>${eyebrow(p, T('Free trial', 'Ücretsiz deneme'))}${h2(p, T('Try everything for 14 days.', '14 gün boyunca her şeyi deneyin.'))}${checklist(p, [T('Every feature unlocked', 'Tüm özellikler açık'), T('Import your existing site', 'Mevcut sitenizi içe aktarın'), T('Help from a real person', 'Gerçek bir insandan yardım'), T('No card, no commitment', 'Kart yok, taahhüt yok')])}</div>`,
    card(p, `${h3(p, T('Create your free account', 'Ücretsiz hesabınızı oluşturun'), 'font-size:20px;margin-bottom:18px;')}<div style="display:grid;gap:12px;margin-bottom:16px;">${input(p, T('Full name', 'Ad soyad'), 'text', '', 'name')}${input(p, T('Work email', 'İş e-postası'), 'email')}</div>${btn(p, T('Start my trial', 'Denememi başlat'), 'solid', 'display:block;text-align:center;')}<p style="margin:14px 0 0;color:${p.muted};font-size:13px;text-align:center;">${T('By signing up you agree to our terms.', 'Kaydolarak koşullarımızı kabul etmiş olursunuz.')}</p>`, 'padding:30px;box-shadow:0 24px 60px rgba(15,23,42,0.08);'),
  ], 44, 'align-items:center;')), [1000, 470]),

  section('cta-noir-big-type', 'cta', copy('Big type call to action', 'Büyük yazılı eylem çağrısı'), copy('Huge headline with an arrow link', 'Oklu bağlantıyla dev başlık'), 'noir', (T, p) => band(p, `
    <p style="margin:0 0 18px;color:${p.muted};font-weight:600;">${T('Got an idea?', 'Bir fikriniz mi var?')}</p>
    <a href="#" style="display:inline-block;font-size:clamp(44px,9vw,120px);font-weight:900;line-height:0.95;letter-spacing:-0.045em;color:${p.ink};text-decoration:none;">${T('Let’s talk', 'Konuşalım')} <span style="color:${p.accent};">→</span></a>
    <p style="margin:26px 0 0;color:${p.muted};font-size:17px;">hello@studio.com · +44 20 7946 0000</p>`, { pad: 'clamp(70px,10vw,130px) 24px' }), [1000, 370]),

  section('cta-offer-coupon', 'cta', copy('Offer with code', 'Kodlu teklif'), copy('A discount banner with a copyable code', 'Kopyalanabilir kodlu indirim bandı'), 'rose', (T, p) => band(p, `
    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:24px;padding:clamp(26px,4vw,40px);border-radius:24px;border:2px dashed ${p.accent};background:${p.card};">
      <div><b style="display:block;font-size:clamp(34px,5vw,54px);line-height:1;letter-spacing:-0.03em;color:${p.accentInk};">−20%</b>${h3(p, T('On your first order', 'İlk siparişinizde'), 'font-size:21px;margin:10px 0 4px;')}${body(p, T('Valid until the end of the month, online and in store.', 'Ay sonuna kadar, çevrimiçi ve mağazada geçerli.'))}</div>
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;"><code style="padding:12px 18px;border-radius:12px;background:${p.accentSoft};color:${p.accentInk};font-weight:800;font-size:18px;letter-spacing:0.12em;">HELLO20</code>${btn(p, T('Shop now', 'Alışverişe başlayın'))}</div>
    </div>`, { pad: '40px 24px' }), [1000, 290]),

  section('cta-contact-people', 'cta', copy('Talk to a person', 'Bir insanla konuşun'), copy('Stacked team faces with a booking button', 'Üst üste ekip yüzleri ve randevu düğmesi'), 'soft', (T, p) => band(p, `
    <div style="display:flex;justify-content:center;margin-bottom:20px;">${['S', 'M', 'A'].map((letter, i) => `<span style="margin-left:${i ? -14 : 0}px;border-radius:999px;border:3px solid ${p.bg};">${avatar(p, letter, 56, 70 * i)}</span>`).join('')}</div>
    ${h2(p, T('Questions? Talk to our team.', 'Sorularınız mı var? Ekibimizle konuşun.'), 'margin-left:auto;margin-right:auto;')}
    ${body(p, T('Book a free 20-minute call. No sales script, just answers.', 'Ücretsiz 20 dakikalık bir görüşme ayarlayın. Satış metni yok, sadece yanıtlar.'), 'margin:0 auto 26px;max-width:480px;font-size:17px;')}
    ${centred(btn(p, T('Pick a time', 'Bir saat seçin')))}`, { align: 'center', max: 760 }), [1000, 470]),
]

export const NEWSLETTER_SECTIONS = [
  section('newsletter-centered', 'newsletter', copy('Newsletter sign-up', 'Bülten kaydı'), copy('Centred heading with an email field', 'E-posta alanlı ortalanmış başlık'), 'light', (T, p) => band(p, `
    ${h2(p, T('Get one useful email a month.', 'Ayda bir faydalı e-posta alın.'), 'margin-left:auto;margin-right:auto;')}
    ${body(p, T('Tips, new features and the occasional story. Unsubscribe with one click.', 'İpuçları, yeni özellikler ve arada bir hikâye. Tek tıkla abonelikten çıkın.'), 'margin:0 auto 26px;max-width:480px;font-size:17px;')}
    ${centred(signup(p, T, T('Your email address', 'E-posta adresiniz'), T('Subscribe', 'Abone olun')))}`, { align: 'center', max: 760, bg: p.soft }), [1000, 350]),

  section('newsletter-split-dark', 'newsletter', copy('Newsletter, dark', 'Bülten, koyu'), copy('Text on the left, form on the right, on dark', 'Koyu zeminde solda metin, sağda form'), 'dark', (T, p) => band(p, grid(300, [
    `<div>${h2(p, T('Stay in the loop.', 'Gelişmelerden haberdar olun.'), 'font-size:clamp(26px,3vw,36px);')}${body(p, T('New posts every Thursday. Join 18,000 readers.', 'Her perşembe yeni yazılar. 18.000 okura katılın.'), 'font-size:17px;')}</div>`,
    `<div>${signup(p, T, T('Email', 'E-posta'), T('Sign me up', 'Beni kaydedin'), 560)}<p style="margin:12px 0 0;color:${p.muted};font-size:13.5px;">${T('We care about your data. Read our privacy policy.', 'Verilerinize önem veriyoruz. Gizlilik politikamızı okuyun.')}</p></div>`,
  ], 36, 'align-items:center;'), { pad: 'clamp(48px,6vw,72px) 24px' }), [1000, 230]),

  section('newsletter-card-perks', 'newsletter', copy('Newsletter with perks', 'Ayrıcalıklı bülten'), copy('A card listing what subscribers get', 'Abonelerin neler kazandığını listeleyen kart'), 'warm', (T, p) => band(p, card(p, grid(260, [
    `<div>${art(p, { ratio: '4/3', radius: 18 })}</div>`,
    `<div>${eyebrow(p, T('The Sunday letter', 'Pazar mektubu'))}${h2(p, T('Recipes, stories and early access.', 'Tarifler, hikâyeler ve erken erişim.'), 'font-size:clamp(24px,2.8vw,32px);')}${checklist(p, [T('A seasonal recipe every week', 'Her hafta mevsimlik bir tarif'), T('First pick of new products', 'Yeni ürünlerde ilk seçim hakkı'), T('Members-only discounts', 'Yalnızca üyelere özel indirimler')], 'margin-bottom:22px;')}${signup(p, T, T('Your email', 'E-postanız'), T('Join free', 'Ücretsiz katılın'))}</div>`,
  ], 36, 'align-items:center;'), 'padding:clamp(22px,4vw,40px);')), [1000, 560]),

  section('newsletter-inline-minimal', 'newsletter', copy('Minimal sign-up line', 'Minimal kayıt satırı'), copy('One line of text and a small form', 'Tek satır metin ve küçük bir form'), 'light', (T, p) => band(p, `
    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:18px;padding:22px 0;border-top:1px solid ${p.line};border-bottom:1px solid ${p.line};">
      <b style="color:${p.ink};font-size:17px;">${T('Get new articles in your inbox.', 'Yeni yazılar e-posta kutunuza gelsin.')}</b>
      ${signup(p, T, T('Email address', 'E-posta adresi'), T('Subscribe', 'Abone olun'), 440)}
    </div>`, { pad: '28px 24px' }), [1000, 150]),

  section('newsletter-accent-band', 'newsletter', copy('Newsletter band', 'Bülten bandı'), copy('Full-width accent band with a white form', 'Beyaz formlu tam genişlikte renkli bant'), 'violet', (T, p) => band(p, `
    <h2 style="margin:0 auto 12px;font-size:clamp(28px,3.6vw,40px);font-weight:800;line-height:1.12;color:${p.onAccent};max-width:22ch;">${T('Be the first to know.', 'İlk siz haberdar olun.')}</h2>
    <p style="margin:0 auto 26px;max-width:460px;color:${p.onAccent};opacity:0.88;font-size:17px;line-height:1.6;">${T('New collections, restocks and events, before anyone else.', 'Yeni koleksiyonlar, yeniden stoklar ve etkinlikler, herkesten önce.')}</p>
    ${centred(`<form style="display:flex;flex-wrap:wrap;gap:8px;width:min(100%,480px);padding:6px;border-radius:16px;background:#fff;"><input type="email" name="email" placeholder="${T('Email address', 'E-posta adresi')}" aria-label="${T('Email address', 'E-posta adresi')}" style="${FONT_BASE}flex:1 1 200px;min-width:0;padding:12px 14px;border:0;outline:0;background:transparent;color:#0f172a;font-size:15px;" /><button type="submit" style="${FONT_BASE}padding:12px 22px;border:0;border-radius:12px;background:${p.accent};color:${p.onAccent};font-weight:700;font-size:15px;cursor:pointer;">${T('Notify me', 'Bana haber verin')}</button></form>`)}`, { align: 'center', bg: p.accent, pad: 'clamp(48px,7vw,80px) 24px' }), [1000, 330]),

  section('newsletter-waitlist', 'newsletter', copy('Waiting list', 'Bekleme listesi'), copy('Launch date, sign-up and a count of people waiting', 'Lansman tarihi, kayıt ve bekleyen kişi sayısı'), 'teal', (T, p) => band(p, `
    ${chip(p, T('Launching this autumn', 'Bu sonbahar yayında'))}
    ${h2(p, T('Something new is coming.', 'Yeni bir şey geliyor.'), 'margin:18px auto 12px;font-size:clamp(30px,4.4vw,48px);')}
    ${body(p, T('Leave your email and we will send you an invite the day we open.', 'E-postanızı bırakın, açıldığımız gün size davet gönderelim.'), 'margin:0 auto 26px;max-width:480px;font-size:17px;')}
    ${centred(signup(p, T, T('you@example.com', 'siz@ornek.com'), T('Join the waitlist', 'Bekleme listesine katılın')))}
    <p style="margin:20px 0 0;color:${p.muted};font-size:14px;">${T('3,120 people are already on the list', '3.120 kişi şimdiden listede')}</p>`, { align: 'center', max: 760 }), [1000, 490]),
]

export const CONTACT_SECTIONS = [
  section('contact-form-split', 'contact', copy('Contact form with details', 'Bilgili iletişim formu'), copy('Address, phone and email beside a form', 'Formun yanında adres, telefon ve e-posta'), 'light', (T, p) => band(p, grid(300, [
    `<div>${eyebrow(p, T('Contact', 'İletişim'))}${h2(p, T('Let’s talk about your project.', 'Projeniz hakkında konuşalım.'))}${lead(p, T('We reply to every message within one working day.', 'Her mesaja bir iş günü içinde yanıt veriyoruz.'))}${contactLine(p, '✉', T('Email', 'E-posta'), 'hello@example.com')}${contactLine(p, '☎', T('Phone', 'Telefon'), '+90 212 555 01 01')}${contactLine(p, '⌂', T('Studio', 'Stüdyo'), T('Moda Cd. 21, Kadıköy, Istanbul', 'Moda Cd. 21, Kadıköy, İstanbul'))}</div>`,
    card(p, `<form style="display:grid;gap:14px;">${grid(180, [field(p, T('Name', 'Ad'), input(p, T('Your name', 'Adınız'), 'text', '', 'name')), field(p, T('Email', 'E-posta'), input(p, T('you@example.com', 'siz@ornek.com'), 'email'))], 14)}${field(p, T('Subject', 'Konu'), select(p, T('Subject', 'Konu'), 'subject', [T('A new website', 'Yeni bir web sitesi'), T('Redesign', 'Yeniden tasarım'), T('Something else', 'Başka bir şey')]))}${field(p, T('Message', 'Mesaj'), textarea(p, T('Tell us a little about it', 'Bize biraz anlatın'), 5))}<button type="submit" style="${FONT_BASE}padding:14px;border-radius:12px;border:0;background:${p.accent};color:${p.onAccent};font-weight:700;font-size:15.5px;cursor:pointer;">${T('Send message', 'Mesajı gönderin')}</button></form>`, 'padding:28px;'),
  ], 44, 'align-items:start;')), [1000, 590]),

  section('contact-cards', 'contact', copy('Contact cards', 'İletişim kartları'), copy('Three ways to get in touch', 'Ulaşmanın üç yolu'), 'soft', (T, p) => band(p, `
    ${h2(p, T('How can we help?', 'Nasıl yardımcı olabiliriz?'), 'margin-left:auto;margin-right:auto;')}
    ${body(p, T('Choose whatever suits you best.', 'Size en uygun olanı seçin.'), 'margin-bottom:34px;font-size:17px;')}
    ${grid(240, [
      ['✉', T('Email us', 'Bize yazın'), T('For general questions', 'Genel sorular için'), 'hello@example.com'],
      ['☎', T('Call us', 'Bizi arayın'), T('Mon–Fri, 9:00–18:00', 'Pzt–Cum, 09.00–18.00'), '+90 212 555 01 01'],
      ['✆', T('Chat with us', 'Bizimle yazışın'), T('Replies in minutes', 'Dakikalar içinde yanıt'), T('Start a chat', 'Sohbet başlatın')],
    ].map(([glyph, title, note, action]) => card(p, `<span aria-hidden="true" style="display:inline-grid;place-items:center;width:52px;height:52px;border-radius:16px;background:${p.accentSoft};color:${p.accentInk};font-size:22px;margin-bottom:16px;">${glyph}</span>${h3(p, title)}${body(p, note, 'margin-bottom:14px;')}<a href="#" style="color:${p.accentInk};font-weight:700;text-decoration:none;">${action}</a>`, 'text-align:center;')), 18)}`, { align: 'center' }), [1000, 490]),

  section('contact-map', 'contact', copy('Map and address', 'Harita ve adres'), copy('A drawn map with the address and hours', 'Adres ve saatlerle çizilmiş harita'), 'forest', (T, p) => band(p, grid(300, [
    `<div style="position:relative;aspect-ratio:4/3;border-radius:22px;overflow:hidden;background:${p.soft};border:1px solid ${p.line};" role="img" aria-label="${T('Map showing our location', 'Konumumuzu gösteren harita')}">
      <div style="position:absolute;inset:0;background-image:linear-gradient(${p.line} 2px, transparent 2px),linear-gradient(90deg, ${p.line} 2px, transparent 2px);background-size:56px 56px;"></div>
      <div style="position:absolute;left:-10%;right:-10%;top:48%;height:22px;background:#ffffff;transform:rotate(-12deg);border-top:1px solid ${p.line};border-bottom:1px solid ${p.line};"></div>
      <div style="position:absolute;left:34%;top:-10%;bottom:-10%;width:18px;background:#ffffff;transform:rotate(8deg);"></div>
      <div style="position:absolute;right:8%;top:8%;width:30%;height:26%;border-radius:18px;background:${p.accentSoft};"></div>
      <div style="position:absolute;left:50%;top:42%;transform:translate(-50%,-100%);display:grid;justify-items:center;"><span style="padding:6px 12px;border-radius:10px;background:${p.ink};color:${p.bg};font-size:13px;font-weight:700;margin-bottom:6px;white-space:nowrap;">${T('We are here', 'Buradayız')}</span><span style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${p.accent};border:3px solid #fff;"></span></div>
    </div>`,
    `<div>${eyebrow(p, T('Visit us', 'Bizi ziyaret edin'))}${h2(p, T('Come and say hello.', 'Gelin, merhaba deyin.'))}${contactLine(p, '⌂', T('Address', 'Adres'), T('Garden Street 8, Old Town', 'Bahçe Sokak 8, Eski Şehir'))}${contactLine(p, '◷', T('Hours', 'Saatler'), T('Tue–Sun, 10:00–19:00', 'Sal–Paz, 10.00–19.00'))}${contactLine(p, '☎', T('Phone', 'Telefon'), '+90 232 555 22 11')}${btn(p, T('Get directions', 'Yol tarifi alın'))}</div>`,
  ], 44, 'align-items:center;')), [1000, 510]),

  section('contact-dark-simple', 'contact', copy('Simple contact form, dark', 'Basit iletişim formu, koyu'), copy('A short centred form on a dark background', 'Koyu zeminde ortalanmış kısa form'), 'dark', (T, p) => band(p, `
    ${h2(p, T('Send us a message.', 'Bize bir mesaj gönderin.'), 'margin-left:auto;margin-right:auto;')}
    ${body(p, T('We usually reply the same day.', 'Genellikle aynı gün yanıt veriyoruz.'), 'margin-bottom:30px;font-size:17px;')}
    <form style="display:grid;gap:12px;text-align:left;">${grid(200, [input(p, T('Name', 'Ad'), 'text', '', 'name'), input(p, T('Email', 'E-posta'), 'email')], 12)}${textarea(p, T('Your message', 'Mesajınız'), 5)}<button type="submit" style="${FONT_BASE}justify-self:start;padding:13px 28px;border-radius:12px;border:0;background:${p.accent};color:${p.onAccent};font-weight:700;font-size:15.5px;cursor:pointer;">${T('Send', 'Gönderin')}</button></form>`, { align: 'center', max: 640 }), [1000, 510]),

  section('contact-offices', 'contact', copy('Office locations', 'Ofis konumları'), copy('Several offices with city, address and phone', 'Şehir, adres ve telefonla birden fazla ofis'), 'ocean', (T, p) => band(p, `
    ${eyebrow(p, T('Offices', 'Ofisler'))}${h2(p, T('Find us in three cities.', 'Bizi üç şehirde bulun.'))}
    ${grid(240, [
      ['office-ist', T('Istanbul', 'İstanbul'), T('Levent Cd. 10, Beşiktaş', 'Levent Cd. 10, Beşiktaş'), '+90 212 555 01 01'],
      ['office-ber', T('Berlin', 'Berlin'), 'Torstraße 140, Mitte', '+49 30 555 0101'],
      ['office-lis', T('Lisbon', 'Lizbon'), 'Rua Augusta 55, Baixa', '+351 21 555 0101'],
    ].map(([seed, city, address, phone]) => `<div>${photo(seed, 600, 400, { radius: 16, extra: 'margin-bottom:14px;' })}${h3(p, city)}${body(p, address)}<a href="#" style="display:inline-block;margin-top:8px;color:${p.accentInk};font-weight:700;text-decoration:none;">${phone}</a></div>`), 24, 'margin-top:28px;')}`), [1000, 560]),

  section('contact-booking', 'contact', copy('Appointment request', 'Randevu talebi'), copy('Date, time and service pickers in one card', 'Tek kartta tarih, saat ve hizmet seçimi'), 'rose', (T, p) => band(p, grid(300, [
    `<div>${eyebrow(p, T('Appointments', 'Randevular'))}${h2(p, T('Request an appointment.', 'Randevu talep edin.'))}${body(p, T('Choose a day and time that suits you. We will confirm by text message within the hour.', 'Size uygun bir gün ve saat seçin. Bir saat içinde kısa mesajla onaylayalım.'), 'font-size:17px;margin-bottom:20px;')}${checklist(p, [T('Free cancellation up to 24 hours before', '24 saat öncesine kadar ücretsiz iptal'), T('Reminder the day before', 'Bir gün önce hatırlatma')])}</div>`,
    card(p, `<form style="display:grid;gap:14px;">${field(p, T('Service', 'Hizmet'), select(p, T('Service', 'Hizmet'), 'service', [T('Consultation', 'Ön görüşme'), T('Treatment', 'Tedavi'), T('Follow-up', 'Kontrol')]))}${grid(150, [field(p, T('Date', 'Tarih'), input(p, T('Date', 'Tarih'), 'date')), field(p, T('Time', 'Saat'), input(p, T('Time', 'Saat'), 'time'))], 12)}${field(p, T('Phone', 'Telefon'), input(p, '+90 5xx xxx xx xx', 'tel'))}<button type="submit" style="${FONT_BASE}padding:14px;border-radius:12px;border:0;background:${p.accent};color:${p.onAccent};font-weight:700;font-size:15.5px;cursor:pointer;">${T('Request appointment', 'Randevu talep edin')}</button></form>`, 'padding:28px;'),
  ], 44, 'align-items:center;')), [1000, 520]),

  section('contact-support-hub', 'contact', copy('Support hub', 'Destek merkezi'), copy('Help links, status and contact in one band', 'Yardım bağlantıları, durum ve iletişim tek bantta'), 'soft', (T, p) => band(p, grid(240, [
    card(p, `${h3(p, T('Help centre', 'Yardım merkezi'))}${body(p, T('Step-by-step guides for everything.', 'Her konuda adım adım rehberler.'), 'margin-bottom:16px;')}<a href="#" style="color:${p.accentInk};font-weight:700;text-decoration:none;">${T('Browse guides →', 'Rehberlere göz atın →')}</a>`),
    card(p, `${h3(p, T('System status', 'Sistem durumu'))}<p style="display:flex;align-items:center;gap:8px;margin:0 0 16px;color:${p.ink};font-weight:600;"><span style="width:10px;height:10px;border-radius:50%;background:#16a34a;"></span>${T('All systems running', 'Tüm sistemler çalışıyor')}</p><a href="#" style="color:${p.accentInk};font-weight:700;text-decoration:none;">${T('Status page →', 'Durum sayfası →')}</a>`),
    card(p, `${h3(p, T('Contact support', 'Destekle iletişime geçin'))}${body(p, T('Average reply time: 2 hours.', 'Ortalama yanıt süresi: 2 saat.'), 'margin-bottom:16px;')}${btn(p, T('Open a ticket', 'Talep oluşturun'), 'solid', 'padding:10px 18px;font-size:14.5px;')}`),
  ], 16)), [1000, 360]),

  section('contact-quote-form', 'contact', copy('Quote request form', 'Teklif talep formu'), copy('Budget, timeline and project type options', 'Bütçe, zaman çizelgesi ve proje türü seçenekleri'), 'violet', (T, p) => band(p, `
    ${h2(p, T('Tell us what you need.', 'Neye ihtiyacınız olduğunu anlatın.'), 'margin-left:auto;margin-right:auto;')}
    ${body(p, T('A few details help us send an accurate quote.', 'Birkaç ayrıntı doğru bir teklif göndermemize yardımcı olur.'), 'margin-bottom:30px;font-size:17px;')}
    ${card(p, `<form style="display:grid;gap:22px;text-align:left;">
      <fieldset style="border:0;margin:0;padding:0;"><legend style="margin-bottom:10px;font-weight:700;color:${p.ink};">${T('Project type', 'Proje türü')}</legend><div style="display:flex;flex-wrap:wrap;gap:8px;">${[T('Website', 'Web sitesi'), T('Online shop', 'Çevrimiçi mağaza'), T('Branding', 'Marka'), T('App', 'Uygulama')].map((label, i) => `<label style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;border:1.5px solid ${i === 0 ? p.accent : p.line};background:${i === 0 ? p.accentSoft : p.card};color:${p.ink};font-weight:600;font-size:14.5px;cursor:pointer;"><input type="checkbox" name="type" value="${label}"${i === 0 ? ' checked' : ''} style="accent-color:${p.accent};" />${label}</label>`).join('')}</div></fieldset>
      <fieldset style="border:0;margin:0;padding:0;"><legend style="margin-bottom:10px;font-weight:700;color:${p.ink};">${T('Budget', 'Bütçe')}</legend><div style="display:flex;flex-wrap:wrap;gap:8px;">${['< €2k', '€2k–5k', '€5k–15k', '€15k+'].map((label, i) => `<label style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;border:1.5px solid ${i === 1 ? p.accent : p.line};background:${i === 1 ? p.accentSoft : p.card};color:${p.ink};font-weight:600;font-size:14.5px;cursor:pointer;"><input type="radio" name="budget" value="${label}"${i === 1 ? ' checked' : ''} style="accent-color:${p.accent};" />${label}</label>`).join('')}</div></fieldset>
      ${grid(200, [input(p, T('Name', 'Ad'), 'text', '', 'name'), input(p, T('Email', 'E-posta'), 'email')], 12)}
      <button type="submit" style="${FONT_BASE}padding:14px;border-radius:12px;border:0;background:${p.accent};color:${p.onAccent};font-weight:700;font-size:15.5px;cursor:pointer;">${T('Request a quote', 'Teklif isteyin')}</button>
    </form>`, 'padding:clamp(22px,4vw,34px);')}`, { align: 'center', max: 760 }), [1000, 640]),
]

export const APP_SECTIONS = [
  section('apps-integrations', 'apps', copy('Integrations grid', 'Entegrasyon ızgarası'), copy('Tiles for the tools you connect', 'Bağladığınız araçlar için kutular'), 'light', (T, p) => band(p, `
    ${eyebrow(p, T('Integrations', 'Entegrasyonlar'), 'center')}
    ${h2(p, T('Works with the tools you already use.', 'Zaten kullandığınız araçlarla çalışır.'), 'margin-left:auto;margin-right:auto;')}
    ${body(p, T('Connect in a click. No code, no copy-and-paste.', 'Tek tıkla bağlayın. Kod yok, kopyala-yapıştır yok.'), 'margin-bottom:34px;font-size:17px;')}
    ${grid(200, [
      ['¤', T('Payments', 'Ödemeler'), '#6366f1'], ['✉', T('Email marketing', 'E-posta pazarlama'), '#f59e0b'], ['◷', T('Calendar', 'Takvim'), '#3b82f6'], ['∑', T('Accounting', 'Muhasebe'), '#06b6d4'],
      ['✆', T('Team chat', 'Ekip sohbeti'), '#a855f7'], ['▤', T('File storage', 'Dosya depolama'), '#0ea5e9'], ['☰', T('Forms', 'Formlar'), '#ef4444'], ['+', T('And 80 more', 've 80 tane daha'), p.accent],
    ].map(([glyph, name, colour]) => `<div style="display:flex;align-items:center;gap:12px;padding:16px;border-radius:16px;background:${p.card};border:1px solid ${p.line};text-align:left;"><span aria-hidden="true" style="display:grid;place-items:center;width:40px;height:40px;border-radius:11px;background:${colour}24;color:${colour};font-weight:900;font-size:18px;">${glyph}</span><b style="color:${p.ink};font-size:15px;">${name}</b></div>`), 12)}`, { align: 'center' }), [1000, 470]),

  section('apps-feature-phone', 'apps', copy('App features with phone', 'Telefonlu uygulama özellikleri'), copy('Features on both sides of a drawn phone', 'Çizilmiş telefonun iki yanında özellikler'), 'violet', (T, p) => {
    const feature = (glyph, title, text) => `<div style="margin-bottom:26px;"><span aria-hidden="true" style="display:inline-grid;place-items:center;width:44px;height:44px;border-radius:13px;background:${p.accentSoft};color:${p.accentInk};font-weight:800;margin-bottom:10px;">${glyph}</span>${h3(p, title, 'font-size:17px;')}${body(p, text)}</div>`
    return band(p, `
      ${h2(p, T('Everything in your pocket.', 'Her şey cebinizde.'), 'margin-left:auto;margin-right:auto;text-align:center;')}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:30px;align-items:center;margin-top:36px;">
        <div>${feature('◷', T('Book in seconds', 'Saniyeler içinde randevu'), T('Pick a time with two taps.', 'İki dokunuşla bir saat seçin.'))}${feature('♡', T('Save favourites', 'Favorileri kaydedin'), T('Your usual order, one tap away.', 'Her zamanki siparişiniz bir dokunuş uzağınızda.'))}</div>
        <div style="display:flex;justify-content:center;"><div style="width:min(100%,230px);aspect-ratio:9/18;border-radius:38px;background:#111827;padding:10px;box-shadow:0 30px 70px ${p.accent}40;"><div style="height:100%;border-radius:30px;background:linear-gradient(180deg,${p.accentSoft},#ffffff);padding:26px 14px;display:grid;align-content:start;gap:10px;"><div style="height:8px;width:40%;border-radius:6px;background:${p.accent}66;"></div>${[1, 2, 3].map((i) => `<div style="display:flex;gap:10px;align-items:center;padding:10px;border-radius:12px;background:#fff;"><span style="width:28px;height:28px;border-radius:8px;background:${p.accent}${['', '99', '55'][i - 1]};"></span><span style="flex:1;height:8px;border-radius:6px;background:#e2e8f0;"></span></div>`).join('')}</div></div></div>
        <div>${feature('✓', T('Pay in the app', 'Uygulamada ödeyin'), T('Cards and wallets, no queue.', 'Kartlar ve cüzdanlar, sıra yok.'))}${feature('✦', T('Earn rewards', 'Ödül kazanın'), T('Every tenth visit is on us.', 'Her onuncu ziyaret bizden.'))}</div>
      </div>`, { bg: p.soft })
  }, [1000, 770]),

  section('apps-download-qr', 'apps', copy('Download with QR code', 'QR kodlu indirme'), copy('Store buttons beside a scannable code', 'Taranabilir kodun yanında mağaza düğmeleri'), 'dark', (T, p) => band(p, `
    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:30px;padding:clamp(26px,4vw,40px);border-radius:24px;background:${p.card};border:1px solid ${p.line};">
      <div style="flex:1 1 300px;">${h2(p, T('Get the app.', 'Uygulamayı edinin.'), 'font-size:clamp(26px,3vw,36px);')}${body(p, T('Scan the code with your phone camera, or pick your store.', 'Kodu telefon kameranızla tarayın ya da mağazanızı seçin.'), 'margin-bottom:22px;font-size:17px;')}<div style="display:flex;flex-wrap:wrap;gap:10px;">${storeButton(T('Download on the', 'İndirin'), 'App Store', false)}${storeButton(T('Get it on', 'Hemen edinin'), 'Google Play', false)}</div></div>
      <div role="img" aria-label="${T('QR code', 'QR kod')}" style="flex-shrink:0;width:150px;height:150px;padding:12px;border-radius:18px;background:#fff;display:grid;grid-template-columns:repeat(7,1fr);gap:3px;">${'1111111100100110111011011101001101111000110010110011011110101101111101'.slice(0, 49).split('').map((bit) => `<span style="border-radius:2px;background:${bit === '1' ? '#0f172a' : 'transparent'};"></span>`).join('')}</div>
    </div>`, { pad: 'clamp(40px,6vw,64px) 24px' }), [1000, 380]),

  section('apps-screens-row', 'apps', copy('App screens', 'Uygulama ekranları'), copy('Three phone screens in a row with captions', 'Açıklamalarıyla yan yana üç telefon ekranı'), 'teal', (T, p) => band(p, `
    ${h2(p, T('Designed for one hand.', 'Tek elle kullanım için tasarlandı.'), 'margin-left:auto;margin-right:auto;')}
    ${body(p, T('Big buttons, clear text and nothing you do not need.', 'Büyük düğmeler, net yazılar ve ihtiyacınız olmayan hiçbir şey.'), 'margin-bottom:40px;font-size:17px;')}
    ${grid(200, [T('Today at a glance', 'Bir bakışta bugün'), T('Plan your week', 'Haftanızı planlayın'), T('See your progress', 'İlerlemenizi görün')].map((caption, i) => `<div><div style="width:min(100%,200px);margin:0 auto 16px;aspect-ratio:9/18;border-radius:32px;background:#000;padding:8px;${i === 1 ? `box-shadow:0 30px 60px ${p.accent}40;` : ''}"><div style="height:100%;border-radius:25px;background:linear-gradient(${160 + i * 30}deg, ${p.card}, ${p.accent}55);padding:22px 12px;display:grid;align-content:start;gap:8px;"><div style="height:7px;width:46%;border-radius:6px;background:${p.accent};"></div><div style="height:${60 + i * 18}px;border-radius:12px;background:${p.accentSoft};"></div><div style="height:30px;border-radius:10px;background:${p.accentSoft};"></div><div style="height:30px;border-radius:10px;background:${p.accentSoft};"></div></div></div><b style="color:${p.ink};">${caption}</b></div>`), 24)}`, { align: 'center' }), [1000, 780]),
]
