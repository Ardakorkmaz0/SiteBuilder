# Tur 8 kanıtları ve sahibin elle deneyeceği dosya pencereleri

## Çapraz inceleme yamaları

Taban `5a10346`. Bunlar üretim düzeltmesi değildir. Ortak çalışma ağacına uygulamayın; bağımsız geçici kaynak kopyasında `git apply <yama>` kullanın.

- `links-probes.patch`: mevcut standalone runtime dosyasına 13 inceleme vakası. 3 vaka aynı P2 dış sunucuya gezinme bulgusu için **bilinen kırmızı**, diğer 10 yeni prob yeşil. Mevcutlerle birlikte 3 kırmızı / 63 yeşil. Frontend'de `NODE_OPTIONS=--no-experimental-webstorage npm run test:run -- src/utils/htmlRuntime.standalone.test.js src/utils/publishedPages.test.js`.
- `admin-integration.patch`: gerçek işlem günlüğü/dil sağlayıcı/staff rozetiyle beş ilave test; güncel kaynakla 5 yeşil. Activity helper kullanımını kaldırma, eski rozet anahtarına dönme veya copyright nedenini spam'e eşleme bozmalarını yakalar. Dosya `src/components/admin/AdminActivity.round8-review.test.jsx`.
- `admin-terms.patch`: boş Tümü filtresinin Türkçesinde `Şikâyet yok` beklentisi; güncel `Bildirim yok` nedeniyle **bilinen kırmızı**. Dosya `src/components/admin/AdminModeration.round8-terms.test.jsx`.

Yamaların hiçbiri normal CI testlerine uygulanmadı. Bulguların etkisi ve odaklı test sınırları ana raporda açıklanır.

## İşletim sistemi pencereleri — sahibi elle dener

`manual-fixture/` klasörünü geçici bir çalışma klasörüne kopyalayın. Denemeleri bu kopyada ve yeni bir yerel test projesinde yapın.

1. Chromium'da `/code` → **Klasör aç…**: gerçek seçicide iptal edip tekrar açın; bu kopyayı seçin. Kökteki `index.html` açılmalı, `assets/index.html` açılmamalı. Görüntüle'de başlık “Yerel proje hazır 🌍”, rengi yeşil ve amblem görünür olmalı.
2. Kaynak'ta metni değiştirin → **Dosyayı kaydet**. Gerçek dosyayı harici düzenleyicide açarak değişikliği kontrol edin. Önce dosyalar arasında geçiş yapıp taslağın kaldığını da deneyin.
3. **Kopyasını kaydet…** ile boş bir hedef klasör seçin. Kaynak klasör aynı kalmalı; hedef HTML/CSS/JS/SVG dosyalarını içermeli. Hedefi tarayıcıda açıp başlığı ve amblemi kontrol edin.
4. Tek HTML için editörün **HTML dosyasını aç ve bağla…** / **HTML dışa aktar…** akışında gerçek dosya seçimi, Farklı Kaydet, iptal ve yeniden izin istemeyi deneyin. Kaydet'e basınca seçilen fiziksel dosyanın değiştiğini harici düzenleyicide doğrulayın. Bağlantılı sayfa projeden çıkarılırsa sonraki kayıt bu eski dosyayı başka sayfanın içeriğiyle ezmemeli.
5. İş bitince geçici test projesini ve kopyalanan klasörleri silin.

Otomatik testler gerçek işletim sistemi seçicisini veya fiziksel izin penceresini onaylamaz. `/code` tarayıcı testleri File System Access sınırında taklit handle kullanır. Yeni klasör içe aktarma E2E'si geçici gerçek dosyaları Playwright filechooser API'siyle seçer; yerel pencereye tıklamaz. HTML indirme E2E'si, iki tarayıcıda da native Save As kullanmayan mevcut indirme geri dönüşünü sınar. Firefox'ta native File System Access klasör seçimi desteği iddia edilmez.
