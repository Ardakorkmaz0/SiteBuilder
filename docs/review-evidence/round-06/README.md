# Tur 6 çapraz inceleme kanıtları

Taban `2728f1f`. Bu klasör üretim düzeltmesi içermez ve pytest/Vitest tarafından normal test olarak keşfedilmez. Ayrı geçici kopyada kullanın; ortak çalışma ağacına bilinen kırmızı testleri uygulamayın.

- `links-repro.patch`: yeni reviewerLinks.test.js, 7 vaka. Mevcut üretimde **3 kırmızı / 4 yeşil**: iki alternatif dış URL ve büyük harfli HREF. Diğer vakalar düz güvensiz adres reddini, tema taşınmasını, bölüm kaymasını, kendi href'inin parent'a bir kez iletilmesini ve yabancı kaynağın reddini kontrol eder. Depo kökünde `git apply links-repro.patch`, ardından frontend'de `NODE_OPTIONS=--no-experimental-webstorage npm run test:run -- src/utils/reviewerLinks.test.js --maxWorkers=1`.
- `nested-pin-coverage.patch`: FreeCanvasItem.reparent.test.jsx'e iki vaka ekler. Güncel kaynakla 11 yeşil; FlowCanvasItem.jsx içindeki `fromGroup || pinned` ifadesinden yalnız `|| pinned` çıkarılınca 2 kırmızı / 9 yeşil. Normal CI'a uygulanmadı; üretim kodu şu anda doğru.
- `domain-redirect.probe.py`: izole backend/builder/test_round6_domain_review.py konumuna kopyalayın ve `.venv-linux/bin/python -m pytest -q builder/test_round6_domain_review.py builder/test_domain_serving.py builder/test_domain_deployment.py` çalıştırın: 31 yeşil. `builder/published.py` içindeki shared-prefix, query taşıma veya 301 sözleşmesinden her biri ayrı bozulunca ek prob ve mevcut bookmark vakası kırmızı olur. Gerçek DNS/üretim alan adı kullanılmaz.

Her bozmayı ayrı çalıştırıp özgün kaynağı geri getirin. Ana raporda bozmaların sayıları ve kapsam sınırları yazılıdır. Bu kanıtlar tarayıcı layout'u veya her üretim dalının kapsamını garanti etmez.
