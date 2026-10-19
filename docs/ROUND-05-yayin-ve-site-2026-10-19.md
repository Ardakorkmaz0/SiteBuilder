# Tur 5 — Yayın ve herkese açık site (Claude, 19 Ekim 2026)

Başlangıç `400bcad`. Önce Tur 4 bulguları değerlendirildi: yedi bulgunun hepsi doğruydu ve
düzeltildi. Ayrıntılar `docs/CLAUDE-ANSWER-ROUND-04-2026-10-19.md` dosyasında; ilgili
commit'ler `6f717d1`, `c5f907b`, `66c9cbd` ve `c51a654`. CI koşusu `39299493786` iki
tarayıcıda yeşil. Hiçbir şey canlıya alınmadı; canlı sürüm hâlâ `e6aacde`.

## Nasıl denendi

Yerel sunucular (8001 ve 5173) ve yerelde açılan geçici bir hesapla gerçek arayüz kullanıldı:

- sihirbazdan şablonlu bir site oluşturuldu (ana sayfa HTML);
- "+ Dosya" ile "Hakkımızda" adlı bir tuval sayfası eklendi;
- blok kütüphanesinden bir iletişim formu eklendi;
- öğe panelinden ana sayfadaki bir bağlantı "Hakkımızda"ya yönlendirildi;
- site "Yayınla" ile yayınlandı.

Yayınlanan sayfalar hem tarayıcıda hem doğrudan HTTP ile incelendi. Test verisi tur
sonunda silindi (site 832, hesap 576).

## Bulunan ve düzeltilen

1. **`c1d8859`: yayınlanan sitede iki tür sayfa bağlantısı hiçbir yere gitmiyordu.**
   - **Metin bandının düğmesi** (`section` tipi, `buttonHref`): bağlantı alanı başka bir
     sayfayı gösterse de yayında `#pageId` olarak kalıyordu. Yayın yalnızca `href` adlı
     alanları çeviriyordu.
   - **HTML bloğundaki sayfa bağlantısı:** bağlantı hem çevrilmiyordu, hem de blok
     sandbox'lı bir iframe olduğu için ziyaretçiyi başka bir sayfaya götüremiyordu. Bloğun
     gönderdiği `pwb-navigate` isteğini yayınlanan sayfa dinlemiyordu.

   Düzeltme:
   - Yayın artık bağlantı alanlarının hepsini (`href`, `buttonHref`) ve blok kodundaki
     `href="#pageId"` değerlerini çeviriyor. Bu, `pageLinks.js`'in sayfa bağlantısı
     saydığı alanların aynısı.
   - Sayfanın çalışma kodu kendi bloğundan gelen bir site yolunu, sayfanın kendi bağlantısı
     gibi izliyor; böylece renk modu da taşınıyor.
   - Bağlantı sayfanın bir bölümünü gösteriyorsa sayfa o bölüme kayıyor. Uygulama içi
     görüntüleyicide istek bir üst pencereye iletiliyor.
   - Başka bir iframe'den gelen istekler ve `//` ya da `javascript:` gibi adresler yok sayılıyor.

   Testler `publishedPages.test.js` ve `htmlRuntime.standalone.test.js` dosyalarında; beş
   test düzeltmeden önce kırmızıydı. Gerçek tarayıcıda yayınlanan sayfada denendi: bant
   düğmesi ve blok bağlantısı ana sayfaya gidiyor. HTML sayfadan tuval sayfasına giden
   bağlantı da çalışıyor.
2. **`3c29b7e`: gelen kutusu yana kayıyordu.** Bir form mesajındaki boşluksuz uzun bir değer
   (örneğin uzun bir bağlantı) kontrol merkezinin gövdesini yaklaşık 15.000 piksel yana
   kaydırıyordu. Artık değer kartın içinde kırılıyor. Yalnızca görünüm değişikliği olduğu
   için test eklenmedi.

## Doğru çalışanlar

- **Yayınla, yayından kaldır, yeniden yayınla:** adres aynı kalıyor. Kaldırınca sayfalar,
  site haritası, form ucu ve herkese açık API 404 veriyor; site Keşfet'ten düşüyor. İnceleme
  bağlantısı taslak üzerinde çalışmaya devam ediyor, gelen kutusu korunuyor.
- **`/s/` yanıtları:** CSP sandbox var ve `allow-same-origin` yok. `nosniff`,
  `Referrer-Policy` ve 60 saniyelik `Cache-Control` başlıkları var. "Hakkımızda" sayfası
  `hakkimizda` adresini alıyor.
- **Form ucu:**
  - CORS önkontrolü geçiyor, normal gönderim 201 alıyor.
  - Bal küpü alanı dolu gelirse istek sessizce 204 ile yutuluyor.
  - Olmayan site 404; nesne olmayan veri ve 20'den fazla alan 400; GET 405 alıyor.
  - Değerler 2000 karakterde kırpılıyor.
- **Gelen kutusu:** HTML düz metin olarak gösteriliyor. "Okundu işaretle" çalışıyor;
  anonim istek 401 alıyor.
- **SEO:**
  - Başlık, açıklama ve simge `<head>`'e kaçışlı yazılıyor; tırnak, `&` ve `<` denendi.
  - Sayfanın kendi etiketleri önce geliyor.
  - Site haritası iki sayfayı da listeliyor.
- **İnceleme bağlantısı:**
  - Paylaşım kapalıyken anonim istek 404 alıyor; açıkken anonim görüntüleme ve yorum çalışıyor.
  - Yorum düz metin olarak gösteriliyor.
  - Bağlantı yenilenince eski adres 404 veriyor; anonim kullanıcı bağlantıyı yenileyemiyor (401).
  - Anonim yanıttaki `site_options` yalnızca SEO bilgisini içeriyor.
- **Analizler:** toplam, son 30 gün, günlük ve cihaz bazında sayılar doğru.
- **Tur 4 düzeltmeleri gerçek tarayıcıda:**
  - Sticky öğe kaba girmiyor ve hedef çerçevelenmiyor; normal öğe giriyor.
  - Çoklu seçimle sürüklenen iç öğe kabında kalıyor; tek başına sürüklenen dışarı çıkıyor.

## Denenemeyenler ve araç sınırları

- **Form gönderimi:** tarayıcı bölmesi, yayınlanan sayfadan giden form isteğini kendisi
  engelledi (`net::ERR_BLOCKED_BY_CLIENT`). Bu yüzden form ucu, çalışma kodunun gönderdiği
  isteğin aynısıyla doğrudan denendi.
- **Uygulama içi görüntüleyici:** otomasyon tıklamaları, gerçek bir kökendeki sayfanın
  içindeki sandbox'lı (opak kökenli) iframe'lere ulaşmıyor. Bu yüzden görüntüleyicideki
  tıklamalar araçla denenemedi. Aynı belge, tıklama iframe'in kendi içinden yaptırılınca
  `pwb-navigate` mesajını doğru gönderiyor. Bloktan gelen isteğin görüntüleyicide bir üst
  pencereye iletilmesi birim testiyle kapsanıyor.
- **Onay pencereleri:** `window.confirm` kullanan adımlar (yayından kaldırma, gelen
  kutusundan silme, inceleme bağlantısını değiştirme) bölmede otomatik reddedildi.
  Sonuçları API ile denendi.
- **Diğerleri:** paylaşım görseli yükleme (dosya penceresi gerekiyor) ve özel alan adı (DNS)
  denenmedi.

## Sahibin kararına bırakılanlar

1. **Canlı düzenleme:** yayındaki bir sitede, otomatik kayıt dahil her kayıt canlı
   sayfaları hemen güncelliyor. Yani yarım kalmış bir düzenleme de ziyaretçiye gidiyor. Böyle
   mi kalsın, yoksa yayındaki site yalnızca "Yayınla/Güncelle" ile mi değişsin?
2. **SEO başlığı:** Kontrol merkezindeki "SEO başlığı" yalnızca paylaşım kartlarına
   (`og:title`, `twitter:title`) yazılıyor. Arama sonuçlarında görünen `<title>` sayfanın
   kendi başlığı olarak kalıyor. Alanın adı "Paylaşım başlığı" mı olsun, yoksa kendi SEO
   başlığı olmayan sayfalarda `<title>` olarak mı kullanılsın?

## Açık bulgular

- **Tur 10 (güvenlik):** herkese açık form ucu yalnızca genel anonim sınıra (IP başına
  dakikada 120) tabi. Bir sitenin gelen kutusu için ayrı, daha dar bir sınır düşünülebilir.
- **Tur 9 (erişilebilirlik):**
  - "+ Dosya" ile sayfa eklendikten sonra odak `body`'ye düşüyor.
  - "Diğer işlemler" menüsünde `menu`/`menuitem` rolleri yok (`aria-expanded` var).
  - Gelen kutusu kartlarında sabit renkler (`bg-white`, `#eef2ff`) kullanılıyor; koyu temada
    kontrol edilmeli.
- **Sayım ayrıntıları:** sahibin kendi ziyaretleri ve `HEAD` istekleri de görüntülenme
  sayılıyor. Kodda bu sayının "en az şu kadar" olduğu zaten belirtilmiş.
- **Olası yeni özellik:** analizler sayfa bazında döküm göstermiyor. Ziyaret edilen yol
  kaydediliyor ama raporlanmıyor. İstenirse eklenebilir.

## Kontroller

- Lint geçti.
- Frontend: 2564 test (277 dosya).
- Build geçti.
- Backend: 817 test.
- `git diff --check` temiz.

## ChatGPT için: Tur 6'dan önce

1. **Çapraz inceleme:** `c1d8859` (`publishedPages.retarget`, `htmlRuntime` içinde
   `followBlockLink` ve `sitePath`), Tur 4 yanıtındaki `6f717d1`, `c5f907b`, `66c9cbd` ve
   `3c29b7e`. Testleri kendi bozmalarınızla doğrulayın. Özellikle şunlara bakın:
   - bloktan gelen `//başka-site` ve `javascript:` isteklerinin reddedildiği;
   - özel alan adında, blok içindeki `/s/<slug>/...` adresinin `serve_for_host`
     tarafından 301 ile köke yönlendirildiği;
   - görüntüleyicide isteğin bir üst pencereye iletildiği.
2. **Sonra Tur 6:** hesap ve topluluk; kapsam plandaki satırda.
