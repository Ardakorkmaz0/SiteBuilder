# Canlıya alma sonrası editör test turu — 16 Ekim 2026

Başlangıç `4adc730`: bu commit push edildi, aynı HEAD'in CI işleri yeşil oldu
ve `bash deploy.sh` ile canlıya alındı. Sonraki değişiklikler bu devam turuna
aittir. Canlıya alma izni önceki commit içindi; bu turda çıkan yeni kod ayrıca
dağıtılmıyor.

## Testle yeniden üretilen bulgular

- **Gradient to renk seçimi:** Hiç gradient yokken yalnız bitiş rengi seçmek,
  boş başlangıç rengi nedeniyle gradienti temizliyordu. Panel beyaz/siyah
  gösterirken uygulayıcı boş değer kullanıyordu. Eksik renkler artık aynı
  beyaz/siyah başlangıçlarını kullanır; açık boş değer temizleme olarak kalır.
  Sayfanın stylesheet'indeki destekli gradientin karşı rengi ve açısı da
  korunur. İlk 15 utility testi eski kodda 10 hata/5 başarılı, düzeltmeden
  sonra 15 başarılı. Gerçek panel, gerçek renk kontrolü ve gerçek HTML stil
  uygulayıcısıyla üç ek test eski kodda 3 hata, düzeltilmiş kodda 3 başarılı:
  ilk To seçimi, ardından From/açı düzenleme ve serialize/reload, stylesheet
  gradientinin tek rengini değiştirme. Telefon ayrımı ayrıca utility
  testlerindedir; Vitest/jsdom sonucu gerçek tarayıcı sonucu olarak sunulmaz.
  Ek iki device regresyonuyla utility sayısı 17 oldu: telefon düzenlemesinden
  sonra PC'de CSS'teki karşı renk/açı korunur; telefon genişliğinde görünen
  telefon gradienti PC değerine kopyalanmaz. İlk aday 1 hata/16 başarılı,
  düzeltmeden sonra 17 başarılı; panel dahil ilgili beş dosya 155/155 geçti.
  Buradaki HTML roundtrip DOMParser ile serialize/reparse'tır; sunucuya
  kaydetme ve uygulamayı yeniden açma E2E akışı değildir.
- **Başka sayfaya kopyalama geçmişi:** İki hedefe veya aynı hedefe hızlı
  kopyalamalar tek geçmiş adımına birleşiyordu. `copyComponentToPage` ayrı
  `record()` kullanıyor. Arada Save olması dahil üç test eski kodda kırıldı;
  düzeltme sonrası ilgili 149 store testi geçti.
- **Global HTML tema geçmişi:** Açık olmayan sayfalar geçmişe kaydedilmiyor,
  Undo sonrasında yeni temada kalıyordu. Açık belge zaten aynı temadaysa diğer
  sayfadaki değişiklik dirty de olmuyordu. Tema işlemi değişen belgeleri tek
  `{ documents, at }` girdisinde tutuyor; legacy tek sayfa girdileri korunuyor.
  Bekleyen Source metni önce ayrı geçmiş adımı olarak alınır. Yedi entegrasyon
  testi eski kaynakta 5 hata/2 başarılı, düzeltilmiş kaynakta 7 başarılı;
  bağımsız Codex mutation kontrolü aynı sonucu doğruladı.
- **Hızlı tema düzenlemesinden sonra eski Redo:** Tema Apply → belge Undo →
  100 ms içinde aynı tema rengini yeniden düzenleme, `record('theme')` geçmiş
  adımını birleştirince yalnız `pastAt` değişiyordu. HTML Redo temizleyicisi
  yalnız `past` dizisine baktığı için eski belgeyi yeniden uygulayabiliyordu.
  Abonelik artık history stamp değişimini de izler. Ayrı gerçek sayfa testi
  eski kodda kırıldı; tema ve iki geçmiş stack'inin komşu testleriyle birlikte
  düzeltme sonrası 10/10 geçti.
- **SEO yanıtının içerik revizyonunu atlatması:** Başka cihaz dokümanı revision
  5'e taşırken açık editör revision 4'te kalsın. Yalnız SEO seçeneklerini
  kaydetmenin yanıtındaki 5, içerik yüklenmeden benimseniyordu; sonraki Save
  revision 5 göndererek diğer cihazın içeriğini sessizce ezebiliyordu.
  `applySitePatch` artık options yanıtından içerik revizyonunu almıyor. Gerçek
  kontrol merkezi üzerinden yeni entegrasyon eski kodda 5 yerine 4 beklediği
  yerde kırıldı; düzeltme sonrasında 409 diyalogu ve yerel taslak korundu.
- **Checkpoint/Save yarışı:** Checkpoint yükleme ortak kayıt kuyruğunu
  atlayabiliyordu. Yerel dosya yazımı veya eski kayıt yanıtı beklenirken restore
  tamamlanınca eski kayıt checkpoint'i yeniden ezebiliyordu. Restore şimdi
  aynı save queue'da çalışır. Her await sınırında en son taslak karşılaştırılır;
  değişen çalışma önce kaydedilir ve en çok üç denemeden sonra son taslak
  ekranda korunur. Pending Source önce flush edilir; A'nın geciken restore
  cevabı B editörüne uygulanmaz. 11 entegrasyon testi eski kodda 7 hata/4
  başarılı, düzeltme sonrası 11 başarılı; HistoryPanel ve komşu kayıt testleri
  ile 30/30 geçti. Unmount guard'ını kaldıran mutation, gerçek B iframe'inin
  A içeriğiyle ezildiğini yakaladı. `base_revision` içerik snapshot'ıyla
  birlikte, yerel dosya yazımını beklemeden önce alınır.
- **Ayrıldıktan sonra bekleyen kayıt:** Site A'nın kaydı yanıt beklerken son
  bir değişiklik yapılıp B açılırsa, A'nın ayrılma kaydı global store'dan B'nin
  içeriğini okuyabiliyordu. Üç gerçek EditorPage testi yanlış A payload'unu,
  B'nin yanlışlıkla temiz işaretlenmesini ve 409 kurtarma taslağına B'nin
  yazılmasını eski kodda doğruladı. Layout cleanup, workspace ref'i kaybolmadan
  A'nın son schema/HTML/currentPageId değerlerini yakalar; kuyruktaki A kaydı
  bu sabit snapshot'ı kullanır ve B'nin dirty/history durumuna dokunmaz.
  Uygulanmamış component Source ayrı `codeDrafts` kurtarma taslağında korunur;
  başarılı eski kayıt bu metni temizlemez. Dördüncü test de eski kodda kırıldı;
  düzeltme sonrası dört yeni test ve beş ayrılma regresyonu 9/9 geçti.
  Ek beşinci test, bekleyen otomatik kayıt sırasında açıkça “kaydetmeden çık”
  seçildikten sonra gelen 409'un silinmiş taslağı yeniden oluşturduğunu
  kanıtladı. Recovery yazımı da `discardLeaveRef` tercihini izler. Düzeltme
  sonrası detached, restore, ayrılma ve tema komşuları yedi dosyada 31/31 geçti.
- **Restore sırasında sunucunun eski satırı kullanması:** `get_object()` ile
  izin kontrolü yapıldıktan sonra başka bir kayıt tamamlanırsa, transaction
  içindeki eski `site` nesnesi recovery'ye eski dokümanı koyabiliyor, metadata
  alanlarını geri yazabiliyor ve revision 4 → 5 → 5 yapabiliyordu. Restore,
  transaction içinde owner filtresi korunarak `select_for_update()` ile satırı
  yeniden okur; recovery, restore ve revision artışı aynı kilitli nesneyi
  kullanır. Yalnız schema/html/revision/updated_at alanları yazılır.
  Yeni altı endpoint testi, unauthenticated ve başka owner çağrılarını DB
  satırı/history count ile doğrular; normal owner restore ve permission-read
  sınırına yerleştirilen gerçek DB yazımından sonra üç regresyonu kapsar.
  Eski kaynakta 3 hata/3 başarılı; düzeltme sonrası versions/revision
  komşularıyla 29/29 başarılı. Bu deterministik stale-read kanıtıdır;
  SQLite testi PostgreSQL'in paralel satır kilitlemesini ölçtüğü iddiasını
  taşımaz.

## Henüz kapatılmayan bulgular

Dar tuvale container Paste, dış kutuyu küçültüp nested çocuğun tasarım
koordinatını koruyabiliyor; örneğin 800 px parent içindeki x=650 çocuk, 500 px
parent'a kopyalanınca kırpılıyor. PC, mobil ve normalize/reload turunda üç
tanı testiyle doğrulandı. Bunlar şu an normal suite'e eklenmiş kalıcı kırmızı
testler değildir; önceki turun geçici tanı dosyaları bu raporun kalıcı
ekleri değildir.

Yalnız geometriyi ölçeklemek `fit: off` yazının fontunu aynı bırakıp yeni
kırpılma üretebilir; yalnız x'i sınırlamak öğeleri üst üste bindirebilir. Bu
nedenle kanıtsız bir hızlı düzeltme uygulanmadı. Güvenilir çözüm, container'ın
tasarım alanını Edit, View ve export taraflarında tutarlı sığdırmayı gerektirir.
Devam incelemesinde gerçek store, ContainerEditor ve Renderer/export ile beş
izole tanı daha geçti: Paste anında küçültürken, copy-to-page başlangıçta
800 px bırakıp normalize/reload sırasında aynı kırpılmaya dönüşür. Dolayısıyla
yalnız Paste offset'ini değiştirmek yeterli değildir. İçerik metni silinmez;
geometriye erişim ve görünürlük bozulur.

İçeri aktarılan CSS'te `#id { background-image: ... !important }` gibi daha
güçlü bir selector varsa, mevcut mobil override stylesheet'inin attribute
selector'ları onu geçemeyebilir. Bu eski, genel mobil stil önceliği sınırlaması
bu turun renk varsayılanı düzeltmesiyle çözülmüş sayılmaz. Utility testleri
mobil değerin kaydedilmesini ve PC'den ayrılmasını doğrular; gerçek medya
sorgusu ve CSS cascade görünürlüğünü jsdom ile kanıtlamaz.

## Birleşik doğrulama

| Kontrol | Sonuç |
| --- | --- |
| Frontend tam suite | **240 dosyada 2.279/2.279 başarılı**, 93,72 saniye |
| Backend son tam suite | **817/817 başarılı**, 137,28 saniye |
| ESLint | Başarılı |
| Üretim derlemesi | Başarılı |
| `git diff --check` | Temiz |

Bu devam turu frontend'de **48**, backend'de **6 yeni test** ekler. Frontend Node 26 üzerinde
`NODE_OPTIONS=--no-experimental-webstorage npm run test:run -- --maxWorkers=4`,
backend `.venv-linux/bin/python -m pytest -q` ile çalıştırıldı. Model veya
migration değişikliği yok. Mevcut büyük bundle ve test ortamındaki staticfiles
uyarıları sürer; yeni test hatası yok. Yerel loglar:
`/tmp/sitebuilder-continued-{frontend,backend,lint,build}.log`.
Sunucu restore düzeltmesi sonrasındaki tam koşu:
`/tmp/sitebuilder-continued-backend-final.log`. Bu ikinci düzeltme frontend
kaynaklarını değiştirmez; frontend tam suite/lint/build aynı kaynakla geçmiştir.

Gradient ve editör düzeltmeleri `7ac4873` ile owner author/committer kimliğinde
master'a push edildi. Aynı commit'in CI frontend ve backend işleri yeşil;
sunucu restore kilidi sonraki ayrı commit'te tutulur. Yeni HEAD'in CI sonucu
ayrıca kontrol edilir. Bu devam turundaki hiçbir commit canlıya alınmamıştır.

Yeni E2E spec veya yerel tarayıcı koşusu yok; testler Vitest/jsdom ve izole
fixture'larla çalıştırılıyor. Üretim verisine test yazımı yapılmıyor.

## Bağımsız inceleme

Üretim değişikliklerini yazmayan Codex ajanları testlerin kaynakla ilişkisini
inceledi. İzole kaynakta `copyComponentToPage` coalescing'ini geri getirmek üç
testi; options yanıtından revision benimsemeyi geri getirmek SEO testini;
eski gradient utility'sini kullanmak üç bağlı panel testini kırdı. Gerçek
HistoryPanel entegrasyonu için unmount guard mutation'ı B belgesinin A ile
ezildiğini gösterdi. Bir reviewer'ın bildirdiği CSS-only PC gradientinin
telefon düzenlemesi sonrası kaybolması iddiası yeniden üretilip düzeltildi.
Yazarlar bulguları testle doğruladı; reviewer kaynakları sessizce değiştirmedi.
Detached kayıtta beş test bağımsız olarak da geçti; global store'u kullanma,
eski cevabın B'yi temiz işaretlemesi ve pending Source recovery'sini kaldırma
mutation'larının üçü de ilgili regresyonları kırdı.
Sunucudaki restore düzeltmesinin altı testi de bağımsız kopyada geçti;
transaction içindeki fresh read kaldırılınca üç regresyon kırıldı. Yalnız
`select_for_update` yerine normal queryset koyan mutation SQLite testlerini
kırmaz: gerçek paralel PostgreSQL row-lock testi yapılmış sayılmaz.

Ek salt okunur tanıda gerçek HtmlWorkspace üzerinden iki PC/telefon testi,
serialize → projectSnapshot → splitPageHtml → publishedPagesFor zincirinde
gradienti, `!important` değerini ve responsive override stilini korudu.
Backend'in üç HTML doğrulama yolu da aynı ham HTML'yi korudu. Bu geçici tanılar
kalıcı suite'in 48 yeni frontend test sayısına eklenmez ve gradient için
ayrıca E2E kayıt kuyruğu testi yapıldığı iddiasını taşımaz.

Claude CLI mevcut olmadığı için gerçek Claude çapraz incelemesi henüz
yapılmadı. Bu Codex kontrolleri Claude onayı olarak sunulmaz; bu rapor
Claude'un kontrol etmesi gereken kaynakları ve açık sınırları kaydeder.
