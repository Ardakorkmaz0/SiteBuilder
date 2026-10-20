# Tur 10 bulgularına yanıt ve on turun kapanışı (Claude, 20 Ekim 2026)

Başlangıç `7f34b74`. Canlıya alınmadı; canlıdaki sürüm `5a10346`. Yerel test hesabı ve sitesi
iş bitince silindi.

## 1. 9. tur kodumdaki bulgular

| Bulgu | Karar | Commit ve test |
| --- | --- | --- |
| P2: doğrudan kaldırılan kontrol (bağlantı listesindeki "Kaldır") odağı `body`'ye düşürüyordu | **Doğru, düzeltildi.** Kontrolün durduğu yer artık odak aldığı anda kaydediliyor; kaldırma anında üst öğeler zaten gitmiş olabiliyordu. | `cfb9af8`. Testler: doğrudan değiştirme; satırın tamamen kaldırılması; gerçek `LinksEditor` ile Tab ve Enter. Gerçek Chrome'da da doğrulandı: son bağlantı kaldırılınca odak "+ Bağlantı ekle"ye geçiyor. |
| P2: öbür editör modundaki yeni sayfa odak almıyordu | **Doğru, düzeltildi.** Sayfa listesi her modda ayrı bir panel; yeni panel kurulunca bekleyen odak kayboluyordu. Odaklanılacak sayfa artık panelin dışında tutuluyor. | `05c7b79`. `EditorPage.newPageFocus.test.jsx` dört mod geçişini kapsıyor; ikisi düzeltmeden önce kırmızıydı. |
| P3: bilerek bırakılan odak sonradan geri alınıyordu | **Doğru, düzeltildi.** Hâlâ kullanılabilir bir kontrolden odağın bilerek bırakılması, o kontrolü unutturuyor. | `cfb9af8`. Not: ChatGPT'nin probu `blur` ve `disabled`'ı aynı anda yapıyor. jsdom'da bu, tarayıcının kendi odak bırakma sırasından ayırt edilemiyor; bu yüzden o prob hâlâ kırmızı. Gerçekçi vaka (önce bırak, sonra ayrı bir anda güncelle) testte yeşil. ChatGPT'nin diğer 13 probu yeni kodda yeşil. |
| P3: hedef uygunluğu | **Doğru, düzeltildi.** Devre dışı `[tabindex]` adayları, `inert` alana düşmüş eski kontrol ve yukarıda `display:none` olan bir alan artık eleniyor. Odak verilemezse kurtarma sürüyor. | `cfb9af8`, uygunluk testleri |
| Test boşlukları | **Kapatıldı.** "Geri koy" düğmesinin, blok şikâyeti kartının ve Keşfet'teki sabitleme düğmesinin açıklamaları, ayrıca "Şikâyetler" ve "Şikâyet bulunamadı" metinleri artık testli. ChatGPT'nin kaçan beş bozmasının beşi de yakalanıyor. | `537e776` |
| Eşdeğer bozma | Ölçüm zaman aşımında temizleme işlevinin kaldırılması zararsız. Zamanlayıcı geç çalışsa bile güncelleme işlevi aynı belgenin okumasını korur. | — |
| Rapor hatası | **Doğru.** 9. tur raporunda "liste 404" yazıyordu; liste aslında 200 ve boş dönüyor, ayrıntı 404 veriyor. Rapor düzeltildi. | bu commit |

## 2. ChatGPT'nin 10. turunun çapraz incelemesi (`7f34b74`)

**Engel olacak bir bulgu yok.** Geçici bir worktree'de denediğim bozmalardan altısı yakalandı:

- form bütçesini site yerine adrese bağlamak;
- OPTIONS isteklerini de saymak;
- izleyici eklemeyi kilidin dışına çıkarmak;
- görüntüleyicide `#` değerini doğrudan çözmek;
- önizleme arka plan tıklamasının dışarı yayılması;
- önizleme açıkken galerinin `inert` olmaması.

Biri hayatta kaldı, biri uygulanamadı:

- `remove=0`'ın kabul edilmesi hayatta kaldı. 0 kimlikli kullanıcı olmadığı için silme zaten hiçbir şey yapmıyor; yalnızca küçük bir test boşluğu.
- Sahiplik filtresi bozması uygulanamadı, çünkü aynı desen dosyada iki yerde geçiyor.

İncelediklerim:

- **Form sınırı:** bütçe site kimliği ve doğrulanmış IP ile tutuluyor; API, `/s/` ve özel alan adı aynı bütçeyi paylaşıyor. Genel sınırlar korunuyor. Olmayan bir site için anahtar oluşmuyor, view 404 dönüyor.
- **Paylaşım:** tüm alanlar önce doğrulanıyor, sonra değişiklik sahibin satırı kilitlenerek tek bir işlemde uygulanıyor. İçerik alanı değişmediği için revizyon artmıyor; bu doğru.
- **Güvenlik E2E testi:** kullanıcı betiğinin gerçekten çalıştığını, depolama, çerez ve üst belgeye erişimin `SecurityError` ile engellendiğini, CSP başlığını ve yabancı bir mesajın reddedildiğini ölçüyor. Yan bir sonuç: Playwright sandbox'lı iframe içine tıklayabiliyor. Önceki turlardaki tıklama sorunu yalnızca Claude'un tarayıcı bölmesine özgüymüş.

**P3 bulgu.** Tam ekran şablon önizlemesinde iframe'e `tabIndex={-1}` verilmiş. Bu Tab döngüsünü sadeleştiriyor; ama klavye kullanan biri önizlemeye odaklanıp sayfayı kaydıramıyor, yalnızca ilk ekranı görebiliyor. Önerim: iframe Tab sırasına alınsın, döngü de onu kapsasın.

## 3. On turun kapanışı: sahibe kalan konular

Testler bitti. Sahibin kararları için üç konu var.

- **Ertelenen özellik:** canlı site yalnızca "Yayınla" ile değişsin. Bugün yayındaki bir sitede, otomatik kayıt dahil her kayıt canlı sayfaları hemen güncelliyor. Plan bunu testlerden sonraya bırakmıştı; şimdi sırası geldi.
- **Karar bekleyen:** tuvaldeki bloklar klavyeyle seçilemiyor. Çözüm bir klavye seçim modeli olur (Tab ile bloklar, Enter ile seçme, bir blok listesi). Bu yeni bir özellik sayılır.
- **Karar bekleyen:** Kontrol merkezindeki "SEO başlığı" yalnızca paylaşım kartlarına yazılıyor. Ya adı "Paylaşım başlığı" olsun, ya da kendi SEO başlığı olmayan sayfalarda `<title>` olarak kullanılsın.

Küçük açıklar:

- **`/code` Edit modu:** satır içi CSS görselleri görünmüyor (P3 ödünleşim).
- **Şablon önizlemesi:** iframe'in Tab sırası (P3, yukarıda).
- **Eski gözlemler:** 1. turdan kalan küçük yerleşim gözlemleri; ChatGPT'nin 10. tur raporunda listeli.

## Kontroller

- Lint geçti.
- Frontend: 2676 test (293 dosya).
- Build geçti.
- Backend: 903 test.
- `makemigrations --check` değişiklik bulmadı.
- `git diff --check` temiz.
