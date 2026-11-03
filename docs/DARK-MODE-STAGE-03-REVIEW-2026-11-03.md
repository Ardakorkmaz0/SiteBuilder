# Koyu mod aşama 3 — çalıştırılan çapraz inceleme

Tarih: 3 Kasım 2026. Başlangıç HEAD: `7a0730bc7ec4322da7b882ab61f950d698085fd0`.
Kapsam: `18759dd` sonrasındaki koyu mod işleri; özellikle `bbf6015`, `3f237bf`, `5443ff5`, `7a0730b` ve önceki inceleme düzeltmeleri.

Başlangıçta `git status --short` temizdi; `git pull --ff-only` güncel olduğunu bildirdi. Üretim kodu değiştirilmedi. Bozma denemeleri sonunda özgün byte'lar geri kondu. Eklenenler inceleme kanıtları, tarayıcı testleri ve CI kanıt yükleme adımıdır. Canlıya alma yok; gerçek üretim verisi kullanılmadı.

İnceleme çalıştırılarak tamamlandı. İki ürün bulgusu (P2/P3), backend regresyon kapsamı açığı ve Firefox açıklamasına ilişkin açık inceleme konusu var. Yerel paketler yeşil. Son Chromium CI **129/129**, Firefox **128 geçti / 1 başarısız**: yeni gerçek `/s/` ilk-cihaz kontrolü Firefox'ta iki kez light aldı. Üretim kodu düzeltilmedi; başarısız kontrol yeşile çevrilmedi. Aşağıdaki tanı testlerinin yeşil oluşu açık ürün bulgularını düzeltmiş sayılmaz.

## Yerel koşullar ve normal paketler

- Ayrı SQLite: `/tmp/sitebuilder-dark-stage3-review-01a13ef5.sqlite3`. Yalnız deneme kullanıcısı ve dört deneme sitesi. Backend 8001, Vite 5173; başlangıçta portlar boştu. `config.e2e_settings` ile gerçek e-posta gönderilmez.
- Kullanıcı arayüzü denemeleri gerçek in-app Chromium'da yapıldı. `/s/` ve normal `/site/` gerçek Django API/verisini kullanır. Toplu işlem ve owner-prop denemelerinde aşağıda belirtilen test düzenekleri vardır.
- Lint geçti. Vitest **313 dosyada 2.943 test geçti**. Üretim derlemesi geçti; mevcut büyük chunk uyarısı sürüyor. Pytest **994 test geçti**.
- Yerel Playwright/E2E tarayıcısı başlatılmadı; E2E yalnız CI'da çalıştırılır. `--list`, syntax ve ESLint kontrolü tarayıcı yürütümü değildir.

Gerçekten çalıştırılan normal komutlar:

```sh
# frontend/
npm run lint
NODE_OPTIONS=--no-experimental-webstorage npm run test:run
npm run build
# backend/
.venv-linux/bin/python -m pytest -q
# repo kökü
git diff --check
```

Vitest süresi 75,71 sn; pytest 199,99 sn ve 764 uyarı. Model/migration değişmedi. Lint ve build yeni test dosyaları eklendikten sonra da çalıştırıldı. Tam loglar bu oturumda `/tmp/sitebuilder-dark-stage3-frontend.log`, `…-backend.log`, `…-lint-final.log`, `…-build-final.log` altında tutuldu; CI aynı paketleri ayrıca yürütür.

## Çalıştırılarak doğrulanan bulgular

### S3-F1 · P2 — Aynı sitede canvas ve HTML sayfaları arasında son tema tercihi kayboluyor

Yerel gerçek `/site/review-a` üzerinde, ek bir düzeneğe gerek olmadan:

1. Home canvas sayfasında Dark seçildi. DOM kökü `palette=dark, pick=dark` oldu.
2. Üstteki Document düğmesiyle aynı sitenin HTML sayfasına geçildi.
3. Gerçek iframe'de **Light seçili** geldi. `sitebuilder-stage3-mixed-choice.jpg` bunu gösterir.
4. HTML sayfasında Device seçildi, Home'a dönüldü; canvas bu seçimi aldı.
5. Canvas'ta Light seçildi (`pick=light` doğrulandı); Document'e geri dönüldü.
6. HTML sayfasında **eski Device seçimi** yeniden geldi. `sitebuilder-stage3-stale-device.jpg` kaydı vardır.

Bu yalnız görsel bir fark değildir: son ziyaretçi tercihi iki çizim yolu arasında tek kaynaktan tutulmuyor. Gerçek PreviewPage'i süren ek Vitest kontrollerinde de iki akış kırıldı. `frontend/src/components/renderer/ColorMode.jsx:49–50` seçimi kendi state'inde tutuyor; `frontend/src/pages/PreviewPage.jsx:360–362` ortak state'i yalnız iframe mesajından güncelliyor. `PreviewPage.jsx:386–389` sonraki dosyaya bu değeri taşıyor; `:626` canvas kökünden seçimi geri alan bir callback yok.

Tekrar üretim verisi: `frontend/e2e/dark-mode-review-data.js` içindeki `reviewSchema('Review mixed', { mixed: true })`. Otomatik tarayıcı ölçümü: `frontend/e2e/dark-mode-ui-review.spec.js`, `diagnostic measurement of theme continuity…`. Beklenen son ziyaretçi seçimi ile alınanı ayrı alanlara kaydeder; bu iki farkın düzelmiş olduğunu assert eden bir guard değildir. Bağımsız kırmızı kontrol: kanıt klasöründeki `runtime-probe.review.test.jsx`; çıktısı `runtime-probe-results.txt`.

İlk kayıp iki yönlü modda da eskiden bulunmuş olabilir; bu inceleme onu kesin yeni aşama 3 gerilemesi diye sunmaz. Mevcut aşama 3'te `Device` ile ikinci akış da çalıştırılarak bozuldu. Üretim düzeltmesi yapılmadı.

### S3-F2 · P3 — Dikey navbar üst bar sayılıyor; eklenen düğme sağ üstten uzaklaşıyor

Gerçek EditorPage ve gerçek ColorModePanel ile, genişliği 200 ve yüksekliği 600 olan `navLayout: vertical` çubuklu deneme sitesinde PC görünümü seçildi. “2 sayfaya ekle” sonrasında DOM'da gösterilen gerçek store özeti:

```text
themeToggle.layout = {x:1132,y:616,w:44,h:44}
```

Yan çubuğun yüksekliği üst bar yüksekliği gibi kullanılıyor. Sağ üstte y=24 yerine y=616'ya ekleniyor. Gerçek tarayıcı çıktısı `sitebuilder-stage3-vertical-manual.json` ve `sitebuilder-stage3-vertical.jpg`; bağımsız store kontrolü de mevcut kodda kırıldı. `frontend/src/utils/themeToggle.js:101` navbar yönünü ayırmıyor; `:104` yüksekliğini y'ye ekliyor.

Tekrar üretim: `bulkSchema({ vertical: true })` ile 1200 piksel canvas, solda `{x:0,y:0,w:200,h:600}` navbar; gerçek Theme panelinde “N sayfaya ekle”. Sağ üst boş olduğu halde y=616. Aynı spec'teki `diagnostic measurement of real batch placement…` gerçek store düzenini ölçer. Bu, serbest tuval yerleştirmesine ait P3'tür; flow sayfası sırasının bozuk olduğu iddia edilmiyor.

### S3-F3 · P3 — Üçlü anahtarın yayın durumuna etkisi mevcut backend testlerinden kaçabiliyor

Bu bir üretim hatası değil, çalıştırılmış regresyon kapsamı açığıdır. `backend/builder/live_pages.py:42–58` içindeki tespit için iki ayrı bozma yapıldı: yalnız `states:'three'` canvas anahtarını yok saymak; HTML tespitini yalnız çıplak `data-pwb-theme-toggle>` biçimiyle sınırlayıp `="choices"` biçimini kaçırmak. Her mutantta `builder/test_page_live.py` dosyasının tamamı **55/55 geçti**. İlgili mevcut fixture'lar `backend/builder/test_page_live.py:217–250` içinde iki yönlü/nested canvas ve çıplak HTML anahtarı kullanıyor.

Tekrar üretim: kanıt klasöründeki `backend_fingerprint_probe.py`, gerçek POST site → Home'u page-live ucundan yayınla → About taslağına üçlü canvas veya HTML choices anahtarı ekle → PATCH → Home'un `page_live` sonucunu kontrol et. Sağlam kodda iki kontrol de geçer. İlgili mutantta `home:'older'` yerine `'live'` geldi; her mutant için ek kontroller **1 failed / 1 passed** oldu. Mevcut üretim kodu iki durumda da doğru; düzeltme yapılmadı. Tam suite'in bu mutantlarda da yeşil kalacağı iddia edilmiyor; 55 testlik dosyanın tamamı sınandı. `backend-fingerprint-mutation-results.json` sonuç kanıtıdır; komutlar `backend_fingerprint_mutations.py` içindedir.

### İstenen seçim koşuluna ilişkin gözlem — Ctrl+Z seçimi temizliyor

Toplu ekleme sırasında seçim doğru korundu. Fakat tek gerçek Ctrl+Z sonrasında seçili blok dizisi boşaldı. `frontend/src/store/editorStore.js:3207–3208` genel undo sırasında `selectedId:null, selectedIds:[]` yazıyor. `git show 18759dd:frontend/src/store/editorStore.js` içindeki `3179–3180` de aynı; `git blame` Mayıs/Temmuz 2026 kökenlerini gösteriyor (`runtime-undo-history.txt`). Bu, yeni toplu işlem regresyonu diye etiketlenmedi. İstenen “seçili blok değişmemeli” koşulunu undo sonrasında da kapsıyorsanız koşul sağlanmıyor. İçerik tek adımda geri geldi ve açık sayfa aynı kaldı.

## Yerel gerçek tarayıcı adımları ve çıktılar

| Alan | Gerçekten çalıştırılan adım | Çıktı |
| --- | --- | --- |
| Üç seçenek/klavye | `/s/review-a/`, Light→ArrowRight→Dark→Tab | Dark seçildi; Tab About bağlantısına çıktı; tabindex değerleri `[-1,0,-1]` |
| Sonraki sayfa | Dark seçili A→About | About URL'si `?pwb-theme=dark`, palette/pick dark |
| İkinci ziyaret | A'nın parametresiz adresi yeniden açıldı | palette/pick dark |
| Başka site | A'daki Other site bağlantısıyla B | B parametresiz, palette/pick light |
| Aynı SPA'da site izolasyonu | Gerçek PreviewPage, MemoryRouter Link ile A→B, bileşen yeniden kurulmadan | A dark, B light |
| Owner değişimi | Gerçek ColorModeRoot düzeneğinde Owner starts dark | Seçim yapılmamış açık önizleme dark oldu |
| Ziyaretçi tercihi | Visitor Light, sonra Owner starts device | palette/pick light kaldı |
| Karma toplu ekleme | Gerçek EditorPage + ek gerçek Theme paneli, Home'da başlık seçili, N=2 | Home aynı, seçim aynı, geçmiş 0→1, sayfalardaki düğme sayıları `[0,0,0]→[1,1,0]` |
| Tek Ctrl+Z | Düzeneğin kendi undo dinleyicisi yok; gerçek EditorPage kısayolu kullanıldı | Sayılar `[0,0,0]`, geçmiş 0; sayfa Home kaldı, seçim boşaldı |
| Akış sayfası etkin | Flow açıldı, gerçek Flow heading tıklandı, N=2 | Flow ve `flow-heading` seçimi korundu; sıra `navbar,themeToggle,heading,text` |

Toplu işlem düzeneği, seçili blok varken panel erişilebilir kalsın diye gerçek editörün yanına ikinci gerçek ColorModePanel koyar; bu normal ürün yerleşimi değildir. API ve store gerçektir; düzeneğin undo dinleyicisi yoktur. Owner düzeneği gerçek ColorModeRoot'a UI ile prop değişimi verir; başka bir cihazdan yapılan sunucu güncellemesinin canlı push/poll işlemi denenmiş gibi sunulmaz.

Yerel manuel tarayıcıda işletim sistemi tercihini değiştirme, farklı BrowserContext ziyaretçisi, gerçek orta tıklama yeni sekme ve iframe piksel çözümleme yapılmadı. Bunların yürütümü aşağıdaki CI bölümüyle ayrıdır; işletim sistemi ayarı doğrudan değiştirilmedi, Playwright native media emülasyonu kullanıldı.

## Testlerin bozmayla doğrulanması

- Ön yüz: ColorMode util, ColorModeRoot, ColorModePanel ve PreviewPage.palette **91 test** başlangıç/restorasyonda geçti. On beş seçilmiş üretim bozmasının on beşi ilgili testleri kırdı; script/renderer device dinleyicisi, explicit seçim, batch tek kayıt, seçim/aktif sayfa, flow başa yerleştirme ve site anahtarı yolları sınandı.
- Arka yüz: Sekiz bozma yakalandı. Üçlü canvas ve HTML `choices` anahtarının fingerprint etkisini kaldıran iki bozma, tüm `test_page_live.py` içinde **55/55 yeşil** kaldı; geçici gerçek serializer→publish→PATCH→status testleri her birini yakaladı. Mevcut kod doğru; regresyon kapsamı eksik.
- Eski head: üç tarihsel gerçek writer, gerçek Django yanıtları ve JSDOM'da çalışan scriptlerle **15/15 literal beklenti** doğrulandı. Bu JSDOM sonucudur, tarayıcı/piksel denemesi değildir. Aynı yanıtların ölçüm eklenmiş replay'i gerçek iki CI tarayıcısında da 15'er belgeyle geçti.

Ön yüzde her bozma ayrı koştu; yedi üretim dosyası özgün byte'larıyla geri kondu. Sayılar kırılan test sayısıdır; birbirleriyle toplanarak farklı test sayısı diye sunulmuyor.

| Geçici üretim bozması | Yakalanan kırılma |
| --- | ---: |
| Owner başlangıcını ilk değerde dondur | 1 |
| Ziyaretçinin seçimini yok say | 5 |
| React cihaz değişimi dinleyicisini kaldır | 2 |
| Canvas viewer'ın slug anahtarını kaldır | 1 |
| İframe seçimini slug değişiminde sıfırlama | 1 |
| Toplu eklemenin undo kaydını kaldır | 2 |
| Toplu eklemede seçimi değiştir | 1 |
| Toplu eklemede açık sayfayı değiştir | 1 |
| Yalnız ilk hedef sayfaya ekle | 2 |
| Flow anahtarını sonda bırak | 2 |
| Yatay üst navbar'ı yok say | 1 |
| HTML dosyalarını canvas hedefi say | 4 |
| Yayın runtime'ının cihaz dinleyicisini kaldır | 1 |
| Device yerine o anki paleti kaydet | 1 |
| Head'de system'i geçerli tercih sayma | 3 |

Odak komutu: `NODE_OPTIONS=--no-experimental-webstorage npm run test:run -- src/utils/colorMode.test.js src/components/renderer/ColorMode.test.jsx src/components/editor/ColorModePanel.test.jsx src/pages/PreviewPage.palette.test.jsx`. Başlangıç ve geri yükleme sonrasında **4 dosya / 91 test** yeşil. Kalıcı kanıt: `runtime-mutation-results.json`.

| Backend bozması | 35 testlik odak paket |
| --- | --- |
| system'i kabul edilen paletlerden çıkar | 1 kırmızı |
| system cookie okumasını kaldır | 1 kırmızı |
| İlk query yerine son değeri al | 2 kırmızı |
| Decode edilmiş query yerine ham regex kullan | 2 kırmızı |
| Validator states:three alanını düşürsün | 1 kırmızı |
| Üç seçeneğin etiketlerini düşür | 2 kırmızı |
| Etiketlerin 80 karakter sınırını kaldır | 1 kırmızı |
| Bilinmeyen states değerini koru | 1 kırmızı |
| Üçlü canvas switch fingerprint'te sayılmasın | Kaçtı; tüm page-live dosyası da 55/55 yeşil |
| HTML choices switch fingerprint'te sayılmasın | Kaçtı; tüm page-live dosyası da 55/55 yeşil |

Backend odak seçimi: `builder/test_published_pages.py::TestRememberingAVisitorsPalette builder/test_validators.py::TestLightAndDark builder/test_page_live.py::TestStatusOfEachPage`. Başlangıç 35/35; restore + üç geçici kontrol 38/38; sonradan eklenen eski-validator karşılaştırmasıyla dört ek kontrol ayrıca 4/4. Tekrar çalıştırıcılar ve sonuçlar kanıt klasöründe `backend_mutations.py`, `backend_fingerprint_mutations.py`, `backend-mutation-results.json` ve `backend-fingerprint-mutation-results.json` olarak bulunur. Çalıştırıcılar üretim dosyalarını geçici bozduğu için eşzamanlı edit olmadan, ayrı bir test checkout'unda tekrar edilmeli; çalışma sonunda geri yüklerler.

## Eski yayımlanmış sayfalar ve yeni cookie/system

Gerçek tarihsel `colorModeScript` writer'ları `git show` ile alınıp çalıştırıldı. Belgeler yerel test kayıtlarında gerçek Django `/s/` ucundan geçirildi. Dönen **15 tam HTTP belge/başlık** `served-head-matrix.json` içinde. Yalnız string araması yapılmadı: gerçek head scriptleri JSDOM parser'ında yürüdü, 15/15 literal beklenti geçti. Cookie `light/dark/system`, encode edilmiş `%73ystem` ve birden fazla query değeri kombinasyonları kullanıldı.

Tasarım/sahip başlangıcı light, cihaz dark için JSDOM sonucu:

| Gerçek writer | Cookie light | Cookie dark | Cookie system |
| --- | --- | --- | --- |
| `9a7b2ec` (cookie okumadan önce) | light | light | light |
| `66f4cf7` (iki yönlü hafıza) | light | dark | light |
| `7a0730b` | light, pick light | dark, pick dark | dark, pick system, follow true |

Eski iki script `%73ystem` query'sinde de sahibin light başlangıcına döndü. `dark` ilk, `light` ikinci değer olduğunda üçü de dark seçti; sunucu cookie'si de dark oldu. Dolayısıyla yeni cookie eski belgeye yeni bir özellik eklemiyor; nottaki sınırlama gerçek. `66f4cf7` validator'ı da ayrı modül olarak çalıştırıldı: eski iki yönlü şema normalize sonucu ve fingerprint'i HEAD ile birebir eşit; istenmeden states/etiket alanları eklenmiyor.

Tarayıcı replay'i Django'ya yeni istek üretmek yerine bu **gerçek kaydedilmiş Django yanıtlarını** sentetik HTTP adreslerinde route ile geri verir; her belge tam bir kez, toplam 15 kez yakalanır ve sayı assert edilir. CSP sandbox korunur, her örnek yeni ziyaretçi context'idir. Native değeri gözlemek için head'den önce bir ölçüm script'i eklenir (`dark-mode-legacy-review.spec.js:12,39`); bu byte eşdeğer, ölçümsüz belge replay'i değildir ve tek başına Firefox zamanlamasının nedenini kanıtlamaz. Wrapper/init script içermeyen ayrı probe bu sınırı ayırır. Mevcut gerçek backend senaryoları ayrı `dark-mode-published-review.spec.js` içindedir. Replay ile canlı endpoint denemesi karıştırılmamalıdır.

## Firefox ilk açılış açıklaması ve reload değişikliği

Kurulu Playwright **1.63.0**, paketlediği Firefox **155.0 / revision 1543**; nottaki elle denenmiş Firefox **159** ile aynı sürüm değildir. Kaynakta context emülasyonu ve Juggler override kurulumu bekleniyor; “bilerek ilk scriptlerden sonra bildirir” yorumu kaynak tarafından desteklenmiş bir garanti değildir. Kurulu `playwright-core/lib/coreBundle.js:45606–45611,45663–45720,45837–45843` context başlangıcını ve `Browser.setColorScheme` cevabını bekler; `45325–45340` page override yoludur. Aynı sürümün birincil kaynakları: [BrowserHandler.js](https://github.com/microsoft/playwright/blob/v1.63.0/browser_patches/firefox/juggler/protocol/BrowserHandler.js#L196), [TargetRegistry.js](https://github.com/microsoft/playwright/blob/v1.63.0/browser_patches/firefox/juggler/TargetRegistry.js#L646). Bunlar gözlenen motor davranışını tek başına açıklamaz.

**S3-F4 · P3 — Gerçek `/s/` ilk-cihaz başarısızlığı doğrulandı; “ilk betiklere geç bildirme” nedeni doğrulanmadı.** Bu, doğrulanmış bir yeni uygulama seçme hatası diye sınıflandırılmıyor; tarayıcı/emülasyon koşulunun nedeni açık. Kaynak konumları `frontend/e2e/theme-switch.spec.js:163–175` ve `docs/DARK-MODE-2026-11-03.md:133–141`. Kaldırma, Firefox'ta ilk açılış beklentisini otomatik doğrulama dışında bırakıyor; yeşil bir tanı testi bu guard'ın yerine geçmez.

Tekrar üretim: `frontend/e2e/dark-mode-browser-probe.spec.js`, iki mevcut tarayıcı projesiyle CI'da çalıştırıldı. Tam sonuçlar `ci-f282fc7/<browser>/initial-device-media-{probe,unwrapped}-attempt-0.json` içindedir. Sentetik HTTP belgeleri gerçek head writer'ını kullanır; Django endpoint'i değildir.

| Ölçüm, her tarayıcıda ayrı | Chromium 153.0.8010.12 | Firefox 155.0 |
| --- | --- | --- |
| Gerçek ilk native matchMedia, wrapper'lı; 8 context / 16 ilk+reload gezinmesi | 16/16 dark | 16/16 dark |
| Context dark ve goto öncesi page dark; plain/sandbox; düz kontrol/gerçek head | Tüm kombinasyonlarda native dark | Tüm kombinasyonlarda native dark |
| Gerçek head palette/pick | dark / system | dark / system |
| Wrapper ve init script olmadan 4 context / 8 gezinme | İlk kontrol true; head dark/system | İlk kontrol true; head dark/system |
| Load sonrası native ve CSS kontrolü, toplam 24 gezinme | 24/24 dark ve siyah CSS | 24/24 dark ve siyah CSS |

İkinci CI'da da aynı ayrım korundu: her tarayıcıda wrapper'lı ilk native **16/16 true**, wrapper'sız load sonrası **8/8 true**. Böylece sentetik/gerçek-uç farkı yalnız iki farklı CI makinesini karşılaştırmaya dayanmıyor; Firefox'un aynı ikinci koşusunda iki tür belge farklı sonuç verdi.

Sentetik belgelerde ilk betiğe tercih geç bildirilmedi; sandbox da sonucu değiştirmedi. **“Playwright Firefox bunu ilk betikte gösteremez” biçimindeki genel gerekçe bu ölçümle desteklenmiyor.** Eski light gözlemi ise uydurma veya yalnız varsayım değildir: `5443ff5` için [tests 41658254511](https://github.com/Ardakorkmaz0/SiteBuilder/actions/runs/41658254511) günlüğü ayrıca okundu; Firefox `theme-switch.spec.js:167` için hem ilk denemede hem retry'da Expected dark / Received light var. O günlük native matchMedia değerini ölçmediği için sebebi Playwright olarak ayırmıyor. Eski artifact/trace incelenmedi; bu eski kanıt günlük ve o commit'in test kaynağıyla sınırlıdır.

İkinci CI'da yeni `frontend/e2e/dark-mode-published-review.spec.js:274` kontrolü gerçek Django yayınıyla, wrapper/init script olmadan, boş context ve `colorScheme:'dark'` ile çalıştı. Firefox'ta ilk deneme ve retry aynı sonucu verdi:

```text
URL: /s/review-first-real-device/?pwb-theme=system
palette: light; pick: system; followsDevice: true; nativeDark after load: false
Expected dark / Received light
```

Chromium aynı gerçek uçta ilk ziyaret ve reload'da `dark / system`, nativeDark true verdi. Firefox'ta ilk assertion kırıldığı için **reload'a ulaşılmadı**. Kanıt `ci-8183339/firefox/published-line-274-evidence-attempt-{0,1}.json`; Chromium için aynı adlı attempt-0 dosyası. Buradaki native okuma head içindeki ilk çağrı değil, `goto` sonrasıdır; gerçek uç için ilk-native/head zaman çizelgesi çıkarılmış gibi sunulmuyor.

Dolayısıyla başarısızlığı gerçekten yeniden ürettim. Fakat yükleme sonrasında bile native false olması ve sentetik kontrollerin dark geçmesi, açıklamayı yalnız “ilk betiklere geç gelir” diye sabitlemeyi desteklemiyor. Son palette değeri yükleme sonrası native light değeriyle uyumlu; gerçek uçtaki ilk head sorgusunun değerini ayrıca ölçmedim. Kaynakta head native sorguyu kullanıyor (`frontend/src/utils/colorMode.js:491`); bu veriden uygulamanın kendi başına yanlış paleti seçtiği çıkmıyor. Context emülasyonu, gerçek servis yanıtı ve motor koşulları arasındaki fark hâlâ ayrıştırılmalı. Bir upstream neden doğrulanmadı. Bu inceleme normal Firefox 159 veya Safari'de aynı hata var demiyor.

Öneri uygulanmadı: Firefox ilk-açılış kontrolünü genel bir motor kuralı gibi dışlamak yerine bu gerçek minimal `/s/` örneğini ve native ölçümünü takip etmek. Yeni guard bilinçli olarak kırmızı bırakıldı; uygulama düzeltmesi veya koşullu beklentiyle gizlenmedi. Bu rapor bir Playwright bug'ının kök nedenini bulduğunu iddia etmiyor.

Reload sonrası etkin dosyaya tıklamanın kaldırılması kaynakta gerçek bir toggle'ı kaldırıyor: aktif dosya Source/View değiştiriyor. `frontend/src/components/editor/PageFilesPanel.jsx:236`, `frontend/src/pages/EditorPage.jsx:2977`, `frontend/src/components/editor/HtmlWorkspace.jsx:1306`. Yeniden yükleme sonrası benzersiz About içeriğinin doğrudan Source'ta beklenmesi (`frontend/e2e/editor-save-stress.spec.js:55–60`), otomatik dosya/kaynak restorasyonunu manuel tıklamayla telafi edemiyor. Bu kontrol zayıflamıyor; manuel telafi yolu kalkıyor. Etkin dosyaya tıklama işlevinin kendisini artık test ettiği iddia edilmiyor; kaldırılan adımın o işlev için ayrı bir sonuç assertion'ı zaten yoktu. CI 41675236868'de iki varyant da Chromium ve Firefox'ta **ilk denemede geçti**: inactive HTML file ve inactive component file. Restore dalına ters mutasyon uygulanmadı; bu değerlendirme kaynak semantiği + gerçek normal koşu ayrımıyla okunmalıdır.

Safari ve sistem Firefox 159 bu incelemede açılmadı; bunlar test edilmiş sayılmıyor. WebKit de çalıştırılmadı.

## CI yürütümü

İlk kanıt commit'i `f282fc7`: [tests 41675236868](https://github.com/Ardakorkmaz0/SiteBuilder/actions/runs/41675236868). Günlük ve iki HTML report artifact'ı indirildi; yalnız özel inceleme JSON'ları kalıcı kanıt dizinine alındı. Body attachment'lar HTML raporunun gömülü ZIP'inden okundu; trace'lerdeki API istek/token bilgileri rapora kopyalanmadı.

| İlk koşu | Sonuç |
| --- | --- |
| Frontend / backend | Yeşil; 2.943 Vitest, 994 pytest; migration kontrolü de yeşil |
| Firefox | 127 passed, 1 failed; toplam 128 (setup dahil); 11,6 dk test yürütümü |
| Chromium | 126 passed, 1 flaky, 1 failed; toplam 128; 13,0 dk test yürütümü |

**İlk kırmızı piksel sonucu ürünün iframe hatası diye kabul edilmedi.** Ham fixture'da `page.background` yoktu; yayın HTML'i backend/store normalizasyonundan önce üretildi. Hem gerçek backend validator hem gerçek store load/import çalıştırıldığında bu alanı `#ffffff` ile doldurdu. Ham writer'da palette dark iken sayfanın son body kuralı düz beyaz kalıyordu; dolayısıyla beyaz piksel tüm sayfaya aitti. `backend/builder/validators.py:774–775`, `frontend/src/store/editorStore.js:1219–1220`, `frontend/src/utils/schemaToFiles.js:942–974`. Store load/import ek kontrolleri 2/2 geçti. `8183339` yalnız test verisine açık sayfa zemini ekleyerek iframe saydamlığını ayırır; üretim düzeltmesi içermez.

Chromium orta-tıklama akışı ilk denemede yeni sayfa olayında 90 sn timeout aldı, tekrarında geçti; Firefox ilk denemede geçti. Bu kararsızlık saklanmadı ve ürün bug'ı diye kesinleştirilmedi. İkinci koşu öncesi About anchor'ının beklenen gerçek href'e sahip olduğu ayrıca assert edildi; gerçek orta-tıklama hareketi korundu.

İlk koşuda altı UI testi iki tarayıcıda da geçti. İkisinin yalnız tanı ölçümü olduğu özellikle belirtilmelidir: karma tercihte iki `matchesExpected:false`, dikey navbar'da `y:616` kaydedildi. Yeşil CI bu açık farkları düzeltmiş sayılmaz.

İkinci kanıt commit'i `8183339`: [tests 41678281854](https://github.com/Ardakorkmaz0/SiteBuilder/actions/runs/41678281854). Piksel fixture düzeltmesi, gerçek `/s/` wrappersız ilk-cihaz guard'ı ve başarılı koşularda HTML body eklerini de saklayan kanıt yükleme adımı. Günlük ve iki kanıt artifact'ı indirildi ve okundu.

| Son koşu | Gerçek sonuç |
| --- | --- |
| Lint / Vitest / build / migration check / pytest | Yeşil; 2.943 Vitest ve 994 pytest |
| Chromium | **129 passed**, flaky yok, skipped yok; 9,3 dk test yürütümü |
| Firefox | **128 passed / 1 failed**, flaky yok, skipped yok; 13,5 dk test yürütümü |
| Yeni Firefox başarısızlığı | Gerçek `/s/` ilk cihaz isteği; ilk deneme ve retry light, nativeDark false |
| HTML blok pikseli | **İki tarayıcıda da `[17,19,23,255]`**, ilk denemede geçti |
| Orta tıklama / yeni sekme | İki tarayıcıda bu koşuda ilk denemede geçti; ilk koşunun Chromium kararsızlığı silinmedi |

Sayılar setup testini içerir. Kalıcı özel JSON'lar `ci-8183339/<browser>/` altındadır; `run-summary.json` ve `review-test-outcomes.json` deneme sayılarını da saklar. **Son CI yeşil değildir.** Üretim kodunu düzeltmeme talebi kapsamında bu gerçek kırmızı sonuç raporlandı.

## İstenen altı senaryonun yürütüm dökümü

| Senaryo | Çalıştırılan kanıt ve sonuç |
| --- | --- |
| 1. Üç seçenek / oklar / tek Tab | Yerel gerçek UI ArrowRight+Tab; CI yeni guard ArrowRight+Tab+ShiftTab, mevcut theme-switch testi ArrowLeft; iki tarayıcı geçti. Tek tabindex=0 ve seçili radyoya dönüş assert edildi. |
| 2. Açık sayfada cihaz değişimi / explicit tercih | Gerçek `/s/` + native media emülasyonu: Device light↔dark izledi; explicit Light/Dark değişmedi, iki animation frame sonrasında da kontrol edildi; iki tarayıcı geçti. İlk ziyaret farkı S3-F4'te ayrı. |
| 3. Sonraki sayfa / ikinci ziyaret / yeni sekme / ayrım | Gerçek API yayını: cookie yazdıran sayfalar, parametresiz ikinci ziyaret, cookie yazdırmadan önce orta tıklama, başka B'nin light cookie'si, boş ikinci ziyaretçi context'i; iki tarayıcı son koşuda geçti. Device de yeni sekmede system olarak okundu. |
| 4. Karma site / flow / tek undo / seçim | Gerçek EditorPage+ek Theme paneli: `[0,0,0]→[1,1,0]`, yalnız iki canvas hedef; flow sırası navbar/themeToggle/heading/text; açık sayfa/seçim eklemede aynı. Tek gerçek Ctrl+Z içeriği geri aldı, açık sayfa aynı, genel undo seçimi temizledi. İki tarayıcı geçti; aktif Flow+başlık seçimi yerelde ayrıca denendi. Dikey navbar açık bulgu. |
| 5. `/site` A→B / owner değişimi | Aynı mounted PreviewPage route'unda gerçek API: canvas ve iframe A dark→B light, iki tarayıcı geçti. Gerçek ColorModeRoot owner prop dark değişimini izledi; Visitor Light sonrası owner Device tercihi bozmadı. Bu son bölüm sunucu push/poll testi değil. Aynı sitenin canvas↔HTML geçişi S3-F1'de bozuk. |
| 6. HTML blok beyaz kutu | Gerçek yayın+iframe içeriği+native screenshot: iki tarayıcıda koyu köşe pikseli ve sayfa görüntüsü doğrulandı. İlk fixture hatası ayrıca açıklandı; ilk beyaz sonucu ürün hatası sayılmadı. |

## Yerel temizlik ve sınırlar

Yalnız incelemeye ait deneme hesabından normal UI ile çıkıldı. Başlatılan 8001/5173 sunucuları durduruldu; portların boş olduğu `ss` ile doğrulandı. Ayrı SQLite dosyası silindi; yalnız `/s/review-a/` ve `/s/review-b/` yollarındaki deneme çerezleri HTTP Max-Age=0 yanıtıyla kaldırıldı. Açılan iki deneme sekmesi kapatıldı; sahibin sekmeleri kapatılmadı. Üretim verisi/servisi kullanılmadı ve canlıya alma yapılmadı.

Eklenen testler bu incelemenin kanıtıdır; Claude tarafından yeni test paketine bağımsız çapraz inceleme yapılmış gibi sunulmaz. Bilinen iki arayüz hatası düzeltilmedi. Üretim dosyalarındaki geçici bozmalar geri alındı; `git diff 7a0730b -- frontend/src backend` boş. Kalıcı farklar testler, fixture'lar, kanıtlar, rapor ve CI kanıt yükleme adımıdır.
