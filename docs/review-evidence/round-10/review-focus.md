# Tur 10 öncesi çapraz inceleme — odak kurtarma (`1808e0d`)

İncelenen HEAD `19bdd7c`. AGENTS.md ve `docs/ROUND-09-telefon-erisilebilirlik-2026-10-20.md` okundu. Ana ağaç başlangıçta temizdi; sonraki iki HTML klavye fixture'ı root'a aittir ve bu incelemeci onları değiştirmedi. Kaynak/test incelemesi `git archive HEAD` ile `/tmp/sitebuilder-round10-focus-a749m4kf` içinde yapıldı. **Ana üretim kodu düzeltilmedi, commit/push/deploy yapılmadı.**

## P2 — Öncesinde disabled aşaması olmadan kaldırılan kontrol odağı kurtaramıyor; gerçek LinksEditor yolu doğrulandı

`focusRescue.js:42–46` eski üst öğe zincirini MutationObserver callback'i içinde, yani kaldırmadan sonra `last.parentElement` üzerinden kuruyor. Düğme doğrudan değiştirildiyse parentElement null; bütün satırı kaldırıldıysa yalnız ayrılmış üst öğeler kalıyor. Çalışan en yakın alan artık bulunamadığından kurtarma hiç hedef seçemiyor ve odak body'de kalıyor.

Mevcut replacement/delete testlerinin hepsi önce düğmeyi devre dışı bırakıp observer'ın zinciri kaydetmesini bekliyor. Bu yüzden doğrudan DOM kaldırma iddiasını kapsamıyorlar.

**Somut uygulama yolu:** `components/editor/controls.jsx:777–790`, `LinksEditor` içindeki `Remove`, `onChange(links.filter(...))` ile satırı eşzamanlı kaldırıyor; öncesinde disabled aşaması yok. Son link kaldırılınca `+ Add link` görünür kalırken klavye odağı body'ye düşüyor. Gerçek LinksEditor, gerçek React state, gerçek dil sağlayıcı ve gerçek focusRescue ile, mock'suz jsdom bileşen testi **kırmızı**: Tab Remove'a gelir; Enter linki kaldırır; kalan Add link odak almaz. Geçerli odağın Remove olduğu işlemden önce de doğrulandı.

**Root'un ayrı gerçek tarayıcı doğrulaması:** root, IAB'de Vite üzerinden üretim LinksEditor/React/focusRescue modüllerini kullanan geçici `frontend/round10-focus-links.html` fixture'ında gerçek **Tab, Tab, Enter** ile denedi. Klavye olayları `isTrusted:true`; link kaldırılıyor, `+ Add link` kalıyor, log `Result: BODY`, erişilebilirlik ağacında odak WebArea'da. Bu fixture dil bağlamını İngilizce key→key sınırıyla verir; LinksEditor veya odak üretim kodu taklit değildir. Root ayrıca `round10-focus-check.html` düz DOM fixture'ında yeniden etkinleşme ve disabled→replacement yollarını başarılı; doğrudan removal yolunu body'ye düşen olarak doğruladı. Bunlar root'un bildirdiği gerçek tarayıcı sonuçlarıdır; bu alt ajan tarayıcı çalıştırdığını iddia etmiyor.

Ek kaynak çağrı yolu `/code` uygulama banner'ındaki `Got it` düğmesi: `CodeProjectPage.jsx:284–286,629–648` düğme ve banner'ı doğrudan kaldırır. Bu ikinci uygulama yolu yalnız kaynak incelemesidir; ayrıca gerçek akışla denenmiş diye sunulmaz.

Kanıtlar:
- `/tmp/sitebuilder-round10-focus-links-editor-repro.patch`
- `/tmp/sitebuilder-round10-focus-app-removal.log`
- Genel doğrudan düğme/satır kaldırma iki kırmızısı `/tmp/sitebuilder-round10-focus-boundaries-repro.patch` içinde.

## P3 — Bilerek bırakılmış eski odak daha sonraki disabled/reenable ile geri alınıyor

`last` yalnız `focusin` sırasında değişir. Kullanıcı enabled düğmeden sayfa arka planına ayrılırsa (blur, yeni focusin yok), `last` eski düğme olarak kalır. Daha sonraki bağımsız durum güncellemesi bu düğmeyi disabled→enabled yapınca observer yeni bir kurtarma kurup odağı eski düğmeye verir. Bu, dosyanın 9–11. satırındaki enabled kontrolü bilerek bırakmanın kurtarma başlatmaması iddiasının eksik sınırıdır.

Ek test: mark.focus → mark.blur (bilinçli ayrılma) → daha sonra mark.disabled=true → observer → mark.disabled=false. Beklenen body, alınan mark; **1 kırmızı**. Mevcut "background" testi yalnız ilgisiz span ekler, eski kontrolün daha sonraki disabled güncellemesini sınamaz. Bu genel DOM dizisidir; belirli bir uygulama ekranında aynı geç güncelleme yolu veya gerçek tarayıcı akışı doğrulanmadığından P2 uygulama bulgusuyla aynı kuvvette sunulmaz.

## P3 — Kurtarma hedefinin uygunluğu bütün dallarda doğrulanmıyor

Ek üç sınır probu kodun mevcut kararlarını gösterir:

1. `FOCUSABLE` seçicisindeki `[tabindex]` alternatifi, `disabled` bir düğmeyi yeniden içeri alabilir (`focusRescue.js:13`). Böyle bir aday geçerli replacement'tan önceyse o seçilir; `lost` focus başarılı mı diye bakılmadan temizlenir. jsdom'da yanlış disabled+tabindex adayı aktif oldu. Gerçek tarayıcının disabled elemanda focus davranışı ayrıca doğrulanmadığından "tarayıcıda body kalır" sonucu çıkarılmadı.
2. Eski düğme yeniden etkinleşince `shown()` hiç çağrılmadan doğrudan `control.focus` çalışır (`55–58`). Bu arada üst satır inert yapılmışsa bile focus denemesi yapılır. Probe bunu gerçek focus metoduna spy ile doğrular; jsdom'un native inert engelini uyguladığı iddia edilmez.
3. Fallback için `shown(element, area)` CSS üst zincirini `area.parentElement` öncesinde durdurur (`18–20`). En yakın satırın üstündeki diyalog display:none ise aday yine gösteriliyor sayılır ve focus çağrısı yapılır. Gizli alanın gerçek browser son odağına ilişkin ek iddia yoktur.

Bu üç probe **3 kırmızı**. Bunlar uygunluk denetimi kapsamındaki ilişkili eksiklerdir; üç ayrı uygulama hatası diye sayılmamalı. Gerçek bir uygulama yolunda son klavye etkisi doğrulanmadan yüksek öncelikli kusur diye büyütülmemelidir. Sadece hedefin kendi hidden/inert/aria-hidden/display/visibility durumlarının düzgün elenmesi ise aşağıdaki pozitif problarda yeşildir.

## Testlerin kendi bozmalarımızla sınanması

Mevcut `focusRescue.test.js`: **6/6 yeşil**, restore sonrası yine 6/6. Chrome geç blur vakası bir doc.activeElement getter'ı ile zaman sırasını taklit eder; gerçek Chrome testi değildir. Testin önemli kontrolü doğru: disabled anında odak henüz görünürken aday tutulmalı, sonra reenable sırasında focus çağrılmalıdır.

| Bağımsız üretim bozması | Mevcut altı test | İlave pozitif probe |
| --- | --- | --- |
| Kurtarma adayını ancak blur tamamlandıktan sonra kaydet | 1 kırmızı / 5 yeşil | Gerekmedi |
| Yeniden etkinleşen özgün kontrole focus çağrısını sil | 2 kırmızı / 4 yeşil | Gerekmedi |
| Yalnız en yakın alanı dene, üst diyaloğa çıkma | 1 kırmızı / 5 yeşil | Gerekmedi |
| Disabled attribute gözlemini kaldır | 4 kırmızı / 2 yeşil | Gerekmedi |
| Gizli adayların filtresini kaldır | 6 yeşil (kaçtı) | 5 kırmızı / 2 yeşil |
| Yeni bilinçli focusin eski kurtarmayı iptal etmesin | 6 yeşil (kaçtı) | 1 kırmızı / 6 yeşil |
| Yakın satır yerine dış üst alanı önce dene | 6 yeşil (kaçtı) | 1 kırmızı / 6 yeşil |

**Yedi bozmanın dördü mevcut testlerde yakalandı; üçü kaçtı.** Ek yedi pozitif test, kaçan üç bozmada ayrı ayrı kırmızı olur. Bunlar normal kaynakta 7/7 yeşildir:
- hidden/inert/aria-hidden/display:none/visibility:hidden adaylarını atlama (5);
- başka kontrole bilinçli odak verip daha sonra onu da blur edince eski kurtarmanın hâlâ iptal edilmiş kalması (1);
- diyaloğun üstteki Close düğmesi yerine daha yakın replacement'ı seçme (1).

Mevcut kod bu pozitif yedi noktada doğrudur; burada ayrı **test boşluğu** bildirilir. `/tmp/sitebuilder-round10-focus-positive-test-only.patch` ana CI'a uygulanmadı.

Bozma JSON'u ve tüm log yolları `/tmp/sitebuilder-round10-focus-mutations.json` içinde. Kaynak bütün bozmalar sonunda geri yüklendi. Ek sınır tekrar üretimleri ve gerçek LinksEditor bileşen probu dahil son koşu **7 kırmızı / 13 yeşil (20 test)**: altı sınır probu + bir uygulama probu kırmızı; mevcut altı + ilave yedi pozitif probe yeşil. Son log `/tmp/sitebuilder-round10-focus-final-probes.log`. Yedi kırmızı yedi ayrı hata anlamına gelmez; yukarıda kök neden/kanıt kuvvetine göre gruplandı.

## Sınırlar ve teslim

Bu alt görevin otomatik kontrolleri jsdom üzerinde çalıştı; yerleşim, tarayıcının native focus fixup/inert/hidden semantiği, ekran okuyucu veya gerçek dokunmatik cihaz onayı olarak sunulmaz. Gerçek klavye sonuçları yalnız root'un ayrı IAB çalışması olarak ayrıldı. Ana uygulama veya üretim verisi kullanılmadı; gerçek kullanıcı dosyası okunup yazılmadı. Ana kaynak ve root'a ait geçici fixture'lar değiştirilmedi. Tüm bulgular yazara raporlanacak şekilde bırakıldı; sessiz üretim düzeltmesi yapılmadı.

İzolasyon: `/tmp/sitebuilder-round10-focus-a749m4kf`.

İncelenen focusRescue.js SHA-256: `df7ccaa08ba88221b741b101258e40fee42188fb207a8ac21152efe39940b4a1`.
