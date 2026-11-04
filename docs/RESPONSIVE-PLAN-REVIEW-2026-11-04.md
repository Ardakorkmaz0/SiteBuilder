# Ekran boyutuna uyarlama planının bağımsız incelemesi

Tarih: 4 Kasım 2026. İncelenen plan: `RESPONSIVE-PLAN-2026-11-04.md`, `d70bc09`.
Ölçülen kaynak: `b998b6c755627007383801aa09f1063923789730`.
Ek sayfa ölçümleri: `41978ae` (aşağıdaki devam incelemesi). İlk rapor `4e8cd8b` ile kaydedildi;
önceki ölçümler tekrarlanmadı veya yeni commit'te alınmış gibi gösterilmedi.

## Karar

Sorun tanımı ve satır/sütun yönü doğru. İstenen dört temel davranışı çalıştırarak doğruladım:
768/769 sıçraması, aynı sol sütunun HTML'e çevrilirken dört sütuna dağılması, proje çıktısında
900 pikselde 100 piksel taşma ve iki görüntüleyicinin farklı geçiş seçmesi.

Planın tamamını bu haliyle uygulamayı önermiyorum. Önce üç tasarım kararı kapanmalı:

1. XY-cut'ın kesemediği **çakışmasız** düzenler için davranış tanımlanmalı.
2. Mevcut sayfalarda otomatik telefon çizimini değiştirme ile isteğe bağlı geçiş uzlaştırılmalı.
3. Ortak genişlik tanımı, bütün yazıcıların eşdeğerliği ve gerçek belge önizlemesi son aşamalara bırakılmamalı.

Bunlar henüz yazılmamış uygulamaya ilişkin kabul koşullarıdır; çalışmayan bir `layoutTree.js`
bulmuş değilim. Aşağıda ölçülen mevcut davranışları ve tasarım çıkarımlarını ayrı işaretledim.
Üretim kodunu değiştirmedim; üretim sunucusuna veya üretim verisine erişmedim, canlıya almadım.

## Yöntem ve sınırlar

- Başlangıçta `git status --short` temizdi; `git pull --ff-only` sonucu `Already up to date.` oldu.
- Ana klasör başka ajanla paylaşıldığından, başlangıç commit'inin `git archive` ile alınmış geçici
  kopyasını kullandım. İnceleme sırasında diğer ajan kaynak/test değişiklikleri yaptı ve `41978ae`
  commit'ini oluşturdu. Bunlara dokunmadım. Ölçümler o commit'in yeniden incelemesi değildir.
- Planın asıl ölçüm düzeneği repo dışında; birebir aynı örneği edinemedim. Kendi başlık–paragraf–düğme
  ve sağ görsel örneğimi gerçek `useEditorStore.loadSchema`, `autoMobileLayout`, `schemaToSingleHtml`,
  `schemaToFiles` ve `schemaToResponsiveHtml` işlevlerinden geçirdim. Kullanıcı sitesi kullanılmadı.
- Geçici bir Vitest düzeneği çıktıları üretti ve çakışmasız/kesilemez karşı örneğin kontrolünü yaptı:
  **1 test geçti**. Bu, yeni duyarlı yazıcının testi değildir; o yazıcı henüz yok.
- Çıktıları uygulamanın gerçek Chromium tarayıcısında CUA ile açtım. Yerel Playwright E2E çalıştırmadım,
  E2E dosyası eklemedim. Tarayıcı derlemesinin sürümü kaydedilmedi; Firefox ve Safari denenmedi.
- Son örnekte gövde ve başlık yazı tipi Arial, görsel satır içi PNG. Dış istekleri engelleyen bir araç
  kurulmadı; dolayısıyla planın “dış istekler kapalı” koşulunu aynen sağladığımı iddia etmiyorum.
- React karşılaştırmasında geçici kopyada yalnızca `ResponsiveSite` için dışa aktarma ekleyip gerçek
  bileşeni `LanguageProvider` içinde bağladım. İşlevin mantığı değiştirilmedi; tüm `/site/` API/oturum
  akışı sınanmadı. Bu geçici ek, genel kontrollerden önce kaldırıldı.

Ham ölçümler, kullanılan şema, karşı örnek ve ekran görüntüleri
[`review-evidence/responsive-plan-2026-11-04/`](review-evidence/responsive-plan-2026-11-04/)
altında. Bağlam ve dosya SHA-256 değerleri `measurement-context.json` içinde.

## 1. Ölçümlerin bağımsız tekrarı

### Örnek ve yeniden üretme

`hero-schema.json`, editör deposunun normalleştirdiği gerçek girdidir. PC genişliği 1000, telefon
genişliği 390, `flowMode: false`. Ana bileşenlerin PC dikdörtgenleri:

| Kimlik | Tür | x | y | w | h |
|---|---|---:|---:|---:|---:|
| nav | navbar | 0 | 0 | 1000 | 64 |
| heading | heading | 40 | 110 | 420 | 72 |
| paragraph | text | 40 | 200 | 420 | 90 |
| action | button | 40 | 310 | 180 | 48 |
| picture | image | 540 | 110 | 420 | 300 |
| footer | text | 40 | 520 | 920 | 60 |

Tekrar için bu şemayı başlangıç commit'indeki gerçek yazıcılara verin. Tek belgeyi
`schemaToSingleHtml(schema, title)` ile üretin. HTML'e çevirme için editörün yaptığı gibi
`withoutBuilderShim(schemaToResponsiveHtml(schema, title))` kullanın. Proje için
`schemaToFiles(schema)` dizisindeki her `{name, content}` kaydını kendi adıyla aynı klasöre yazın
ve `index.html` açın. API'ye veya veritabanına yazmak gerekmiyor.

Ölçüler CSS pikselidir. Tek belge için pencere yüksekliği 1100; her genişlikte yeniden yükledim.
`getBoundingClientRect`, `offsetWidth`, hesaplanan yazı boyu, `.page` dönüşümü ve kök
`scrollWidth/clientWidth` okundu. Etkin yazı boyu, hesaplanan boyun dış bloktaki
`rect.width / offsetWidth` oranıyla çarpılmasıdır; böylece üst öğedeki ölçek hesaba katılır.
Ortanca, heading/paragraph/action üçlüsüne aittir. “Kullanılan genişlik”, bu üç blok ve görselin
en sol–en sağ sınırlarının pencereye oranıdır; menü ve alt metin buna katılmadı.

### Serbest tuvalin tek belge çıktısı — doğrulandı

| Pencere | Sayfa ölçeği | Etkin yazı ortancası | Ana içerik genişliği / pencere | Kök yatay taşma |
|---:|---:|---:|---:|---:|
| 320 | 0,820513 | 13,13 px | %91,79 | 0 px |
| 360 | 0,923077 | 14,77 px | %91,79 | 0 px |
| 390 | 1 | 16,00 px | %91,79 | 0 px |
| 600 | 1 | 16,00 px | %59,67 | 0 px |
| 767 | 1 | 16,00 px | %46,68 | 0 px |
| 768 | 1 | 16,00 px | %46,61 | 0 px |
| 769 | 0,769 | 12,30 px | %92,00 | 0 px |
| 780 | 0,780 | 12,48 px | %92,00 | 0 px |
| 900 | 0,900 | 14,40 px | %92,00 | 0 px |
| 1000 | 1 | 16,00 px | %92,00 | 0 px |
| 1024 | 1 | 16,00 px | %89,84 | 0 px |
| 1280 | 1 | 16,00 px | %71,88 | 0 px |
| 1920 | 1 | 16,00 px | %47,92 | 0 px |
| 2560 | 1 | 16,00 px | %35,94 | 0 px |

Kanıt: `published-widths.json`, `published-768.png`, `published-769.png`.
768'de telefon çizimi 1×, 769'da PC çizimi 0,769×: süreksizlik gerçekten var.
Kaynak: `frontend/src/utils/schemaToFiles.js:1021–1032`.

Plandaki %51 ve telefondaki 18 px değerlerini birebir doğrulamadım. Benim örneğimde telefon
tasarımının 390/768 oranı %50,78; içerideki 358 piksel genişliğindeki metin %46,61 kullanıyor.
Gerçek hesaplanan yazı ortancası 16 px çıktı. Farklı içerik ve ölçüm kümesi nedeniyle bu sayılar
planın sayılarıyla aynı olmak zorunda değil. “En az %80” hedefi de menü/bant dahil edilerek kolayca
geçilebilir; hangi içerik sınırlarının sayılacağı önceden sabitlenmeli. Geniş ekranda ortalanmış
azami genişlik tek başına hata sayılmaz.

### Otomatik telefon sırası — doğrulandı

`autoMobileLayout` çıktısında sıralama:

| Blok | Telefon y | Telefon h |
|---|---:|---:|
| heading | 80 | 51 |
| picture | 147 | 200 |
| paragraph | 363 | 105 |
| action | 484 | 40 |

Sol sütun başlık → paragraf → düğme iken telefon başlık → görsel → paragraf → düğme oldu.
Kanıt: `phone-order.json`. Kaynak başlangıcı: `frontend/src/store/editorStore.js:837`.

### HTML'e çevirme — doğrulandı

1024 pikselde dört ana blok aynı üst kenara yerleşti:

| Blok | x | y | w |
|---|---:|---:|---:|
| heading | 36,00 | 67 | 250,95 |
| paragraph | 310,95 | 67 | 250,95 |
| action | 585,90 | 67 | 127,16 |
| picture | 737,05 | 67 | 250,95 |

İlk `.rh-row` dört çocuk taşıyor. Görselin dikey aralığı bütün sol sütunu bir satıra bağlıyor;
`readingRows` satırın alt sınırını büyütüp öğeleri x'e göre sıralıyor
(`frontend/src/utils/responsiveHtml.js:131–148`). Sayılar özgün örnekten farklı, dört sütuna
dağılma aynı. Kanıt: `converted-1024.json` ve `converted-1024.png`.

### Proje dışa aktarımı — doğrulandı

900 pikselde `documentElement.clientWidth = 900`, `scrollWidth = 1000`, `.page` genişliği 1000,
`transform = none`; **100 piksel taşma** var. Bu, tek belge çıktısından farklı davranıyor.
Kanıt: `project-900.json`; üretici: `frontend/src/utils/schemaToFiles.js:1053`.

### İki geçiş noktası — doğrulandı; kapsamı plandakinden geniş

React'in dış kutusunu 1024 piksel pencerede kontrollü genişlikle bağladım:

| İçerik genişliği | React çizimi / ölçeği | Bu içerik genişliğinde açılan tek belge |
|---:|---|---|
| 767 | telefon / 1 | telefon / 1 |
| 768 | PC / 0,768 | telefon / 1 |
| 769 | PC / 0,769 | PC / 0,769 |

Telefon arka planını açık mavi, PC'yi beyaz verdim; dal seçimini hem arka plan hem dönüşümle
ölçtüm. React `< 768`, tek belge `<= 768` kullanıyor. Kanıt: `react-widths.json`.

**Yalnızca karşılaştırma işaretini eşitlemek yeterli değil.** 780×400 pencerede dikey kaydırma
çubuğuyla kullanılabilir genişlik 765 oldu. React telefon/1× seçti; tek belge aynı pencerede
PC/0,78× seçti. React `el.clientWidth`, tek belge `window.innerWidth` okuyor
(`PreviewPage.jsx:40,47`; `schemaToFiles.js:1021,1023`). Kanıt: `react-widths.json` son kayıt ve
`published-scrollbar.json`. İç çerçeve, dar önizleme ve klasik/örtüşen scrollbar için ortak
“yerleşim genişliği” sözleşmesi gerekir; CSS medya sorgularının genişliği de bununla uzlaştırılmalı.

### Bu turda doğrulanmayan ölçümler

500 HTML şablonundaki 227/41 sayılarını yeniden taramadım; bunlar bu raporun bağımsız bulgusu
değil. Planın kendi geçersiz saydığı 491 örtüşme sayısını kullanmadım. `enableFlowMode` için
adil yeni örnekle ölçüm yapmadım; mevcut akış modunun bütünü hakkında hüküm vermiyorum.
Geniş ekran menü/bant hizası bu örnekte ayrı bir kabul testi olarak sınanmadı.

## 2. XY-cut: yararlı ama bütün geçerli tuvalleri kapsamıyor

### P1 — Kesilemeyen düzen, mutlaka çakışan düzen değildir

Plandaki “bölünemeyen, gerçekten üst üste binen bloklar” ayrımı eksik
(`RESPONSIVE-PLAN-2026-11-04.md:89–92`). Editördeki sıradan beş `card` bileşenini şu
koordinatlarla gerçek `loadSchema` normalleştirmesinden geçirdim; koordinatlar aynen kaldı:

| Kart | x | y | w | h |
|---|---:|---:|---:|---:|
| A | 40 | 100 | 190 | 90 |
| B | 240 | 100 | 90 | 190 |
| C | 140 | 200 | 90 | 90 |
| D | 140 | 300 | 190 | 90 |
| E | 40 | 200 | 90 | 190 |

```text
A A B
E C B
E D D
```

Komşular arasında 10 piksel boşluk var. On kart çifti için kesişim alanı **0**; buna rağmen
kartları iki gruba ayıran, bütün iç alan boyunca geçen boş yatay veya dikey şerit yok.
x izdüşümleri [40,230], [240,330], [140,230], [140,330], [40,130]; birleşimleri kesintisiz.
y izdüşümleri de [100,390] aralığını kesintisiz kaplıyor. XY-cut daha ilk ayrımı yapamıyor.

Kanıt: `pinwheel.json` içinde bütün çiftler, `horizontalGaps: []`, `verticalGaps: []`;
`pinwheel-input.json` yeniden üretme girdisi. Mevcut tek belge yazıcısında da açıldı (`pinwheel.png`).
Bu, editörde elle sürükleyip kaydettiğim bir kullanıcı sayfası değil; editör deposunun kabul edip
yazıcının çizdiği, standart bloklardan oluşan karşı örnektir. Önerilen algoritma henüz olmadığı
için onun çalışmasını sınadığımı söylemiyorum; tarif edilen kesme kuralının geometrik sınırını gösteriyorum.

**Etki:** Kesilemeyen her düzen katmana alınırsa çakışmayan normal içerik de topluca küçülebilir;
“yalnızca küçük çakışma grubu ölçeklenir” garantisi yok. Katman bütün içerik kümesi kadar büyük olabilir.

**Kabul koşulu:** Ayrılabilir ağaç / gerçek çakışma / çakışmasız kesilemeyen düzen ayrı sınıflansın.
Son sınıfta grid aralıkları, açık kullanıcı gruplaması veya güvenli eski görünümü koruyup geçişi
sunmama seçeneklerinden biri seçilsin. Sessizce “çakışma” kabul edilmesin. Bu örnek saf işlevin
beklenen değerleri elle yazılmış testlerinden biri olsun.

### P2 — Geometri okuma niyetini tek başına kanıtlamaz

Örneğimde XY-cut soldaki sütunu ayırabilir; bu iyi bir kullanım. Fakat aynı koordinatlar bağımsız
kartlar, numaralı adımlar veya iki metin sütunu olabilir. Her zaman sütun sütun okuma doğru değildir.
RTL, görselin açıklamayla ilişkisi, DOM sırası ve klavye sırası için bir kural gerekir.
Bir bölüm dikdörtgeninin içinde görünmek de otomatik olarak o bölümün anlamsal çocuğu olmak değildir.
Çakışan bölümler, görünmez dekoratif arka plan ve telefonda gizlenen bloklar özellikle belirsizdir.

Yerleşim ağacı yazım için geçici bir yapı olarak kalmalı. Görsel çıkarım, gerçek şemada sessizce
ebeveyn değiştirmemeli; editörün derinlik/çocuk sayısı ve `moveComponentInto` kuralları korunmalı.

## 3. Tasarım genişliğinde 1 piksel hedefi

**Koşullu bir kabul ölçütü olarak gerçekçi; bütün geçerli tuvallere verilmiş koşulsuz söz olarak değil.**
Tasarım genişliğinde bir yeniden akış zorunluluğu yoktur. Temsil edilebilir bir düzenin koordinatları,
aynı yazı tipi ve kutu koşullarında korunabilir. Dolayısıyla “flex'e geçince mutlaka 1 pikselden fazla
kayar” demiyorum. Ancak “metin kutuya sığıyor” tek başına yeterli koşul değil.

Plandaki yüzde sütun + tasarım boşluğu kuralı eksik belirlenmiş. Örneğin 1000 pikselde 400 ve 540
piksellik sütunlar, 60 piksel boşlukla tam sığar. 900'de `%40 + %54 + 60px = 906px` olur.
Flex küçültürse oranlar değişir; içsel asgari genişlik engellerse taşar. Boşluk bütçesinin nasıl
çıkarıldığı, `min-width`, shrink ve kırılma kararları açık olmalı. Bu bir aritmetik karşı örnektir;
henüz yazılmamış yeni CSS'nin tarayıcıda hatası olarak sunulmuyor.

Diğer belirleyiciler: kutunun iç/dış ölçüsü, padding/border, bilinçli boşluk ve dikey ofsetler,
iç içe yüzdelerin yuvarlanması, görselin doğal oranı, fontun geç yüklenmesi, `boxFit` ve dönüşümler.
Kesilemeyen bir düzeni yalnızca basit satır/sütun ağacıyla temsil etmek zaten mümkün olmayabilir.

Önerilen ölçüt:

- Birim **CSS pikseli**; hangi kutunun x/y/w/h değerlerinin karşılaştırıldığı belirtilsin.
- Referans: aynı PC/telefon tasarım genişliği, yüklü aynı font/görseller, aynı zoom ve tarayıcı;
  mevcut çıktıdaki beklenen koordinatlar sabit kaydedilsin. Metin satırları ve tıklama alanları ayrıca kontrol edilsin.
- Temsil edilebilir sabit örneklerde her blok için sapma ≤1 px aranmalı; ortalama sapma yeterli değil.
- Diğer genişliklerde aynı koordinat hedeflenmez: okunabilirlik, mantıklı sıra, kesilmeme ve taşmama aranır.
- Belirsiz/özel kodlu sayfalarda “sadık çevrildi” sözü verilmesin; açık önizleme ve geri alınabilir geçiş olsun.
- Font, işletim sistemi ve tarayıcı değişince aynı metin rasterini veya piksel piksel aynı satır kırılmasını
  garanti etmek uygun değil. Bunlar ayrı uyumluluk testleri; planın 1 CSS px geometri ölçütüyle karıştırılmamalı.

## 4. Eksik riskler ve aşama sırası

### P1 — Otomatik telefon değişimi ile mevcut sayfa koruması çelişiyor

Aşama 1, `mobileManual` olmayan eski sayfanın sonraki düzenlemede değişmesini öneriyor
(plan:125–126); sahibin kararları ise mevcut sayfalara isteğe bağlı `page.fluid` geçişi öneriyor
(plan:157–158). Üstelik gerçek `normalizePage`, otomatik telefonu **yüklerken de** yeniden üretiyor
(`editorStore.js:1203–1206`). Algoritmayı koşulsuz değiştirmek yalnızca sonraki sürüklemede etkili olmayabilir.

Sayfanın yerleşim sürümü bütün yükleme, düzenleme, çevirme, önizleme ve yayımlama yollarında aynı
geçiş koşulunu kullanmalı. Alanın yokluğu eski davranış anlamına gelmeli; yalnızca yeni sayfa
oluşturucusu yeni sürümü açıkça seçmeli. Manuel telefon ve geri alma davranışı korunmalı.
Bu raporda yeni bir alan uygulamadım veya eski sekme senaryosu çalıştırmadım; bunlar kabul koşuludur.

“Şema değişmedi, API uyumlu” yeterli değil: `page.fluid` eklemek bir şema sözleşmesi değişikliğidir.
Doğrulayıcı izin listesi (`backend/builder/validators.py:781–786` çevresi), kayıt/yükleme döngüsü,
revision/çatışma, içe–dışa aktarma ve eski istemci ile yeniden yayımlama düşünülmeli. JSON alanı
eklemek mutlaka veritabanı modeli göçü gerektirir demiyorum. Eski istemcinin alanı koruması da
yeni yerleşimi doğru yazacağını kanıtlamaz; eski sekme yeni sayfayı eski yazıcıyla yeniden gönderebilir.

### P2 — Fixed ve sticky aynı katman kararıyla geçiştirilmemeli

Plan her ikisini ekrana bağlı katmana çıkarıyor. Oysa yapışkan öğenin başlangıç konumu, kaydırma
eşiği ve kapsayıcıda duracağı sınır var. Mevcut mutlak sayfa runtime'ı bile bunları `offsetParent`,
`offsetTop`, sayfa yüksekliği ve ölçekten hesaplıyor (`htmlRuntime.js:531–567`; React tarafı
`components/renderer/layout.js:35–63`). Yeni sarmalayıcılar bunları değiştirir. Akışta yer ayırma ve
yapışma sınırı, fixed davranışından ayrı tasarlanıp üst/alt pin ve yan menüyle denenmeli.
Bu turda kaydırmalı sticky deneyi yapmadım.

### P2 — Önizleme/yayın/dışa aktarım eşdeğerliği geç geliyor

Aşama 2–3 çıktı davranışını değiştirirken aşama 4'te eşdeğerliği sağlamak, zaten ölçtüğümüz farklı
genişlik tanımlarını ve proje taşmasını bir süre devam ettirir. Aşama 5'teki gerçek belge önizlemesi
ise mevcut sayfayı isteğe bağlı geçirebilmek için daha önce gerekli. Sahibin önizlemede gördüğüyle
yayımladığı belge aynı olmalı; tablet dalı kararı da telefon çıktısı yayına çıkmadan netleşmeli.

Önerdiğim sıra:

1. **Ölçüm ve ortak sözleşme:** sabit şemalar; kullanılabilir genişlik, geçiş, bbox ve taşma tanımı;
   kaynakta hiçbir davranış değişmeden mevcut yolların farklarını yakalayan kontroller.
2. **Saf sınıflandırıcı ve tasarım genişliği prototipi:** hero, kesilemeyen A–E, gerçek çakışma,
   iç içe blok, manuel telefon ve gizleme. Okuma sırası/katman kararı; belirsizlikte davranış.
3. **Geçiş koşulu arkasında aynı belge ve gerçek önizleme:** tek belge, React yolu, proje çıktısı
   ve editör önizlemesinin aynı sözleşmeyi kullandığını baştan gösterme. Eski sayfa varsayılanı değişmez.
4. **Telefon ve dar PC kabulü:** ayrı geliştirilebilirler, fakat 767/768/769 ve scrollbar
   sınırında birlikte değerlendirilirler. Tablet seçimi burada kararlaştırılır.
5. **Geri alınabilir geçiş ve uyumluluk:** eski sekme, kayıt/revision, özel kod, export/import;
   ardından sahibin sayfalarıyla onay. Her dağıtım ayrıca sahibin iznini gerektirir.

Bu bir aşama önerisidir; yeni özellik geliştirme veya dağıtım onayı değildir. 500 şablonun taşma
kontrolü ayrı çalışabilir; sonucu tuval algoritmasının kabulüne bağlamak gerekmiyor.

### İlave kabul koşulları

| Risk | Planın netleştirmesi gereken kontrol |
|---|---|
| DOM sarmalayıcıları | `.c-id` kalması yetmez: `.page > .c-id`, `offsetParent`, olay delegasyonu ve kullanıcı JS'si değişebilir. |
| Tek/çift DOM ağacı | Telefon/PC için iki ağaç mı, tek ağaç mı? Yinelenen id/çapa/form, iframe'in iki kez çalışması, resize sırasında odak ve form değerleri sınanmalı. |
| Uzun ve değişken içerik | Türkçe uzun metin, bölünmeyen URL, tablo, input asgari genişliği, RTL, font/görsel yüklenmesi ve metin büyütme. |
| Gerçek taşma ölçüsü | Kök `scrollWidth` sıfır olsa da `overflow:hidden` içeriği kesebilir. Yaprak sınırları, metin aralıkları, iç scroll ve kasıtlı taşmalar ayrı kontrol edilmeli. Üst/alt öğe kesişimi çakışma sayılmamalı. |
| Dinamik yükseklik | HTML iframe yüksekliği, sekme açılması, ResizeObserver döngüsü ve akış yüksekliği değişince çapa/scroll konumu. |
| Genişlik ve gizleme | Değişken canvasWidth/mobileWidth, gizlenen blokların boşluğu, tam geniş bant ile ortalı içeriğin hizası; tasarım genişliği ±1. |
| Okuma ve etkileşim | Görsel CSS sırası yeterli değil: DOM/Tab sırası, odak görünürlüğü, resize sırasında aktif öğe ve azaltılmış hareket. |
| Çıktı bütçesi | 13 KB'nin hangi sabit örneğe ve hangi sıkıştırmasız dosyaların toplamına ait olduğu; ortak CSS/runtime ve ek DOM sayısı açıkça kaydedilmeli. Bütün siteler için aynı bütçe varsayılmamalı. |
| CSS/runtime azaltma | Yeni sarmalayıcı, dinamik sınıf ve katmanlar için `NEEDS`/kural budama; yalnızca yeni ağaçta ortaya çıkan menü/form/sekme durumları. |

Asgari genişlik matrisi: 320, 360, 390, 600, 767, 768, 769, 780, tasarım genişliği ±1,
1024 ve 1920. Buna klasik scrollbar, dar kapsayıcı, iç iframe, manuel telefon ve farklı tasarım
genişlikleri eklenmeli. Bu matris gelecekteki uygulama için öneridir; hepsini yeni düzen üzerinde
çalıştırmış değilim.

## Devam incelemesi: farklı tuval sayfaları, 41978ae

Yeni istekte `git status --short` temiz, `git pull --ff-only` günceldi; HEAD `4e8cd8b`, yani
`41978ae` sonrasındaydı. Önceki hero ve A–E karşı örneğini baştan almadım.
`b998b6c → 41978ae` farkında `editorStore.js`, `responsiveHtml.js` ve `PreviewPage.jsx` aynı Git
blob'larını taşıyor; tek belge ölçek hesabı değişmemiş. `schemaToFiles` yalnızca `documents`
seçeneğiyle kaynağı düzenlenmiş belgeyi kullanabiliyor. Önceki `schemaToFiles(schema)` ham tuval
ölçümünü değiştirmiyor; bunu düzenlenmiş HTML belgelerinin dışa aktarımına genellemiyorum.

### İki ek sayfa nasıl oluşturuldu?

`41978ae` arşivinin `/tmp` kopyasında gerçek depo işlemlerini kullandım:
`loadSchema → addComponent → updateStyles`, ardından ikinci sayfada `setViewport('mobile') → setLayout`.
Tarayıcıda sürükleme taklidi veya sunucuya kayıt yapılmadı. Geçici fixture testinde altı kartın
varlığı, ilk sayfanın otomatik, ikinci sayfanın manuel telefon olması doğrulandı: **1/1 geçti**.
İki sayfada da PC 1200, telefon 360; font Arial, PC beyaz, telefon açık mavi; özel CSS/JS yok.

Yeniden üretme girdileri (x/y/w/h, CSS px):

- **Altı kart:** `card` türünde `Card 1`–`Card 6`; açıklama `A separate card with a short description.`
  İki satır, üç sütun. `x = 40 + sütun*380`, `y = 80 + satır*220`, `w=340`, `h=180`.
  Telefon çizimi otomatik. Varsayılan kart özellikleri ve stilleri kullanıldı; yazı tipi Arial yapıldı.
- **Manuel afiş:** boş başlıklı/açıklamalı `card` panel (40,100,1120,340), zemin `#d9e8ff`, köşe 12;
  `heading` (80,140,600,90), metin `A deliberately layered poster`, seviye h1;
  `button` (80,270,200,50), metin `View details`, href `#`;
  `text` (40,530,1120,60), metin `The footer is outside the deliberately overlapping panel.`
  Telefon kutuları sırasıyla (16,80,328,240), (32,110,290,80), (32,220,180,44), (16,360,328,70).
  Bunlar `setLayout` ile girildi; sonuçta `mobileManual=true` oldu. Panel/başlık/düğme çakışması
  bilinçli, footer bu grubun dışında.

### Gerçek Chromium sonucu

Her iki sayfanın gerçek `schemaToSingleHtml` çıktısı 1100 piksel yükseklikte açılıp her genişlikte
yeniden yüklendi. DOM kutuları, dönüşüm ve kök yatay taşma okundu. Sonuçlar aşağıda;
her iki sayfada bütün bu genişliklerde kök `scrollWidth-clientWidth` **0 px** çıktı.

| Pencere | İki sayfanın ölçeği | İlk kartın görünen genişliği | Afiş panelinin görünen genişliği |
|---:|---:|---:|---:|
| 320 | 0,888889 | 291,56 | 291,56 |
| 360 | 1 | 328,00 | 328,00 |
| 600 | 1 | 328,00 | 328,00 |
| 768 | 1 | 328,00 | 328,00 |
| 769 | 0,640833 | 217,88 | 717,73 |
| 900 | 0,75 | 255,00 | 840,00 |
| 1200 | 1 | 340,00 | 1120,00 |
| 1920 | 1 | 340,00 | 1120,00 |

768'de telefon kartı/paneli x=220, genişliği 328; pencerenin **%42,71**'ini kaplıyor. 769'da
1200'lük PC çizimine atlanıp **0,640833×** oluyor. Dolayısıyla önceki 0,769 değeri evrensel
sabit değil, 1000'lik tasarımın sonucu; daha geniş tasarımda sıçrama daha büyük.

1200'de ilk kartın kutusu (40,80,340,180), ikinci kartınki (420,80,340,180);
afiş paneli (40,100,1120,340), başlığı (80,140,600,90). Mevcut yazıcı referans geometriyi burada
korudu. 360'ta afişin dört manuel telefon kutusu da yukarıda verilen koordinatlarla aynı çıktı.
1920'de PC kutuları 360 piksel ortalama payı eklenerek duruyor: ilk kart x=400, panel x=400,
afiş başlığı x=440. Geniş ekrandaki azami içerik genişliğini tek başına hata saymıyorum.

900'de gerçek `schemaToFiles` proje çıktısında **iki sayfa için de** clientWidth=900,
scrollWidth=1200, pageWidth=1200 ve transform=none: taşma **300 px**. Bu da önceki 100 px
bulgusunun tasarım genişliğine bağlı olduğunu doğruluyor.

1200'de HTML'e çevirme:

- Altı kart: `.rh-row` çocuk sayıları **[3,3]**, Card 1–3 ve Card 4–6 doğru satırlarında.
  Mevcut `readingRows` bu örnekte beklenen basit satır ayrımını yapıyor; her sayfada bozuk demiyorum.
- Afiş: çocuk sayıları **[3,1]**. Panel, üstündeki başlık ve düğme tek satırın üç kardeşi oluyor;
  footer ayrı satırda. Yeni çıkarıcıda gerçek katman grubunu koruma gereksinimi var.

### Tasarım kararına etkisi

Önceki karar değişmedi. Artık yalnız hero örneği yok: altı kartlı olağan düzen, bilinçli katmanlı
manuel telefon düzeni ve önceki çakışmasız/kesilemez A–E örneği farklı sınıfları kapsıyor.
Bu sayı bütün editör sayfalarını temsil eden bir örneklem değil. Yeni XY-cut uygulaması olmadığı
için yeni ağacın tarayıcıda başarıyla çalıştığı iddia edilmiyor.

Ek ölçümler ve bu sonuçlar kaydedilince ana tasarım incelemesi tamamlandı; bundan sonra ikinci
istekteki `41978ae` düzeltme incelemesine geçildi. Bu devamda yalnız rapor dosyaları commit edilecek;
yeni fixture kodu, ham JSON veya ekran görüntüsü depoya eklenmeyecek.

## Genel kontroller ve temizlik

| Kontrol | Çalıştırılan kaynak | Sonuç |
|---|---|---|
| `npm run lint` | Temiz `b998b6c` geçici kopyası | Geçti |
| `NODE_OPTIONS=--no-experimental-webstorage npm run test:run` | Aynı kopya, Node 26.13.0 | 317 dosya, 3114 test geçti; 71,25 s |
| `npm run build` | Aynı kopya | Geçti; büyük parça uyarısı var |
| `.venv-linux/bin/python -m pytest -q` | Yerel backend; bu arada backend kaynağı değişmedi | 998 geçti, 766 uyarı; 257,38 s |
| `git diff --check` | İnceleme değişiklikleri | Geçti |

Tarayıcı ölçümlerinden sonra geçici React dışa aktarımı ve ölçüm düzeneği kaldırıldı;
kontroller öncesi 702 izlenen frontend dosyasının başlangıç commit'iyle aynı olduğu byte
karşılaştırmasıyla doğrulandı. İnceleme için yazılan fixture testi genel 3114 test sayısına dahil değil.

İlk genel frontend koşusu ana klasörde başladı; başka ajanın eşzamanlı değişiklikleri sırasında
11 test kırıldı (5 dosya; toplam 3127 test). Bunu sabit başlangıcın hatası veya son kaynak için
geçerli bir sonuç saymadım. Ayrıca geçici proje çıktısı klasörünü temizlemeden yapılan ilk izole
lint denemesi, üretilmiş `runtime.js` dosyasını uygulama kaynağı gibi taradı ve durdu. Geçici
çıktılar ayrıldıktan sonra yukarıdaki tam zincir temiz kaynakta geçti. Buradaki sonuçlar,
sonradan gelen `41978ae` değişikliklerini onayladığım anlamına gelmez.

Bu görevde E2E değiştirilmedi; CI E2E sonucu veya tarayıcılar arası uyumluluk doğrulanmış sayılmadı.

İnceleme tarayıcı sekmesi kapatıldı, geçici viewport ayarı kaldırıldı ve yalnızca bu tur için
başlatılan 5173 sunucusu durduruldu. Son port kontrolünde 5173 ve 8001'de dinleyici yoktu.
Yerel hesap veya veritabanı kaydı oluşturulmadı. İnceleme kanıtları dışındaki geçici düzenek
üretim klasörüne taşınmadı. Plan ve üretim dosyaları bu incelemenin değişiklikleri arasında değil.

### Devam isteğinin son kontrolü

`41978ae` üretim kaynağıyla ana klasörde genel kontroller tekrarlandı: lint geçti,
**317 dosya / 3129 Vitest geçti** (68,82 s), build geçti (büyük parça uyarısı),
**998 pytest geçti / 766 uyarı** (199,85 s). Model ve üretim kodu değişmedi.
Bu devamda yeni E2E yok; CI sonucu doğrulandı diye sunulmuyor. İlk tablodaki 3114 test
başlangıç `b998b6c` kopyasına aittir; iki farklı kaynak sonucu karıştırılmamalı.

İkinci isteğin altı düzeltme kontrolü de tamamlandı ve
`GENERATED-SOURCE-REVIEW-2026-11-04.md` içindeki **41978ae kontrolü** bölümüne yazıldı.
Yalnızca iki rapor dosyası commit ediliyor; geçici girdiler ve testler `/tmp` kopyalarında kaldı
ve inceleme bitince temizlendi. Üretim sunucusuna istek gönderilmedi, canlıya alınmadı.
