# Editör dışı tasarım — ikinci adım ve Claude inceleme notu

Tarih: 21 Ekim 2026. Sahibi ana sayfa/menü yenilemesini beğendi ve aynı görünümü Sitelerim, Bloklarım ve diğer hesap sayfalarına uygulamamızı istedi. Tasarım kararları `DESIGN-REFRESH-2026-10-21.md` dosyasındadır.

## Kapsam

- `WorkspaceLayout` ve `DashboardEmptyState`: geniş içerik, sayfaya özel sol seçenekler, üç sütunlu kartlar, mevcut SVG çizimlerle boş ekranlar. Telefonlarda seçenekler üstte, kartlar tek sütundadır. Hareketi azalt tercihi korunur.
- Sitelerim: kart/liste seçimi ve `pwb_sites_view` ile hatırlama; geçersiz veya erişilemeyen depolamada kart varsayılanı. Liste aynı gerçek `OwnerSiteCard` bileşenini kullanır. Sıralama, arama, sabitleme, kopyalama, dışa aktarma, silme onayı ve misafir sınırı korunur.
- Topluluk / Bloklarım: kapsam ve kategoriler solda, üç sütunlu önizleme/açıklama dengesi. Bunu kullan ana işlemi görünür; Bildir, Herkese aç/Özel yap ve Geri çek üç nokta menüsündedir. Menü ilk öğeye odak verir; oklar, Home/End, Esc ve dışarı odaklanma desteklenir. Özel blok görünürlüğü ve korumalı önizleme iframe'leri korunur.
- Favoriler ve genel arama: ortak sol seçenekler/arama, yenilenmiş `ExploreCard` ve çizimli boş ekranlar. API çağrıları, sayfalama, hata ve favori işlemleri korunur.
- Kişisel profil: kimlik/istatistik alanı, tek sayfada profil formu, altında hazırlık ve son değişiklikler. Herkese açık profil: daha belirgin avatar/tanıtım, altında üç sütunlu siteler. Ziyaretçi başlığı, Geri ve dil/tema seçenekleri korunur.
- Yönetim ve sistem ayarları: mevcut özel başlıklar, yetki denetimleri ve formlar korunarak grafit/mavi palet, genişlik ve yüzey uyumu sağlandı.
- Giriş/kayıt, `/editor`, `/code`, arka yüz, modeller ve API sözleşmeleri değiştirilmedi. Yeni CSS sayfa sınıflarıyla sınırlıdır. Palet, `data-surface="app"` ve `.dashboard-header` birlikteliğiyle uygulanır.

## Doğrulama

| Kontrol | Sonuç |
| --- | --- |
| `npm run lint` | Geçti |
| `NODE_OPTIONS=--no-experimental-webstorage npm run test:run` | 295 dosya, 2.712 test geçti |
| `npm run build` | Geçti; mevcut büyük parça uyarısı sürüyor |
| `.venv-linux/bin/python -m pytest -q` | 903 test geçti |
| `node --check frontend/e2e/community-account.spec.js` | Geçti |
| `git diff --check` | Temiz |

Testlerin neyi yakaladığı aşağıdaki geçici bozmalarla kontrol edildi ve üretim kodu geri kondu:

1. Sitelerim'de seçilen `view` değerini gerçek karta aktarmayı kaldırıp sabit `grid` verdik. Liste testi kırıldı; geri yükledikten sonra geçti.
2. Blok kartının Esc kancasını etkisizleştirdik. Klavyeyle açılan menünün kapanma/odağı geri verme testi kırıldı; geri yükledikten sonra geçti.
3. Herkese açık profilde aynı site için bekleyen favori isteği korumasını kaldırdık. Tekrar tıklama sayacı 5 yerine 6 oldu; geri yükledikten sonra geçti.

Yeni ve uyarlanan bileşen testleri kart/liste tercihini, gerçek liste kartını, menü klavyesini, diyalog odağını, dışarıdaki odağın korunmasını, boş sonuçtan filtre temizlemeyi, bekleyen favori işlemini ve başarısız işlemin yeniden denenmesini kapsar. Mevcut sayfa/API testleri normal tam paket içinde geçti.

`e2e/community-account.spec.js`, herkese açık profil favorisi ve blok bildirme işlemlerine yeni menüden ulaşacak şekilde uyarlandı. E2E yerelde çalıştırılmadı; push sonrası HEAD'in Chromium ve Firefox CI işleri kontrol edilir.

## Yerel tarayıcı kontrolü

Gerçek hesap/veri yerine ayrı geçici SQLite veritabanında iki örnek hesap, altı site ve dört blok kullanıldı. Masaüstü, 900 piksel tablet ve 320/390 piksel telefon genişlikleri kontrol edildi. Sitelerim, bloklar, Favoriler, profil ve herkese açık profilde yatay taşma görülmedi. Kart/liste seçimi yenilemeden sonra korundu. Blok menüsü klavyeyle açıldı, Esc ile kapandı ve odak açan düğmeye döndü. Açık/koyu temalar ve sonuçsuz Favoriler aramasından geri dönüş denendi.

İç kontrolde Sitelerim filtrelerinin 768–1023 piksel aralığında dar sol menü içinde çok sütuna bölündüğü görüldü. Çok sütunlu mobil filtre kuralı 767 piksel ve altına çekildi; 900 pikselde 166 piksel genişliğindeki sol menüde dikey seçenekler doğrulandı.

## Claude'a önerilen inceleme

Önce `git pull` ve `DESIGN-REFRESH-2026-10-21.md` dosyasını okuyun. İlk adım `9961ade` ve bu raporu ekleyen ikinci adımı birlikte inceleyin. Sahibi bu görsel yönü onayladı; giriş/kayıt ve editörler kapsam dışıdır. Henüz bağımsız çapraz inceleme yapılmadı.

1. Yeni CSS'nin giriş/kayıt, `/editor`, `/code` ve kullanıcı önizlemelerine taşmadığını doğrudan rota açarak kontrol edin; açık/koyu, azaltılmış hareket ve 320–1280 piksel aralığına bakın.
2. `OwnerSiteCard`, `ExploreCard` ve topluluk menülerinde gerçek klavyeyle açılma, oklar/Home/End, Esc, dışarı tıklama ve odak dönüşünü kontrol edin. Menüden diyaloga geçişi ayrıca deneyin.
3. Sitelerim kart/liste testini `view` aktarımını bozarak tekrar doğrulayın. Depolama engellendiğinde sayfanın açılmasını ve filtre/sıralama/sabitleme davranışını kontrol edin.
4. Topluluk menü testlerini Esc/odak davranışını bozarak doğrulayın. Kendi/başkasının/özel blokları için görünür işlemler ve mevcut API yetkileri korunuyor mu inceleyin.
5. Favoriler, arama ve herkese açık profilde bekleyen/başarısız favori işleminde sayaç ve tekrar deneme testlerini mutasyonla doğrulayın. Yeni menüye uyarlanan E2E seçimlerinin doğru kartı hedeflediğini kontrol edin.
6. Bulguları raporlayın; sahibin istemediği yeni özelliklere veya test planının ertelenmiş özelliklerine geçmeyin.

Canlıya alma yetkisi yoktur; dağıtım yapılmadı.
