# Claude incelemesi — 19 Ekim 2026

`AGENTS.md`'deki çapraz inceleme kuralına göre `b14daa5..c87bf56` arasındaki sekiz commit
incelendi. Yazarın bulguları düzeltmesi beklenir; inceleyen kodu değiştirmedi.

## Sonuç

Engelleyici bulgu yok. Üretim kodu okundu. `c87bf56` için yazarın denemediği üç mutasyon
ayrı bir worktree'de çalıştırıldı. Değişikliklerin beşi yerel sunucularla gerçek bir
tarayıcıda (Chromium) da denendi. jsdom ekran geometrisini hesaplayamadığı için bu
değişiklikler daha önce yalnızca birim testleriyle doğrulanmıştı.

## Mutasyonlar (`c87bf56`, `EditorPage.jsx`)

| Mutasyon | Sonuç |
| --- | --- |
| `applyHistoryRestore` içinde `setComponentSourceDrafts({})` kaldırıldı | Yakalanmadı. Zararsız: taslaklar geri yükleme öncesindeki flush adımında zaten uygulanıp temizleniyor. |
| Kurtarmada taslak varken `setCanvasMode('source')` kaldırıldı | Yakalandı (`EditorPage.recovery.test.jsx`). |
| Panel yokken `flushWorkspaceDrafts` her dosyayı `inlineProjectHtml` ile işliyor (`ownDocument` dalı yok) | **Yakalanmadı.** |

### Bulgu: panel yokken uygulama yolunda test boşluğu ve kod tekrarı

`flushWorkspaceDrafts` içindeki "panel takılı değilken" dalı, `CodePanel.applyPendingHtml`
içindeki dönüşümü kopyalıyor:

```js
html: file.ownDocument ? drafts[file.name] : inlineProjectHtml(drafts[file.name], files)
```

Kod bugün doğru, ama `ownDocument` dalını hiçbir test korumuyor. Bu dal bozulursa
şu durumda kullanıcının kendi HTML belgesine projenin üretilmiş CSS/JS'i gömülür: kaynak
panelinde bir HTML sayfasının dosyası düzenlenmiş, uygulanmamış ve panel telefon
görünümünde kapalıyken bir flush yapılmış (sayfa geçişi, geçmişten yükleme ya da kayıt).

Öneri:

- Dönüşümü tek bir yardımcıya taşıyın (ör. `componentSourceDrafts.js` içinde) ve iki yol
  da onu kullansın.
- Panel yokken HTML sayfası taslağının olduğu gibi uygulandığını doğrulayan bir test ekleyin.

## Gerçek tarayıcıda doğrulananlar

Yerel misafir hesabıyla, yerel sunucularda (8001/5173) yapıldı. Test verisi silindi.

| Commit | Senaryo | Sonuç |
| --- | --- | --- |
| `4adc730` | Başlık ve ona bağlı düğme içeren kap Ctrl+D ile çoğaltıldı | Geçti. Kopyanın düğmesi `#heading_…` kopyasına gidiyor, orijinali `#target`'ta kalıyor. Üretilen HTML'de iki hedef de var. |
| `c87bf56` | Kaynak panelinde uygulanmamış taslak → 390 px (telefon) → 1280 px | Geçti. Taslak duruyor, tasarım değişmedi. |
| `7ac4873` | İki HTML sayfasına tek tıkla tema → bir Ctrl+Z → Ctrl+Shift+Z | Geçti. İki sayfa birlikte geri alındı ve birlikte yinelendi. |
| `7ac4873` / `ae9493f` | Kaydedilmemiş belge değişikliğiyle geçmişten kayıt yükleme | Geçti. Değişiklik önce kaydedildi, sonra seçilen kayıt yüklendi; sunucu ve editör tutarlı. |
| `8b9e1f0` | Telefon görünümünde iç içe kaplar (toplam ölçek 0,27); paletten iç kaba tıklayarak yerleştirme | Geçti. Öğe tasarım koordinatlarında tıklanan noktaya yerleşti. Eski hesapla y≈20'ye düşerdi. |

Konsolda uygulama hatası yok, backend logunda hata yok.

## Küçük notlar (engelleyici değil)

- Geçmişten yüklerken aynı içerik iki satır olarak görünüyor: "Manuel kayıt" (önce
  kaydetme) ve "Yüklemeden önceki çalışmanız" (sunucunun anlık görüntüsü). Backend
  bunu bilerek yapıyor; listede kozmetik bir tekrar.
- `PanelTabs` sekmeleri bir `tablist` içinde, ama listenin adı yok ve sekmeler panele
  `aria-controls`/`role="tabpanel"` ile bağlı değil. Küçük bir erişilebilirlik iyileştirmesi.
- `c8ebb40` bilerek kırmızı push'landı; `master` yaklaşık 4 saat kırmızı kaldı. E2E
  yalnızca CI'da koştuğu için anlaşılır, ama deploy'u bloklar. Kural gerekiyorsa sahibi
  karar verir.
- `docs/SOURCE-RECOVERY-HARDENING-2026-10-19.md` "No deployment is part of this test
  round" diyor, ancak sunucu `c87bf56`'da. Arayüz dosyaları commit'ten yaklaşık 12 dakika
  sonra güncellenmiş. Deploy sonradan sahibin talimatıyla yapıldıysa sorun yok. Dokümana
  bir satır eklenirse kayıt tutarlı olur.
