# ChatGPT için sıradaki işler — 19 Ekim 2026

Başlangıç: `master`'ın son hali (`git pull`). Kurallar `AGENTS.md`'de. Deploy yalnızca
sahip "canlıya al" derse yapılır. Bu turdaki değişiklikler canlıda değil.

## 1. Önce çapraz inceleme

Claude'un son değişikliklerini inceleyin. Bulguları raporunuza yazın; kodu siz
düzeltmeyin, Claude düzeltir (`AGENTS.md`, "Large changes get reviewed by the other agent").

| Commit | Ne | Nereye bakılmalı |
| --- | --- | --- |
| `5e7e3ec` | Reddedilen otomatik kaydın mesajı başarılı kayıttan sonra kalkıyor | `components/editor/useEditorSave.js` ve testi |
| `a34577b` | Sunucu oturumu bitirince giriş sayfası nedenini söylüyor | `store/authStore.js` (`sessionEnded`), `api/client.js`, `pages/LoginPage.jsx` |
| `52f0dca` | **Yeni özellik:** var olan bir öğeyi bölüme, kaba ya da sekme paneline sürükleyerek taşıma ve dışarı çıkarma | `store/editorStore.js` (`moveComponentInto`, derinlik/çocuk sınırları), `utils/reparentDrag.js`, `FreeCanvasItem.jsx` ve `FlowCanvasItem.jsx` içindeki sürükleme bitişi, `index.css` (`.pwb-drop-target`) |
| `a2f1e19` | Türkçe arayüzün tamamı "siz" diliyle; koruma testi | `i18n/translations.js`, `i18n/translations.formal.test.js` |

`52f0dca` için özellikle:

- Testleri, yazarın denemediği bozmalarla doğrulayın: `editorStore.moveInto.test.js`,
  `reparentDrag.test.js`.
- Claude bunları gerçek Chromium'da denedi: bölüme, kaba ve sayfaya taşıma; ekrandaki
  konumun korunması; geri alma ve yineleme; kaydet ve yeniden yükle; telefon görünümü. Şunlar
  **denenmedi**, siz deneyin:
  - Sekmeler arası taşıma ve taşınan öğenin doğru sekmede görünmesi.
  - İç içe kaplar (kap içinde kap) ve dört seviye sınırı.
  - Taşınan öğelerin yayınlanan sayfadaki konumu (`schemaToFiles`).
  - Sabitlenmiş (pinned) öğeler ve gezinti çubuğu (bunlar bilerek taşınmıyor).
  - Çoklu seçimle sürükleme (bilerek taşımıyor).
  - Ölçeklenmiş iç içe kaplarda telefon görünümü.
- Bir öğeyi yalnızca tıklamak hiçbir şeyi taşımamalı (4 piksellik eşik).

`a2f1e19` için: Türkçe arayüzde gezip hâlâ "sen" diliyle yazılmış bir metin kalıp
kalmadığına bakın. Koruma testinin kalıpları yanlış alarm veriyor ya da bir şeyi
kaçırıyorsa raporlayın. Kısa komut etiketleri ("Kaydet", "Menüyü aç") bilerek emir
kipinde bırakıldı.

## 2. Tur 4: Firefox

`docs/TEST-PLAN-2026-10-19.md`'deki 4. tur:

- `frontend/playwright.config.js`'e bir Firefox projesi ekleyin; CI'da
  `npx playwright install --with-deps chromium firefox` gerekecek.
- Firefox'ta kırılan uçtan uca testleri inceleyin. Uygulama hatasıysa, hatanın yaşadığı
  katmanda testle düzeltin. Firefox'a özgü bir test sorunuysa testi düzeltin.
- CI süresinin ne kadar uzadığını raporda yazın. Çok uzarsa Firefox'u yalnızca bir alt
  kümede çalıştırmayı önerebilirsiniz; karar sahibin.

## 3. Bitirirken

- `docs/ROUND-04-firefox-<tarih>.md` raporu: önce çapraz inceleme bulguları, sonra Firefox.
- Plan durum tablosunu güncelleyin.
- Commit ve push edin (sahibin adıyla, ajan imzası olmadan). CI sonucunu kontrol edin.
- Canlıya almayın.
