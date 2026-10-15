# Test kapsamı özeti — 15 Ekim 2026

Bu belge SiteBuilder'da bugüne kadar neyin, nasıl test edildiğini tek yerde toplar.
Amaç, başka bir model ya da kişinin kapsamı okuyup tartışabilmesidir. Canlı sürüm:
`458c59f`. Çalışma kuralları ve test yazma kuralları `AGENTS.md` dosyasında.

## 1. Otomatik testler

Testler her push'ta GitHub Actions'ta (`.github/workflows/test.yml`) koşar. Sıra şöyle:
lint, Vitest, build; `makemigrations --check`, `migrate`, pytest; son olarak Playwright.
CI yeşil olmadan deploy yapılmaz.

| Katman | Dosya | Test | Araç |
|---|---:|---:|---|
| Frontend unit ve component | 232 | 2216 | Vitest + jsdom + Testing Library |
| Backend API ve model | 45 | 811 | pytest-django (gerçek test veritabanı) |
| Uçtan uca | 18 spec | ~90 | Playwright, Chromium; yalnız CI'da koşar |

### Frontend (alana göre test sayısı)

- **`utils/` (~1170 test, 100 dosya)**
  - HTML düzenleme motoru: `htmlElementEdit`, `htmlPlacement`, `htmlLiveState`,
    `htmlRuntime`, `responsiveHtml`, `htmlMotion`, `htmlTheme`, `htmlRecolor`,
    `htmlQuickEdit`, `htmlInsert`.
  - Dışa aktarma ve yayın: `schemaToFiles`, `componentToHtml`, `exportFiles`, `zip`,
    `publishedPages`, `pageSlug`, `siteAddress`.
  - Kayıt altyapısı: `saveQueue`, `projectSnapshot`, `editorRecovery`, `editorLeave`,
    `sourceRoundTrip`.
  - Güvenlik: `sanitize`, `previewSecurity`.
  - AI: `aiAssistant`, `aiFailover`, `aiTools`, `aiPolicy`, `aiLanguage`, `aiNvidia`,
    `aiWizard`, `aiMultiStep`.
  - Yerel dosyalar: `projectFs`, `localFile`, `localHandles`.
  - Şablonlar: `templateLibrary`, `templateLocalization` (500 şablonun tamamen Türkçe
    olduğunu denetler).
- **`components/` (~530 test)**, bunun ~410'u editörde (63 dosya):
  - Tuval: seçim, zoom, yerleştirme, mobil cihaz.
  - HTML çalışma alanı: yazma, hareket, eski seçim.
  - Paneller: HtmlElementPanel, PropertiesPanel; CodePanel (HTML sayfaları, stres);
    HistoryPanel.
  - AI paneli, ayarlar ve sihirbaz.
  - Paylaşım, alan adı ve notlar; SiteControlCenter; şablon seçici; blok kütüphanesi;
    editör turu.
  - Dashboard, community, auth, preview ve admin bileşenleri.
- **`store/` (131 test)**: editör store aksiyonları, geri alma davranışı, history gesture,
  tuval stres/sweep, telefon sütunu, bölüme palet bırakma, proje store'u.
- **`pages/` (113 test, 26 dosya)**
  - `EditorPage.*`:
    - Kayıt: otomatik kaydın yeniden denenmesi (sunucunun kalıcı reddi dahil), çıkışta
      kayıt, eski sekmeden çıkışta yerel taslak, iki sekme çakışması (409 ve iki
      seçenek), "Kaydet ve çık" ile çakışma.
    - Oturum düşmesi: kurtarma ve canlı kurtarma.
    - AI önizlemesi sırasında kayıt, yayın yarışı, siteler arası geçiş.
    - Pano, iframe gezinme mesajı.
    - Kayıttan sonra yazmanın geri alınabilmesi, iki yığın arasında redo.
    - Projenin dışa ve içe aktarılması, iç içe embed boyutlandırma.
  - Diğer sayfalar: Admin (bloklar, konsol), Community, Explore, Favorites, girişten
    editöre dönüş, 404, Preview güvenliği, Profil, misafirden kayıt, Arama.
- **Koruma testleri** (normal koşunun parçası):
  - `translations.coverage.test.js`: her `t()` metninin Türkçesi var.
  - `darkThemeCoverage.test.js`: yeni sabit renk yok.
  - `symbolButtonNames.test.js`: sembol düğmelerin adı var.
  - `templateLocalization.test.js`: şablonlarda İngilizce kalmamış.

### Backend (dosyaya göre test sayısı)

| Konu | Test |
|---|---:|
| Alan adları, alan adı sunumu ve deploy | 51 + 15 + 5 |
| Doğrulayıcılar | 49 |
| Paylaşılan bloklar | 48 |
| Admin konsolu, admin, admin yolu | 31 + 17 + 4 |
| Moderasyon | 23 |
| Keşfet | 23 |
| Paylaşım ve inceleme bağlantısı | 21 |
| Misafirler, misafir throttle'ı | 21 + 5 |
| Sürümler | 18 |
| Anasayfa sabitleme, yayın kotası | 18 |
| API denetim regresyonları, güvenlik regresyonları | 18 + 9 |
| AI relay, AI politikası | 17 + 13 |
| Görseller (SVG dahil), medya sunumu, yükleme limitleri | 16 + 6 + 4 |
| Yayınlanan sayfalar ve formlar | 14 + 7 |
| Güvenlik başlıkları, erişim politikası | 13 + 10 |
| Site meta, profil, ayarlar, kayıtlı temalar | 13 + 11 + 10 + 10 |
| Hesap kimliği, giriş, kayıt hataları, askıya alınmış giriş | 10 + 7 + 4 + 4 |
| Site revizyonu (iki sekme çakışması) | 5 |
| Diğer: iş akışı uç durumları, site araçları, throttle/proxy, Google, slug vb. | ~30 |

### Uçtan uca (Playwright)

| Spec | Test |
|---|---:|
| `editor-html-sweep` | 14 |
| `code-project` | 8 |
| `editor-html-stress` | 8 |
| `editor-save-stress` | 8 |
| `editor-workflow-sweep` | 8 |
| `html-editor` | 7 |
| `editor-canvas-stress` | 6 |
| `editor-canvas-sweep` | 6 |
| `publish` | 5 |
| `editor-code-stress` | 4 |
| `editor-shell-sweep` | 4 |
| `theme-and-sharing` | 3 |
| `auth` | 2 |
| `form-fields` | 2 |
| `theme-switch` | 2 |
| `box-fit` | 1 |
| `canvas` | 1 |
| `session-recovery` | 1 |

Her koşu `session.setup.js` ile yeni bir hesap açar. Seçiciler rol ve erişilebilir ad
üzerinden yazılır.

## 2. Kod incelemesi (Claude, 11–13 Ekim)

Editör kodu (~45 bin satır) altı geçişte baştan sona okundu. Bulunan her hata, düzeltme
olmadan kırılan bir testle düzeltildi.

1. **Veri bütünlüğü**: kayıt ve otomatik kayıt, yükleme, geri alma, sayfa geçişi.
2. **HTML düzenleme**: telefon stilleri, bağlantılar, öğe kopyalama/taşıma, yerleştirme.
3. **Bileşen tuvali**: bölüm silme, hizalama, kopyalama, Tabs, dışa aktarma.
4. **Güvenlik**: iframe sandbox'ları, `sanitize`, postMessage gönderen denetimi,
   özel CSS'in izolasyonu.
5. **AI**: araçlar, önizleme ve kabul akışı, sağlayıcı yedeği (failover).
6. **Yan paneller**: History, Share, Domain, Notes, Files, CodePanel.

## 3. Tarayıcıda elle yapılan testler

### Claude (uygulama içi tarayıcı, yerel sunucular)

- **13 Ekim**:
  - Düğme-bağlantı içinde link düzenleme, kopyada id'ler, `<style>` üzerinden yukarı
    taşıma, Türkçe id'ler.
  - İç içe embed'in otomatik boyutlanması, iç içe blokta Animasyon sekmesi, iki bölümü
    birden silme.
  - Karma sitede Kaynak çalışma alanı.
- **14 Ekim**:
  - Sayfa ekleme, yeniden adlandırma, silme ve geri alma; kaydedip yeniden yükleme.
  - Mobil görünüm, View modu.
  - Yerel hesapla yayınlama/yayından kaldırma, sayfalar arası bağlantılar.
  - Paletten bölüme snippet bırakma, AI anahtarı olmadan sihirbaz.
- **15 Ekim, cila turları**:
  - Kontrast taraması (WCAG 4.5:1): dashboard, giriş ekranları, herkese açık sayfalar,
    editör panelleri ve diyaloglar; açık ve koyu tema.
  - Esc her menüyü kapatıyor ve odak açan düğmeye dönüyor; klavyeyle palet yerleştirme;
    "içeriğe atla" bağlantıları.
  - Misafir akışları: "Misafir" adı, 3 site sınırı uyarısı, misafire kapalı paylaşım.
  - Kayıt formu alan hataları, profil bağlantısı doğrulama, sekme başlıkları.
- **15 Ekim, kayıt ve oturum**:
  - Misafir oturumu düşünce editör açık kalıyor; uyarı ve proje indirme düğmesi çıkıyor.
  - Uygulanmamış kaynak taslağı kontrol merkezine taşınıyor; kaynakta geri al/yinele.
  - İki sekme üzerine yazma önce yeniden üretildi, sonra düzeltildi; çakışma
    penceresinin iki seçeneği de denendi.
  - Eski sekmeden Geri ile çıkış → yerel taslak → geri yükleme → kayıt.
  - "Kaydet ve çık"ta çakışma → "Benimkini yine de kaydet" → kaydedip çıkıyor.

### ChatGPT (Playwright + Chrome, 15 Ekim)

Ayrıntılar `docs/EDITOR-TEST-2026-10-15.md`, `docs/EDITOR-STRESS-2026-10-15.md` ve
`docs/TEST-FOLLOWUP-2026-10-15.md` içinde.

- **Bileşen tuvali**: içerik, stil, konum ve boyut; zoom altında sürükleme ve resize;
  hizalama/dağıtma; çoklu seçim; kes/kopyala/yapıştır; Undo/Redo; bilgisayar ve mobilin
  birbirinden bağımsızlığı.
- **HTML**: Kaynak/Kaydet/yeniden yükleme, tipografi, mobil stil ve sıfırlama,
  bağlantılar, gezinti menüsü, fırça, animasyon, sıralama/çoğaltma/silme, gerçek
  pointer ile sürükleme.
- **Dosyalar ve kayıt**: iki sayfa modu, klasörler, Türkçe adlar, HTML içe aktarma,
  JSON dışa/içe aktarma, kayıt noktaları (pin, üzerine yazma, geri yükleme), notlar ve
  takvim.
- **Kontrol merkezi**: SEO, gelen kutusu, analitik, inceleme yorumları, hata ve tekrar
  deneme.
- **Editör kabuğu**: 887 px araç çubuğu, açık/koyu tema, Türkçe/İngilizce, kısayollar,
  390 px telefon önizlemesi.
- **Güvenlik denetimi** (`docs/AUDIT-2026-10-15.md`): P1/P2 bulgular düzeltildi.
  - Misafir token'ıyla throttle'ı atlama; upgrade ile CAPTCHA'yı atlama.
  - Misafir site sınırını aşma; yayın kotasını sil-yayınla döngüsüyle aşma.
  - Akan yükleme limitleri, SVG kontrolleri, moderasyon uç durumları.
  - 401'de veri kaybı.

### 22 Eylül raporu (`docs/TEST-RAPORU-2026-09-22.md`)

- 1440 px masaüstü ve 390 px mobilde giriş ve kayıt; arama ve favoriler.
- Menülerde odak dönüşü; site oluşturma.
- 503 sonrası "Tekrar dene".
- HTML yükleme; yüklenen betiğin ana uygulamaya erişemediği doğrulandı (sandbox).
- Yeniden yüklemede taslağın korunması.

## 4. Canlı ortam kontrolleri (salt okunur)

- `/s/<slug>/` CSP sandbox altında sunuluyor (`allow-same-origin` yok); `nosniff`,
  `X-Frame-Options: DENY` ve HSTS var.
- Giriş yapılmadan site, admin ve upgrade uçları 401 dönüyor.
- `deploy.sh` doğrulaması her deploy'da çalışıyor: doğru paket sunuluyor, API 200,
  admin SPA ve 404 sayfası açılıyor.
- Sunucu `458c59f`'de; migration 0027 uygulanmış.
- Her gece veritabanı ve medya yedeği alınıyor (8 gün tutuluyor).

## 5. Test edilmeyenler

- Admin sayfaları gerçek tarayıcıda denenmedi (unit testleri var). Sahibin yerelde
  giriş yapması gerekiyor.
- Dosya seçiciler: dışa aktarma indirmesi, yerel dosya/klasör açma, işletim sistemi
  izninin geri alınması, çıkarılabilir disk.
- Gerçek ücretli AI sağlayıcılarıyla uçtan uca akış. Testlerde AI yanıtları mock'lanıyor;
  anahtarsız kurulum denendi.
- E-posta (SMTP) teslimi, gerçek Google OAuth girişi, gerçek DNS, özel alan adı ve TLS.
- Safari ve Firefox. Gerçek dokunmatik cihazlar (yalnız emüle edilmiş ekranlar denendi).
- Üretimde yük testi (proxy/CDN/PostgreSQL).
- Yedekten geri yüklemenin denenmesi. Ayrıca yedekler sunucunun kendisinde duruyor.
- Python bağımlılıkları için CVE taraması.
- Edit önizlemesinde CSS asset'lerinin data URL'ye dönüşüp kayıtta geri çevrilmesi
  (ChatGPT'nin açık bıraktığı hedef).

## 6. Bilinen açık bulgular

- Elle yazılan tema rengi "Sayfalara uygula" ister; hazır temalar hemen uygulanır.
  Bilinçli tasarım.
- Sandbox önizlemesi konsola "Blocked script execution" yazıyor. Yalnızca gürültü.
- İstemci hata raporlayıcısı yok.
- Canlıda olmayan bir `/assets/*` dosyası 404 yerine `index.html` (200) dönüyor. Caddy
  ayarı gerekiyor.
- `EditorPage.jsx` 3354 satır ve kayıt mantığı tek bileşende. Ayrı bir hook'a
  taşınması planlandı.
