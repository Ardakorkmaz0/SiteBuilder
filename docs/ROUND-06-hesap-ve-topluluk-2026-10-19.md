# Tur 6 — hesap ve topluluk — 19 Ekim 2026

Başlangıç: temiz `master`, `git pull --ff-only` sonrası `2728f1f` (istenen `1ada939` bunun atası). Tur 5 raporu, Claude'un Tur 4 yanıtı ve test planı okundu. Önce aşağıdaki çapraz inceleme tamamlandı, sonra hesap/topluluk düzeltmelerine geçildi. Canlıya alınmadı; üretim sunucusu/verisi kullanılmadı. Planın sonundaki sahibin özellik kararı değiştirilmedi.

## 1. Claude değişikliklerinin çapraz incelemesi

İncelenen commitler: `c1d8859`, `6f717d1`, `c5f907b`, `66c9cbd`, `3c29b7e`. Tüm bozmalar bağımsız `/tmp` kaynak kopyalarında yapıldı (çoğu `git archive HEAD`, Türkçe koruması ilgili iki dosyanın kopyası); asıl çalışma ağacı stash/revert edilmedi. **İnceleme konusu üretim kodu düzeltilmedi.**

### Açık bulgular

| Öncelik | Yer | Tekrar üretim ve etki |
| --- | --- | --- |
| P2 | `frontend/src/utils/htmlRuntime.js`, `sitePath` / `followBlockLink` | Yol filtresi düz `//elsewhere.example/` ve `javascript:` isteklerini reddediyor. Ancak JavaScript gösterimiyle `'/\\elsewhere.example/'` (slash + backslash) ve `'/\n/elsewhere.example/'` (slash + satır sonu + slash) kabul ediliyor; oluşturulan bağlantı URL kurallarıyla `https://elsewhere.example/` oluyor ve tıklama engellenmiyor. Yalnız site yolu kuralı aşılabiliyor. Bu bir XSS, oturum bilgisi erişimi veya sandbox kaçışı iddiası değildir. |
| P2 | `frontend/src/utils/publishedPages.js`, `retarget` | `value.includes('href')` büyük/küçük harfe duyarlı. Yalnız `<a HREF="#about">About</a>` içeren blok dönüştürülmüyor: beklenen `/s/demo/about/`, gerçekleşen `#about`. Alttaki HTML dönüştürücü büyük harfi zaten destekliyor; erken kontrol onu atlıyor. Kaynak şema değiştirilmeden tekrar üretildi. |
| P3 — test boşluğu | `frontend/src/components/editor/FlowCanvasItem.jsx`, iç öğe sürükleme koruması | Kod şu anda iç `fixed`/`sticky` öğeyi doğru reddediyor. Yalnız `|| pinned` kaldırılınca incelenen dört dosya / 53 test yine yeşil. Store taşımayı ayrıca reddediyor; açık kalan dal, geçersiz hedef çerçevesinin görünmesi. Ek iki test güncel kodda yeşil, bu bozmayla kırmızı. Tam paket/CI üzerinde sağ kalan mutasyon denemesi yapılmadı. |

Bilinen üç kırmızı bağlantı vakası ana CI takımına eklenmedi. Tekrar üretim ve iç sabitleme test yaması `docs/review-evidence/round-06/` içinde; Claude bu iddiaları kontrol edip kendi düzeltmesini yapabilir.

### Özellikle istenen üç kontrol

- **Bloktan düz `//` ve `javascript:` reddi:** geçti. Kendi iframe'i dışındaki embed'in `pwb-navigate` isteği de reddediliyor. Yukarıdaki alternatif URL yazımları ayrı açık bulgudur.
- **Özel alan adında blok içindeki `/s/<slug>/...`:** gerçek Django test istemcisi, doğrulanmış `portfolio.example` alan adı ve iframe içindeki bağlantıyla sınandı. `/s/round6-domain/about/?pwb-theme=dark&from=block` → **301** `/about/?pwb-theme=dark&from=block`, takipte 200 ve doğru About belgesi. Ana sayfa yolu da köke 301; başka site prefix'i 404. Yayınlanan HTML DB satırı değişmiyor. Hash sunucuya gönderilmediği için yönlendirme assertion'ı query üzerindedir.
- **Görüntüleyicide bir üst pencereye iletim:** mevcut hash testi ve ek href testi geçti. Kendi blok href'i tam bir kez `parent.postMessage` ile iletiliyor; yabancı iframe iletilmiyor. Parent aktarımı kaldırılan bozma kırmızı.

### Mevcut testleri bağımsız bozmalarla doğrulama

| Alan | Temel yeşil | Bağımsız bozma sonucu |
| --- | --- | --- |
| `c1d8859`: standalone runtime + yayın bağlantıları | 49 test | 6/6 yakalandı: her yolu kabul etme, kaynak kontrolünü kaldırma, viewer parent aktarımını kaldırma, blok href aktarımını kaldırma, `buttonHref` kapsamını daraltma, HTML dönüştürmesini kaldırma. Ek 7 prob: 3 kırmızı / 4 yeşil; üç kırmızı yukarıdaki iki P2 bulgusu. |
| Özel alan adı yönlendirmesi | Mevcut domain paketleri + ek prob: 31 test | Yanlış prefix, query kaybı, 301 yerine 302: 3/3 yakalandı; her biri mevcut bookmark testi ve yeni probu kırdı. Geri dönüşte seçilen iki test yeşil. |
| `6f717d1`, `c5f907b`: kayıt uyarısı ve sürükleme | 53 test | 10 bozmanın 9'u yakalandı: yeni uyarıyı silme, eski reddi bırakma, köşe konumunu kaybetme, tabId kaybı, pinned/full-width reddini kaldırma, üst seviye pinned çerçevesi, iç çoklu seçim, tam 4px eşiği. Sağ kalan iç pinned dalı P3 olarak yukarıda. |
| `66c9cbd`: Türkçe hitap koruması | Formal guard 2 + inbox workflow 8 = 10 test | 6/6 yakalandı: ASCII sınırı, eski koşul kalıbı, ortaç kalıbını kaldırma, eski hitabı geri getirme, öz denetimi etkisizleştirme, eski sözlüğü geri getirme. Muğlak iyelik biçimleri hâlâ bilinçli kapsam dışında. |
| `3c29b7e`: gelen kutusu uzun değerleri | Workflow 8 test yeşil; CSS incelendi | `min-w-0` ve `overflow-wrap:anywhere` birlikte uygulanmış. jsdom CSS/yerleşim ölçmez; gerçek görsel doğrulama yapıldığı iddia edilmiyor. |

Gelen kutusu için 80 karakterlik alan adı (`dt`) ve 140 karakterlik boşluksuz sayfa adı telefon/yerleşim turunda denenebilir; **doğrulanmış hata sayılmadı**. İzole `file://` HTML fixture'ını CUA güvenlik politikası açmadı; engel başka protokol üzerinden dolaşılmadı ve sahibin editör sekmesi değiştirilmedi.

## 2. Tur 6'da düzeltilen hatalar

| Hata | Değişiklik | Eski kodla kırmızı kanıt |
| --- | --- | --- |
| Şifre sıfırlamada yanlış JSON alan/gövde türü 500 üretiyordu | Reset endpoint'lerinde nesne ve metin türü kontrolü; hatalı tür 400, geçerli/eksik alan sözleşmesi korunuyor | 21 yeni test: 18 kırmızı / 3 yeşil |
| Register, guest upgrade ve adopt nesne olmayan JSON gövdesinde `.get()` ile çöküyordu | Alanları okumadan gövde doğrulaması; upgrade/adopt oturum ve guest izinleri aynı sırada | 11 yeni test: 9 kırmızı / 2 yeşil |
| Reset tamamlandıktan veya yanıt gelmeden önce ayrılan kişi sonradan `/login`'e gönderiliyordu | 1800ms yönlendirmesi effect'e taşındı, unmount cleanup eklendi; geç yanıt yeni timer kuramıyor | Auth UI paketinde iki ayrılma vakası kırmızı |
| Reset e-postası beklerken alan değiştirilince gönderilmeyen adres başarı mesajında görünüyordu | İstek sırasında gönderilen adres başarı durumuna kaydediliyor | Bekleyen istekte adres değiştirme vakası kırmızı; auth UI toplamı 3 kırmızı / 6 yeşil |
| Toplulukta eski başarı/hata/finally yeni filtre sonucunu veya yükleniyor durumunu eziyordu | Etki cleanup'ı eski isteğin üç durum güncellemesini de geçersiz kılıyor | Üç yeni yarış vakası kırmızı |
| Herkese açık profilde favori yazıları çakışıyor ve hata sessiz kalıyordu | Kart başına bekleme kilidi, yalnız sunucu onayından sonra yıldız/sayaç, görünür `apiError`, yeniden deneme ve profile bağlı geç yanıt | İlk 24 sosyal UI testi eski iki üretim dosyasıyla 4 kırmızı / 20 yeşil; ek profil-rota vakası bundan sonra eklendi |

**48 yeni birim/API vakası:** backend 32, auth UI 9, sosyal UI 7. Sosyal UI'daki yedinci vaka bağımsız incelemenin önerdiği rota değişimi testidir: yeni profilin favori hatası görünürken eski profilin geç hatası onu silemez. Bu vaka güncel kodda yeşil, catch profil koruması kaldırılınca kırmızıdır.

Backend ret testleri yalnız HTTP kodunu ölçmüyor: parola hash'i, e-posta, token ve site sahipliği DB'den kontrol ediliyor. Geçerli reset yalnız sahibin eski API token'ını siliyor; başka hesabın satırları korunuyor ve kullanılan bağlantı tekrar kullanılamıyor. Bilinen/bilinmeyen e-posta aynı genel yanıtı alıyor. Boş sayılan falsey değerler eski eksik alan davranışını korur; her falsey değerin yeni `validation_error` aldığı iddia edilmiyor.

### İkinci göz kontrolü

Değişiklikleri yazan alt ajan dışındaki ajanlar güncel dosyaları bağımsız arşive kopyalayarak inceledi; yalnız eski HEAD'i test etmediler.

- Backend: 94 ilgili test yeşil; 7/7 kendi bozması yakalandı (tür/gövde kontrolleri, token iptali ve izolasyonu, reset token geçerliliği, oturum izni). Beş gerçek multipart/QueryDict yolu ayrıca yeşil.
- Auth UI: 9 test yeşil; cleanup, geç yanıt, e-posta snapshot, süre ve rota bozmalarının 5/5'i yakalandı.
- Sosyal UI: 24 temel test yeşil. İlk 11 bozmanın 9'u yakalandı; yalnız ref erken dönüşü kaldırılınca DOM disabled koruması aynı işi gördüğü için test yeşil kaldı. Profil id başarı koruması odaklı testte yakalanmadı; catch koruması için önerilen gerçek rota testi eklendi. Bu, her üretim dalının mutasyonla korunduğu iddiası değildir.
- Yeni E2E dosyaları bağımsız kaynak incelemesinden geçti: favori silmenin mevcut 200 sözleşmesi, sonuç sayfasının `Search query` adı ve People bölgesini gerçekten sınayan selector düzeltildi.

Bunlar aynı çalışmadaki bağımsız alt incelemelerdir; **Claude'un sonraki tur çapraz incelemesinin yerine geçmez.**

## 3. Gerçek ağ ve tarayıcı akışları

Dört yeni Playwright senaryosu iki projede keşfediliyor: Chromium 102 + Firefox 102 + ortak setup = **205 keşfedilen test**. Her tarayıcı CI'da kendi veritabanı/sunucusunu kullanır; yerel tarayıcı kurulmadı veya yerel E2E çalıştırılmadı.

1. UI kayıt → çıkış → yanlış parola → büyük harfli kullanıcı adıyla doğru giriş → çıkış → yerel e-posta reset bağlantısı → yeni parola → eski API oturumuna 401 → eski parola reddi / yeni parolayla aynı kullanıcıya giriş.
2. Misafir taslak → mevcut hesaba UI girişi/adopt → aynı site id, başlık ve şema → eski guest token'ına 401. Mevcut `auth.spec.js` misafirin yeni hesaba yerinde yükseltilmesini ayrıca koruyor.
3. Profil alanlarını kaydetme/yenileme ve public profilde görme → kategoriyle keşfet → favori ekle/listele/public profilden kaldır → boş favoriler → site ve People araması → başka yazarın sitesini şikâyet etme.
4. Topluluk arama/kategori → blok önizleme ve Esc → şikâyet → kendi taslağına kopyalama → gerçek kaydedilmiş şemada HTML, `_sharedFrom`, blok sayısı ve revision artışı.

İstekler intercept edilmez; gerçek API cevapları ve sunucuda yeniden okunan veriler doğrulanır. Yapay kayıtlar benzersiz adlarla oluşturulur; oluşturulan siteler test sonunda silinir, paylaşılan test bloğu geri çekilir. CI veritabanları geçicidir.

`config/e2e_settings.py` yalnız Playwright sunucusunda dosya tabanlı e-posta teslimini seçer; üretim varsayılan ayarı değişmez. E-posta `.mail/` altında gitignore'dadır ve artefact yükleme yollarının dışındadır. Test yalnız benzersiz alıcıya gelen bağlantıyı okur; token/parola assertion mesajlarına yazılmaz. Gerçek parola, SMTP hesabı, CAPTCHA veya OAuth kimliği kullanılmaz.

## 4. Kontroller ve teslim

Yerel tam kontroller geçti: **280 dosya / 2579 Vitest testi (87,42s), 849 pytest testi (150,85s), lint ve build**. Son eklenen profil-rota vakasıyla profil dosyası ayrıca 4/4 geçti. Build mevcut chunk boyutu uyarısı, pytest staticfiles uyarıları verdi; hata yok. Raporla aynı commit'in push sonrası GitHub Actions `tests` çalışması esas alınmalıdır; eski `1ada939` yeşili bu yeni değişiklikler için kanıt sayılmaz. CI sonucu görev tesliminde ayrıca kontrol edilir.

İlk kod commit'i `4b1aa31` için kayıt: [tests / 39308236114](https://github.com/Ardakorkmaz0/SiteBuilder/actions/runs/39308236114). Frontend/backend yeşil; Chromium'da 102 test geçti, yeni guest-adopt vakası başarısız oldu: testin `addInitScript` kodu sandbox önizlemede de `localStorage` okumaya çalışarak `SecurityError` üretiyordu. Akış assertion'ları geçmişti; fixture'ın sıfır uncaught-error denetimi bunu yakaladı. Yalnız test başlangıç kodundaki depolama erişimi korundu; uygulamanın hata denetimi veya iframe sandbox'ı gevşetilmedi. Firefox işi yeşil: 102 passed + 1 flaky; tekrar isteyen vaka mevcut `code-project.spec.js` içindeki cihaz değişimiydi, yeni hesap/topluluk vakaları değildi. Aynı kodlu rapor commit'inin gereksiz ikinci koşusu iptal edildi; teslimde bu düzeltmeyi içeren en son HEAD'in tam CI'ı kontrol edilir. Bu ilk koşu yeşil olarak sunulmaz.

- `frontend`: lint, tam Vitest (`NODE_OPTIONS=--no-experimental-webstorage`, Node 26), build.
- `backend`: tam pytest. Model değişikliği/migrasyon yok.
- `git diff --check` ve Playwright `--list`.
- Tarayıcı akışları yalnız push sonrası Chromium ve Firefox CI işleriyle tamamlanır. Yeşil yerel testler tek başına tarayıcı doğrulaması değildir.

## 5. Sınırlar ve Claude'a devir

- Tur 5'in iki P2 bağlantı bulgusu ve iç pinned sürükleme test boşluğu açık; tekrar üretimler aşağıdaki kanıt klasöründedir. İstenen rapor-only sınırı korundu.
- Gelen kutusu gerçek layout'u, telefon/dokunmatik/kontrast, gerçek Google OAuth/CAPTCHA ve dış SMTP teslimi doğrulanmadı. Bunlar sırasıyla sonraki ilgili turlar/dış servis kapsamındadır.
- Topluluk API'si sayfalıdır; mevcut grid ilk sayfayı kullanıyor. Bu turda sayfalama arayüzü eklenmedi; kayıp içerik/ürün kapsamı sonraki incelemede ayrıca değerlendirilmeli.
- Testlerden sonra canlı siteyi yalnız açık Yayınla ile güncelleme kararı uygulanmadı; plandaki özellik bölümü aynen korundu.
- Sıradaki Tur 7 Claude'undur: önce bu turun `views.py`, auth UI ve Community/PublicProfile değişiklikleri ile yeni testlerini kendi bozmalarıyla inceleyin, sonra admin kapsamına geçin. Şimdiki alt ajan incelemelerini Claude onayı saymayın.
- Commit sahibin kimliğiyle, doğrudan `master` üzerinde; ajan trailer'ı ve deploy yok.

Kanıtlar: `docs/review-evidence/round-06/README.md`, `links-repro.patch`, `nested-pin-coverage.patch`, `domain-redirect.probe.py`. Yerel ayrıntılı loglar `/tmp/sitebuilder-round6-*` altındadır; sır veya test token'ı içerebilecek ham CI logları rapora kopyalanmamalıdır.
