# Editör dışı tasarım yenilemesi — 21 Ekim 2026

## Sahibin seçtiği yön

36 şıklı sorunun yanıtlarıyla belirlenmiştir. Bu belge sonraki adımlar için karar kaydıdır.

- Editör dışındaki görünüm yeniden tasarlanacak. Giriş ve kayıt ekranlarına dokunulmayacak; `/editor` ve `/code` kapsam dışında.
- Ciddi, net ve teknik bir görünüm; keskin başlıklar, dengeli boşluklar, orta boy öğeler.
- Grafit/mavi palet. Koyu temada siyaha yakın grafit ve belirgin yüzeyler; açık temada çok hafif mavi-gri zemin ve beyaz kartlar. İki temaya eşit özen.
- Mavi yalnızca önemli düğme ve bağlantılarda. Seçili gezinme öğeleri nötr kalacak.
- Hafif yuvarlatılmış köşeler, yumuşak gölgeler ve yükselme hissi.
- Üstte ana menü, solda sayfaya özel seçenekler. İçerik ekranın çoğunu kullanacak.
- Ana sayfa topluluk/keşif odaklı. Kısa başlık, küçük oluşturma alanı ve öne çıkan bir topluluk sitesi.
- Genel arama üst menüde simgeden açılacak. Kategoriler görünür, ayrıntılar kapalı başlayacak.
- Site kartlarında önizleme/bilgi dengesi; masaüstünde üç sütun. Site adı, kısa bağlam ve favori sayısı; oluşturucu daha küçük.
- Ana işlem görünür; diğer işlemler üç nokta menüsünde. Önemli işlemlerde yazı, yardımcı işlemlerde erişilebilir adlı simgeler.
- Mobilde üstte hesap ve arama; altta yalnızca Keşfet, Sitelerim ve Favoriler.
- Belirgin kart tepkileri, sayfa geçişleri ve içerik girişleri; azaltılmış hareket tercihi korunacak.
- Ayrı alt bilgi alanı istenmiyor; gerekli bağlantılar menüde kalacak.
- Beğenilen referanslar: GitHub, X, chess.com, Spotify, Brave, Steam. Bunlar yön belirtir; birebir kopya talebi değildir.

## Uygulama sırası ve durum

Sahibin 36. yanıtı: önce ana sayfa ve gezinmeyi uygulayıp göster, sonra diğer sayfalar.

| Adım | Durum |
| --- | --- |
| Ana sayfa, ortak üst menü, mobil alt menü ve arama | Uygulandı, sahibi beğendi; 9961ade, CI yeşil |
| Sitelerim: kart/liste seçimi | Uygulandı; tercih hatırlanır, filtreler solda |
| Profil ayarları: tek sayfada başlıklarla ayrılan bölümler | Uygulandı |
| Herkese açık profil: belirgin avatar/tanıtım, altında siteler | Uygulandı |
| Topluluk ve kişisel bloklar: dengeli üç sütunlu kartlar | Uygulandı; ikincil işlemler menüde |
| Favoriler, arama ve boş ekranlar | Ortak düzene taşındı |
| Yönetim ve sistem ayarları | Mevcut işlevler korunarak palet/yüzey uyumu sağlandı |
| Giriş/kayıt ve editörler | Değiştirilmeyecek |

## İlk adımın kapsamı

Ana sayfa kişisel istatistiklerin ağırlığından çıkarıldı; keşif, mevcut sıralamadan ilk topluluk sitesi ve üç sütunlu kartlar öne alındı. Yeni site oluşturma ve yerel proje açma korundu; son kişisel projeye tek adımda dönüş küçük bir bölümde kaldı. Kategori ayrıntıları mevcut süzme davranışını açıklar ve tüm kategorilere dönüş verir; yeni sunucu filtresi eklenmedi.

Ortak menüde arama simgeden açılır, alan odağı alır ve Esc ile kapatıldığında odak geri döner. Mobil üçlü menünün dışındaki Bloklar, Profil, yönetici bağlantıları, dil/tema ve rehber açılır menülerden erişilebilir. Misafir hesap uyarıları ve çıkış onayı korundu.

İlk adımda yeni kart görünümü `redesigned` prop'u ile yalnızca ana sayfada kullanıldı. İkinci adımda Favoriler, arama ve herkese açık profil de aynı görünüme taşındı. Feed API'si açıklama göndermediğinden kategori ve etiketler kısa bağlam olarak kullanılır; açıklama uydurulmadı ve API değiştirilmedi.

Palet `:root[data-surface="app"]:has(.dashboard-header)` altında tanımlandı. Böylece portallanan diyaloglar aynı paleti alır, DashboardHeader bulunmayan giriş/kayıt ve editör rotaları mevcut renklerini korur. İçerik önizlemeleri korumalı iframe'lerinde kalır.

## Doğrulama ve inceleme notları

- Ön yüz: lint, 295 dosyada 2.704 test ve üretim derlemesi geçti; `git diff --check` temiz.
- Arka yüz: 903 pytest testi geçti; arka yüz kodu/model/veri şeması değiştirilmedi.
- Yeni bileşen testleri: aramanın açılması/odağı/Esc, dışarıdaki odağın korunması, üçlü mobil menü; kart işlem menüsü, klavye gezinmesi, yetkili sabitleme, bekleyen işlemler ve geri dönen odak.
- Mevcut sayfa testleri yeni işlem menüsüne uyarlandı; hesap önbelleği, favori hata/yeniden deneme, misafir sınırı, karşılama ve son projeye dönüş kontrolleri korundu.
- Mutasyonlar: arama odak etkisini kaldırma ve kart Esc kancasını etkisizleştirme testleri kırdı; üretim kodları geri kondu.
- İncelemede sabitlenen kategori panelinin kaydırma hedefi olamayacağı görüldü. Yeni test yanlış hedefte 608, doğru sonuç başlığında 776 konumunu ayırarak önce kırıldı, düzeltmeden sonra geçti. Başlık sabit üst menünün altında konumlandırılır.
- Kart giriş animasyonunun son transform değerini tutarak hover yükselmesini engellemesi düzeltildi. Koyu dolu düğmenin hover rengi beyaz küçük metin için yeterli kontrasta çekildi.
- Yerel tarayıcıda 320, 390, 1024 ve 1280 piksel kontrol edildi; yatay taşma görülmedi. Açık/koyu tema, arama/Esc, kart menüsü ve mobil bağlantılar denendi. Yalnızca geçici SQLite veritabanı ve altı örnek site kullanıldı.
- `community-account.spec.js` yeni menü ve arama adımlarına uyarlandı; gerçek tarayıcıda arama odağı/Esc ve mobil gezinmeyi doğrulayan senaryo eklendi. Yerel E2E çalıştırılmadı. 9961ade için CI lint/Vitest/build, pytest ve iki tarayıcıda 109'ar E2E testini başarıyla tamamladı: https://github.com/Ardakorkmaz0/SiteBuilder/actions/runs/39510896965.

## İkinci adım

Sahibi ilk görünümü beğenip Sitelerim ve Bloklarım dahil diğer sayfalara uygulanmasını istedi. Kapsam, doğrulama ve Claude için inceleme başlıkları `docs/DESIGN-PHASE-02-2026-10-21.md` dosyasındadır. İkinci adım yerelde 2.712 ön yüz ve 903 arka yüz testiyle doğrulandı. Bağımsız Claude incelemesi henüz yapılmadı.

Bu değişiklik büyük olduğundan AGENTS.md uyarınca Claude'un bağımsız çapraz incelemesine sunulmalıdır. Özellikle yeni kart ve arama testlerini mutasyonla, CSS kapsamını giriş/kayıt ve editör rotalarında kontrol etmesi beklenir. Canlıya alma yetkisi verilmedi; dağıtım yapılmaz.
