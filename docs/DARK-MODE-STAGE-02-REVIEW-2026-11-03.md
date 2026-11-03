# Koyu tema — düzeltmeler ve aşama 2 çapraz incelemesi

Tarih: 3 Kasım 2026. İncelenen HEAD: `ce6ba20951a06c120eb4e5fcd02230610ebdeca3`.

Kapsam: önceki incelemeye yanıt veren `b62abea` ve çerezle ziyaretçi tercihi ekleyen `ce6ba20`. `DARK-MODE-2026-11-03.md` yeniden okundu; üst girişteki “2–5 başlamadı” cümlesine rağmen aşağıda yeni aşama 2 uygulanmış olarak açıklanıyor. Bu inceleme yeni aşama 2'yi ve önceki bulguların düzeltmelerini kapsar.

Başlangıçta çalışma ağacı temizdi; `git pull --ff-only` güncel olduğunu bildirdi. Üretim kodu düzeltilmedi. Geçici bozmalar her koşu sonunda orijinal byte'larla geri kondu; kalıcı çıktı yalnızca bu rapor ve `review-evidence/dark-mode-stage2-2026-11-03/` kanıtlarıdır. Canlıya alınmadı; sonraki özellik aşamalarına geçilmedi.

## Bulgular

### S2-F1 · P2 — Radyo grubunun oku seçili tuval bloğunu da taşıyor

Kaynak: `frontend/src/ui/radioGroupKeys.js:12–15` ve `frontend/src/pages/EditorPage.jsx:1099–1160`. Yeni radyo işleyicisi varsayılan tarayıcı davranışını durduruyor fakat olayı yayılmaktan alıkoymuyor. Editörün pencere düzeyindeki kısayol işleyicisi `defaultPrevented` değerini veya radyo grubunu ayırmıyor; button bir yazı alanı sayılmadığı için aynı sağ oku seçili bloğa da uyguluyor.

Tekrar üretim: canvas sayfası, x=20/y=20 konumunda bir başlık, yayımlanmış site. Başlığı seçin; üstte Taslak/Canlı grubunda Taslak'a odaklanıp sağ oka basın. Canlı seçimi doğru olarak açılıyor; **taslaktaki başlığın x değeri de 21 oluyor**. Böylece yalnız görüntü seçimini değiştirmesi gereken tuş taslak içeriğini değiştiriyor.

Gerçek EditorPage ve store, yalnız site API'si taklit edilerek çalıştırıldı:

```text
Live.aria-checked: true
expected layout: {x:20,y:20}
actual layout:   {x:21,y:20}
1 failed
```

Nedeni ayırmak için yalnız radyo işleyicisine geçici `stopPropagation()` eklenince aynı kontrol geçti. Bu tanı değişikliği geri alındı; bir düzeltme olarak bırakılmadı veya bütün davranışlara yeterli olduğu iddia edilmedi. Önceki F1'in grubun kendi ok/Tab davranışı düzelmiş; editörle birlikte çalışması hâlâ eksik. Yeni mevcut radyo testleri seçili bir canvas bloğunun konumunu kontrol etmiyor.

### S2-F2 · P2 — Başka siteye giden bağlantı hedef sitenin kayıtlı temasını değiştiriyor

Kaynak: `frontend/src/utils/htmlRuntime.js:125–132`, `:496–507`; kalıcı etki `backend/builder/published.py:137–155`. Bağlantıya tema ekleyen kod yalnız aynı sunucuyu kontrol ediyor, `/s/<slug>/` site sınırını ayırmıyor.

Gerçek runtime, `https://builder.test/s/site-a/?pwb-theme=dark` sayfasında şu sonuçları veriyor:

```text
original /s/site-a/about/ -> /s/site-a/about/?pwb-theme=dark
original /s/site-b/       -> /s/site-b/?pwb-theme=dark
```

İlk taşıma doğru. İkinci bağlantı başta parametresiz ve farklı siteye ait; runtime A'nın tercihini kendisi ekliyor. Bu eski host kontrolünün yeni aşama 2 ile **kalıcılaşan** etkisidir. Sunucu eklenen sorguyu B için verilmiş tercih kabul ederek B'nin çerezine yazıyor.

İki gerçek Site/PublishedPage kaydı ve gerçek Set-Cookie başlıklarından beslenen standart CookieJar ile doğrulandı:

1. A için dark, B için light kaydedildi. B'nin düz URL yanıtı `data-pwb-chosen="light"` verdi.
2. A'nın runtime'ının ürettiği B `?pwb-theme=dark` URL'si ziyaret edildi.
3. Yanıt B'nin kendi `Path=/s/<B>/` değeriyle 31.536.000 saniyelik dark çerezi yazdı.
4. Sonraki **parametresiz** B ziyareti `data-pwb-chosen="dark"` verdi.

Çerez Path ayrımı kendi başına doğru; sorun önceden açık seçilmiş B'ye A'nın tercihini taşıyan otomatik sorgudur. Kullanıcının baştan sorgulu bir paylaşım bağlantısı açması şeklindeki belgelenmiş sınırdan farklıdır. Runtime taşıması aynı sitenin sayfalarıyla sınırlanmalı; özel alan adı kök yollarının mevcut davranışı korunmalıdır. Bu incelemede değiştirilmedi.

### S2-F3 · P3 — Kodlanmış veya tekrarlı tema parametresi ekranda ve çerezde farklı seçiliyor

Kaynak: `frontend/src/utils/colorMode.js:472–475` ve `backend/builder/published.py:137–142`.

Django `request.GET.get` ile yüzde kodlamasını açıp son değeri alıyor. Head script ham `location.search` regex'iyle ilk geçerli düz `light|dark` eşleşmesini alıyor. Sunucu sorguyu geçerli bulunca ilk yanıta `data-pwb-chosen` eklemiyor; istemcinin de aynı adresi aynı yorumladığını varsayıyor.

Gerçek backend yanıtı ve gerçek script etiketinde çalışan head script birlikte şu sonuçları verdi (açık tasarım/açık başlangıç, sandbox gibi depolama kapalı):

| İlk sorgu | İlk görülen | Kaydedilen çerez | Sonraki düz ziyaret |
| --- | --- | --- | --- |
| `?pwb-theme=%64ark` | light | dark | dark |
| `?pwb-theme=light&pwb-theme=dark` | light | dark | dark |
| `?pwb-theme=dark&pwb-theme=light` | dark | light | light |

Tema düğmesinin ürettiği tek, düz değerli sorgu bu sorunu taşımıyor. Dışarıdan kodlanmış/tekrarlı sorguyla gelen ziyaretçi ise bir renk görüyor, sonraki ziyarette karşı renge dönüyor. İstemci ve sunucu aynı sorgu çözümleme ve tekrar-parametre kuralını paylaşmalı. Yalnız sunucu attribute eklemek, istemci URL'si hâlâ daha üstün olduğu için tekrarlı parametreyi tek başına çözmez. Düzeltme yapılmadı.

## Önceki bulguların geri kontrolü

| Önceki konu | Sonuç |
| --- | --- |
| F1: grubun ok ve tek Tab durağı | Bileşen düzeyinde düzeltildi; handler/Tab değişikliklerini geri almak yeni testleri kırıyor. Editörün üst kısayol katmanıyla etkileşim için yeni S2-F1 bulundu. |
| G1: açık seçimini başka sayfaya taşıma | Eski bozmam artık 39 testten birini kırıyor; link adresi ve yeni belgenin paleti birlikte sınanıyor. |
| G2: sunucunun light kabulü | Light'ı izin listesinden çıkarmak mevcut testleri kırıyor: 1 kırık / 17. |
| G3: global site.html anahtarı | Global HTML taramasını kaldırmak mevcut testleri kırıyor: 1 kırık / 17. |
| Firefox iframe kanıtı | Yeni E2E gerçekten iframe köşesinin PNG pikselini okuyup `[17,19,23,255]` literalini bekliyor. İncelenen CI'da iki tarayıcıda da geçti. Yerelde E2E çalıştırılmadı ve piksel testine bağımsız ters mutasyon uygulanmış gibi sunulmadı. |

## Mutasyon ve test değerlendirmesi

| Grup | Deneme ve sonuç |
| --- | --- |
| Radyo helper ve dört entegrasyonu | 8 bozmanın 8'i yakalandı: seçimi tıklamama, disabled atlamama, scroll engellememesi, dört handler bağlantısı ve panelin tek Tab durağı. Sağlam 5 dosya: 44 test geçti. |
| Yeni sunucu çerezi sınıfı | 9 bozmanın 9'u yakalandı: Vary, private cache, Path, HttpOnly, HTTPS Secure, URL önceliği, geçersiz cookie/URL kabulü ve cookie adı. Baseline 11 test geçti. |
| Runtime | 7 bozmanın 6'sı yakalandı: cookie okunmaması, URL önceliğinin bozulması, owner başlangıcının cookie'yi ezmesi, auxclick/contextmenu'nün kaldırılması ve eski G1. Baseline/restorasyon 39 test geçti. |
| Önceki G2/G3 | İkisi de yeni testlerle yakalandı; restorasyon 17 test geçti. |

Runtime'da kaçan tek bozma cookie'yi **kullanılabilir localStorage** tercihinin üstüne çıkartıyor. Mevcut `served` test yardımcısı daima storage SecurityError ürettiğinden bu kombinasyonu sınamıyor. Yeni dış kontrol üretimde light depolama + dark sunucu için light bekleyip geçti; bozma bunu dark yapıyor. Normal `/s/` sandbox'ında storage zaten kapalı olduğundan bunu mevcut kullanıcı akışında yeni üretim hatası saymadım; genel script öncelik sözleşmesinin düşük riskli test boşluğudur.

## Ek sağlamlık kontrolleri

- CookieJar gerçek tarayıcı Path kurallarını uyguladı: A'nın çerezi B'ye veya `/` köküne gitmiyor; ayrı boş ziyaretçi eski tercihi almıyor. APIClient'ın path ayırmayan otomatik cookie deposuna dayanılmadı.
- Geçersiz URL tercihi + geçerli cookie, cookie'yi değiştirmeden hatırlanan tercihi okuyor; kişiselleşmiş yanıt private kalıyor.
- Özel alan adı `serve_for_host` yolunu kullanıyor; yeni cookie yolu orada devrede değil. Doğrudan gerçek Host kontrolü 200, cookie/Vary/chosen/CSP sandbox olmaması ve normal public cache davranışını doğruladı. Eski `/s/<slug>/...` 301 yönlendirmesi tema sorgusunu koruyor. “Cookie Path özel alan adı kökünü kapsamıyor” iddiası bu yüzden elendi.
- Tek sayfada düğmeye basıp gezinmeden/yenilemeden ayrılma, eski canlı belgelerin yeniden gönderilmesi gereği ve Safari'nin kontrol edilmemiş olması raporda açıklanan sınırlar; yeni bulgu olarak sayılmadı.

## Kanıtlar ve doğrulama

`review-evidence/dark-mode-stage2-2026-11-03/README.md` yeniden üretim komutlarını içerir. Gerçek EditorPage ile konum sızıntısı kontrolü **1 kırık**; gerçek runtime ile site sınırı ve üç sorgu kontrolü **4 kırık / 1 geçer** verdi. Bu kontroller mevcut hataları gösterdiği için normal test paketinin dışında saklandı. Backend'in beş dış kanıt kontrolü geçer; sorgu kararını ve B'nin çerezinin gerçekten değiştiğini sunucu katmanında bağımsız gösterir.

| Kontrol | Sonuç |
| --- | --- |
| Ön yüz lint | Geçti |
| Normal Vitest paketi | 310 dosya, 2.895 test geçti |
| Ön yüz üretim derlemesi | Geçti; mevcut büyük parça uyarısı sürüyor |
| Normal pytest paketi | 987 test geçti |
| `git diff --check` | Temiz |
| Üretim dosyaları | Geçici kontrollerden sonra kalıcı diff yok |

İncelenen `ce6ba20` için [CI koşusu](https://github.com/Ardakorkmaz0/SiteBuilder/actions/runs/41631098721) yeşil: 2.895 Vitest, 987 pytest, Chromium ve Firefox'ta **114'er E2E**. Yeniden deneme/flaky kaydı görülmedi. Bu olumlu sonuç yeni bulguları geçersiz kılmaz; mevcut normal testler bu çapraz etkileşimleri kapsamıyor.

## Yazara dönüş

Önce S2-F1'in taslak içerik etkisini ve S2-F2'nin başka sitenin tercihine kalıcı etkisini değerlendirin. S2-F3 için sorgu çözümleme kuralını iki tarafta birleştirin. Kanıtlar birer iddiadır; yazar yeniden üretip karar vermelidir. İnceleme üretim düzeltmesi veya sonraki aşama uygulaması içermez.
