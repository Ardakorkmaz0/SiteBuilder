# Üretilen kaynak incelemesi — 4 Kasım 2026

Başlangıç HEAD `180bc6639823cc1656f8f0a09b30e1e4ef5da6ad`. İncelenen aralık `7b109fe..77a59e2`; HEAD'in bunun üzerindeki tek farkı inceleme planıdır. Başlangıçta çalışma ağacı temiz, `git pull --ff-only`: Already up to date.

Çalıştırılarak bulunan ürün sorunları: **A-F1/A-F2/D-F1/E-F2 P2**, **D-F2/E-F1 P3**. B-F1/B-F2 ayrıca test kapsamındaki kayıplardır; üretim hatası diye sayılmadı. Kanıt kaynakları, JSON'lar, test çıktıları ve ekran görüntüleri `docs/review-evidence/generated-source-2026-11-04/` altındadır. Bulgular yazara bırakıldı; düzeltme uygulanmadı.

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
