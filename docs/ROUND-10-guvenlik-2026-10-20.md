# Tur 10 — güvenlik ve son genel kontrol — 20 Ekim 2026

Başlangıç: temiz `master`, `19bdd7c`; `git pull --ff-only` günceldi. Tur 9 raporu ve test planı okundu. Önce istenen dokuz commit'in çapraz incelemesi tamamlandı, sonra güvenlik düzeltmelerine geçildi. **Canlıya alınmadı.** Üretim sunucusu/verisi, sahibin açık `editor/567` sekmesi ve gerçek dosyaları kullanılmadı. Planın ertelenmiş özellik bölümü değiştirilmedi.

## 1. Tur 9 çapraz incelemesi — bulgular raporlandı, ilgili davranışlar düzeltilmedi

İncelenenler: `22c37fd`, `f9fb55d`, `06993d4`, `2b5caeb`, `6bb7445`, `1808e0d`, `a26a001`, `ae79799`, `dfba230`. Kendi bozmalarımız `git archive` ile `/tmp` kopyalarında yapıldı; ortak kaynak stash/revert edilmedi. Ayrıntılı raporlar ve uygulanmamış test yamaları `docs/review-evidence/round-10/` içindedir.

| Açık bulgu | Kanıt ve sınır |
| --- | --- |
| **P2: doğrudan kaldırılan kontrolün odağı kurtarılamıyor** | `focusRescue` üst öğeleri kaldırmadan sonra topluyor. Düğme tek başına kaldırılınca parent yok; satırı kaldırılınca ayrılmış iç zincir sağ kalan üst alana ulaşmıyor. Gerçek `LinksEditor` içinde son bağlantının Remove düğmesine Tab/Enter ile basınca `+ Add link` kalırken odak BODY'ye düşüyor. Gerçek React bileşeniyle jsdom ve ayrıca IAB gerçek klavye denemesiyle doğrulandı. |
| **P2: başka editör modunda yeni sayfa odağı kayboluyor** | Gerçek EditorPage/store/PageFilesPanel akışında HTML→tuval ve tuval→HTML yeni sayfaları oluşuyor fakat odak BODY'de kalıyor. Aynı moddaki iki kontrol yeşil. Panel remount'u bekleyen odak bilgisini kaybediyor. İki kırmızı/iki yeşil; bu kanıt jsdom'dur, gerçek browser/ekran okuyucu ölçümü diye sunulmaz. |
| **P3: bilerek bırakılmış eski odağın sonradan geri alınması** | Enabled düğmeden blur sonrası yeni focusin yoksa, daha sonraki disabled→enabled güncellemesi eski odağı geri alıyor. Ek genel DOM probu kırmızı; belirli bir uygulama ekranında gerçek tarayıcı yolu doğrulanmadı. |
| **P3: kurtarma hedefinin uygunluğu eksik** | Disabled+[tabindex] adayı, yeniden etkinleşmiş fakat inert üst alandaki eski kontrol ve üst diyaloğu gizli fallback alanı için uygunluk eksikleri bulundu. Üç ilişkili prob; ayrı üç uygulama hatası sayılmadı. Yanlış focus kararı/çağrısı gösterildi; jsdom'un native inert/hidden davranışını uyguladığı iddia edilmez. |

Bu bulguların üretim kodları değiştirilmedi. Güvenlik fazında `views.py` ve `translations.js` içinde başka alanlara yapılan eklemeler, incelenen SharedComponent kapılarını veya admin terimlerini değiştirmez.

### Testleri kendi bozmalarımızla doğrulama

| Grup | Bazal / geri dönüş | Bozmalar ve sonuç |
| --- | --- | --- |
| URL/admin/silinen yazar | Frontend 51; backend 78 yeşil. Ek pozitiflerle 53/80 yeşil | **20 bozmanın 18'i** mevcut odaklı testlerde yakalandı. Reports ve Report not found Türkçesinin eski bildirim biçimine dönüşü kaçtı; iki pozitif çeviri probu ilgili mutantlarda kırmızı. Güncel metinler doğru. |
| Odak kurtarma | Mevcut 6 ve ek 7 pozitif prob yeşil | **7 bozmanın 4'ü** mevcut testlerde yakalandı. Gizli hedef filtresi, bilinçli yeni odağın kurtarmayı iptal etmesi ve yakın alanı önce seçme bozmalarını ek pozitif problar yakaladı. Yukarıdaki mevcut kusurları gösteren 7 kırmızı ayrıca tutuldu; yedi ayrı hata diye sayılmadı. |
| İnert/kartlar/yeni sayfa | 6 dosya, 55 test yeşil | **11 bozmanın 7'si** yakalandı. Timer cleanup, admin restore açıklaması, blok şikâyeti açıklamaları ve Explore pin açıklaması bozmaları bu odaklı kümede kaçtı. Kod bu noktalarda doğru; yalnız sınırlı test boşluğudur. |

Toplam **38 bağımsız bozmanın 29'u mevcut odaklı paketlerde yakalandı**. Sağ kalanları bütün repo/CI kaçırıyor iddiası yok. İnert kilidini, son iframe load beklemesini, süreyi ve seed bağımlılığını kaldıran/değiştiren bozmalar kırmızı oldu. Kaynakta doğru olan test boşlukları üretim hatası olarak büyütülmedi.

Önceki URL normalleştirme P2'si kapanmış: doğrulanmış tam adres tekrar yalnız pathname'e dönülmüyor; sorgu/fragment ve viewer aktarımı korunuyor. Silinen yazar blokları listeden kalkıyor, detail/use/view/report reddediliyor; moderatör satırı kullanarak eski kopyaları kaldırabiliyor, içerik revision'ı artıyor. **Tur 9 raporundaki liste 404 ifadesi doğru değil:** liste 200 ve boş `results`, ayrıntı 404; bu tutarlı API davranışıdır.

### Gerçek klavye kontrolü

Ayrı, geçici IAB sekmesinde üretim `focusRescue` ve gerçek `LinksEditor` kullanıldı. Yalnız **Tab/Enter** gönderildi; kayıtlar `isTrusted=true`. Disabled→reenable, disabled→replacement, disabled→satır kaldırma ve işlem sırasında bilinçli Tab geçişi beklenen odağı verdi. Önceden disabled aşaması olmadan gerçek LinksEditor satırını kaldırma BODY'ye düştü. Betikle `.click()` veya `.focus()` ile browser sonucu üretilmedi.

Bunlar yalıtılmış gerçek bileşen/DOM denemeleridir; oturum açılmış bütün gelen kutusu akışı veya ekran okuyucu onayı değildir. Fixture kaynakları ve adımlar kalıcı kanıtlarda. Yalnız gerekli Vite sunucusu başlatıldı; geçici sekme, kökteki test HTML'leri ve başlatılan sunucu kapatılıp kaldırıldı.

## 2. Tur 10'da düzeltilen dört hata

| Hata | Düzeltme ve kırmızı kanıt |
| --- | --- |
| **Herkese açık formların ayrı spam bütçesi yoktu** | Site PK + doğrulanmış istemci IP'si için varsayılan **10/dakika**, `DJANGO_THROTTLE_PUBLIC_FORM` ile ayarlanır. API, `/s/` ve özel alan adı aynı bütçeyi paylaşır; token/hesap, URL/host veya slug değişimi bütçeyi sıfırlamaz. Genel anon/user sınırları korunur. Yeni 30 vakadan eski kaynakta 27 kırmızı, 3 yeşil; düzeltmeyle 30 yeşil. |
| **Reddedilen paylaşım isteği özel inceleme bağlantısını açabiliyordu** | Mode yazıldıktan sonra olmayan/uygunsuz kullanıcı veya remove alanı reddediliyordu. Owner'ın `mode=link, add=missing-account` isteği 400 alırken özel bağlantı açılabiliyordu. Bütün alanlar önce doğrulanıyor; mode ve viewer işlemleri owner filtresiyle yeniden kilitlenen site üzerinde tek atomic işlemde uygulanıyor. Depolama hatası da geri alınır. Eski kaynak + yeni 21 vakada 9 kırmızı/12 yeşil; düzeltmeyle 21 yeşil. Başkasının site yetkisini aşma değil, reddedilen owner isteğinin yan etkisidir. |
| **Bozuk viewer URL hash'i sayfayı çökertiyordu** | İlk URL ve sonraki hashchange artık mevcut `previewPageId` ile güvenli ayrıştırılır. Bozuk başlangıç home'a düşer, sonradan bozuk hash seçili sayfayı korur; geçerli encoded id'ler çalışır. Gerçek PreviewPage/API sınırı mock iki test eski kaynakta kırmızı, düzeltmeyle yeşil. XSS veya CSP kaçışı iddiası değildir. |
| **Tur 1'den kalan tam ekran şablon önizlemesi odak almıyordu** | Önizleme adlandırılmış modal, ilk odak, arka galerinin inert olması, Tab/Shift+Tab döngüsü ve Escape ile açana dönüş kazandı. Önizleme arka plan tıklaması artık galerinin kapanmasına yayılmaz. Sandbox gevşetilmedi. Üç yeni test eski kaynakta kırmızı; mevcut altıyla toplam 9 yeşil. |

Model/migration değişmedi. İçerik olmayan paylaşım izni güncellemesi schema/html/revision'ı değiştirmez. Yeni üç sunucu doğrulama cümlesinin Türkçesi eklendi; gerçek `apiError` üzerinden üç kırmızı→yeşil testle kontrol edildi. Bunlar geliştirme sırasında tamamlanan çevirilerdir, beşinci eski hata diye sayılmadı.

### Bağımsız ikinci göz ve geliştirme sırasında kapanan test boşluğu

- Form testleri altı ayrı bozmanın hepsini yakaladı: throttle'ı kaldırma, IP yerine kullanıcı, site kimliğini düşürme, yol anahtarı, ham XFF ve genel sınırları kaldırma. Geri dönüş 30 yeşil.
- Paylaşımda erken mode yazımı, atomic kaldırma ve bool remove bozmaları yakalandı. İlk test sürümü viewer silmedeki site filtresini kaldırmayı kaçırdı. Başka sitede aynı kullanıcıya ait üyelik eklenerek happy-path testi güçlendirildi; yabancı üyeliğin korunması kontrolüyle bu bozma da kırmızı oldu. Son dört bozmanın dördü yakalandı; ana kaynakta 21 test tekrar yeşil. Bu bizim yeni test paketimizin tamamlanan eksikliğidir.
- Şablon önizlemesinde role, Tab trap, inert ve backdrop propagation bozmalarının dördü yakalandı; geri dönüş 9 yeşil.
- URL guard'ını doğrudan decode'a döndürmek yeni iki testi kırdı; geri dönüş 6 yeşil.
- Şablon önizlemesi gerçek IAB'de de Tab ile açıldı: Tab/Tab/Tab/Shift+Tab iki önizleme düğmesinde döndü; Escape ilk Önizle düğmesine döndü, galeri açık kaldı. Bileşen gerçektir; harness CSS'i sadeleştirildiğinden üretim yerleşimi ölçümü sayılmaz. Fareyle iframe içine girildikten sonraki klavye yolu ayrıca denenmedi.

Bu alt incelemeler, Claude'un bu turun değişikliklerini bir sonraki çapraz incelemesinin yerine geçmez.

## 3. Güvenlik kapsamı ve kanıtın sınırları

| Sınır | Doğrulama |
| --- | --- |
| Nesne sahipliği / iç nesnenin doğru siteye bağlanması | Mevcut geniş API/upload kümesi 341 yeşil. Geçici anonim/yabancı/owner matrisi 75 vaka + yayın limitleri 19 = 94 yeşil; reddedilen yazımlarda ilgili altı tablonun satırları korunuyor. Yeni kalıcı testlerde başka siteye ait sürüm restore/overwrite/pin/delete, submission read/delete ve comment resolve kimlikleri 404 ve değişmeyen DB ile sınanıyor. |
| Yükleme sınırları | 5 MB dosya, 6 MB toplam gövde, sınırdaki geçerli dosya, bildirilmeyen uzunluk ve yarım geçici dosyanın temizliği sınandı. Toplam stream sayacını kaldırma eski dokuz testte kaçtı; birden çok dosyada toplam 6 MB'yi aşan yeni test kırmızı oluyor. Üretim sınırı zaten doğruydu; yeni koruma testi eklendi. |
| Büyük yayın / topluluk HTML'i | Mevcut gerçek serializer/endpoint limitleri ve refused-write satırları sınandı. Limitleri gevşeten bozmalar kırmızı oldu. |
| Şema URL/CSS temizliği | 4 dosya/73 bazal ve geri dönüş yeşil. Kontrol karakteri, tehlikeli şema, CSS url(), postMessage kaynağı ve sandbox bozmalarının altısı yakalandı. |
| CSP ve iframe sınırı | Mevcut backend sandbox başlığı ve DOM guardları korundu; `allow-scripts` ile `allow-same-origin` birleşimi eklenmedi. Gerçek tarayıcı etkisi için iki CI senaryosu eklendi. |
| Form alias/kimlik/proxy bütçesi | 30 endpoint testi: anonim/owner/başka kullanıcı × üç yol, farklı site/IP, slug, token rotasyonu, zaman, sahte XFF ve güvenilir proxy, Retry-After, CORS, honeypot, invalid POST ve OPTIONS. Reddedilen yazıda DB korunuyor. |

API denetimindeki 12 üretim bozmasının 11'i seçilen mevcut/yeni testlerde yakalandı; toplam stream bütçesi bozmasını yukarıdaki yeni vaka ayrıca yakaladı. Bu yük/DoS testi, bütün yarışların ispatı veya dış servis sızma testi değildir. Üretim proxy/env ayarları okunmadı; mevcut kaynak politikasının iki test konfigürasyonu sınandı.

## 4. İki yeni gerçek CI tarayıcı senaryosu

`frontend/e2e/security-boundaries.spec.js`:

1. Gerçek site oluşturma/yayınlama, bozuk hash ile `/site/` açma; kullanıcı scriptinin gerçekten çalışması, parent DOM/localStorage/cookie erişiminin engellenmesi; sentetik app verisinin korunması. Gerçek teslim edilen yabancı window mesajı yok sayılır; görüntülenen iframe bağlantısı hedef sayfayı açar.
2. Aynı backend HTTP origin'inde sentetik storage/cookie okunabildiği önce kanıtlanır; sonra `/s/` top-level açılır. HTTP CSP sandbox, çalışan scriptin storage/cookie reddi ve aynı origin'e dönünce sentetik verinin korunması sınanır. Bu vaka iframe niteliğine dayanmaz.

Yalnız sentetik fixture değerleri kullanılır. Anonim ziyaretçiye hesap storageState'i kopyalanmaz. İstek intercept yok; her test kendi sitesini finally'de siler, ayrı context kapanır. Yerel E2E veya browser kurulumu yapılmadı. Syntax/lint ve keşif geçti: **215 vaka / 25 dosya** (107 Chromium + 107 Firefox + ortak setup; CI job başına setup dahil 108).

## 5. Önceki turların açıklarının toplu durumu

| Konu | Durum |
| --- | --- |
| Tur 4'ün yedi bulgusu, Tur 6 bağlantı/sürükleme bulguları | Önceki düzeltme raporları ve sonraki çapraz incelemelerle kapandı. URL'nin son normalleştirme düzeltmesi bu tur bağımsız bozmalarla da geçti. |
| Silinen hesabın topluluk blokları | Sahibin kararı Tur 9'da uygulandı; bu tur kapılar ve moderasyon amaçlı satır/kopya koruması doğrulandı. |
| Firefox `/code` Edit kararsızlığı | Tur 9 inert kilidi için anlamlı bozmalar yakalandı. Son gerçek iki browser sonucu bu turun HEAD CI'ında ayrıca kontrol edilir. |
| Tur 5 herkese açık form sınırı | **Bu tur kapandı**, üç yol tek site+IP bütçesinde. |
| Tuvalde mevcut bloğu klavyeyle seçme | **Açık, sahibin seçim modeli kararı gerekiyor.** Yeni klavye/listbox/blok listesi özelliği yapılmadı. |
| `/code` Edit satır içi CSS görselleri | **P3 açık ödünleşim.** Kaynak dosyanın URL'leri korunuyor; View data URL ile doğru, Edit'te yerel arka plan görünmeyebilir. İki mevcut kaynak-koruma testi guard bozulunca kırmızı. Yeni overlay/bundler veya kayıtta URL dönüşümü yapılmadı. |
| Tur 1 tam ekran şablon önizlemesi | **Bu tur odak/semantik/Tab ve backdrop düzeltmesi yapıldı**; unit, bağımsız bozma ve gerçek klavye kanıtı var. |
| Tur 1 klavyeyle blok yerleştirme duyurusu | Açık tutuldu; Canvas'ta yerleştirmeye özgü canlı bölge kanıtı bulunmadı. Kaydet durumunun aria-live alanı bunun yerine geçmez. Gerçek ekran okuyucu denenmedi. |
| Tur 1 geniş palet öğesinin merkezlenmesi, undo'da seçimin kalkması, Canlı Kod örtüşmesi | Eski küçük gözlemler/ürün tercihi olarak açık; bu tur yeniden gerçek yerleşim ölçümü yapılmadı, kapanmış sayılmadı. Canlı Kod kapanabiliyor ve gösterim süresi seçilebiliyor. |
| Tur 3 Türkçe sen geçişi | Sonraki Türkçe düzenlemeleri ve formal guard mevcut; tam paket geçti. Dilbilimsel tüm cümlelerin tek tek insan incelemesi iddia edilmez. |
| Tur 3 reddedilen kayıttan sonraki ek istek | Zararsız eski gözlem; bu tur bağımsız tekrar üretim yapılmadı, kapandı diye sunulmadı. |
| Tur 5 SEO başlığının yalnız paylaşım kartlarını değiştirmesi | Adlandırma veya title fallback kararı açık; mevcut davranış değiştirilmedi. |
| Tur 9'un bu tur bulunan odak kusurları ve test boşlukları | Bölüm 1'de açık; yazara inceleme için bırakıldı. |
| Canlı site yalnız Yayınla/Güncelle ile değişsin | Plan sonundaki **ertelenmiş özellik** aynen korunuyor. On tur sonunda sahibe hatırlatılır; bu çalışmada uygulanmadı. |

## 6. Tam kontroller ve teslim

- `npm run lint`: geçti.
- Tam Vitest: **291 dosya / 2654 test**, 119,17 saniye. Node 26 için `NODE_OPTIONS=--no-experimental-webstorage`, 4 worker.
- `npm run build`: geçti; mevcut büyük chunk uyarısı dışında hata yok.
- Tam pytest: **903 test**, 186,21 saniye; 687 staticfiles uyarısı. Paylaşımın yabancı üyelik assertion'ı güçlendirildikten sonra ilgili 21 test tekrar yeşil.
- Model değişmedi, migration eklenmedi. `git diff --check` temiz.
- Yeni normal pakette **8 frontend + 51 backend vakası**, iki çift tarayıcı E2E senaryosu var. Çapraz incelemenin bilinen kırmızıları normal pakete eklenmedi.
- Commit ve push sahibin Git kimliğiyle, ajan trailer'ı olmadan master'a yapılır. Son HEAD'in `tests` CI'ı tamamlanmadan teslim tamamlanmış sayılmaz; CI bağlantısı ve gerçek sonuç teslim mesajında belirtilir. Önceki `19bdd7c` yeşili bu turun kanıtı değildir.

Kalıcı tekrar üretimler `docs/review-evidence/round-10/README.md` içindedir. `/tmp/sitebuilder-round10-*` logları ayrıntılı yerel kanıttır; ham credential/CI çıktısı rapora kopyalanmadı. Gerçek ekran okuyucu, fiziksel telefon/dokunma, OS dosya pencereleri, gerçek SMTP/Google girişi ve DNS/TLS uçtan uca bu tur denenmedi. Sıfır hata garantisi verilmez; açıklar ve sınırlar yukarıda ayrı tutuldu.
