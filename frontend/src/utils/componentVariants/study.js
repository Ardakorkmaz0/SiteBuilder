// Study widgets: the pieces that keep turning up in exam notes — question
// cards, formula boxes, worked steps, bit layouts, flashcards. They were
// collected from real study pages and redrawn so that no two share a look:
// each speaks its own visual dialect (exam paper, chalkboard, blueprint,
// sticky note, amber terminal, LaTeX algorithm, split-flap board…) instead of
// one palette with the colours swapped. Reveals use <details>, so they work on
// a published page without a script.
//
// A badge, a cell, a bar or a key that sits beside other words is a <div> of
// its own, so the side panel lists it as its own field. A widget with an
// answer to open keeps room for its tallest open state (min-height): an embed
// is a fixed frame, and an answer opened past it would be cut off.
import { FONT, copy, variant } from './kit.js'

const wrap = (style, inner) => `<div style="${FONT}${style}">${inner}</div>`

const SERIF = "font-family:Georgia,'Times New Roman',serif;"
const MONO = "font-family:ui-monospace,'Cascadia Mono',Menlo,monospace;"
const SANS = 'font-family:system-ui,sans-serif;'
const HAND = "font-family:'Comic Neue','Segoe Print','Bradley Hand',cursive;"

const frac = (top, bottom) => (
  `<span style="display:inline-grid;vertical-align:middle;text-align:center;line-height:1.2;font-size:0.85em;"><span style="padding:0 4px 2px;border-bottom:1.5px solid currentColor;">${top}</span><span style="padding:2px 4px 0;">${bottom}</span></span>`
)

const EXAM = [
  variant('study-question-paper', copy('Exam question with solution', 'Çözümlü sınav sorusu'), (T) => wrap(`max-width:460px;min-height:294px;padding:18px 20px 16px;background:#fbf8f1;border:1px solid #e4dccb;color:#2b2620;${SERIF}`, `
    <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:10px;${SANS}"><div style="font-weight:700;font-size:15px;">${T('Question 3', 'Soru 3')}</div><div style="font-size:11.5px;color:#b42318;border:1px solid currentColor;padding:0 5px;border-radius:2px;">${T('Midterm 2023', '2023 vize')}</div><div aria-label="${T('Difficulty 2 of 3', 'Zorluk 3 üzerinden 2')}" style="margin-left:auto;font-size:12px;color:#8a7f6d;letter-spacing:2px;">●●○</div></div>
    <p style="margin:0 0 12px;font-size:16px;line-height:1.55;">${T('A model scores 99% on its training data and 61% on new data. What is happening, and what would you try first?', 'Bir model eğitim verisinde %99, yeni veride %61 başarı veriyor. Ne oluyor ve ilk olarak neyi denersiniz?')}</p>
    <details style="border-top:1px solid #e4dccb;padding-top:10px;"><summary style="cursor:pointer;${SANS}font-size:13.5px;font-weight:600;color:#b42318;">${T('Show the solution', 'Çözümü göster')}</summary>
    <ol style="list-style:decimal;margin:10px 0 0;padding-left:20px;font-size:15px;line-height:1.55;"><li>${T('The gap between the two scores is the clue: the model has memorised its training set.', 'İki skor arasındaki fark ipucudur: model eğitim kümesini ezberlemiş.')}</li><li>${T('That is overfitting.', 'Bu aşırı öğrenmedir (overfitting).')}</li><li>${T('Try regularisation or more data before a bigger model.', 'Daha büyük bir modelden önce düzenlileştirme ya da daha fazla veri deneyin.')}</li></ol></details>`)),

  variant('study-options-explained', copy('Options with explanations', 'Açıklamalı şıklar'), (T) => wrap(`max-width:440px;min-height:302px;color:#1c1917;${SANS}`, `
    <p style="margin:0 0 10px;font-weight:600;font-size:15.5px;line-height:1.45;">${T('Which search is complete and optimal when every step costs the same?', 'Her adımın maliyeti eşitken hangi arama hem tam hem optimaldir?')}</p>
    ${[
      ['A', T('Depth-first', 'Derinlik öncelikli'), false, T('It can get lost down an endless branch.', 'Sonsuz bir dalda kaybolabilir.')],
      ['B', T('Breadth-first', 'Genişlik öncelikli'), true, T('It reaches the shallowest goal first.', 'En sığdaki hedefe ilk o ulaşır.')],
      ['C', T('Greedy best-first', 'Açgözlü en iyi öncelikli'), false, T('It trusts the heuristic and can miss a cheaper path.', 'Sezgisele güvenir, daha ucuz bir yolu kaçırabilir.')],
      ['D', T('Depth-limited', 'Derinlik sınırlı'), false, T('A goal below the limit is never found.', 'Sınırın altındaki bir hedef hiç bulunmaz.')],
    ].map(([letter, text, right, why]) => `<details name="study-options" style="margin-bottom:6px;border:1px solid ${right ? '#86efac' : '#e7e5e4'};border-radius:6px;background:#ffffff;"><summary style="cursor:pointer;display:flex;gap:10px;padding:9px 12px;font-size:14.5px;list-style:none;"><span style="font-weight:700;color:#78716c;">${letter}</span><span>${text}</span></summary><div style="display:flex;gap:6px;padding:0 12px 10px 34px;font-size:13.5px;line-height:1.5;color:${right ? '#15803d' : '#b91c1c'};"><div style="font-weight:700;">${right ? T('Right.', 'Doğru.') : T('Wrong.', 'Yanlış.')}</div><div>${why}</div></div></details>`).join('')}
    <p style="margin:8px 0 0;font-size:12.5px;color:#57534e;">${T('Click an option to see why.', 'Nedenini görmek için bir şıkka tıklayın.')}</p>`)),

  variant('study-true-false-board', copy('True or false board', 'Doğru-yanlış tahtası'), (T) => wrap(`max-width:440px;min-height:232px;padding:16px 20px;border-radius:6px;background:#23402f;border:8px solid #6b4f34;color:#eef3ea;${HAND}`, `
    <div style="margin-bottom:8px;font-weight:700;font-size:17px;">${T('True or false?', 'Doğru mu, yanlış mı?')}</div>
    ${[
      [T('0.1 + 0.2 is exactly 0.3 in floating point.', 'Kayan noktada 0,1 + 0,2 tam olarak 0,3 eder.'), false, T('neither has an exact binary form.', 'ikisinin de tam bir ikili karşılığı yok.')],
      [T('Bisection converges whenever f(a) · f(b) < 0.', 'f(a) · f(b) < 0 olduğunda ikiye bölme hep yakınsar.'), true, T('the root stays inside the shrinking interval.', 'kök daralan aralığın içinde kalır.')],
      [T('Newton’s method needs the derivative.', 'Newton yöntemi türeve ihtiyaç duyar.'), true, T('every step divides by f′(x).', 'her adım f′(x)’e böler.')],
    ].map(([claim, truth, note]) => `<details name="study-claims" style="padding:8px 0;border-top:1.5px dashed rgba(238,243,234,0.35);"><summary style="cursor:pointer;font-size:15px;line-height:1.45;">${claim}</summary><p style="margin:6px 0 0;font-size:14px;color:${truth ? '#bbf7d0' : '#fecaca'};">${truth ? T('True', 'Doğru') : T('False', 'Yanlış')}: ${note}</p></details>`).join('')}`)),

  variant('study-fill-blanks', copy('Fill in the blanks', 'Boşluk doldurma'), (T) => {
    const blank = '<span style="display:inline-block;min-width:64px;height:20px;border-bottom:2px solid #1e293b;vertical-align:-4px;"></span>'
    return wrap(`position:relative;max-width:460px;min-height:120px;padding:0 18px 0 50px;background-color:#ffffff;background-image:repeating-linear-gradient(transparent 0 27px,#c7d7f0 27px 28px);border:1px solid #e2e8f0;line-height:28px;font-size:15.5px;color:#1e293b;${SANS}`, `
    <div aria-hidden="true" style="position:absolute;top:0;bottom:0;left:36px;width:1.5px;background:#f2a7a7;"></div>
    <p style="margin:0;">${T('The error of bisection halves with every', 'İkiye bölmede hata her')} ${blank}${T(', so after n steps it is at most (b − a) /', ' yarıya iner; n adımdan sonra en fazla (b − a) /')} ${blank}.</p>
    <details><summary style="cursor:pointer;font-size:13.5px;font-weight:700;color:#2563eb;">${T('Answers', 'Cevaplar')}</summary><div style="font-size:14.5px;">1. ${T('step', 'adımda')} · 2. 2<sup>n</sup></div></details>`)
  }),

  variant('study-exam-header', copy('Exam sheet header', 'Sınav kâğıdı başlığı'), (T) => {
    const line = 'border-right:1px solid #111111;'
    return wrap(`max-width:520px;padding:16px;border:2px solid #111111;background:#ffffff;color:#111111;font-size:13px;${MONO}`, `
    <div style="display:flex;justify-content:space-between;gap:12px;padding-bottom:8px;margin-bottom:10px;border-bottom:1px solid #111111;"><div style="font-weight:700;font-size:15px;">CSE 3123 · ${T('Midterm', 'Ara sınav')}</div><div>${T('7 May · 90 min', '7 Mayıs · 90 dk')}</div></div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 10px;margin-bottom:12px;"><div>${T('Name', 'Ad soyad')}</div><div style="border-bottom:1px dotted #111111;"></div><div>${T('Student no.', 'Öğrenci no')}</div><div style="border-bottom:1px dotted #111111;"></div></div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);border:1px solid #111111;text-align:center;">
      ${['1', '2', '3', '4'].map((n) => `<div style="padding:4px;font-weight:700;${line}border-bottom:1px solid #111111;">${T('Q', 'S')}${n}</div>`).join('')}<div style="padding:4px;font-weight:700;border-bottom:1px solid #111111;">Σ</div>
      ${['25', '25', '25', '25'].map((n) => `<div style="padding:4px;${line}border-bottom:1px solid #111111;color:#6b7280;">${n}</div>`).join('')}<div style="padding:4px;border-bottom:1px solid #111111;color:#6b7280;">100</div>
      ${[0, 1, 2, 3].map(() => `<div style="height:30px;${line}"></div>`).join('')}<div style="height:30px;"></div>
    </div>`)
  }),

  variant('study-solved-counter', copy('Solved counter', 'Çözülen soru sayacı'), (T) => wrap(`max-width:420px;padding:18px 20px;background:#ffffff;border-top:6px solid #e10600;color:#111111;font-family:'Helvetica Neue',Arial,sans-serif;`, `
    <div style="display:flex;align-items:baseline;gap:8px;"><div style="font-weight:800;font-size:52px;line-height:0.9;letter-spacing:-0.04em;">7</div><div style="font-size:22px;font-weight:700;color:#6b7280;">/ 13</div></div>
    <p style="margin:6px 0 12px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${T('Questions solved', 'Çözülen soru')}</p>
    <div style="display:grid;grid-template-columns:repeat(13,1fr);gap:3px;">${Array.from({ length: 13 }, (_, i) => `<div style="height:14px;background:${i < 7 ? '#111111' : i === 7 ? '#e10600' : '#e5e7eb'};"></div>`).join('')}</div>`)),

  variant('study-hint-ladder', copy('Hint ladder', 'İpucu merdiveni'), (T) => wrap(`max-width:420px;min-height:212px;color:#422006;${SANS}`, `
    <p style="margin:0 0 10px;font-size:15px;font-weight:600;">${T('Which node does breadth-first search expand third? Open one hint at a time.', 'Genişlik öncelikli arama üçüncü olarak hangi düğümü açar? İpuçlarını tek tek açın.')}</p>
    ${[
      [T('Hint 1', '1. ipucu'), T('It expands the tree level by level.', 'Ağacı düzey düzey açar.')],
      [T('Hint 2', '2. ipucu'), T('Write down the queue after every step.', 'Her adımdan sonra kuyruğu yazın.')],
      [T('Answer', 'Cevap'), T('B: the queue goes S, then A and B.', 'B: kuyruk önce S, sonra A ve B olur.')],
    ].map(([label, text], i) => `<details name="study-hints" style="margin:0 0 6px ${i * 18}px;padding:8px 12px;border-radius:0 10px 10px 0;border-left:4px solid ${['#fcd34d', '#f59e0b', '#b45309'][i]};background:${['#fffbeb', '#fef3c7', '#fde68a'][i]};"><summary style="cursor:pointer;font-weight:700;font-size:14px;">${label}</summary><p style="margin:6px 0 0;font-size:14px;line-height:1.5;">${text}</p></details>`).join('')}`)),
]

const FORMULAS = [
  variant('study-formula-card', copy('Formula card', 'Formül kartı'), (T) => wrap(`max-width:400px;padding:12px 16px;background:#ffffff;border:1px solid #d7e0f2;border-left:4px solid #1f6feb;border-radius:0 10px 10px 0;color:#0b1b33;${SANS}`, `
    <div style="margin-bottom:4px;font-size:11px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;color:#5b6b85;">${T('Newton–Raphson step', 'Newton–Raphson adımı')}</div>
    <div style="display:flex;align-items:center;gap:8px;font-size:21px;font-style:italic;${SERIF}">x<sub>n+1</sub> = x<sub>n</sub> − ${frac('f(x<sub>n</sub>)', 'f′(x<sub>n</sub>)')}</div>
    <p style="margin:6px 0 0;font-size:12.5px;color:#5b6b85;">${T('It stops working when f′(xₙ) gets close to zero.', 'f′(xₙ) sıfıra yaklaştığında işe yaramaz.')}</p>`)),

  variant('study-formula-flashcard', copy('Formula flashcard', 'Formül hafıza kartı'), (T) => wrap(`max-width:380px;min-height:154px;background-color:#ffffff;background-image:repeating-linear-gradient(transparent 0 25px,#dbeafe 25px 26px);border:1px solid #e5e7eb;box-shadow:0 6px 14px rgba(0,0,0,0.07);color:#1f2937;${SANS}`, `
    <div style="padding:10px 16px;border-bottom:2px solid #ef4444;background:#ffffff;font-weight:700;font-size:14.5px;">${T('Mean squared error', 'Ortalama kare hata')}</div>
    <details style="padding:12px 16px 14px;"><summary style="cursor:pointer;font-size:13.5px;color:#6b7280;">${T('Can you write it from memory? Click to check.', 'Ezbere yazabilir misiniz? Kontrol için tıklayın.')}</summary>
    <div style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:20px;font-style:italic;${SERIF}">MSE = ${frac('1', 'n')} Σ (y<sub>i</sub> − ŷ<sub>i</sub>)<sup>2</sup></div></details>`)),

  variant('study-symbol-key', copy('Formula with symbol key', 'Sembol açıklamalı formül'), (T) => wrap(`max-width:440px;padding:18px 20px;background-color:#0d2a4a;background-image:linear-gradient(rgba(125,211,252,0.13) 1px,transparent 1px),linear-gradient(90deg,rgba(125,211,252,0.13) 1px,transparent 1px);background-size:18px 18px;border:1px solid #38bdf8;color:#e0f2fe;${MONO}`, `
    <div style="margin-bottom:14px;text-align:center;font-size:26px;letter-spacing:0.04em;">P = V · I</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr style="color:#7dd3fc;text-align:left;"><th style="padding:4px 0;font-weight:600;">${T('symbol', 'sembol')}</th><th style="padding:4px 0;font-weight:600;">${T('meaning', 'anlamı')}</th><th style="padding:4px 0;font-weight:600;">${T('unit', 'birim')}</th></tr>
      ${[['P', T('power', 'güç'), 'W'], ['V', T('voltage', 'gerilim'), 'V'], ['I', T('current', 'akım'), 'A']].map(([s, m, u]) => `<tr style="border-top:1px dashed rgba(125,211,252,0.4);"><td style="padding:5px 0;font-weight:700;">${s}</td><td style="padding:5px 0;">${m}</td><td style="padding:5px 0;">${u}</td></tr>`).join('')}
    </table>`)),

  variant('study-derivation', copy('Derivation steps', 'Türetme adımları'), (T) => wrap(`max-width:440px;padding:14px 18px;background:#ffffff;border-left:2px solid #111827;color:#111827;${SERIF}`, `
    <p style="margin:0 0 8px;font-size:12px;color:#6b7280;${SANS}">${T('Expanding a square', 'Bir karenin açılımı')}</p>
    <div style="display:grid;grid-template-columns:auto auto 1fr auto;gap:6px 8px;align-items:baseline;font-size:17px;">
      ${[
        ['(a + b)²', '(a + b)(a + b)', T('definition', 'tanım')],
        ['', 'a² + ab + ba + b²', T('distribute', 'dağıtma')],
        ['', 'a² + 2ab + b²', 'ab = ba'],
      ].map(([left, right, why]) => `<div style="text-align:right;">${left}</div><div>=</div><div>${right}</div><div style="font:600 11px system-ui,sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">${why}</div>`).join('')}
    </div>`)),

  variant('study-constant-tiles', copy('Constant tiles', 'Sabit kutucukları'), (T) => wrap(`display:flex;flex-wrap:wrap;gap:8px;max-width:440px;${SANS}`, [
    ['1', 'π', T('pi', 'pi'), T('3.14159', '3,14159'), '#fde68a'],
    ['2', 'e', T('Euler’s number', 'Euler sayısı'), T('2.71828', '2,71828'), '#bbf7d0'],
    ['3', 'ε', T('machine epsilon', 'makine epsilonu'), T('2.2e−16', '2,2e−16'), '#bfdbfe'],
    ['4', 'φ', T('golden ratio', 'altın oran'), T('1.61803', '1,61803'), '#fbcfe8'],
  ].map(([n, symbol, name, value, colour]) => `<div style="display:flex;flex-direction:column;width:100px;height:106px;padding:7px 8px;border:2px solid #1f2937;background:${colour};color:#111827;box-sizing:border-box;"><div style="font-size:11px;font-weight:700;">${n}</div><div style="font-weight:700;font-size:30px;line-height:1.1;${SERIF}">${symbol}</div><div style="font-size:11px;font-weight:600;line-height:1.2;">${name}</div><div style="margin-top:auto;font-size:11px;${MONO}">${value}</div></div>`).join(''))),

  variant('study-rule-stamp', copy('Rule stamp', 'Kural mührü'), (T) => wrap(`position:relative;max-width:400px;padding:40px 20px 18px;background:#f6efe0;color:#2d2416;font-size:17px;line-height:1.5;${SERIF}`, `
    <div style="position:absolute;top:10px;right:14px;padding:2px 10px;border:3px double #c0262d;background:#f6efe0;color:#c0262d;font-weight:900;font-size:13px;letter-spacing:0.18em;transform:rotate(6deg);${SANS}">${T('RULE', 'KURAL')}</div>
    <p style="margin:0;">${T('Never compare two floating-point numbers with ==. Check whether their difference is below a tolerance.', 'İki kayan noktalı sayıyı asla == ile karşılaştırmayın. Farklarının bir toleransın altında olup olmadığına bakın.')}</p>
    <div style="margin-top:10px;font-size:14px;color:#7c2d12;${MONO}">abs(a − b) &lt; 1e-9</div>`)),
]

const NOTES = [
  variant('study-dictionary-entry', copy('Dictionary entry', 'Sözlük maddesi'), (T) => wrap(`max-width:420px;color:#1a1a1a;${SERIF}`, `
    <div style="display:flex;align-items:baseline;gap:8px;"><div style="font-weight:700;font-size:22px;">${T('overfitting', 'aşırı öğrenme')}</div><div style="font-style:italic;color:#6b6b6b;">${T('noun', 'isim')}</div></div>
    <ol style="list-style:decimal;margin:8px 0 0;padding-left:22px;font-size:15.5px;line-height:1.5;"><li>${T('A model learning the noise in its training data along with the pattern.', 'Bir modelin eğitim verisindeki örüntüyle birlikte gürültüyü de öğrenmesi.')}</li><li><i>${T('informal', 'gündelik')}</i> ${T('Studying past papers so closely that a new question feels foreign.', 'Çıkmış soruları o kadar yakından çalışmak ki yeni bir soru yabancı gelir.')}</li></ol>
    <p style="margin:8px 0 0;font-size:13.5px;color:#6b6b6b;">${T('See also', 'Bkz.')} <i>${T('regularisation, variance', 'düzenlileştirme, varyans')}</i></p>`)),

  variant('study-mistake-fix', copy('Mistake and fix', 'Hata ve doğrusu'), (T) => wrap(`max-width:440px;border:1px solid #d0d7de;border-radius:6px;overflow:hidden;background:#ffffff;color:#1f2328;font-size:13.5px;${MONO}`, `
    <div style="padding:6px 12px;background:#f6f8fa;border-bottom:1px solid #d0d7de;font-size:12.5px;font-weight:600;color:#57606a;${SANS}">${T('A common mistake', 'Sık yapılan bir hata')}</div>
    <div style="display:flex;gap:8px;padding:6px 12px;background:#ffebe9;"><div style="color:#cf222e;font-weight:700;">−</div><div>${T('relative error = |x − x̃|', 'bağıl hata = |x − x̃|')}</div></div>
    <div style="display:flex;gap:8px;padding:6px 12px;background:#dafbe1;"><div style="color:#1a7f37;font-weight:700;">+</div><div>${T('relative error = |x − x̃| / |x|', 'bağıl hata = |x − x̃| / |x|')}</div></div>
    <p style="margin:0;padding:8px 12px;font-size:13px;color:#57606a;${SANS}">${T('Without the division it is the absolute error.', 'Bölme olmadan bu mutlak hatadır.')}</p>`)),

  variant('study-sticky-note', copy('Sticky note', 'Yapışkan not'), (T) => wrap(`max-width:284px;padding:12px;${HAND}`, `
    <div style="position:relative;padding:30px 18px 18px;background:#fff59d;box-shadow:0 8px 14px rgba(0,0,0,0.12);color:#3b3200;font-size:16px;line-height:1.45;transform:rotate(-2deg);">
    <div aria-hidden="true" style="position:absolute;top:4px;left:50%;width:84px;height:18px;margin-left:-42px;background:rgba(255,255,255,0.7);box-shadow:0 1px 2px rgba(0,0,0,0.08);transform:rotate(3deg);"></div>
    <div style="margin-bottom:6px;font-weight:700;">${T('Do not forget!', 'Unutmayın!')}</div>
    <p style="margin:0;">${T('Bring a calculator, a pencil and your student card. Room B-204, 09:30.', 'Hesap makinesi, kurşun kalem ve öğrenci kartınızı getirin. B-204, 09.30.')}</p></div>`)),

  variant('study-side-note', copy('Side note', 'Kenar notu'), (T) => wrap(`display:flex;gap:18px;max-width:520px;padding:14px 16px;background:#fffff8;color:#111111;${SERIF}`, `
    <p style="flex:1 1 0;margin:0;font-size:16px;line-height:1.6;">${T('A heuristic is admissible when it never overestimates the true cost', 'Bir sezgisel, gerçek maliyeti hiçbir zaman olduğundan fazla tahmin etmiyorsa kabul edilebilirdir')}<sup style="color:#aa0000;">1</sup>${T(', which is what lets A* stop at the first goal it takes off the queue.', '. A*’ın kuyruktan çıkan ilk hedefte durabilmesini sağlayan da budur.')}</p>
    <aside style="width:150px;padding-left:12px;border-left:1px solid #c9c4b5;font-size:13px;line-height:1.45;color:#555555;"><sup style="color:#aa0000;">1</sup> ${T('Straight-line distance on a map is the classic example.', 'Haritada kuş uçuşu mesafe klasik örnektir.')}</aside>`)),

  variant('study-in-short', copy('In short box', 'Kısaca kutusu'), (T) => wrap(`max-width:400px;padding:12px 0 4px;border-top:4px double #111111;border-bottom:1px solid #111111;color:#111111;${SERIF}`, `
    <div style="margin-bottom:8px;font-weight:700;font-size:12px;letter-spacing:0.16em;${SANS}">${T('IN SHORT', 'KISACA')}</div>
    ${[
      ['Soar:', T('rules fire in cycles; an impasse creates a subgoal.', 'kurallar döngüler hâlinde çalışır; bir çıkmaz alt hedef doğurur.')],
      ['ACT-R:', T('modules talk through small buffers.', 'modüller küçük tamponlar üzerinden konuşur.')],
      ['CLARION:', T('an explicit and an implicit level side by side.', 'açık ve örtük iki düzey yan yana.')],
    ].map(([lead, text]) => `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;"><b>${lead}</b> ${text}</p>`).join('')}`)),

  variant('study-highlighted-notes', copy('Highlighted notes', 'Fosforlu notlar'), (T) => {
    const mark = (colour, text) => `<span style="padding:0 2px;background:linear-gradient(transparent 55%,${colour} 55%);">${text}</span>`
    const key = (colour, label) => `<div style="display:flex;align-items:center;gap:5px;"><div style="width:14px;height:8px;background:${colour};"></div><div>${label}</div></div>`
    return wrap(`max-width:440px;color:#1f2937;${SANS}`, `
    <p style="margin:0 0 10px;font-size:15.5px;line-height:1.7;">${mark('#fde047', T('Recall', 'Duyarlılık (recall)'))}${T(' is the share of real positives the model finds. ', ', gerçek pozitiflerden modelin bulduğu paydır. ')}${mark('#f9a8d4', T('It is asked every year', 'Her yıl soruluyor'))}${T(', usually next to precision. ', ', genelde kesinlikle birlikte. ')}${mark('#86efac', T('Example: 8 of 10 sick patients flagged gives 0.8.', 'Örnek: 10 hastadan 8’i işaretlenirse 0,8 olur.'))}</p>
    <div style="display:flex;gap:14px;font-size:12.5px;color:#6b7280;">${key('#fde047', T('definition', 'tanım'))}${key('#f9a8d4', T('exam', 'sınav'))}${key('#86efac', T('example', 'örnek'))}</div>`)
  }),

  variant('study-source-list', copy('Source list', 'Kaynak listesi'), (T) => wrap(`max-width:460px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:4px;background:#ffffff;color:#1f2937;font-size:14.5px;line-height:1.55;${SERIF}`, `
    <div style="margin-bottom:6px;font-size:11.5px;font-weight:700;letter-spacing:0.1em;color:#6b7280;${SANS}">${T('SOURCES', 'KAYNAKLAR')}</div>
    ${[
      `Russell, S. &amp; Norvig, P. <i>Artificial Intelligence: A Modern Approach</i>, ${T('4th ed., ch. 3.', '4. baskı, 3. bölüm.')}`,
      `Burden, R. L. &amp; Faires, J. D. <i>Numerical Analysis</i>, ${T('10th ed., §2.3.', '10. baskı, §2.3.')}`,
      `${T('Lecture notes, week 5', 'Ders notları, 5. hafta')}: <i>${T('Root finding', 'Kök bulma')}</i>.`,
    ].map((text, i) => `<div style="display:flex;margin-bottom:6px;"><div style="flex-shrink:0;width:28px;color:#6b7280;">[${i + 1}]</div><span>${text}</span></div>`).join('')}`)),
]

const TECH = [
  variant('study-float-bits', copy('Float bit layout', 'Kayan nokta bitleri'), (T) => {
    const bits = '1' + '10000001' + '10010000000000000000000'
    const colour = (i) => (i === 0 ? ['#fecaca', '#b91c1c'] : i < 9 ? ['#bfdbfe', '#1d4ed8'] : ['#d9f99d', '#4d7c0f'])
    const cells = [...bits].map((bit, i) => `<div style="flex:1 0 0;min-width:9px;${i === 1 || i === 9 ? 'margin-left:4px;' : ''}padding:3px 0;text-align:center;font-size:11px;background:${colour(i)[0]};border-bottom:2px solid ${colour(i)[1]};">${bit}</div>`).join('')
    const group = (share, i, label) => `<div style="flex:${share} 0 0;${i ? 'margin-left:4px;' : ''}padding-top:3px;border-top:2px solid ${colour(i)[1]};color:${colour(i)[1]};white-space:nowrap;overflow:hidden;">${label}</div>`
    return wrap(`max-width:470px;color:#111827;${MONO}`, `
    <p style="margin:0 0 8px;font-size:14px;${SANS}"><b>${T('−6.25', '−6,25')}</b> ${T('as a 32-bit float', '32 bitlik kayan noktalı sayı olarak')}</p>
    <div style="display:flex;gap:1px;">${cells}</div>
    <div style="display:flex;gap:1px;margin-top:4px;font-size:10.5px;font-weight:700;${SANS}">${group(1, 0, 's')}${group(8, 1, T('exponent', 'üs'))}${group(23, 9, T('mantissa (fraction)', 'mantis (kesir)'))}</div>
    <p style="margin:8px 0 0;font-size:12.5px;color:#4b5563;">(−1)<sup>1</sup> × ${T('1.5625', '1,5625')} × 2<sup>129 − 127</sup></p>`)
  }),

  variant('study-array-pointer', copy('Array with pointer', 'İşaretçili dizi'), (T) => {
    const values = ['3', '8', '15', '21', '34', '55']
    const cell = 'width:46px;flex-shrink:0;text-align:center;'
    return wrap(`display:inline-block;padding:14px 18px 12px;background:#fdfdfb;border:1px solid #e5e5e0;border-radius:4px;color:#1d3c8f;${HAND}`, `
    <div style="display:flex;">${values.map((_, i) => `<div style="${cell}height:24px;font-size:15px;font-weight:700;color:#c0262d;">${i === 2 ? T('mid ↓', 'orta ↓') : ''}</div>`).join('')}</div>
    <div style="display:flex;">${values.map((v, i) => `<div style="${cell}display:grid;place-items:center;height:42px;margin-left:${i ? -2.5 : 0}px;border:2.5px solid #1d3c8f;background:${i === 2 ? '#fde68a' : 'transparent'};font-size:18px;font-weight:700;">${v}</div>`).join('')}</div>
    <div style="display:flex;margin-top:3px;">${values.map((_, i) => `<div style="${cell}font-size:12px;color:#6b7280;">${i}</div>`).join('')}</div>
    <p style="margin:8px 0 0;font-size:14px;">${T('Binary search for 21: look at the middle first.', 'İkili arama, 21 için: önce ortaya bakın.')}</p>`)
  }),

  variant('study-amber-terminal', copy('Amber terminal', 'Kehribar terminal'), (T) => wrap(`max-width:460px;padding:14px 16px;border-radius:10px;background:#1a1206;box-shadow:inset 0 0 40px rgba(255,176,0,0.09);color:#ffb000;font-size:13px;line-height:1.6;text-shadow:0 0 6px rgba(255,176,0,0.45);${MONO}`, `
    <pre style="margin:0;font:inherit;white-space:pre;">$ python newton.py --x0 1
n=1  x=1.500000  |f|=2.5e-01
n=2  x=1.416667  |f|=6.9e-03
n=3  x=1.414216  |f|=6.0e-06
n=4  x=1.414214  |f|=4.5e-12
${T('converged after 4 steps', '4 adımda yakınsadı')} ✓</pre>
    <div style="display:flex;align-items:center;gap:8px;"><div>$</div><div style="width:8px;height:14px;background:#ffb000;"></div></div>`)),

  variant('study-query-result', copy('Query result', 'Sorgu sonucu'), (T) => {
    const kw = (word) => `<span style="color:#7c3aed;font-weight:700;">${word}</span>`
    return wrap(`max-width:440px;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;background:#ffffff;color:#0f172a;font-size:12.5px;${MONO}`, `
    <div style="padding:8px 12px;background:#f1f5f9;border-bottom:1px solid #cbd5e1;">${kw('SELECT')} name, grade ${kw('FROM')} students ${kw('WHERE')} grade &gt;= 85;</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="text-align:left;color:#475569;"><th style="padding:6px 12px;border-bottom:1px solid #e2e8f0;">name</th><th style="padding:6px 12px;border-bottom:1px solid #e2e8f0;">grade</th></tr>
      ${[['Ayşe', '92'], ['Mert', '88'], ['Deniz', '85']].map(([name, grade], i) => `<tr style="background:${i % 2 ? '#f8fafc' : '#ffffff'};"><td style="padding:5px 12px;">${name}</td><td style="padding:5px 12px;">${grade}</td></tr>`).join('')}
    </table>
    <div style="padding:6px 12px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;${SANS}">${T('3 rows · 4 ms', '3 satır · 4 ms')}</div>`)
  }),

  variant('study-growth-rates', copy('Growth rates', 'Büyüme hızları'), (T) => wrap(`max-width:420px;color:#111827;${SANS}`, `
    <p style="margin:0 0 10px;font-size:14px;font-weight:700;">${T('Steps needed for n = 1,000', 'n = 1.000 için gereken adım')}</p>
    ${[
      ['O(1)', '1', 1, '#16a34a'],
      ['O(log n)', '10', 6, '#65a30d'],
      ['O(n)', T('1,000', '1.000'), 30, '#ca8a04'],
      ['O(n log n)', T('10,000', '10.000'), 58, '#ea580c'],
      ['O(n²)', T('1,000,000', '1.000.000'), 100, '#dc2626'],
    ].map(([order, steps, width, colour]) => `<div style="display:grid;grid-template-columns:86px 1fr 78px;align-items:center;gap:8px;margin-bottom:6px;font-size:13px;"><div style="${MONO}">${order}</div><div style="height:10px;background:#f3f4f6;"><div style="width:${width}%;height:100%;background:${colour};"></div></div><div style="text-align:right;color:#6b7280;font-variant-numeric:tabular-nums;">${steps}</div></div>`).join('')}`)),

  variant('study-search-tree', copy('Search tree', 'Arama ağacı'), (T) => {
    const nodes = [['S', 150, 26], ['A', 80, 90], ['B', 220, 90], ['C', 40, 154], ['D', 120, 154], ['E', 260, 154]]
    const edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5]]
    return wrap(`display:inline-block;padding:10px 10px 8px;background-color:#ffffff;background-image:linear-gradient(#e0f2fe 1px,transparent 1px),linear-gradient(90deg,#e0f2fe 1px,transparent 1px);background-size:14px 14px;border:1px solid #bae6fd;color:#0f172a;${SANS}`, `
    <svg width="300" height="178" viewBox="0 0 300 178" role="img" aria-label="${T('Search tree', 'Arama ağacı')}" style="display:block;font-family:system-ui,sans-serif;">
      ${edges.map(([a, b]) => `<line x1="${nodes[a][1]}" y1="${nodes[a][2]}" x2="${nodes[b][1]}" y2="${nodes[b][2]}" stroke="#0f172a" stroke-width="1.5" />`).join('')}
      ${nodes.map(([name, x, y], i) => `<circle cx="${x}" cy="${y}" r="15" fill="${i ? '#ffffff' : '#0f172a'}" stroke="#0f172a" stroke-width="2" /><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="${i ? '#0f172a' : '#ffffff'}">${name}</text><text x="${x + 19}" y="${y - 11}" font-size="11" font-weight="700" fill="#dc2626">${i + 1}</text>`).join('')}
    </svg>
    <div style="display:flex;gap:6px;margin-top:4px;font-size:12.5px;"><div style="color:#dc2626;font-weight:700;">1–6</div><div>${T('breadth-first visiting order', 'genişlik öncelikli ziyaret sırası')}</div></div>`)
  }),

  variant('study-call-stack', copy('Call stack', 'Çağrı yığını'), (T) => wrap(`display:inline-flex;align-items:flex-end;gap:18px;color:#1f2937;${SANS}`, `
    <div style="display:flex;flex-direction:column;gap:6px;width:130px;padding:8px 10px 10px 8px;border:2px solid #1f2937;border-top:0;">${['f(3)', 'f(2)', 'f(1)', 'main()'].map((frame, i) => `<div style="padding:7px;text-align:center;font-size:13px;background:${i ? '#e5e7eb' : '#c7d2fe'};box-shadow:3px 3px 0 #1f2937;${MONO}">${frame}</div>`).join('')}</div>
    <div style="font-size:13px;line-height:1.7;"><div style="font-weight:700;font-size:14px;">${T('Call stack', 'Çağrı yığını')}</div><div>↑ push: ${T('a call starts', 'bir çağrı başlar')}</div><div>↓ pop: ${T('the call returns', 'çağrı geri döner')}</div><div style="color:#4f46e5;font-weight:700;">${T('top', 'tepe')} = f(3)</div></div>`)),

  variant('study-number-bases', copy('Number bases', 'Sayı tabanları'), (T) => wrap(`max-width:360px;padding:12px 16px;border:6px solid #3f4a3a;border-radius:8px;background:#c7d3b8;color:#1f2a1c;font-family:ui-monospace,'Courier New',monospace;`, `
    ${[['DEC', '156'], ['BIN', '1001 1100'], ['HEX', '9C'], ['OCT', '234']].map(([base, value]) => `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:4px 0;border-bottom:1px dashed rgba(31,42,28,0.3);"><div style="font-size:11px;font-weight:700;letter-spacing:0.12em;">${base}</div><div style="font-weight:700;font-size:22px;letter-spacing:0.08em;">${value}</div></div>`).join('')}
    <p style="margin:8px 0 0;font-size:12px;">${T('One number, four bases', 'Tek sayı, dört taban')}</p>`)),
]

const STEPS = [
  variant('study-red-pen-steps', copy('Red pen steps', 'Kırmızı kalem adımları'), (T) => wrap(`max-width:440px;padding:14px 16px 4px;background:#fbf8f1;color:#2b2620;${SERIF}`, [
    T('Check the signs: f(1) = −1 and f(2) = 2, so a root lies between them.', 'İşaretlere bakın: f(1) = −1 ve f(2) = 2, demek ki arada bir kök var.'),
    T('Halve the interval: m = 1.5 and f(1.5) = 0.25 > 0, so keep [1, 1.5].', 'Aralığı yarıya bölün: m = 1,5 ve f(1,5) = 0,25 > 0, öyleyse [1; 1,5] aralığını tutun.'),
    T('Repeat until the interval is shorter than your tolerance.', 'Aralık toleransınızdan kısa olana kadar tekrarlayın.'),
  ].map((text, i) => `<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;"><div style="position:relative;display:grid;place-items:center;flex-shrink:0;width:32px;height:32px;font-weight:700;font-size:14px;${SANS}">${i + 1}<svg aria-hidden="true" viewBox="0 0 32 32" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;"><path d="M16 3 C25 2 30 9 29 17 C28 26 20 30 13 29 C5 27 2 20 4 12 C6 6 11 3 18 4" fill="none" stroke="#c0262d" stroke-width="1.8" stroke-linecap="round" /></svg></div><p style="margin:5px 0 0;font-size:15.5px;line-height:1.5;">${text}</p></div>`).join(''))),

  variant('study-step-timeline', copy('Step timeline', 'Adım zaman çizgisi'), (T) => wrap(`position:relative;max-width:420px;padding-left:30px;color:#0f172a;${SANS}`, '<div aria-hidden="true" style="position:absolute;top:0;bottom:0;left:7px;border-left:2px dotted #94a3b8;"></div>' + [
    [T('Step 1 · First normal form', '1. adım · Birinci normal form'), T('Every cell holds one value; split repeating groups into rows.', 'Her hücrede tek değer olsun; tekrar eden grupları satırlara bölün.')],
    [T('Step 2 · Second normal form', '2. adım · İkinci normal form'), T('Every column depends on the whole key, not on part of it.', 'Her sütun anahtarın bir parçasına değil tamamına bağlı olsun.')],
    [T('Step 3 · Third normal form', '3. adım · Üçüncü normal form'), T('No column depends on another column that is not a key.', 'Hiçbir sütun, anahtar olmayan başka bir sütuna bağlı olmasın.')],
  ].map(([title, text], i) => `<details name="study-steps"${i ? '' : ' open'} style="position:relative;margin-bottom:10px;"><summary style="cursor:pointer;font-weight:700;font-size:14.5px;list-style:none;"><span aria-hidden="true" style="position:absolute;left:-30px;top:2px;width:16px;height:16px;border-radius:50%;background:${i ? '#ffffff' : '#0ea5e9'};border:2px solid #0ea5e9;box-sizing:border-box;"></span><span>${title}</span></summary><p style="margin:6px 0 0;font-size:14px;line-height:1.55;color:#475569;">${text}</p></details>`).join(''))),

  variant('study-algorithm-box', copy('Algorithm box', 'Algoritma kutusu'), (T) => {
    const k = (en, tr) => `<b>${T(en, tr)}</b>`
    return wrap(`max-width:440px;color:#000000;font-family:'Latin Modern Roman','Computer Modern',Georgia,serif;`, `
    <div style="display:flex;gap:6px;padding:4px 0;border-top:2px solid #000000;border-bottom:1px solid #000000;font-size:15px;"><div style="font-weight:700;">${T('Algorithm 2', 'Algoritma 2')}</div><div>${T('Bisection', 'İkiye bölme')}</div></div>
    <ol style="list-style:decimal;margin:0;padding:6px 0 6px 30px;border-bottom:2px solid #000000;font-size:14.5px;line-height:1.6;">
      <li>${k('input', 'girdi')} f, a, b, tol</li>
      <li>${k('while', 'döngü')} b − a &gt; tol</li>
      <li style="padding-left:18px;">m ← (a + b) / 2</li>
      <li style="padding-left:18px;">${k('if', 'eğer')} f(a) · f(m) ≤ 0 ${k('then', 'ise')} b ← m ${k('else', 'değilse')} a ← m</li>
      <li>${k('return', 'döndür')} (a + b) / 2</li>
    </ol>`)
  }),

  variant('study-results-table', copy('Results table', 'Sonuç tablosu'), (T) => wrap(`max-width:420px;color:#111111;${SERIF}`, `
    <p style="margin:0 0 6px;font-size:13.5px;"><b>${T('Table 1.', 'Tablo 1.')}</b> ${T('Newton’s method on x² − 2, starting at 1.', 'x² − 2 için 1’den başlayan Newton yöntemi.')}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums;">
      <tr style="border-top:2px solid #111111;border-bottom:1px solid #111111;"><th style="padding:4px 8px;text-align:left;">n</th><th style="padding:4px 8px;text-align:right;">x<sub>n</sub></th><th style="padding:4px 8px;text-align:right;">|x<sub>n</sub> − √2|</th></tr>
      ${[
        ['0', '1', T('4.1e−1', '4,1e−1')],
        ['1', T('1.5', '1,5'), T('8.6e−2', '8,6e−2')],
        ['2', T('1.416667', '1,416667'), T('2.5e−3', '2,5e−3')],
        ['3', T('1.414216', '1,414216'), T('2.1e−6', '2,1e−6')],
        ['4', T('1.414214', '1,414214'), T('1.6e−12', '1,6e−12')],
      ].map(([n, x, error], i) => `<tr${i === 4 ? ' style="border-bottom:2px solid #111111;"' : ''}><td style="padding:3px 8px;">${n}</td><td style="padding:3px 8px;text-align:right;">${x}</td><td style="padding:3px 8px;text-align:right;">${error}</td></tr>`).join('')}
    </table>`)),

  variant('study-mini-flowchart', copy('Mini flowchart', 'Mini akış şeması'), (T) => {
    const arrow = '<div aria-hidden="true" style="font-size:18px;">→</div>'
    return wrap(`display:flex;flex-wrap:wrap;align-items:center;gap:6px;max-width:540px;color:#111827;font-size:13px;${SANS}`, `
    <div style="padding:8px 14px;border:2px solid #111827;border-radius:999px;background:#ecfccb;">${T('Start', 'Başla')}</div>${arrow}
    <div style="padding:8px 12px;border:2px solid #111827;background:#e0f2fe;${MONO}">x ← x − f/f′</div>${arrow}
    <div style="display:grid;place-items:center;width:80px;height:80px;"><div style="display:grid;place-items:center;width:56px;height:56px;border:2px solid #111827;background:#fef9c3;transform:rotate(45deg);"><div style="font-size:12px;line-height:1.1;text-align:center;transform:rotate(-45deg);">|f| &lt; ε?</div></div></div>
    <div style="display:grid;justify-items:center;font-size:11px;font-weight:700;"><div>${T('yes', 'evet')}</div>${arrow}</div>
    <div style="padding:8px 14px;border:2px solid #111827;border-radius:999px;background:#fecaca;">${T('Root found', 'Kök bulundu')}</div>
    <div style="flex-basis:100%;font-size:12px;color:#6b7280;">${T('“No” goes back to the update step.', '“Hayır” güncelleme adımına geri döner.')}</div>`)
  }),

  variant('study-priority-checklist', copy('Priority checklist', 'Öncelikli kontrol listesi'), (T) => wrap(`max-width:360px;padding:16px 18px;background-color:#fffdf7;background-image:radial-gradient(#d6d3d1 1px,transparent 1.2px);background-size:16px 16px;border:1px solid #e7e5e4;color:#292524;${SANS}`, `
    <div style="margin-bottom:10px;font-weight:700;font-size:15px;">${T('Look at these first', 'Önce bunlara bakın')}</div>
    ${[
      [T('Paradigms and hybrids', 'Paradigmalar ve hibritler'), 3, true],
      [T('The Soar decision cycle', 'Soar karar döngüsü'), 3, false],
      [T('ACT-R buffers', 'ACT-R tamponları'), 3, false],
      [T('Short mock exam', 'Kısa deneme sınavı'), 2, false],
    ].map(([text, stars, done]) => `<div style="display:flex;align-items:center;gap:10px;padding:5px 0;font-size:14.5px;"><div aria-hidden="true" style="display:grid;place-items:center;width:16px;height:16px;border:1.5px solid #292524;font-size:12px;font-weight:900;">${done ? '✓' : ''}</div><div style="flex:1;${done ? 'text-decoration:line-through;color:#a8a29e;' : ''}">${text}</div><div aria-label="${stars}/3" style="color:#d97706;letter-spacing:1px;">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div></div>`).join('')}`)),
]

const PLANNING = [
  variant('study-chapter-opener', copy('Chapter opener', 'Bölüm açılışı'), (T) => wrap(`display:flex;gap:18px;align-items:flex-start;max-width:460px;color:#0f172a;font-family:'Helvetica Neue',Arial,sans-serif;`, `
    <div aria-hidden="true" style="flex-shrink:0;white-space:nowrap;font-size:96px;font-weight:900;line-height:0.8;letter-spacing:-0.05em;color:transparent;-webkit-text-stroke:2px #0f766e;">03</div>
    <div><p style="margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:0.14em;color:#0f766e;">${T('CHAPTER THREE', 'ÜÇÜNCÜ BÖLÜM')}</p><h3 style="margin:0 0 8px;font-size:24px;line-height:1.15;">${T('Finding roots', 'Kök bulma')}</h3><p style="margin:0;font-size:14px;line-height:1.55;color:#475569;">${T('After this chapter you can choose between bisection, Newton and the secant method, and say why.', 'Bu bölümden sonra ikiye bölme, Newton ve kiriş yöntemleri arasında seçim yapabilir ve nedenini söyleyebilirsiniz.')}</p></div>`)),

  variant('study-exam-line', copy('Exam line map', 'Sınav hattı haritası'), (T) => wrap(`max-width:480px;padding:14px 16px;background:#ffffff;color:#111827;${SANS}`, `
    <p style="margin:0 0 14px;font-size:13px;font-weight:800;letter-spacing:0.08em;">${T('EXAM LINE', 'SINAV HATTI')}</p>
    <div style="position:relative;display:flex;justify-content:space-between;">
      <div aria-hidden="true" style="position:absolute;left:30px;right:30px;top:7px;height:6px;border-radius:3px;background:linear-gradient(90deg,#e11d48 30%,#fda4af 30%);"></div>
      ${[
        [T('Paradigms', 'Paradigmalar'), T('Q1–5', 'S1–5')],
        ['Soar', T('Q7–10', 'S7–10')],
        ['ACT-R', T('Q11–15', 'S11–15')],
        ['CLARION', T('Q6, Q16', 'S6, S16')],
        [T('Compare', 'Karşılaştırma'), T('Q34–40', 'S34–40')],
      ].map(([name, questions], i) => `<div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;width:76px;text-align:center;"><div style="width:20px;height:20px;border-radius:50%;background:#ffffff;border:5px solid ${i < 2 ? '#e11d48' : '#fda4af'};box-sizing:border-box;"></div><div style="font-size:12px;font-weight:700;line-height:1.25;">${name}</div><div style="font-size:11px;color:#6b7280;">${questions}</div></div>`).join('')}
    </div>`)),

  variant('study-focus-timer', copy('Focus timer', 'Odak sayacı'), (T) => wrap(`display:inline-flex;align-items:center;gap:16px;padding-top:8px;color:#7f1d1d;${SANS}`, `
    <div style="position:relative;display:grid;place-items:center;flex-shrink:0;width:108px;height:108px;border-radius:50%;background:conic-gradient(#dc2626 0 60%,#fecaca 60% 100%);"><div aria-hidden="true" style="position:absolute;top:-8px;left:50%;width:24px;height:12px;margin-left:-12px;border-radius:12px 12px 0 0;background:#16a34a;"></div><div style="display:grid;place-items:center;width:84px;height:84px;border-radius:50%;background:#fff7f7;font-size:24px;font-weight:800;font-variant-numeric:tabular-nums;">15:00</div></div>
    <div><div style="font-weight:700;font-size:16px;">${T('Focus · round 3 of 4', 'Odak · 3. tur / 4')}</div><div style="font-size:13.5px;color:#9f1239;">${T('Then a 5-minute break', 'Ardından 5 dakika mola')}</div></div>`)),

  variant('study-exam-countdown', copy('Exam countdown', 'Sınav geri sayımı'), (T) => {
    const flap = (digit) => `<div style="position:relative;display:grid;place-items:center;width:34px;height:48px;border-radius:5px;background:linear-gradient(#2a2a2e 50%,#232327 50%);font-size:30px;font-weight:800;${MONO}">${digit}<div aria-hidden="true" style="position:absolute;left:0;right:0;top:50%;height:1px;background:#09090b;"></div></div>`
    return wrap(`display:inline-flex;flex-direction:column;gap:8px;padding:14px 16px;border-radius:10px;background:#18181b;color:#fafafa;${SANS}`, `
    <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;color:#a1a1aa;">${T('UNTIL THE MIDTERM', 'VİZEYE KALAN')}</div>
    <div style="display:flex;gap:10px;">${[['0', '6', T('days', 'gün')], ['1', '4', T('hours', 'saat')], ['3', '2', T('minutes', 'dakika')]].map(([a, b, label]) => `<div style="display:grid;justify-items:center;gap:4px;"><div style="display:flex;gap:3px;">${flap(a)}${flap(b)}</div><div style="font-size:11px;color:#a1a1aa;">${label}</div></div>`).join('')}</div>`)
  }),

  variant('study-flashcard-stack', copy('Flashcard stack', 'Hafıza kartı destesi'), (T) => wrap(`position:relative;max-width:372px;padding:18px;color:#1e293b;${SANS}`, `
    <div aria-hidden="true" style="position:absolute;top:12px;right:12px;left:22px;bottom:22px;border-radius:12px;background:#c7d2fe;transform:rotate(3deg);"></div>
    <div aria-hidden="true" style="position:absolute;top:16px;right:16px;left:18px;bottom:18px;border-radius:12px;background:#e0e7ff;transform:rotate(-2deg);"></div>
    <details style="position:relative;box-sizing:border-box;min-height:234px;padding:18px 20px;border-radius:12px;background:#ffffff;border:1px solid #c7d2fe;box-shadow:0 8px 20px rgba(30,41,59,0.12);"><summary style="cursor:pointer;list-style:none;"><span style="display:block;margin-bottom:6px;font-size:11.5px;font-weight:800;letter-spacing:0.1em;color:#4f46e5;">${T('CARD 4 OF 20', 'KART 4 / 20')}</span><span style="display:block;font-weight:700;font-size:17px;line-height:1.35;">${T('What does a high-variance model do?', 'Yüksek varyanslı bir model ne yapar?')}</span><span style="display:block;margin-top:10px;font-size:12.5px;color:#475569;">${T('Tap to turn it over', 'Çevirmek için dokunun')}</span></summary>
    <p style="margin:12px 0 0;padding-top:12px;border-top:1px dashed #c7d2fe;font-size:15px;line-height:1.5;">${T('It follows its training data too closely, so its predictions change a lot from one sample to the next.', 'Eğitim verisini fazla yakından izler; bu yüzden tahminleri bir örneklemden ötekine çok değişir.')}</p></details>`)),

  variant('study-glossary-leaders', copy('Glossary with leaders', 'Noktalı sözlük'), (T) => wrap(`max-width:420px;color:#1c1917;${SERIF}`, `
    <div style="margin-bottom:8px;font-weight:700;font-size:12px;letter-spacing:0.14em;color:#78716c;${SANS}">${T('GLOSSARY', 'SÖZLÜK')}</div>
    ${[
      [T('Impasse', 'Çıkmaz'), T('no rule can decide', 'hiçbir kural karar veremiyor')],
      [T('Chunk', 'Yığın'), T('one unit of declarative memory', 'bildirimsel bellekte bir birim')],
      [T('Buffer', 'Tampon'), T('a module’s one-item window', 'bir modülün tek öğelik penceresi')],
      [T('Utility', 'Fayda'), T('what picks one rule over another', 'bir kuralı ötekine tercih ettiren')],
    ].map(([term, meaning]) => `<div style="display:flex;align-items:baseline;gap:6px;margin-bottom:6px;font-size:15px;"><div style="font-weight:700;">${term}</div><div aria-hidden="true" style="flex:1;min-width:20px;border-bottom:1.5px dotted #a8a29e;"></div><div style="font-style:italic;color:#57534e;">${meaning}</div></div>`).join('')}`)),

  variant('study-keycaps', copy('Keyboard shortcut list', 'Klavye kısayolu listesi'), (T) => {
    const key = (label) => `<kbd style="display:inline-block;min-width:22px;padding:4px 8px;border:1px solid #d1d5db;border-bottom-width:3px;border-radius:6px;background:linear-gradient(#ffffff,#f3f4f6);color:#111827;font-size:12.5px;font-weight:700;text-align:center;${MONO}">${label}</kbd>`
    return wrap(`display:flex;flex-direction:column;gap:10px;color:#1f2937;${SANS}`, [
      [['Ctrl', 'Enter'], T('Run the cell', 'Hücreyi çalıştırın')],
      [['Shift', 'Tab'], T('Show the help', 'Yardımı gösterin')],
      [['Esc'], T('Leave edit mode', 'Düzenleme modundan çıkın')],
    ].map(([keys, label]) => `<div style="display:flex;align-items:center;gap:10px;font-size:14px;"><div style="display:flex;align-items:center;gap:4px;min-width:130px;">${keys.map(key).join('<div style="color:#9ca3af;">+</div>')}</div><div>${label}</div></div>`).join(''))
  }),
]

export const STUDY_GROUPS = [
  { id: 'study-exam', name: copy('Questions and exams', 'Sorular ve sınavlar'), widgets: EXAM },
  { id: 'study-formulas', name: copy('Formulas', 'Formüller'), widgets: FORMULAS },
  { id: 'study-notes', name: copy('Study notes', 'Ders notları'), widgets: NOTES },
  { id: 'study-tech', name: copy('Technical drawings', 'Teknik çizimler'), widgets: TECH },
  { id: 'study-steps', name: copy('Step-by-step solutions', 'Adım adım çözümler'), widgets: STEPS },
  { id: 'study-planning', name: copy('Study planning', 'Çalışma planı'), widgets: PLANNING },
]
