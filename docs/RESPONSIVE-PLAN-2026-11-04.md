# Ekran boyutu değişince içerik: plan

Yazan: Claude, 4 Kasım 2026. Durum: taslak, kod yazılmadı. Sahibin kararı ve ChatGPT'nin kontrolü bekleniyor.

## Sorun

Serbest tuval sayfası bugün gerçekten uyarlanmıyor. Sayfa iki sabit çizimden oluşuyor: 1000 piksel PC ve 390
piksel telefon. Geçiş 768 pikselde. Ekran çizimden darsa bütün sayfa `transform: scale()` ile küçülüyor, genişse
çizim ortada duruyor. Blokların yerleşimi hiçbir genişlikte değişmiyor.

Boş tuvalle başlanan her sayfa bu modda (`flowMode: false` varsayılan). 500 şablonun tamamı ise HTML belgesi ve
kendi `@media` kurallarını taşıyor, yani onlar ayrı ve çok daha iyi durumda.

## Ölçümler

Yöntem: `schemaToSingleHtml` çıktısı Chromium'da 14 genişlikte ölçüldü (320-2560), dış istekler kapalı. Düzenek repo
dışında. Tuval örneği elle yazılmış tek bir sayfa: menü, başlık, paragraf ve düğme solda, görsel sağda, bant, üç kart,
alt metin. **Gerçek kullanıcı sayfası değil.** Tuval sayıları bu tek örneğe aittir.

Serbest tuval, yayımlanan sayfa:

| Genişlik | Ölçek | Yazı boyu (ortanca) | Yazı ve görsellerin kullandığı genişlik |
|---|---|---|---|
| 320 | 0,82 | 14,8 px (tasarım 18) | %100 |
| 390 | 1 | 18 px | %100 |
| 600 | 1 | 18 px | %65 |
| 768 | 1 | 18 px | **%51**, tablette telefon sütunu ortada kalıyor |
| 769 | **0,77** | **12,3 px** (tasarım 16) | %100 |
| 900 | 0,90 | 14,4 px | %100 |
| 1024 | 1 | 16 px | %98 |
| 1920 | 1 | 16 px | %52 |
| 2560 | 1 | 16 px | %39 |

768'den 769'a bir piksel gidince sayfa bambaşka bir çizime ve 0,77 ölçeğe atlıyor.

Diğer yazıcılarda ve sırada görülenler:

1. **Telefonda okuma sırası bozuluyor.** Sol sütunda başlık, paragraf, düğme, sağda görsel varken telefon sırası
   başlık, görsel, paragraf, düğme oluyor. `autoMobileLayout` yalnızca üst kenarlara bakıyor, sütun bilmiyor.
2. **HTML'e çevirme aynı sütunu dağıtıyor.** 1024 pikselde başlık (x=36), paragraf (346), düğme (646) ve görsel (788)
   yan yana dört sütun oluyor (`readingRows`, `responsiveHtml.js`). Bu kalıp gerçek sitelerde çok yaygın.
3. **Dışa aktarılan proje 900 pikselde 100 piksel yatay kayıyor.** `styles.css` sayfaya sabit `width: 1000px` veriyor,
   ölçek betiği yok.
4. **Geçiş noktası iki yerde farklı (yalnızca kod okuyarak).** Uygulama içi görüntüleyici `width < 768`
   (`PreviewPage.jsx:47`), yayımlanan sayfa `screenW <= 768`. 768 genişliğindeki bir tablette ikisi farklı çizim seçer.
5. **Akış modu (`enableFlowMode`) bu hali çözmüyor.** Örnek serbest çizimden çevrildi: 1920'de menü 1000 piksele
   ortalı kalırken gövde tüm genişliğe yayılıyor, kenarlar hizalanmıyor. Adil bir akış örneği olmadığı için bu kısım
   kesin hüküm değil.

HTML şablonları (500 belge):

- 360 ve üstünde sayfa yatay kaymıyor. 320'de **227 belge tam 4 piksel** kayıyor; sabit fark ortak bir CSS kuralına işaret
  ediyor.
- 41 belgede 360 pikselde ekran dışına çıkan öğe var. Örnek baktıklarım karşılaştırma tablosu ve kayan yazı gibi duruyor;
  kasıtlı olup olmadıkları kontrol edilmedi.
- Metin üst üste binme ölçümüm iç içe öğeleri de saydığı için güvenilir değil (491 belge). Bu sayıyı kullanmayın.

## Hedef

Bloklar her genişlikte yerleşsin, küçültülmesin. Editörde çizilen PC tasarımı kendi genişliğinde bugünkü gibi görünsün.

| Ölçüt | Bugün (örnek) | Hedef |
|---|---|---|
| 320-768'de ölçek | 0,82-1 | her yerde 1 |
| 769-1000'de ölçek | 0,77-1 | her yerde 1 |
| 768'de kullanılan genişlik | %51 | en az %80 |
| 769'da yazı boyu | 12,3 px | tasarımdaki boy |
| Dışa aktarımda yatay kayma | 100 px | 0 |
| Yan yana sütun, telefonda sıra | bozuk | sütun sütun okunur |
| Tasarım genişliğinde blok konumu | referans | sapma en fazla 1 px, yazı kutusuna sığıyorsa |
| Üretilen sayfanın boyutu | 13 KB bütçe | bütçe aşılmaz |

## Yaklaşım

Veri modeli ve editör tuvali aynı kalır: PC ve telefon için iki çizim, mutlak koordinatlar. Değişen, sayfanın nasıl
yazıldığıdır. Koordinatlardan bir yerleşim ağacı çıkarılır, sayfa satır ve sütunlarla yazılır.

**Yerleşim ağacı (XY-cut).** Saf bir fonksiyon, `utils/layoutTree.js`. Blok dikdörtgenlerini boş yatay şeritlerden
satırlara, sonra boş dikey şeritlerden sütunlara böler, tekrar eder:

```text
menü
[ başlık + paragraf + düğme ] | görsel     <- bugünkü readingRows bunu dört sütun yapıyor
bant
kart | kart | kart
alt metin
```

- Bir bölüme (`section`, `region`) oturan bloklar o bölümün çocuğu sayılır; `autoMobileLayout` bu ayrımı zaten yapıyor.
- **Bölünemeyen, gerçekten üst üste binen bloklar** (görsel üstünde yazı) bir katman düğümü olur: içeride mutlak kalır, grup
  olarak mevcut `data-pwb-container-width` mekanizmasıyla ölçeklenir. Yalnızca o küçük grup ölçeklenir, sayfa değil.
- Sabit ve yapışkan bloklar ağaca girmez, ekrana bağlı katmanda kalır.

**Yazım.** Satırlar flex ile yazılır. Sütun genişliği tasarım oranından yüzde olarak, boşluklar tasarımdaki boşluktan gelir.
Yükseklik `min-height` olur, yazı uzarsa alttakini aşağı iter. Bugün üst üste biner.

**Genişlik basamakları:**

| Genişlik | Ne olur |
|---|---|
| tasarımdan geniş | bugünkü gibi: çizim ortada, bantlar kenardan kenara |
| 769 - tasarım | PC ağacı oranlarla daralır, sütun çok daralınca alt alta geçer, ölçek yok |
| 320 - 768 | telefon ağacı tüm genişliği kullanır, ölçek yok |

768 geçişi korunur, çünkü "telefonda gizle", `stylesMobile` ve menü düğmesi ona bağlı. Tablette telefon çiziminin mi yoksa
daralan PC ağacının mı daha iyi durduğu aşama 3'te ölçülüp kararlaştırılır.

Yan kazanç: `<div class="row">` yapısı `data-builder-layout` ölçek betiğini ve blok başına konum kurallarını kaldırır.
Kaynak, geliştiricinin yazacağı koda yaklaşır. Boyutu ölçmeden iddia etmiyorum.

**Yapılmayacaklar:** üçüncü bir tablet çizimi, her özellik için genişliğe özel ayar, editör tuvalini yeniden yazmak.
Bunlar sahibine ek iş çıkarır ve projenin büyüklüğünü aşar.

## Aşamalar

Her aşama ayrı onaylanır ve ayrı canlıya çıkar.

**Aşama 0: Ölçüm ve küçük düzeltmeler.** Görünen davranışta yalnızca hatalar düzelir.
- Yukarıdaki ölçümler sabit örnek sayfalarla e2e testine dönüşür (`e2e/responsive-widths.spec.js`), metin binme ölçümü
  düzeltilir. Sahibin gösterdiği gerçek örnek de buraya eklenir.
- Tek geçiş noktası (`<=` ile `<` farkı), şablonlardaki 4 piksellik kayma, 41 belgenin kontrolü.

**Aşama 1: Yerleşim ağacı.** `layoutTree.js` ve elle yazılmış beklenen değerli birim testleri. Uygulandığı yerler:
- HTML'e çevirme (`readingRows` yerine, bulgu 2).
- Telefon sırası (`autoMobileLayout`, bulgu 1). Otomatik telefon çizimi bir sonraki düzenlemede değişir, elle düzenlenmiş
  (`mobileManual`) sayfaya dokunulmaz.

**Aşama 2: Telefon yazımı.** `schemaToSingleHtml` ve görüntüleyici telefon tarafında ağaçtan yazar. 320-768 ölçeksiz.

**Aşama 3: PC yazımı.** 769 ile tasarım genişliği arasında ağaç, ölçek betiği kalkar. En riskli aşama. Tablet kararı burada.

**Aşama 4: Aynı sonuç her yerde.** Dışa aktarım (`schemaToFiles`, bulgu 3), editörün telefon önizlemesi ve görüntüleyicinin
React yolu (`ResponsiveSite`). Görüntüleyici yolu kaldırılıp tek yazıcıya inilebilir mi, burada değerlendirilir.

**Aşama 5: Editörde görmek.** Önizlemede genişlik seçimi (telefon, tablet, dizüstü, geniş ekran), yayımlanacak belgenin kendisiyle.
Bölünemeyen katman varsa sahibine kısa bir not.

**İsteğe bağlı:** çok geniş ekran (1920'de %52). Ortada sütun normal bir site görünümü olduğu için hata saymıyorum. Yeni
sayfaların 1200 piksel başlaması ayrı bir karar.

## Riskler

Her biri denenerek kapatılacak, henüz hiçbiri denenmedi:

- **Tasarım genişliğinde kayma.** En önemli söz bu. Metin kutuya sığıyorsa konum sapması en fazla 1 piksel olmalı; test bunu
  gerçek tarayıcıda ölçer.
- **Sahibin `customCss` ve `customJs` kodu.** `.c-<id>` sınıfları kalır, ama `.page` ölçeğine veya mutlak konuma bağlı kod bozulabilir.
- **`boxFit` yakınlaştırması.** Blok içeriği kutuya göre büyüyüp küçülüyor; yüzdeli genişlik bu hesabı değiştirir.
- **Konteyner, sekme ve bölgeler.** İçlerinde kendi mini tuvalleri var, her biri ağaca alınmalı ya da katman kalmalı.
- **HTML bloğu yüksekliği** (`--pwb-embed-height`, `usePhoneEmbedHeights.js`), çapa kaydırması, giriş animasyonları.
- **Kod azaltma.** Yeni çıktı `NEEDS` ve `withoutUnusedRules` ile uyumlu olmalı, `generatedSize.test.js` bütçesi geçerli.
- **Eski tarayıcı sekmeleri ve eski sayfalar.** Şema değişmediği için API uyumlu kalır. Canlıdaki sayfalar yeniden gönderilene kadar
  değişmez. Yeni bir sayfa alanı gerekirse `validators.py` izin listesine de eklenmeli, yoksa kaydederken silinir.

## Sahibin kararları

1. **Mevcut sayfalar.** Önerim: yeni sayfalar yeni düzenle başlar, mevcut sayfalar `page.fluid` ile önizleyerek tek tıkla geçer.
   Geçiş bir süre geri alınabilir. Sessizce değiştirmek, yeniden gönderilen sayfanın görünümünü sahibine sormadan değiştirir.
2. **Sorunun nerede görüldüğü.** Ölçümler benim örneğime dayanıyor. Sahibin kendi gördüğü sayfa ve genişlik planın önceliğini
   değiştirebilir. Özellikle: serbest tuval mi, HTML şablonu mu, HTML'e çevrilmiş sayfa mı?

## ChatGPT'den istenen kontrol

Kod yok, bu bir tasarım incelemesi. Lütfen raporu `docs/RESPONSIVE-PLAN-REVIEW-2026-11-04.md` olarak yazın ve üretim koduna
dokunmayın.

1. Ölçümleri bağımsız tekrarlayın: özellikle 768, 769, HTML'e çevirmedeki dört sütun, dışa aktarımda 900 piksel ve iki geçiş noktası.
2. XY-cut bu veriye uyuyor mu? Editörden üretilebilen, ağacın yanlış böleceği gerçek bir sayfa arayın.
3. "Tasarım genişliğinde en fazla 1 piksel sapma" hedefi gerçekçi mi? Sapma nerede kaçınılmaz?
4. Risk listesinde eksik ne var? Aşama sırası doğru mu?
