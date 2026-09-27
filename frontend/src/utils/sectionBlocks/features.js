// What you offer: features, the story behind it and the services themselves.
import {
  art, band, body, btn, card, checklist, chip, copy, eyebrow, grid, h2, h3, icon, lead, photo, section,
} from './kit.js'

const head = (p, eyebrowText, title, text, align = 'left') => `
  ${eyebrowText ? eyebrow(p, eyebrowText, align) : ''}
  ${h2(p, title, align === 'center' ? 'margin-left:auto;margin-right:auto;max-width:22ch;' : 'max-width:22ch;')}
  ${text ? lead(p, text, align === 'center' ? 'margin-left:auto;margin-right:auto;margin-bottom:42px;' : 'margin-bottom:42px;') : ''}`

export const FEATURE_SECTIONS = [
  section('features-icons-three', 'features', copy('Three features with icons', 'İkonlu üç özellik'), copy('Centered icons, titles and short descriptions', 'Ortalanmış ikonlar, başlıklar ve kısa açıklamalar'), 'light', (T, p) => band(p, `
    ${head(p, T('Why us', 'Neden biz'), T('Everything you need, nothing you do not.', 'İhtiyacınız olan her şey, fazlası değil.'), T('Three reasons teams switch to us and stay.', 'Ekiplerin bize geçip kalmasının üç nedeni.'), 'center')}
    ${grid(240, [
      ['⚡', T('Fast by default', 'Varsayılan olarak hızlı'), T('Pages load in under a second on any phone, without extra work.', 'Sayfalar her telefonda, ek çaba gerektirmeden bir saniyenin altında açılır.')],
      ['🔒', T('Private and secure', 'Gizli ve güvenli'), T('Encrypted, backed up daily and hosted in Europe.', 'Şifrelenir, her gün yedeklenir ve Avrupa’da barındırılır.')],
      ['🤝', T('Real support', 'Gerçek destek'), T('Talk to people who built it, usually within the hour.', 'Onu yapan insanlarla, çoğu zaman bir saat içinde konuşun.')],
    ].map(([i, h, t]) => `<div>${icon(p, i, 54)}${h3(p, h)}${body(p, t)}</div>`), 32)}`, { align: 'center' }), [1000, 540]),

  section('features-six-cards', 'features', copy('Six feature cards', 'Altı özellik kartı'), copy('Heading on the left and a grid of six cards', 'Solda başlık ve altı kartlık ızgara'), 'soft', (T, p) => band(p, `
    ${head(p, T('Features', 'Özellikler'), T('Built for the way small teams actually work.', 'Küçük ekiplerin gerçek çalışma biçimi için geliştirildi.'), T('Start with the basics and switch on more as you grow.', 'Temellerle başlayın, büyüdükçe daha fazlasını açın.'))}
    ${grid(250, [
      ['📋', T('Shared boards', 'Ortak panolar'), T('See every task and who owns it at a glance.', 'Her görevi ve sorumlusunu bir bakışta görün.')],
      ['🗓', T('Smart calendar', 'Akıllı takvim'), T('Deadlines and meetings in one timeline.', 'Teslim tarihleri ve toplantılar tek bir zaman çizelgesinde.')],
      ['💬', T('Comments in context', 'Bağlamında yorumlar'), T('Discuss the work right where it lives.', 'İşi, bulunduğu yerde tartışın.')],
      ['📎', T('Files and docs', 'Dosyalar ve dokümanlar'), T('Attach, preview and version everything.', 'Her şeyi ekleyin, önizleyin ve sürümleyin.')],
      ['🔔', T('Quiet notifications', 'Sakin bildirimler'), T('Only what needs you, bundled once a day.', 'Yalnızca sizi gerektirenler, günde bir kez toplu hâlde.')],
      ['📈', T('Simple reports', 'Sade raporlar'), T('Progress the whole team can read.', 'Tüm ekibin okuyabileceği ilerleme raporları.')],
    ].map(([i, h, t]) => card(p, `${icon(p, i)}${h3(p, h)}${body(p, t)}`)), 18)}`), [1000, 840]),

  section('features-alternating', 'features', copy('Alternating features', 'Dönüşümlü özellikler'), copy('Two rows that swap image and text sides', 'Görsel ve metnin yer değiştirdiği iki satır'), 'light', (T, p) => band(p, [
    [T('Plan', 'Planlayın'), T('See the whole month before it starts.', 'Ayın tamamını başlamadan görün.'), T('Drag work onto the calendar, spot the busy weeks early and move things before they collide.', 'İşleri takvime sürükleyin, yoğun haftaları erkenden görün ve çakışmadan önce kaydırın.'), [T('Month and week views', 'Aylık ve haftalık görünüm'), T('Drag to reschedule', 'Sürükleyerek yeniden planlama'), T('Holidays built in', 'Resmî tatiller hazır')]],
    [T('Share', 'Paylaşın'), T('Keep clients in the loop without the email chains.', 'E-posta zincirlerine gerek kalmadan müşterileri bilgilendirin.'), T('Send a private link with the latest progress. They can comment and approve without an account.', 'Son durumu içeren özel bir bağlantı gönderin. Hesap açmadan yorum yapıp onay verebilirler.'), [T('Private share links', 'Özel paylaşım bağlantıları'), T('Approvals in one click', 'Tek tıkla onay'), T('Your logo and colours', 'Kendi logonuz ve renkleriniz')]],
  ].map(([tag, title, text, list], i) => grid(320, [
    `<div style="order:${i % 2};">${eyebrow(p, tag)}${h2(p, title)}${lead(p, text, 'margin-bottom:22px;')}${checklist(p, list)}</div>`,
    `<div style="order:${i % 2 ? 0 : 1};">${art(p, { ratio: '5/4', angle: 120 + i * 60 })}</div>`,
  ], 48, `align-items:center;${i ? 'margin-top:72px;' : ''}`)).join('')), [1000, 980]),

  section('features-bento', 'features', copy('Bento features', 'Bento özellikler'), copy('Tiles of different sizes on one grid', 'Tek ızgarada farklı boyutlarda kutular'), 'light', (T, p) => band(p, `
    ${head(p, T('Product', 'Ürün'), T('One tool, many small wins.', 'Tek araç, birçok küçük kazanım.'), '')}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:16px;">
      <div style="padding:30px;border-radius:22px;background:${p.accent};color:${p.onAccent};min-height:300px;display:flex;flex-direction:column;justify-content:flex-end;"><b style="font-size:clamp(24px,3vw,34px);line-height:1.15;">${T('Automations that save a day every week.', 'Her hafta bir gün kazandıran otomasyonlar.')}</b><span style="margin-top:10px;opacity:0.85;">${T('Set a rule once, forget about it.', 'Kuralı bir kez koyun, sonra unutun.')}</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:16px;">
      ${card(p, `${icon(p, '🌍')}${h3(p, T('Works in 30 languages', '30 dilde çalışır'))}`)}
      ${card(p, `<b style="display:block;font-size:40px;color:${p.accentInk};">99.9%</b>${body(p, T('Uptime over the last year', 'Son bir yıldaki erişilebilirlik'))}`)}
      ${card(p, `${icon(p, '📱')}${h3(p, T('Apps for every phone', 'Her telefon için uygulama'))}`)}
      ${card(p, `${icon(p, '🧩')}${h3(p, T('50+ integrations', '50+ entegrasyon'))}`)}
      </div>
    </div>`), [1000, 650]),

  section('features-numbered-dark', 'features', copy('Numbered features, dark', 'Numaralı özellikler, koyu'), copy('Heading beside a numbered list on dark', 'Koyu zeminde numaralı liste ve başlık'), 'dark', (T, p) => band(p, grid(320, [
    `<div>${eyebrow(p, T('How it helps', 'Nasıl yardımcı olur'))}${h2(p, T('Four things that change on day one.', 'İlk günden değişen dört şey.'))}${lead(p, T('No training course needed. Most teams are up and running before lunch.', 'Eğitim gerekmez. Çoğu ekip öğle yemeğinden önce kullanmaya başlar.'))}${btn(p, T('Try it free', 'Ücretsiz deneyin'))}</div>`,
    `<ol style="list-style:none;margin:0;padding:0;">${[
      [T('Fewer meetings', 'Daha az toplantı'), T('Status lives on the board, not in a call.', 'Durum bilgisi toplantıda değil panoda yaşar.')],
      [T('Clear ownership', 'Net sorumluluk'), T('Every task has one name next to it.', 'Her görevin yanında tek bir isim vardır.')],
      [T('Faster handovers', 'Daha hızlı devir'), T('Context travels with the work.', 'Bağlam işle birlikte taşınır.')],
      [T('Calmer Fridays', 'Daha sakin Cumalar'), T('Nothing important slips through.', 'Önemli hiçbir şey gözden kaçmaz.')],
    ].map(([h, t], i) => `<li style="display:grid;grid-template-columns:56px 1fr;gap:4px 16px;padding:20px 0;border-top:1px solid ${p.line};"><span style="grid-row:span 2;font-size:26px;font-weight:800;color:${p.accentInk};">0${i + 1}</span>${h3(p, h, 'margin:0;')}${body(p, t)}</li>`).join('')}</ol>`,
  ], 48, 'align-items:center;')), [1000, 550]),

  section('features-checklist-split', 'features', copy('Feature checklist', 'Özellik kontrol listesi'), copy('Heading beside a two-column list of ticks', 'İki sütunlu tik listesinin yanında başlık'), 'forest', (T, p) => band(p, grid(300, [
    `<div>${eyebrow(p, T('Included', 'Dahil olanlar'))}${h2(p, T('Everything in one plan.', 'Her şey tek planda.'))}${lead(p, T('No add-ons, no surprise invoices. What you see here is what you get.', 'Ek paket yok, sürpriz fatura yok. Burada gördüğünüz, aldığınızdır.'), 'margin-bottom:0;')}</div>`,
    grid(200, [
      checklist(p, [T('Unlimited projects', 'Sınırsız proje'), T('Custom domain', 'Özel alan adı'), T('Daily backups', 'Günlük yedekleme'), T('SSL certificate', 'SSL sertifikası')]),
      checklist(p, [T('Team permissions', 'Ekip yetkileri'), T('Priority support', 'Öncelikli destek'), T('Analytics', 'Analizler'), T('Export at any time', 'İstediğiniz an dışa aktarma')]),
    ], 12),
  ], 48, 'align-items:center;')), [1000, 350]),

  section('features-before-after', 'features', copy('Before and after', 'Öncesi ve sonrası'), copy('What changes, in two side-by-side lists', 'Neyin değiştiğini gösteren iki yan yana liste'), 'light', (T, p) => band(p, `
    ${head(p, '', T('Life before and after switching.', 'Geçişten önce ve sonra hayat.'), '', 'center')}
    ${grid(300, [
      card(p, `<h3 style="margin:0 0 16px;font-size:19px;color:${p.muted};">${T('Before', 'Önce')}</h3><ul style="list-style:none;margin:0;padding:0;">${[T('Five tools and three logins', 'Beş araç ve üç ayrı giriş'), T('Status updates by email', 'E-postayla durum bildirimi'), T('Files lost in chat threads', 'Sohbetlerde kaybolan dosyalar'), T('Monday planning meetings', 'Pazartesi planlama toplantıları')].map((item) => `<li style="display:flex;gap:10px;margin:0 0 10px;color:${p.muted};"><span style="color:#ef4444;font-weight:900;">✕</span>${item}</li>`).join('')}</ul>`, `background:${p.soft};`),
      card(p, `<h3 style="margin:0 0 16px;font-size:19px;color:${p.accentInk};">${T('After', 'Sonra')}</h3>${checklist(p, [T('One place for all the work', 'Tüm işler için tek yer'), T('Live progress everyone can see', 'Herkesin görebildiği canlı ilerleme'), T('Files attached to the task', 'Göreve eklenmiş dosyalar'), T('Planning in ten minutes', 'On dakikada planlama')])}`, `border-color:${p.accent};box-shadow:0 20px 50px ${p.accent}22;`),
    ], 20)}`, { max: 900 }), [1000, 480]),

  section('features-four-highlights', 'features', copy('Four highlights', 'Dört öne çıkan'), copy('Big numbers with short explanations', 'Kısa açıklamalı büyük numaralar'), 'ocean', (T, p) => band(p, `
    ${head(p, T('At a glance', 'Bir bakışta'), T('Made for the long run.', 'Uzun soluklu kullanım için yapıldı.'), '')}
    ${grid(210, [
      [T('Setup in one afternoon', 'Bir öğleden sonrada kurulum'), T('Import your data and invite the team in a few clicks.', 'Verilerinizi aktarın ve ekibi birkaç tıkla davet edin.')],
      [T('Works offline', 'Çevrim dışı çalışır'), T('Keep going on the train; it syncs when you are back.', 'Trende çalışmaya devam edin; bağlandığınızda senkronize olur.')],
      [T('Yours to export', 'Dışa aktarması sizde'), T('Download everything as open files, whenever you like.', 'Her şeyi istediğiniz zaman açık dosyalar olarak indirin.')],
      [T('Fair pricing', 'Adil fiyatlandırma'), T('Pay for active people only, never for seats nobody uses.', 'Yalnızca aktif kişiler için ödeyin, kullanılmayan koltuklar için asla.')],
    ].map(([h, t], i) => `<div style="padding-top:20px;border-top:3px solid ${p.accent};"><span style="display:block;font-size:44px;font-weight:800;color:${p.accentInk};line-height:1;margin-bottom:14px;">0${i + 1}</span>${h3(p, h)}${body(p, t)}</div>`), 26)}`), [1000, 480]),

  section('features-integrations', 'features', copy('Integrations grid', 'Entegrasyon ızgarası'), copy('A wall of connected apps with a heading', 'Başlıklı, bağlı uygulamalar duvarı'), 'light', (T, p) => band(p, `
    ${head(p, T('Integrations', 'Entegrasyonlar'), T('Works with the tools you already use.', 'Zaten kullandığınız araçlarla çalışır.'), T('Connect your calendar, chat, storage and payments in a couple of clicks.', 'Takviminizi, sohbet aracınızı, depolama alanınızı ve ödemelerinizi birkaç tıkla bağlayın.'), 'center')}
    ${grid(120, ['Slack', 'Gmail', 'Drive', 'Notion', 'Stripe', 'Figma', 'GitHub', 'Zoom', 'Trello', 'Dropbox', 'Teams', 'Shopify'].map((name, i) => `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px 10px;border-radius:16px;border:1px solid ${p.line};background:${p.card};"><span style="display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:hsl(${i * 31} 70% 94%);color:hsl(${i * 31} 60% 32%);font-weight:800;">${name[0]}</span><span style="font-size:14px;font-weight:600;color:${p.ink};">${name}</span></div>`), 12)}
    <div style="margin-top:30px;">${btn(p, T('See all integrations', 'Tüm entegrasyonları görün'), 'soft')}</div>`, { align: 'center' }), [1000, 690]),

  section('features-around-screenshot', 'features', copy('Features around a screenshot', 'Ekran görüntüsü etrafında özellikler'), copy('Points on both sides of a central product image', 'Ortadaki ürün görselinin iki yanında maddeler'), 'soft', (T, p) => {
    const point = (h, t) => `<div style="margin-bottom:26px;">${h3(p, h)}${body(p, t)}</div>`
    return band(p, `
      ${head(p, '', T('Small details, big difference.', 'Küçük ayrıntılar, büyük fark.'), '', 'center')}
      ${grid(240, [
        `<div>${point(T('Keyboard first', 'Önce klavye'), T('Every action is one shortcut away.', 'Her işlem bir kısayol uzağınızda.'))}${point(T('Dark mode', 'Karanlık mod'), T('Easy on the eyes after sunset.', 'Gün batımından sonra gözleri yormaz.'))}</div>`,
        `<div style="padding:14px;border-radius:26px;background:${p.card};border:1px solid ${p.line};box-shadow:0 30px 70px rgba(15,23,42,0.14);">${art(p, { ratio: '3/4', radius: 16 })}</div>`,
        `<div>${point(T('Instant search', 'Anında arama'), T('Find anything as you type.', 'Yazarken her şeyi bulun.'))}${point(T('Undo everything', 'Her şeyi geri alın'), T('Mistakes are one click from gone.', 'Hatalar bir tık uzaklıkta düzelir.'))}</div>`,
      ], 32, 'align-items:center;')}`)
  }, [1000, 640]),

  section('features-photo-cards', 'features', copy('Feature cards with photos', 'Fotoğraflı özellik kartları'), copy('Three cards, each with a photo on top', 'Üstünde fotoğraf olan üç kart'), 'warm', (T, p) => band(p, `
    ${head(p, T('The experience', 'Deneyim'), T('What a day with us looks like.', 'Bizimle bir gün nasıl geçer.'), '')}
    ${grid(260, [
      ['morning-coffee', T('Slow mornings', 'Yavaş sabahlar'), T('Breakfast until noon, served on the terrace.', 'Öğlene kadar terasta servis edilen kahvaltı.')],
      ['boat-trip', T('Afternoons at sea', 'Denizde öğleden sonralar'), T('A small boat to the quiet bays nearby.', 'Yakındaki sakin koylara küçük bir tekne.')],
      ['dinner-table', T('Long dinners', 'Uzun akşam yemekleri'), T('Seasonal menus and local wine under the vines.', 'Asmaların altında mevsimlik menüler ve yerel şaraplar.')],
    ].map(([seed, h, t]) => `<article style="overflow:hidden;border-radius:20px;background:${p.card};border:1px solid ${p.line};">${photo(seed, 600, 420, { radius: 0 })}<div style="padding:22px;">${h3(p, h)}${body(p, t)}</div></article>`), 22)}`), [1000, 630]),

  section('features-metrics-dark', 'features', copy('Features with metrics', 'Metrikli özellikler'), copy('Four tiles, each led by a result', 'Her biri bir sonuçla başlayan dört kutu'), 'teal', (T, p) => band(p, `
    ${head(p, T('Results', 'Sonuçlar'), T('Measured, not promised.', 'Vaat edilmedi, ölçüldü.'), T('Average results across our customers in their first six months.', 'Müşterilerimizin ilk altı ayındaki ortalama sonuçlar.'))}
    ${grid(230, [
      [T('38%', '%38'), T('less time in meetings', 'daha az toplantı süresi')],
      ['2.4×', T('faster project delivery', 'daha hızlı proje teslimi')],
      [T('−21%', '−%21'), T('in support tickets', 'destek talebi')],
      ['4.9/5', T('team satisfaction', 'ekip memnuniyeti')],
    ].map(([n, l]) => card(p, `<b style="display:block;font-size:clamp(34px,4vw,48px);color:${p.accentInk};line-height:1.05;">${n}</b><span style="display:block;margin-top:8px;color:${p.muted};font-size:15.5px;">${l}</span>`)), 16)}`), [1000, 580]),

  section('features-benefit-strip', 'features', copy('Benefit strip', 'Avantaj şeridi'), copy('A slim row of four promises with icons', 'İkonlu dört vaatten oluşan ince satır'), 'rose', (T, p) => band(p, grid(200, [
    ['🚚', T('Free delivery', 'Ücretsiz kargo'), T('On orders over €50', '€50 üzeri siparişlerde')],
    ['↩', T('30-day returns', '30 gün iade'), T('No questions asked', 'Soru sorulmadan')],
    ['🔐', T('Secure payment', 'Güvenli ödeme'), T('Cards and bank transfer', 'Kart ve havale')],
    ['💬', T('Here to help', 'Yardıma hazırız'), T('Every day 9:00 – 21:00', 'Her gün 09:00 – 21:00')],
  ].map(([i, h, t]) => `<div style="display:flex;gap:14px;align-items:center;"><span aria-hidden="true" style="display:grid;place-items:center;flex-shrink:0;width:46px;height:46px;border-radius:14px;background:${p.accentSoft};color:${p.accentInk};font-size:20px;">${i}</span><div><b style="display:block;color:${p.ink};">${h}</b><span style="color:${p.muted};font-size:14px;">${t}</span></div></div>`), 20), { pad: '34px 24px', bg: p.soft }), [1000, 130]),

  section('features-trust', 'features', copy('Trust and security', 'Güven ve güvenlik'), copy('Security promises with badges, on dark', 'Koyu zeminde rozetli güvenlik vaatleri'), 'noir', (T, p) => band(p, `
    ${head(p, T('Security', 'Güvenlik'), T('Your data, treated like ours.', 'Verileriniz, bizimkiler gibi korunur.'), T('We are audited every year and publish what we find.', 'Her yıl denetleniyor ve bulguları yayımlıyoruz.'), 'center')}
    ${grid(220, [
      ['🛡', T('Encrypted everywhere', 'Her yerde şifreli'), T('In transit and at rest, with keys we rotate.', 'Aktarımda ve depolamada; anahtarlar düzenli yenilenir.')],
      ['🗄', T('Daily backups', 'Günlük yedekler'), T('Kept for 30 days in two regions.', 'İki bölgede 30 gün saklanır.')],
      ['✅', T('Certified', 'Sertifikalı'), T('ISO 27001 and SOC 2 Type II.', 'ISO 27001 ve SOC 2 Tip II.')],
      ['👁', T('Private by design', 'Tasarımdan gizli'), T('We never sell or share your data.', 'Verilerinizi asla satmaz veya paylaşmayız.')],
    ].map(([i, h, t]) => card(p, `${icon(p, i)}${h3(p, h)}${body(p, t)}`, 'text-align:left;')), 16)}`, { align: 'center' }), [1000, 630]),
]

export const ABOUT_SECTIONS = [
  section('about-story-photo', 'about', copy('Our story with photo', 'Fotoğraflı hikâyemiz'), copy('Photo beside a short story and a signature', 'Fotoğrafın yanında kısa hikâye ve imza'), 'warm', (T, p) => band(p, grid(320, [
    photo('workshop-hands', 640, 760, { radius: 24, ratio: '5/6' }),
    `<div>${eyebrow(p, T('Our story', 'Hikâyemiz'))}${h2(p, T('It started with one table in a borrowed garage.', 'Her şey ödünç alınmış bir garajdaki tek bir masayla başladı.'))}
      ${body(p, T('In 2014 we built a dining table for a friend. Then her neighbour wanted one. Ten years later we are twelve people, but every piece is still made by hand, in the same town, from wood we can trace.', "2014'te bir arkadaşımız için yemek masası yaptık. Sonra komşusu da bir tane istedi. On yıl sonra on iki kişiyiz ama her parça hâlâ aynı kasabada, izini sürebildiğimiz ahşaptan elde yapılıyor."), 'font-size:17px;margin-bottom:16px;')}
      ${body(p, T('We would rather make fewer things and make them well.', 'Daha az şey yapmayı ve onları iyi yapmayı tercih ederiz.'), 'font-size:17px;margin-bottom:26px;')}
      <p style="margin:0;font-size:22px;font-style:italic;color:${p.ink};">— Elif &amp; Can</p>
    </div>`,
  ], 52, 'align-items:center;')), [1000, 700]),

  section('about-values', 'about', copy('Company values', 'Şirket değerleri'), copy('Heading and four value cards', 'Başlık ve dört değer kartı'), 'light', (T, p) => band(p, `
    ${head(p, T('What we believe', 'Neye inanıyoruz'), T('The four rules we work by.', 'Çalışırken uyduğumuz dört kural.'), '')}
    ${grid(220, [
      [T('Be useful', 'Faydalı ol'), T('If it does not help someone, we do not ship it.', 'Birine yardım etmiyorsa yayınlamayız.')],
      [T('Say it plainly', 'Açıkça söyle'), T('Clear words beat clever ones, every time.', 'Net kelimeler her zaman zekice olanlardan iyidir.')],
      [T('Finish things', 'Bitir'), T('Small and done is better than big and almost.', 'Küçük ve bitmiş, büyük ve neredeyse bitmişten iyidir.')],
      [T('Be kind', 'Nazik ol'), T('To customers, to each other and to ourselves.', 'Müşterilere, birbirimize ve kendimize.')],
    ].map(([h, t], i) => card(p, `<span style="display:block;font-size:14px;font-weight:800;color:${p.accentInk};margin-bottom:12px;">0${i + 1}</span>${h3(p, h)}${body(p, t)}`)), 16)}`), [1000, 480]),

  section('about-mission', 'about', copy('Mission statement', 'Misyon cümlesi'), copy('One large sentence on a dark band', 'Koyu bantta tek, büyük bir cümle'), 'dark', (T, p) => band(p, `
    ${eyebrow(p, T('Our mission', 'Misyonumuz'), 'center')}
    <p style="margin:0 auto;max-width:24ch;font-size:clamp(28px,4.4vw,52px);font-weight:700;line-height:1.2;letter-spacing:-0.02em;color:${p.ink};">${T('To make good design available to every small business, not just the ones with big budgets.', 'İyi tasarımı yalnızca büyük bütçelilere değil, her küçük işletmeye ulaştırmak.')}</p>`, { align: 'center' }), [1000, 400]),

  section('about-founder-letter', 'about', copy('Letter from the founder', 'Kurucudan mektup'), copy('Round portrait with a personal note', 'Yuvarlak portre ve kişisel bir not'), 'rose', (T, p) => band(p, `
    <div style="display:flex;justify-content:center;margin-bottom:22px;">${photo('founder-portrait', 240, 240, { radius: 999, ratio: '1/1', extra: 'width:110px;' })}</div>
    ${h2(p, T('A note from our founder', 'Kurucumuzdan bir not'), 'text-align:center;')}
    ${body(p, T('When I opened the studio, I promised myself that every client would leave feeling looked after, not processed. Eight years and many cups of tea later, that promise is still the first thing we teach new team members.', 'Stüdyoyu açtığımda, her müşterinin bir işlem gibi değil, özenle ilgilenilmiş hissederek ayrılacağına dair kendime söz verdim. Sekiz yıl ve birçok fincan çay sonra, bu söz hâlâ yeni ekip arkadaşlarımıza öğrettiğimiz ilk şey.'), 'font-size:18px;line-height:1.8;text-align:center;margin-bottom:22px;')}
    <p style="margin:0;text-align:center;color:${p.ink};font-weight:700;">Selin Aydın · <span style="color:${p.muted};font-weight:500;">${T('Founder', 'Kurucu')}</span></p>`, { max: 720 }), [1000, 490]),

  section('about-story-numbers', 'about', copy('Story with numbers', 'Rakamlarla hikâye'), copy('Company story beside a column of figures', 'Rakam sütununun yanında şirket hikâyesi'), 'ocean', (T, p) => band(p, grid(320, [
    `<div>${eyebrow(p, T('About us', 'Hakkımızda'))}${h2(p, T('A family business that grew up with the city.', 'Şehirle birlikte büyüyen bir aile şirketi.'))}${body(p, T('What began as one van and two brothers is now a team of eighty, still run from the same yard and still answering the phone ourselves.', 'Bir kamyonet ve iki kardeşle başlayan iş bugün seksen kişilik bir ekip; hâlâ aynı bahçeden yönetiliyor ve telefonları hâlâ kendimiz açıyoruz.'), 'font-size:17px;')}</div>`,
    `<div style="display:grid;gap:14px;">${[['1987', T('Founded in Izmir', "İzmir'de kuruldu")], ['80', T('People on the team', 'Kişilik ekip')], [T('12,000', '12.000'), T('Customers served', 'Hizmet verilen müşteri')]].map(([n, l]) => `<div style="display:flex;align-items:baseline;gap:16px;padding:18px 22px;border-radius:16px;background:${p.card};border:1px solid ${p.line};"><b style="font-size:34px;color:${p.accentInk};min-width:110px;">${n}</b><span style="color:${p.muted};">${l}</span></div>`).join('')}</div>`,
  ], 48, 'align-items:center;')), [1000, 430]),

  section('about-location', 'about', copy('About with location', 'Konumlu hakkımızda'), copy('Short intro, address card and a drawn map', 'Kısa tanıtım, adres kartı ve çizilmiş harita'), 'forest', (T, p) => band(p, grid(320, [
    `<div>${eyebrow(p, T('Visit us', 'Bizi ziyaret edin'))}${h2(p, T('Come and say hello.', 'Gelin, merhaba deyin.'))}${lead(p, T('We are a small shop on a quiet street, two minutes from the ferry. The kettle is always on.', 'Vapura iki dakika uzaklıkta, sakin bir sokakta küçük bir dükkânız. Çaydanlık hep ocakta.'))}
      ${card(p, `<p style="margin:0 0 8px;color:${p.ink};font-weight:700;">Moda Cd. 42, Kadıköy, İstanbul</p>${body(p, T('Tuesday to Sunday · 10:00 – 19:00', 'Salı–Pazar · 10:00 – 19:00'))}`, 'padding:18px 20px;')}</div>`,
    `<div style="position:relative;aspect-ratio:4/3;border-radius:22px;overflow:hidden;background:linear-gradient(0deg, ${p.soft}, ${p.soft}),${p.soft};background-image:repeating-linear-gradient(0deg, transparent 0 38px, ${p.line} 38px 40px),repeating-linear-gradient(90deg, transparent 0 38px, ${p.line} 38px 40px);border:1px solid ${p.line};"><span style="position:absolute;left:30%;top:0;bottom:0;width:18px;background:${p.card};"></span><span style="position:absolute;top:55%;left:0;right:0;height:14px;background:${p.card};"></span><span aria-hidden="true" style="position:absolute;left:48%;top:36%;display:grid;place-items:center;width:44px;height:44px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${p.accent};box-shadow:0 10px 24px rgba(0,0,0,0.2);"><span style="width:14px;height:14px;border-radius:50%;background:#fff;"></span></span></div>`,
  ], 44, 'align-items:center;')), [1000, 510]),

  section('about-awards', 'about', copy('Awards and recognition', 'Ödüller ve takdirler'), copy('A list of awards and press, on dark', 'Koyu zeminde ödül ve basın listesi'), 'noir', (T, p) => band(p, `
    ${head(p, T('Recognition', 'Takdirler'), T('Kind words from people who know.', 'İşini bilenlerden güzel sözler.'), '')}
    <div style="border-top:1px solid ${p.line};">${[
      ['2026', T('Best Small Studio', 'En İyi Küçük Stüdyo'), 'Design Awards'],
      ['2025', T('Gold, Packaging', 'Altın, Ambalaj'), 'Brand Impact'],
      ['2024', T('Site of the Day', 'Günün Sitesi'), 'Web Awards'],
      ['2023', T('Young Studio of the Year', 'Yılın Genç Stüdyosu'), 'Creative Review'],
    ].map(([year, award, org]) => `<div style="display:grid;grid-template-columns:80px 1fr auto;gap:16px;align-items:center;padding:20px 0;border-bottom:1px solid ${p.line};"><span style="color:${p.accentInk};font-weight:800;">${year}</span><b style="font-size:18px;color:${p.ink};">${award}</b><span style="color:${p.muted};font-size:14px;">${org}</span></div>`).join('')}</div>`), [1000, 540]),

  section('about-long-form', 'about', copy('Long-form about', 'Uzun metinli hakkımızda'), copy('Two columns of text with a drop cap', 'Büyük ilk harfli iki sütun metin'), 'light', (T, p) => band(p, `
    ${h2(p, T('Who we are', 'Biz kimiz'), 'margin-bottom:28px;')}
    <div style="columns:2 280px;column-gap:40px;color:${p.muted};font-size:17px;line-height:1.8;">
      ${(() => {
        const text = T('We are a small team of editors, designers and developers who believe the web should be pleasant to read. We started as a newsletter and grew into a studio that helps independent publishers build their homes online.', 'Web’in okunması keyifli bir yer olması gerektiğine inanan küçük bir editör, tasarımcı ve geliştirici ekibiyiz. Bir bülten olarak başladık; bugün bağımsız yayıncıların dijital evlerini kurmasına yardım eden bir stüdyoyuz.')
        return `<p style="margin:0 0 16px;"><span style="float:left;font-size:64px;line-height:0.9;font-weight:800;color:${p.accent};margin:6px 10px 0 0;">${text[0]}</span>${text.slice(1)}</p>`
      })()}
      <p style="margin:0;">${T('Our work is quiet on purpose. We care about typography, speed and accessibility more than trends, and we measure success by how long people stay to read.', 'İşimiz bilinçli olarak sessiz. Trendlerden çok tipografiye, hıza ve erişilebilirliğe önem verir, başarıyı insanların okumak için ne kadar kaldığıyla ölçeriz.')}</p>
    </div>`, { max: 900 }), [1000, 420]),
]

export const SERVICE_SECTIONS = [
  section('services-priced-cards', 'services', copy('Services with prices', 'Fiyatlı hizmetler'), copy('Three service cards with starting prices', 'Başlangıç fiyatlı üç hizmet kartı'), 'light', (T, p) => band(p, `
    ${head(p, T('Services', 'Hizmetler'), T('Clear services, clear prices.', 'Net hizmetler, net fiyatlar.'), T('Every project starts with a free call so we can recommend the right fit.', 'Doğru seçeneği önerebilmemiz için her proje ücretsiz bir görüşmeyle başlar.'))}
    ${grid(260, [
      ['🎨', T('Brand identity', 'Marka kimliği'), T('Logo, colours, type and a short guide.', 'Logo, renkler, yazı tipleri ve kısa bir rehber.'), T('from €1,800', '€1.800’den başlayan')],
      ['🖥', T('Website', 'Web sitesi'), T('A fast, editable site of up to eight pages.', 'Sekiz sayfaya kadar hızlı ve düzenlenebilir bir site.'), T('from €3,500', '€3.500’den başlayan')],
      ['📦', T('Packaging', 'Ambalaj'), T('Labels and boxes ready for print.', 'Baskıya hazır etiketler ve kutular.'), T('from €1,200', '€1.200’den başlayan')],
    ].map(([i, h, t, price]) => card(p, `${icon(p, i)}${h3(p, h)}${body(p, t, 'margin-bottom:18px;')}<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding-top:16px;border-top:1px solid ${p.line};"><b style="color:${p.ink};">${price}</b><a href="#" style="color:${p.accentInk};font-weight:700;text-decoration:none;">${T('Details →', 'Ayrıntılar →')}</a></div>`)), 18)}`), [1000, 620]),

  section('services-menu-list', 'services', copy('Service menu list', 'Hizmet listesi'), copy('Rows with duration and price, like a salon menu', 'Salon menüsü gibi süre ve fiyat içeren satırlar'), 'soft', (T, p) => band(p, `
    ${head(p, T('Treatments', 'Bakımlar'), T('Choose your treatment.', 'Bakımınızı seçin.'), '', 'center')}
    <div style="background:${p.card};border:1px solid ${p.line};border-radius:20px;padding:6px 26px;">${[
      [T('Signature facial', 'İmza cilt bakımı'), T('Deep cleanse, massage and mask', 'Derin temizlik, masaj ve maske'), T('60 min', '60 dk'), '€70'],
      [T('Express glow', 'Hızlı ışıltı'), T('A quick refresh before an event', 'Etkinlik öncesi hızlı bir tazelenme'), T('30 min', '30 dk'), '€40'],
      [T('Hot stone massage', 'Sıcak taş masajı'), T('Warm basalt stones, slow pressure', 'Sıcak bazalt taşlar, yavaş baskı'), T('75 min', '75 dk'), '€85'],
      [T('Manicure', 'Manikür'), T('Shape, cuticles and polish', 'Şekillendirme, kütikül ve oje'), T('45 min', '45 dk'), '€30'],
    ].map(([h, t, d, price]) => `<div style="display:grid;grid-template-columns:1fr auto auto;gap:6px 18px;align-items:center;padding:20px 0;border-bottom:1px solid ${p.line};"><div><b style="display:block;color:${p.ink};font-size:17px;">${h}</b><span style="color:${p.muted};font-size:14.5px;">${t}</span></div><span style="color:${p.muted};font-size:14px;">${d}</span><b style="color:${p.accentInk};font-size:18px;">${price}</b></div>`).join('')}</div>
    <div style="text-align:center;margin-top:26px;">${btn(p, T('Book a treatment', 'Bakım randevusu alın'))}</div>`, { max: 820 }), [1000, 650]),

  section('services-grid-dark', 'services', copy('Service grid, dark', 'Hizmet ızgarası, koyu'), copy('Six services with icons on dark', 'Koyu zeminde ikonlu altı hizmet'), 'dark', (T, p) => band(p, `
    ${head(p, T('What we do', 'Neler yapıyoruz'), T('One team for the whole product.', 'Ürünün tamamı için tek ekip.'), '')}
    ${grid(250, [
      ['◆', T('Strategy', 'Strateji'), T('Positioning, research and a clear roadmap.', 'Konumlandırma, araştırma ve net bir yol haritası.')],
      ['✎', T('Product design', 'Ürün tasarımı'), T('Flows, interfaces and design systems.', 'Akışlar, arayüzler ve tasarım sistemleri.')],
      ['</>', T('Engineering', 'Mühendislik'), T('Web and mobile apps built to last.', 'Uzun ömürlü web ve mobil uygulamalar.')],
      ['☁', T('Cloud', 'Bulut'), T('Infrastructure that scales quietly.', 'Sessizce ölçeklenen altyapı.')],
      ['📊', T('Data', 'Veri'), T('Dashboards and analytics you will use.', 'Gerçekten kullanacağınız paneller ve analizler.')],
      ['🛟', T('Support', 'Destek'), T('Care plans after launch.', 'Yayın sonrası bakım planları.')],
    ].map(([i, h, t]) => card(p, `${icon(p, i)}${h3(p, h)}${body(p, t)}`)), 16)}`), [1000, 710]),

  section('services-detail', 'services', copy('Service detail', 'Hizmet ayrıntısı'), copy('A list of services beside the details of one', 'Hizmet listesi ve birinin ayrıntıları'), 'forest', (T, p) => band(p, grid(260, [
    `<div style="display:grid;gap:8px;">${[T('Garden design', 'Bahçe tasarımı'), T('Planting', 'Dikim'), T('Irrigation', 'Sulama'), T('Seasonal care', 'Mevsimlik bakım'), T('Tree surgery', 'Ağaç bakımı')].map((name, i) => `<a href="#" style="display:flex;justify-content:space-between;padding:14px 18px;border-radius:14px;text-decoration:none;font-weight:700;${i === 0 ? `background:${p.accent};color:${p.onAccent};` : `background:${p.card};color:${p.ink};border:1px solid ${p.line};`}">${name}<span>→</span></a>`).join('')}</div>`,
    card(p, `${photo('garden-design', 800, 420, { radius: 14, extra: 'margin-bottom:20px;' })}${h2(p, T('Garden design', 'Bahçe tasarımı'), 'font-size:28px;')}${body(p, T('We visit, listen and draw a plan that suits your light, soil and the time you want to spend outside. You get a planting plan, a budget and a timeline.', 'Gelir, dinler ve ışığınıza, toprağınıza ve dışarıda geçirmek istediğiniz zamana uyan bir plan çizeriz. Bir dikim planı, bütçe ve zaman çizelgesi alırsınız.'), 'margin-bottom:18px;')}${checklist(p, [T('Site visit and soil test', 'Saha ziyareti ve toprak testi'), T('Planting plan with plant list', 'Bitki listeli dikim planı'), T('Two rounds of changes', 'İki tur revizyon')], 'margin-bottom:20px;')}${btn(p, T('Book a garden visit', 'Bahçe ziyareti ayırtın'))}`),
  ], 28, 'align-items:start;')), [1000, 750]),

  section('services-industries', 'services', copy('Industries served', 'Hizmet verilen sektörler'), copy('Industry tags and three sector cards', 'Sektör etiketleri ve üç sektör kartı'), 'ocean', (T, p) => band(p, `
    ${head(p, T('Who we work with', 'Kimlerle çalışıyoruz'), T('Experience across the industries that keep cities running.', 'Şehirleri ayakta tutan sektörlerde deneyim.'), '')}
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:30px;">${[T('Healthcare', 'Sağlık'), T('Logistics', 'Lojistik'), T('Retail', 'Perakende'), T('Education', 'Eğitim'), T('Hospitality', 'Konaklama'), T('Public sector', 'Kamu'), T('Finance', 'Finans')].map((tag) => chip(p, tag)).join('')}</div>
    ${grid(260, [
      [T('Healthcare', 'Sağlık'), T('Booking systems and patient portals for 40 clinics.', '40 klinik için randevu sistemleri ve hasta portalları.')],
      [T('Logistics', 'Lojistik'), T('Tracking tools used by 600 drivers every day.', 'Her gün 600 sürücünün kullandığı takip araçları.')],
      [T('Retail', 'Perakende'), T('Online stores that handle the holiday rush.', 'Bayram yoğunluğunu kaldıran online mağazalar.')],
    ].map(([h, t]) => card(p, `${h3(p, h)}${body(p, t, 'margin-bottom:14px;')}<a href="#" style="color:${p.accentInk};font-weight:700;text-decoration:none;">${T('Read the case study →', 'Vaka çalışmasını okuyun →')}</a>`)), 16)}`), [1000, 550]),

  section('services-packages', 'services', copy('Service packages', 'Hizmet paketleri'), copy('Three packages with what each includes', 'İçerikleriyle birlikte üç paket'), 'violet', (T, p) => band(p, `
    ${head(p, T('Packages', 'Paketler'), T('Pick the level of help you need.', 'İhtiyacınız olan destek düzeyini seçin.'), '', 'center')}
    ${grid(250, [
      [T('Starter', 'Başlangıç'), T('For a first step', 'İlk adım için'), [T('One strategy session', 'Bir strateji oturumu'), T('Written action plan', 'Yazılı eylem planı'), T('Email follow-up', 'E-postayla takip')]],
      [T('Growth', 'Büyüme'), T('Our most chosen', 'En çok tercih edilen'), [T('Monthly sessions', 'Aylık oturumlar'), T('Quarterly review', 'Üç aylık değerlendirme'), T('Chat support', 'Sohbet desteği'), T('Templates and tools', 'Şablonlar ve araçlar')]],
      [T('Partner', 'Ortak'), T('For bigger change', 'Büyük değişim için'), [T('Weekly sessions', 'Haftalık oturumlar'), T('Team workshops', 'Ekip atölyeleri'), T('On-call advice', 'Her an danışmanlık')]],
    ].map(([h, sub, items], i) => card(p, `${i === 1 ? chip(p, T('Popular', 'Popüler'), 'margin-bottom:14px;') : ''}${h3(p, h, 'font-size:22px;')}${body(p, sub, 'margin-bottom:18px;')}${checklist(p, items, 'margin-bottom:22px;')}${btn(p, T('Choose', 'Seçin'), i === 1 ? 'solid' : 'ghost', 'display:block;text-align:center;')}`, i === 1 ? `border:2px solid ${p.accent};box-shadow:0 24px 50px ${p.accent}26;` : '')), 18, 'align-items:stretch;')}`), [1000, 650]),

  section('services-photo-tiles', 'services', copy('Service photo tiles', 'Fotoğraflı hizmet kutuları'), copy('Four photo tiles with titles over them', 'Üzerinde başlık bulunan dört fotoğraf kutusu'), 'warm', (T, p) => band(p, `
    ${head(p, T('What we offer', 'Neler sunuyoruz'), T('Four ways to spend a day with us.', 'Bizimle bir gün geçirmenin dört yolu.'), '')}
    ${grid(220, [['cooking-class', T('Cooking classes', 'Yemek kursları')], ['wine-tasting', T('Wine tasting', 'Şarap tadımı')], ['farm-tour', T('Farm tours', 'Çiftlik turları')], ['private-dinner', T('Private dinners', 'Özel akşam yemekleri')]].map(([seed, name]) => `<a href="#" style="position:relative;display:block;border-radius:20px;overflow:hidden;text-decoration:none;">${photo(seed, 500, 620, { radius: 0 })}<span style="position:absolute;inset:auto 0 0 0;padding:40px 18px 18px;background:linear-gradient(0deg, rgba(0,0,0,0.7), transparent);color:#fff;font-weight:800;font-size:19px;">${name}</span></a>`), 16)}`), [1000, 570]),

  section('services-accordion', 'services', copy('Services accordion', 'Akordeon hizmetler'), copy('Heading with a list of expandable services', 'Başlık ve açılır hizmet listesi'), 'light', (T, p) => band(p, grid(300, [
    `<div>${eyebrow(p, T('Services', 'Hizmetler'))}${h2(p, T('How we can help your practice.', 'Muayenehanenize nasıl yardımcı olabiliriz.'))}${lead(p, T('Tap a service to see what is included.', 'Neler dahil olduğunu görmek için bir hizmete dokunun.'))}${btn(p, T('Talk to us', 'Bizimle konuşun'))}</div>`,
    `<div style="display:grid;gap:10px;">${[
      [T('Online booking', 'Online randevu'), T('Patients book, reschedule and get reminders without calling.', 'Hastalar arama yapmadan randevu alır, değiştirir ve hatırlatma alır.')],
      [T('Patient records', 'Hasta kayıtları'), T('Secure notes and history, available on any device.', 'Her cihazdan erişilebilen güvenli notlar ve geçmiş.')],
      [T('Billing', 'Faturalandırma'), T('Invoices and insurance claims in a few clicks.', 'Birkaç tıkla faturalar ve sigorta talepleri.')],
      [T('Reports', 'Raporlar'), T('See busy hours, no-shows and income at a glance.', 'Yoğun saatleri, gelmeyenleri ve geliri bir bakışta görün.')],
    ].map(([q, a], i) => `<details${i === 0 ? ' open' : ''} style="border:1px solid ${p.line};border-radius:14px;background:${p.card};padding:16px 20px;"><summary style="cursor:pointer;font-weight:700;font-size:17px;color:${p.ink};">${q}</summary><p style="margin:10px 0 0;color:${p.muted};line-height:1.6;">${a}</p></details>`).join('')}</div>`,
  ], 44, 'align-items:start;')), [1000, 470]),
]
