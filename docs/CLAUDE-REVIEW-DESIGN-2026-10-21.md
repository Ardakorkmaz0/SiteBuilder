# Tasarım yenilemesinin çapraz incelemesi (Claude, 21 Ekim 2026)

İncelenen: `9961ade` ve `e687311`. İki notu da okudum: `DESIGN-REFRESH-2026-10-21.md` ve `DESIGN-PHASE-02-2026-10-21.md`.

Sahip, kontrol edip hataları düzeltmemi ve sonra canlıya almamı istedi. Bu yüzden bulguları yalnızca raporlamadım, düzelttim de. Her düzeltmenin bir testi var ve test, düzeltme olmadan kırmızı.

## Bulgular ve düzeltmeler

| Bulgu | Önem | Commit |
| --- | --- | --- |
| Telefonda ve okuma sırasında Sitelerim, Bloklar, Favoriler ve Arama'da önce kenar çubuğu geliyordu. Sayfa başlığı (h1) ve "Yeni site oluştur", filtrelerin ve sıralamanın altında kalıyordu. Ekran okuyucu h2 "Projeleri filtrele"yi h1'den önce okuyordu. 375 px'te ilk site kartı 1026 px'teydi. | P2 | `5d0b8da`: `WorkspaceLayout` artık `heading` alır. Başlık DOM'da önce gelir. Masaüstünde CSS ile içerik sütununun üstüne yerleşir ve masaüstü görünümü değişmez. Dört sayfaya sıra testi eklendi. |
| Kart ⋯ menüleri (site, Keşfet, blok) Tab ile terk edilince açık kalıyordu. Gerçek Chrome'da Tab, önizleme çerçeveli düğmeye geçerken focusout'u `relatedTarget` boş gönderiyor; kapanma koşulu da `relatedTarget`'a bağlıydı. | P2 | `ff3f2e6`: `ui/closeWhenFocusLeaves.js` odak değişimi bitince `activeElement`'e bakar. Odak yalnızca sayfaya düştüyse kapatmaz; Safari'de menü öğesine tıklama bu yüzden bozulmaz. Testler Chrome'un bu olayını `test/focusoutWithoutRelatedTarget.js` ile taklit ediyor. |
| Açık temada `--studio-text-faint` (#616e80), kontrol grisi üzerinde 4.45:1 kalıyordu ("Önizleme yükleniyor…"). | P3 | `821a6e4`: #5b687a, gri üzerinde de 4.5:1'in üstünde. |
| Benim 9. tur kodumdan: başlıktaki bir sekmeye fareyle tıklayınca, odak kurtarma yeni sayfanın ilk öğesine, yani "İçeriğe geç"e odak veriyordu. Bağlantı sol üstte görünür oluyordu; bunu sahip fark etti. | P2 | `dd63b42`: başka bir sayfaya (pathname) geçilince kurtarma yapılmıyor ve `.sr-only` öğeler hiçbir zaman hedef olmuyor. Bağlantı klavyeyle Tab'a basınca hâlâ görünüyor ve çalışıyor. |

## Test boşlukları (mutasyonla)

Senin önerdiğin bozmaları ve birkaç tane daha denedim. 11 bozmanın 9'u yakalandı:

- `view` aktarımı;
- görünüm tercihinin hatırlanması;
- menüde ilk öğeye odak;
- oklar ve End tuşu;
- blok menüsünde Esc;
- bekleyen favoride düğmenin devre dışı kalması;
- arama alanının odağı;
- alt menüde yalnızca üç öğe.

Hayatta kalan ikisi:

- menüden Tab ile çıkınca kapanma;
- aramada dışarı tıklayınca kapanma.

İkisine de test eklendi (`ff3f2e6`); şimdi ikisi de yakalanıyor.

## Gerçek tarayıcıda kontrol edilenler

- **Ekran tarayıcı betiği:** yatay taşma, ekran dışına çıkan öğe, adsız kontrol, metin kontrastı ve alt menünün son öğeyi örtmesi. Denetlenen genişlikler 320, 375, 768, 1024, 1280 ve 1600 px. Koyu ve açık temada, şu yedi sayfada çalıştırıldı:
  - Keşfet, Sitelerim, Bloklar, Favoriler, arama, profil;
  - herkese açık profil.

  Betik önce bilerek eklenen kötü örneklerle doğrulandı. Yukarıdaki kontrast dışında bulgu çıkmadı.
- **Kapsam:** `/editor` ve `/code` eski renklerini koruyor. Yeni palet yalnızca `.dashboard-header` olan sayfalarda devrede. Giriş sayfası, görüntüleyici (`/site/…`) ve 404 sayfası palete girmiyor.
- **Klavye:**
  - arama paneli: açılıyor, odak alana geçiyor, Esc ile kapanınca odak düğmeye dönüyor;
  - site kartı menüsü: oklar, Home/End, Esc ve sabitleme sonrası odak;
  - blok menüsünden "Bildir" diyaloğu: Esc ile kapanınca odak ⋯ düğmesine dönüyor;
  - telefon ⋯ menüsü.
- **Yetkiler:** kendi bloğunda "Özele al/Herkese aç" ve "Geri çek" var, başkasınınkinde yalnızca "Bildir". Özel blok yalnızca Bloklarım'da görünüyor.
- **Telefon:** yeni site sihirbazı alt menünün üstünde açılıyor ve alt düğmeleri tıklanabilir. Liste görünümü 375 px'te taşmıyor.

## Küçük notlar (düzeltilmedi)

- Keşfet'te öne çıkan site, ızgaranın ilk kartıyla aynı. Bu bir tasarım tercihi olabilir.
- 1024 px altında alt boşluk iki kez veriliyor: `body` için 4.5rem, `.workspace-container` için 80px. Sayfanın sonunda yaklaşık 150px boşluk kalıyor.
- Telefonda Sitelerim'de ilk kart hâlâ ilk ekranın altında. Sebep, filtreler ile özet kartının arka arkaya gelmesi. İstenirse özet telefonda gizlenebilir.

## Kontroller

Lint, Vitest, build ve backend pytest geçti. Ayrıntılar commit sonrası CI'da.
