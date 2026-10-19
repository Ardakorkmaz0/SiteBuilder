# Tur 8 — içe/dışa aktarma ve yerel dosyalar — 20 Ekim 2026

Başlangıç: temiz `master`, `git pull --ff-only` sonrası `5a10346`. Tur 7 raporu ve plan okundu. Önce üç commit'in çapraz incelemesi tamamlandı, sonra Tur 8 düzeltmelerine geçildi. Bu turda **canlıya alma yapılmadı**. Sahibin açık `567` editörü, üretim verisi ve fiziksel dosyaları kullanılmadı; sunucu başlatılmadı. Planın sonundaki ertelenmiş özellik bölümü değiştirilmedi.

## 1. Tur 7 çapraz incelemesi — üretim koduna dokunulmadı

İncelenen commitler: `9422b17`, `bf2fc09`, `29ebc38`. Bozmalar `git archive HEAD` ile oluşturulmuş bağımsız `/tmp` kopyalarında yapıldı. Ortak ağaç stash/revert edilmedi. Aşağıdaki açıklar **raporlandı; bu çalışmada düzeltilmedi**.

| Bulgu | Kanıt ve etki |
| --- | --- |
| **P2 — iki URL ayrıştırması arasında aynı sunucu denetimi aşılabiliyor** | `htmlRuntime.js` içinde `onThisSite` girdiyi doğru URL olarak çözüyor; dönen `pathname` yeniden anchor href'i olunca `//` başka sunucuya dönüşüyor. `/safe/..//elsewhere.example/`, `/%2e//elsewhere.example/`, `/safe/%2e%2e//elsewhere.example/` önce `https://portfolio.example//elsewhere.example/`, sonra `https://elsewhere.example/` oluyor. Runtime sonrası `defaultPrevented:false`. Üç örnek aynı tek kök neden; XSS, oturum bilgisi erişimi veya sandbox kaçışı iddiası değil. |
| **P3 — şikâyet terimi boş Tümü filtresinde eksik** | `translations.js` içindeki `No reports` hâlâ `Bildirim yok`. Gerçek `AdminModeration/ReportsTab`, Türkçe sağlayıcı ve boş API sonucu ile tekrar üretildi: `Şikâyet yok` beklentisi kırmızı. Önceden var olan, terim düzeltmesinde kalmış tutarsızlık; veri/yetki hatası değil. |
| **Odaklı test boşluğu — gezinme** | Mevcut 53 test HTTP protokol kontrolünü kaldırmayı, normalize edilen adres yerine ham adresi anchor'a yazmayı ve viewer mesajından yalnız href'i kaldırmayı yakalamıyor. Ek üç pozitif prob her birini ayrı kırmızı yapıyor. Kodun bütün repo testlerinde korunmadığı iddia edilmedi; yalnız bu iki dosya sınandı. |
| **Odaklı test boşluğu — admin görünümü** | Mevcut 37 test `auditDetail` helper'ının görünümde kullanımını kaldırmayı, staff rozetini eski çeviri anahtarına döndürmeyi veya copyright nedenini spam'e eşlemeyi yakalamıyor. Beş ek gerçek görünüm/çeviri probu bu bozmaları yakalıyor. Mevcut görünüm ve rozet kodu bu noktalarda doğru. |

### Kendi bozmalarımızın sonuçları

- **9422b17:** bazal/geri dönüş **53/53 yeşil**. Dokuz bozmanın altısı mevcut testlerde yakalandı: URL doğrulamasını atlama, host kontrolünü kaldırma, kaynak denetimini kaldırma, bütün parent aktarımını kaldırma, eski case-sensitive ön kontrol, case-sensitive HTML href regex'i. Yukarıdaki üç boşluk ek pozitif problarla ayrı ayrı doğrulandı. Ek 13 probun üçü P2 için kırmızı, onu yeşil; mevcutlerle toplam **3 kırmızı / 63 yeşil**. Büyük harfli HREF dönüşümü ve düz `//`, `javascript:`, backslash/CR/LF/TAB reddi çalışıyor. Viewer kendi blok href'ini bir kez üst pencereye gönderiyor; yabancı iframe aktarılmıyor.
- **bf2fc09:** bazal/geri dönüş **37/37 yeşil**. Dört bozmanın dördü yakalandı. İç `|| pinned` kaldırılınca yeni sticky/fixed vakaları hedef çerçevesinden kırmızı; store'un ayrı reddi bunu gizlemiyor. Tek sticky/fixed ve `fromGroup` bozmaları da yakalandı. Önceki P3 boşluk kapanmış, yeni bulgu yok.
- **29ebc38:** altı odaklı dosya **37/37 yeşil**. Yedi bozmanın üçü mevcut testlerde yakalandı (Owner, şikâyet nedeni çevirisi, kopya sayısı). Dördü kaçtı; görünüm/rozet/copyright için ek beş prob üç kaçan bozmada kırmızı oldu. Durumlu boş mesajı tekrar `bildirim` yapma odaklı testlerde hâlâ yakalanmıyor. Server'ın ürettiği üç ayrıntı kalıbı ve beş şikâyet nedeni mevcut yardımcıyla uyumlu.

Kanıt yamaları `docs/review-evidence/round-08/` içindedir. Bilinen kırmızıları ana CI'a uygulamadık. Bunlar jsdom/dönüşüm testleridir; tarayıcı gezinmesi, yerleşim veya ekran okuyucu onayı olarak sunulmaz.

## 2. Tur 8'de bulunan ve düzeltilen sekiz hata

| Hata | Son davranış ve kırmızı kanıt |
| --- | --- |
| ZIP'in `schema.json` dosyasında HTML sayfaları kayboluyordu | CodePanel JSON yedeğini gerçek HTML haritasından üretir; bekleyen özgün HTML kaynağı ZIP HTML dosyasıyla JSON'da aynıdır. Canvas sayfaları component tasarımı olarak kalır. Eski kaynakla iki yeni vaka kırmızı / beş eski vaka yeşil; dört ilgili dosya düzeltmeyle 27 yeşil. Kaynak şema/HTML haritası değişmez. |
| SVG asset'i data URL yapılınca `#view`/`#symbol` kayboluyordu | HTML/folder import ve `/code` View, CSS url/src/href/srcset dönüşümünde özgün fragmenti korur. Dosya çözümünde query yine atılır. Literal data URL beklentileriyle iki vaka eski kaynakta kırmızı. |
| HTML'in `<base href>` değeri yok sayılıyordu | İlk base, HTML dosyasına ve seçilen klasör köküne göre çözülür; CSS/JS/görsel ve linked-files aynı yolu kullanır. Dış base için yerel aynı isimli dosya seçilmez. CSS asset'i kendi CSS klasörüne göre çözülür. İlk HTML takımında dokuz yeni vakanın tamamı eski kaynakta kırmızı. |
| `/code` Edit özgün inline CSS asset adreslerini değiştiriyordu | View için data URL dönüşümü sürer; Edit'teki özgün `<style>`/`style=` referansları serialize/kayıt sonrası aynen kalır. Linked CSS'nin önizleme için eklenen injected stili korunur. Bağımsız incelemenin iki yeni vakası düzeltme öncesi kırmızıydı. |
| Klasör açılışı alt klasördeki index'i kök ana sayfanın önüne alıyordu | Ortak `projectHomeFile` önce kök index.html/htm'yi seçer; kök yoksa eski fallbackler korunur. Store açılışı ve statik/derlemeli/şablon sınıflandırması aynı seçimi kullanır. Gerçek readProject/store ve sayfa akışında üç vaka eski kaynakla kırmızı, aynı üçü düzeltmeyle yeşil. Bu tek kök neden iki ayrı hata sayılmadı. |
| Eski proje sarmalayıcısındaki `site.html` kayboluyordu | importSchema legacy belgeyi home haritasına taşır; eski biçimde mode yoksa HTML editörü açılır, saklanan canvas tasarımı korunur. Sayfanın kendi HTML'si önceliklidir. İlk belge kaybı ve bağımsız incelemede bulunan mode'suz gösterim ayrı kırmızı kanıtlarla doğrulandı; aynı eski yedek uyumluluğu hatası olarak sayıldı. |
| JSON import bağlı sayfayı kaldırınca eski dosyaya yeni Home yazılıyordu | Açık bağlı id hâlâ var olan HTML sayfasına ait olmalıdır; başka sayfa/komponent tasarımı eski dosyayı ezmez. Kimliksiz eski handle home'a bağlı kalır. Gerçek EditorPage/import/Ctrl+S testi eski kaynakta kırmızı. |
| Bilerek boşaltılan bağlı HTML diske yazılmıyordu | Boş string geçerli yazıdır; yalnız olmayan hedef `undefined` ile ayrılır. Otomatik kayıt disk yazmaz. Gerçek kaynak alanını boşaltıp Ctrl+S testi eski kaynakta kırmızı. |

Backend/API/model değişikliği veya yeni kullanıcı metni yok. Yeni ZIP importer, module bundler veya ertelenmiş yayın özelliği eklenmedi.

### Bağımsız incelemenin geliştirme sırasında yakaladıkları

HTML base düzeltmesinin ilk sürümü `pages#draft/` ve `pages?draft/` klasörlerini URL'ye encode etmeden veriyordu; kökteki yanlış CSS'yi seçti. Bu **bizim yeni eklediğimiz regresyondu**, eski HEAD'de yoktu; sekiz eski hataya eklenmedi. Yazar iddiayı kendi iki kırmızı vakasıyla doğrulayıp segment kodlamasını düzeltti. Aynı inceleme önceden var olan Edit inline CSS kaynak değişimini de buldu; yukarıdaki sekizin içine alındı. Son HTML test dosyası 41/41 yeşil, bağımsız ilave prob/normal base denemeleriyle 47/47 yeşil; son üç bozma da yakalandı.

CodePanel değişikliği dört bağımsız bozmanın dördünü; yerel klasör değişikliği beş bozmanın beşini yakaladı. Eski kaynak ve yeni testler geçici arşivde tekrar koşturuldu; ana kaynak stash/revert edilmedi. Legacy mode eksikliği de yazarın ilk düzeltmesinden sonra bağımsız kontrolle bulunup kendi kırmızı kanıtıyla tamamlandı. Bu alt incelemeler **Claude'un bir sonraki tur çapraz incelemesinin yerine geçmez**.

Toplam **35 yeni frontend birim/sayfa vakası**: CodePanel 2, HTML dönüşümü 13, yerel proje 9, editör/store import ve bağlı dosya 11. Son editör testleri, bağlı id komponent sayfasına dönüşünce diske yazmama ve bare şemadaki ilgisiz üst HTML'yi almama sınırlarını da içerir. Son 11 vaka özgün HEAD kaynaklarında 4 kırmızı / 7 yeşil, düzeltilmiş kaynakta 11 yeşil; legacy mode korumasını kaldırma 2, bağlı HTML-mode kontrolünü kaldırma 1, bare üst HTML'yi ödünç alma 1 test kırar.

Bağımsız son editör kontrolü yazarın 11 testi ve üç ek probla 14/14 yeşil; dört bozmanın dördü yakalandı (legacy mode, açık component mode kararı, bağlı sayfa mode kontrolü, bare üst HTML). İlk incelemedeki mode eksikliği ve iki sınır kapsamı boşluğu kapanmıştır.

## 3. Tarayıcı kapsamı ve işletim sistemi sınırı

Üç yeni Playwright senaryosu Chromium ve Firefox projelerine eklendi:

1. Gerçek ZIP indirme → Python standart `zipfile` okuyucusuyla CRC/ofset/UTF-8 açma → HTML ve JSON yedeğinin eşitliği → JSON'u gerçek editöre yeniden içe aktarma → kaydetme → API'den belge ve canvas tasarımını tekrar okuma.
2. Geçici gerçek HTML/CSS/JS/SVG klasörünü filechooser API'siyle yükleme → base çözümü → script'in gerçek heading değişikliği → CSS computed color → SVG fragmenti ve naturalWidth → kaydetme/yenileme.
3. Bozuk JSON ve tasarımsız JSON reddi → mevcut belge ve DB schema/revision korunması → native File System Access olmadan gerçek HTML indirme geri dönüşü.

Yeni testler istek intercept etmez. Her test kendi hesabı/sitesiyle çalışır; siteler sonunda silinir, geçici klasör hata durumunda da `finally` ile temizlenir. Python ZIP okuyucu uygulamanın ZIP algoritmasını paylaşmaz ve arşivi diske açmaz. Mevcut code-project E2E'leri dosya geçişi, kaynak taslakları, Save All/kopya, izin reddi, başarısız okuma, yavaş kayıt ve klasör değişimini ayrıca korur.

**Gerçek işletim sistemi seçicisi, fiziksel dosya kilidi ve tarayıcının yeniden izin penceresi otomatik olarak sınanmadı.** Bunlar sahibin elle deneyeceği adımlardır; yönerge ve kopyalanabilir küçük test klasörü `docs/review-evidence/round-08/README.md` ile `manual-fixture/` içinde. `/code` tarayıcı testleri File System Access sınırında taklit handle kullanır; native Firefox klasör API desteği iddia edilmez. Yerel E2E veya yeni yerel sunucu çalıştırılmadı; tarayıcı doğrulaması CI'a aittir.

## 4. Kontroller ve teslim

- İlk kapsam taraması: 9 ilgili dosya / 100 test yeşil.
- Tam backend: **849 test yeşil, 141,53 saniye**; mevcut 634 staticfiles uyarısı, hata yok.
- Tam frontend: **285 dosya / 2623 test yeşil, 87,30 saniye** (`NODE_OPTIONS=--no-experimental-webstorage`, 4 worker).
- ESLint, build ve `git diff --check` geçti. Build mevcut 500 kB chunk uyarısını verdi; hata yok. Backend modeli/migrasyonu değişmedi.
- Playwright keşfi: **211 vaka / 24 dosya** (105 Chromium + 105 Firefox + ortak setup). CI'da her job kendi setup'ını çalıştırır.
- Commit/push sonrasında en son HEAD'in `tests` CI kaydı okunmadan iş tamamlanmış sayılmaz. Önceki `5a10346` yeşili yeni değişikliklerin kanıtı değildir. CI linki ve sonucu görev tesliminde belirtilir.

## 5. Sınırlar ve Claude'a devir

- İlk bölümdeki runtime P2 ve admin terimi/test kapsamı bulguları açık bırakıldı; ilgili üretim kaynakları değiştirilmedi.
- ZIP doğrudan içe aktarma arayüzü mevcut değil. ZIP dışa aktarma ve içindeki schema.json'un yeniden içe aktarımı sınandı; yeni ZIP importer yazılmadı.
- HTML'nin module import grafiği, CSS @import grafiği ve klasik defer/async script yürütme sırasını yeniden kuran bir bundler yapılmadı. Dış base kaynakları indirilmedi; URL'nin korunması çevrimdışı çalışması anlamına gelmez.
- Edit'teki özgün inline CSS adresleri dosya bütünlüğü için korunur; yerel asset'lerin tam görünümü View modunda sınanır. Edit için ek bir asset overlay sistemi kurulmadı.
- İşletim sistemi pencereleri sahibin manuel kontrolündedir. Telefon/dokunmatik/odak/kontrast Tur 9'dadır.
- Claude Tur 9'a başlamadan önce bu raporu, bu turun düzeltmelerini ve testleri kendi bozmalarıyla çapraz incelemelidir. Çapraz incelemede açık bırakılan runtime ve admin bulgularını ayrıca değerlendirmelidir.
- Planın sonundaki “canlı site yalnız Yayınla ile değişsin” kararı uygulanmadı. Bu tur commit'leri için canlıya alma izni yok; deploy yapılmadı.

Ayrıntılı yerel loglar ve arşivler `/tmp/sitebuilder-round8-*` altındadır. Kalıcı çapraz inceleme kanıtları `docs/review-evidence/round-08/` içinde; ham credential/CI çıktılarını rapora kopyalamayın.
