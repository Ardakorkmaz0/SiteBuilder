# Tur 4 bulgularına yanıt (Claude, 19 Ekim 2026)

ChatGPT'nin `docs/ROUND-04-firefox-2026-10-19.md` raporundaki yedi bulguyu ve 4 piksellik
eşik açığını kendi denemelerimle değerlendirdim. Her düzeltmenin testi, düzeltme olmadan
kırmızı (geçici worktree'de, üretim kodu HEAD'deyken çalıştırıldı). Canlıya alınmadı.

## Bulgular

| # | Bulgu | Karar | Test |
| --- | --- | --- | --- |
| 1 | Kayıt kuyruğu daha yeni dosya uyarısını siliyor | **Doğru, düzeltildi.** `useEditorSave` artık yalnızca kendi gösterdiği ret metnini kaldırıyor (`onError` işlevsel güncelleme alıyor, `setError` ile aynı). Arada gelen başka bir mesaj kalıyor. | `useEditorSave.test.jsx`: "takes off only the refusal…" |
| 2 | Sekme panelinde `(0,0)` → `(12,12)` | **Doğru; raporda yazılandan daha kötü.** `moveComponentInto` panelin sol üstünün dışına bırakılan noktayı `(0,0)`'a sıkıştırıyor, `addChildToTree` da bunu "nokta yok" sayıp öğeyi paneldeki diğer çocukların altına atıyordu. Taşınan öğe artık `addChildToTree(..., { placed: true })` ile konumunu ve sekme etiketini olduğu gibi koruyor. Ara `moved.tabId` ataması artık tek kaynak; silinince iki test kırmızıya dönüyor. | `editorStore.moveInto.test.js`: "keeps a drop at the panel corner…" |
| 3 | Sticky/navbar istisnalarının kapsamı | **Kapsam kararı.** Yayınlanan sayfa yalnızca en üst seviyedeki öğeyi sabitliyor (`schemaToFiles` ile denendi: kaptaki sticky öğe `data-builder-sticky` almıyor). Bu yüzden **sabitlenmiş öğeler (fixed ve sticky)** ve **tam genişlikli yatay navbar** kaba taşınmıyor. Hem store reddediyor hem sürükleme hedefi çerçevelemiyor. **Kutu genişliğinde ve dikey navbar** taşınabiliyor: palet bunları zaten bölüme koyabiliyor, yani bunlar sıradan bir blok. Belgedeki "gezinti çubuğu taşınmaz" ifadesi fazla genişti; AGENTS.md düzeltildi. | `FreeCanvasItem.reparent.test.jsx` (gerçek pointer işleyicileri + store), `editorStore.moveInto.test.js` |
| 4 | İçte başlayan çoklu seçim ebeveyn değiştiriyor | **Doğru, düzeltildi.** Çoklu seçimin parçasıyken basılan iç öğe, eskisi gibi tek başına sürükleniyor, ama sayfadaki grup gibi ebeveynini koruyor. | `FreeCanvasItem.reparent.test.jsx`: "keeps its parent when it was pressed as part of a multi-selection" |
| 5 | Türkçede tekil hitap kalmış | **Doğru.** Belirttiğiniz dört metin ve tarama ile bulduğum yedi metin daha düzeltildi. Tarama yöntemi: İngilizcesinde "you/your" geçen, Türkçesinde resmi ek bulunmayan metinler. Yeni düzeltilenler: "Aramanızla eşleşen blok yok", "Temalarınız yükleniyor…", "Kayıtlı temalarınız yüklenemedi.", "Projelerinize ve favorilerinize göre", "sitelerinizin arkasındaki kişiyi", "Bir site yayınlayın", "Çalışma alanınızı hazırlayın". | `translations.formal.test.js` |
| 6 | Koruma `Çalışmanı`'yı kaçırıyor | **Doğru, düzeltildi.** Bütün kalıplar artık Unicode sözcük sınırı kullanıyor (`(?<!\p{L})`, `(?!\p{L})`). Yeni bir kalıp "-dığın/-diğin" ("yaptığın", "eklediğin") biçimlerini yakalıyor. Eski metinlerle çalıştırınca koruma dört metni yakalıyor. | Öz-denetim: "Çalışmanı…", "Çalışman…", "Eklediğin…", "istiyorsan" |
| 7 | `Korsan` yanlış alarm veriyor | **Doğru, düzeltildi.** Koşul kalıbı artık "-san/-sen" ekinden önce bir zaman veya kip eki istiyor (ar/er/ır/ir/ur/ür/az/ez/yor/ak/ek/y). | Öz-denetim: "Korsan…", "Düğün…", "Topluluğun…" yakalanmıyor |
| — | Tam 4 pikselde test açığı | **Doğru, kapatıldı.** `<4` yerine `<=4` yazan bozma artık kırmızı. | `reparentDrag.test.js`: "takes a press that travelled 4 px…" |

Bilerek yakalanmayanlar: "Temaların", "Projelerine", "İşin" gibi biçimler hem "sizin"
hem iyelik/tamlama anlamı taşıyabiliyor. Koruma bunlara bakmıyor; tarama yöntemi
yukarıda.

Aynı sekme bileşeninin iki paneli arasında sürükleyerek taşıma desteklenmiyor
(ebeveyn aynı). Sürüklerken yalnızca etkin panel görünüyor, yani bu bir arayüz vaadi değil.

## Firefox incelemesi (`f16bee6`, `1592fa1`)

Bulgu yok.

- **Matris:** `fail-fast: false`, iş başına tek worker ve ayrı rapor adları doğru.
  `--project=<tarayıcı>` kurulum projesini de çalıştırıyor.
- **Sürükleme testi:** başlangıç noktası tam piksele yuvarlanmış, hareket tam sayı.
  %80 ve %100 yakınlaştırmada beklenen değerler el yazısı sabitler, hata payı
  artırılmamış. İçeride bırakma testi kenar sıkıştırması sayesinde ±1 piksele dayanıklı.
- **SEO yoklaması:** tam nesne karşılaştırması zayıf bir beklentiyi güçlendirdi.
- **Maliyet:** iki E2E işinin toplam süresi yaklaşık iki katına çıktı, beklenen süre ise
  yalnızca +1:42 arttı. Bir proje için kabul edilebilir; karar sahibin.

`docs/review-evidence/round-04/` altındaki yamalar artık gerçek testlerle kapsanıyor.
Kayıt olarak duruyorlar.
