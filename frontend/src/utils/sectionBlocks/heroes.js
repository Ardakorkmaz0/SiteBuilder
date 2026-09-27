// Opening sections: the first thing a visitor reads.
import {
  art, band, body, btn, buttons, card, checklist, chip, copy, eyebrow, FONT_BASE, grid, h1, input, lead, photo, section,
} from './kit.js'

export const HERO_SECTIONS = [
  section('hero-centered-badge', 'hero', copy('Centered hero', 'Ortalanmış hero'), copy('Badge, headline, two buttons and a trust line', 'Rozet, başlık, iki düğme ve güven satırı'), 'light', (T, p) => band(p, `
    ${chip(p, T('New · Spring collection is live', 'Yeni · Bahar koleksiyonu yayında'))}
    ${h1(p, T('Build something people remember.', 'İnsanların hatırlayacağı bir şey yapın.'), 'margin-top:22px;')}
    ${lead(p, T('A short sentence that says what you offer and who it is for, in plain words.', 'Ne sunduğunuzu ve kimin için olduğunu sade kelimelerle anlatan kısa bir cümle.'), 'margin-left:auto;margin-right:auto;')}
    <div style="display:flex;justify-content:center;">${buttons(btn(p, T('Get started', 'Hemen başlayın')), btn(p, T('See how it works', 'Nasıl çalıştığını görün'), 'ghost'))}</div>
    <p style="margin:22px 0 0;color:${p.muted};font-size:14px;">${T('Free for 14 days · No card needed', '14 gün ücretsiz · Kart gerekmez')}</p>`, { align: 'center', max: 820, extra: `background:radial-gradient(900px 400px at 50% -10%, ${p.accent}1f, transparent 60%),${p.bg};` }), [1000, 520]),

  section('hero-split-photo', 'hero', copy('Split hero with photo', 'Fotoğraflı bölünmüş hero'), copy('Message and benefits beside a photo', 'Fotoğrafın yanında mesaj ve avantajlar'), 'light', (T, p) => band(p, grid(320, [
    `<div>
      ${eyebrow(p, T('Design studio', 'Tasarım stüdyosu'))}
      ${h1(p, T('Websites that feel as good as they look.', 'Göründüğü kadar iyi hissettiren web siteleri.'))}
      ${lead(p, T('We plan, design and build sites that load fast, read clearly and turn visitors into customers.', 'Hızlı açılan, kolay okunan ve ziyaretçileri müşteriye dönüştüren siteleri planlıyor, tasarlıyor ve geliştiriyoruz.'), 'margin-bottom:22px;')}
      ${checklist(p, [T('Launch in weeks, not months', 'Aylar değil haftalar içinde yayında'), T('Built to be edited by your team', 'Ekibinizin düzenleyebileceği şekilde kurulur'), T('Support after launch', 'Yayından sonra da destek')], 'margin-bottom:26px;')}
      ${buttons(btn(p, T('Book a call', 'Görüşme ayarlayın')), btn(p, T('See our work', 'Çalışmalarımızı görün'), 'ghost'))}
    </div>`,
    photo('studio-desk', 720, 600, { radius: 24, extra: 'box-shadow:0 30px 70px rgba(15,23,42,0.18);' }),
  ], 48, 'align-items:center;')), [1000, 780]),

  section('hero-dark-signup', 'hero', copy('Dark hero with sign-up', 'Kayıt formlu koyu hero'), copy('Glowing dark opening with an email field', 'E-posta alanlı, parıltılı koyu açılış'), 'dark', (T, p) => band(p, `
    ${chip(p, T('Early access', 'Erken erişim'))}
    ${h1(p, T('The calm way to run your whole week.', 'Bütün haftanızı yönetmenin sakin yolu.'), 'margin-top:22px;')}
    ${lead(p, T('Plans, notes and reminders in one quiet place. Join the waiting list and be first in.', 'Planlar, notlar ve hatırlatmalar tek bir sakin yerde. Bekleme listesine katılın, ilk giren siz olun.'), 'margin-left:auto;margin-right:auto;')}
    <form style="display:flex;flex-wrap:wrap;gap:10px;max-width:480px;margin:0 auto;">
      <div style="flex:1 1 240px;">${input(p, T('Your email address', 'E-posta adresiniz'), 'email')}</div>
      <button type="submit" style="${FONT_BASE}padding:13px 26px;border-radius:12px;border:0;background:${p.accent};color:${p.onAccent};font-weight:700;font-size:15.5px;cursor:pointer;">${T('Join the list', 'Listeye katılın')}</button>
    </form>
    <p style="margin:18px 0 0;color:${p.muted};font-size:14px;">${T('2,400 people are already waiting', '2.400 kişi şimdiden bekliyor')}</p>`, { align: 'center', max: 820, extra: `background:radial-gradient(700px 360px at 50% 0%, ${p.accent}40, transparent 65%),radial-gradient(500px 300px at 90% 100%, #22d3ee22, transparent 60%),${p.bg};` }), [1000, 510]),

  section('hero-photo-overlay', 'hero', copy('Hero over a photo', 'Fotoğraf üzerinde hero'), copy('White headline on a darkened background photo', 'Karartılmış fotoğraf üzerinde beyaz başlık'), 'noir', (T, p) => `
    <section style="${FONT_BASE}padding:clamp(90px,14vw,170px) 24px;color:#fff;background:linear-gradient(90deg, rgba(0,0,0,0.72), rgba(0,0,0,0.25)),url(https://picsum.photos/seed/coastline/1600/900) center/cover no-repeat, #1f2937;">
      <div style="max-width:1120px;margin:0 auto;">
        <p style="margin:0 0 14px;font-weight:700;letter-spacing:0.04em;color:${p.accentInk};">${T('Open all summer', 'Bütün yaz açık')}</p>
        <h1 style="margin:0 0 18px;font-size:clamp(38px,6vw,72px);font-weight:800;line-height:1.02;letter-spacing:-0.025em;max-width:14ch;">${T('Wake up where the sea begins.', 'Denizin başladığı yerde uyanın.')}</h1>
        <p style="margin:0 0 30px;font-size:clamp(17px,1.8vw,20px);line-height:1.6;max-width:520px;color:rgba(255,255,255,0.85);">${T('Twelve rooms on a quiet bay, breakfast on the terrace and a boat to the islands every morning.', 'Sakin bir koyda on iki oda, terasta kahvaltı ve her sabah adalara giden bir tekne.')}</p>
        ${buttons(btn(p, T('Check availability', 'Uygunluğu kontrol edin')), btn(p, T('View the rooms', 'Odaları görün'), 'outlineLight'))}
      </div>
    </section>`, [1000, 590]),

  section('hero-app-phone', 'hero', copy('App launch hero', 'Uygulama lansman hero'), copy('Headline, store buttons and a drawn phone', 'Başlık, mağaza düğmeleri ve çizilmiş bir telefon'), 'violet', (T, p) => band(p, grid(300, [
    `<div>
      ${chip(p, T('iPhone and Android', 'iPhone ve Android'))}
      ${h1(p, T('Your money, finally making sense.', 'Paranız sonunda anlam kazanıyor.'), 'margin-top:20px;')}
      ${lead(p, T('See every account in one place, set simple budgets and get a friendly nudge before you overspend.', 'Tüm hesaplarınızı tek yerde görün, basit bütçeler belirleyin ve fazla harcamadan önce dostça bir uyarı alın.'))}
      ${buttons(
        `<a href="#" style="display:inline-flex;align-items:center;gap:10px;padding:11px 18px;border-radius:12px;background:#0f172a;color:#fff;text-decoration:none;"><span style="display:grid;line-height:1.15;"><small style="font-size:11px;opacity:0.75;">${T('Download on the', 'İndirin')}</small><b style="font-size:16px;">App Store</b></span></a>`,
        `<a href="#" style="display:inline-flex;align-items:center;gap:10px;padding:11px 18px;border-radius:12px;background:#0f172a;color:#fff;text-decoration:none;"><span style="display:grid;line-height:1.15;"><small style="font-size:11px;opacity:0.75;">${T('Get it on', 'Hemen edinin')}</small><b style="font-size:16px;">Google Play</b></span></a>`,
      )}
      <p style="margin:20px 0 0;color:${p.muted};font-size:14px;">★★★★★ ${T('4.8 from 12,000 reviews', '12.000 yorumdan 4,8')}</p>
    </div>`,
    `<div style="display:flex;justify-content:center;">
      <div style="width:min(100%,280px);aspect-ratio:9/18.5;border-radius:44px;background:#111827;padding:12px;box-shadow:0 40px 80px ${p.accent}55;">
        <div style="height:100%;border-radius:34px;background:linear-gradient(180deg, ${p.accentSoft}, #ffffff);padding:34px 18px 18px;display:flex;flex-direction:column;gap:12px;">
          <div style="height:10px;width:44%;border-radius:6px;background:${p.accent}55;"></div>
          <div style="padding:16px;border-radius:18px;background:${p.accent};color:#fff;"><small style="opacity:0.8;">${T('This month', 'Bu ay')}</small><div style="font-size:26px;font-weight:800;">₺18.420</div></div>
          ${['#f59e0b', '#10b981', '#ef4444'].map((c, i) => `<div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.06);"><span style="width:28px;height:28px;border-radius:9px;background:${c}33;"></span><span style="flex:1;height:8px;border-radius:5px;background:#e5e7eb;"></span><span style="width:${[34, 26, 40][i]}px;height:8px;border-radius:5px;background:${c};"></span></div>`).join('')}
        </div>
      </div>
    </div>`,
  ], 40, 'align-items:center;')), [1000, 820]),

  section('hero-product-screenshot', 'hero', copy('Hero with product screenshot', 'Ürün ekran görüntülü hero'), copy('Centered message above a drawn app window', 'Çizilmiş bir uygulama penceresinin üstünde ortalanmış mesaj'), 'soft', (T, p) => band(p, `
    ${h1(p, T('All your projects. One calm dashboard.', 'Tüm projeleriniz. Tek bir sakin panel.'), 'max-width:16ch;margin-left:auto;margin-right:auto;')}
    ${lead(p, T('Plan, track and ship work with the whole team, without the spreadsheets.', 'Tablolara ihtiyaç duymadan tüm ekiple işleri planlayın, takip edin ve tamamlayın.'), 'margin-left:auto;margin-right:auto;')}
    <div style="display:flex;justify-content:center;margin-bottom:44px;">${buttons(btn(p, T('Start free', 'Ücretsiz başlayın')), btn(p, T('Book a demo', 'Demo ayarlayın'), 'ghost'))}</div>
    <div style="border-radius:18px;border:1px solid ${p.line};background:${p.card};box-shadow:0 40px 90px rgba(15,23,42,0.16);overflow:hidden;text-align:left;">
      <div style="display:flex;gap:7px;padding:12px 16px;border-bottom:1px solid ${p.line};">${['#f87171', '#fbbf24', '#34d399'].map((c) => `<span style="width:11px;height:11px;border-radius:50%;background:${c};"></span>`).join('')}</div>
      <div style="display:grid;grid-template-columns:minmax(0,180px) minmax(0,1fr);min-height:260px;">
        <div style="padding:18px;border-right:1px solid ${p.line};display:grid;gap:10px;align-content:start;">${[70, 55, 62, 48, 58].map((w, i) => `<span style="height:10px;width:${w}%;border-radius:6px;background:${i === 0 ? p.accent : p.line};"></span>`).join('')}</div>
        <div style="padding:22px;display:grid;gap:16px;align-content:start;">
          ${grid(120, [0, 1, 2].map((i) => `<div style="padding:14px;border-radius:12px;background:${p.soft};"><span style="display:block;height:8px;width:50%;border-radius:5px;background:${p.line};margin-bottom:10px;"></span><b style="font-size:22px;color:${p.ink};">${['128', '36', '94%'][i]}</b></div>`), 12)}
          <div style="height:120px;border-radius:12px;background:linear-gradient(180deg, ${p.accent}26, transparent),repeating-linear-gradient(90deg, ${p.line} 0 1px, transparent 1px 60px);"></div>
        </div>
      </div>
    </div>`, { align: 'center', max: 1040 }), [1000, 830]),

  section('hero-editorial', 'hero', copy('Editorial hero', 'Editoryal hero'), copy('Magazine-style issue line, big headline and image', 'Dergi tarzı sayı satırı, büyük başlık ve görsel'), 'warm', (T, p) => band(p, `
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;padding-bottom:16px;border-bottom:2px solid ${p.ink};color:${p.muted};font-size:14px;"><span>${T('Issue 14 · Autumn', 'Sayı 14 · Sonbahar')}</span><span>${T('Food, places, people', 'Yemek, yerler, insanlar')}</span></div>
    ${grid(320, [
      `<div style="padding-top:34px;">${h1(p, T('The long lunch is coming back.', 'Uzun öğle yemekleri geri dönüyor.'), 'font-size:clamp(40px,6.4vw,78px);font-style:italic;')}${lead(p, T('Why the best conversations still happen around a table, and the cooks who are keeping it that way.', 'En iyi sohbetler neden hâlâ bir masanın etrafında oluyor ve bunu sürdüren aşçılar kimler.'))}${btn(p, T('Read the story', 'Hikâyeyi okuyun'))}</div>`,
      `<div style="padding-top:34px;">${photo('long-lunch', 640, 760, { radius: 4 })}<p style="margin:10px 0 0;color:${p.muted};font-size:13px;">${T('Photograph: the terrace at noon', 'Fotoğraf: öğle vakti teras')}</p></div>`,
    ], 44)}`), [1000, 800]),

  section('hero-typographic', 'hero', copy('Typographic hero', 'Tipografik hero'), copy('An oversized statement and nothing else', 'Dev bir cümle ve başka hiçbir şey'), 'light', (T, p) => band(p, `
    <h1 style="margin:0;font-size:clamp(46px,9vw,120px);font-weight:800;line-height:0.95;letter-spacing:-0.04em;color:${p.ink};">${T('We design brands', 'Kendinden emin')}<br/><span style="color:${p.accent};">${T('with nerve.', 'markalar tasarlıyoruz.')}</span></h1>
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:18px;margin-top:40px;padding-top:22px;border-top:1px solid ${p.line};">
      <p style="margin:0;max-width:420px;color:${p.muted};font-size:17px;line-height:1.6;">${T('An independent studio for identity, packaging and digital work.', 'Kimlik, ambalaj ve dijital işler için bağımsız bir stüdyo.')}</p>
      <a href="#" style="align-self:end;color:${p.ink};font-weight:700;text-decoration:none;border-bottom:2px solid ${p.accent};">${T('See selected work →', 'Seçili işleri görün →')}</a>
    </div>`), [1000, 540]),

  section('hero-with-stats', 'hero', copy('Hero with key numbers', 'Rakamlı hero'), copy('Message, buttons and a row of three figures', 'Mesaj, düğmeler ve üç rakamdan oluşan satır'), 'ocean', (T, p) => band(p, `
    ${eyebrow(p, T('Logistics you can count on', 'Güvenebileceğiniz lojistik'))}
    ${h1(p, T('Delivered on time, every time we promise.', 'Söz verdiğimiz her seferde, tam zamanında.'), 'max-width:17ch;')}
    ${lead(p, T('Road, sea and air freight with live tracking and one person to call when plans change.', 'Canlı takip ve planlar değiştiğinde arayabileceğiniz tek bir kişiyle kara, deniz ve hava taşımacılığı.'))}
    ${buttons(btn(p, T('Get a quote', 'Teklif alın')), btn(p, T('Track a shipment', 'Gönderi takibi'), 'ghost'))}
    <div style="margin-top:46px;padding-top:28px;border-top:1px solid ${p.line};">${grid(160, [[T('98.7%', '%98,7'), T('On-time delivery', 'Zamanında teslimat')], ['40', T('Countries', 'Ülke')], ['24/7', T('Live support', 'Canlı destek')]].map(([n, l]) => `<div><div style="font-size:clamp(30px,3.6vw,42px);font-weight:800;color:${p.ink};">${n}</div><div style="color:${p.muted};font-size:15px;">${l}</div></div>`), 24)}</div>`), [1000, 650]),

  section('hero-video', 'hero', copy('Video hero', 'Videolu hero'), copy('Headline above a large video frame with a play button', 'Oynat düğmeli büyük video çerçevesinin üstünde başlık'), 'dark', (T, p) => band(p, `
    ${h1(p, T('See it in ninety seconds.', 'Doksan saniyede görün.'))}
    ${lead(p, T('A short film about what we make, who it is for and why it works.', 'Ne yaptığımız, kimin için olduğu ve neden işe yaradığı üzerine kısa bir film.'), 'margin-left:auto;margin-right:auto;')}
    <div style="position:relative;margin-top:10px;">
      ${art(p, { ratio: '16/9', radius: 22, extra: 'box-shadow:0 40px 90px rgba(0,0,0,0.45);' })}
      <a href="#" aria-label="${T('Play video', 'Videoyu oynat')}" style="position:absolute;inset:0;margin:auto;width:84px;height:84px;border-radius:50%;background:#fff;color:#0f172a;display:grid;place-items:center;font-size:28px;text-decoration:none;box-shadow:0 12px 40px rgba(0,0,0,0.4);">▶</a>
    </div>`, { align: 'center', max: 980 }), [1000, 860]),

  section('hero-booking-card', 'hero', copy('Hero with booking form', 'Rezervasyon formlu hero'), copy('Welcome text beside a date and guests card', 'Tarih ve kişi kartının yanında karşılama metni'), 'forest', (T, p) => band(p, grid(320, [
    `<div>${eyebrow(p, T('Boutique hotel · 18 rooms', 'Butik otel · 18 oda'))}${h1(p, T('Slow mornings in the olive grove.', 'Zeytinlikte yavaş sabahlar.'))}${lead(p, T('Stone rooms, a pool among the trees and breakfast made from what grows around us.', 'Taş odalar, ağaçların arasında bir havuz ve çevremizde yetişenlerle hazırlanan kahvaltı.'))}</div>`,
    card(p, `
      <h3 style="margin:0 0 16px;font-size:20px;color:${p.ink};">${T('Plan your stay', 'Konaklamanızı planlayın')}</h3>
      <div style="display:grid;gap:12px;">
        ${grid(130, [`<label style="display:grid;gap:6px;font-size:13px;font-weight:700;color:${p.muted};">${T('Arrival', 'Giriş')}${input(p, '12.06.2026', 'text')}</label>`, `<label style="display:grid;gap:6px;font-size:13px;font-weight:700;color:${p.muted};">${T('Departure', 'Çıkış')}${input(p, '15.06.2026', 'text')}</label>`], 12)}
        <label style="display:grid;gap:6px;font-size:13px;font-weight:700;color:${p.muted};">${T('Guests', 'Kişi sayısı')}<select style="${FONT_BASE}padding:13px 14px;border-radius:12px;border:1px solid ${p.line};background:${p.card};color:${p.ink};font-size:15px;"><option>${T('2 adults', '2 yetişkin')}</option><option>${T('2 adults, 1 child', '2 yetişkin, 1 çocuk')}</option></select></label>
        ${btn(p, T('Check availability', 'Uygunluğu kontrol edin'), 'solid', 'text-align:center;')}
        <p style="margin:0;color:${p.muted};font-size:13px;text-align:center;">${T('Best price when you book direct', 'Doğrudan rezervasyonda en iyi fiyat')}</p>
      </div>`, 'box-shadow:0 30px 60px rgba(18,37,26,0.12);'),
  ], 44, 'align-items:center;')), [1000, 490]),

  section('hero-search', 'hero', copy('Search hero', 'Arama hero'), copy('Big search field with popular suggestions', 'Popüler önerilerle büyük arama alanı'), 'soft', (T, p) => band(p, `
    ${h1(p, T('Find the right place, near you.', 'Yakınınızdaki doğru yeri bulun.'))}
    ${lead(p, T('Search thousands of trusted local services, with real reviews and clear prices.', 'Gerçek yorumlar ve net fiyatlarla binlerce güvenilir yerel hizmette arama yapın.'), 'margin-left:auto;margin-right:auto;')}
    <div style="display:flex;flex-wrap:wrap;gap:8px;max-width:680px;margin:0 auto;padding:8px;border-radius:18px;background:${p.card};border:1px solid ${p.line};box-shadow:0 20px 50px rgba(15,23,42,0.1);">
      <input type="search" placeholder="${T('What are you looking for?', 'Ne arıyorsunuz?')}" aria-label="${T('What are you looking for?', 'Ne arıyorsunuz?')}" style="${FONT_BASE}flex:1 1 220px;min-width:0;padding:14px 16px;border:0;background:transparent;color:${p.ink};font-size:16px;outline:none;" />
      <input type="text" placeholder="${T('City or district', 'Şehir ya da ilçe')}" aria-label="${T('City or district', 'Şehir ya da ilçe')}" style="${FONT_BASE}flex:1 1 150px;min-width:0;padding:14px 16px;border:0;border-left:1px solid ${p.line};background:transparent;color:${p.ink};font-size:16px;outline:none;" />
      ${btn(p, T('Search', 'Ara'))}
    </div>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:20px;">${[T('Plumbers', 'Tesisatçılar'), T('Dentists', 'Diş hekimleri'), T('Yoga studios', 'Yoga stüdyoları'), T('Movers', 'Nakliyeciler'), T('Tutors', 'Özel öğretmenler')].map((tag) => `<a href="#" style="padding:7px 14px;border-radius:999px;background:${p.card};border:1px solid ${p.line};color:${p.muted};text-decoration:none;font-size:14px;">${tag}</a>`).join('')}</div>`, { align: 'center', max: 900 }), [1000, 500]),

  section('hero-collage', 'hero', copy('Photo collage hero', 'Fotoğraf kolajlı hero'), copy('Headline framed by a collage of four photos', 'Dört fotoğraflık kolajla çevrelenmiş başlık'), 'rose', (T, p) => band(p, grid(300, [
    `<div>${chip(p, T('Florist · weddings · events', 'Çiçekçi · düğünler · etkinlikler'))}${h1(p, T('Flowers arranged the way they grow.', 'Yetiştikleri gibi düzenlenmiş çiçekler.'), 'margin-top:20px;')}${lead(p, T('Seasonal bouquets and event flowers from a small studio that buys from local growers.', 'Yerel üreticilerden alım yapan küçük bir stüdyodan mevsimlik buketler ve etkinlik çiçekleri.'))}${buttons(btn(p, T('Order a bouquet', 'Buket sipariş edin')), btn(p, T('Plan an event', 'Etkinlik planlayın'), 'ghost'))}</div>`,
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      ${photo('peonies', 400, 520, { radius: 20 })}
      <div style="display:grid;gap:14px;padding-top:40px;">${photo('bouquet', 400, 300, { radius: 20 })}${photo('flower-shop', 400, 360, { radius: 20 })}</div>
    </div>`,
  ], 44, 'align-items:center;')), [1000, 620]),

  section('hero-event', 'hero', copy('Event hero', 'Etkinlik hero'), copy('Date, title, venue and a countdown', 'Tarih, başlık, mekân ve geri sayım'), 'noir', (T, p) => band(p, `
    <p style="margin:0 0 16px;font-size:clamp(18px,2vw,22px);font-weight:800;color:${p.accentInk};">${T('14–16 May 2026 · Istanbul', '14–16 Mayıs 2026 · İstanbul')}</p>
    ${h1(p, T('Design Week', 'Tasarım Haftası'), 'font-size:clamp(52px,10vw,130px);line-height:0.9;')}
    ${lead(p, T('Three days of talks, workshops and studio visits with forty designers from around the world.', 'Dünyanın dört bir yanından kırk tasarımcıyla üç gün boyunca konuşmalar, atölyeler ve stüdyo ziyaretleri.'))}
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:30px;">${[['24', T('days', 'gün')], ['08', T('hours', 'saat')], ['45', T('minutes', 'dakika')]].map(([n, l]) => `<div style="min-width:92px;padding:14px 18px;border-radius:14px;border:1px solid ${p.line};background:${p.card};text-align:center;"><b style="display:block;font-size:30px;color:${p.ink};">${n}</b><span style="color:${p.muted};font-size:13px;">${l}</span></div>`).join('')}</div>
    ${buttons(btn(p, T('Get tickets', 'Bilet alın')), btn(p, T('See the programme', 'Programı görün'), 'ghost'))}`), [1000, 560]),

  section('hero-personal', 'hero', copy('Personal intro hero', 'Kişisel tanıtım hero'), copy('Portrait, name, role and social links', 'Portre, isim, unvan ve sosyal bağlantılar'), 'warm', (T, p) => band(p, `
    <div style="display:flex;justify-content:center;margin-bottom:22px;">${photo('portrait-smile', 240, 240, { radius: 999, ratio: '1/1', extra: `width:120px;border:4px solid ${p.card};box-shadow:0 14px 34px rgba(0,0,0,0.14);` })}</div>
    ${h1(p, T('Hi, I am Deniz.', 'Merhaba, ben Deniz.'), 'font-size:clamp(34px,5vw,56px);')}
    ${lead(p, T('Product designer in Izmir. I help small teams turn messy ideas into simple, friendly software.', "İzmir'de ürün tasarımcısıyım. Küçük ekiplerin dağınık fikirlerini sade ve samimi yazılımlara dönüştürmelerine yardım ediyorum."), 'margin-left:auto;margin-right:auto;')}
    <div style="display:flex;justify-content:center;margin-bottom:22px;">${buttons(btn(p, T('Work with me', 'Birlikte çalışalım')), btn(p, T('Read my notes', 'Notlarımı okuyun'), 'ghost'))}</div>
    <div style="display:flex;justify-content:center;gap:18px;">${['LinkedIn', 'Dribbble', 'GitHub', 'E-mail'].map((name) => `<a href="#" style="color:${p.muted};text-decoration:none;font-size:14px;font-weight:600;">${name}</a>`).join('')}</div>`, { align: 'center', max: 760 }), [1000, 560]),

  section('hero-local-business', 'hero', copy('Local business hero', 'Yerel işletme hero'), copy('Opening hours, address and a call button beside a photo', 'Fotoğrafın yanında çalışma saatleri, adres ve arama düğmesi'), 'warm', (T, p) => band(p, grid(320, [
    `<div>
      ${eyebrow(p, T('Neighbourhood bakery since 1998', "1998'den beri mahalle fırını"))}
      ${h1(p, T('Warm bread before the city wakes up.', 'Şehir uyanmadan sıcak ekmek.'))}
      ${lead(p, T('Sourdough, simit and pastries baked every morning on the corner of Moda Street.', 'Moda Caddesi köşesinde her sabah pişen ekşi mayalı ekmekler, simitler ve hamur işleri.'), 'margin-bottom:22px;')}
      ${card(p, grid(150, [
        `<div><b style="display:block;color:${p.ink};margin-bottom:4px;">${T('Opening hours', 'Çalışma saatleri')}</b>${body(p, T('Every day 06:30 – 19:00', 'Her gün 06:30 – 19:00'))}</div>`,
        `<div><b style="display:block;color:${p.ink};margin-bottom:4px;">${T('Find us', 'Adresimiz')}</b>${body(p, T('Moda Cd. 42, Kadıköy', 'Moda Cd. 42, Kadıköy'))}</div>`,
      ], 16), 'padding:18px 20px;margin-bottom:22px;')}
      ${buttons(btn(p, T('Call +90 216 000 00 00', 'Arayın: 0216 000 00 00')), btn(p, T('Get directions', 'Yol tarifi alın'), 'ghost'))}
    </div>`,
    photo('bakery-bread', 640, 640, { radius: 24, ratio: '1/1' }),
  ], 44, 'align-items:center;')), [1000, 620]),
]
