# Tur 10 çapraz inceleme kanıtları

Bazal `19bdd7c`. Bu dosyalar üretim düzeltmesi değildir. Ana çalışma ağacına topluca uygulamayın; `git archive 19bdd7c` ile bağımsız geçici kaynak oluşturup kurulu bağımlılıkları kullanın.

- `review-links-blocks.md`, `review-focus.md`, `review-inert-cards-pages.md`: incelenen commitler, tek tek bozmalar, gerçek bulgu ve sınırlı test boşluklarının ayrımı.
- `mutation-results.json`: odaklı kontrol sonuçları; `/tmp` yolları orijinal log konumlarıdır, logların kendisi repository'ye eklenmedi.
- `links-blocks-probes.patch`: iki çeviri ve iki backend pozitif prob; bazalda yeşil.
- `focus-positive.patch`: yedi ilave pozitif odak probu; bazalda yeşil.
- `focus-boundaries.patch`, `focus-links-editor.patch`: **bilinen kırmızı** odak sınırları ve gerçek LinksEditor tekrar üretimi. Birlikte yedi kırmızı beklenir; yedi ayrı uygulama hatası anlamına gelmez.
- `page-mode-focus.patch`: gerçek EditorPage'de iki modlar arası kırmızı, iki aynı mod yeşil. Normal CI'a doğrudan eklemeyin.
- `permission-matrix.patch`: geçici backend anonim/yabancı/owner nesne matrisi. Repository kökünden uygulanır; model satırlarını kontrol eden 75 pozitif vaka. Yayın limitleriyle birlikte rapordaki geçici küme 94 vakadır.

## Gerçek Tab/Enter fixture'ları

`focus-dom.html` ve `focus-links.html` dosyalarını geçici olarak `frontend/` köküne kopyalayın, Vite'ı yalnız gerekirse çalıştırın ve ayrı bir tarayıcı sekmesinde açın. Dosyalar `/src/` içindeki gerçek üretim modüllerini import eder. Hesap/API/gerçek dosya kullanmaz; verileri bellek içindedir.

`focus-dom.html?scenario=reenable`, `replace`, `remove-row` veya `remove-immediate` seçin. Tab, Tab, Enter gönderin; sonuç yazısını ve gerçek odağı okuyun. İşlem sırasında Tab ile Close'a geçme de eski kurtarmayı iptal etmelidir. `focus-links.html` gerçek LinksEditor ile tek satır kaldırmayı gösterir; Tab, Tab, Enter sonrası kalan Add link yerine BODY gözlenir.

`template-preview.html` bu turun düzeltilmiş gerçek TemplatePicker bileşenini açar. Tab ile Önizle'ye ulaşıp Enter'a basın; Tab/Shift+Tab önizleme eylemlerinde döner, Escape açana döner. Harness CSS'i üretim düzeni ölçümü sayılmaz. Gerçek iframe içine fareyle girdikten sonraki Tab yolu ayrıca onaylanmadı.

Bu HTML'ler sadece yerel test içindir; kullanıcı/prod verisi veya gerçek anahtar girmeyin. Bitince geçici kopyaları, açılan sekmeyi ve yalnız sizin başlattığınız sunucuyu kaldırın. Root'un ölçtüğü gerçek klavye sonuçları `keyboard-review.md` içindedir. Sahip `editor/567` sekmesi değiştirilmedi.
