# PC'de eski arayüz, telefon ve tablette yeni arayüz (Claude, 30 Ekim 2026)

Sahibin isteği: "Mobil için yeni arayüz dursun, PC için eski arayüzden devam edelim, ama biraz daha iyisi." Sahip üç karar verdi:

- Sınır 1024 px. Altında (telefon ve tablet) yeni arayüz, üstünde eski arayüz.
- PC eski renklerini kullanır. Telefon grafit/mavi renklerde kalır.
- Yeni tasarımdan PC'ye yalnızca ana sayfadaki "Topluluktan öne çıkan" bölümü taşınır. Kartlardaki ⋯ menüsü ve Sitelerim'deki kart/liste seçimi PC'ye taşınmaz.

## Nasıl yapıldı

- **Kanca:** `utils/useCompactDashboard.js`, `(min-width: 1024px)` sorusunun tersini verir. Test ortamı her medya sorusuna "hayır" dediği için mevcut testler yeni (kompakt) yüzü görür. PC testleri `test/desktopViewport.js` ile PC'yi taklit eder.
- **Hangi görünümün çizileceğine işaretleme (markup) karar verir.** Her sayfa aynı durumu ve aynı işleyicileri kullanır, `if (!compact)` ile eski işaretlemeyi döndürür. Eski işaretleme `6c5e7f9` sürümünden alındı.
- **CSS medya sorgusuna değil sınıfa bağlı.** Bu yüzden iki yüz hiçbir genişlikte karışmaz:
  - Yeni palet `:has(.dashboard-compact)` altında. `dashboard-theme.css`, eskiden `:has(.dashboard-header)` kullanıyordu.
  - Yeni üst menü stilleri `.dashboard-compact` altında (`dashboard-navigation.css`).
  - Yeni sayfa stilleri zaten kendi sınıflarına bağlıydı.
- **Kompakt sınıfı ayrıca şu yerlerde:** herkese açık profilin kompakt başlığı, yönetim ve sistem ayarları sayfalarının kompakt başlığı. Bu iki yönetim sayfası PC'de eski sınıflarına döndü.
- **Kartlar:**
  - `OwnerSiteCard` iki bileşene ayrıldı. Menü davranışı ortak bir `useActionsMenu` kancasında: ilk öğeye odak, oklar, Home/End, Esc, Tab ile çıkınca kapanma. PC kartı eski görünümünde, ama bu klavye davranışını da aldı.
  - `ExploreCard`: sayfalar `redesigned` yalnızca kompaktta veriyor.
  - Blok kartı: işlem alanı kompaktta ⋯ menüsü, PC'de eski görünür düğmeler.
- **Üst menü:** PC'de eski menü (arama alanı açık, 1280 px altında sekmeler ⋯ menüsünde). Menüleri artık ortak Esc yığınında; sayfa menüsü dışarı tıklanınca da kapanıyor.

## "Biraz daha iyisi" (PC)

- Ana sayfada "Topluluktan öne çıkan" bölümü, eski tasarımın sınıflarıyla. Tek adlandırılmış bağlantısı var; önizleme yalnızca fare kısayolu.
- Kategori seçince filtre satırı artık yapışkan üst menünün altında duruyor; eskiden altında kalıyordu.
- PC proje kartı menüsü klavyeyle tam kullanılabilir.
- Arama filtrelerinde sayı ile etiket arası boşluk var. Ekran okuyucu artık "Sites1" değil "Sites 1" okuyor (iki yüzde de).
- Herkese açık profildeki harf avatarı `aria-hidden`.

## Testler

- **PC sürümleri:** `ExplorePage`, `CommunityPage`, `FavoritesPage` ve `PublicProfilePage` için `6c5e7f9` sürümündeki testler `*.desktop.test.jsx` olarak geri geldi.
- **Yeni testler:**
  - `SitesPage.desktop.test.jsx`;
  - `DashboardHeader.test.jsx` içinde "the desktop header";
  - arama ve profil formu için PC testleri;
  - öne çıkan site testi.
- **Bozmalar:** 11 bozma denendi, 11'i de yakalandı:
  - yüzlerin yer değiştirmesi;
  - PC menüsünde Esc yığınının kaldırılması;
  - Sitelerim, Favoriler, herkese açık profil, profil ve arama PC dallarının kaldırılması;
  - PC kart menüsünde okların kaldırılması;
  - öne çıkan bölümün kaldırılması;
  - PC'de yeni kartların kullanılması;
  - blok kartlarının kompakta çevrilmesi.
- **E2E:** `community-account.spec.js` PC akışlarına geri döndü: görünür yıldız, görünür "Bildir", açık arama alanı. ChatGPT'nin telefon testi artık baştan 390 px'te çalışıyor; CI 1440 px'te çalışıyor.

## Tarayıcıda

Ekran tarayıcı betiği hiç bulgu vermedi: taşma, adsız kontrol ve kontrast temiz. Kontrol edilen sayfalar:

- Keşfet, Sitelerim, Bloklar, Favoriler, arama;
- profil, herkese açık profil.

Kontrol edilen genişlik ve temalar:

- 1366 (koyu ve açık), 1024, 1023, 375 (açık).

Diğer kontroller:

- 1024'te PC, 1023'te kompakt görünüm geliyor; pencere boyutu değişince sayfa yenilenmeden geçiyor.
- Kompakt yüz yeni paleti, PC eski paleti alıyor.
- PC'de ⋯ sayfa menüsü (1100 px) Esc ile kapanıyor ve odak düğmeye dönüyor.

## İnceleme için öneriler

1. Desktop dallarının eski davranışı birebir koruyup korumadığını `6c5e7f9` ile karşılaştırın.
2. `dashboard-navigation.css` ve `dashboard-theme.css` kapsam değişikliğini 1023 ve 1024 px'te, iki temada kontrol edin.
3. `useActionsMenu` kancasını iki kartta bozmalarla deneyin.
