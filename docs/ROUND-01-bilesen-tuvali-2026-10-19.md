# Tur 1 — Bileşen tuvali (Claude, 19 Ekim 2026)

`docs/TEST-PLAN-2026-10-19.md` planının ilk turu. Her şey yerel sunucularda (8001/5173),
gerçek bir tarayıcıda (Chromium, 1280×800) ve yerel bir misafir hesabıyla denendi. Site,
uygulamanın kendi "Yeni site oluştur" akışıyla açıldı. Test verisi sonunda silindi.

## Bulunan ve düzeltilen hatalar

| Commit | Hata | Test |
| --- | --- | --- |
| `10beb0d` | Oluşturma sihirbazında açıkça "Boş tuval" seçilse de editör ilk açılışta AI Site Sihirbazı'nı kendiliğinden açıyordu. Anahtar istemeyen bir sağlayıcı olduğu için AI her zaman "hazır" sayılıyor; bu yüzden canlıda da her yeni boş sitede oluyordu. | `CreateSiteWizard.test.jsx` |
| `3ed8602` | Paletteki "Kapsayıcı" çeşitleri sıradan HTML kutuları, ama "Bırakma alanı / İçeriği buraya bırakın", "İçine bıraktığınız her şey birlikte kalır", "İçine yazı, görsel ya da düğme yerleştirin" diyorlardı. İçlerine hiçbir şey bırakılamıyor: tuvalde öğe üstüne biniyor, HTML sayfasında önüne ya da arkasına ekleniyor. Metinler dürüst hale getirildi ("Kesikli çerçeve" vb.). | Yalnız metin |
| `6b23870` | "Bu sayfa nasıl başlamalı?" (yeni sayfa) penceresi diyalog olarak işaretli değildi: ekran okuyucu duyuramıyordu, odak arkadaki düğmede kalıyordu, Esc çalışmıyordu, Tab dışarı kaçıyordu. | `PageFilesPanel.test.jsx` |
| `07f9b3a` | Aynı yapı için palet "Bölüm", bölüm ayarları "Bölge" diyordu. Hepsi "Bölüm" oldu. | Yalnız metin |
| `58a0fa0` | Sayfa yeniden adlandırma alanının erişilebilir adı yoktu; Enter/Esc sonrası odak sayfanın başına düşüyordu. Artık "Sayfa adı" adını taşıyor ve odak sayfanın düğmesine dönüyor. | `PageFilesPanel.test.jsx` |
| `45dcea1` | Türkçe ekranda paletten eklenen gezinti çubukları ("Brand · Home · About · Contact") ve sekmeler ("Home · Profile · Contact") İngilizce geliyordu. 12 gezinti çubuğu ve 3 sekme hazır ayarının hepsi düzeldi; `href` ve `id` değerleri korunuyor. | `componentPresets.test.js` (kalan İngilizce kelime için koruma testi dahil) |
| `5874299` | Tuvaldeki sekme şeridi `tablist` içinde düz düğmelerdi: `role="tab"` ve `aria-selected` yoktu. Yayınlanan sayfada vardı. | `Canvas.tabsRoles.test.jsx` |

Her testin düzeltme olmadan kırıldığı, yalnızca üretim değişikliği geri alınarak doğrulandı.

## Gerçek tarayıcıda geçenler

- "Yeni site oluştur" sihirbazı (başlık, tür, boş tuval, oluştur). Başlık alanı `<label>` ile adlandırılmış.
- Otomatik açılan AI sihirbazı odağı alıyor (ilk gözlem test sırasından kaynaklanıyordu).
- Paletten tıklayarak belirli bir noktaya ve klavyeyle (Enter) sayfa sonuna yerleştirme. Odak paletteki öğede kalıyor.
- Sürükleyerek taşıma: beklenen tasarım kayması (148, 74), gerçekleşen (148, 71); fark hizalama yakalamasından. Tek geri alma adımı.
- Tutamaçla boyutlandırma: beklenen (89, 30), gerçekleşen (89, 30). Sekiz tutamaç var.
- Geri al / yinele zinciri.
- Shift ile çoklu seçim; sola hizala, yatay ortala. Dağıt, 3'ten az öğede nedenini söyleyerek devre dışı.
- Bölüm (region) bırakma hedefi; telefon görünümünde taşıma masaüstü düzenini değiştirmiyor; sayfa düzeyinde `mobileManual` işaretleniyor.
- Sayfa ekleme (boş tuval), yeniden adlandırma, silme ("“İletişim” (iletisim.html) silinsin mi?") ve geri alma.
- Kaydet ve yeniden yükle: 2 sayfa, 5 bileşen; konum ve telefon düzeni birebir aynı, sayfa "kaydedilmemiş" görünmüyor.
- Sekmeler: sekmeye geçiş, ikinci sekmeye paletten yerleştirme (`tabId` doğru), her sekme yalnızca kendi öğelerini gösteriyor.

## Düzeltilmeyen bulgular (karar ya da sonraki turlar)

- **Var olan bir öğe sürüklenerek bir bölümün içine taşınamıyor.** Görsel olarak bölümün üstüne gelir, ama bölümün çocuğu olmaz. Bölüm taşınır, yeniden dizilir ya da silinirse öğe geride kalır. Bir öğe bölüme yalnızca paletten doğrudan içine eklenerek girebiliyor. Düzeltmek yeni bir davranış gerektiriyor (bırakınca bağlama, koordinat çevirme, geri alma, telefon düzeni); **sahibin kararı**.
- Geniş bir palet öğesi tıklanan noktaya ortalanıyor, ama içeriğe sığdıktan sonra yeniden ortalanmıyor (x=0'da kalıyor). Küçük.
- Geri alma (Ctrl+Z) seçimi tamamen kaldırıyor. Tasarım tercihi olabilir.
- Klavyeyle yerleştirme ekran okuyucuya duyurulmuyor (canlı bölge yok) → Tur 9.
- Şablon seçicideki tam ekran önizleme diyalog olarak işaretli değil ve odağı almıyor (Esc çalışıyor) → Tur 9.
- "CANLI KOD" kutusu (640×120) tuvalin alt kısmını örtüyor ve yerleştirme sırasında oradaki tıklamaları alıyor. Kapatılabiliyor. Küçük.

## Doğrulama

Her düzeltmeden sonra lint ve ilgili testler; tur sonunda tüm frontend testleri, build ve
CI. Değişiklikler canlıya alınmadı.
