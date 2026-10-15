# İkinci test turu — 15 Ekim 2026

Önceki denetimin `7cffe73` commitinden sonra, test boşluğu olan yerel klasör editörü (`/code`), disk/IndexedDB, HTML içe aktarma, HTML/ZIP dışa aktarma ve site iş akışları seçildi. Doğrulanan sorunlar testte tekrar üretildi ve düzeltildi.

## Yeni bulgular ve düzeltmeler

| Yer | Nasıl tetikleniyordu? | Son davranış |
|---|---|---|
| `frontend/src/pages/CodeProjectPage.jsx:147` | HTML Source alanında yazılan metin yalnız workspace içinde kalıyordu; üst Save/Save All pasif kalabiliyor veya eski içeriği kaydediyordu. | Canlı kaynak taslağı kirli sayılıyor, kayıt ve kopyadan önce store'a aktarılıyor. |
| `CodeProjectPage.jsx:160`, `components/editor/ProjectFilesPanel.jsx:104` | Source taslağından başka dosyaya geçmek metni kaybettiriyordu. | Geçişten önce canlı belge alınır; dosyayı yeniden açınca taslak yerindedir. |
| `CodeProjectPage.jsx:175` | Yalnız Source değişmişken Close/ayrılma uyarısı çıkmıyordu. | Taslak, ayrılma ve tarayıcı kapatma uyarısına dahil edilir. |
| `CodeProjectPage.jsx:674`, `store/projectStore.js:77` | Farklı klasörlerde aynı `index.html` yolu varsa önceki klasörün Source metni/seçimi taşınıyordu. | Klasör oturum kimliği workspace, kaynak editörü ve seçimi ayırır. |
| `CodeProjectPage.jsx:169` | HTML içinde yazarken cihaz önizlemesini değiştirmek henüz commit edilmemiş metni kaybettirebiliyordu. | Cihaz değişmeden canlı iframe snapshot'ı alınır. |
| `frontend/src/store/projectStore.js:37` | Eski yavaş disk kaydı yeni kayıttan sonra tamamlanıp güncel dosyayı ezebiliyordu. | Her klasörün kayıtları tek kuyrukta sıralanır; saving durumu bekleyen işleri de kapsar. |
| `projectStore.js:77`, `projectStore.js:104` | Eski klasörün kaydı tamamlanınca aynı yoldaki yeni dosyanın original/dirty/saving/hata durumu değişiyordu. | Kayıt sonucu kendi klasör oturumuna aittir; eski iş yeni klasörü değiştiremez ve başarılı sayılmaz. |
| `projectStore.js:153` | Kayıt sürerken içeriği eski haline döndürüp Save All seçmek dosyayı temiz sanıyor, ilk kayıt sonradan diski değiştirebiliyordu. | Bekleyen kayıt yolları Save All snapshot'ına dahil edilir; geri alınan içerik de sırayla diske gider. |
| `projectStore.js:140` | Asset handle'ı yanlışlıkla metin kaydına verildiğinde ikili dosya boş metinle değiştirilebiliyordu. | Metin kaydı yalnız HTML/CSS/JS dosyalarına uygulanır. |
| `frontend/src/utils/projectFs.js:73` | Okuma izni/hatası boş belgeye çevriliyor; sonraki kayıt gerçek dosyayı boşaltabiliyordu. | Okunamayan dosyanın yolu ve hata bildirilir; mevcut açık klasör/taslak korunur. |
| `frontend/src/utils/fileWritable.js:4` | write/close hatasında açık writable stream bırakılabiliyordu. | Başarısız işlem abort edilir; asıl hata korunur. Yerel HTML, proje kaydı ve proje kopyası aynı yazıcıyı kullanır. |
| `frontend/src/utils/htmlFiles.js:58` | `../`, root-relative ve URL kodlanmış dosya yolları yanlış dosyayı seçiyor; klasör yüklemesinin kök adı çözümü bozabiliyordu. | Yol, bağlam dizinine katıldıktan sonra normalize edilir; yükleme kökü ve Unicode/boşluklu adlar doğru çözülür. |
| `htmlFiles.js:275` | Aynı ada sahip birden fazla dosyada basename fallback ilkini rastgele seçiyordu. | Belirsiz aday seçilmez; gerçek göreli/kök yol önceliklidir. |
| `htmlFiles.js:158` | `srcset` içindeki data URL virgülü aday ayırıcı sanılıyor; canlı önizlemede yerel srcset dosyaları taşınmıyordu. | URL ve descriptor ayrı okunur; data URL korunur, yerel adaylar inline edilir. Edit modunda authored srcset korunur. |
| `htmlFiles.js:67` | Harici JS/CSS içindeki kapanış etiketi metni HTML belgesini kesebiliyor; stylesheet `media` niteliği kaybolabiliyordu. | Raw-text kapanışları güvenle escape edilir; stylesheet nitelikleri korunur. Escape authored harfleri ve whitespace'i değiştirmez. |
| `frontend/src/utils/exportFiles.js:20` | CSS/JS'deki literal `$` replacement belirteçleri dışa aktarılan kodu değiştiriyordu. | Yerleştirme/restorasyon callback kullanır; literal metin korunur. |
| `exportFiles.js:73` | Minify; attribute içi boşluk/yeni satırları, yorum benzeri değerleri ve kendi placeholder'ına benzeyen authored metni bozabiliyordu. | Tag/attribute ve raw-text blokları korunur; geçici belirteçler kaynakta bulunmayacak şekilde seçilir. |
| `frontend/src/utils/zip.js:39` | Türkçe/emoji dosya adları UTF-8 yazıldığı halde ZIP header encoding flag'i yoktu; arşiv açıcıları adları yanlış okuyabiliyordu. | Yerel ve merkezi ZIP header'larında UTF-8 flag'i bulunur. |
| `backend/builder/serializers.py:786`, `views.py:747`, `views.py:795` | `"false"` string'i okundu/çözüldü sayılıyor; eksik veya yanlış tipte istek de satırı değiştirebiliyordu. Katı boolean doğrulamasındaki HTML form checkbox varsayılanı da boş formu sessizce False yapıyordu; ek regresyonla kapatıldı. | Durum alanı her encoding için zorunlu ve açık JSON boolean olmalıdır. Yanlış/eksik gövde 400 alır; satır değişmez. |
| `backend/builder/views.py:1198` | Ziyaret API'sine liste/string gövde göndermek 500 üretirken sayaç önceden artıyordu. Event yazımı başarısız olunca sayaç tek başına kalıyordu. | Gövde önce doğrulanır; sayaç ve event tek transaction içinde commit/rollback olur. Referrer yalnız hostname olarak saklanmaya devam eder. |
| `backend/builder/views.py:760` | “Son 30 gün” sorgusu ilk günün mevcut saatten önceki ziyaretlerini dışarıda bırakıyordu. | Bugün ve önceki 29 takvim günü yerel gece yarısından hesaplanır; sınırın iki tarafı İstanbul saat dilimiyle test edildi. |

## Yeni test kapsamı

- Yerel store, dosya I/O, linked HTML ve IndexedDB: **56 yeni test**. İzin reddi, okunamayan dosya, disk write/close/abort, geç kayıt sonucu, kısmi Save All, asset koruması, transaction commit/abort/kota/clone hataları kapsandı. Bu grubun 6 dosyada 71 odak testi geçti.
- Import/export/ZIP: ilk **18**, bağımsız kapanış etiketi case kontrolünde **2** ek regresyon. Nested yollar, klasör kökü, Unicode adlar, belirsiz dosya, media, srcset/data URL, HTML raw-text, replacement belirteçleri, minify ve CRC/offset/JSON round-trip kapsandı. ZIP ayrıca Python `zipfile` ile standart okuyucu üzerinden açıldı.
- Backend: **27 yeni test**. Okundu/çözüldü alanlarında JSON ve multipart/urlencoded boş gövdeler, yanlış tipler, iki yönde geçerli boolean, geçersiz ziyaret gövdesi, rollback, referrer gizliliği ve 30 günlük takvim sınırı kapsandı.
- `/code`: **8 yeni gerçek Chromium senaryosu**. Source → dosya geçişi → Save, Save All, Close/vazgeçme, kopya, aynı yollu yeni klasör, izin reddi/yeniden deneme, mobil önizleme, yavaş kayıt, okunamayan klasör ve eski kayıt sonucu sınandı.

Tarayıcı testlerinde gerçek React UI, Zustand store ve iframe kullanıldı; yerel dosya seçici/disk kontrollü fake handle ile modellendi. Fiziksel disk izni diyaloğu açılmadı. İzin ve hata akışları simüle edilerek doğrulandı.

Toplam **111 yeni test** eklendi: 76 frontend birim/entegrasyon, 27 backend ve 8 tarayıcı senaryosu.

## Son birleşik doğrulama

- Backend tam suite: **806/806 geçti**.
- Frontend tam suite: **221 dosyada 2.137/2.137 geçti**.
- Gerçek Chromium tam suite: **33/33 geçti** (2,4 dakika; setup dahil).
- Son kapanış etiketi metin koruma düzeltmesinin hedefli kontrolü: **4 dosyada 42/42 geçti**; ardından frontend tam suite tekrar geçti.
- ESLint, production build, Django check, migration check ve `git diff --check` başarılı. Bu tur yeni migration gerektirmiyor.

Chromium tam koşusundan sonra son değişiklik yalnız kapanış etiketi escape işlemindeki case/whitespace korumasıdır; bunun import, preview ve export runtime sonuçları ilgili birim testlerinde doğrulandı. Fiziksel disk seçici test edilmedi.

Build, önceki rapordaki büyük HtmlElementPanel ortak parça uyarısını hâlâ veriyor (yaklaşık 684 kB); uyarı bastırılmadı. Backend test ortamının `staticfiles` dizini uyarısı test başarısını etkilemedi.

## Kalan test hedefleri

- Fiziksel klasör seçici, işletim sistemi izin iptali ve çıkarılabilir disk bağlantısının gerçek cihazda kesilmesi.
- Edit önizlemesinde authored inline CSS asset URL'lerinin data URL'e dönüşmesinin kayıttan sonra geri alınıp alınmadığı: henüz doğrulanmış bir bulgu değildir; ayrı round-trip testi hedefidir.
- Gerçek dokunmatik cihaz ve üretim proxy/CDN/PostgreSQL yük kontrolleri önceki rapordaki ortam testleri olarak kalıyor.

Bu turdaki değişiklikler çalışma ağacında; commit, push veya canlıya alma yapılmadı.
