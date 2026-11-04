# Üretilen kaynak incelemesi — 4 Kasım 2026

Başlangıç HEAD `180bc6639823cc1656f8f0a09b30e1e4ef5da6ad`. İncelenen aralık `7b109fe..77a59e2`; HEAD'in bunun üzerindeki tek farkı inceleme planıdır. Başlangıçta çalışma ağacı temiz, `git pull --ff-only`: Already up to date.

Çalıştırılarak bulunan ürün sorunları: **A-F1/A-F2/D-F1/E-F2 P2**, **D-F2/E-F1 P3**. B-F1/B-F2 ayrıca test kapsamındaki kayıplardır; üretim hatası diye sayılmadı. Kanıt kaynakları, JSON'lar, test çıktıları ve ekran görüntüleri `docs/review-evidence/generated-source-2026-11-04/` altındadır. Bulgular yazara bırakıldı; düzeltme uygulanmadı. Bu ilk incelemenin özetidir; düzeltmelerin yeniden kontrolü aşağıdaki **41978ae kontrolü** bölümündedir.

Üretim sunucusuna istek gönderilmedi; üretim verisi kullanılmadı. Bozma denemeleri ayrı `/tmp` kaynak kopyalarında yapılıyor ve özgün byte'lar geri yükleniyor. Ana checkout'ta üretim kodu değiştirilmiyor. Kaynak kopyaları arşivden, bağımlılıklar mevcut node_modules'den; paket kurulumu yok.

## Genel doğrulama

Gerçekten çalıştırıldı: frontend `npm run lint`, `NODE_OPTIONS=--no-experimental-webstorage npm run test:run`, `npm run build`; backend `.venv-linux/bin/python -m pytest -q`. Sonuçlar: **317 dosya / 3.114 Vitest geçti**, **998 pytest geçti / 766 uyarı**, lint ve build başarılı; mevcut büyük chunk uyarısı var. Vitest 80,21 sn, pytest 205,85 sn. Model değişikliği yok.

`77a59e2` için mevcut [CI 41733411853](https://github.com/Ardakorkmaz0/SiteBuilder/actions/runs/41733411853) günlüğü indirildi ve okundu: Chromium **134 passed (11,9 dk)**, Firefox **134 passed (11,0 dk)**, flaky satırı yok. Bu, yazarın önceki CI koşusunun okunmasıdır; bu incelemede yeniden çalıştırılmış E2E değildir. Yeni/değiştirilmiş E2E eklenmedi. Safari denenmedi.

## A — Üretilen kodun azaltılması

Durum: ilk inceleme tamamlandı; aşağıdaki sınırlarla. İddialar ölçüm yerine kullanılmadı.

### Ölçüm

`generatedSize.test.js` içindeki dört bloklu plain fixture aynı değerlerle gerçek `publishedPagesFor`, `schemaToSingleHtml`, `schemaToResponsiveHtml`, `schemaToFiles` üzerinden hem `7b109fe` hem `77a59e2` kodunda çalıştırıldı. UTF-8 byte; satır `split('\n').length`.

| Çıktı | 7b109fe byte / satır | 77a59e2 byte / satır |
| --- | --- | --- |
| Yayın HTML | 55.497 / 948 | 11.297 / 209 |
| single writer | 55.506 / 948 | 11.306 / 209 |
| responsive writer | 52.272 / 894 | 8.065 / 149 |
| index.html | 1.647 / 39 | 1.647 / 39 |
| styles.css | 13.702 / 92 | 4.473 / 55 |
| runtime.js | 35.371 / 753 | 3.153 / 84 |

Bu fixture'da azaltma gerçek. Notta yazılan 971/210 satır değerlerini aynen doğruladım denmiyor; yeniden ölçülen değerler bunlar.

### A-F1 · P2 — `>` içeren önceki öznitelik satır içi işleyiciyi algılamadan kaçırıyor

Dosya: `frontend/src/utils/htmlRuntime.js:856,871–873` (`AUTHOR_SCRIPT`). Kaynak düzenleme/import yolunda yazılabilen geçerli HTML; yalnız işaret araması değil, üretilen betik JSDOM'da çalıştırıldı.

1. Sayfaya `title="a>b"` ve `onclick` taşıyan Add düğmesi koyun. İşleyici, HTML entity ile kodlanmış formu `insertAdjacentHTML` ile eklesin. Başlangıç belgesinde form bulunmasın.
2. Gerçek `withBuilderInteractiveHtml` ile belgeyi üretin ve çalıştırın.
3. Add'e tıklayın; form gerçekten oluşur. Cancelable submit olayı gönderin.
4. Gözlenen: bütün `runtimeNeeds` değerleri false; `submit.defaultPrevented=false`, form işleyicisi gelmemiş. Beklenen: sahibin işleyicisi bulunduğu için tam runtime ve submit işlenmesi.
5. Tek fark olarak title'ı `ab` yapın: bütün ihtiyaçlar true, aynı form oluşur, submit prevented **true**.

Tam kaynak ve sonuç kanıt dizininde `author-probe.mjs`, `author-proof.json`. Sabit regex öznitelik içindeki `>` karakterini tag sonu gibi ele alıyor. Üretim düzeltmesi yapılmadı.

### A-F2 · P2 — Kaynağa eklenen form proje ZIP'inde gerekli runtime'ı alamıyor

Dosya: `frontend/src/components/editor/CodePanel.jsx:99,318–327`. Gerçek store + gerçek CodePanel + gerçek ZIP üreticisiyle Testing Library üzerinden çalıştırıldı.

1. Custom JS/CSS olmayan, yalnız boş canvas sayfası açın.
2. Source/index.html alanına `<form><input name="email"><button>Send</button></form>` ekleyin; Apply yapmadan Export → Editable code project seçin.
3. Gerçek ZIP üreticisine giden index.html formu içerir, runtime.js `postToInbox` içermez. Dosyaları aynı asset inlining işlemiyle JSDOM'da çalıştırın ve gerçek submit olayı gönderin.
4. Gözlenen submit prevented **false**; beklenen true. Ek kontrol kırmızı: 1 failed. ZIP üreticisi mock davranışı konu yapılmadı; spy gerçek `zipFiles` fonksiyonunu da çalıştırır, dosyaları yakalamaya yarar.

HTML draft dosyaları değiştirilirken runtime dosyası yalnız schema'dan hesaplanan eski `rawGeneratedFiles` içinden kopyalanıyor. Bu bulgu, tuvalden HTML'e dönüştürme sonrası yayınlamanın da bozuk olduğunu iddia etmez; doğrudan Source draft → proje ZIP yolu.

### Testlerin gücü / sağlıklı alanlar

`generatedSize.test.js` sağlam kodda **51/51** geçti. Dört ayrı bozma ve aynı test dosyasının gerçek sonuçları:

| Bozma | Kırılan test |
| --- | ---: |
| Her sayfa bütün ihtiyaçları taşısın | 20 |
| forms ihtiyacı hiçbir zaman algılanmasın | 4 |
| Sonradan eklenen ihtiyaç için eski shim yenilenmesin | 3 |
| Satır içi işleyici algılama tamamen kaldırılsın | 1 |

Geri yükleme sonrası **51/51** tekrar yeşil. Bu dört bozmanın hepsi yakalandı; A-F1'in özel `>` sınırı mevcut testlerde yok, A-F2 normal paketler yeşilken bağımsız kontrolde kırmızı.

Dokuz runtime bölgesinin **512 birleşimi** gerçek `builderInteractiveJs` ile üretildi: 512 derleme ve 512 JSDOM başlangıcı geçti. Bunlar sözdizimi/başlangıç kontrolleridir; her özelliğin etkileşimli davranışının 512 birleşimde doğrulandığı anlamına gelmez. Mevcut testteki “her parça çıkarılınca çalışır” tek boş kombinasyondur; yeni kontrol bunun ötesindedir.

Sınırlar: bütün customHead/customCss/CSS sözdizimi birleşimleri, gerçek browser çizimi ve tam undo→yeniden yayın yaşam döngüsü bu bölümde bağımsız olarak yürütülmedi. Mevcut converted-page E2E'nin önceki yeşil koşusu okundu. CSS helper'ının rastgele el yazısı seçicilerdeki sınırları, editörün ürettiği bir sayfayı bozduğu gösterilmeden ürün bulgusu sayılmadı. Eski yayımlanmış gerçek sitelere GET gönderilmedi.

## B — Önceki testlerdeki değişiklikler

B incelemesi ve eski Firefox ölçümünün yeniden koşusu tamamlandı.

### B-F1 · P3 — Orta tıklama testinin sekme açılmasını doğrulama gücü azalmış

`frontend/e2e/dark-mode-published-review.spec.js:176–187`: gerçek auxclick yapılmaya devam ediyor, yeniden yazılan href assert ediliyor. Fakat ardından `context.newPage()` ve `goto()` test tarafından çağrılıyor. Tarayıcının hareket sonucu sekme açtığını artık doğrulamıyor.

Çalıştırılan karşı örnek: gerçek üretilmiş runtime'a sahip JSDOM sayfasında auxclick'e `preventDefault()` ekledim. Sonuç: olay **canceled=true**, buna rağmen href doğru `.../about/?pwb-theme=dark` oldu; testin elle açacağı adres hâlâ doğru. Mevcut yeni gözlemler iptal edilmiş açılmayı ayıramaz. Bu, mevcut Playwright spec'i CI'da mutantla koşulmuş demek değildir; yeni guard'ın gözlediği değerlerin davranış kaybına rağmen aynı kaldığı gerçek runtime ile gösterildi. `B-probe.mjs` / `B-proof.json`.

### B-F2 · P3 — toPass ilk tıklamanın kaybolmasını gizleyebilir

`frontend/e2e/dark-mode-ui-review.spec.js:157–163`. Gerçek üçlü anahtar/runtime üzerinde ilk Dark click'ini capture aşamasında tek kez durdurdum. Aynı `@playwright/test` expect.toPass tekrar düzeni **2 tıklamada geçti**. Böylece ilk hareket kaybını artık korumadığı doğrulandı. Bu bir gerçek görüntüleyici hatası bulunduğu iddiası değildir; nottaki 12'de 1 / 40'ta 0 oranları bağımsız tekrar edilmedi. Site A'dan B'ye geçerken seçimin sıfırlanması koşulu hâlâ tek başına assert ediliyor; o amaç için setup'ın tekrar denenmesi testi bütünüyle değersiz yapmıyor.

### Güçlenen / korunan kontroller

- İki diagnostic, artık canvas→HTML ve geri geçiş için açık palette/pick; dikey navbar için literal y=24 assert ediyor. Önceden yalnız JSON'a yazılıyordu. Gerçek onChoose bildirimini kaldırdığım mutasyon PreviewPage.palette + ColorModeRoot dosyalarında **3 test kırdı / 16 geçti**.
- Dikey navbar ayrımını kaldıran mutasyon yalnız ColorModePanel unit dosyasında **19/19 yeşil** kaldı. Bu dar unit dosyasının boşluğudur; yeni E2E y=24 assertion'ının da yeşil kalacağı ileri sürülmüyor. Mutant E2E çalıştırılmadı.
- html-editor görsel kontrolündeki poll literal sonucu değiştirmiyor: srcset ve data-src yok; currentSrc=src. Native yükleme tamamlanmasını beklemek, yanlış resmi doğru kabul eden bir tolerans eklemiyor. Bu değerlendirme spec değişikliği + mevcut iki tarayıcı koşusuna dayanır; bağımsız görsel mutation browser koşusu yapılmadı.
- Firefox artık ilk yüklemede test dışı değil; ayrı tarayıcı `firefoxUserPrefs` ve `colorScheme:null` kullanıyor. Mevcut 77a59e2 CI'da guard geçti. Bu gerçek cihaz tercihli otomatik Firefox'tur; sistem Firefox 159 denemesi diye sunulmuyor.

COOP iddiası için, silinmeden önceki gerçek TCP sunuculu ölçümü içeren `845ec22` Firefox işi **yeniden çalıştırıldı**: [41686410758, attempt 2](https://github.com/Ardakorkmaz0/SiteBuilder/actions/runs/41686410758/attempts/2). Yeni/değiştirilmiş E2E yok. Aynı gövde ve ayrı boş context'lerle `colorScheme:dark` altında yeniden elde edilen çıktı:

```json
[{"path":"plain","palette":"dark","darkAfterLoad":true},
 {"path":"coop","palette":"light","darkAfterLoad":false}]
```

İlk ölçüm denemesi 90 sn timeout; retry 1,9 sn'de bu farkı üretti. Gerçek cihaz tercihiyle ilk `/s/` guard'ı 2,8 sn'de geçti. Yeniden çalıştırılan Firefox işinde **129 passed + 1 flaky (14,9 dk)**; iş yeşil ama kararsızlık saklanmadı. Chromium bu işlemde yeniden çalıştırılmadı; aynı eski koşunun yeniden kullanılmuş Chromium çıktısı yeni ölçüm diye sunulmuyor.

Sonuç: COOP ile birlikte emülasyonun farklılaşması yeniden üretildi. “İlk betiklere geç gelir” eski açıklamasına dönülmemeli. Yeni browsing context'e geçerken emülasyonun kaybolması mekanizması ayrıca ölçülmedi. Silinen ölçümün kapsamı teşhis; yeni gerçek-preference guard ise uygulamanın cihaz teması davranışını koruyor. Dolayısıyla bu değişiklik Firefox'u tekrar kapsama alıyor, fakat context emülasyonundaki farklı davranışı regresyon guard'ı yapmıyor. `COOP-rerun.txt` yalnız bu kez yeniden yürütülen Firefox satırlarını içerir.

## C — Aşama 5

C kaydedildi. Bu bölümde doğrulanmış yeni üretim hatası yok; aşağıdaki gözlemler ve sınırlar var.

- Gerçek backend `validate_and_clean_schema` çağrıldı: src ve srcOther için HTTPS, PNG data URI ve protokolsüz dış adres kabulü aynı; javascript ve data:text/html ikisinde de reddedildi. DB kaydı/sunucu isteği oluşturulmadı (`C-validator.json`).
- Gerçek store load→copySelection→pasteClipboard→projectSnapshot→importSchema denemesi srcOther'ı iki kopyada da korudu. Bağımsız iki Vitest kontrolü **2/2 geçti** (`C-probe.test.jsx`).
- Alternate image üretimini kaldırmak mevcut colorMode testinde **3 kırmızı / 138 yeşil**; iframe load release çağrısını kaldırmak **1 kırmızı / 140 yeşil**; head'deki browser bar güncellemesini kaldırmak **1 kırmızı / 140 yeşil** üretti. Her bozma geri alındı.
- Gerçek publishedPagesFor çıktısı, ayrı yerel Vite sunucusunda in-app Chromium ile açıldı. Üretim/Django sunucusu kullanılmadı. Normal runtime ile koyu sayfanın iframe'i visible oldu. Yalnız interactive runtime kaldırıldığında ilk gözlem: palette dark, wait=true, animation=pwb-frame-in, visibility hidden; sonraki gözlem visible. CSS üç saniyelik geri dönüşüyle kalıcı görünmezlik yeniden üretilmedi. Tam üç saniye süre ölçümü yapılmadı; CSS delay değeri ve iki ayrı gerçek DOM gözlemi var (`C-browser.json`, `C-fallback.png`). İlk boyasızlık/flicker için screencast yapılmadı.
- Çoklu media theme-color etiketinde gerçek head/runtime ilk light etiketini #111317'ye çevirdi; ikinci dark etiketi #222222 kaldı. Bu yalnız DOM ölçümüdür (`C-meta.json`); gerçek tarayıcı çubuğunun hangi rengini çizdiği ölçülmedi. Çoklu tag desteği doğrulandı denmiyor. Tek meta ve meta yok yollarının mevcut testleri normal pakette geçti.
- Medya silme yolu hem src hem srcOther için kullanıldığı yerdeki URL'yi yeniden yazmıyor: UploadedImageViewSet.perform_destroy dosyayı siliyor. Yeni srcOther'a özgü bozulma gösterilmedi; silme ucu bu incelemede çalıştırılmadı. Blok kütüphanesi paylaşma UI'sı, gerçek ZIP'in görsel dosyalarını ağdan yüklemesi, ekran okuyucunun native erişilebilirlik ağacı ve yazdırma denenmedi. İki img için sadece birinin CSS display aldığı önceki E2E/normal unit kapsamıdır; CSS tamamen yüklenmezse iki görselin de çizilebilmesi sınırı giderilmiş değil.
- Lazy offscreen iframe ve bfcache geri dönüşü bağımsız yürütülmedi. Safari ve Firefox ilk-boya/flicker kontrolü yapılmadı.

## D — Aşama 4

D kaydedildi. Aşağıdaki gerçek karşı örnekler bulundu.

### D-F1 · P2 — Yüzde 50 altını tek başına tint saymak yazı kontrastını düşürebiliyor

Dosya: `frontend/src/utils/colorMode.js:411,419–428` (FAINT ve mapValue) / mapStyles. Gerçek eski ve yeni üretim fonksiyonları aynı schema ile çalıştırıldı; sonuç stilleri aynı gerçek Chromium sayfasında çizildi.

1. Tasarlanan tema: beyaz zemin, textColor `#111111`. Card stilleri: `backgroundColor:'rgba(255,255,0,0.49)'`, `color:'#111111'`.
2. Diğer palette: sayfa zemini `#111317`, textColor `#e8edf4`; koyu açılış.
3. `7b109fe` writer koyu yazıyı korur. `77a59e2` background'u aynı bırakıp yazıyı `var(--pwb-alt-text, #111111)` yapar.
4. Native computed style: eski `rgb(17,17,17)`, yeni `rgb(232,237,244)`; her iki kutu `rgba(255,255,0,.49)` ve alt zemin `rgb(17,19,23)`.
5. Bu gözlenen renklere bağımsız sRGB alpha-composite + WCAG luminance hesabı uygulandı: **4,9079:1 → 3,2706:1**. Beklenen, eski okunabilir örneğin yeniden üretimde 4,5 sınırının altına düşmemesi. Screenshot `D-contrast.png`, değerler `D-browser.json`, hesap `D-ratios.json`; gerçek writer girdisi `D-probe.mjs`.

Bu ekran görüntüsünün pikselinden kontrast ölçümü yapıldı demek değildir: native computed renkler ve bilinen tek alpha katmanıyla hesap yapıldı. CSS/backdrop/filter olmayan iki düz kutudur. Bu bir önerilmiş tema sorunu değil; bileşenin gerçek özel rengi üstündeki değişikliktir.

### D-F2 · P3 — HSL açı birimi sayıya çevrilirken kayboluyor

Dosya: `frontend/src/utils/colorMode.js:105` (`parts.slice(0,3).map(parseFloat)`). `parseColor('hsl(.5turn 100% 50%)')` gerçek sonucu **#ff0200**; aynı CSS'yi Chromium **rgb(0,255,255)** çizdi. `.5turn=180deg` için beklenen **#00ffff**. `120deg` doğru okunuyor; `turn` genel parseFloat ile `.5` derece gibi ele alınıyor. Bu geçerli, kaynakta yazılabilen bir CSS değeridir. Üretim düzeltmesi yapılmadı.

### Sağlıklı kontroller / mutasyonlar

- `rgb(0 0 0 / 50%)` → #000000/0,5; `hsl(120deg 100% 50%)` → #00ff00; büyük harf/boşluk/aralık taşması `RGB(300 -2 0 / 200%)` → #ff0000/1. `transparent` null (bu parser'ın rol eşleştirmemesi; tek başına hata sayılmadı). Geçersiz rgb(1px 2px 3px) ise #010203 olarak kabul edildi; geçersiz CSS'ye tolerans gözlemi kaydedildi, ek kullanıcı akışı etkisi doğrulanmadı.
- 25 preset gerçek suggestedAltTheme ile üretildi; bağımsız kontrast formülüyle buttonTextColor/primaryColor minimumu **4,52395:1**. Bu dar textOn iddiası doğrulandı; her bloğun kontrastı denmiş sayılmıyor.
- Tamamı beyaz dokuz role yedi çiftin literal beklenen hata listesiyle karşılaştırıldı: text/background, text/surface, muted/background, buttonText/primary, headerText/header, primary/background, accent/background; oranlar 1 ve eşikler 4,5 / 3 doğru.
- FAINT=0 bozması mevcut pakette yakalandı; textOn'un daima white dönmesi **11** testi, kontrast uyarısının tamamen kaldırılması **3** testi kırdı (`D-mutations.json`).
- Color-mix desteklemeyen gerçek bir tarayıcı açılmadı; declaration düşmesi ve bunun bütün sayfalardaki görsel sonucu doğrulanmış sayılmadı. Tüm eski yayınlar yeniden gönderilmedi; D-F1 yalnız aynı gerçek fixture'ın iki writer sürümüyle kontrollü karşılaştırmasıdır.

## E — Sayfa menüsü ve renkli kaynak

E kaydedildi. Native kontroller yalnız in-app Chromium'da, `/tmp` kopyasındaki gerçek PublicToolbar ve CodeField bileşenleriyle ayrı harness sayfasında yapıldı. Bu sayfa gerçek site API'si/editorünün tamamı değildir. Fixture düğmeleri yalnız props ve deneme girdisi sağlar; üretim kaynak dosyaları aynı kalır.

### E-F1 · P3 — localStorage engelliyken renk düğmesi kapanmıyor

Dosya: `frontend/src/components/editor/useCodeColors.js:8–9,17–19`. Bellekte fallback tercih yok; read hatasında daima true dönüyor.

1. Renkli CodeField + CodeColorsToggle açın. Tarayıcıda storage getter'ı SecurityError verecek şekilde test düğmesiyle engellensin.
2. “Renkli kod” düğmesine basın.
3. Gözlenen: aria-pressed **true**, renkli katman hâlâ mevcut. Beklenen: bu sekmede renk kapansın; yalnız kalıcı hatırlama çalışmayabilir.
4. Aynı durum gerçek bileşenleri süren bağımsız Vitest'te de **1 kırmızı** üretti (beklenen false / alınan true). `E-storage.json`, `E-storage.png`, `E-probe.test.jsx`.

Tarayıcının gerçek gizlilik ayarı değiştirilmedi; hata getter/setter üzerinden kontrollü enjekte edildi. Normal tarayıcı engelinin birebir kullanıldığı söylenmiyor. Deneme sonrası descriptor ve özgün tercih geri yüklendi.

### E-F2 · P2 — 200 KB alt sınırı vurgulayıcının ağır geri izleme girdisini durdurmuyor

Dosya: `frontend/src/utils/syntaxHighlight.js:42–43` (kapanmış yorum arayan regex) ve `frontend/src/components/editor/CodeField.jsx:13,27` (deferred olsa da ana thread'de highlightCode).

1. CSS kaynak alanına `'/*x'.repeat(66000)` koyun: 198.000 ASCII byte/karakter, sınırın altında. Bu tamamlanmamış yorum girdisidir.
2. Gerçek highlightCode fonksiyonunu Node'da çalıştırın: 999 karakter 0,78 ms; 9.999 → 3,66 ms; 49.998 → 90,23 ms; **198.000 → 1.503,57 ms**. Ölçüm tek makine/tek seri; istatistiksel benchmark değildir (`E-speed.mjs`, `E-speed.jsonl`).
3. Aynı girdi native CodeField'e yüklendi. Sonrasında gerçek x girişi sonunda textarea 198.001, katman 198.002 ve textContent=value+newline oldu. Kontrol sırasında CDP odak komutu zaman aşımı verdi; sonraki DOM okuması tamamlanmış kaynağı gösterdi. **Kesin native tuş gecikmesi ölçülmedi** (`E-large.json`).

Beklenen: koruma altında kalan kaynak, her boyamada saniyelik sözdizimi taramasına yol açmamalı. useDeferredValue işi başka thread'e taşımıyor. Bu sonuç bütün normal 198 KB dosyalar yavaş demek değildir; eksik kapanan yorum örüntüsüne ait tekrarlanabilir ağır girdidir. Code colors kapatmak bir kullanıcı kaçışıdır; E-F1 durumunda o da çalışmıyor.

### Sağlıklı alanlar / sınırlar

- Bağımsız 12 XSS/text round-trip (4 payload × HTML/JS/CSS) geçti: `<img onerror>`, kapanan script + yeni script, SVG onload, `<>&` ve Türkçe içerik. Üretilen markup'ı JSDOM'a parse edince canlı img/script/svg çıkmadı; textContent kaynakla aynıydı. Bu parser/sink kontrolüdür; ağ üzerinden saldırı yapılmadı.
- Esc hook'unu kaldırmak mevcut menü testinde **1 kırmızı / 6 yeşil**; dikey scroll eşitlemesini kaldırmak **1 kırmızı / 8 yeşil**; escaping'i kaldırmak syntaxHighlight+CodeField paketinde **6 kırmızı / 19 yeşil** verdi. Geri alındı.
- Native menüde Tab kapatma düğmesine gitti, Esc listeyi kapattı ve odağı “Tüm sayfalar (12)” açanına döndürdü. Dört sayfada liste düğmesi yok, beşte var.
- Uzun aktif sayfaya geçerken document scrollTop **0** kaldı. Aktif buton satırın solunda görünür oldu; 160 px butonun sağ kenarı dar 116 px satır bölgesini ~44 px aştı. Bu dar masaüstü geometrisinin sınırı kaydedildi (`E-menu.json`); tüm başlığın görünür olduğu iddia edilmedi.
- 390×844 viewport ve doğru viewport metasıyla, 12 sayfada All pages düğmesi yok; sekme satırı korunuyor. İlk harness'ta viewport metası yokken yapılan çelişkili ara ölçüm, ürün bulgusu sayılmadı; fixture düzeltildi ve tekrar ölçüldü (`E-mobile.json`). Viewport sonra sıfırlandı.
- Kısa kaynakta gerçek `şğıİ` yazıldı: 1.315→1.319 karakter. Native Ctrl+Z son karakteri, dört ayrı undo toplam eklemeyi geri aldı: tekrar 1.315. Browser undo gruplamasının tüm diziyi tek adımda alacağı iddia edilmedi.
- Native textarea ve renkli pre: aynı monospace font, **13 px / 24 px satır / tab-size 4 / clientWidth 585 px**; scrollTop ikisinde **259,33**, scrollLeft ikisinde 0. Bu fixture'da gerçek yatay scrollbar hareketi oluşmadı; yatay kaydırmanın bütün durumları doğrulandı denmiyor (`E-alignment.json`).
- Ekran okuyucu yazılımı, yazdırma, Safari, Firefox'ta native CodeField hizası ve farklı işletim sistemi fontları açılmadı.

## Son durum ve sınırlar

A–E'nin yukarıda belirtilen kontrolleri tamamlandı ve her bölümün sonunda bu dosyaya kaydedildi. Üretim düzeltmesi yok. **15 seçilmiş mutasyonun 14'ü hedeflenen mevcut unit testlerini kırdı; dikey navbar mutasyonu dar panel unit dosyasında yaşadı** (ilgili E2E'nin de kaçırdığı söylenmedi). Mutasyonlar geri yüklendikten sonra 8 odak dosyada **262/262** test geçti. Ayrı kaynak kopyasındaki 652 tracked frontend/src dosyası ana checkout'la byte olarak karşılaştırıldı: **fark yok** (`source-restore.json`).

Ana checkout'ta `git diff -- frontend/src backend` boş; `git diff --check` geçti. `git status --short` yalnız bu rapor ve inceleme kanıt dizinini gösterdi. Native UI deneme sekmesi kapatıldı, viewport sıfırlandı, bozulmuş storage descriptor'ı ve özgün tercih geri kondu. Başlatılan yerel Vite durduruldu; 5173/8001 portları boş. Uygulama hesabı veya ayrı kalıcı SQLite oluşturulmadı; backend işlemleri normal izole pytest veritabanı ve DB'siz validator çağrılarıydı.

Planın her alt sorusunun bütün kombinasyonları tüketildi diye bir iddia yok. Çalıştırılmayanlar ilgili bölümde açıkça listelendi: özellikle A tam undo→yeniden yayın yaşam döngüsü ve tüm customHead/CSS sözdizimleri; C lazy/bfcache, ekran okuyucu/yazdırma ve kütüphane uçtan uca akışları; D eski color-mix desteği; E gerçek yatay scrollbar ve diğer tarayıcı/fontlar. Safari hiç denenmedi. Bu alanlar bir sonraki inceleme için açıktır; burada sağlıklı diye işaretlenmedi.

## 41978ae kontrolü

Son karar: altı ilk karşı örnek düzeldi. D-F1 için yeni bir **P2 kontrast gerilemesi**,
E-F2 için iki **P3 renk doğruluğu gerilemesi** bulundu. A-F1’in script dalında ise önceki
sürümden kalan yanlış negatif/yavaş girdi sınırı sürüyor. Testlerin yeşil olması bu sınırları kapatmıyor.

Tarih: 4 Kasım 2026. Bu bölüm ilk incelemenin devamıdır; yukarıdaki ilk rapor değiştirilmedi.
`git pull --ff-only`: güncel; başlangıç HEAD `4e8cd8b`, incelenen üretim kodu `41978ae`.
Önce duyarlı yerleşim planının incelemesi ve farklı tuval örnekleri tamamlanıp kendi raporuna
kaydedildi; ardından bu düzeltme kontrolüne geçildi.

Bütün bozma denemeleri `git archive 41978ae frontend` ile oluşturulan bağımsız `/tmp` kopyalarında
çalıştı. Kaynak düzeltmesi uygulanmadı, üretim sunucusuna istek gönderilmedi. A/E kontrolleri
ayrı inceleme kopyalarında paralel yürütüldü; aşağıdaki çalıştırma sonuçları bunların kayıtlarından
birleştirildi. Kod, test veya yeni kanıt dosyası commit edilmiyor; bu devamın kanıt girdileri,
komutları ve sonuçları raporun içinde veriliyor.

### A-F1: bildirilen handler hatası düzeldi; eski script dalında sınır sürüyor

Yeni handler dalı `frontend/src/utils/htmlRuntime.js:857` üzerinde gerçek `runtimeNeeds` ve
`withBuilderInteractiveHtml` ile çalıştırıldı; sonuç JSDOM'da scriptler etkin olarak yürütüldü.
Başlangıç belgesinde gerçek form yok; Add işleyicisi entity ile kodlanmış formu ekliyor.
Düğmeye click ve oluşan forma cancelable submit gönderildi.

Double/single quoted `title="a>b"`, mixedcase, newline/tab/eşittir boşlukları, slash separator,
bitişik quoted attribute ve title içinde tag/quote benzeri metin dahil **8/8** örnekte ihtiyaçlar
true, form gerçekten oluşuyor ve submit prevented=true. Aynı gerçek eski fonksiyonla ilk yedi
örnekte form oluşuyor fakat needs=false ve submit prevented=false. Sekizinci örneği eski regex
de yakalıyordu. Slash ve bitişik attribute örnekleri tarayıcı parser'ının toparladığı yazımlardır;
hepsini standartlara uygun HTML diye nitelemiyorum. Bu örneklemde yeni handler dalının yanlış
negatifi bulunmadı; bütün HTML/JS sözdizimi için garanti verilmiyor.

**Önceden var olan P2 sınır:** İlk, değişmeyen script alternatifi marker'ı gerçek attribute
olmadan quoted title içinde de görüyor. Tekrar girdisi:

```html
<!doctype html><html><head></head><body><script title="data-builder-layout">document.body.insertAdjacentHTML("beforeend",String.fromCharCode(60)+"form>"+String.fromCharCode(60)+"input name=email>"+String.fromCharCode(60)+"/form>")</script></body></html>
```

Script'te builder attribute'u yok. Gerçek `runtimeNeeds` dokuz ihtiyacı da false sayıyor;
`withBuilderInteractiveHtml` çalıştırılınca form oluşuyor fakat submit prevented=false.
Yalnız title değerini `plain` yapınca needs=true ve submit prevented=true. Aynı kontrol
`41978ae^` ve `41978ae` üzerinde aynı sonucu verdi: **yeni regresyon değil**, A-F1'in bildirilen
`>` hatasının düzeltmesini geçersiz kılmayan, yazar betiği algılamasının açık kalan sınırı.

Yeni handler için sekiz adversarial 30.003–285.000 karakterlik quote/tag girdisi alt süreçte,
6 saniye sınırıyla ölçüldü; son seride **0,44–1,69 ms**. Ancak eski script alternatifi için şu
**tek script** olarak parse edilen quoted-title girdisi yavaş yolu tetikliyor:

```js
'<script title="' + '<script '.repeat(n) + 'data-builder-layout"></script>'
```

Gerçek `runtimeNeeds(source)` çağrısı; her gözlem ayrı Node sürecinde, 6 saniyede kesilerek:

| n / karakter | 41978ae | Eski sürüm |
|---|---:|---:|
| 1000 / 8045 | 2,30 ms | 1,29 ms |
| 5000 / 40045 | 44,10 ms | 22,35 ms |
| 10000 / 80045 | 174,39 ms | 131,71 ms |
| 25000 / 200045 | 1140,02 ms | 586,69 ms |
| 50000 / 400045 | 4494,15 ms | 2580,87 ms |
| 75000 / 600045 | 6 sn timeout | 6 sn timeout |

Bu tek makine/tek seri, paralel işler olabilir; “yeni regex tam iki kat yavaş” sonucu çıkarmıyorum.
İki sürümde de tekrar taramasıyla karesel büyüyen örnek var. Yeni kısa broken-page testi bu
script ailesini içermiyor; testin yeşilliği global hız garantisi değil. Encoded `javascript:`
adreslerinin raw regex sınırı da incelendi; normal link gezinmesine müdahale nedeniyle çalışan
ürün hatası gösterilemedi, bulgu sayılmadı.

### A-F2: draft'a göre runtime üretimi gerçek akışlarda doğrulandı

Custom CSS/JS olmayan boş canvas kaynağına, Apply yapmadan
`<form><input name="email"><button>Send</button></form>` ekleme karşı örneği kullanıldı.
Gerçek store/CodePanel, gerçek `zipFiles` ve ZIP'in gerçekten açılan dosyaları üzerinden çalıştı;
spy yalnız dosyaları yakaladı, üreticinin kendisi yürütüldü. HTML+asset'ler gerçek
`inlineProjectHtml` ile birleştirildi, JSDOM'da cancelable submit prevented=true beklendi.
Ağ teslimatı veya üretim API'si sınanmadı.

Bağımsız **7/7** yeşil: `{documents}` kullanan writer belgeyi ve gereken `.card-title` CSS'sini
koruyor; draft helper, gerçek project ZIP, single website file, optimized publication,
Apply ve pending Apply çıktılarının tümü form submit'ini işliyor.
Panel kapalıyken EditorPage fallback için ayrı **1/1** yeşil: gerçek sayfa ve mock API ile,
kaynakta form eklenip panel unmount edildikten sonra kayda giden HTML'de form/runtime ve çalışan
submit doğrulandı. Bu gerçek sunucuya kayıt veya tarayıcı E2E koşusu değildir.

Mevcut yeni testlerin bozma kanıtı; her deneme ayrı `/tmp` sürecinde:

| Bozma | Mevcut hedef test sonucu |
|---|---:|
| Yalnız `htmlRuntime.js` eski sürüm | generatedSize: 2 kırmızı / 53 yeşil |
| Yalnız `schemaToFiles.js` eski sürüm (`documents` yok) | Üç dosya: 5 kırmızı / 65 yeşil |
| `componentDraftHtml` içinden documents aktarımı çıkarıldı | Helper+panel: 1 kırmızı / 14 yeşil |
| Yalnız project ZIP çağrısı eski asset kopyalamaya döndü | CodePanel.htmlPages: 1 kırmızı / 7 yeşil |
| ZIP fix'i dururken standalone/Apply çağrıları eski stale helper'a döndü | İlgili beş dosya: **85/85 yeşil** |
| Yalnız EditorPage unmounted fallback eski helper'a döndü | sourceBreakpoint: **5/5 yeşil** |

Yeni ZIP/helper testleri literal `postToInbox` ve inlining beklentileriyle anlamlı şekilde kırılıyor.
Fakat bu mevcut ZIP testinde zipFiles mock ve submit çalıştırılmıyor; yukarıdaki bağımsız gerçek
ZIP kontrolü bunun ötesine geçti. Son iki mutasyon **mevcut test kapsamı boşluğu**; şu an çalışan
ürün hatası diye sunulmuyor.

Aynı son iki sınır ve helper, bağımsız davranış testlerimde tekrar bozuldu:

| Bozma | Bağımsız sonuç | Restore |
|---|---:|---:|
| Helper documents aktarımı çıkarıldı | 5/7 kırmızı | 7/7 yeşil |
| Standalone/Apply çağrıları eski helper'a döndü | 4/7 kırmızı | 7/7 yeşil |
| EditorPage fallback eski helper'a döndü | 1/1 kırmızı | 1/1 yeşil |

Başlangıç mevcut üç dosya **70/70**, restorasyondan sonra altı mevcut dosya **90/90**;
mevcut + bağımsız son sekiz dosya **98/98**, 6,29 s.
`npx vitest run src/utils/generatedSize.test.js src/utils/componentSourceDrafts.test.js src/components/editor/CodePanel.htmlPages.test.jsx`
başlangıç paketidir; bütün çağrılarda Node 26 webstorage seçeneği kullanıldı.
702 izlenen frontend dosyası sonunda `41978ae` arşiviyle SHA-256 olarak eşleşti;
manifest özeti `4dc1622dfc2edcaef96ab656235d38c3498edceed88069930095b5195894ab9d`.

### D-F1: ilk karşı örnek düzeldi; yeni karşı örnek var — P2

Dosya: `frontend/src/utils/colorMode.js:422–425,441`; etkisi `mapStyles` ve `mapForeground` üzerinden.
Yeni `tintReads`, bloktaki gerçek yazı rolünün yerine daima **`mode.other.textColor`** kullanıyor.
Bu kontrolün reddetmesi, özgün yazıyı korumanın daha okunur olacağını göstermiyor.

İlk rapordaki sarı zemin örneği tekrar çalıştırıldı. Önceki (`41978ae^`) ve yeni gerçek
`withColorModeComponents` çıktıları aynı Chromium belgesinde, düz tek alpha katmanı üzerinde çizildi:

| Girdi / durum | Önceki yazı | Yeni yazı | Bağımsız kontrast hesabı |
|---|---|---|---|
| `rgba(255,255,0,.49)`, gövde `#111317`, diğer yazı `#e8edf4` | rgb(232,237,244) | rgb(17,17,17) | **3,27056 → 4,90792** |

Bu ilk örnek düzeldi. Yeni, normal boyutlu karşı örneği tekrar etmek için:

1. Tasarlanan tema: `backgroundColor:'#ffffff'`, `textColor:'#111111'`,
   `mutedColor:'#54595f'`; diğer roller `DEFAULT_THEME`.
2. `colorMode:{start:'dark',theme:{backgroundColor:'#111317',textColor:'#888888',mutedColor:'#ffffff'}}`.
3. Bir `card`: `backgroundColor:'rgba(255,100,0,.3)'`, `color:'#54595f'`,
   `props:{title:'Review',text:'A normal readable card'}`, kutu (40,80,500,180).
4. Gerçek `colorModeFor` ve `withColorModeComponents` ile öncesini/sonrasını üretin.
   Eski çıktı `color:'var(--pwb-alt-muted, #54595f)'`, yeni çıktı **`color:'#54595f'`**.
5. Tam sayfa kontrolü için `schemaToSingleHtml(schema,title,{colorMode:colorModeFor(schema,page)})`
   açın. Bu üçüncü seçenek gereklidir; seçenek verilmeden üretilen tek paletli belge bu deneyin
   koyu tema kontrolü değildir.

Gerçek Chromium'da tam yeni belge: `data-pwb-theme='dark'`, body `rgb(17,19,23)`, kart zemini
`rgba(255,100,0,.3)`, paragraf **rgb(84,89,95)**, 16 px. Ayrı öncesi/sonrası kontrolünde eski
çıktının yazısı **rgb(255,255,255)** idi; aynı zemin kullanıldı.

Bağımsız sRGB alpha bileşimi: zemin `(88.4,43.3,16.1)`; yazı kontrastı **11,82214 → 1,67264**.
Bu yalnızca baştan kötü bir palet seçmek değil: tasarlanan açık görünümde aynı kart **5,03847**,
koyu sayfada genel `#888888` yazı **5,24549**, önceki koyu kart **11,82214** sağlıyor.
Kontrolün baktığı genel yazı ise bu özel tint üzerinde **3,33498** verdiği için yeni dal yanlış
kararla gerçek `mutedColor` dönüşümünü durduruyor. Beklenen: çalışan bir rol eşlemesi, ilgisiz
bir yazı rolünün kontrastı yüzünden 4,5'in çok altına indirilmemeli. Düzeltme yazara bırakıldı.

Ek sınır: diğer textColor `#b0b0b0`, 32 px yazı, `rgba(255,255,0,.25)` örneğinde de sabit 4,5
kontrolü yazıyı değiştiriyor; ölçülen oran **4,01884 → 2,16653**. Bu ikinci örnek ilki kadar
kuvvetli bir normal metin kabulü olarak sunulmuyor; boyuttan bağımsız eşik kararının ayrıca
incelenmesi gerektiğini gösteriyor.

Hesap screenshot pikselinden yapılmadı: native computed renkler, bilinen tek alpha katmanı ve
bağımsız sRGB luminance formülü kullanıldı. Filtre/karışım modu olmayan düz örneklerdir.

Geçici bağımsız Vitest: eski kontrol + yeni rol beklentisi + beş açı örneği + tam belge üretimi
**7 geçti / 1 kırıldı**. Kırılan testin literal beklentisi `var(--pwb-alt-muted, #54595f)`,
alınan `#54595f`; eski gerçek fonksiyonla aynı literal beklenti geçti. Mevcut ürün paketi ise
**146/146 yeşil**: yeni karşı örnek mevcut testte yok.

### D-F2 ve D testlerinin bozma kanıtı

`NODE_OPTIONS=--no-experimental-webstorage npx vitest run src/utils/colorMode.test.js`:
önce **146/146**, her bozma ayrı işlemde, sonunda yine **146/146**.

| `/tmp` içindeki tek bozma | Kırmızı / yeşil | Yakaladığı şey |
|---|---:|---|
| `faint` kararından `&& tintReads(color,mode)` çıkarıldı | 1 / 145 | Yeni güçlü sarı tint testi |
| `hueOf(parts[0])` yerine `parseFloat(parts[0])` | 3 / 143 | `.5turn`, `200grad`, pi-rad literal beklentileri |
| Yalnız `tintReads` eşiği 4,5 yerine 20 yapıldı | 1 / 145 | Mevcut zayıf tint'in yazısının takip etmesi |

Her bozma sonrası `colorMode.js` özgün byte'larına döndü. Bu testler ilk düzeltmeyi yakalıyor;
fakat rol değişikliğiyle daha kötü kontrast üreten yukarıdaki sayfayı yakalamıyorlar.

Kendi beş ek açı girdimin hex sonuçları elle yazılmış literal beklentilerle geçti;
son girdinin alpha 0,5 değeri ayrıca fonksiyon çıktısında görüldü:

| Girdi | Sonuç |
|---|---|
| `hsl(-.25turn 100% 50%)` | `#8000ff` |
| `hsl(1.5turn 100% 50%)` | `#00ffff` |
| `hsl(100grad 100% 50%)` | `#80ff00` |
| `hsl(-3.141592653589793rad 100% 50%)` | `#00ffff` |
| `HSL(0.5TURN 100% 50% / 50%)` | `#00ffff`, alpha 0,5 |

Native Chromium negatif çeyrek turu `rgb(128,0,255)` çizdi. D-F2 ilk hatası bu kapsamda kapandı;
bütün CSS Color sözdiziminin desteklendiği sonucu çıkarılmıyor.

### E-F1: engellenen storage altında seçim artık çalışıyor

Mevcut `CodeField.test.jsx` + `syntaxHighlight.test.js`: **28/28 yeşil**.
Yalnız `useCodeColors.js` eski byte'larına dönünce CodeField paketi **1 kırmızı / 9 yeşil**:
yeni `CodeField.test.jsx:91` testi `aria-pressed=false` beklerken true aldı. Geri yüklenince geçti.
Test yalnızca storage API'sini engelliyor; gerçek düğme, hook ve katmanın varlığı sınanıyor.
Beklenen değerler üretim kodundan türetilmemiş literal true/false.

Bağımsız ek kontroller: get/set birlikte hata verirken CodeField ve CodeText'in birlikte
kapanması, remount sonrası seçimin korunması, storage tekrar erişilebilir olunca `on` yazılması;
`localStorage` global getter'ının kendisi SecurityError atarken kapanma. Yeni kaynakta yeşil.
Gerçek tarayıcı gizlilik ayarı veya iki sekme arası storage olayı bu devamda denenmedi.

### E-F2: ağır girdiler düzeldi; yeni testler anlamlı biçimde kırılabiliyor

Yalnız `syntaxHighlight.js` eski sürümüne dönünce **2 kırmızı / 16 yeşil**: yeni kısa yorum tokenı
ve 700 ms sınırı. İlk ağır CSS girdisi bu yüklü Vitest koşusunda 9609 ms sürdü; bu sayıyı yalın
benchmark olarak kullanmıyorum.

`npx vitest run src/utils/syntaxHighlight.test.js` içinde yeni iki testi hedefleyerek ayrı bozma:

| Bozma | Yeni testlerin sonucu |
|---|---|
| STRING kapanışı yeniden zorunlu | Kısa string ve hız testi kırmızı |
| JS yorum/template kapanışı yeniden zorunlu | Kısa JS yorum ve hız kırmızı |
| CSS yorum kapanışı yeniden zorunlu | Kısa CSS yorum ve hız kırmızı |
| HTML yorum/doctype kapanışı yeniden zorunlu | Kısa HTML yorum ve hız kırmızı |
| Yalnız template kapanışı zorunlu | Hız kırmızı, kısa anlam testi yeşil |
| Yalnız doctype `>` zorunlu | Hız kırmızı, kısa anlam testi yeşil |

İlk dört bozmanın her birinde **2 kırmızı / 16 atlanan** test; son ikisinde yeni hız testi
kırıldı. Böylece ilk örüntüde duran tek performans testinin sonraki dalları örtmesi önlendi.
Her deneme ayrı işlem/timeout ve `finally` restorasyonuyla yapıldı.

Bağımsız sağlıklı kısa yorum/string/template/doctype devamı, metin round-trip ve escaping
kontrolleri de dahil son sağlam koşu **42/42 yeşil**. Bu sayı yeni karşı örneklerin kırmızı
olduğu ayrı dosyayı içermez. Aşağıdaki P3 bulgularında o dosya özellikle çalıştırıldı.

Ayrı Node alt süreçleriyle eski/yeni karşılaştırması, her girdi/boyut/sürüm için üç tekrar;
her süreçte 8 saniye sınırı. Büyük girdi küçük girdinin dört katı. Medyan ms:

| Örüntü | Büyük girdi karakteri | Eski küçük / büyük | Yeni küçük / büyük |
|---|---:|---:|---:|
| CSS `'/*x'` tekrarı | 198000 | 89,826 / 1768,283 | 0,084 / 0,247 |
| JS `'/*x'` tekrarı | 198000 | 90,981 / 1482,892 | 0,085 / 0,309 |
| HTML `'<!--x'` tekrarı | 195000 | 86,382 / 1367,083 | 1,354 / 5,351 |
| HTML `'<!doctype '` tekrarı | 190000 | 124,615 / 2031,403 | 0,611 / 5,962 |
| JS çift tırnak + a + ters eğik çizgi | 198000 | 663,645 / 3/3 timeout | 0,242 / 1,267 |
| JS backtick + a + ters eğik çizgi | 198000 | 661,638 / 3/3 timeout | 0,286 / 1,216 |
| Yazarın CSS `a{b:"c\` tekrarı | 196000 | 3,380 / 13,316 | 4,346 / 16,429 |

Alt süreç gerçek `highlightCode` modülünü yükleyip kısa ısınmadan sonra tek çağrıyı ölçtü;
DOM parse veya gerçek klavye gecikmesi ölçülmedi. Son CSS örneği eski sürümde de hızlıdır;
tek başına o fixture CSS string gerilemesini kanıtlamaz. Ortak STRING bozmasını JS örneği yakalıyor.
Küçük süreler JIT/makine yükünden etkilenir; bu sonlu ölçümlerden bütün girdilere asimptotik garanti
çıkarmıyorum. Eski büyük JS örneklerinin toplam altı süreci 8 saniyede kesildi; yeni gözlemler tamamlandı.

### E-F2 ek bulgu — P3: HTML yorumunun hata kurtarma bitişi sonraki etiketleri yutuyor

Dosya: `frontend/src/utils/syntaxHighlight.js:58`.

Üç ayrı girdi: `<!--><p>x</p>`, `<!---><p>x</p>`, `<!--x--!><p>x</p>`.
Gerçek JSDOM HTML parser'ı her birinde `p` öğesi ve literal `x` metni oluşturuyor.
Yeni `highlightCode` ise bütün girdiyi tek yorum span'i yapıyor; sonraki p etiketleri için tag
span'i yok. Eski sürüm p tag'larını renklendiriyordu. Bunlar geçersiz HTML'den kurtarma sınırları;
“tarayıcı gibi EOF'a yorum” açıklaması bu girdilere genişletilemez.
Metin değişmiyor ve kaynak çalıştırılmıyor; sorun yalnız kaynak renkleri.

### E-F2 ek bulgu — P3: geçerli JS satır devamından sonraki kod string sayılıyor

Dosya: `frontend/src/utils/syntaxHighlight.js:13`.

Girdi (ters eğik çizginin ardından gerçek yeni satır):

```js
const a="x\
y"; let n=3
```

`new Function(source + ';return {a,n}')()` literal `{a:'xy',n:3}` döndürüyor: geçerli JS.
Yeni highlighter sondaki `"; let n=3` kısmını string yapıp yalnız `const` keyword'ünü çıkarıyor.
Önceki highlighter devamlı string'i bütünüyle doğru tanımıyordu, fakat `const` ve `let` ikisini de
renklendiriyordu. Kapanışı isteğe bağlı yapmak, mevcut kaçışlı newline sınırıyla birleşerek artık
sonraki geçerli kodu da yutuyor. Beklenen keyword dizisi elle `['const','let']` yazıldı.

Bu bir önceki üç HTML girdisiyle aynı bağımsız dosyada çalıştırıldı: **yeni kaynak 4 kırmızı;
eski kaynak aynı testlerde 4 yeşil**. Düzeltme uygulanmadı. E-F2'nin ilk donma sorununun kapandığını
geçersiz kılmayan, iki ayrı düşük önem dereceli renk doğruluğu gerilemesidir.

E restorasyonu: arşivdeki **652 frontend/src dosyasıyla sıfır fark**. Özgün SHA-256:
`useCodeColors.js = cbb93524df226a6a73e076bb47613df63d7a83ac7f3e72be98cf164b8ecf0d26`,
`syntaxHighlight.js = ba5d51cd36a7d8c27ba380f5c3f694b8f12bdb96b521aeffdb58691c557eebae`.

### Bu devamın genel doğrulaması, sınırlar ve bitiş durumu

Ana klasörde üretim kaynakları `41978ae` ile aynıyken (HEAD yalnız önceki rapor commit'iyle
ileride), aşağıdaki normal kontroller yeniden çalıştırıldı:

| Komut | Sonuç |
|---|---|
| `frontend: npm run lint` | Geçti |
| `frontend: NODE_OPTIONS=--no-experimental-webstorage npm run test:run` | **317 dosya / 3129 test geçti**, 68,82 s |
| `frontend: npm run build` | Geçti; mevcut büyük parça uyarısı var |
| `backend: .venv-linux/bin/python -m pytest -q` | **998 geçti / 766 uyarı**, 199,85 s |
| `git diff --check` | Geçti |

Node 26.13.0, kurulu Vitest 4.1.11. Bağımsız yeni karşı örnekler bu normal paketlere eklenmedi;
bunların ayrı kırmızı sonuçları yukarıda verildi. Tam paketin yeşilliği yeni bulguların yokluğu anlamına gelmez.
İnceleme sırasında araya giren `fe11c02` yalnız responsive planı/prototip kanıtlarını değiştirdi;
frontend/backend üretim kaynağını değiştirmedi. Dolayısıyla bu normal kontrollerin kaynak kapsamı aynı.
D kopyasında da 702 izlenen frontend dosyası byte karşılaştırmasıyla `41978ae` ile aynı;
`colorMode.js` SHA-256 `b20b06cc9e30f7a8cc539ff2b62d985647c459b8476ecc74d4936c5b4bc26bee`.

Bu devamda CI/E2E yeniden koşulmadı veya CI yeşil diye doğrulanmadı; E2E dosyası değiştirilmedi.
Firefox/Safari, gerçek storage gizlilik ayarı, native klavye gecikmesi, ağ üzerinden form
mesajının teslimi ve gerçek yayımlama yaşam döngüsü çalıştırılmadı. İlk rapordaki önceki CI
sonuçları bu commit için yeni koşu olarak okunmamalı. Kod düzeltmeleri yapılmadı.

İki istek de tamamlandı. Yalnızca kendi iki rapor dosyam değişti; yeni test/fixture/kanıt dosyası
commit'e alınmadı. Geçici kopyalardaki üretim dosyaları önce restore edilip doğrulandı; ardından
geçici inceleme dosyaları temizlendi. Açılan yerel tarayıcı sekmeleri kapatıldı ve yalnız bu
incelemede başlatılan sunucular durduruldu. Üretim sunucusuna hiç istek gönderilmedi; canlıya alınmadı.

## 2bb05f4 kontrolü

Tarih: 4 Kasım 2026. `git pull --ff-only` güncel; başlangıç HEAD `2bb05f4`.
İnceleme kaynağı **yalnızca `git archive 2bb05f4` ile `/tmp` altına alınan kopyalar**.
Ana klasördeki eşzamanlı kaynak/test değişiklikleri okunmadı, denemelere katılmadı ve değiştirilmedi.
Yalnız mevcut bağımlılık dizinleri kullanıldı. Bu bölüm kaydedildikten sonra planın 2. sürümüne geçildi.

Sonuç: önceki üç kontrast örneği, üç HTML yorumu, JS satır devamı ve script-title örneği düzeldi.
Yeni **P2 iç yüzey kontrast gerilemesi** ve **P3 bölmenin regex sayılması** bulundu. Regex'in bazı
başlangıç konumlarında kalan renk hataları ile script marker'ının noktalama eki sınırı da aşağıda
önceden var olan sorunlar olarak ayrıldı. Ürün kodu düzeltilmedi; üretim sunucusuna istek gönderilmedi.

### Yeniden çalıştırılan ilk karşı örnekler

Gerçek `colorModeFor` / `withColorModeComponents`, önceki sürümle aynı girdiler:

| Örnek | 2bb05f4 sonucu |
|---|---|
| Turuncu %30, muted `#54595f`, diğer muted beyaz / body `#888888` | `var(--pwb-alt-muted, #54595f)`; ilk gerileme düzeldi |
| Sarı %49, yazı `#111111`, diğer yazı `#e8edf4` | `#111111` korunuyor |
| Sarı %25, yazı `#111111`, diğer yazı `#b0b0b0`, 32 px | `var(--pwb-alt-text, #111111)`; daha iyi seçenek takip ediyor |

Gerçek `highlightCode` çıktısı JSDOM'da parse edildi. `<!--><p>x</p>`, `<!---><p>x</p>`,
`<!--x--!><p>x</p>` üçlüsünde sonraki iki tag tokenı literal `['p','p']` çıktı. Ters eğik çizgi +
gerçek newline taşıyan `const a="x\\\ny"; let n=3` için `new Function` sonucu `{a:'xy',n:3}`,
keyword tokenları `['const','let']`; metin round-trip aynı kaldı. Bunlar yeni kaynakta yeşil.

Script-title kontrolü gerçek `runtimeNeeds → withBuilderInteractiveHtml → JSDOM(runScripts)`
yolunda tekrarlandı. `title="data-builder-layout"` ve single-quoted sürümüyle betik dinamik form
oluşturdu, dokuz ihtiyaç true ve cancelable submit prevented=true oldu. Parent sürüm aynı title'ı
builder scripti sayıyor; yeni sürüm saymıyor. `data-builder-layouted` de doğru şekilde yazar scripti.
Gerçek `data-builder-layout` ve büyük harfli eşdeğeri ise builder scripti olarak kalıyor.
JSDOM fetch'i stub'landı; ağ üzerinden teslimat veya üretim form ucuna istek yok.

Önceki yavaş quoted-title girdisi (`'<script title="' + '<script '.repeat(n) + 'data-builder-layout"></script>'`)
her boyutta ayrı Node sürecinde, 6 saniye sınırıyla çalıştı:

| Karakter | Yeni runtimeNeeds süresi |
|---:|---:|
| 8045 | 0,36 ms |
| 80045 | 0,49 ms |
| 200045 | 0,63 ms |
| 400045 | 0,93 ms |
| 600045 | 1,22 ms |

Hepsinde ihtiyaçlar true ve süreç normal çıktı. Bu tek seri ölçümdür; bütün regex girdileri için
karmaşıklık garantisi değil. Önceki saniyelik karşı örnekteki sorun bu kapsamda kapandı.

### P2 — tintReads gerçek arka yüzeyi hesaba katmıyor

Kaynak: `frontend/src/utils/colorMode.js:423–430`, ayrıca `mapComponent` çocuklarına `fixed` aktarımı.
Yeni kural doğru yazı rolünü buluyor fakat alpha tint'i hâlâ **`mode.other.backgroundColor`** üstüne
bileştiriyor. Bir bileşenin başka bir yüzey içindeki gerçek zemini farklı olabilir.

Yeniden üretme:

- Tema `DEFAULT_THEME` üstüne `backgroundColor:'#ffffff'`, `textColor:'#111111'`,
  `mutedColor:'#54595f'`, **`surfaceColor:'#fafafa'`**.
- Diğer tema: start dark; background `#111317`, surface **`#bbbbbb`**, text `#e8edf4`, muted **`#111111`**.
- `container`, x40/y80/w500/h180, style `backgroundColor:'#fafafa'`.
- Bunun içinde `card`, yerel x20/y20/w420/h120; title `Review`, text `Readable`;
  style `backgroundColor:'rgba(255,0,0,.1)'`, `color:'#54595f'`.

Gerçek editör deposu `loadSchema` girdiyi kabul etti ve gerçek `schemaToSingleHtml` ile belge üretildi
(geçici fixture testi **1/1 yeşil**). Önceki gerçek mapping çocuğun yazısını
`var(--pwb-alt-muted, #54595f)` yapıyor; yeni mapping **`#54595f` bırakıyor**.

Tam yeni belge offline headless Chromium **156.0.8078.79** üzerinde açıldı. Boyayan iç elemanlar
ölçüldü; yalnız dış yerleşim sarmalayıcıları ölçülmedi: tema dark, body `rgb(17,19,23)`, container'ın
boyayan yüzeyi **rgb(187,187,187)**, çocuk kart **rgba(255,0,0,.1)**, metin **rgb(84,89,95)**.
Gerçek alpha bileşimi `(193.8,168.3,168.3)`; bağımsız sRGB luminance hesabıyla eski `#111111`
yazı **8,52389:1**, yeni `#54595f` **3,19050:1**. Öncesi doğru çalışan kart kötüleşiyor.
Bu piksel örneklemesi değil; gerçek computed renkler ve tek alpha katmanıyla hesap.

Geçici bağımsız testin literal beklentisi `var(--pwb-alt-muted, #54595f)`:
eski fonksiyon yeşil, yeni fonksiyon kırmızı. Genel sayfa zemini üzerindeki eski üç örneğin düzelmesi,
üst yüzeyi farklı iç içe kutuların düzeldiğini göstermiyor. Düzeltme uygulanmadı.

### P3 — yeni regex algılaması geçerli bölme işlemini string boyuyor

Kaynak: `frontend/src/utils/syntaxHighlight.js:16–19` (`}` sonrasında regex başlangıcı kabulü).

```js
const n = {valueOf(){return 12}} / 2 / 3;
```

Geçerli JS; aritmetik sonuç 2. Önceki highlighter 12, 2 ve 3'ü number boyuyor.
Yeni highlighter **`/ 2 /` parçasını code-t-string** yapıyor; 2 number tokenı kayboluyor.
Daha basit geçerli `const n = {} / 2 / 3;` de aynı sonucu veriyor (sayısal sonuç NaN).
Metin ve escaping korunuyor; yalnız kaynak renkleri, çalışma davranışı değişmiyor.
Bağımsız literal “string tokenı yok” beklentisi iki girdide de kırıldı.

Sağlıklı kontroller: `12 / 2 / 3`, `n /= 2`, `(12) / 2 / 3` yanlış string üretmedi.
Şu üç geçerli örnekte ise regex içindeki quote sonraki `let`i hâlâ yutuyor:

```js
const s="x"; function f(){ return /'/g.test(s); } let after=1;
const f=()=>/'/g; let after=1;
const p=/[/']/g; let after=1;
```

Üçü de `new Function` ile sözdizimi doğrulamasından geçti. Bu üç kayıp **parent sürümde de var**;
yeni regresyon değil, yeni regex desteğinin kapsam sınırı. İlk iki örnekte keyword/start bağlamı,
son örnekte slash taşıyan karakter sınıfı doğru ele alınmıyor.

Bağımsız 14 test: **8 yeşil / 6 kırmızı**. Kırmızılar: yeni iç yüzey kontrastı, iki bölme girdisi ve
önceden var olan üç regex sınırı. Kısa orijinal HTML/newline kontrolleri ile basit bölmeler yeşil.

Yeni performans sorununu da aradım: gerçek `highlightCode` ayrı süreçlerde, 6 saniye sınırıyla,
`'const x =' + ' '.repeat(n) + '1; let after=2;'` üzerinde çalıştı. 4024/16024/64024/190024 karakterde
yeni süreler yaklaşık 0,07/0,07/0,17/0,48 ms; parent 0,04/0,06/0,17/0,49 ms. Bu ailede gerileme yok.
Ek denemelerde 195 bin karakter boşluk, boşluk + slash ve kapanmayan regex gövdesi sırasıyla yaklaşık
1,52/2,01/9,09 ms'de tamamlandı. Bunlar sonlu Node ölçümleri; gerçek tuş gecikmesi ölçülmedi.

### A-F1 sınırı — marker adının noktalama eki hâlâ tam ad sayılabiliyor

Kaynak: `frontend/src/utils/htmlRuntime.js:857`, `(?![\\w-])` sınırı.
`data-builder-layout.foo`, `data-builder-layout:foo`, `data-builder-layout@foo` gerçek parser'da
bu tam adlarla **ayrı attribute**; hiçbiri `data-builder-layout` değil.
Ancak regex bunları da builder marker'ı sayıyor. Yukarıdaki dinamik form betiğinin script'ine
bu attribute'lardan birini koyunca needs tümü false, form oluşuyor, submit prevented=false.
Bu üçü **parent'ta da aynı**; title düzeltmesinin gerilemesi değil, “yalnız tam attribute adı”
sözünün kapanmamış sınırı. Yeni bağımsız karşı örnek; ilk title örneğiyle karıştırılmamalı.

### Testlerin bozma gücü ve genel kontrol

Her kaynak dosyası tek tek `2bb05f4^` sürümüne alındı; her koşu ayrı Vitest işlemi ve timeout ile,
sonunda özgün byte'lar geri yüklendi. Komut: `NODE_OPTIONS=--no-experimental-webstorage npx vitest run <dosya>`.

| Hedef | Yeni kaynak | Parent kaynak | Restore |
|---|---:|---:|---:|
| `src/utils/colorMode.test.js` | 149/149 | 2 kırmızı / 147 yeşil | 149/149 |
| `src/utils/generatedSize.test.js` | 56/56 | 2 kırmızı / 54 yeşil | 56/56 |
| `src/utils/syntaxHighlight.test.js` | 21/21 | 3 kırmızı / 18 yeşil | 21/21 |

Kırılan yeni testler sırasıyla muted rolü / 4,5 altındaki daha iyi seçenek; gerçek script attribute'u /
hız; HTML comment bitişi / line continuation / regex içindeki quote. Böylece iddia yalnız yeşil test okumaya dayanmıyor.

Kapsam düzeltmeleri de tekrar bozuldu. CodePanel standalone/Apply çağrılarını `componentSourceHtml(...,rawGeneratedFiles)`
yoluna döndürmek **3 kırmızı / 19 yeşil** verdi: Apply ve iki export, literal `postToInbox` yokluğuyla
kırıldı. EditorPage fallback'i aynı eski helper + `schemaToFiles(schema)` yoluna döndürmek **1 kırmızı /
21 yeşil** verdi; kayda giden HTML'de `postToInbox` yoktu. Gerekli eski import'lar eklendi;
ReferenceError nedeniyle kırılma kanıt sayılmadı. Hedef paket `CodePanel.drafts.test.jsx`,
`CodePanel.editStress.test.jsx`, `EditorPage.sourceBreakpoint.test.jsx`; her restorasyondan sonra **22/22**.
Yeni kapsam testleri önceki sağ kalan mutasyonları gerçekten yakalıyor.

Temiz, ayrı `2bb05f4` arşivinde: lint geçti, **317 dosya / 3140 Vitest geçti** (70,57 s),
build geçti (mevcut büyük parça uyarısı). Backend de arşiv kaynağıyla **998 geçti / 766 uyarı**
(153,68 s). İlk backend koşusu tamamlanmadan kesilmişti; onun kısmi çıktısı sonuç sayılmadı,
tam koşu yeniden alındı. Ana klasörün yeni testleri bu sayılara dahil değil.

İlk iş tamamlandı ve bu bölüm kaydedildi. Genel paketlerin yeşilliği yukarıdaki ayrı kırmızı
karşı örnekleri kapatmıyor. Kaynak dosyaları düzeltilmedi; ikinci işte yalnız sabit arşivdeki
plan/prototip kullanılacak. Son kaynak hash/temizlik ve git kapsamı iki iş bittiğinde doğrulanacak.

### 2bb05f4 incelemesinin son durumu

İkinci iş de tamamlandı; Grid değerlendirmesi diğer raporun **2. sürüm incelemesi** bölümünde.
Restorasyon kontrolünde arşivdeki **1105 izlenen dosya** (702 frontend dosyası dahil) tek tek
karşılaştırıldı: **0 fark**. Deneyler yalnız ek geçici dosyalar oluşturdu; üretim dosyaları özgün.
Bütün browser süreçleri kapatıldı; geçici kaynak, ölçüm ve browser cache'leri temizlendi.
Yeni E2E/ürün testi depoya eklenmedi, CI yeniden koşulmadı, canlıya alınmadı.

Ana klasörde sonradan gelen `8832e77` raporları Git kapsamından çıkardı. Sahibin bu iş için
verdiği “yalnız iki raporu commit et” talebi doğrultusunda yalnız bu iki dosya tekrar ekleniyor;
`.gitignore`, AGENTS veya diğer notlar geri alınmıyor. Ana klasörün sonraki üretim değişiklikleri
bu rapordaki `2bb05f4` doğrulama sonuçlarına dahil değildir.
