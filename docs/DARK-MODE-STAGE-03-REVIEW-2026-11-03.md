# Koyu mod aşama 3 — çalıştırılan çapraz inceleme

Tarih: 3 Kasım 2026. Başlangıç HEAD: `7a0730bc7ec4322da7b882ab61f950d698085fd0`.
Kapsam: `18759dd` sonrasındaki koyu mod işleri; özellikle `bbf6015`, `3f237bf`, `5443ff5`, `7a0730b` ve önceki inceleme düzeltmeleri.

Başlangıçta `git status --short` temizdi; `git pull --ff-only` güncel olduğunu bildirdi. Üretim kodu değiştirilmedi. Bozma denemeleri sonunda özgün byte'lar geri kondu. Eklenenler inceleme kanıtları, tarayıcı testleri ve CI kanıt yükleme adımıdır. Canlıya alma yok; gerçek üretim verisi kullanılmadı.

**Bu ilk kayıt yerel çalıştırmaları içerir. Ek Chromium/Firefox CI yürütümü ve JSON sonuçları tamamlanınca aşağıdaki CI bölümü güncellenecek. Henüz koşmamış CI testleri geçmiş gibi gösterilmiyor.**

## Yerel koşullar ve normal paketler

- Ayrı SQLite: `/tmp/sitebuilder-dark-stage3-review-01a13ef5.sqlite3`. Yalnız deneme kullanıcısı ve dört deneme sitesi. Backend 8001, Vite 5173; başlangıçta portlar boştu. `config.e2e_settings` ile gerçek e-posta gönderilmez.
- Kullanıcı arayüzü denemeleri gerçek in-app Chromium'da yapıldı. `/s/` ve normal `/site/` gerçek Django API/verisini kullanır. Toplu işlem ve owner-prop denemelerinde aşağıda belirtilen test düzenekleri vardır.
- Lint geçti. Vitest **313 dosyada 2.943 test geçti**. Üretim derlemesi geçti; mevcut büyük chunk uyarısı sürüyor. Pytest **994 test geçti**.
- Yerel Playwright/E2E tarayıcısı başlatılmadı; E2E yalnız CI'da çalıştırılır. `--list`, syntax ve ESLint kontrolü tarayıcı yürütümü değildir.

## Çalıştırılarak doğrulanan bulgular

### S3-F1 · P2 — Aynı sitede canvas ve HTML sayfaları arasında son tema tercihi kayboluyor

Yerel gerçek `/site/review-a` üzerinde, ek bir düzeneğe gerek olmadan:

1. Home canvas sayfasında Dark seçildi. DOM kökü `palette=dark, pick=dark` oldu.
2. Üstteki Document düğmesiyle aynı sitenin HTML sayfasına geçildi.
3. Gerçek iframe'de **Light seçili** geldi. `sitebuilder-stage3-mixed-choice.jpg` bunu gösterir.
4. HTML sayfasında Device seçildi, Home'a dönüldü; canvas bu seçimi aldı.
5. Canvas'ta Light seçildi (`pick=light` doğrulandı); Document'e geri dönüldü.
6. HTML sayfasında **eski Device seçimi** yeniden geldi. `sitebuilder-stage3-stale-device.jpg` kaydı vardır.

Bu yalnız görsel bir fark değildir: son ziyaretçi tercihi iki çizim yolu arasında tek kaynaktan tutulmuyor. Gerçek PreviewPage'i süren ek Vitest kontrollerinde de iki akış kırıldı. Canvas'taki seçim `ColorModeRoot` içinde kalırken iframe gezinmesinde kullanılan `PreviewPage.palette` state'ine aktarılmıyor. Dosya/satır numaraları son rapor kontrolünde aşağıya eklenecek.

İlk kayıp iki yönlü modda da eskiden bulunmuş olabilir; bu inceleme onu kesin yeni aşama 3 gerilemesi diye sunmaz. Mevcut aşama 3'te `Device` ile ikinci akış da çalıştırılarak bozuldu. Üretim düzeltmesi yapılmadı.

### S3-F2 · P3 — Dikey navbar üst bar sayılıyor; eklenen düğme sağ üstten uzaklaşıyor

Gerçek EditorPage ve gerçek ColorModePanel ile, genişliği 200 ve yüksekliği 600 olan `navLayout: vertical` çubuklu deneme sitesinde PC görünümü seçildi. “2 sayfaya ekle” sonrasında DOM'da gösterilen gerçek store özeti:

```text
themeToggle.layout = {x:1132,y:616,w:44,h:44}
```

Yan çubuğun yüksekliği üst bar yüksekliği gibi kullanılıyor. Sağ üstte y=24 yerine y=616'ya ekleniyor. Gerçek tarayıcı çıktısı `sitebuilder-stage3-vertical-manual.json` ve `sitebuilder-stage3-vertical.jpg`; bağımsız store kontrolü de mevcut kodda kırıldı. Kaynak `utils/themeToggle.js` içindeki `themeSwitchSpot`; son satır numarası aşağıda tamamlanacak.

### İstenen seçim koşuluna ilişkin gözlem — Ctrl+Z seçimi temizliyor

Toplu ekleme sırasında seçim doğru korundu. Fakat tek gerçek Ctrl+Z sonrasında seçili blok dizisi boşaldı. Bu mevcut genel undo davranışıyla bağlantılıdır; yeni toplu işlem regresyonu diye etiketlenmedi. İstenen “seçili blok değişmemeli” koşulunu undo sonrasında da kapsıyorsanız bu koşul sağlanmıyor. Kanıt aşağıdadır; sonuç saklanmadı.

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

Toplu işlem düzeneği, seçili blok varken panel erişilebilir kalsın diye gerçek editörün yanına ikinci gerçek ColorModePanel koyar; bu normal ürün yerleşimi değildir. API ve store gerçektir; own undo listener yoktur. Owner düzeneği gerçek ColorModeRoot'a UI ile prop değişimi verir; başka bir cihazdan yapılan sunucu güncellemesinin canlı push/poll işlemi denenmiş gibi sunulmaz.

Henüz yerel manuel tarayıcıda yapılmayanlar: işletim sistemi tercihini değiştirme, farklı BrowserContext ziyaretçisi, gerçek orta tıklama yeni sekme ve iframe piksel çözümleme. Bunlar için ek CI testleri hazırlandı; sonuç alınmadan geçti denmez.

## Testlerin bozmayla doğrulanması

- Ön yüz: ColorMode util, ColorModeRoot, ColorModePanel ve PreviewPage.palette **91 test** başlangıç/restorasyonda geçti. On beş seçilmiş üretim bozmasının on beşi ilgili testleri kırdı; script/renderer device dinleyicisi, explicit seçim, batch tek kayıt, seçim/aktif sayfa, flow başa yerleştirme ve site anahtarı yolları sınandı. Ayrıntılar son döküme eklenecek.
- Arka yüz: Sekiz bozma yakalandı. Üçlü canvas ve HTML `choices` anahtarının fingerprint etkisini kaldıran iki bozma, tüm `test_page_live.py` içinde **55/55 yeşil** kaldı; geçici gerçek serializer→publish→PATCH→status testleri her birini yakaladı. Mevcut kod doğru; regresyon kapsamı eksik.
- Eski head: üç tarihsel gerçek writer, gerçek Django yanıtları ve JSDOM'da çalışan scriptlerle **15/15 literal beklenti** doğrulandı. Bu JSDOM sonucudur, tarayıcı/piksel denemesi değildir. Aynı yanıtları gerçek iki CI tarayıcısında yeniden oynatan test ayrıca hazırlanmıştır.

## Firefox ve reload değişikliği: sonuç bekleyen ayrım

Kurulu Playwright **1.63.0**, paketlediği Firefox **155.0 / revision 1543**; nottaki elle denenmiş Firefox **159** ile aynı sürüm değildir. Kaynakta context emülasyonu ve Juggler override kurulumu bekleniyor; “bilerek ilk scriptlerden sonra bildirir” yorumu kaynak tarafından desteklenmiş bir garanti değildir.

CI tanı testleri düz kontrol/gerçek head, düz belge/sandbox, context-dark/page-before-goto, first/reload, wrapper'lı/wrapper'sız ölçümleri JSON'a yazacak. Bunlar alınmadan “sorun Playwright'ta” veya “uygulama doğru” şeklinde nedensel sonuç yazılmayacak.

Reload sonrası etkin dosyaya tıklamanın kaldırılması kaynakta gerçek bir toggle'ı kaldırıyor: aktif dosya Source/View değiştiriyor. Yeniden yükleme sonrası benzersiz About içeriğinin doğrudan Source'ta beklenmesi, otomatik dosya/kaynak restorasyonunu manuel tıklamayla telafi edemiyor. CI'da mevcut iki varyantın gerçek koşusu ayrıca kontrol edilecek.

Safari ve sistem Firefox 159 bu incelemede henüz açılmadı; bunlar test edilmiş sayılmıyor.

## CI yürütümü

Ek testler ve JSON/screenshot kanıt yükleme adımı hazırlanmıştır. Koşu kimliği, gerçek sonuçlar, Firefox ölçüm tablosu ve son satır numaraları CI tamamlandıktan sonra bu bölüme eklenecektir.
