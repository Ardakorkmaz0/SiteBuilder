# Tur 3 — Kayıt ve oturum (Claude, 19 Ekim 2026)

Başlangıç: `0bb4155`. Yerel sunucular (8001/5173), gerçek Chromium (1280×800), bir yerel
misafir ve bir yerel test hesabı kullanıldı. Hesabın kullanıcı adı ve parolası sayfa içinde
rastgele üretildi ve hiçbir yere yazdırılmadı. Hepsi sonunda silindi. Canlıya alma yok.

## Tur 2 çapraz incelemesi

`0bb4155` okundu:
- Telefonda hizalama: satır içi öğe blok yapılıyor.
- Genel iç boşluk, telefondaki kenar değerlerini temizliyor.
- `componentSourceHtml` ortak yardımcısı. Bu, Claude'un önceki bulgusunu kapatıyor.
- CV tarihinin çevirisi.

Yazarın denemediği iki bozma yakalandı:
- Telefonda `width:fit-content` yazılmazsa 4 test kırılıyor.
- Kenar CSS değişkeni silinmezse 3 test kırılıyor.

Engelleyici bulgu yok. Not: hizalama kaldırıldığında, satır içi öğeye eklenen
`display:block` hem masaüstünde hem telefonda yerinde kalıyor. Bu Tur 2'nin getirdiği bir
gerileme değil, var olan masaüstü davranışıyla aynı.

## Bulunan ve düzeltilen hatalar

| Commit | Hata | Test |
| --- | --- | --- |
| `5e7e3ec` | Boyut sınırı yüzünden reddedilen otomatik kaydın nedeni ("Sayfanın HTML'i çok büyük") sayfa küçültülüp başarıyla kaydedildikten sonra da hata çubuğunda kalıyordu. Kaynağı Claude'un kayıt refactor'üydü. | `useEditorSave.test.jsx` |
| `a34577b` | Sunucu oturumu sonlandırınca kullanıcı açıklamasız giriş sayfasına düşüyordu. Artık sayfa oturumun bittiğini ve editörden geliniyorsa kaydedilmemiş değişikliğin bu cihazda saklandığını söylüyor. Ayrıca oturum düşmesi mesajları "sen" yerine "siz" diliyle. | `client.test.js`, `LoginPage.return.test.jsx` |

Testlerin düzeltme olmadan kırıldığı, yalnızca üretim dosyaları geri alınarak doğrulandı.

## Gerçek tarayıcıda geçenler

- **Ağ kesintisi** (kayıt istekleri kapalı bir porta yönlendirildi):
  - Kayıt başarısız oluyor, 5 sn sonra yeniden deneniyor.
  - Başlıkta "Kayıt başarısız" ve "Yeniden deneniyor" ipucu görünüyor.
  - Ağ dönünce `online` olayıyla 100 ms içinde kaydediliyor.
- **Boyut sınırı (~2,2 MB):**
  - Türkçe ret mesajı gösteriliyor ve yeniden deneme döngüsü yok.
  - Küçültünce kaydediliyor ve mesaj kalkıyor (düzeltmeden sonra).
- **Misafir oturumu sunucuda sonlanınca:**
  - Editör açık kalıyor; uyarı ve "Projeyi dışa aktar (.json)" düğmesi çıkıyor.
  - Yerel taslak yazılıyor.
- **Hesap oturumu sonlanınca:**
  - Taslak yazılıyor ve giriş sayfasına geçiliyor; sayfa artık nedenini açıklıyor.
  - Giriş yapınca aynı editöre dönülüyor ve taslak geri yüklenmeyi bekliyor.
  - Geri yükleme ve kayıttan sonra taslak siliniyor.
- **Gerçek iki sekme:**
  - A kaydettikten sonra eski B'de çakışma penceresi açılıyor.
  - "Kaydedilmiş sürümü aç" seçilince sayfa uyarısız yenileniyor ve A'nın içeriğini gösteriyor.
- **Tarayıcının Geri düğmesi:** Otomatik kayıt beklemesi dolmadan çıkılsa da son değişiklik gönderiliyor.

## Düzeltilmeyen bulgular

- Uygulamada "sen" diliyle yazılmış onlarca Türkçe metin var: "Alan adını … gir", "Bir kullanıcı adı seç", "projeni", "teman olarak kaydet"… `AGENTS.md`'deki kural "siz". Ayrı bir metin geçişi gerekiyor; Tur 9 ya da ayrı bir iş olabilir.
- Reddedilen otomatik kayıttan sonra bir istek daha gidiyor. İlk kayıt, yazılan kaynağı sayfaya işlerken içerik değiştiği için bekleme zamanlayıcısı bir kez daha çalışıyor. Zararsız, gereksiz bir istek.
- Var olan bir öğeyi sürükleyerek bölüme taşıma (Tur 1). ChatGPT "desteklenmeli" diyor; sahibin kararını bekliyor.

## Doğrulama

Her düzeltmeden sonra lint ve ilgili testler; tur sonunda tüm frontend testleri, build ve CI.
