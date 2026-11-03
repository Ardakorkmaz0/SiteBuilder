# Koyu tema, aşama 0–1 — çapraz inceleme

İncelenen commit: `9a7b2ec55adfdfd2b0260f84c0c85ac013a119b4`.
Başlangıç raporu: `DARK-MODE-2026-11-03.md`. Tarih: 3 Kasım 2026.

Çalışma ağacı başlangıçta temizdi; `git pull --ff-only` güncel olduğunu bildirdi. Üretim kodu düzeltilmedi. Geçici bozmalar tek tek uygulanıp orijinal dosya içerikleri geri kondu. Kalıcı çıktı yalnızca bu inceleme ve `review-evidence/dark-mode-2026-11-03/` altındaki kanıtlardır. Aşama 2–5'e veya ertelenmiş özelliklere geçilmedi; dağıtım yapılmadı.

## Sonuç

Bir **P2 klavye erişimi hatası** doğrulandı. Ayrıca çalışan davranışları geri alan **üç P3 test boşluğu** bulundu. Test boşlukları mevcut üretim kodunun bu üç davranışta hatalı olduğu anlamına gelmez. Açılış tercihi, eski `followDevice` uyumu, URL/depolama önceliği, responsive CSS sırası ve sayfa parmak izi değişikliklerinin diğer sınanan yolları çalışıyor.

### F1 · P2 — Yeni radyo grubu klavye davranışını uygulamıyor

Kaynak: `frontend/src/components/editor/ColorModePanel.jsx:57–68`, özellikle `role="radio"` verilen düğmelerin `:62–65` aralığı. Düğmeler yalnızca `onClick` kullanıyor; ok tuşu işleyicisi ve grupta tek Tab durağı yok.

Tekrar üretim: yeni açık tasarımlı bir şema yükleyin, Tema panelinde “Site şu temada açılır” grubundaki Açık seçeneğine odaklanın. Sağ oka basınca Koyu'ya geçmesi ve seçimi değiştirmesi beklenirken odak ve seçim Açık'ta kalıyor. Sonra Tab'a basınca gruptan çıkmak yerine seçili olmayan Koyu odaklanıyor. Seçeneklere Tab ve Space ile ulaşılabiliyor; sorun seçeneğin tamamen erişilemez olması değil, bildirilen radyo grubu davranışının eksik olmasıdır. [WAI-ARIA radyo grubu klavye örüntüsü](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) oklarla odak/seçim geçişi ve Tab ile gruptan çıkış tanımlar.

Mevcut altı panel testi fare tıklamasıyla yeşil kalıyor. İnceleme için eklenen iki klavye kontrolü mevcut kodda kırıldı:

```text
ArrowRight: expected focus Dark; received focus Light
Tab: expected focus outside radiogroup; received unchecked Dark
2 failed
```

Bu sonuç gerçek in-app Chromium klavyesiyle de doğrulandı. Gerçek bileşen ayrı bir geçici Vite HTML fixture'ında açıldı; API çağrısı, hesap veya veritabanı yazımı yapılmadı. DOM gözlemi:

```text
After ArrowRight: focus=Açık, Açık.checked=true, Koyu.checked=false
After Tab: focus=Koyu, checked=false
```

Yazara öneri: gerçek HTML radio girdileri ya da ok tuşları ve tek Tab durağı olan bir uygulama; iki klavye testi bununla birlikte normal pakete alınmalı. Bu incelemede uygulanmadı.

### G1 · P3 — Açık palete dönüşü sonraki sayfaya taşıyan link değişikliği korunmuyor

Kaynak: `frontend/src/utils/htmlRuntime.js:131`; mevcut kontrol `frontend/src/utils/colorMode.test.js:309–333`. Test ilk koyu seçimi bağlantıda kontrol ediyor, açık seçime dönüşte yalnız mevcut adresi ve aynı sayfanın yeniden yüklenmesini kontrol ediyor. Yeni E2E de başka sayfa bağlantısını izlemiyor.

Yalnızca `withPaletteParam` içindeki koşulsuz sorgu yazımını eski davranışa döndürdüm: `mode === data-pwb-theme-base` ise `pwb-theme` silinsin. Mevcut `colorMode.test.js` **31/31 geçti**. Ancak gerçek head script + runtime ile başlangıcı koyu, tasarımı açık, depolaması kapalı bir sitede Açık seçildikten sonra About bağlantısı bozuluyor:

| | Bağlantı | Yeni belgenin paleti |
| --- | --- | --- |
| Üretim | `https://example.test/about/?pwb-theme=light` | `light` |
| Bozma | `https://example.test/about/` | `dark` |

Kanıt için yazılan `runtime-link.review.test.js` üretimde geçti; aynı bozmada **1 kırık / 31 yeşil** oldu. Bağlantı adresi ve açılan ikinci belgenin paleti ayrı literal değerlerle doğrulanıyor. Yazar bu regresyon kontrolünü normal pakete almalı.

### G2 · P3 — Sunucunun `start: light` kabulü doğrudan sınanmıyor

Kaynak: `backend/builder/validators.py:703`, `:717–721`; test `test_validators.py:671–677` yalnız `dark` ve `system` kabulünü doğruluyor. İzin listesinden yalnız `light` çıkarıldığında odak paketi **16/16**, ilgili iki dosyanın tamamı **121/121** yeşil kaldı.

Ek dış kontrolde şu literal dönüş beklendi; sağlam kodda geçti, bozmada kırıldı:

```python
sanitize_color_mode({'start': 'light', 'followDevice': True}) == {
    'theme': {}, 'followDevice': False, 'start': 'light',
}
```

Böyle bir gerilemede sahibin açık seçimi sessizce kaybolur ve eski cihaz tercihi etkin kalır. Mevcut üretim kodu doğru; eksik olan kabul/öncelik testidir.

### G3 · P3 — Yalnız global `site.html` içindeki anahtarın diğer sayfalara etkisi sınanmıyor

Kaynak: `backend/builder/live_pages.py:54–55`; yeni testler `test_page_live.py:217–238` içinde `page.html` ve iç içe canvas bileşenlerini kapsıyor. Yalnız global `html` taramasını kaldırınca odak paketi **16/16**, ilgili iki dosyanın tamamı **121/121** yeşil kaldı.

Bu yol yalnızca yapay bir fonksiyon girdisiyle denenmedi. Geçici APIClient fixture'ı home/about sayfalarını canlıya gönderdi, sonra gerçek serializer üzerinden yalnız `html` alanına tema düğmesi ekledi. İstek 200 oldu; veritabanındaki `site.html` değişimi ve `schema.pages[0].html` içinde düğme bulunmadığı ayrıca doğrulandı. Sağlam kod `home: older, about: older`; bozma `about: live` döndürüyor. Ek iki kontrol bozmada kırıldı.

Yazar global HTML yolunu da parmak izi regresyon testine eklemeli. Tam backend paketinin bu bozmada sonucu sınanmadı; **121 test** iddiası `test_page_live.py` ve `test_validators.py` dosyalarıyla sınırlıdır.

## Mutasyon dökümü

Her satır ayrı uygulanıp geri alındı. Mevcut testler 19 seçilmiş bozmadan 16'sını yakaladı; üç kaçış yukarıda G1–G3'tür. Bu sayı rastgele/eksiksiz bir mutasyon skoru değildir.

| Geçici bozma | Mevcut test sonucu |
| --- | --- |
| Panel seçimi store'a yazmasın | 2 kırık / 6 |
| Store `followDevice` daima false yazsın | 1 kırık / 6 |
| Renk düzenlenince mevcut `start` unutulsun | 1 kırık / 6 |
| Store undo kaydı alınmasın | 1 kırık / 6 |
| `colorModeFor` açık `initial` değerini yazmasın | 3 kırık / 31 |
| Device modu kapatılsın | 2 kırık / 31 |
| Eski `followDevice` alanı yok sayılsın | 2 kırık / 31 |
| Aynı sayfada tasarlanan palete dönüş URL'den silinsin | 2 kırık / 31 |
| Adreste tercih yokken linke tercih eklensin | 1 kırık / 31 |
| Depolama varken eski URL tercihi bırakılsın | 1 kırık / 31 |
| iframe `color-scheme: normal` CSS metni kaldırılsın | 1 kırık / 31 |
| Responsive palet CSS'si kendi `:root` kuralından önce yazılsın | 1 kırık / 31 |
| Yalnız sonraki sayfanın linkinden tasarlanan palet tercihi silinsin | **31 yeşil — G1** |
| Fingerprint'e anahtar bayrağı eklenmesin | 2 kırık / 16 |
| İç içe canvas düğmesi aranmasın | 1 kırık / 16 |
| Validator `start` alanını düşürsün | 1 kırık / 16 |
| Validator `followDevice` değerini start'tan türetmesin | 1 kırık / 16 |
| Global HTML içindeki düğme aranmasın | **121 yeşil — G3** |
| Validator `light` değerini reddetsin | **121 yeşil — G2** |

Geri yükleme kontrolleri: panel **6/6**, runtime **31/31**, ilgili backend dosyaları ve üç dış kontrol birlikte **124/124**. Ayrıca G1 için yeni dış kontrolle üretim kodu **32/32** geçti; bozmada yalnız yeni kontrol kırıldı. Üretim dosyalarında kalıcı diff yok.

## Kanıtların yeniden çalıştırılması

`review-evidence/dark-mode-2026-11-03/README.md` komutları ve kapsamı açıklar. Panel testi mevcut hatayı gösterdiğinden normal test paketinin dışında saklandı; normal paket yeşil iddiasına dahil değildir. Runtime ve backend kontrol dosyaları mevcut kodda geçer ve belirtilen bozmaları yakalar. Bunlar üretim düzeltmesi değildir.

Geçici panel fixture'ı kaldırıldı ve yalnızca bu inceleme için başlatılan Vite kapatıldı. Yerel E2E/Playwright çalıştırılmadı.

## Doğrulama sonuçları

| Kontrol | Sonuç |
| --- | --- |
| `npm run lint` | Geçti |
| `NODE_OPTIONS=--no-experimental-webstorage npm run test:run` | 309 dosya, **2.874 test geçti** |
| `npm run build` | Geçti; mevcut büyük parça uyarısı sürüyor |
| `.venv-linux/bin/python -m pytest -q` | **975 test geçti** |
| `git diff --check` | Temiz |
| İncelenen `9a7b2ec` CI | Ön yüz, arka yüz, Chromium ve Firefox başarılı |

[İncelenen commit'in CI koşusu](https://github.com/Ardakorkmaz0/SiteBuilder/actions/runs/41621485719): Chromium **112**, Firefox **112** E2E geçti; yeniden deneme/flaky kaydı bulunmadı. Yeşil normal paket, F1'in olmadığı anlamına gelmiyor; mevcut testler klavye davranışını sınamıyor.

## Sınırlar ve rapor doğruluğu

- `DARK-MODE-2026-11-03.md` son cümlesi iframe kuralının Firefox'ta computed-style kontrolüyle doğrulandığı izlenimini veriyor. `theme-switch.spec.js:67–70` yalnız **ana belgenin kökünün** computed `colorScheme` değerini ölçüyor; senaryoda HTML blok iframe'i yok. Unit test iframe kuralının CSS metnini arıyor. Bu nedenle iframe'in Firefox computed-style/piksel davranışı bağımsız doğrulanmış sayılmamalı. Yeni bir beyaz kutu hatası bulunduğu iddia edilmiyor.
- Tasarlandığı paletle açılan, anahtarı olmayan site `colorModeFor` içinde null alır; dolayısıyla bu yolda native kontroller için yeni `color-scheme` yazılmaz. Başlangıç raporu aynı çıktıyı koruma tercihini açıkça belirtiyor; bunu ayrı bir yeni üretim hatası saymadım. “Native controls follow the palette” kapsamı bu istisnayı içeriyor.
- Depolama okunabilirken yazma `QuotaExceededError` verirse tercih korunamayabilir. Mevcut test storage getter'ın hata vermesini kapsıyor. Bu sınır önceki runtime'da da bulunduğundan bu commit'in yeni gerilemesi olarak sayılmadı.
- `/site` ile `/s` arasında yayımlanmamış anahtar farkı ve anahtarlı eski sitelerin dosyalarının bir defa mavi görünmesi başlangıç raporunda açıklanmış; yeni bulgu diye tekrarlanmadı.

## Claude'a dönüş

Önce F1'i klavye kanıtıyla değerlendirin. G1–G3 için ek dış kontrollerin mevcut testler yeşilken hangi somut bozmaları yakaladığını tekrar doğrulayın. Bulguların değerlendirilmesi ve düzeltmeleri yazara aittir; bu incelemede kod sessizce yeniden yazılmadı.
