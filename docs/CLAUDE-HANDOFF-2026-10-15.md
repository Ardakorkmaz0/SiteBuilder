# Claude için değişiklik özeti — 15 Ekim 2026

Bu dosyayla aynı commit, `7cffe73` sonrasındaki üç test turunda bulunan ve
düzeltilen hataları birleştirir. Kullanıcının isteği, özellikle editörde art arda
düzenleme yaparken içerik kaybını önlemek ve daha geniş test kapsamı sağlamaktı.

## Yapılanlar

- **Editör taslağı ve geçmiş:** Kaynak alanındaki uygulanmamış metin; sayfa
  değiştirme, ekleme, silme, adlandırma ve kontrol merkezi açılışından önce
  aktarılır. Undo/Redo yeni taslağı atlamaz. HTML ve şema geçmişinin işlem
  zamanları senkron ayrılır. HTML kaldırma tek Undo ile hem belgeyi hem modu
  geri getirir. Şema–HTML eşleşmesi güncel belgeyi izler; sonradan yapılan bir
  ad değişikliğini geri almak eski belgeyi yüklemez. İnaktif sayfaya HTML
  aktarımında önceki belge senkron yakalanır ve eski silme Redo dalı temizlenir.
- **Kayıt sırasında düzenleme:** Geç tamamlanan kayıt, sonradan yazılmış metni
  temiz saymaz. Kuyruktaki sonraki kayıt güncel sayfaları ve başlığı okur.
  “Kaydetmeden çık” seçimi, henüz başlamamış otomatik kayıtları da durdurur.
- **Bileşen tuvali:** Mobil Duplicate/Paste yerleşimi ve kenar sınırları
  düzeltildi. Parent/child birlikte seçildiğinde aynı alt ağaç iki kez
  çoğaltılmaz. Karma Cut işlemi, panoya alınmamış alt öğeyi silmez. Ayrı HTML
  modu geçişleri geçmişte tek adıma birleşmez.
- **HTML özellikleri:** Seçilen değerler şablonun `!important` kurallarına karşı
  uygulanır. None/kapalı ile Default, ayrıca 0 ile boş/default birbirinden
  ayrılır. Mobil özellikler aktif mobil değeri gösterir. Textarea düzenlemesi
  Unicode satır sonlarını hem canlı value hem defaultValue içinde korur.
  Yeni iframe yüklenirken eski belgenin seçimi, tıklaması ve geciken input
  olayları yeni belgeyi değiştiremez.
- **HTML gezinme ve önizleme:** Klonlanan menü bağlantılarının sırası korunur,
  kimlikler yenilenir, aktif sayfa işaretleri temizlenir. Bileşen sayfasındaki
  özel CSS/JS, View önizlemesinde de korumalı iframe içinde çalışır.
- **Kaynak paneli:** Single/Optimized indirme ve önizlemeler Apply yapılmamış
  kaynağı da içerir. Clipboard başarısı gerçek tamamlanmayı bekler; izin reddi
  görünür hata verir ve yeniden denenebilir.
- **Yerel klasör editörü `/code`:** Kaynak taslağı Save/Save All, dosya geçişi,
  Close, kopya ve cihaz geçişlerinde korunur. Aynı dosya yollarına sahip farklı
  klasörler ayrı oturum kimliği taşır. Disk kayıtları klasör başına sıralanır;
  eski klasörün geç sonucu yeni klasörün içeriğini/dirty durumunu değiştirmez.
  Okunamayan dosya boş belgeye dönüştürülmez, asset metin olarak yazılmaz ve
  başarısız writable stream abort edilir.
- **İçe/dışa aktarma:** Göreli/kök yollar, klasör kökü, Unicode adlar, belirsiz
  basename, srcset/data URL ve stylesheet media korunur. HTML raw-text kapanış
  etiketleri, literal replacement belirteçleri ve minify sırasında authored
  metnin korunması düzeltildi. ZIP başlıkları UTF-8 dosya adı flag'i taşır.
- **Kontrol merkezi ve erişilebilirlik:** Aktif sekmeye yeniden tıklama kalıcı
  yüklenmeye neden olmaz. Inbox/yorum/review mutasyonları hata ve tekrar deneme
  durumlarını yönetir. Dar ekran Save/AI ve kategori/etiket alanları adlandırıldı.
- **Backend:** Inbox/review durum alanları zorunlu gerçek boolean olarak
  doğrulanır. Geçersiz ziyaret gövdesi sayaç artırmadan reddedilir; ziyaret
  sayacı ile event aynı transaction içinde yazılır. Son 30 gün hesabı yerel
  takvim günlerinin gece yarısı sınırlarını kullanır. Migration eklenmedi.

## Kaynaklar ve ayrıntılı raporlar

| Alan | Öncelikli dosyalar |
| --- | --- |
| HTML/taslak/kayıt/geçmiş | `frontend/src/pages/EditorPage.jsx`, `components/editor/HtmlWorkspace.jsx`, `PageFilesPanel.jsx` |
| Bileşen tuvali | `frontend/src/store/editorStore.js` |
| HTML özellikleri | `frontend/src/utils/htmlElementEdit.js`, `domMultilineText.js`, `components/editor/HtmlElementPanel.jsx`, `controls.jsx` |
| Kaynak/önizleme/export | `frontend/src/components/editor/CodePanel.jsx`, `utils/exportFiles.js`, `htmlFiles.js`, `zip.js` |
| Yerel klasör/disk | `frontend/src/pages/CodeProjectPage.jsx`, `store/projectStore.js`, `utils/projectFs.js`, `fileWritable.js`, `localFile.js` |
| Kontrol merkezi | `frontend/src/components/editor/SiteControlCenter.jsx` |
| API | `backend/builder/serializers.py`, `views.py`, `test_workflow_edge_cases.py` |

Yukarıdaki kısaltılmış frontend yolları aynı `frontend/src/` köküne göredir.

- [Yerel dosya, import/export ve backend turu](TEST-FOLLOWUP-2026-10-15.md)
- [İlk kapsamlı editör turu](EDITOR-TEST-2026-10-15.md)
- [Son düzenleme ve kayıt stres turu](EDITOR-STRESS-2026-10-15.md)

Yeni Chromium testleri `frontend/e2e/code-project.spec.js` ve
`frontend/e2e/editor-{canvas,html,workflow,shell}-sweep.spec.js`,
`frontend/e2e/editor-{canvas,code,html,save}-stress.spec.js` dosyalarındadır.
Senaryolar gerçek arayüz, store ve yerel backend üzerinde çalışır; fake disk
handle'ları ile ağ hata/bekleme kontrolleri ilgili testte açıkça belirtilir.

## Doğrulama

Commit öncesi yerel doğrulama (Claude, 15 Ekim): backend 806 test, frontend 230 dosyada 2211 test, `eslint src e2e`, `npm run build`, `makemigrations --check` ve `git diff --check` geçti. Chromium uçtan uca testleri (yeni sweep/stress spec'leri dahil) commit sonrası GitHub Actions'ta koşar; canlıya alma o koşu yeşil olduktan sonra yapılır.

## Kapsam sınırları

Gerçek ücretli AI, SMTP teslimatı, DNS, fiziksel dosya seçici/izin diyaloğu,
Safari/Firefox ve üretim proxy/CDN/PostgreSQL yük testi yapılmadı. Mevcut büyük
HtmlElementPanel bundle uyarısı sürüyor. Testler sıfır hata garantisi vermez;
bu değişikliklerin amacı yeniden üretilen veri kaybı ve düzenleme hatalarını
regresyon senaryolarıyla kapatmaktır.

Son statik önizlemenin ilk denemesi yanlışlıkla production API adresiyle
derlenmişti. Koşu durduruldu; görülen üretim istekleri CORS/preflight ile
başarısız oldu, başarılı üretim yazımı görülmedi. Geçerli testler API açıkça
`http://127.0.0.1:8001/api` olacak şekilde derlenip yerelde tekrarlandı.
Canlıya alma, CI yeşil olduktan sonra ayrı bir adım olarak yapılır.
