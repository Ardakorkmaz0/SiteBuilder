# Ekran boyutu değişince içerik: plan (2. sürüm)

Yazan: Claude, 4 Kasım 2026. Durum: kod yazılmadı, sahibin onayı bekleniyor. Bu sürüm ChatGPT'nin
[incelemesinden](RESPONSIVE-PLAN-REVIEW-2026-11-04.md) sonra yazıldı. İlk sürüm `d70bc09` commit'indedir.

## Sorun

Serbest tuval sayfası bugün gerçekten uyarlanmıyor. Sayfa iki sabit çizimden oluşuyor: 1000 piksel PC ve 390 piksel
telefon. Geçiş 768 pikselde. Ekran çizimden darsa bütün sayfa `transform: scale()` ile küçülüyor, genişse çizim ortada
duruyor. Blokların yerleşimi hiçbir genişlikte değişmiyor. Boş tuvalle başlanan her sayfa bu modda. 500 şablon ise HTML
belgesi ve kendi `@media` kurallarını taşıyor.

İki bağımsız ölçümde aynı tablo çıktı (örnekler farklı, sayılar bu yüzden tam tutmuyor):

| Genişlik | Ölçek | Yazı boyu (ortanca) | Ana içeriğin kullandığı genişlik (Claude / ChatGPT) |
|---|---|---|---|
| 320 | 0,82 | 14,8 / 13,1 px | %100 / %92 |
| 768 | 1 | 18 / 16 px | **%51 / %47** |
| 769 | **0,77** | **12,3 / 12,3 px** | %100 / %92 |
| 1920 | 1 | 16 / 16 px | %52 / %48, ortalı sütun, hata sayılmıyor |

İkisinin de doğruladığı hatalar:

1. **Telefon sırası:** sol sütunda başlık, paragraf, düğme, sağda görsel varsa sıra başlık, görsel, paragraf, düğme oluyor.
2. **HTML'e çevirme:** aynı sol sütun yan yana dört sütuna dağılıyor (`readingRows`).
3. **Proje dışa aktarımı:** 900 pikselde 100 piksel yatay taşma.
4. **Geçiş ölçüsü:** görüntüleyici `el.clientWidth < 768`, yayımlanan sayfa `innerWidth <= 768` kullanıyor. Çizim 768'de ve
   kaydırma çubuklu pencerede farklı seçiliyor.

Yalnızca Claude'un taradığı, ChatGPT'nin tekrarlamadığı: 320 pikselde 227 şablonda 4 piksellik kayma ve 360 pikselde 41
şablonda ekran dışına çıkan öğe. Bu ayrı bir iş, tuval planına bağlı değil.

## İncelemeden sonra ne değişti

Her iddiayı kodda kontrol ettim:

| Bulgu | Sonuç | Bu plandaki karşılığı |
|---|---|---|
| Kesilemeyen ama çakışmayan düzen (P1) | Doğru. Beş kartlık düzende boş şerit yok. | **XY-cut yazımdan çıktı**, yerine düz CSS Grid |
| Otomatik telefon değişimi eski sayfaları da değiştirir (P1) | Doğru, benim hatam. `normalizePage` yüklerken yeniden üretiyor (`editorStore.js:1203`). | Yeni sıra yalnızca geçiş yapmış sayfalarda |
| Geometri okuma niyetini kanıtlamaz (P2) | Doğru. | Ağaç yok, şemada ebeveyn değişmiyor; sıra yalnızca DOM sırasını belirler |
| Fixed ve sticky aynı şey değil (P2) | Doğru. Sticky bugün JS ile kaydırma yapıyor. | Fixed ekran katmanında kalır, sticky hücresinde yerini tutar |
| Ortak genişlik tanımı gerekli (P2) | Doğru. | Tek kural: belgenin kendi `@media` sorgusu |
| Eşdeğerlik ve önizleme geç geliyor (P2) | Doğru. | Aşama sırası değişti |
| 1 piksel ölçütü koşulsuz söz olamaz | Doğru. | Ölçüt yeniden yazıldı |
| Tek mi çift mi DOM ağacı | İlk planda atlamıştım. | Tek DOM, iki yerleşim |

Bir bulgunun açtığı yeni riski de ekledim: Grid sütunları `dir="rtl"` sayfada ters sıralanır, mutlak konum sıralanmaz.

## Yaklaşım: düz CSS Grid

Editör tuvali ve kayıtlı koordinatlar aynı kalır: PC ve telefon için iki çizim. Değişen, sayfanın yazılışıdır.

Blokların kenarları ızgara çizgilerine dönüşür. DOM düz kalır: bütün bloklar `.page` altında, bugünkü sınıflarıyla durur.
Bir `@media` kuralı aynı blokları telefon ızgarasına taşır:

```css
.page { display: grid; width: min(100%, 1000px); margin: 0 auto;
  grid-template-columns: minmax(0, 40fr) minmax(0, 420fr) minmax(0, 80fr) minmax(0, 420fr) minmax(0, 40fr);
  grid-template-rows: minmax(min(72px, 7.2cqw), auto) ...; }
.c-heading { grid-column: 2 / 3; grid-row: 2 / 3; }
@media (max-width: 768px) { .page { width: 100%; grid-template-columns: ...; } .c-heading { grid-column: ...; } }
```

Bu yapı incelemenin itirazlarının çoğunu aynı anda karşılıyor:

- **Kesilemeyen düzen özel bir durum değil.** Beş kartlık düzen de sıradan bir ızgaradır.
- **Gerçek çakışma da özel değil.** Görsel üstündeki yazı aynı hücreleri paylaşır, ayrı ölçek gerekmez.
- **Yazı uzarsa** satırı büyür ve alttakini iter. Bugün üst üste biniyor.
- **Tasarım genişliğinde** ızgara çizgileri tam koordinatlara denk gelir.
- **Tek DOM:** yinelenen id, iki kez yüklenen iframe veya kaybolan form değeri riski doğmuyor.
- **`.page > .c-id` yapısı korunur**, sahibin kodu için risk azalır ama sıfırlanmaz.
- **Ek bir kırılma mantığı yok.** 769-1000 arasında sütunlar orantılı daralır, 768 ve altında telefon çizimi devreye girer.

Görseller `aspect-ratio` ile büyür. Satırların alt sınırı tasarımın altında orantılı küçülür, üstünde büyümez.

**Bedeli:** kaynak okunabilirliği. `minmax(min(72px,7.2cqw),auto)` listesi, bir geliştiricinin yazacağı satır ve sütun koduna
benzemiyor. Çok önem verdiğiniz bir konu olduğu için açıkça yazıyorum. Değişkenlerle ve yakın çizgileri 1 piksele kadar
birleştirerek kısaltılabilir, ama hedef görünüm doğruluğu, en güzel kaynak değil. Ölçek betiği ve bloğa özel mutlak konum
kuralları ise kalkar. Net boyut farkını gerçek yazıcıyla henüz ölçmedim.

## Prototip

Fikri yazmadan önce denedim: `docs/review-evidence/responsive-grid-prototype-2026-11-04/` (`proto.cjs`, `results.txt`, üç görüntü).
ChatGPT'nin kendi örnekleri kullanıldı. Chromium 156, 14 genişlik (320-1920).

| Örnek | Yatay taşma | Beklenmeyen çakışma | Kesilen blok | Tasarım genişliğinde en büyük sapma |
|---|---|---|---|---|
| Sol sütun + görsel | 0 | 0 | 0 | 0 px |
| Aynısı, çok uzun metin ve bölünmeyen adres | 0 | 0 | 0 | 67 px, beklenen: yazı kutuya sığmıyor ve alttakini itiyor |
| Beş kart | 0 | 0 | 0 | 0 px |
| Görsel üstünde yazı | 0 | 0, tek çakışma tasarımdaki | 0 | 0 px |
| 60 blok | 0 | 0 | 0 | 0 px |

Sticky: bugünkü kaydırma mantığının aynısı ızgarada çalıştı, 800 piksel kaydırmada blok ekranın üstünde kaldı.

**Bu prototip neyi kanıtlamaz:** bloklar düz kutu. Gerçek bileşen, gerçek yazıcı, konteyner, sekme, bölge, HTML bloğu, `boxFit`,
hareket, RTL, Firefox ve Safari denenmedi. 60 bloğun telefon çizimi yoktu, yani o satırın 768 altı sonucu anlamsız. `cqw` ve
`min()` 2023'ten beri tarayıcılarda; eski tarayıcıda ne olduğu ölçülmedi. Kısacası yön doğrulandı, uygulama değil.

## Ortak kurallar

**Genişlik.** Çizim seçimini belgenin `@media (max-width: 768px)` sorgusu yapar, başka bir JS hesabı olmaz. Görüntüleyici, önizleme
ve iframe aynı belgeyi açar. React yolu (`ResponsiveSite`) bu sayfalarda kullanılmaz.

**DOM sırası.** PC çiziminin okuma sırası. Yalnızca sıralama için, sütunları tanıyan bir fonksiyon kullanılır: bölünebiliyorsa sütun
sütun, bölünemiyorsa üstten alta ve soldan sağa. Yanlış tahminin bedeli bozuk yerleşim değil, farklı bir Tab sırasıdır. Telefon
çizimi elle farklı sıralanmışsa görsel sıra ile Tab sırası ayrılabilir; bu kabul edilen bir sınırdır.

**Sayfa sürümü.** `page.layoutVersion: 2`. Alanın yokluğu eski davranış demektir ve yükleme, düzenleme, çevirme, önizleme, yayımlama
aynı koşula bakar. Backend izin listesine eklenir (`validators.py`), yoksa kaydederken silinir. Eski sekme bu sayfayı eski yazıcıyla
yeniden gönderebilir; aşama 4'te ele alınır. Elle yapılmış telefon çizimi korunur.

**Bloklar:**
- Fixed: ekran katmanında kalır, ölçeksiz.
- Sticky: kendi hücresinde yer tutar, bugünkü kaydırma mantığı sürer.
- Gizli blok: ızgaraya girmez. Boşluğu kalıp kalmayacağı testle kararlaştırılır.
- Tam genişlik bant: `--design-offset` ile kenardan kenara, içerik sütun hizasında.
- RTL: ızgara soldan sağa sabitlenir, blok içeriği RTL kalır.

## Kabul ölçütleri

Her sabit örnek şu genişliklerde ölçülür: 320, 360, 390, 600, 767, 768, 769, 780, tasarım ±1, 1024, 1920. Ek olarak klasik kaydırma
çubuğu, dar kapsayıcı, iç iframe, elle telefon çizimi ve farklı tasarım genişlikleri.

- **Ölçek:** hiçbir genişlikte sayfa ölçeği yok. Yazı boyu tasarımdaki boydur.
- **Taşma:** kök `scrollWidth` yetmez, `overflow: hidden` içeriği kesebilir. Yaprak blokların sınırları ayrıca ölçülür; kasıtlı taşma
  (kayan içerik, iç kaydırma) örnekte elle işaretlenir.
- **Çakışma:** tasarımda çakışmayan iki yaprak blok hiçbir genişlikte çakışmaz. Üst ve alt öğe sayılmaz.
- **Kullanılan genişlik:** 768'de yazı ve görsellerin kapladığı alan en az %80. Menü ve bant sayılmaz.
- **Tasarım genişliğinde konum:** temsil edilen örnekte her blok için x, y, w, h sapması en fazla 1 CSS pikseli. Koşullar: aynı tarayıcı,
  yüklü font ve görsel, yazı kutuya sığıyor. Ortalama yetmez. Farklı tarayıcı ve fontta satır kırılması garanti edilmez.
- **Eşdeğerlik:** tek belge, görüntüleyici, proje çıktısı ve editör önizlemesinde aynı genişlikte aynı konumlar.
- **Boyut:** bütçenin hangi örneğe ve hangi dosyalara ait olduğu yazılır, boyut gerçek yazıcıyla önce ve sonra ölçülür.

## Aşamalar

Her aşama ayrı onaylanır, canlıya çıkış ayrıca izin ister. Aşama 4'e kadar sayfaların görünümü değişmez.

**Aşama 0: Ölçüm ve sözleşme.** Sabit örnekler: sol sütun ve görsel, beş kart, çakışma, uzun metin, gizli blok, elle telefon, RTL, bölge,
konteyner, sekme, HTML bloğu, sticky, fixed. Mevcut davranışı kaydeden testler, ürün davranışı değişmez. Sahibin gösterdiği gerçek sayfa
da buraya eklenir.

**Aşama 1: Saf yerleşim ve gerçek yazıcı.** `utils/gridLayout.js` (çizgiler, yerleşim, okuma sırası), elle yazılmış beklenen değerlerle.
`layoutVersion: 2` sayfasını `schemaToSingleHtml` yazar. Gerçek bileşenlerle 1 piksel ölçütü burada gösterilir. Tutmazsa plan burada değişir.

**Aşama 2: Her yerde aynı belge.** Görüntüleyici, editör önizlemesi ve proje çıktısı aynı sözleşmeye geçer. Sürüm 2 sayfası için genişlik
seçimli gerçek belge önizlemesi. Geçişin önizlemesi buna bağlı olduğu için erkene alındı.

**Aşama 3: Bütün bloklar.** Konteyner, sekme, bölge, HTML bloğu yüksekliği, `boxFit`, sticky, fixed, çapa, hareket, RTL, uzun metin, `NEEDS`
uyumu, Firefox ve Safari'nin elde edilebilen kısmı. Tablet kararı burada verilir: 600-768'de telefon çizimi mi, daralan PC çizimi mi.

**Aşama 4: Geçiş.** Yeni sayfalar sürüm 2 başlar. Mevcut sayfa önizlemeyle tek tıkla geçer, geri alınabilir. Telefon sırası düzeltmesi yalnızca
geçen sayfalarda çalışır. Eski sekme, kayıt ve revizyon, sahibin kodu, içe ve dışa aktarma denenir. Sahibin sayfalarıyla onay alınır.

**Ayrı iş 1: HTML'e çevirme.** Dört sütun hatası tuval planını beklemek zorunda değil. Okuma sırası hazır olunca düzeltilir: çıktı için
satır ve sütun mu, yoksa aynı ızgara mı kullanılacağı o zaman kararlaştırılır.

**Ayrı iş 2: Şablon taramaları.** 4 piksellik kayma ve 41 belgenin kontrolü. Bağımsız ve küçük.

**Yapılmayacaklar:** üçüncü bir tablet çizimi, her özellik için genişliğe özel ayar, editör tuvalini yeniden yazmak, görsel çıkarımla
şemada ebeveyn değiştirmek.

## Kalan riskler

Hiçbiri gerçek yazıcıyla denenmedi:

- **Sahibin kodu.** `.c-<id>` ve `.page > .c-<id>` korunur, ama mutlak konuma, `offsetParent`'a veya ölçeğe bağlı kod değişebilir.
- **Satırların birbirini etkilemesi.** Izgarada bir sütunda uzayan blok, yandaki sütunun aynı satırdaki bloğunu da aşağı itebilir.
  Çakışma yerine fazladan boşluk çıkar. İç içe ağaçtan bu yönüyle kötü, gerçek sayfalarda ne kadar göründüğü ölçülecek.
- **Dar sütun.** 769'da sütunlar %77'ye iner. Dar sütundaki uzun kelimeli başlık kötü görünebilir; yazı boyu küçültülmediği için uzar.
- **`boxFit`** içeriği kutuya göre büyütüp küçültüyor. **Konteyner ve sekme** kendi mini tuvallerini taşıyor. **HTML bloğu** yüksekliği iframe'den geliyor.
- **Dinamik yükseklik:** sekme açılınca veya iframe büyüyünce çapa konumu.

## Sahibin kararları

1. **Mevcut sayfalar.** Önerim ve incelemenin de önerisi: yeni sayfalar yeni düzenle başlar, mevcut sayfalar önizlemeyle tek tıkla geçer.
2. **Sorunun nerede görüldüğü.** Serbest tuval mi, HTML şablonu mu, HTML'e çevrilmiş sayfa mı? Ölçümler örnek sayfalara dayanıyor.
3. **Kaynak okunabilirliği bedeli** kabul mü? Yukarıda "Bedeli" başlığında.
4. **Aşama 0 ve 1 başlasın mı?** Bu ikisi canlıdaki hiçbir sayfanın görünümünü değiştirmez.

## ChatGPT'den istenecek kontrol

Hazır olduğunda, aşama 1 sonucuyla birlikte, tasarımı değil gerçek çıktıyı kontrol etmesi daha değerli olur. `41978ae` düzeltmelerinin kontrolü
de hâlâ yapılmadı: inceleme raporu bu commit'i onaylamadığını açıkça yazıyor.
