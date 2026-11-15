// Everyday widgets use distinct print, craft, travel and entertainment forms.
// Each bilingual definition keeps editable words in block leaves so the text
// panel can replace them without removing neighbouring decoration or structure.
import { FONT, copy, variant } from './kit.js'

const wrap = (style, inner) => `<div style="${FONT}${style}">${inner}</div>`
const SERIF = "font-family:Georgia,'Times New Roman',serif;"
const SANS = 'font-family:Arial,Helvetica,sans-serif;'
const MONO = 'font-family:ui-monospace,Menlo,monospace;'

const PORTFOLIO = [
  variant('life-newspaper-intro', copy('Personal newspaper edition', 'Kişisel gazete baskısı'), (T) => wrap(`max-width:520px;padding:18px 20px 20px;background:#faf7ef;border-top:5px solid #25221e;border-bottom:3px double #25221e;color:#25221e;${SERIF}`, `
    <div style="display:flex;justify-content:space-between;gap:12px;padding-bottom:7px;border-bottom:1px solid #25221e;font-size:11px;letter-spacing:0.12em;${SANS}"><div>${T('THE EVERYDAY EDITION', 'GÜNDELİK BASKI')}</div><div>${T('VOL. 04', 'SAYI 04')}</div></div>
    <h2 style="margin:12px 0 14px;font-size:35px;line-height:1.08;font-weight:700;letter-spacing:-0.035em;">${T('Good work starts with a closer look.', 'İyi iş, dikkatle bakınca başlar.')}</h2>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:18px;">
      <div><div style="margin-bottom:6px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#8c341f;${SANS}">${T('DESIGN · WRITING · RESEARCH', 'TASARIM · YAZI · ARAŞTIRMA')}</div><div style="font-size:15px;line-height:1.55;">${T('I turn careful questions into useful things. Here are the people, places and projects that shape my work.', 'Dikkatli soruları yararlı işlere dönüştürüyorum. İşlerime yön veren insanları, yerleri ve projeleri burada bulabilirsiniz.')}</div></div>
      <div style="padding-left:12px;border-left:1px solid #81786b;${SANS}"><div style="font-size:10px;font-weight:700;letter-spacing:0.12em;">${T('BY THE NUMBERS', 'SAYILARLA')}</div><div style="margin-top:8px;font-size:31px;font-weight:800;line-height:1;">12</div><div style="margin-top:3px;font-size:12px;line-height:1.4;">${T('projects worth a second look', 'yeniden bakmaya değer proje')}</div></div>
    </div>`)),

  variant('life-gallery-placard', copy('Portfolio gallery placard', 'Portfolyo sergi etiketi'), (T) => wrap(`display:grid;grid-template-columns:56px minmax(0,1fr);gap:20px;max-width:500px;padding:24px 20px;background:#fbfaf7;border-bottom:1px solid #9b978e;color:#242424;${SANS}`, `
    <div style="font-size:42px;font-weight:300;line-height:1;color:#595650;">01</div>
    <div><h3 style="margin:0 0 5px;font-size:23px;font-weight:500;line-height:1.15;">${T('A map of small places', 'Küçük yerlerin haritası')}</h3><div style="font-size:12px;letter-spacing:0.04em;color:#55524c;">${T('2026 · Editorial design, field notes', '2026 · Yayın tasarımı, saha notları')}</div><div style="margin:18px 0;font-size:14px;line-height:1.65;">${T('An independent guide to the corners of a city that rarely make the guidebooks. Built from long walks and short conversations.', 'Bir şehrin rehberlere pek girmeyen köşeleri için bağımsız bir kılavuz. Uzun yürüyüşlerden ve kısa sohbetlerden doğdu.')}</div><div style="padding-top:9px;border-top:1px solid #c6c2b8;font-size:11px;line-height:1.5;color:#55524c;">${T('Personal collection · Available for collaboration', 'Kişisel seçki · Ortak çalışmalara açık')}</div></div>`)),

  variant('life-maker-label', copy('Woven maker label', 'Dokuma üretici etiketi'), (T) => wrap(`display:grid;grid-template-columns:15px minmax(0,1fr) 15px;gap:12px;max-width:440px;padding:12px;background:#e9ddc5;border:3px double #3c4539;color:#283428;${SANS}`, `
    <div aria-hidden="true" style="background:repeating-linear-gradient(0deg,#66715d 0 2px,transparent 2px 6px);border-left:1px solid #66715d;border-right:1px solid #66715d;"></div>
    <div style="padding:10px 0 8px;text-align:center;"><div style="font-size:11px;font-weight:700;letter-spacing:0.22em;">${T('INDEPENDENTLY MADE', 'BAĞIMSIZ ÜRETİM')}</div><div style="margin:8px 0 6px;font-size:29px;line-height:1;font-weight:900;letter-spacing:0.06em;">${T('FIELDWORK', 'SAHA İŞİ')}</div><div style="font-size:13px;line-height:1.6;color:#414b3d;">${T('Objects, identities and useful details.', 'Nesneler, kimlikler ve işe yarayan ayrıntılar.')}</div><div style="margin-top:13px;padding-top:7px;border-top:1px dashed #66715d;font-size:10px;letter-spacing:0.12em;${MONO}">${T('SMALL BATCH · LOT 026', 'KÜÇÜK SERİ · PARTİ 026')}</div></div>
    <div aria-hidden="true" style="background:repeating-linear-gradient(0deg,#66715d 0 2px,transparent 2px 6px);border-left:1px solid #66715d;border-right:1px solid #66715d;"></div>`)),

  variant('life-folded-folio', copy('Folded project folio', 'Katlı proje dosyası'), (T) => wrap(`position:relative;max-width:480px;padding:24px 20px 18px;background:#d9c0a6;border-left:7px solid #72533d;border-radius:0 10px 10px 0;color:#35271d;${SANS}`, `
    <div aria-hidden="true" style="position:absolute;top:0;right:0;width:28px;height:28px;background:linear-gradient(225deg,#ffffff 0 50%,#a98a6b 50% 100%);border-radius:0 10px 0 4px;"></div>
    <div style="max-width:calc(100% - 28px);font-size:10px;font-weight:700;letter-spacing:0.17em;">${T('WORK FILE / PROJECT 08', 'ÇALIŞMA DOSYASI / PROJE 08')}</div>
    <h3 style="margin:12px 0 16px;font-size:26px;line-height:1.15;${SERIF}">${T('Inside the project folder', 'Proje dosyasının içinde')}</h3>
    <div style="background:#fcf6ea;padding:4px 12px;border:1px solid #a98a6b;">
      ${[[T('CLIENT', 'MÜŞTERİ'), T('A neighborhood bakery.', 'Bir mahalle fırını.')], [T('CONTRIBUTION', 'KATKI'), T('Identity, packaging and signs.', 'Kimlik, ambalaj ve tabelalar.')], [T('DELIVERABLES', 'TESLİMLER'), T('A practical system, made to last.', 'Uzun ömürlü, kullanışlı bir tasarım sistemi.')]].map(([label, text], i) => `<div style="padding:10px 0;${i ? 'border-top:1px solid #c8b396;' : ''}"><div style="margin-bottom:4px;font-size:10px;font-weight:800;letter-spacing:0.1em;">${label}</div><div style="font-size:13px;line-height:1.45;">${text}</div></div>`).join('')}
    </div>`)),

  variant('life-project-swatchbook', copy('Project swatch book', 'Proje numune kitabı'), (T) => wrap(`max-width:500px;padding:18px 18px 18px 24px;border-left:16px solid #252525;background:#f3f1eb;color:#252525;${SANS}`, `
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:14px;"><h3 style="margin:0;font-size:23px;font-weight:500;">${T('Selected work', 'Seçili işler')}</h3><div style="font-size:10px;letter-spacing:0.12em;${MONO}">01—03</div></div>
    ${[
      [T('Corner shop identity', 'Köşe dükkânının kimliği'), T('Branding / a familiar place, seen anew', 'Marka tasarımı / tanıdık bir yere yeni bakış'), 'background-color:#214966;background-image:linear-gradient(#6c91a4 1px,transparent 1px),linear-gradient(90deg,#6c91a4 1px,transparent 1px);background-size:10px 10px;'],
      [T('A book for the river', 'Nehir için bir kitap'), T('Print / stories along the water', 'Basılı yayın / su boyunca öyküler'), 'background-color:#b44a32;background-image:radial-gradient(#f3c2a1 2px,transparent 2.5px);background-size:12px 12px;'],
      [T('A simpler way to find', 'Bulmanın daha yalın bir yolu'), T('Digital / a library that feels open', 'Dijital tasarım / herkese açık bir kütüphane'), 'background:repeating-linear-gradient(135deg,#445b40 0 8px,#a4b18e 8px 12px);'],
    ].map(([name, text, sample]) => `<div style="display:grid;grid-template-columns:48px minmax(0,1fr);gap:14px;padding:10px 0;border-top:1px solid #a8a69f;"><div aria-hidden="true" style="height:46px;${sample}"></div><div><div style="margin-bottom:5px;font-size:14px;font-weight:700;line-height:1.3;">${name}</div><div style="font-size:12px;line-height:1.5;color:#55534e;">${text}</div></div></div>`).join('')}`)),
]

const GATHERINGS = [
  variant('life-admission-stub', copy('Open studio admission stub', 'Açık atölye bilet koçanı'), (T) => wrap(`display:grid;grid-template-columns:minmax(0,1fr) 92px;max-width:500px;border:2px solid #27251f;border-radius:16px;background:#fff2c2;color:#27251f;overflow:hidden;${SANS}`, `
    <div style="padding:18px 20px;"><div style="margin-bottom:9px;font-size:10px;font-weight:700;letter-spacing:0.2em;">${T('ONE EVENING · MANY IDEAS', 'BİR AKŞAM · PEK ÇOK FİKİR')}</div><h3 style="margin:0 0 14px;font-size:32px;line-height:0.98;font-weight:900;letter-spacing:-0.03em;">${T('OPEN STUDIO', 'AÇIK ATÖLYE')}</h3><div style="font-size:15px;font-weight:700;">${T('18 OCT · 19:00–22:00', '18 EKİM · 19.00–22.00')}</div><div style="margin-top:5px;font-size:12px;line-height:1.5;">${T('North Hall · Come and meet the makers.', 'Kuzey Salonu · Üreticilerle tanışmaya gelin.')}</div></div>
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:10px;padding:16px 12px;border-left:2px dashed #746540;text-align:center;"><div style="font-size:10px;font-weight:700;letter-spacing:0.12em;">${T('ADMIT ONE', 'TEK KİŞİLİK')}</div><div aria-hidden="true" style="width:48px;height:56px;background:repeating-linear-gradient(90deg,#27251f 0 2px,transparent 2px 4px,#27251f 4px 5px,transparent 5px 8px);"></div><div style="font-size:11px;${MONO}">NO. 0184</div></div>`)),

  variant('life-envelope-invite', copy('Envelope evening invitation', 'Zarflı akşam davetiyesi'), (T) => wrap(`max-width:460px;padding:16px 16px 36px;background-color:#cbd7d0;background-image:linear-gradient(155deg,transparent 74%,#9aafa2 74% 75%,transparent 75%),linear-gradient(205deg,transparent 74%,#9aafa2 74% 75%,transparent 75%);border:1px solid #8eaa99;color:#20392e;${SERIF}`, `
    <div style="padding:22px 22px 20px;background:#fffaf0;border:1px solid #a9ac99;text-align:center;">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.2em;${SANS}">${T('YOU ARE INVITED', 'DAVETLİSİNİZ')}</div><h3 style="margin:15px 0 12px;font-size:29px;font-weight:400;line-height:1.18;">${T('A seat at our table', 'Soframızda bir yer')}</h3><div style="font-size:15px;line-height:1.6;">${T('A small evening of good food and generous conversation. We would love to see you there.', 'Güzel yemekler ve içten sohbetler eşliğinde küçük bir buluşma. Sizi de aramızda görmek isteriz.')}</div><div style="margin:16px 0;font-size:12px;font-weight:700;letter-spacing:0.03em;${SANS}">${T('18 OCTOBER · THE GARDEN ROOM', '18 EKİM · BAHÇE ODASI')}</div><a href="mailto:hello@example.com" style="display:inline-block;padding:9px 14px;background:#203d31;color:#ffffff;text-decoration:none;font-size:12px;line-height:1.4;${SANS}">${T('Reply to the invitation', 'Davete yanıt verin')}</a>
    </div>`)),

  variant('life-neighborhood-bulletin', copy('Neighborhood notice patchwork', 'Mahalle duyuru panosu'), (T) => wrap(`max-width:540px;padding:16px;border-top:12px solid #353b37;background:#f2eee3;color:#292d29;${SANS}`, `
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:15px;"><h3 style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.02em;">${T('Around the corner', 'Hemen köşe başında')}</h3><div style="font-size:11px;font-weight:700;">${T('THIS WEEK', 'BU HAFTA')}</div></div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;">
      ${[
        [T('SAT / 11:00', 'CMT / 11.00'), T('Book swap', 'Kitap takası'), T('Bring a favorite. Find a new one.', 'Sevdiğiniz bir kitabı getirin, yenisini bulun.'), '#e3ecc9', '2px solid #75834e'],
        [T('SUN / 14:00', 'PAZ / 14.00'), T('Repair hour', 'Onarım saati'), T('Small fixes, shared tools.', 'Küçük onarımlar, ortak aletler.'), '#f4d6b9', '3px double #805c3c'],
        [T('WED / 19:00', 'ÇAR / 19.00'), T('Shared supper', 'Ortak sofra'), T('One dish and plenty to talk about.', 'Bir tabak yemek, bolca sohbet.'), '#d8e7ec', '2px dashed #547786'],
      ].map(([when, name, text, paper, rule]) => `<div style="position:relative;min-width:0;padding:20px 10px 12px;border-bottom:${rule};background:${paper};"><div aria-hidden="true" style="position:absolute;left:50%;top:7px;width:6px;height:6px;border-radius:50%;background:#424740;"></div><div style="font-size:10px;font-weight:700;line-height:1.4;">${when}</div><div style="margin:10px 0;font-size:19px;font-weight:800;line-height:1.1;overflow-wrap:anywhere;">${name}</div><div style="font-size:12px;line-height:1.45;">${text}</div></div>`).join('')}
    </div><div style="margin-top:12px;font-size:11px;line-height:1.5;color:#4f554c;">${T('At the neighborhood house · Everyone is welcome.', 'Mahalle evinde · Herkese açık.')}</div>`)),

  variant('life-open-mic-broadside', copy('Open microphone broadside', 'Açık mikrofon afişi'), (T) => wrap(`max-width:440px;padding:22px 22px 18px;border-left:12px solid #c7f340;background:#171b17;color:#f8f9f3;${SANS}`, `
    <div style="margin-bottom:18px;font-size:10px;font-weight:800;letter-spacing:0.2em;color:#c7f340;">${T('OPEN MICROPHONE / LOCAL VOICES', 'AÇIK MİKROFON / YEREL SESLER')}</div><div style="font-size:45px;font-weight:900;line-height:0.98;letter-spacing:-0.055em;">${T('Your voice.', 'Söz sizde.')}</div><div style="margin-bottom:18px;font-size:45px;font-weight:900;line-height:1.05;letter-spacing:-0.055em;">${T('Our room.', 'Sahne burada.')}</div>
    <div aria-hidden="true" style="display:flex;align-items:center;gap:5px;height:24px;margin-bottom:18px;"><div style="flex:1;height:2px;background:#c7f340;"></div><div style="width:6px;height:14px;background:#c7f340;"></div><div style="width:6px;height:24px;background:#c7f340;"></div><div style="width:6px;height:10px;background:#c7f340;"></div><div style="flex:1;height:2px;background:#c7f340;"></div></div>
    <div style="display:grid;grid-template-columns:90px minmax(0,1fr);gap:16px;padding-top:13px;border-top:1px solid #747f6a;"><div><div style="font-size:21px;font-weight:800;color:#c7f340;">${T('THU', 'PER')}</div><div style="margin-top:3px;font-size:17px;">19:30</div></div><div style="font-size:13px;line-height:1.6;">${T('Bring a story, a poem or a song. Five minutes on stage. A whole room listening.', 'Bir öykü, şiir ya da şarkıyla gelin. Sahnede beş dakika, sizi dinleyen koca bir salon.')}</div></div>`)),

  variant('life-walking-pennant', copy('Walking club pennant', 'Yürüyüş kulübü flaması'), (T) => wrap(`max-width:420px;padding:14px 24px 18px;background:#eee9de;color:#f5f3e9;${SANS}`, `
    <div aria-hidden="true" style="height:6px;margin-bottom:0;border-radius:3px;background:#624a34;"></div>
    <div style="padding:24px 20px 74px;background:#204c70;clip-path:polygon(0 0,100% 0,100% calc(100% - 50px),50% 100%,0 calc(100% - 50px));text-align:center;">
      <div style="display:inline-block;padding:9px 12px;border:2px solid #f5f3e9;border-radius:50%;font-size:18px;font-weight:800;letter-spacing:0.04em;">${T('NW', 'GY')}</div><h3 style="margin:17px 0 10px;font-size:25px;line-height:1.15;font-weight:800;letter-spacing:0.04em;">${T('NIGHT WALKERS', 'GECE YÜRÜYÜŞÇÜLERİ')}</h3><div style="font-size:13px;line-height:1.5;">${T('An evening walking club', 'Akşam yürüyüşleri topluluğu')}</div><div style="margin:18px 0 0;padding-top:10px;border-top:1px solid #91a8b8;font-size:11px;line-height:1.5;">${T('Every second Friday · Start at the old bridge', 'İki haftada bir cuma · Eski köprüde buluşma')}</div>
    </div>`)),
]

const KITCHEN = [
  variant('life-menu-arch', copy('Arched kitchen menu', 'Kemerli mutfak menüsü'), (T) => wrap(`position:relative;max-width:420px;padding:26px 26px 20px;border:2px solid #9b3829;border-radius:92px 92px 4px 4px;background:#fff7eb;color:#5b271e;${SERIF}`, `
    <div aria-hidden="true" style="width:28px;height:6px;margin:0 auto 12px;border-top:2px solid #9b3829;border-bottom:2px solid #9b3829;"></div>
    <div style="text-align:center;font-size:11px;font-weight:700;letter-spacing:0.16em;${SANS}">${T('THE SMALL KITCHEN', 'KÜÇÜK MUTFAK')}</div>
    <h3 style="margin:6px 0 20px;text-align:center;font-size:31px;line-height:1.05;font-style:italic;font-weight:400;">${T('At our table today', 'Bugün soframızda')}</h3>
    ${[
      [T('Roasted tomato soup', 'Köz domates çorbası'), T('Basil oil · sourdough toast', 'Fesleğen yağı · ekşi mayalı kızarmış ekmek'), T('€6.50', '6,50 €')],
      [T('Aubergine on the fire', 'Ateşte patlıcan'), T('Lemon yoghurt · toasted seeds', 'Limonlu yoğurt · kavrulmuş çekirdekler'), T('€12.00', '12,00 €')],
    ].map(([dish, note, price]) => `<div style="display:grid;grid-template-columns:1fr auto;gap:4px 14px;padding:12px 0;border-top:1px solid #c99a82;"><div style="font-size:19px;line-height:1.2;font-style:italic;">${dish}</div><div style="font-size:16px;white-space:nowrap;">${price}</div><div style="grid-column:1 / -1;font-size:12px;line-height:1.4;color:#75493b;${SANS}">${note}</div></div>`).join('')}
    <div style="margin-top:10px;text-align:center;font-size:12px;font-style:italic;">${T('Made in small batches. Please ask about allergens.', 'Az miktarda hazırlanır. Alerjenler için bize danışın.')}</div>`)),

  variant('life-pantry-label', copy('Pantry jar label', 'Kiler kavanozu etiketi'), (T) => wrap(`max-width:300px;padding:12px;border:3px solid #354c2c;border-radius:66px 66px 28px 28px;background:#e9e4cb;color:#263a21;${SANS}`, `
    <div style="padding:20px 14px 14px;border:1px solid #354c2c;border-radius:49px 49px 16px 16px;text-align:center;">
      <div style="font-size:10px;font-weight:800;letter-spacing:0.15em;">${T('A GOOD THING TO KEEP', 'SAKLAMAYA DEĞER')}</div>
      <h3 style="margin:14px 0 6px;font-size:33px;line-height:0.98;font-weight:400;${SERIF}">${T('Butter beans', 'İri kuru fasulye')}</h3>
      <div style="font-size:12px;font-style:italic;${SERIF}">${T('For slow Sundays and generous tables', 'Sakin pazarlar ve kalabalık sofralar için')}</div>
      <div aria-hidden="true" style="display:flex;justify-content:center;gap:7px;margin:18px 0;">${[0, 1, 2].map((i) => `<div style="width:17px;height:27px;border:1.5px solid #354c2c;border-radius:65% 35% 60% 40%;background:${i === 1 ? '#c7cfaa' : '#f7f2df'};"></div>`).join('')}</div>
      <div style="padding:8px 0;border-top:1px solid #718065;border-bottom:1px solid #718065;font-size:12px;line-height:1.4;">${T('Soak overnight · cook gently', 'Bir gece ıslatın · kısık ateşte pişirin')}</div>
      <div style="display:flex;justify-content:space-between;gap:8px;margin-top:12px;font-size:11px;font-weight:700;"><div>500 g</div><div>${T('Packed · October', 'Paketleme · Ekim')}</div></div>
    </div>`)),

  variant('life-tasting-flight', copy('Olive oil tasting mat', 'Zeytinyağı tadım altlığı'), (T) => wrap(`max-width:520px;padding:20px 18px 16px;background:#f4f0e4;color:#29352b;border-bottom:5px solid #7b8547;${SANS}`, `
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:18px;"><h3 style="margin:0;font-size:21px;font-weight:400;${SERIF}">${T('Three groves, three flavours', 'Üç bahçe, üç lezzet')}</h3><div style="font-size:11px;white-space:nowrap;">${T('TASTING NOTES', 'TADIM NOTLARI')}</div></div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;">
      ${[
        ['01', T('Early harvest', 'Erken hasat'), T('Green almond', 'Yeşil badem'), '#a2a94c'],
        ['02', T('Coastal grove', 'Kıyı bahçesi'), T('Fresh herbs', 'Taze otlar'), '#7c9c48'],
        ['03', T('Late harvest', 'Geç hasat'), T('Ripe apple', 'Olgun elma'), '#c5a440'],
      ].map(([number, title, note, oil]) => `<div style="text-align:center;"><div style="margin-bottom:7px;font-size:11px;font-weight:700;${MONO}">${number}</div><div aria-hidden="true" style="width:76px;height:76px;max-width:100%;margin:0 auto 12px;border:5px solid #faf8f0;border-radius:50%;box-shadow:0 0 0 1px #b8b79e;background:radial-gradient(ellipse at 35% 30%,#f5edb9 0 8%,${oil} 43% 100%);"></div><div style="font-size:14px;font-weight:700;line-height:1.3;">${title}</div><div style="margin-top:5px;font-size:12px;line-height:1.35;color:#4f5e43;">${note}</div></div>`).join('')}
    </div>
    <div style="margin-top:18px;padding-top:10px;border-top:1px solid #b8b79e;font-size:12px;line-height:1.45;">${T('Taste from mild to bold. A sip of water clears the palate.', 'Hafiften yoğuna doğru tadın. Bir yudum suyla damağınızı temizleyin.')}</div>`)),

  variant('life-market-receipt', copy('Market receipt', 'Pazar alışverişi fişi'), (T) => wrap(`max-width:320px;padding:20px 22px 18px;background:#fffef7;border-top:7px solid #202d29;border-bottom:1px dashed #707971;color:#202d29;${MONO}`, `
    <h3 style="margin:0;text-align:center;font-size:20px;font-weight:800;letter-spacing:-0.04em;">${T('SUNDAY GREENS', 'PAZAR YEŞİLLİĞİ')}</h3>
    <div style="margin:5px 0 15px;text-align:center;font-size:11px;line-height:1.4;">${T('Neighbourhood market · stall 18', 'Mahalle pazarı · 18 numaralı tezgâh')}</div>
    <div style="display:flex;justify-content:space-between;padding:7px 0;border-top:1px dashed #707971;border-bottom:1px dashed #707971;font-size:10px;"><div>${T('BASKET 042', 'SEPET 042')}</div><div>11:24</div></div>
    ${[
      [T('Garden tomatoes', 'Bahçe domatesi'), T('€3.80', '3,80 €')],
      [T('A bunch of basil', 'Bir demet fesleğen'), T('€1.20', '1,20 €')],
      [T('Two lemons', 'İki limon'), T('€1.50', '1,50 €')],
    ].map(([item, price]) => `<div style="display:flex;justify-content:space-between;gap:12px;margin-top:10px;font-size:12px;line-height:1.4;"><div>${item}</div><div style="white-space:nowrap;">${price}</div></div>`).join('')}
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:15px;padding:10px 0;border-top:2px solid #202d29;border-bottom:2px solid #202d29;"><div style="font-size:12px;font-weight:700;">${T('TOTAL', 'TOPLAM')}</div><div style="font-size:25px;font-weight:800;">${T('€6.50', '6,50 €')}</div></div>
    <div style="margin-top:13px;text-align:center;font-size:11px;line-height:1.5;">${T('A full basket. A good afternoon.', 'Dolu bir sepet. Güzel bir öğleden sonra.')}</div>`)),

  variant('life-recipe-folder', copy('Recipe index folder', 'Tarif dosyası'), (T) => wrap(`position:relative;max-width:450px;min-height:430px;padding:38px 22px 20px;border:1px solid #9d7746;border-bottom:5px solid #9d7746;border-radius:4px 16px 4px 4px;background:#eee0c3;color:#3f301f;${SANS}`, `
    <div style="position:absolute;top:0;left:22px;padding:5px 15px;border-radius:0 0 6px 6px;background:#734e2d;color:#fffaf0;font-size:10px;font-weight:800;letter-spacing:0.12em;">${T('RECIPE FILE · 08', 'TARİF DOSYASI · 08')}</div>
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;"><div aria-hidden="true" style="width:58px;height:58px;flex-shrink:0;border:5px solid #fff3b7;border-radius:50%;background:repeating-conic-gradient(#e5b72c 0 42deg,#fff2ab 42deg 45deg);"></div><h3 style="margin:0;font-size:27px;line-height:1.1;font-weight:400;${SERIF}">${T('Lemon & chickpea salad', 'Limonlu nohut salatası')}</h3></div>
    <div style="font-size:13px;line-height:1.5;">${T('A bright bowl for a shared lunch. Toss just before serving.', 'Birlikte yenilen öğle yemekleri için ferah bir salata. Servisten hemen önce karıştırın.')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px 18px;margin:14px 0;font-size:11px;font-weight:700;"><div>${T('SERVES 2', '2 KİŞİLİK')}</div><div>${T('15 MINUTES', '15 DAKİKA')}</div><div>${T('NO OVEN', 'FIRIN GEREKTİRMEZ')}</div></div>
    <details style="padding:12px 14px;border:1px solid #b99d71;border-radius:3px;background:#fffbef;">
      <summary style="cursor:pointer;font-size:14px;font-weight:700;">${T('Open the ingredient card', 'Malzeme kartını açın')}</summary>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 14px;margin-top:14px;font-size:13px;line-height:1.4;">
        <div style="font-weight:700;">240 g</div><div>${T('cooked chickpeas', 'haşlanmış nohut')}</div>
        <div style="font-weight:700;">1</div><div>${T('lemon, juice and zest', 'limonun suyu ve rendelenmiş kabuğu')}</div>
        <div style="font-weight:700;">2</div><div>${T('tablespoons olive oil', 'yemek kaşığı zeytinyağı')}</div>
        <div style="font-weight:700;">1</div><div>${T('small bunch of parsley', 'küçük demet maydanoz')}</div>
      </div>
    </details>`)),
]

const MEDIA = [
  variant('life-record-sleeve', copy('Record sleeve', 'Plak kılıfı'), (T) => wrap(`max-width:440px;padding:22px;background:#ffcee2;color:#281620;border:1px solid #b44870;${SANS}`, `
    <div style="display:flex;justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:2px solid #281620;font-size:10px;font-weight:800;letter-spacing:0.1em;"><div>${T('NORTH WINDOW RECORDS', 'KUZEY PENCERESİ PLAKLARI')}</div><div>LP 014</div></div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 154px;align-items:center;gap:12px;padding:22px 0;">
      <div><div style="margin-bottom:10px;font-size:13px;font-weight:700;">Ada Yalın</div><h3 style="margin:0;font-size:37px;line-height:0.94;font-weight:900;letter-spacing:-0.055em;">${T('Coastal lines', 'Kıyı çizgileri')}</h3></div>
      <div aria-hidden="true" style="display:grid;place-items:center;width:154px;height:154px;border-radius:50%;background:repeating-radial-gradient(circle,#261b25 0 2px,#3d2b38 2px 3px);box-shadow:4px 4px 0 #b44870;"><div style="display:grid;place-items:center;width:49px;height:49px;border-radius:50%;background:#e8af2b;"><div style="width:6px;height:6px;border-radius:50%;background:#261b25;"></div></div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr auto;gap:6px 16px;padding-top:12px;border-top:2px solid #281620;font-size:12px;"><div>${T('Side A · Harbour lights', 'A yüzü · Liman ışıkları')}</div><div>18:40</div><div>${T('Side B · Last ferry home', 'B yüzü · Eve dönen son vapur')}</div><div>20:12</div></div>`)),

  variant('life-cassette-inlay', copy('Mixtape cassette inlay', 'Karışık kaset iç kapağı'), (T) => wrap(`max-width:460px;padding:16px 18px 16px 30px;border-left:10px solid #d96736;background:#f3eee1;color:#292820;${SANS}`, `
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px;"><h3 style="margin:0;font-size:22px;font-weight:400;font-style:italic;${SERIF}">${T('Songs for the long way home', 'Uzun dönüş yolunun şarkıları')}</h3><div style="font-size:11px;font-weight:800;white-space:nowrap;">C–60</div></div>
    <div aria-hidden="true" style="padding:15px 16px 20px;border:2px solid #4e5148;border-radius:13px;background:#cecfb9;">
      <div style="height:5px;margin-bottom:14px;background:linear-gradient(90deg,#d96736 0 30%,#afbf9c 30% 65%,#55736a 65%);"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:8px 12px;border:1px solid #4e5148;border-radius:5px;background:#3e4843;">${[0, 1].map(() => '<div style="width:39px;height:39px;flex-shrink:0;border:7px dashed #f3eee1;border-radius:50%;background:#738477;"></div>').join('<div style="height:18px;flex:1;border:1px solid #9ba69c;background:#78877e;"></div>')}</div>
      <div style="width:58%;height:14px;margin:12px auto -12px;border:1px solid #4e5148;border-radius:7px 7px 2px 2px;background:#b2b59f;"></div>
    </div>
    <div style="display:grid;grid-template-columns:28px 1fr auto;gap:8px 10px;margin-top:16px;font-size:12px;line-height:1.4;">
      ${[['01', T('Bus window', 'Otobüs camı'), '3:42'], ['02', T('After the rain', 'Yağmurdan sonra'), '4:08'], ['03', T('Almost home', 'Eve az kaldı'), '3:16']].map(([n, name, duration]) => `<div style="color:#654e38;${MONO}">${n}</div><div>${name}</div><div style="${MONO}">${duration}</div>`).join('')}
    </div>`)),

  variant('life-film-programme', copy('Perforated film programme', 'Perfore film programı'), (T) => wrap(`position:relative;max-width:380px;padding:24px 30px 22px;background:#1e303b;color:#f6f4e9;${SANS}`, `
    ${['left', 'right'].map((side) => `<div aria-hidden="true" style="position:absolute;${side}:6px;top:10px;bottom:10px;width:8px;background-image:radial-gradient(ellipse at center,#f6f4e9 0 3px,transparent 3.2px);background-size:8px 18px;"></div>`).join('')}
    <div style="display:flex;justify-content:space-between;gap:10px;padding-bottom:12px;border-bottom:1px solid #9eb1b3;font-size:10px;font-weight:700;letter-spacing:0.12em;"><div>${T('NEIGHBOURHOOD CINEMA', 'MAHALLE SİNEMASI')}</div><div>04</div></div>
    <div style="margin-top:22px;font-size:11px;letter-spacing:0.14em;color:#d4dfd8;">${T('A FILM & A CONVERSATION', 'BİR FİLM, BİR SOHBET')}</div>
    <h3 style="margin:8px 0 14px;font-size:37px;line-height:0.98;font-weight:400;${SERIF}">${T('The city after dark', 'Hava kararınca şehir')}</h3>
    <div style="font-size:12px;line-height:1.5;color:#d4dfd8;">${T('A walk through familiar streets, seen in a different light.', 'Tanıdık sokaklarda, başka bir ışığın altında bir yürüyüş.')}</div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:5px 20px;margin-top:20px;padding:12px;background:#f0c753;color:#2d2b19;"><div style="font-size:24px;font-weight:800;">19:30</div><div style="align-self:center;font-size:12px;font-weight:700;">${T('FRIDAY · HALL 2', 'CUMA · SALON 2')}</div><div style="grid-column:1 / -1;font-size:11px;">${T('82 minutes · discussion afterwards', '82 dakika · gösterim sonrası söyleşi')}</div></div>`)),

  variant('life-radio-dial', copy('Wooden radio dial', 'Ahşap radyo kadranı'), (T) => wrap(`max-width:500px;padding:16px;border:3px solid #5d351f;border-radius:18px;background:repeating-linear-gradient(0deg,#a06a43 0 3px,#95613d 3px 5px,#ac754c 5px 8px);color:#30291e;${SANS}`, `
    <div style="display:grid;grid-template-columns:86px minmax(0,1fr);gap:16px;padding:16px;border:1px solid #66482e;border-radius:8px;background:#f1e5c8;">
      <div aria-hidden="true" style="min-height:142px;border:4px solid #765b3e;border-radius:7px;background-color:#3b4030;background-image:radial-gradient(#171e17 1.5px,transparent 1.8px);background-size:6px 6px;"></div>
      <div><div style="font-size:10px;font-weight:800;letter-spacing:0.12em;">${T('THE COMMUNITY HOUR', 'TOPLULUK SAATİ')}</div><h3 style="margin:8px 0 4px;font-size:25px;line-height:1.1;font-weight:400;${SERIF}">${T('Sunday on the air', 'Pazar yayını')}</h3><div style="font-size:12px;line-height:1.4;">${T('Local stories with Deniz', 'Deniz ile mahalleden hikâyeler')}</div>
        <div aria-hidden="true" style="position:relative;height:27px;margin:15px 0 7px;border-top:2px solid #654c35;border-bottom:1px solid #654c35;background:repeating-linear-gradient(90deg,transparent 0 9px,#654c35 9px 10px);"><div style="position:absolute;top:-5px;bottom:-4px;left:57%;width:3px;background:#ad3828;"></div></div>
        <div style="display:flex;justify-content:space-between;gap:10px;font-size:11px;font-weight:700;"><div>${T('96.4 MHz', '96,4 MHz')}</div><div>17:00–18:00</div></div>
      </div>
    </div>`)),

  variant('life-concert-setlist', copy('Concert set list', 'Konser şarkı sırası'), (T) => wrap(`max-width:400px;padding:18px 22px 20px;background:#ffffff;color:#191820;border:1px solid #b8b6bf;border-right:7px solid #d973a3;${SANS}`, `
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:16px;"><div style="padding:4px 8px;background:#191820;color:#ffffff;font-size:11px;font-weight:800;letter-spacing:0.12em;">${T('STAGE 02', 'SAHNE 02')}</div><div style="font-size:11px;font-weight:700;">21:15–22:00</div></div>
    <h3 style="margin:0 0 4px;font-size:32px;font-weight:900;letter-spacing:-0.045em;line-height:1;">${T('THE NIGHT FERRY', 'GECE VAPURU')}</h3>
    <div style="font-size:11px;line-height:1.4;color:#5d5367;">${T('Riverside session · running order', 'Kıyı konseri · sahne sırası')}</div>
    <ol style="list-style:decimal;margin:18px 0 16px;padding-left:25px;">
      ${[T('Lights on the water', 'Sudaki ışıklar'), T('A little further', 'Biraz daha ileride'), T('The last crossing', 'Son geçiş')].map((song) => `<li style="padding:8px 0 8px 6px;border-bottom:1px solid #d9d5de;font-size:13px;font-weight:700;"><div style="font-size:16px;line-height:1.25;">${song}</div></li>`).join('')}
    </ol>
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-left:4px solid #a62468;background:#fce5f1;"><div style="font-size:10px;font-weight:900;letter-spacing:0.08em;color:#741c4d;">${T('ENCORE', 'BİS')}</div><div style="font-size:14px;font-weight:700;">${T('Until tomorrow', 'Yarına kadar')}</div></div>`)),
]

const TRAVEL = [
  variant('life-luggage-tag', copy('Luggage destination tag', 'Valiz varış etiketi'), (T) => wrap(`position:relative;max-width:380px;padding:22px 90px 22px 24px;clip-path:polygon(0 0,calc(100% - 28px) 0,100% 50%,calc(100% - 28px) 100%,0 100%);background:#ddbc89;border:2px solid #77532e;color:#342513;${MONO}`, `
    <div aria-hidden="true" style="position:absolute;right:20px;top:calc(50% - 13px);width:26px;height:26px;border:5px solid #77532e;border-radius:50%;background:#f6ead7;"></div>
    <div style="margin-bottom:8px;font-size:10.5px;font-weight:800;letter-spacing:0.16em;">${T('BAGGAGE · KEEP WITH YOU', 'BAGAJ · YANINIZDA TUTUN')}</div>
    <div role="heading" aria-level="3" style="font-size:28px;font-weight:800;letter-spacing:0.04em;line-height:1.15;">AMS → IST</div>
    <div style="margin-top:6px;font-size:12px;font-weight:700;">${T('ISTANBUL', 'İSTANBUL')}</div>
    <div style="margin-top:16px;padding-top:9px;border-top:1px dashed #77532e;font-size:11px;">${T('Owner: a curious traveller', 'Sahibi: meraklı bir gezgin')}</div>
    <div style="margin-top:4px;font-size:10.5px;letter-spacing:0.12em;">NO. 008 426</div>`)),

  variant('life-folded-route', copy('Folded route map', 'Katlanmış rota haritası'), (T) => wrap(`max-width:520px;padding:14px;background:#edf3df;border:1px solid #556c4a;color:#263b26;${SANS}`, `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;"><div role="heading" aria-level="3" style="font-size:16px;font-weight:800;">${T('The river route', 'Nehir rotası')}</div><div style="font-size:11px;font-weight:700;">${T('6.5 km · on foot', '6,5 km · yürüyerek')}</div></div>
    <div style="position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));min-height:154px;overflow:hidden;border:1px solid #7c9270;background:repeating-linear-gradient(0deg,transparent 0 23px,rgba(83,112,68,0.12) 23px 24px),repeating-linear-gradient(90deg,transparent 0 23px,rgba(83,112,68,0.12) 23px 24px);">
      <div aria-hidden="true" style="position:absolute;left:8%;right:8%;top:64px;height:0;border-top:5px dotted #aa4e2f;z-index:1;"></div>
      ${[
        ['01', T('Old bridge', 'Eski köprü'), T('Start here', 'Buradan başlayın'), '#edf3df'],
        ['02', T('River bend', 'Nehir kıvrımı'), T('A quiet pause', 'Sessiz bir mola'), '#dce8c9'],
        ['03', T('Hill garden', 'Tepe bahçesi'), T('The city below', 'Ayaklarınızın altında şehir'), '#edf3df'],
      ].map(([n, place, note, color], i) => `<div style="position:relative;padding:12px 10px;background:${color};${i ? 'border-left:1px dashed #718666;' : ''}"><div style="display:inline-grid;place-items:center;width:26px;height:26px;border:2px solid #aa4e2f;border-radius:50%;background:#fffdf3;color:#71311c;font-size:11px;font-weight:800;">${n}</div><div style="margin-top:44px;font-size:12.5px;font-weight:800;line-height:1.3;">${place}</div><div style="margin-top:5px;font-size:11px;line-height:1.4;">${note}</div></div>`).join('')}
    </div>
    <div style="margin-top:9px;font-size:11px;line-height:1.4;">${T('Follow the water; take the long way home.', 'Suyu takip edin; eve uzun yoldan dönün.')}</div>`)),

  variant('life-airmail-postcard', copy('Airmail postcard', 'Uçak postası kartı'), (T) => wrap(`max-width:480px;padding:8px;background:repeating-linear-gradient(135deg,#b52e37 0 12px,#fffaf0 12px 24px,#275b85 24px 36px,#fffaf0 36px 48px);color:#302a22;${SERIF}`, `
    <div style="padding:18px;background:#fffaf0;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:18px;"><div role="heading" aria-level="3" style="font-size:11px;font-weight:700;letter-spacing:0.2em;${SANS}">${T('POST CARD', 'POSTA KARTI')}</div><div style="font-size:11px;font-style:italic;">${T('Somewhere by the sea', 'Deniz kıyısında bir yerde')}</div></div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 118px;gap:18px;">
        <div><div style="font-size:22px;font-style:italic;line-height:1.25;">${T('Wish you were here.', 'Keşke burada olsaydınız.')}</div><div style="margin-top:12px;font-size:14px;line-height:1.6;">${T('Salt in the air, a small harbour, and no reason to hurry. I saved a place on the bench.', 'Havada deniz kokusu, küçük bir liman ve acele etmek için hiçbir neden yok. Bankta size yer ayırdım.')}</div></div>
        <div style="padding-left:15px;border-left:1px solid #b4a899;"><div style="padding:7px;border:3px dotted #54766e;text-align:center;color:#294d44;background:#e4eee6;"><div aria-hidden="true" style="font-size:24px;line-height:1;">✦</div><div style="margin-top:5px;font-size:10px;font-weight:700;letter-spacing:0.07em;${SANS}">${T('AIR MAIL', 'HAVA POSTASI')}</div></div><div style="margin-top:17px;padding-bottom:6px;border-bottom:1px solid #b4a899;font-size:12px;">${T('For the next', 'Bir sonraki')}</div><div style="margin-top:8px;padding-bottom:6px;border-bottom:1px solid #b4a899;font-size:12px;">${T('adventure', 'maceraya')}</div></div>
      </div>
    </div>`)),

  variant('life-trail-signpost', copy('Trail distance signpost', 'Patika mesafe levhası'), (T) => wrap(`position:relative;max-width:420px;padding:16px 20px 26px;background:#f3eddf;color:#26362a;${SANS}`, `
    <div aria-hidden="true" style="position:absolute;top:44px;bottom:0;left:calc(50% - 8px);width:16px;background:repeating-linear-gradient(90deg,#7a5738 0 5px,#936b46 5px 9px);"></div>
    <div role="heading" aria-level="3" style="position:relative;margin-bottom:12px;font-size:10.5px;font-weight:800;letter-spacing:0.16em;">${T('FROM THIS CROSSING', 'BU KAVŞAKTAN')}</div>
    ${[
      [T('Coast', 'Kıyı'), '12 km', '#245a44', false],
      [T('Old town', 'Eski kent'), '4 km', '#285b77', true],
      [T('Summit', 'Zirve'), T('8.5 km', '8,5 km'), '#80512c', false],
    ].map(([place, distance, color, left]) => `<div style="position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:16px;margin-top:9px;padding:11px ${left ? '18px 11px 34px' : '34px 11px 18px'};clip-path:${left ? 'polygon(18px 0,100% 0,100% 100%,18px 100%,0 50%)' : 'polygon(0 0,calc(100% - 18px) 0,100% 50%,calc(100% - 18px) 100%,0 100%)'};background:${color};color:#ffffff;"><div style="font-size:20px;font-weight:750;line-height:1.2;">${place}</div><div style="font-size:15px;font-weight:700;white-space:nowrap;${MONO}">${distance}</div></div>`).join('')}`)),

  variant('life-campsite-permit', copy('Campsite permit', 'Kamp alanı izin belgesi'), (T) => wrap(`max-width:400px;padding:18px 20px;background:#e4eadb;border:2px solid #53644c;border-radius:3px;color:#263421;${MONO}`, `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding-bottom:13px;border-bottom:2px solid #53644c;"><div><div style="font-size:10px;font-weight:700;letter-spacing:0.15em;">${T('PARK SERVICE', 'PARK HİZMETLERİ')}</div><div role="heading" aria-level="3" style="margin-top:4px;font-size:20px;font-weight:800;line-height:1.15;">${T('CAMP PERMIT', 'KAMP İZNİ')}</div></div><div aria-hidden="true" style="display:grid;place-items:center;flex-shrink:0;width:47px;height:47px;border:2px solid #53644c;border-radius:50%;font-size:30px;line-height:1;">♧</div></div>
    <div style="margin-top:12px;font-size:10px;letter-spacing:0.08em;">${T('ASSIGNED SITE', 'AYRILAN YER')}</div><div style="margin-top:3px;font-size:21px;font-weight:800;">${T('Pine ridge · B-12', 'Çam sırtı · B-12')}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;"><div><div style="font-size:10px;">${T('ARRIVAL / DEPARTURE', 'GİRİŞ / ÇIKIŞ')}</div><div style="margin-top:4px;font-size:12px;font-weight:700;">${T('14–16 June 2026', '14–16 Haziran 2026')}</div></div><div><div style="font-size:10px;">${T('PARTY', 'GRUP')}</div><div style="margin-top:4px;font-size:12px;font-weight:700;">${T('2 adults', '2 yetişkin')}</div></div></div>
    <div style="margin-top:15px;padding:7px 9px;border:1px solid #53644c;font-size:11px;font-weight:800;text-align:center;letter-spacing:0.07em;">${T('VALID FOR TWO NIGHTS', 'İKİ GECE GEÇERLİ')}</div>
    <div style="margin-top:11px;padding-top:9px;border-top:1px dashed #66745e;font-size:11px;line-height:1.5;">${T('Leave the site as you found it.', 'Alanı bulduğunuz gibi bırakın.')}</div>`)),
]

const PLAY = [
  variant('life-arcade-record', copy('Arcade high-score display', 'Atari rekor ekranı'), (T) => wrap(`max-width:460px;padding:17px 20px;background:#130f1d;border:8px ridge #633456;color:#f6f0ff;box-shadow:inset 0 0 22px #271932;${MONO}`, `
    <div role="heading" aria-level="3" style="font-size:12px;font-weight:800;letter-spacing:0.2em;color:#ffadcf;text-align:center;">${T('HIGH SCORE', 'EN YÜKSEK SKOR')}</div>
    <div style="margin-top:12px;padding:13px 8px;background-color:#090e0a;background-image:radial-gradient(#29452a 0.7px,transparent 1px);background-size:5px 5px;border:2px solid #3e563d;color:#c5ff79;font-size:44px;font-weight:800;letter-spacing:0.07em;line-height:1.1;text-align:center;font-variant-numeric:tabular-nums;">042800</div>
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px 14px;margin-top:13px;font-size:10.5px;color:#aeeaff;"><div>${T('PLAYER 1', '1. OYUNCU')}</div><div>${T('WAVE 07', '7. DALGA')}</div><div>${T('CREDITS 02', 'KREDİ 02')}</div></div>`)),

  variant('life-chess-result', copy('Chess match result', 'Satranç maçı sonucu'), (T) => wrap(`max-width:400px;padding:18px;background:#faf7ed;border-top:5px solid #242321;border-bottom:1px solid #242321;color:#242321;${SERIF}`, `
    <div style="display:grid;grid-template-columns:104px minmax(0,1fr);gap:18px;align-items:center;">
      <div aria-hidden="true" style="position:relative;display:grid;grid-template-columns:repeat(4,1fr);width:104px;height:104px;border:2px solid #242321;">${Array.from({ length: 16 }, (_, i) => `<div style="background:${(Math.floor(i / 4) + i % 4) % 2 ? '#797467' : '#f2ebd7'};"></div>`).join('')}<div style="position:absolute;inset:0;display:grid;place-items:center;font-size:64px;color:#161615;line-height:1;">♞</div></div>
      <div><div role="heading" aria-level="3" style="font-size:11px;font-weight:700;letter-spacing:0.14em;${SANS}">${T('A WELL-PLAYED DRAW', 'İYİ OYNANMIŞ BİR BERABERLİK')}</div><div style="margin-top:7px;font-size:16px;font-weight:700;">A. Kaya — M. Deniz</div><div style="margin-top:4px;font-size:32px;font-weight:700;line-height:1.1;">½ — ½</div></div>
    </div>
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:14px;padding-top:9px;border-top:1px solid #ada89a;font-size:11px;${SANS}"><div>${T('Blitz · 5 + 3', 'Yıldırım · 5 + 3')}</div><div>${T('Round 4 · Board 2', '4. tur · 2. masa')}</div></div>`)),

  variant('life-tennis-scorecard', copy('Tennis court scorecard', 'Tenis kortu skor kartı'), (T) => wrap(`max-width:460px;padding:14px 16px;background:#15473a;border:4px solid #e7edcf;color:#f4f5e9;${SANS}`, `
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:12px;"><div role="heading" aria-level="3" style="font-size:18px;font-weight:800;letter-spacing:0.08em;">${T('COURT 03', 'KORT 03')}</div><div style="padding:3px 6px;background:#e3ee6b;color:#193b24;font-size:10px;font-weight:800;letter-spacing:0.06em;">${T('MATCH CARD', 'MAÇ KARTI')}</div></div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) repeat(3,36px) 54px;border-top:1px solid #789b83;">
      ${[T('PLAYER', 'OYUNCU'), '1', '2', '3', T('PTS', 'PUAN')].map((text, i) => `<div style="padding:7px 4px;border-bottom:1px solid #789b83;text-align:${i ? 'center' : 'left'};font-size:10px;font-weight:800;color:#d8e8bd;">${text}</div>`).join('')}
      ${[
        ['A. Demir', '6', '4', '3', '40'],
        ['S. Yıldız', '4', '6', '3', 'AD'],
      ].map(row => row.map((text, i) => `<div style="padding:10px 4px;border-bottom:1px solid #789b83;text-align:${i ? 'center' : 'left'};font-size:${i ? '19px' : '14px'};font-weight:700;${i ? MONO : ''}${i === 4 ? 'background:#243b2b;color:#eff598;' : ''}">${text}</div>`).join('')).join('')}
    </div>
    <div style="margin-top:10px;font-size:11px;line-height:1.4;">${T('Serving: S. Yıldız · tie-break at 6–6', 'Servis: S. Yıldız · 6–6’da tie-break')}</div>`)),

  variant('life-rpg-satchel', copy('Adventure inventory satchel', 'Macera heybesi envanteri'), (T) => wrap(`max-width:440px;padding:16px;background:#292015;border:6px ridge #8a7451;color:#f2dfad;${SERIF}`, `
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:14px;"><div role="heading" aria-level="3" style="font-size:23px;font-weight:700;letter-spacing:0.05em;">${T('SATCHEL', 'HEYBE')}</div><div style="font-size:11px;color:#dfc794;${MONO}">${T('7.5 / 12 kg', '7,5 / 12 kg')}</div></div>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;">
      ${[
        ['◌', T('ROPE', 'İP'), '×1'],
        ['◈', T('LANTERN', 'FENER'), '×1'],
        ['♣', T('HERBS', 'OTLAR'), '×3'],
        ['●', T('COINS', 'SİKKELER'), '×24'],
      ].map(([icon, label, count]) => `<div style="padding:8px 4px 6px;border:2px solid #91764a;background:linear-gradient(135deg,#3e3020,#20190f);box-shadow:inset 0 0 0 1px #15110b;text-align:center;"><div aria-hidden="true" style="font-size:30px;line-height:1.2;color:#efd28b;">${icon}</div><div style="margin-top:5px;font-size:9px;font-weight:800;letter-spacing:0.03em;${SANS}">${label}</div><div style="margin-top:4px;font-size:10px;color:#dfc794;${MONO}">${count}</div></div>`).join('')}
      ${[0, 1, 2].map(() => `<div aria-hidden="true" style="height:48px;border:1px dashed #927c54;background:#211a11;"></div>`).join('')}
    </div>
    <div style="margin-top:12px;padding-top:9px;border-top:1px solid #816c47;font-size:11px;color:#dfc794;${SANS}">${T('4 items · 3 spaces free', '4 eşya · 3 boş yer')}</div>`)),

  variant('life-d20-encounter', copy('Twenty-sided encounter check', 'Yirmi yüzlü zarla karşılaşma'), (T) => wrap(`max-width:420px;padding:20px;background:#202638;border:2px solid #728197;border-radius:18px 3px 18px 3px;color:#f3eee1;${SERIF}`, `
    <div role="heading" aria-level="3" style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:#f3d898;${SANS}">${T('THE CLOCKWORK DOOR', 'SAATLİ KAPI')}</div>
    <div style="display:grid;grid-template-columns:90px minmax(0,1fr);gap:18px;align-items:center;margin-top:14px;">
      <div aria-hidden="true" style="display:grid;place-items:center;width:90px;height:100px;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:conic-gradient(from 30deg,#334f68 0 60deg,#53738c 60deg 120deg,#29455e 120deg 180deg,#607f95 180deg 240deg,#3b5b74 240deg 300deg,#4c6b82 300deg 360deg);font-size:35px;font-weight:700;color:#ffffff;">20</div>
      <div><div style="font-size:24px;font-weight:700;">${T('DC 14', 'Zorluk 14')}</div><div style="margin-top:5px;font-size:14px;line-height:1.4;">${T('Dexterity check', 'Çeviklik sınaması')}</div><div style="margin-top:9px;font-size:12px;color:#e0d0af;${MONO}">${T('Rolled 17 + 2', 'Zar 17 + 2')}</div></div>
    </div>
    <div style="margin-top:15px;padding:10px 12px;border:1px dashed #b7bd9b;background:#293a36;"><div style="font-size:10px;font-weight:800;letter-spacing:0.12em;color:#deedb5;${SANS}">${T('SUCCESS', 'BAŞARILI')}</div><div style="margin-top:5px;font-size:14px;line-height:1.5;">${T('The mechanism yields. The passage is clear.', 'Mekanizma açılıyor. Geçit artık açık.')}</div></div>`)),
]

export const EVERYDAY_GROUPS = [
  { id: 'life-portfolio', name: copy('Personal showcases', 'Kişisel vitrinler'), widgets: PORTFOLIO },
  { id: 'life-events', name: copy('Gatherings and clubs', 'Buluşmalar ve kulüpler'), widgets: GATHERINGS },
  { id: 'life-kitchen', name: copy('Culinary keepsakes', 'Mutfak hatıraları'), widgets: KITCHEN },
  { id: 'life-travel', name: copy('Travel mementos', 'Seyahat hatıraları'), widgets: TRAVEL },
  { id: 'life-media', name: copy('Records and screens', 'Plaklar ve ekranlar'), widgets: MEDIA },
  { id: 'life-play', name: copy('Play and score', 'Oyun ve skor'), widgets: PLAY },
]
