# Tur 10 öncesi çapraz inceleme — bağlantılar, admin metinleri ve silinen yazarın blokları

İncelenen commitler: `22c37fd`, `f9fb55d`, `06993d4`, `2b5caeb`. Güncel kaynak `19bdd7c`. `AGENTS.md` ve `docs/ROUND-09-telefon-erisilebilirlik-2026-10-20.md` okundu. Ana ağaç inceleme boyunca yalnız okundu; düzeltme, commit, push, deploy, sunucu veya yerel E2E başlatma yapılmadı.

Test ve mutasyonlar `git archive HEAD` ile üretilen `/tmp/sitebuilder-round10-links-blocks-q0_rr4t6/` içinde çalıştı. Kurulu node_modules ve Linux venv symlink kullanıldı. Secret/env okunmadı. Her bozma ayrı uygulandı ve sonraki bozmadan önce geri yüklendi.

## Sonuç

**Yeni bir üretim hatası veya engel doğrulanmadı.** 20 bağımsız üretim bozmasının 18'i mevcut odaklı testlerce yakalandı. İki gerçek metin regresyonu (aşağıdaki P3 kapsam boşluğu) mevcut odaklı paket ve genişletilmiş admin/çeviri guard paketinde sağ kaldı; bunların eşdeğer bozma olmadığı kendi pozitif problarımla doğrulandı.

### P3 — iki admin terim düzeltmesinin regresyon testi eksik

`f9fb55d`, `Reports` ve `Report not found.` karşılıklarını da değiştirdi; fakat bu iki karşılığın eski `Bildirimler` / `Bildirim bulunamadı.` biçimine dönmesi odaklı testleri kırmıyor.

Konum: `frontend/src/i18n/translations.js:390` ve `:1553`.

Her iki bozma için ayrı ayrı:

- mevcut altı odaklı dosyada **51/51 yeşil**;
- tüm admin bileşen testleri + translations.coverage/formal guardlarında **8 dosya / 17 test yeşil** (kendi problarım hariç);
- elle yazılmış doğru Türkçe değerleri gerçek `translate` fonksiyonuyla kontrol eden kendi iki probumdan **1 kırmızı / 1 yeşil**;
- kaynak geri yüklendiğinde kendi iki probum tekrar yeşil.

Bunlar güncel kaynakta yanlış metin bulunduğu iddiası değildir; mevcut değerler doğrudur. Bütün frontend paketinde mutasyon çalıştırılmadığı için bütün repo testlerinin kaçırdığı iddia edilmez. Açık kanıt, yukarıdaki odaklı ve genişletilmiş paketlerdir.

### Rapor doğruluğu — anonim liste 404 değil, 200 ve boş liste

ROUND-09 bölüm 3'teki “Silinince anonim liste ve ayrıntı 404 veriyor” cümlesi liste için doğru değil. Gerçek davranış: liste **200** ve `results: []`, ayrıntı **404**. Bu API için tutarlı davranıştır; uygulama hatası değildir. Kendi backend probum liste durumunu ve şikâyet yazımının 404 ile reddedilerek satır oluşturmamasını doğruladı.

## Doğrulanan düzeltmeler

### `22c37fd`

Tam kontrol edilmiş `url.href` kullanıldığı için `/safe/..//elsewhere.example/`, `/%2e//elsewhere.example/` ve `/safe/%2e%2e//elsewhere.example/` ikinci ayrıştırmada da aynı sunucuda kalıyor. Tam adresi tekrar yalnız pathname/search/hash biçimine çeviren mutasyon beş testi kırdı. Protokol, sorgu, fragment, kendi srcdoc kaynağı ve viewer href aktarımı bozmalarının her biri yakalandı. Önceki Tur 8 P2 bulgusu kapanmış görünüyor.

### `f9fb55d`

Activity görünümü İngilizce server ayrıntısını çeviriyor; raw detail gösterme mutasyonu UI testini kırıyor. Copyright gerekçe eşlemesini kaldırmak iki testi kırıyor. Admin rolünü yeniden konsol başlığıyla aynı anahtara bağlamak ve boş kuyruğu eski terime döndürmek de yakalanıyor. Yalnız yukarıdaki iki diğer karşılık odaklı kapsamda boşluk bıraktı.

### `06993d4`, `2b5caeb`

Yazarı silinen blok anonim listeden kalkıyor, ayrıntı/kullan/şikâyet tarafından reddediliyor; view/use sayaçları artmıyor ve hedef site değişmiyor. Model satırı `SET_NULL` ile kalıyor; admin listesinde bulunabiliyor ve UI silinmiş hesap rozetini gösteriyor. Eski regresyon testi artık sahibin kuralına uyuyor.

Kendi ilave pozitif backend probum önce blok kopyasını gerçek use ucundan alıyor, yazarı siliyor, sonra moderatör purge yapıyor: kopya siliniyor, hedef sitenin revision değeri tam bir artıyor, SharedComponent satırı yazarsız ve removed olarak kalıyor. Böylece satır korumanın moderasyon amacı da doğrulandı.

## Bazal ve geri yükleme

- Frontend bazal: altı odaklı dosya, **51/51 yeşil**, 1.77 s.
- Backend bazal: `test_shared_components.py` ve `test_security_regressions.py`, **78/78 yeşil**, 16.73 s.
- Frontend geri yükleme: aynı altı dosya + iki kendi pozitif terim probu, **7 dosya / 53 test yeşil**, 2.13 s.
- Backend geri yükleme: aynı iki dosya + iki kendi pozitif probu, **80/80 yeşil**, 20.36 s.

Backend uyarıları izole arşivde staticfiles klasörü bulunmaması ile ilgili; test başarısızlığı yok.

## Mutasyon tablosu

Frontend sütunu her satırda mevcut altı odaklı dosyayı (51 test) çalıştırır. Backend bozmaları `TestAuthorDeleted` ve iki ilgili security regresyonunu (5 test) çalıştırır; bazal/restore ise yukarıdaki tam iki backend dosyasını kapsar.

| Kendi üretim bozmam | Sonuç |
| --- | --- |
| URL'yi tam adres yerine pathname/search/hash olarak döndür | 5 kırmızı / 46 yeşil |
| URL protokol guardını kaldır | 1 kırmızı / 50 yeşil |
| URL sorgusunu düşür | 1 kırmızı / 50 yeşil |
| URL fragmentini düşür | 1 kırmızı / 50 yeşil |
| Navigate mesajında kendi srcdoc kaynak kontrolünü kaldır | 1 kırmızı / 50 yeşil |
| Viewer'ın href aktarımını kaldır | 1 kırmızı / 50 yeşil |
| Activity UI'de auditDetail yerine ham detail göster | 1 kırmızı / 50 yeşil |
| Copyright gerekçe eşlemesini kaldır | 2 kırmızı / 49 yeşil |
| Admin rolü anahtarını eski Admin/konsol anahtarına döndür | 1 kırmızı / 50 yeşil |
| No reports karşılığını Bildirim yok yap | 1 kırmızı / 50 yeşil |
| Reports karşılığını Bildirimler yap | **51 yeşil; gerçek kapsam boşluğu** |
| Report not found. karşılığını Bildirim bulunamadı. yap | **51 yeşil; gerçek kapsam boşluğu** |
| Admin blok listesindeki silinmiş yazar rozetini kaldır | 1 kırmızı / 50 yeşil |
| Silinmiş hesap metnini eski @? yap | 1 kırmızı / 50 yeşil |
| Public listede etkin yazar filtresini kaldır | 3 kırmızı / 2 yeşil |
| Detail görünürlükte author=None değerine tekrar izin ver | 2 kırmızı / 3 yeşil |
| View sayacında etkin yazar filtresini kaldır | 2 kırmızı / 3 yeşil |
| SharedComponent.author silme kuralını CASCADE yap | 2 kırmızı / 3 yeşil |
| Admin listesinde yazarsız blokları gizle | 1 kırmızı / 4 yeşil |
| Use ucunda merkezi görünürlük kapısını atla | 2 kırmızı / 3 yeşil |

## Kanıtlar

- `/tmp/sitebuilder-round10-links-blocks-frontend-baseline.log`
- `/tmp/sitebuilder-round10-links-blocks-backend-baseline.log`
- `/tmp/sitebuilder-round10-links-blocks-frontend-restored.log`
- `/tmp/sitebuilder-round10-links-blocks-backend-restored.log`
- `/tmp/sitebuilder-round10-links-blocks-frontend-mutants.json`
- `/tmp/sitebuilder-round10-links-blocks-backend-mutants.json`
- `/tmp/sitebuilder-round10-links-blocks-mutant-*.log`
- `/tmp/sitebuilder-round10-links-blocks-terms-mutations.json`
- `/tmp/sitebuilder-round10-links-blocks-terms-*-admin-guards.log`
- `/tmp/sitebuilder-round10-links-blocks-terms-*-own-probes.log`
- `/tmp/sitebuilder-round10-links-blocks-deleted-probes.log`
- `/tmp/sitebuilder-round10-links-blocks-review-probes.patch`: yalnız testler, iki terim ve iki backend pozitif probu. Güncel kaynakta hepsi yeşil; ana ağaca uygulanmadı.

Yerel tarayıcı, gerçek ekran okuyucu, prod veri ve OS dosya penceresi kullanılmadı. Ana ağacın son durumunda başka çalışma tarafından eklenmiş `frontend/round10-focus-check.html` vardı; dokunulmadı.
