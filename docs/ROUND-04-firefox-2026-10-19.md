# Tur 4 — Çapraz inceleme ve Firefox (ChatGPT, 19 Ekim 2026)

Başlangıç `f299b3d`; çalışma ağacı temizdi, `git pull --ff-only` günceldi.
`AGENTS.md`, `CHATGPT-NEXT-2026-10-19.md` ve Tur 3 raporu okundu.
Önce aşağıdaki çapraz inceleme bitirildi, sonra Firefox yapılandırması eklendi.
İnceleme bulgularında **üretim kodu düzeltilmedi**. Canlıya alma yok.

## 1. Claude commit'lerinin çapraz incelemesi

Bozmalar ana çalışma ağacında yapılmadı. `git archive HEAD` ile oluşturulan
izole `/tmp` kopyaları kullanıldı; mevcut bağımlılıklar paylaşıldı. Üretim
bozmaları her denemeden sonra geri alındı. Beklenen değerler elle yazıldı.

### Bulgular — Claude'a geri verilecek

1. **P2 — `5e7e3ec`: sıradaki manuel kayıt daha yeni bir dosya uyarısını siliyor.**
   `useEditorSave.js:45–48` eski otomatik ret mesajının hâlâ aynı mesaj olduğunu
   doğrulamadan `onError('')` çağırıyor. Otomatik kayıt sürerken manuel Save kuyruğa
   girer; otomatik istek 413 ile reddedilir; manuel istek sunucuya kaydeder, fakat
   bağlı yerel dosyaya yazamaz. Gerçek `EditorPage.jsx:1790–1793` bu durumda dosya
   uyarısını bildirip başarılı sunucu sonucunu döndürür. Hook sonra **yeni dosya
   uyarısını da siler**. İki kontrollü asenkron yazmayla gerçek hook/kuyruk testi
   HEAD'de kırmızı; yalnız hook `5e7e3ec^` sürümüne alınınca yeşil.

2. **P2 — `52f0dca`: sekme panelinin `(0,0)` köşesi korunmuyor.**
   `editorStore.js:3062` taşıma için `addChildToTree` kullanıyor. Yardımcıdaki
   `:425–431` sıfır koordinatını verilmemiş yerleşim sayıp `(12,12)` üretiyor.
   Hem gerçek store hem `schemaToFiles` çıktısında bu kayma doğrulandı. Normal
   `(80,40)` bırakışı ve iki ayrı sekme bileşeni arasında taşıma kontrolü geçti.

3. **P2 / kapsam kararı — pinned/navbar istisnası belgede söylendiği kadar geniş değil.**
   `FreeCanvasItem.jsx:266,316` fixed pin ve tam genişlik yatay navbarı hariç tutuyor.
   Sticky öğe, boxed yatay navbar ve sabitlenmemiş dikey navbar ise başka kaba
   taşınıyor. Gerçek React pointer işleyicileri + store ile bu üç beklenti kırıldı;
   fixed/full-width kontrolleri geçti. Tüm bu türler gerçekten yasaklanacaksa guard
   eksik; yalnız mevcut alt türler hariçse görev belgesinin kapsamı daraltılmalı.

4. **P2 / kapsam kararı — içte başlayan çoklu seçim ebeveyn değiştirebiliyor.**
   İçteki çocuk + başka bir öğe seçiliyken `FlowCanvasItem.jsx:681` tek seçime
   düşürüyor; `:689,709` çoklu seçim guard'ı olmadan reparent ediyor. Tek seçime
   düşme **önceden vardı**; bunu yeni grup hareketi regresyonu saymıyoruz. Yeni
   özelliğin “çoklu seçimde ebeveyn değiştirmez” iddiası bu yolda sağlanmıyor.
   Eski store/Free/Flow dosyalarıyla aynı yedi containment kontrolü yeşil;
   yeni kaynakla bu vaka ve yukarıdaki üç istisna kırmızı.

5. **P3 — `a2f1e19`: etkin arayüzde tekil hitaplar kalmış.**
   `translations.js:63` Rehber'de `Sayfanı…`; `:1925` Paylaşım'da `Eklediğin…`;
   `:1929` misafir uyarısında `İşin…`; `:2768` profilde `ziyaretçini` var.
   Gerçek bileşen çağrı yerleri ve Rehber testi incelendi. `hazır olduğunda`
   ifadesi çalışma/siteyi üçüncü kişi olarak anlatabileceğinden tek başına kesin
   tekil hitap bulgusu sayılmadı. Kısa `Kaydet`, `Menüyü aç` komutları hata değil.

6. **P3 — Türkçe guard `Çalışmanı` geri dönüşünü kaçırıyor.**
   `translations.formal.test.js:13` içindeki JS `\b`, baştaki `ç` için Unicode
   sözcük sınırı oluşturmuyor. Gerçek eski `Çalışmanı kaydet, hazır olduğunda yayınla`
   metnini geri koyunca **2/2 test hâlâ yeşil**. `Çalışman burada tutulur` da kaçıyor;
   `geziyorsun` karşı kontrolü ise testi kırıyor.

7. **P3 — Türkçe guard resmî bir cümlede yanlış alarm veriyor.**
   `translations.formal.test.js:10` içindeki genel `rsan` kalıbı `Korsan yazılım
   kullanmayın.` cümlesini tekil koşul eki sayıp kırılıyor. Bu cümle mevcut ürün
   arızası değil; guard'ın doğrulanmış yanlış alarm örneği.

**`a34577b`: incelenen kapsamda somut hata bulunmadı.** 401 olayının kimlik
temizlenmeden kurtarmaya bildirilmesi, iptal edilebilir misafir kurtarma yolu,
eski token/normal giriş yanıtlarının ayrılması, `sessionEnded` bayrağının yeni
girişte sıfırlanması ve login dönüş adresi/mesaj sınırları incelendi. Yenileme
sonrası bildirim kalıcılığı ve gerçek ekran okuyucu duyurusu yeniden denenmedi.

### Testlerin kendi bozmalarımızla doğrulanması

| Alan | Başlangıç / geri yükleme | Bağımsız bozma sonucu |
| --- | --- | --- |
| Save, API client, Login return | 3 dosya / 30 test yeşil | 8 ayrı bozmanın her biri en az bir testi kırdı: eski mesajı temizlememe, her mesajı temizleme, refused bayrağı, server logout, yeni giriş/normal logout ve login mesaj kapsamları |
| Store, reparent, koordinatlar, FreeCanvasItem, export | 5 dosya / 68 test yeşil | 9 bozma: 7 gözlenebilir değişiklik yakalandı; iki survivor aşağıda |
| Türkçe guard + Rehber | 2 dosya / 8 test yeşil | 8 izole sözlük varyantı: Unicode kaçışı ve yanlış alarm yukarıda; resmî dil/kısa komut/e.g. istisnaları kontrol edildi |

Sürükleme bozmaları: 4→5 ve 4→3 derinlik sınırı, 60→61 çocuk sınırı, eski `tabId`
temizliği, tutma noktasının x ofseti, kendi alt hedefini seçme ve iç içe fit
ölçeklerini yok sayma ilgili testleri kırdı. Yalnız ara `moved.tabId` atamasını
bozmak etkisiz kaldı: yardımcı aynı değeri tekrar doğru yazıyor, bu kapsam açığı
kanıtı değil. `<4` eşiğini `<=4` yapmak ise 10/10 yeşil kaldı: mevcut testler
2,2px ve 10px içeriyor, **tam 4px sınırında test açığı var**.

Ek inceleme probe'ları normal test paketine uygulanmadı. Kalıcı tekrar üretme
yamaları yalnız test içerir; üretim düzeltmesi değildir:

- [Kayıt yarışı](review-evidence/round-04/save-warning-repro.patch): mevcut
  `useEditorSave.test.jsx` dosyasına bir test; HEAD'de 1 kırmızı/17 yeşil,
  önceki hook ile yalnız yeni test yeşil.
- [Taşıma / export](review-evidence/round-04/reparent-reproducers.patch): iki
  inceleme dosyasında 12 probe; HEAD'de **5 kasıtlı kırmızı / 7 yeşil**.
  Bunlar düzeltme değerlendirilmeden normal CI keşfine eklenmemeli.

Yerel kanıtlar: `/tmp/sitebuilder-round4-save-warning-patch-{current,parent}.log`,
`/tmp/sitebuilder-round4-save-auth-*.log`,
`/tmp/sitebuilder-round4-reparent-{guard,export,before}-probes.log`,
`/tmp/sitebuilder-round4-reparent-mutation-results.json`,
`/tmp/sitebuilder-round4-turkish-mutation-summary.json`.

### `f299b3d` ve kapsam sınırları

`e2e/editor-canvas-stress.spec.js` ayrımı yeni kuralla uyumlu: pointer içeride
bırakılırsa clamp, dışarıda bırakılırsa sayfaya reparent. Yeni test DOM'dan ayrılma,
tek kopya, literal `(580,360,180,60)`, ebeveynin sabit kalması ve tek undo/redo'yu
denetliyor. Son Chromium koşusu
[39263473935](https://github.com/Ardakorkmaz0/SiteBuilder/actions/runs/39263473935)
yeşil; aynı spec Firefox turunda da çalışacak.

Store/export ve React probe'ları iç içe kaplar, dört düzey sınırı, iki **ayrı**
tabs bileşeni arasında doğru aktif panel, fixed/navbar/çoklu seçim ve ölçek
hesabını kapsıyor. Aynı tabs bileşeninin iki paneli arasında taşıma, eski ebeveyn
eşitliği nedeniyle reddediliyor (`editorStore.js:2976`); bu UX destekleniyor diye
sunulmamalı. Yeni manuel pointer senaryoları gerçek tarayıcıda denenmedi; React
probe'ları açık dikdörtgenler kullanır. Bunlar gerçek hit-test, pointer capture,
scroll, dokunma ve çizim geometrisi kanıtı değildir. Türkçe inceleme kaynak çağrı
yerleri/jsdom ile yapıldı; gerçek Türkçe menü gezintisi yapılmadı.

## 2. Firefox turu

Playwright'a `Desktop Firefox`, 1440×900 ve mevcut API-only setup bağımlılığıyla
bir Firefox projesi eklendi. Aynı tam E2E paketi çalışır; test atlama/alt küme yok.
GitHub Actions tarayıcı matrisi iki bağımsız backend/veritabanı açar; her işte
tek worker korunur. Bir tarayıcının hatası diğerini iptal etmez (`fail-fast:false`).
Her iş yalnız kendi tarayıcısını `--with-deps` ile kurar, `--project` ile seçer;
hata raporlarının adları tarayıcıya göre ayrılır. Chromium override ayarı korunur.

Temel alınan resmi [Playwright projects](https://playwright.dev/docs/test-projects)
ve [CI](https://playwright.dev/docs/ci) belgeleri. Yerelde tarayıcı kurma/çalıştırma
yapılmadı; `npm run e2e -- --list` ile keşif kontrol edildi. Gerçek Firefox sonuçları
push sonrası bu bölüme eklenecek.

### Süre tabanı

`f299b3d` başarılı koşusu `39263473935`: E2E işi **605 sn (10:05)**;
tarayıcı kurulumu 22 sn, test adımı **558 sn (9:18)**. Tam workflow oluşturma→son
güncelleme **615 sn (10:15)**. Bu tek koşu karşılaştırmasıdır; runner yükü ve
indirme süreleri değişebilir. Yeni matriste hem kritik yol (bekleme) hem iki E2E
işinin toplamı (runner kullanımı) ayrı ölçülecek.

## 3. Yerel doğrulama

- Lint ve build geçti; build'de mevcut büyük chunk uyarısı var.
- Node 26'da `NODE_OPTIONS=--no-experimental-webstorage`: **276 dosya / 2546 test
  geçti**, 169,96 sn (iki worker).
- Backend: **817 geçti**, 164,39 sn; 602 mevcut uyarı. Model/migration değişmedi.
- `git diff --check` temiz. Dev sunucusu başlatılmadı, yerel/üretim verisi değiştirilmedi.

### İlk Firefox koşusu ve düzeltilen test sorunları

[`f16bee6`, koşu 39266780743](https://github.com/Ardakorkmaz0/SiteBuilder/actions/runs/39266780743):
Chromium 98/98 (97 tarayıcı + setup), frontend ve backend geçti. Firefox 1 kalıcı
hata, 1 retry'da geçen kararsız test ve 96 doğrudan geçen test bildirdi (setup dahil).

- `editor-canvas-stress.spec.js` dışarı bırakılan çocukta iki denemede de yalnız
  x koordinatını 580 yerine **581** buldu. DOM ebeveyn değişimi ve y/w/h doğruydu.
  Trace fare başlangıcı `(421.941055,319.428284)`, bitişi
  `(838.441055,527.678284)` idi; amaçlanan x farkı 416,5 ekran pikseli.
  Kurulu Playwright 1.63.0'ın Firefox adaptörü
  (`node_modules/playwright-core/lib/coreBundle.js`, `ffInput.ts` bölümü)
  move/down/up koordinatlarını `Math.floor` ile gönderiyor: gerçek fark 417.
  Fit ölçeğinde bu yaklaşık 500,60 tasarım pikseli; 581 sonucu bu girişle uyumlu.
  Test artık **%80 ve %100** açık yakınlaştırmada tam piksel başlangıç ve hareket
  kullanıyor. Aynı literal `(580,360,180,60)`, ebeveynin sabit kalması, tek kopya
  ve tek undo/redo beklentileri korunuyor. Hata toleransı artırılmadı. İlk fixture
  kutusu ve ölçekler de doğrulanıyor. Uygulama kodu değiştirilmedi.
- `editor-workflow-sweep.spec.js` SEO okumada ilk denemede `seo.title` için
  `undefined` erişimiyle kırıldı, retry geçti. Kaydet düğmesinin tıklanması asenkron
  yazmanın bitmesini garanti etmiyor; ilk GET eski ve geçerli satırı döndürebiliyor.
  Poll artık her okumanın HTTP 200 olduğunu kontrol edip henüz bulunmayan `seo`
  anahtarını bekliyor. Yalnız başlık yerine başlık/açıklama/paylaşım resmi/favicon
  için literal nesnenin tamamını doğruluyor. Ek sabit bekleme eklenmedi.

Keşif artık her tarayıcıda **98 vaka + 1 API setup**. Tüm paket tekrar CI'da
çalıştırılacak. Bu iki değişiklik test düzeltmesidir; bölüm 1'deki Claude üretim
kodu bulgularına düzeltme uygulanmadı.

İlk (başarısız) denemenin ölçümü: Chromium işi 562 sn, Firefox 740 sn;
E2E işlerinin toplamı 1302 sn (önce 605 sn). Workflow 744 sn (12:24), taban
615 sn (10:15): **+129 sn, yaklaşık %21**. Bu Firefox tekrarlarını içerir;
temiz koşunun süresi aşağıda ayrıca raporlanmalı.

Firefox düzeltmelerinin CI doğrulaması devam ediyor; tur henüz bitmiş sayılmıyor.
