# Tur 10 öncesi çapraz inceleme — inert, kart açıklamaları, yeni sayfa odağı

HEAD `19bdd7c`; incelenen commit'ler `6bb7445`, `a26a001`, `ae79799`, `dfba230`. AGENTS.md ve Tur 9 raporu okundu. Başlangıçtaki iki untracked `frontend/round10-focus-*.html` dosyasına dokunulmadı. Git archive HEAD ile `/tmp/sitebuilder-round10-inert-cards-pages-lqc9lq05/` altında bağımsız kaynak; yalnız mevcut node_modules bağlantısı paylaşıldı. Ana üretim kodu düzeltilmedi, commit/push/deploy veya yerel browser çalıştırma yok.

## Bulgu — P2: farklı editör modunda yeni sayfa oluşunca odak yeni sayfaya gitmiyor

`dfba230` bağımsız PageFilesPanel içinde doğru: mevcut yeni testi gerçekten yeni düğmeye gidiyor. Fakat gerçek EditorPage'de HTML ve component kolları ayrı PageFilesPanel/Sidebar ağaçları çiziyor. Sayfa oluşturma mevcut paneldeki `refocusPageRef` ve `refocusTick` değerlerini ayarlıyor (`PageFilesPanel.jsx:49–72`); yeni sayfanın modu farklıysa `EditorPage.jsx` currentPageIsHtml kolu değişiyor ve o panel unmount oluyor. Yeni panelde bekleyen odak bilgisi yok.

Gerçek EditorPage + gerçek store + gerçek PageFilesPanel/HtmlWorkspace; yalnız sites API mock. userEvent ile + File açılıp seçenek odaklanarak Enter gönderildi:

| Başlangıç → seçim | Sonuç |
| --- | --- |
| HTML → HTML | Yeni sayfa düğmesinde odak, yeşil |
| HTML → Empty canvas | Sayfa oluşuyor, odak BODY'de; yeni düğme beklentisi kırmızı |
| Empty canvas → Empty canvas | Yeni sayfa düğmesinde odak, yeşil |
| Empty canvas → HTML | Sayfa oluşuyor, odak BODY'de; yeni düğme beklentisi kırmızı |

Bir saniye waitFor sonrasında da düğmeye geçmiyor; yalnız hemen okunan bir render anı değil. Odak bilgisi panelin ömrüne bağlı olduğu için tam sayfa testi gerekir. Bu DOM/JSDOM tekrar üretimidir; gerçek browser klavye veya ekran okuyucu sonucu olarak sunulmaz. Üretim kodu değiştirilmedi.

Kanıt: `/tmp/sitebuilder-round10-page-mode-focus-probe.log` (**2 kırmızı / 2 yeşil**). Test-only patch: `/tmp/sitebuilder-round10-page-mode-focus-repro.patch`; bilinen kırmızıları normal CI'a doğrudan eklemeyin.

## İnert ve yeni sayfa testlerinin kendi bozmalarımla kontrolü

Odaklı küme: `HtmlWorkspace.test.jsx`, `PageFilesPanel.test.jsx`, `AdminBlocks.test.jsx`, `AdminModeration.test.jsx`, `CommunityPage.test.jsx`, `ExploreCard.test.jsx`. Başlangıç ve geri yükleme **6 dosya / 55 test yeşil**.

| Bozma | Sonuç |
| --- | --- |
| Stage iframe inert niteliğini kaldırma | 2 kırmızı / 53 yeşil |
| preparing yalnız measuring; son belge load kontrolünü atlama | 1 kırmızı / 54 yeşil |
| Ölçüm timeout'unu 3000 → 5000 yapma | 1 kırmızı / 54 yeşil |
| Ölçüm timeout efektinden editSeed bağımlılığını kaldırma | 1 kırmızı / 54 yeşil |
| createPage refocusTick artışını kaldırma | 1 kırmızı / 54 yeşil |
| Yeni sayfa yerine ilk sayfayı odak hedefi yapma | 1 kırmızı / 54 yeşil |
| Community titleId hedefini yanlış id'ye bağlama | 1 kırmızı / 54 yeşil |

Bu yedi mutant yakalandı. İnert testleri `inert`/srcdoc/load DOM geçişlerini anlamlı biçimde doğruluyor. Timer seed değişimi de mevcut reseed düzeneğiyle korunuyor. Timer cleanup kodu kaynakta doğru; aşağıdaki odaklı test açığı nedeniyle unmount garantisinin bu iki inert testten çıktığı iddia edilmemeli.

## Odaklı test boşlukları — kod bu noktalarda doğru

Aşağıdaki dört bağımsız mutantın her birinde mevcut **55/55 yeşil kaldı**:

1. Ölçüm timeout efektinin `return () => clearTimeout(timer)` temizliğini kaldırma. Unmount/ölçüm bitişinde iptal davranışı mevcut odaklı kümede sınanmıyor.
2. AdminBlocks yalnız restore düğmesinin aria-describedby niteliğini kaldırma. Test published/unlist ve purge kolunu sınar, removed/restore kolunu açmaz.
3. ComponentReportsTab içindeki üç `block-report-*` açıklamasını kaldırma. Mevcut açıklama testi yalnız site ReportsTab'ı render ediyor; blok şikâyeti kolunu kapsamıyor.
4. ExploreCard pin düğmesinin açıklamasını kaldırma. Mevcut test onTogglePin vermediğinden pin kolu açılmıyor. Aynı fixture preview açıklamasını da ayrıca assert etmiyor; fakat preview için ayrı mutant bu bounded dizide çalıştırılmadı.

Bu bulgular yalnız altı dosyalık odaklı test kümesi için geçerli; bütün repo veya CI bu bozmaları kaçırır iddiası yok. Kaynak incelemesinde restore, blok şikâyeti ve pin hedef id'leri doğru başlıklara işaret ediyor. Community/Explore useId ile kart başına id üretiyor; admin blok, site report ve block report önekleri birbirinden farklı. Erişilebilir açıklama, kontrol adının yerine değil yanında verilmiş. Gerçek ekran okuyucu denemesi yapılmadı.

## Kanıt logları

- Bazal: `/tmp/sitebuilder-round10-inert-cards-pages-baseline.log`
- Geri yükleme: `/tmp/sitebuilder-round10-inert-cards-pages-restored.log`
- Her mutant: `/tmp/sitebuilder-round10-review-<name>.log`
- Makine özeti (11 mutant: 7 yakalandı, 4 sağ kaldı): `/tmp/sitebuilder-round10-review-mutations.json`
- Ek tam sayfa tekrar üretimi ve patch: yukarıda.

Son kaynaklar özgün HEAD'e geri yüklenmiş durumda. İncelemenin kod değişikliği yapılmadan tamamlanan birinci fazıdır; Tur 10 düzeltmesine başlanmadı.
