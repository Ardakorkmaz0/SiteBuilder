# Editör hata tespiti — 16 Ekim 2026

Başlangıç: `master`, `b14daa5`, temiz çalışma ağacı. `git pull --ff-only`
güncelleme getirmedi. İlk tur tamamlandığında kullanıcı talimatı gereği commit,
push ve canlıya alma yapılmamıştı. Sonraki talimat mevcut üç düzeltmenin commit
ve push edilmesini, HEAD için CI başarılıysa `bash deploy.sh` ile canlıya
alınmasını ve ardından testlerin sürdürülmesini istiyor. Önceki turların
commitlenmiş değişiklikleri korunuyor.

## Bu turda doğrulanan üç hata

### 1. Kopyalanan bileşenlerin kendi iç bağlantıları eski hedefe gidiyordu

Bir container içindeki düğme, aynı container'ın isimsiz başlığına `#target`
ile bağlansın. Cut → Paste sonrasında hedef yeni bir component ID'si alıyor,
düğme ise `#target` değerini koruyordu. Eski container kesildiği için bağlantı
tamamen boşa düşüyordu. Duplicate, sayfa çoğaltma ve başka sayfaya kopyalama
yolları da aynı klonlama yardımcısını kullanıyordu.

`frontend/src/store/editorStore.js` içindeki `cloneTrees`, seçili bütün kökleri
önce klonlayıp eski → yeni hedef haritasını kuruyor. Sonra yalnız birebir yerel
fragment bağlantılarını tek geçişte değiştiriyor. `href`, `buttonHref` ve menü
bağlantıları kapsanıyor. Korunan named anchor, kopyalanmayan hedef, sayfa
bağlantısı, `#top`, harici URL ve dosya/göreli URL değişmiyor. Anchor çakışma
nedeniyle kaldırılmışsa iç bağlantı yeni component ID'sine taşınıyor.

### 2. Hızlı Paste işlemleri aynı Undo adımına birleşiyordu

Pano hazırken ilk sayfaya Paste → 500 ms dolmadan ikinci sayfaya geç → Paste →
Undo, ilk sayfadaki kopyayı da kaldırıyordu. Aynı sayfada iki hızlı Paste de
tek Undo ile birlikte siliniyordu. `record('paste')` yerine ayrı işlem kaydı
kullanıldı. Her Paste bir Undo adımı; Redo yalnız o adımı geri getiriyor.

### 3. Kayıt çakışması yayınlama/yayından kaldırma tercihini unutuyordu

Publish veya Unpublish, sunucudan 409 `site_changed` alsın. “Save mine anyway”
eski yayın durumunu kullanarak tekrar kaydediyordu; istenen durum kayboluyordu.

`frontend/src/pages/EditorPage.jsx`, çakışan açık yayın tercihini ref'te tutuyor.
Çakışmadan önce kuyruğa girmiş sıradan bir Save de 409 alsa tercihi ezmiyor.
Kullanıcı kendi sürümünü seçince force kaydı aynı yayın tercihini kullanıyor;
başarılı kayıt bu geçici tercihi temizliyor. Normal Save ve Save-and-leave
akışları aynı kayıt kuyruğunu kullanmaya devam ediyor. Backend değiştirilmedi.

## Testlerin hatayı yakaladığına dair kanıt

- `frontend/src/store/editorStore.clipboardLinks.test.js`: **13 yeni store testi**.
  Düzeltmeden önce **11 hata / 2 başarılı**, düzeltmeden sonra **13 başarılı**.
  Nested ve ayrı kökler, kopyanın orijinali değiştirmemesi, named anchor korunması
  ve çakışması, tüm klonlama girişleri, URL koruması, tek geçiş ve iki Paste
  geçmişi kapsandı. Sabit random/saat ile beklenen hedefler açık literal yazıldı.
- `frontend/src/pages/EditorPage.siteConflict.test.jsx`: **2 yeni entegrasyon
  testi**, Publish ve Unpublish yönleri. Gerçek EditorPage, store ve save queue
  kullanılıyor; `api/sites.js` mock'lanıyor. İlk API isteği bekletilir, sıradan
  Ctrl+S kuyruğa alınır, ikisi de 409 ile reddedilir ve force kaydın payload'u
  ile son düğme durumu doğrulanır. İstek sayısı her aşamada kontrol edilir.
- Yayın düzeltmesi geçici kaldırılıp son test sürümü tekrar çalıştırıldı:
  **iki yeni test de yanlış `published` payload'unda kırıldı**, iki mevcut test
  geçti. Ardından yalnız bu üretim düzeltmesi geri kondu; başka ajanın dosyaları
  stash/revert edilmedi.

Yerel kanıt logları:

- `/tmp/sitebuilder-clipboard-links-before.log`
- `/tmp/sitebuilder-clipboard-links-after.log`
- `/tmp/sitebuilder-conflict-publication-mutation.log`
- `/tmp/sitebuilder-conflict-publication-fixed-final.log`

## Son doğrulama

| Kontrol | Sonuç |
| --- | --- |
| Frontend tam suite | **233 dosyada 2.231/2.231 başarılı**, 65,98 saniye |
| Backend tam suite | **811/811 başarılı**, 136,45 saniye |
| ESLint | Başarılı |
| Üretim derlemesi | Başarılı |
| `git diff --check` | Temiz |

Bu tur toplam **15 yeni test** eklendi. Frontend Node 26 için
`NODE_OPTIONS=--no-experimental-webstorage npm run test:run -- --maxWorkers=4`,
backend ise `.venv-linux/bin/python -m pytest -q` ile çalıştırıldı. Mevcut büyük
bundle uyarısı ve backend test ortamındaki eksik `staticfiles` dizini uyarısı
sürüyor; yeni test hatası yok. Model veya migration değişmedi.

Tam koşu logları `/tmp/sitebuilder-20261016-{frontend,backend,lint,build}.log`
dosyalarındadır.

Bu tur E2E spec değiştirilmedi ve yeni yerel tarayıcı koşusu başlatılmadı.
E2E yalnız CI'da çalıştırılır; ilk yerel doğrulamada yeni CI koşusu yoktu.
Canlıya alma öncesi aynı HEAD'in `tests` koşusu başarılı olmalıdır.
Yeni testler gerçek API yerine test fixture'ları kullanır;
üretim verisi veya gerçek yayın durumu değiştirilmedi. Yeni dev sunucusu açılmadı.

## Claude incelemesi

`AGENTS.md` içindeki çapraz inceleme kuralına göre bu test grubunun bağımsız
Claude incelemesi henüz yapılmadı. Bu not, inceleme için başlangıç noktasıdır.
Claude CLI bu ortamda bulunmadığından bağımsız Codex incelemesi ayrıca
yürütülüyor; bu gerçek bir Claude onayı olarak sunulmuyor. Kullanıcı, inceleme
durumu belirtildikten sonra mevcut değişikliklerin commit/push ve canlıya
alınmasını açıkça istedi.
Özellikle `cloneTrees` tüm kökler için eşlemeyi kurmadan bağlantı değiştirirse,
Paste tekrar aynı history key'ini kullanırsa veya force kayıt yayın tercihini
almazsa ilgili regresyonların kırılması beklenir. İnceleyen kişi bunları
yalnız test sonuçlarına güvenmeden mutation ile doğrulayabilir.

## Commit, CI ve canlı doğrulaması

Kullanıcının sonraki açık talimatıyla üç düzeltme `4adc730` commit'inde
`master` üzerine kaydedilip push edildi. Author ve committer:
`ArdaKorkmaz0 <korkmazarda4455@gmail.com>`.

[Aynı HEAD'in tests koşusu](https://github.com/Ardakorkmaz0/SiteBuilder/actions/runs/38885129969)
başarılı: frontend ve backend işleri yeşil, Chromium **94/94 geçti** (8,9 dakika).
Ardından yalnız `bash deploy.sh` ile dağıtım yapıldı. Canlıdaki paket
`assets/index-BRpjwIvE.js` olarak doğrulandı; API, SPA admin yolları ve Django
admin yönlendirmesi beklenen durum kodlarını döndürdü. Betik başarıyla tamamlandı.
Üretim verisi değiştirilmedi ve Caddy ayarına müdahale edilmedi.

Bağımsız Codex incelemesi izole kopyada 17 testi çalıştırdı; bağlantı eşleme,
ayrı Paste geçmişi ve force kayıt yayın tercihini geri alan mutation'lar sırasıyla
9, 2 ve 2 testi kırdı. Engelleyici yeni bulgu bildirilmedi. Bu, Claude incelemesi
olarak sunulmaz. Dağıtım sonrası devam eden test turu ayrı raporlanacaktır.

Devam turu ve kullanıcının bildirdiği **Gradient to** problemi için
[ikinci rapor](EDITOR-CONTINUED-2026-10-16.md) hazırlanmıştır. Gradient,
copy-to-page Undo, çok sayfalı tema geçmişi, coalesced Redo, SEO revizyonu,
checkpoint kayıt kuyruğu ve editörden ayrılma snapshot'ları burada açıklanır.
Bu sonraki düzeltmeler için yeni canlıya alma yapılmamıştır.
