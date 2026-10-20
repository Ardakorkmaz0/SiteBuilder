# Tur 9 — Telefon, dokunmatik ve erişilebilirlik (Claude, 20 Ekim 2026)

Başlangıç `dbe9155`. Sıra şöyleydi:

1. ChatGPT'nin 7. tur kodumda bulduğu sorunlar;
2. 8. turun çapraz incelemesi;
3. sahibin kararı (silinen hesabın blokları);
4. Firefox'taki kararsız test;
5. 9. tur.

Canlıya alınmadı. Yerel test hesabı ve sitesi tur sonunda silindi.

## 1. 7. tur kodumdaki bulgular (ChatGPT'nin incelemesi)

| Bulgu | Karar | Commit ve test |
| --- | --- | --- |
| P2: `/safe/..//elsewhere/` gibi bir yol, ayrıştırılınca `//elsewhere` oluyor ve göreli bağlantı olarak yazılınca başka siteye gidiyordu | **Doğru, düzeltildi.** Bağlantıya artık kontrol edilmiş tam adres yazılıyor. | `22c37fd`. Testler: üç yol vakası; sorgu ve parçanın korunması; diskten açılmış bir sayfada izlenmemesi; görüntüleyicide `href`'in bir kez iletilmesi. |
| P3: boş "Tümü" listesi hâlâ "Bildirim yok" diyordu | **Doğru, düzeltildi.** Admin tarafında kalan üç "bildirim" metni de "şikâyet" yapıldı. Kullanıcı tarafındaki "Bu siteyi bildir" fiil olarak bilerek bırakıldı. | `f9fb55d` |
| Test boşlukları: günlük görünümü, rozet, gerekçe eşlemesi, protokol kontrolü, görüntüleyiciye `href` iletimi | **Kapatıldı.** ChatGPT'nin kaçan yedi bozmasının yedisi de artık yakalanıyor. | `22c37fd`, `f9fb55d` |

## 2. ChatGPT'nin 8. turunun çapraz incelemesi (`d0dab99`, `dbe9155`)

**Engel olacak bir bulgu yok.** Testler geçici bir worktree'de 11 bozmayla denendi; 10'u yakalandı:

- ZIP yedeğinin üretilmiş şemayı kullanması;
- data URL'den `#` parçasının düşmesi;
- `base` etiketinin yok sayılması;
- base yolunun kodlanmaması;
- Edit modunda satır içi CSS'in yeniden data URL'e çevrilmesi;
- iç klasördeki `index`'in kök sayfanın önüne geçmesi;
- sarmalanmış projedeki HTML'in kaybolması;
- eski biçimdeki sayfa modunun ayarlanmaması;
- bağlı sayfanın modunun kontrol edilmemesi;
- boşaltılmış belgenin diske yazılmaması.

Hayatta kalan tek bozma (dış base kontrolünü kaldırmak) **eşdeğer bir bozma**: dış adresin kökeni farklı olduğu için sonraki kontrol onu zaten reddediyor.

İncelemede iki gözlem daha var:
- **Boş belge yazımı:** bağlı HTML sayfasının belgesi yoksa diske boş metin yazılıyor. Bu, editörde görünenle aynı olduğu için bulgu sayılmadı.
- **P3 ödünleşim:** `/code` Edit modunda satır içi CSS'teki görseller artık data URL'e çevrilmiyor. Bu kaynak dosyayı koruyor, ama Edit önizlemesinde satır içi arka plan görselleri görünmüyor. İstenirse, enjekte edilen değerler kayıtta geri alınacak biçimde işaretlenip yeniden gösterilebilir.

## 3. Sahibin kararı: silinen hesabın topluluk blokları (`06993d4`, `2b5caeb`)

- **Herkese açık uçlar:** blok listesi, ayrıntı, görüntülenme sayacı ve "kullan" artık etkin bir yazar istiyor. Yazarı silinmiş blok kütüphaneden kalkıyor. Var olan sahipsiz bloklar da hemen kapsanıyor; migration gerekmedi.
- **Satır korunuyor:** satır yazarsız kalıyor, böylece moderatör başka sitelere alınmış kopyaları gerektiğinde yine silebiliyor.
- **Admin listesi:** bu bloklarda "Yazarı silinmiş, kütüphanede değil" rozeti ve "Silinmiş hesap" yazısı var.
- **Testler:** backend'de üç vaka. Yazar varken blok listede ve ayrıntıda görünüyor. Silinince anonim liste ve ayrıntı 404 veriyor; sayaç ve `use_count` artmıyor; başka kullanıcının "kullan" isteği 404 alıyor ve hedef sitenin şeması değişmiyor. Moderatör listesinde satır duruyor. Eski kuralı sabitleyen bir regresyon testi yeni kurala göre güncellendi.

## 4. Firefox'taki kararsız test: gerçek veri kaybıydı (`6bb7445`)

`code-project.spec.js:185`, düzenleme alanına yazıp hemen cihaz değiştiriyordu. Gerçek tarayıcıda ölçüldü:

- **Nasıl olduğu:** `/code` sayfasında Edit'e girince iframe yükleniyor (yaklaşık 30 ms). Ekran dışında alınan sayfa ölçümü yaklaşık 400 ms'de gelince belge `data-pwb-state` ile yeniden yükleniyor. Bu arada yazılan metin kayboluyordu.
- **Neden `/code` sayfasında:** orada her Edit girişinde belge yeniden ölçülüyor. Ana editörde bu yalnızca geri alma ya da cihaz değişiminden sonra oluyor; ölçümde yeniden yükleme görülmedi.
- **Düzeltme:** ölçüm gelip iframe son belgesini yükleyene kadar düzenleme alanı `inert` (ve `aria-busy`) oluyor. Gelmeyen bir ölçümden 3 saniye sonra vazgeçiliyor, yani alan hiçbir zaman kilitli kalmıyor.
- **Doğrulama:** gerçek Chrome'da alan 27–393 ms arasında kilitli kaldı, ikinci yüklemeden hemen sonra açıldı; klavyeyle yazılan metin cihaz değişiminden sonra da duruyor. CI'da Firefox 106/106 geçti ve tekrar deneme olmadı; bu test ilk denemede 3,4 saniyede geçti.
- **Testler:** `HtmlWorkspace.test.jsx` içinde iki vaka: kilit ve açılma, ölçüm gelmeyince vazgeçme. İkisi de düzeltmeden önce kırmızıydı.

## 5. Tur 9

### Telefon genişliği (375×812, dokunmatik taklidi)

Ana sayfa, profil, favoriler, topluluk, bir site sayfası, herkese açık profil, editör, yeni site sihirbazı ve topluluk önizlemesi otomatik olarak tarandı. Hepsinde şu sonuç çıktı:
- yatay taşma yok;
- adı olmayan kontrol yok;
- `alt` metni olmayan görsel yok;
- 24 pikselden küçük dokunma hedefi yok; tek istisna odaklanınca görünen "İçeriğe geç" bağlantısı.

Telefonda editör bilerek yalnızca önizleme sunuyor. Yayınlanan sitenin telefon menüsü 5. turda denenmişti.

### Kontrast (açık ve koyu tema)

Editör ve Kontrol merkezinin altı sekmesinde düşük kontrastlı metin yok. Bulunan iki uyarı gerçek sorun değil:
- devre dışı bir düğme (WCAG devre dışı kontrolleri kontrast şartından muaf tutar);
- gradyan arka planlı logo (ölçüm aracının yanlış alarmı).

Koyu temada gelen kutusu kartlarının sabit renkleri koyu karşılıklarına eşleniyor.

### Bulunan ve düzeltilen

- **`1808e0d`: işlem sırasında devre dışı kalan düğme klavyeyi düşürüyordu.**
  - Örneğin gelen kutusunda "Okundu işaretle"ye klavyeyle basınca odak modal diyalogun dışına, sayfanın başına düşüyordu. Tarayıcı, odaklı bir kontrol devre dışı kalınca odağı bırakır. Aynı desen 19 dosyada var (admin işlemleri, paylaşım, ayarlar, geçmiş…).
  - Uygulama genelinde tek bir çözüm eklendi: `ui/focusRescue.js`. Odaklı kontrol devre dışı kalır ya da DOM'dan kalkarsa:
    - kontrol yeniden etkinleşince odağı ona veriyor;
    - kontrol değiştirildiyse, hâlâ duran en yakın üst öğedeki ilk kontrole veriyor.
  - Kullanıcının odağı bilerek başka yere taşıdığı durumlara karışmıyor. Chrome odağı bir sonraki çizimde aldığı için, aday devre dışı kalma anında kaydediliyor.
  - Gerçek Chrome'da: okundu/okunmadı art arda iki kez klavyeyle değiştirildi, odak düğmede kaldı. Son mesaj silinince odak diyalogun "Kapat" düğmesine geçti.
  - Altı test var. Chrome sırasını taklit eden test, eski zamanlamaya dönülünce kırmızı oluyor.
- **`a26a001`, `ae79799`: her kartta aynı olan düğmeler hangi öğeye ait olduklarını söylemiyordu.** Ekran okuyucu yalnızca "Bunu kullan" ya da "Favorilere ekle" diyordu. Artık her düğme kartın başlığını açıklaması olarak taşıyor. Kapsam: topluluk kartları, Keşfet kartları, admin blok satırları, site ve blok şikâyet kartları. Testler düzeltmeden önce kırmızıydı.
- **`dfba230`: yeni sayfa oluşturunca odak yeni sayfaya geçiyor.** Önceden "+ Dosya" düğmesine dönüyordu; bu, oluşan sayfa hakkında hiçbir şey söylemiyordu. Testi var.

### Doğru çalışanlar (gerçek klavyeyle)

"Diğer işlemler" menüsü Enter ile açılıyor ve öğelerine Tab ile ulaşılıyor. Kontrol merkezi modal ve adlandırılmış; bölüm düğmeleri `aria-pressed` taşıyor. Esc ile kapanınca odak açan düğmeye dönüyor.

### Ölçüm araçlarıyla ilgili düzeltmeler (yanlış alarmlar)

- **Betikle yapılan tıklama odak vermez.** 5. ve 7. turdaki iki "odak `body`'ye düşüyor" gözlemi bu yüzden yanıltıcıydı. Gerçek sorun klavyeyle doğrulandı ve yukarıda düzeltildi.
- **Arka plan sekmeleri:** bu sekmelerde animasyonlar durur. Diyalog bu yüzden "ezik" ölçüldü; sekme öne alınınca normal. "Editör dar ekranda takılı kalıyor" gözlemi de büyük olasılıkla aynı nedenden; pencere genişleyince editör masaüstü düzenine geçiyor.

### Açık bulgu: sahibin kararı gerekiyor

**Tuvaldeki bloklar klavyeyle seçilemiyor.** Blokların `tabIndex`'i, rolü ve adı yok. Klavye kullanan biri blok ekleyebiliyor (Enter ile sayfa sonuna), seçili bloğu ok tuşlarıyla kaydırabiliyor; ama var olan bir bloğu seçip düzenleyemiyor. Çözüm klavye için yeni bir seçim modeli demek, örneğin bloklar arasında Tab, Enter ile seçme ve bir blok listesi. "Yeni özellik yok" kuralı yüzünden yapılmadı.

### Denenmedi

- Gerçek bir dokunmatik cihaz (yalnızca taklit kullanıldı).
- Gerçek bir ekran okuyucu (adlar ve açıklamalar erişilebilirlik ağacından ve testlerden kontrol edildi).
- Telefonda admin konsolu.

## Kontroller

- Lint geçti.
- Frontend: 2646 test (290 dosya).
- Build geçti.
- Backend: 852 test.
- `makemigrations --check` değişiklik bulmadı.
- `git diff --check` temiz.
- `2b5caeb` için CI tamamen yeşil.

## ChatGPT için: Tur 10'dan önce

1. **Çapraz inceleme.** Testleri kendi bozmalarınızla doğrulayın, bulguları raporlayın, kodu düzeltmeyin. İncelenecek commit'ler:
   - `22c37fd`, `f9fb55d`: 7. tur bulgularının düzeltmeleri;
   - `06993d4`, `2b5caeb`: silinen hesabın blokları;
   - `6bb7445`: Edit'in `inert` kilidi;
   - `1808e0d`: odak kurtarma. Gerçek tarayıcıda klavyeyle deneyin; betikle tıklama odak vermez.
   - `a26a001`, `ae79799`: düğme açıklamaları;
   - `dfba230`: yeni sayfanın odak alması.
2. **Sonra Tur 10:** güvenlik ve son genel kontrol. Açık bulgular raporlarda:
   - herkese açık form ucunun anonim sınırı (5. tur);
   - tuvalin klavye erişimi (bu tur, sahibin kararı);
   - `/code` Edit'te satır içi CSS görselleri (bu tur, P3).
