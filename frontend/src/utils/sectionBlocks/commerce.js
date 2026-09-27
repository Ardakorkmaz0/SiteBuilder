// Selling things: plans, products, comparisons and price lists.
import {
  band, body, btn, buttons, card, checklist, chip, copy, eyebrow, FONT_BASE, grid, h2, h3, input, lead, photo, section, stars,
} from './kit.js'

const head = (p, eyebrowText, title, text, align = 'left') => `
  ${eyebrowText ? eyebrow(p, eyebrowText, align) : ''}
  ${h2(p, title, align === 'center' ? 'margin-left:auto;margin-right:auto;max-width:22ch;' : 'max-width:22ch;')}
  ${text ? lead(p, text, align === 'center' ? 'margin-left:auto;margin-right:auto;margin-bottom:42px;' : 'margin-bottom:42px;') : ''}`

const plan = (p, T, { name, price, per, note, items, hot, cta }) => card(p, `
  ${hot ? chip(p, T('Most popular', 'En popüler'), `margin-bottom:14px;background:${p.accent};color:${p.onAccent};`) : ''}
  ${h3(p, name, 'font-size:20px;')}
  ${body(p, note, 'margin-bottom:18px;')}
  <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:20px;"><b style="font-size:42px;letter-spacing:-0.03em;color:${p.ink};">${price}</b><span style="color:${p.muted};">${per}</span></div>
  ${btn(p, cta, hot ? 'solid' : 'ghost', 'display:block;text-align:center;margin-bottom:22px;')}
  ${checklist(p, items)}`, hot ? `border:2px solid ${p.accent};box-shadow:0 26px 60px ${p.accent}2e;` : '')

export const PRICING_SECTIONS = [
  section('pricing-three-plans', 'pricing', copy('Three pricing plans', 'Üç fiyat planı'), copy('Three tiers with the middle one highlighted', 'Ortadakinin öne çıktığı üç paket'), 'light', (T, p) => band(p, `
    ${head(p, T('Pricing', 'Fiyatlandırma'), T('Simple plans that grow with you.', 'Sizinle büyüyen basit planlar.'), T('Start free, upgrade when you need more. Cancel any time.', 'Ücretsiz başlayın, daha fazlasına ihtiyaç duyduğunuzda yükseltin. İstediğiniz zaman iptal edin.'), 'center')}
    ${grid(250, [
      plan(p, T, { name: T('Starter', 'Başlangıç'), price: '€0', per: T('/month', '/ay'), note: T('For trying things out', 'Denemek için'), cta: T('Start free', 'Ücretsiz başlayın'), items: [T('1 project', '1 proje'), T('Basic analytics', 'Temel analizler'), T('Community support', 'Topluluk desteği')] }),
      plan(p, T, { name: T('Pro', 'Pro'), price: '€12', per: T('/month', '/ay'), note: T('For growing teams', 'Büyüyen ekipler için'), cta: T('Choose Pro', "Pro'yu seçin"), hot: true, items: [T('Unlimited projects', 'Sınırsız proje'), T('Custom domain', 'Özel alan adı'), T('Priority support', 'Öncelikli destek'), T('Team permissions', 'Ekip yetkileri')] }),
      plan(p, T, { name: T('Business', 'Kurumsal'), price: '€39', per: T('/month', '/ay'), note: T('For larger organisations', 'Büyük kurumlar için'), cta: T('Talk to sales', 'Satışla görüşün'), items: [T('Everything in Pro', "Pro'daki her şey"), T('Single sign-on', 'Tek oturum açma'), T('Audit log', 'Denetim kaydı'), T('Dedicated manager', 'Özel müşteri temsilcisi')] }),
    ], 20, 'align-items:start;text-align:left;')}`, { align: 'center' }), [1000, 830]),

  section('pricing-plans-dark', 'pricing', copy('Pricing plans, dark', 'Fiyat planları, koyu'), copy('Three tiers on a dark background', 'Koyu zeminde üç paket'), 'dark', (T, p) => band(p, `
    ${head(p, T('Plans', 'Planlar'), T('Pay for what you use. Nothing more.', 'Kullandığınız kadar ödeyin, fazlası değil.'), '', 'center')}
    ${grid(250, [
      plan(p, T, { name: T('Hobby', 'Hobi'), price: '€5', per: T('/month', '/ay'), note: T('Side projects', 'Yan projeler'), cta: T('Get started', 'Başlayın'), items: [T('3 sites', '3 site'), T('10 GB storage', '10 GB depolama')] }),
      plan(p, T, { name: T('Studio', 'Stüdyo'), price: '€20', per: T('/month', '/ay'), note: T('Freelancers and studios', 'Serbest çalışanlar ve stüdyolar'), cta: T('Get Studio', "Stüdyo'yu alın"), hot: true, items: [T('20 sites', '20 site'), T('100 GB storage', '100 GB depolama'), T('Client billing', 'Müşteri faturalandırma')] }),
      plan(p, T, { name: T('Agency', 'Ajans'), price: '€60', per: T('/month', '/ay'), note: T('Teams with many clients', 'Çok müşterili ekipler'), cta: T('Get Agency', "Ajans'ı alın"), items: [T('Unlimited sites', 'Sınırsız site'), T('1 TB storage', '1 TB depolama'), T('White label', 'Beyaz etiket')] }),
    ], 20, 'align-items:start;text-align:left;')}`, { align: 'center' }), [1000, 700]),

  section('pricing-two-plans', 'pricing', copy('Two plans', 'İki plan'), copy('Monthly or yearly switch with two plans', 'Aylık/yıllık seçimiyle iki plan'), 'soft', (T, p) => band(p, `
    ${head(p, '', T('Choose how you pay.', 'Nasıl ödeyeceğinizi seçin.'), '', 'center')}
    <div style="display:inline-flex;gap:4px;padding:5px;border-radius:999px;background:${p.card};border:1px solid ${p.line};margin-bottom:34px;"><span style="padding:8px 18px;border-radius:999px;color:${p.muted};font-weight:700;">${T('Monthly', 'Aylık')}</span><span style="padding:8px 18px;border-radius:999px;background:${p.accent};color:${p.onAccent};font-weight:700;">${T('Yearly · save 20%', 'Yıllık · %20 tasarruf')}</span></div>
    ${grid(280, [
      plan(p, T, { name: T('Personal', 'Kişisel'), price: '€8', per: T('/month, billed yearly', '/ay, yıllık faturalandırılır'), note: T('For one person', 'Tek kişi için'), cta: T('Choose Personal', "Kişisel'i seçin"), items: [T('All core features', 'Tüm temel özellikler'), T('Sync on 3 devices', '3 cihazda senkronizasyon')] }),
      plan(p, T, { name: T('Family', 'Aile'), price: '€14', per: T('/month, billed yearly', '/ay, yıllık faturalandırılır'), note: T('Up to six people', 'Altı kişiye kadar'), cta: T('Choose Family', "Aile'yi seçin"), hot: true, items: [T('Everything in Personal', "Kişisel'deki her şey"), T('Shared lists', 'Ortak listeler'), T('Parental controls', 'Ebeveyn denetimi')] }),
    ], 20, 'align-items:start;text-align:left;max-width:760px;margin:0 auto;')}`, { align: 'center' }), [1000, 710]),

  section('pricing-single-plan', 'pricing', copy('Single plan', 'Tek plan'), copy('One plan with everything listed', 'Her şeyin listelendiği tek plan'), 'violet', (T, p) => band(p, card(p, grid(260, [
    `<div>${eyebrow(p, T('One simple price', 'Tek, basit bir fiyat'))}${h2(p, T('Everything included.', 'Her şey dahil.'))}${body(p, T('No tiers, no add-ons. One plan with every feature, for every team size.', 'Paket yok, eklenti yok. Her ekip büyüklüğü için tüm özellikleri içeren tek plan.'), 'margin-bottom:22px;font-size:17px;')}${grid(200, [checklist(p, [T('Unlimited users', 'Sınırsız kullanıcı'), T('All integrations', 'Tüm entegrasyonlar'), T('Daily backups', 'Günlük yedekleme')]), checklist(p, [T('Priority support', 'Öncelikli destek'), T('Custom domain', 'Özel alan adı'), T('Cancel any time', 'İstediğiniz an iptal')])], 8)}</div>`,
    `<div style="text-align:center;padding:30px;border-radius:18px;background:${p.accentSoft};"><span style="color:${p.accentInk};font-weight:700;">${T('Per month', 'Aylık')}</span><b style="display:block;font-size:64px;letter-spacing:-0.04em;color:${p.ink};margin:6px 0;">€29</b><span style="display:block;color:${p.muted};margin-bottom:22px;">${T('billed monthly, no contract', 'aylık faturalandırılır, taahhüt yok')}</span>${btn(p, T('Start your free month', 'Ücretsiz ayınızı başlatın'), 'solid', 'display:block;')}</div>`,
  ], 36, 'align-items:center;'), 'padding:clamp(24px,4vw,44px);'), { max: 980 }), [1000, 510]),

  section('pricing-comparison-table', 'pricing', copy('Plan comparison table', 'Plan karşılaştırma tablosu'), copy('Features down the side, plans across the top', 'Yanda özellikler, üstte planlar'), 'light', (T, p) => {
    const rows = [
      [T('Projects', 'Projeler'), '3', T('Unlimited', 'Sınırsız'), T('Unlimited', 'Sınırsız')],
      [T('Team members', 'Ekip üyeleri'), '1', '10', T('Unlimited', 'Sınırsız')],
      [T('Storage', 'Depolama'), '5 GB', '100 GB', '1 TB'],
      [T('Custom domain', 'Özel alan adı'), '—', '✓', '✓'],
      [T('Single sign-on', 'Tek oturum açma'), '—', '—', '✓'],
      [T('Support', 'Destek'), T('Community', 'Topluluk'), T('Email', 'E-posta'), T('Phone and email', 'Telefon ve e-posta')],
    ]
    const cell = 'padding:15px 18px;border-bottom:1px solid ' + p.line + ';text-align:left;'
    return band(p, `
      ${head(p, T('Compare plans', 'Planları karşılaştırın'), T('Find the plan that fits.', 'Size uyan planı bulun.'), '')}
      <div style="overflow-x:auto;border:1px solid ${p.line};border-radius:18px;background:${p.card};">
        <table style="${FONT_BASE}width:100%;min-width:560px;border-collapse:collapse;font-size:15px;color:${p.ink};">
          <thead><tr><th style="${cell}"></th>${[T('Free', 'Ücretsiz'), 'Pro', T('Business', 'Kurumsal')].map((name, i) => `<th style="${cell}font-size:17px;${i === 1 ? `background:${p.accentSoft};` : ''}">${name}<span style="display:block;font-weight:500;color:${p.muted};font-size:14px;">${['€0', '€12', '€39'][i]}</span></th>`).join('')}</tr></thead>
          <tbody>${rows.map(([label, ...values]) => `<tr><th scope="row" style="${cell}font-weight:600;">${label}</th>${values.map((value, i) => `<td style="${cell}${i === 1 ? `background:${p.accentSoft};` : ''}${value === '✓' ? `color:${p.accentInk};font-weight:800;` : value === '—' ? `color:${p.muted};` : ''}">${value}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>`)
  }, [1000, 610]),

  section('pricing-per-seat', 'pricing', copy('Per-seat pricing', 'Kullanıcı başı fiyat'), copy('A seat slider with a live-looking total', 'Kullanıcı kaydırıcısı ve toplam fiyat'), 'ocean', (T, p) => band(p, card(p, `
    ${h2(p, T('Pay per active person.', 'Aktif kişi başına ödeyin.'), 'font-size:clamp(26px,3vw,34px);')}
    ${body(p, T('Only people who log in during the month are counted.', 'Yalnızca ay içinde giriş yapan kişiler sayılır.'), 'margin-bottom:28px;')}
    <label style="display:block;font-weight:700;color:${p.ink};margin-bottom:10px;">${T('Team size: 25 people', 'Ekip büyüklüğü: 25 kişi')}</label>
    <input type="range" min="1" max="200" value="25" aria-label="${T('Team size', 'Ekip büyüklüğü')}" style="width:100%;accent-color:${p.accent};margin-bottom:26px;" />
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:18px;padding-top:22px;border-top:1px solid ${p.line};">
      <div><b style="font-size:40px;color:${p.ink};">€150</b><span style="color:${p.muted};"> ${T('/month · €6 per person', '/ay · kişi başı €6')}</span></div>
      ${btn(p, T('Start a free trial', 'Ücretsiz denemeyi başlatın'))}
    </div>`, 'padding:clamp(24px,4vw,44px);'), { max: 760 }), [1000, 490]),

  section('pricing-with-enterprise', 'pricing', copy('Plans with enterprise', 'Kurumsal seçenekli planlar'), copy('Two plans and a wide enterprise banner', 'İki plan ve geniş bir kurumsal bant'), 'noir', (T, p) => band(p, `
    ${head(p, T('Pricing', 'Fiyatlar'), T('Built for teams of every size.', 'Her büyüklükte ekip için tasarlandı.'), '')}
    ${grid(280, [
      plan(p, T, { name: T('Team', 'Ekip'), price: '€9', per: T('/user/month', '/kullanıcı/ay'), note: T('Up to 50 people', '50 kişiye kadar'), cta: T('Start free trial', 'Ücretsiz denemeyi başlat'), items: [T('All core features', 'Tüm temel özellikler'), T('Email support', 'E-posta desteği')] }),
      plan(p, T, { name: T('Growth', 'Büyüme'), price: '€15', per: T('/user/month', '/kullanıcı/ay'), note: T('Up to 500 people', '500 kişiye kadar'), cta: T('Start free trial', 'Ücretsiz denemeyi başlat'), hot: true, items: [T('Advanced permissions', 'Gelişmiş yetkiler'), T('Priority support', 'Öncelikli destek'), T('Analytics', 'Analizler')] }),
    ], 20, 'align-items:start;margin-bottom:20px;')}
    ${card(p, `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:20px;"><div>${h3(p, T('Enterprise', 'Kurumsal'), 'font-size:22px;')}${body(p, T('Custom contracts, on-premise options and a dedicated team.', 'Özel sözleşmeler, kurum içi kurulum seçenekleri ve özel ekip.'))}</div>${btn(p, T('Contact sales', 'Satış ekibiyle görüşün'), 'ghost')}</div>`, `background:${p.soft};`)}`), [1000, 830]),

  section('pricing-compact-four', 'pricing', copy('Four compact plans', 'Dört kompakt plan'), copy('Four small plan cards in a row', 'Yan yana dört küçük plan kartı'), 'light', (T, p) => band(p, `
    ${head(p, '', T('Memberships', 'Üyelikler'), T('Every membership includes towels, lockers and the sauna.', 'Tüm üyeliklere havlu, dolap ve sauna dahildir.'), 'center')}
    ${grid(200, [[T('Day pass', 'Günlük giriş'), '€15', T('one visit', 'tek giriş')], [T('10 visits', '10 giriş'), '€120', T('valid 6 months', '6 ay geçerli')], [T('Monthly', 'Aylık'), '€69', T('unlimited visits', 'sınırsız giriş')], [T('Yearly', 'Yıllık'), '€590', T('two months free', 'iki ay bedava')]].map(([n, price, note], i) => card(p, `<span style="display:block;color:${p.muted};font-weight:700;margin-bottom:8px;">${n}</span><b style="display:block;font-size:34px;color:${p.ink};">${price}</b><span style="display:block;color:${p.muted};font-size:14px;margin:4px 0 18px;">${note}</span>${btn(p, T('Buy', 'Satın al'), i === 2 ? 'solid' : 'soft', 'display:block;text-align:center;padding:11px;')}`, i === 2 ? `border-color:${p.accent};` : '')), 16, 'text-align:left;')}`, { align: 'center' }), [1000, 490]),

  section('pricing-donation', 'pricing', copy('Donation amounts', 'Bağış miktarları'), copy('Preset gift amounts and what each one does', 'Hazır bağış tutarları ve her birinin etkisi'), 'forest', (T, p) => band(p, card(p, `
    ${h2(p, T('Make a gift today.', 'Bugün bir bağış yapın.'), 'text-align:center;')}
    ${body(p, T('Every amount goes straight to meals, shelter and school supplies.', 'Her tutar doğrudan yemeğe, barınmaya ve okul malzemelerine gider.'), 'text-align:center;margin-bottom:26px;')}
    <div style="display:flex;justify-content:center;gap:6px;margin-bottom:22px;"><span style="padding:9px 18px;border-radius:999px;background:${p.accent};color:${p.onAccent};font-weight:700;">${T('Monthly', 'Aylık')}</span><span style="padding:9px 18px;border-radius:999px;background:${p.soft};color:${p.muted};font-weight:700;">${T('Once', 'Tek sefer')}</span></div>
    ${grid(120, ['€10', '€25', '€50', '€100'].map((amount, i) => `<a href="#" style="display:block;padding:18px 10px;border-radius:14px;text-align:center;text-decoration:none;font-size:22px;font-weight:800;${i === 1 ? `background:${p.accentSoft};color:${p.accentInk};border:2px solid ${p.accent};` : `background:${p.card};color:${p.ink};border:1px solid ${p.line};`}">${amount}</a>`), 10, 'margin-bottom:16px;')}
    <p style="margin:0 0 22px;text-align:center;color:${p.muted};font-size:15px;">${T('€25 a month feeds a family for a week.', 'Aylık €25, bir aileyi bir hafta boyunca doyurur.')}</p>
    ${btn(p, T('Donate €25 monthly', 'Aylık €25 bağışlayın'), 'solid', 'display:block;text-align:center;')}`, 'padding:clamp(24px,4vw,44px);'), { max: 620 }), [1000, 610]),

  section('pricing-with-faq', 'pricing', copy('Pricing with FAQ', "SSS'li fiyatlar"), copy('Two plans followed by common questions', 'İki plan ve ardından sık sorulan sorular'), 'soft', (T, p) => band(p, `
    ${head(p, T('Pricing', 'Fiyatlandırma'), T('Straightforward pricing.', 'Açık ve net fiyatlar.'), '', 'center')}
    ${grid(280, [
      plan(p, T, { name: T('Monthly', 'Aylık'), price: '€19', per: T('/month', '/ay'), note: T('Flexible, cancel any time', 'Esnek, istediğiniz an iptal'), cta: T('Choose monthly', 'Aylığı seçin'), items: [T('All features', 'Tüm özellikler'), T('Email support', 'E-posta desteği')] }),
      plan(p, T, { name: T('Yearly', 'Yıllık'), price: '€190', per: T('/year', '/yıl'), note: T('Two months free', 'İki ay bedava'), cta: T('Choose yearly', 'Yıllığı seçin'), hot: true, items: [T('All features', 'Tüm özellikler'), T('Priority support', 'Öncelikli destek')] }),
    ], 20, 'align-items:start;text-align:left;max-width:760px;margin:0 auto 44px;')}
    <div style="max-width:760px;margin:0 auto;text-align:left;display:grid;gap:10px;">${[
      [T('Can I switch plans later?', 'Planımı sonra değiştirebilir miyim?'), T('Yes. Changes apply from your next billing date.', 'Evet. Değişiklikler bir sonraki fatura tarihinden itibaren geçerli olur.')],
      [T('Do you offer refunds?', 'Para iadesi yapıyor musunuz?'), T('We refund any payment within 30 days, no questions asked.', 'Her ödemeyi 30 gün içinde, soru sormadan iade ederiz.')],
      [T('Is VAT included?', 'KDV dahil mi?'), T('Prices exclude VAT, which is added at checkout.', 'Fiyatlara KDV dahil değildir; ödeme sırasında eklenir.')],
    ].map(([q, a]) => `<details style="border:1px solid ${p.line};border-radius:14px;background:${p.card};padding:16px 20px;"><summary style="cursor:pointer;font-weight:700;color:${p.ink};">${q}</summary><p style="margin:10px 0 0;color:${p.muted};line-height:1.6;">${a}</p></details>`).join('')}</div>`, { align: 'center' }), [1000, 850]),
]

const product = (p, T, seed, name, price, extra = '') => `
  <article style="border-radius:18px;overflow:hidden;background:${p.card};border:1px solid ${p.line};">
    ${photo(seed, 500, 560, { radius: 0 })}
    <div style="padding:16px 18px 18px;">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin-bottom:12px;"><b style="color:${p.ink};font-size:16px;">${name}</b><span style="color:${p.ink};font-weight:800;">${price}</span></div>
      ${extra}
      ${btn(p, T('Add to cart', 'Sepete ekle'), 'soft', 'display:block;text-align:center;padding:10px;font-size:14.5px;')}
    </div>
  </article>`

export const COMMERCE_SECTIONS = [
  section('shop-product-grid', 'commerce', copy('Product grid', 'Ürün ızgarası'), copy('Four products with photo, price and a button', 'Fotoğraf, fiyat ve düğmeli dört ürün'), 'light', (T, p) => band(p, `
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:14px;margin-bottom:30px;">${h2(p, T('Bestsellers', 'Çok satanlar'), 'margin:0;')}<a href="#" style="color:${p.accentInk};font-weight:700;text-decoration:none;">${T('Shop all →', 'Tümünü gör →')}</a></div>
    ${grid(210, [
      product(p, T, 'ceramic-mug', T('Stoneware mug', 'Taşçini kupa'), '€24'),
      product(p, T, 'linen-towel', T('Linen tea towel', 'Keten kurulama bezi'), '€18'),
      product(p, T, 'oak-board', T('Oak serving board', 'Meşe servis tahtası'), '€42'),
      product(p, T, 'beeswax-candle', T('Beeswax candle', 'Balmumu mum'), '€16'),
    ], 18)}`), [1000, 610]),

  section('shop-product-detail', 'commerce', copy('Product detail', 'Ürün ayrıntısı'), copy('Photo, price, options and an add-to-cart button', 'Fotoğraf, fiyat, seçenekler ve sepete ekle düğmesi'), 'soft', (T, p) => band(p, grid(320, [
    `<div style="display:grid;gap:12px;">${photo('linen-shirt', 720, 820, { radius: 20 })}<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">${['linen-a', 'linen-b', 'linen-c', 'linen-d'].map((seed) => photo(seed, 200, 200, { radius: 12, ratio: '1/1' })).join('')}</div></div>`,
    `<div>
      ${eyebrow(p, T('New season', 'Yeni sezon'))}
      ${h2(p, T('Relaxed linen shirt', 'Rahat kesim keten gömlek'))}
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">${stars(p, 5)}<span style="color:${p.muted};font-size:14px;">${T('128 reviews', '128 yorum')}</span></div>
      <b style="display:block;font-size:30px;color:${p.ink};margin-bottom:18px;">€79</b>
      ${body(p, T('Washed European linen that gets softer every time. Cut loose, with a relaxed collar and mother-of-pearl buttons.', 'Her yıkamada biraz daha yumuşayan yıkanmış Avrupa keteni. Bol kesim, rahat yaka ve sedef düğmeler.'), 'margin-bottom:22px;')}
      <p style="margin:0 0 10px;font-weight:700;color:${p.ink};">${T('Colour', 'Renk')}</p>
      <div style="display:flex;gap:10px;margin-bottom:20px;">${['#e7dcc8', '#8a9a7b', '#2f3e4e', '#c9a27e'].map((c, i) => `<span style="width:32px;height:32px;border-radius:50%;background:${c};${i === 0 ? `outline:2px solid ${p.accent};outline-offset:3px;` : ''}"></span>`).join('')}</div>
      <p style="margin:0 0 10px;font-weight:700;color:${p.ink};">${T('Size', 'Beden')}</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;">${['XS', 'S', 'M', 'L', 'XL'].map((s, i) => `<span style="min-width:48px;padding:10px 12px;border-radius:10px;text-align:center;font-weight:700;${i === 2 ? `background:${p.ink};color:${p.bg};` : `border:1px solid ${p.line};color:${p.ink};background:${p.card};`}">${s}</span>`).join('')}</div>
      ${btn(p, T('Add to cart', 'Sepete ekle'), 'solid', 'display:block;text-align:center;margin-bottom:12px;')}
      <p style="margin:0;color:${p.muted};font-size:14px;">${T('Free delivery over €60 · Free returns for 30 days', '€60 üzeri ücretsiz kargo · 30 gün ücretsiz iade')}</p>
    </div>`,
  ], 44, 'align-items:start;')), [1000, 800]),

  section('shop-categories', 'commerce', copy('Shop categories', 'Mağaza kategorileri'), copy('Category tiles with photos and item counts', 'Fotoğraflı ve ürün sayılı kategori kutuları'), 'warm', (T, p) => band(p, `
    ${h2(p, T('Shop by category', 'Kategoriye göre alışveriş'), 'margin-bottom:28px;')}
    ${grid(200, [['kitchen', T('Kitchen', 'Mutfak'), 48], ['bedroom', T('Bedroom', 'Yatak odası'), 32], ['living-room', T('Living', 'Oturma odası'), 56], ['garden-tools', T('Garden', 'Bahçe'), 21]].map(([seed, name, n]) => `<a href="#" style="display:block;text-decoration:none;">${photo(seed, 460, 560, { radius: 18, extra: 'margin-bottom:12px;' })}<b style="display:block;color:${p.ink};font-size:17px;">${name}</b><span style="color:${p.muted};font-size:14px;">${n} ${T('products', 'ürün')}</span></a>`), 18)}`), [1000, 560]),

  section('shop-sale-banner', 'commerce', copy('Sale banner', 'İndirim bandı'), copy('Big discount with a deadline, on dark', 'Koyu zeminde son tarihli büyük indirim'), 'noir', (T, p) => band(p, grid(300, [
    `<div><p style="margin:0;font-size:clamp(80px,14vw,170px);font-weight:900;line-height:0.85;letter-spacing:-0.05em;color:${p.accentInk};">−40%</p></div>`,
    `<div>${h2(p, T('The summer sale ends Sunday.', 'Yaz indirimi Pazar günü bitiyor.'))}${lead(p, T('Up to forty percent off linen, ceramics and outdoor furniture while stocks last.', 'Stoklar tükenene kadar keten, seramik ve bahçe mobilyalarında yüzde kırka varan indirim.'))}${buttons(btn(p, T('Shop the sale', 'İndirimdekileri gör')), btn(p, T('New arrivals', 'Yeni gelenler'), 'ghost'))}</div>`,
  ], 30, 'align-items:center;')), [1000, 390]),

  section('shop-cart-summary', 'commerce', copy('Cart summary', 'Sepet özeti'), copy('Cart items beside an order summary', 'Sepet ürünlerinin yanında sipariş özeti'), 'light', (T, p) => band(p, `
    ${h2(p, T('Your cart', 'Sepetiniz'), 'margin-bottom:24px;')}
    ${grid(300, [
      `<div style="border-top:1px solid ${p.line};">${[['cart-lamp', T('Ceramic table lamp', 'Seramik masa lambası'), T('Sand · 1 item', 'Kum rengi · 1 adet'), '€89'], ['cart-throw', T('Wool throw', 'Yün şal örtü'), T('Oat · 2 items', 'Yulaf · 2 adet'), '€158']].map(([seed, name, meta, price]) => `<div style="display:grid;grid-template-columns:84px 1fr auto;gap:16px;align-items:center;padding:18px 0;border-bottom:1px solid ${p.line};">${photo(seed, 200, 200, { radius: 12, ratio: '1/1' })}<div><b style="display:block;color:${p.ink};">${name}</b><span style="color:${p.muted};font-size:14px;">${meta}</span></div><b style="color:${p.ink};">${price}</b></div>`).join('')}</div>`,
      card(p, `${h3(p, T('Order summary', 'Sipariş özeti'))}${[[T('Subtotal', 'Ara toplam'), '€247'], [T('Delivery', 'Kargo'), T('Free', 'Ücretsiz')], [T('VAT', 'KDV'), '€49.40']].map(([l, v]) => `<div style="display:flex;justify-content:space-between;padding:8px 0;color:${p.muted};">${l}<span style="color:${p.ink};">${v}</span></div>`).join('')}<div style="display:flex;justify-content:space-between;padding:14px 0 18px;margin-top:6px;border-top:1px solid ${p.line};font-weight:800;color:${p.ink};font-size:18px;">${T('Total', 'Toplam')}<span>€296.40</span></div>${btn(p, T('Go to checkout', 'Ödemeye geç'), 'solid', 'display:block;text-align:center;')}`, `background:${p.soft};`),
    ], 28, 'align-items:start;')}`), [1000, 530]),

  section('shop-featured-product', 'commerce', copy('Featured product', 'Öne çıkan ürün'), copy('One product with a big photo and a review', 'Büyük fotoğraflı ve yorumlu tek ürün'), 'rose', (T, p) => band(p, grid(320, [
    photo('perfume-bottle', 720, 720, { radius: 26, ratio: '1/1' }),
    `<div>${chip(p, T('Editor’s pick', 'Editörün seçimi'))}${h2(p, T('Fig & Cedar eau de parfum', 'İncir ve Sedir eau de parfum'), 'margin-top:18px;')}${lead(p, T('Green fig leaves, warm cedar and a trace of sea salt. Made in small batches in Grasse.', "Yeşil incir yaprakları, sıcak sedir ve hafif bir deniz tuzu dokunuşu. Grasse'da küçük partiler hâlinde üretildi."))}
      <b style="display:block;font-size:30px;color:${p.ink};margin-bottom:22px;">€110 <span style="font-size:16px;color:${p.muted};font-weight:500;">/ 50 ml</span></b>
      ${buttons(btn(p, T('Add to cart', 'Sepete ekle')), btn(p, T('Order a sample', 'Numune isteyin'), 'ghost'))}
      ${card(p, `${stars(p, 5)}<p style="margin:10px 0 8px;color:${p.ink};font-style:italic;">${T('“The only perfume people stop me to ask about.”', '“İnsanların beni durdurup sorduğu tek parfüm.”')}</p><span style="color:${p.muted};font-size:14px;">— Leyla, ${T('verified buyer', 'onaylı alıcı')}</span>`, 'margin-top:26px;padding:20px;')}
    </div>`,
  ], 48, 'align-items:center;')), [1000, 660]),

  section('shop-bundle', 'commerce', copy('Product bundle', 'Ürün paketi'), copy('Three products sold together at a lower price', 'Birlikte daha uygun fiyata satılan üç ürün'), 'forest', (T, p) => band(p, `
    ${head(p, T('Save with a bundle', 'Paketle tasarruf edin'), T('The morning coffee set.', 'Sabah kahvesi seti.'), '')}
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:16px;">
      ${[['pour-over', T('Pour-over', 'Pour-over demlik'), '€38'], ['coffee-beans', T('House blend, 500 g', 'Ev harmanı, 500 g'), '€16'], ['glass-carafe', T('Glass carafe', 'Cam sürahi'), '€24']].map(([seed, name, price], i) => `${i ? `<span aria-hidden="true" style="font-size:28px;font-weight:800;color:${p.muted};">+</span>` : ''}<div style="flex:1 1 170px;text-align:center;">${photo(seed, 400, 400, { radius: 18, ratio: '1/1', extra: 'margin-bottom:12px;' })}<b style="display:block;color:${p.ink};">${name}</b><span style="color:${p.muted};">${price}</span></div>`).join('')}
      <div style="flex:1 1 220px;">${card(p, `<span style="color:${p.muted};text-decoration:line-through;">€78</span><b style="display:block;font-size:40px;color:${p.ink};">€64</b><span style="display:block;color:${p.accentInk};font-weight:700;margin-bottom:18px;">${T('You save €14', '€14 tasarruf')}</span>${btn(p, T('Add the set', 'Seti ekleyin'), 'solid', 'display:block;text-align:center;')}`, 'text-align:center;')}</div>
    </div>`), [1000, 490]),

  section('shop-guarantees', 'commerce', copy('Shop guarantees', 'Mağaza güvenceleri'), copy('Delivery, returns and payment promises', 'Kargo, iade ve ödeme güvenceleri'), 'light', (T, p) => band(p, grid(220, [
    ['🚚', T('Free delivery over €60', '€60 üzeri ücretsiz kargo'), T('Dispatched within 24 hours.', '24 saat içinde kargoda.')],
    ['↩', T('30-day returns', '30 gün içinde iade'), T('Free return label in every box.', 'Her kutuda ücretsiz iade etiketi.')],
    ['🔒', T('Secure checkout', 'Güvenli ödeme'), T('Cards, bank transfer and pay later.', 'Kart, havale ve sonra öde.')],
    ['⭐', T('Rated 4.9/5', '4,9/5 puan'), T('From 6,000 verified reviews.', '6.000 onaylı yorumdan.')],
  ].map(([i, h, t]) => `<div style="display:flex;gap:14px;"><span aria-hidden="true" style="flex-shrink:0;display:grid;place-items:center;width:46px;height:46px;border-radius:14px;background:${p.accentSoft};color:${p.accentInk};font-size:20px;">${i}</span><div>${h3(p, h, 'font-size:16px;margin-bottom:4px;')}${body(p, t, 'font-size:14px;')}</div></div>`), 22), { pad: '44px 24px', extra: `border-top:1px solid ${p.line};border-bottom:1px solid ${p.line};` }), [1000, 190]),

  section('shop-new-arrivals', 'commerce', copy('New arrivals, dark', 'Yeni gelenler, koyu'), copy('A sideways-scrolling row of products on dark', 'Koyu zeminde yana kayan ürün satırı'), 'dark', (T, p) => band(p, `
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:14px;margin-bottom:26px;">${h2(p, T('New arrivals', 'Yeni gelenler'), 'margin:0;')}<span style="color:${p.muted};font-size:14px;">${T('Scroll for more →', 'Daha fazlası için kaydırın →')}</span></div>
    <div style="display:grid;grid-auto-flow:column;grid-auto-columns:minmax(220px,1fr);gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:10px;">
      ${[['sneaker-white', T('Court sneaker', 'Kort ayakkabısı'), '€120'], ['canvas-bag', T('Canvas weekender', 'Kanvas seyahat çantası'), '€95'], ['field-watch', T('Field watch', 'Saha saati'), '€180'], ['wool-cap', T('Wool cap', 'Yün bere'), '€35'], ['leather-belt', T('Leather belt', 'Deri kemer'), '€55']].map(([seed, name, price]) => `<div style="scroll-snap-align:start;">${photo(seed, 440, 520, { radius: 16, extra: 'margin-bottom:12px;' })}<div style="display:flex;justify-content:space-between;gap:10px;"><b style="color:${p.ink};">${name}</b><span style="color:${p.accentInk};font-weight:700;">${price}</span></div></div>`).join('')}
    </div>`), [1000, 550]),

  section('shop-checkout-steps', 'commerce', copy('Checkout steps', 'Ödeme adımları'), copy('A three-step progress bar with a delivery form', 'Üç adımlı ilerleme çubuğu ve teslimat formu'), 'soft', (T, p) => band(p, `
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:30px;">${[T('Cart', 'Sepet'), T('Delivery', 'Teslimat'), T('Payment', 'Ödeme')].map((step, i) => `<div style="flex:1 1 160px;"><div style="height:6px;border-radius:999px;background:${i < 2 ? p.accent : p.line};margin-bottom:10px;"></div><span style="font-weight:700;color:${i < 2 ? p.ink : p.muted};">${i + 1}. ${step}</span></div>`).join('')}</div>
    ${card(p, `${h3(p, T('Delivery details', 'Teslimat bilgileri'), 'font-size:22px;margin-bottom:20px;')}<div style="display:grid;gap:14px;">${grid(220, [input(p, T('First name', 'Ad')), input(p, T('Last name', 'Soyad'))], 14)}${input(p, T('Street and number', 'Sokak ve numara'))}${grid(160, [input(p, T('Postcode', 'Posta kodu')), input(p, T('City', 'Şehir')), input(p, T('Phone', 'Telefon'), 'tel')], 14)}<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:14px;margin-top:8px;"><a href="#" style="color:${p.muted};text-decoration:none;">← ${T('Back to cart', 'Sepete dön')}</a>${btn(p, T('Continue to payment', 'Ödemeye devam et'))}</div></div>`)}`, { max: 820 }), [1000, 570]),
]

export const COMPARISON_SECTIONS = [
  section('compare-us-vs-others', 'comparison', copy('Us vs others', 'Biz ve diğerleri'), copy('A tick-and-cross table against alternatives', 'Alternatiflere karşı tik ve çarpı tablosu'), 'light', (T, p) => {
    const cell = `padding:15px 18px;border-bottom:1px solid ${p.line};text-align:center;`
    const rows = [[T('Set up in one day', 'Bir günde kurulum'), true, false, false], [T('No per-user fees', 'Kullanıcı başı ücret yok'), true, true, false], [T('Works offline', 'Çevrim dışı çalışır'), true, false, true], [T('Local support team', 'Yerel destek ekibi'), true, false, false], [T('Export your data', 'Verilerinizi dışa aktarma'), true, true, true]]
    return band(p, `
      ${head(p, T('Why switch', 'Neden geçmelisiniz'), T('How we compare.', 'Diğerleriyle karşılaştırma.'), '', 'center')}
      <div style="overflow-x:auto;border:1px solid ${p.line};border-radius:18px;background:${p.card};">
        <table style="${FONT_BASE}width:100%;min-width:520px;border-collapse:collapse;color:${p.ink};font-size:15px;">
          <thead><tr><th style="${cell}text-align:left;"></th><th style="${cell}background:${p.accentSoft};color:${p.accentInk};font-size:17px;">${T('Us', 'Biz')}</th><th style="${cell}">${T('Spreadsheets', 'Tablolar')}</th><th style="${cell}">${T('Big platforms', 'Büyük platformlar')}</th></tr></thead>
          <tbody>${rows.map(([label, ...values]) => `<tr><th scope="row" style="${cell}text-align:left;font-weight:600;">${label}</th>${values.map((yes, i) => `<td style="${cell}${i === 0 ? `background:${p.accentSoft};` : ''}color:${yes ? (i === 0 ? p.accentInk : '#16a34a') : '#dc2626'};font-weight:800;">${yes ? '✓' : '✕'}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>`, { align: 'center', max: 900 })
  }, [1000, 550]),

  section('compare-feature-matrix', 'comparison', copy('Feature matrix', 'Özellik matrisi'), copy('Grouped features across three plans', 'Üç planda gruplanmış özellikler'), 'soft', (T, p) => {
    const cell = `padding:13px 16px;border-bottom:1px solid ${p.line};text-align:center;`
    const group = (name, rows) => `<tr><th colspan="4" style="${cell}text-align:left;background:${p.soft};color:${p.accentInk};font-size:13px;">${name}</th></tr>${rows.map(([label, ...values]) => `<tr><th scope="row" style="${cell}text-align:left;font-weight:500;">${label}</th>${values.map((v) => `<td style="${cell}${v === '✓' ? `color:${p.accentInk};font-weight:800;` : v === '—' ? `color:${p.muted};` : ''}">${v}</td>`).join('')}</tr>`).join('')}`
    return band(p, `
      ${head(p, '', T('Every feature, side by side.', 'Tüm özellikler yan yana.'), '')}
      <div style="overflow-x:auto;border:1px solid ${p.line};border-radius:18px;background:${p.card};">
        <table style="${FONT_BASE}width:100%;min-width:560px;border-collapse:collapse;color:${p.ink};font-size:15px;">
          <thead><tr><th style="${cell}"></th>${['Basic', 'Plus', 'Pro'].map((name) => `<th style="${cell}font-size:17px;">${name}</th>`).join('')}</tr></thead>
          <tbody>
            ${group(T('Workspace', 'Çalışma alanı'), [[T('Projects', 'Projeler'), '5', '50', '∞'], [T('Guests', 'Misafirler'), '—', '✓', '✓']])}
            ${group(T('Security', 'Güvenlik'), [[T('Two-factor login', 'İki adımlı giriş'), '✓', '✓', '✓'], [T('Single sign-on', 'Tek oturum açma'), '—', '—', '✓']])}
            ${group(T('Support', 'Destek'), [[T('Help centre', 'Yardım merkezi'), '✓', '✓', '✓'], [T('Phone support', 'Telefon desteği'), '—', '—', '✓']])}
          </tbody>
        </table>
      </div>`)
  }, [1000, 660]),

  section('compare-two-options', 'comparison', copy('Two options', 'İki seçenek'), copy('Two cards side by side with pros', 'Artılarıyla yan yana iki kart'), 'dark', (T, p) => band(p, `
    ${head(p, '', T('Rent or buy? Here is the difference.', 'Kiralamak mı, satın almak mı? Fark burada.'), '', 'center')}
    ${grid(280, [[T('Rent', 'Kiralama'), '€49', T('/month', '/ay'), [T('No upfront cost', 'Peşin maliyet yok'), T('Maintenance included', 'Bakım dahil'), T('Upgrade every two years', 'İki yılda bir yenileme')]], [T('Buy', 'Satın alma'), '€1,290', T('once', 'tek sefer'), [T('Yours to keep', 'Sonsuza kadar sizin'), T('Three-year warranty', 'Üç yıl garanti'), T('Lower cost over time', 'Uzun vadede daha düşük maliyet')]]].map(([h, price, per, items], i) => card(p, `${h3(p, h, 'font-size:22px;')}<div style="display:flex;align-items:baseline;gap:6px;margin:6px 0 20px;"><b style="font-size:38px;color:${p.ink};">${price}</b><span style="color:${p.muted};">${per}</span></div>${checklist(p, items, 'margin-bottom:22px;')}${btn(p, i ? T('Buy now', 'Hemen satın al') : T('Start renting', 'Kiralamaya başla'), i ? 'solid' : 'ghost', 'display:block;text-align:center;')}`, 'text-align:left;')), 20, 'max-width:800px;margin:0 auto;')}`, { align: 'center' }), [1000, 570]),

  section('compare-old-new', 'comparison', copy('Old way vs new way', 'Eski yol ve yeni yol'), copy('Two columns contrasting the old and new way', 'Eski ve yeni yolu karşılaştıran iki sütun'), 'warm', (T, p) => band(p, `
    ${head(p, '', T('There is a better way to book.', 'Rezervasyon yapmanın daha iyi bir yolu var.'), '')}
    ${grid(300, [
      `<div style="padding:26px;border-radius:18px;border:1px dashed ${p.line};"><h3 style="margin:0 0 16px;color:${p.muted};">${T('The old way', 'Eski yol')}</h3>${[T('Call during office hours', 'Mesai saatlerinde arayın'), T('Wait on hold', 'Hatta bekleyin'), T('Write the time on a sticky note', 'Saati bir yapışkan nota yazın'), T('Forget and miss it', 'Unutun ve kaçırın')].map((item, i) => `<p style="margin:0 0 12px;color:${p.muted};"><span style="font-weight:800;">${i + 1}.</span> ${item}</p>`).join('')}</div>`,
      `<div style="padding:26px;border-radius:18px;background:${p.accent};color:${p.onAccent};"><h3 style="margin:0 0 16px;">${T('The new way', 'Yeni yol')}</h3>${[T('Book online in 30 seconds', '30 saniyede online randevu'), T('Pick any free time', 'Boş olan herhangi bir saati seçin'), T('Get a reminder the day before', 'Bir gün önce hatırlatma alın'), T('Reschedule with one tap', 'Tek dokunuşla saati değiştirin')].map((item) => `<p style="margin:0 0 12px;"><span style="font-weight:900;">✓</span> ${item}</p>`).join('')}</div>`,
    ], 20)}`), [1000, 470]),
]

const menuRow = (p, name, desc, price) => `<div style="margin-bottom:18px;"><div style="display:flex;align-items:baseline;gap:10px;"><b style="color:${p.ink};font-size:17px;">${name}</b><span aria-hidden="true" style="flex:1;border-bottom:2px dotted ${p.line};transform:translateY(-4px);"></span><b style="color:${p.accentInk};">${price}</b></div>${desc ? `<span style="color:${p.muted};font-size:14.5px;">${desc}</span>` : ''}</div>`

export const MENU_SECTIONS = [
  section('menu-restaurant', 'menu', copy('Restaurant menu', 'Restoran menüsü'), copy('Two columns of dishes with dotted price lines', 'Noktalı fiyat çizgili iki sütun yemek'), 'warm', (T, p) => band(p, `
    ${head(p, T('Menu', 'Menü'), T('Tonight’s menu', 'Bu akşamın menüsü'), T('Changes with the market. Please tell us about any allergies.', 'Pazara göre değişir. Lütfen alerjilerinizi bize bildirin.'), 'center')}
    ${grid(300, [
      `<div><h3 style="margin:0 0 18px;color:${p.accentInk};font-size:15px;letter-spacing:0.06em;">${T('To start', 'Başlangıçlar')}</h3>${menuRow(p, T('Grilled halloumi', 'Izgara hellim'), T('Fig jam, walnuts, thyme', 'İncir reçeli, ceviz, kekik'), '€9')}${menuRow(p, T('Smoked aubergine', 'Közlenmiş patlıcan'), T('Yoghurt, garlic, chilli butter', 'Yoğurt, sarımsak, acılı tereyağı'), '€8')}${menuRow(p, T('Sea bass crudo', 'Levrek crudo'), T('Lemon, olive oil, fennel', 'Limon, zeytinyağı, rezene'), '€12')}</div>`,
      `<div><h3 style="margin:0 0 18px;color:${p.accentInk};font-size:15px;letter-spacing:0.06em;">${T('Mains', 'Ana yemekler')}</h3>${menuRow(p, T('Slow-cooked lamb', 'Ağır ateşte kuzu'), T('Bulgur, roasted peppers', 'Bulgur, közlenmiş biber'), '€24')}${menuRow(p, T('Whole grilled fish', 'Bütün ızgara balık'), T('Catch of the day, greens', 'Günün balığı, yeşillik'), '€26')}${menuRow(p, T('Stuffed courgette flowers', 'Kabak çiçeği dolması'), T('Rice, herbs, pine nuts', 'Pirinç, otlar, çam fıstığı'), '€18')}</div>`,
    ], 48, 'text-align:left;')}`, { align: 'center', max: 960 }), [1000, 530]),

  section('menu-drinks-dark', 'menu', copy('Drinks menu, dark', 'İçecek menüsü, koyu'), copy('A drinks board on dark with three columns', 'Koyu zeminde üç sütunlu içecek panosu'), 'noir', (T, p) => band(p, `
    ${h2(p, T('At the bar', 'Barda'), 'margin-bottom:30px;')}
    ${grid(240, [
      [T('Coffee', 'Kahve'), [['Espresso', '', '€2.5'], ['Flat white', '', '€3.5'], [T('Filter, single origin', 'Filtre, tek köken'), '', '€4']]],
      [T('Cocktails', 'Kokteyller'), [['Negroni', '', '€11'], [T('Fig old fashioned', 'İncirli old fashioned'), '', '€12'], ['Spritz', '', '€9']]],
      [T('Without alcohol', 'Alkolsüz'), [[T('House lemonade', 'Ev yapımı limonata'), '', '€4.5'], [T('Cold brew tonic', 'Cold brew tonik'), '', '€5'], [T('Fresh orange juice', 'Taze portakal suyu'), '', '€4']]],
    ].map(([title, rows]) => `<div><h3 style="margin:0 0 18px;color:${p.accentInk};font-size:15px;letter-spacing:0.06em;">${title}</h3>${rows.map(([n, d, pr]) => menuRow(p, n, d, pr)).join('')}</div>`), 36)}`), [1000, 390]),

  section('menu-price-list', 'menu', copy('Price list', 'Fiyat listesi'), copy('Services and prices grouped under headings', 'Başlıklar altında gruplanmış hizmetler ve fiyatlar'), 'light', (T, p) => band(p, `
    ${head(p, T('Price list', 'Fiyat listesi'), T('Hair and colour', 'Saç ve renk'), '', 'center')}
    ${grid(300, [
      `<div>${card(p, `<h3 style="margin:0 0 18px;color:${p.ink};">${T('Cut and style', 'Kesim ve şekillendirme')}</h3>${menuRow(p, T('Women’s cut', 'Kadın kesim'), '', '€45')}${menuRow(p, T('Men’s cut', 'Erkek kesim'), '', '€30')}${menuRow(p, T('Blow-dry', 'Fön'), '', '€25')}${menuRow(p, T('Children under 12', '12 yaş altı çocuk'), '', '€18')}`)}</div>`,
      `<div>${card(p, `<h3 style="margin:0 0 18px;color:${p.ink};">${T('Colour', 'Boya')}</h3>${menuRow(p, T('Root colour', 'Dip boya'), '', '€55')}${menuRow(p, T('Full colour', 'Tüm saç boya'), '', '€75')}${menuRow(p, T('Balayage', 'Balyaj'), '', T('from €120', '€120’den'))}${menuRow(p, T('Toner', 'Tonlama'), '', '€25')}`)}</div>`,
    ], 20, 'text-align:left;')}
    <p style="margin:24px 0 0;color:${p.muted};font-size:14px;">${T('Prices include a consultation and aftercare advice.', 'Fiyatlara ön görüşme ve bakım önerileri dahildir.')}</p>`, { align: 'center', max: 900 }), [1000, 530]),

  section('menu-weekly-specials', 'menu', copy('Weekly specials', 'Haftanın özel lezzetleri'), copy('Three dishes of the week with photos', 'Fotoğraflı üç haftalık özel yemek'), 'rose', (T, p) => band(p, `
    ${head(p, T('This week only', 'Yalnızca bu hafta'), T('Specials from the kitchen.', 'Mutfaktan özel lezzetler.'), '')}
    ${grid(250, [['pasta-plate', T('Wild mushroom pasta', 'Yabani mantarlı makarna'), '€16', T('Monday to Wednesday', 'Pazartesi–Çarşamba')], ['fish-plate', T('Grilled sardines', 'Izgara sardalya'), '€14', T('Thursday and Friday', 'Perşembe ve Cuma')], ['cake-slice', T('Pistachio cake', 'Fıstıklı kek'), '€7', T('All week', 'Bütün hafta')]].map(([seed, name, price, when]) => `<article style="border-radius:20px;overflow:hidden;background:${p.card};border:1px solid ${p.line};">${photo(seed, 600, 440, { radius: 0 })}<div style="padding:18px 20px;">${chip(p, when, 'margin-bottom:10px;')}<div style="display:flex;justify-content:space-between;gap:10px;">${h3(p, name, 'margin:0;')}<b style="color:${p.accentInk};">${price}</b></div></div></article>`), 18)}`), [1000, 590]),

  section('menu-opening-hours', 'menu', copy('Opening hours', 'Çalışma saatleri'), copy('A week of opening hours with today highlighted', 'Bugünün vurgulandığı haftalık çalışma saatleri'), 'forest', (T, p) => band(p, grid(300, [
    `<div>${eyebrow(p, T('Opening hours', 'Çalışma saatleri'))}${h2(p, T('When to find us.', 'Bizi ne zaman bulabilirsiniz.'))}${body(p, T('Kitchen closes thirty minutes before we do. Closed on public holidays.', 'Mutfak kapanıştan otuz dakika önce kapanır. Resmî tatillerde kapalıyız.'), 'font-size:17px;')}</div>`,
    card(p, [[T('Monday', 'Pazartesi'), T('Closed', 'Kapalı')], [T('Tuesday', 'Salı'), '12:00 – 22:00'], [T('Wednesday', 'Çarşamba'), '12:00 – 22:00'], [T('Thursday', 'Perşembe'), '12:00 – 23:00'], [T('Friday', 'Cuma'), '12:00 – 24:00'], [T('Saturday', 'Cumartesi'), '10:00 – 24:00'], [T('Sunday', 'Pazar'), '10:00 – 21:00']].map(([day, hours], i) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:11px 14px;border-radius:10px;${i === 4 ? `background:${p.accentSoft};color:${p.accentInk};font-weight:800;` : `color:${p.ink};`}"><span>${day}</span><span>${hours}</span></div>`).join(''), 'padding:12px;'),
  ], 44, 'align-items:center;')), [1000, 480]),
]
