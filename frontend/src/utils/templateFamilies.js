// Page architectures ("families") for the data-driven template catalogue.
//
// Every family renders the same content model — a category profile of
// navigation, hero copy, three items, a story, three steps and a closing call
// to action — into a genuinely different page: where navigation lives, whether
// there is a hero at all, cards versus rows versus a table, one column versus
// two. A category picks a family per starter, so ten starters in one category
// are ten silhouettes rather than one page recoloured ten times.
import { FAMILY_LABELS, templateText } from './templateCatalogData.js'
import {
  PACKS,
  art,
  artFill,
  cardGrid,
  ctaBand,
  doc,
  esc,
  footerCols,
  heroCentered,
  heroPattern,
  heroSplit,
  navbar,
  onAccent,
  sectionHead,
  statRow,
} from './templateKit.js'

// ---------------------------------------------------------------------------
// Data-driven vertical starters
// ---------------------------------------------------------------------------
// The large catalogue reuses a set of page *structures* (families) while the
// category seed supplies its own copy, navigation and design pack. This keeps
// hundreds of starters maintainable without turning this module into a second
// hard-coded content database.
const verticalCopy = (value) => esc(templateText(value))

const verticalContent = (profile) => ({
  nav: profile.nav.map(verticalCopy),
  badge: verticalCopy(profile.badge),
  title: verticalCopy(profile.title),
  lead: verticalCopy(profile.lead),
  cta: verticalCopy(profile.cta),
  sectionTitle: verticalCopy(profile.sectionTitle),
  sectionLead: verticalCopy(profile.sectionLead),
  storyTitle: verticalCopy(profile.storyTitle),
  story: verticalCopy(profile.story),
  steps: profile.steps.map(verticalCopy),
  ctaTitle: verticalCopy(profile.ctaTitle),
  ctaCopy: verticalCopy(profile.ctaCopy),
  footer: verticalCopy(profile.footer),
  items: profile.items.map((item, index) => ({
    icon: `0${index + 1}`,
    h: verticalCopy(item.heading),
    p: verticalCopy(item.text),
  })),
  // Optional seed data the newer families use. A category written before they
  // existed still renders: its figures fall back to numbered item headings and
  // its quote simply does not appear.
  stats: (profile.stats || profile.items.map((item, index) => [`0${index + 1}`, item.heading]))
    .map(([value, text]) => [verticalCopy(value), verticalCopy(text)]),
  quote: profile.quote
    ? { text: verticalCopy(profile.quote.text), author: verticalCopy(profile.quote.author) }
    : null,
})

const verticalNav = (content) => [
  ['#collection', content.nav[0]],
  ['#story', content.nav[1]],
  ['#contact', content.nav[2]],
]

const verticalStory = (p, content) => `
<section id="story" class="soft">
  <div class="container grid-2" style="align-items:center;">
    <div>${sectionHead(content.nav[1], content.storyTitle, content.story)}</div>
    <div class="visual" style="min-height:280px; background:linear-gradient(145deg, ${p.accent}2f, ${p.accent}bb), ${heroPattern(p)};" role="img" aria-label="${content.storyTitle}"></div>
  </div>
</section>`

const verticalSteps = (content) => `
<ul class="tl">
  ${content.steps.map((step, index) => `<li><span class="when">0${index + 1}</span><h3>${step}</h3></li>`).join('')}
</ul>`

// The footer repeats the page's own navigation, so a family with different
// sections has to pass its own links — a footer advertising a section that does
// not exist is the first dead link a visitor finds.
const verticalFooter = (t, content, links = verticalNav(content)) =>
  footerCols(t, links, content.footer)

function verticalCatalog(p, name, profile) {
  const t = esc(name)
  const content = verticalContent(profile)
  return doc(p, t, `${t} | ${content.sectionTitle}`, `
${navbar(t, verticalNav(content), ['#contact', content.cta])}
${heroSplit(t, { pattern: heroPattern(p), badge: content.badge, title: content.title, sub: content.lead, cta: ['#collection', content.cta], cta2: ['#story', content.nav[1]] })}
${statRow(content.items.map((item, index) => [`0${index + 1}`, item.h]))}
<section id="collection"><div class="container">${sectionHead(content.nav[0], content.sectionTitle, content.sectionLead)}${cardGrid(3, content.items)}</div></section>
${verticalStory(p, content)}
${ctaBand(content.ctaTitle, content.ctaCopy, ['#collection', content.cta])}
${verticalFooter(t, content)}`)
}

function verticalService(p, name, profile) {
  const t = esc(name)
  const content = verticalContent(profile)
  return doc(p, t, `${t} | ${content.sectionTitle}`, `
${navbar(t, verticalNav(content), ['#contact', content.cta])}
${heroCentered(t, { pattern: heroPattern(p), badge: content.badge, title: content.title, sub: content.lead, cta: ['#contact', content.cta], cta2: ['#collection', content.nav[0]] })}
<section id="collection" class="soft"><div class="container">${sectionHead(content.nav[0], content.sectionTitle, content.sectionLead)}${cardGrid(3, content.items)}</div></section>
<section id="story"><div class="container grid-2" style="align-items:start;"><div>${sectionHead(content.nav[1], content.storyTitle, content.story)}</div><div>${verticalSteps(content)}</div></div></section>
${ctaBand(content.ctaTitle, content.ctaCopy, ['#contact', content.cta])}
${verticalFooter(t, content)}`)
}

function verticalEditorial(p, name, profile) {
  const t = esc(name)
  const content = verticalContent(profile)
  return doc(p, t, `${t} | ${content.storyTitle}`, `
${navbar(t, verticalNav(content), ['#contact', content.cta])}
<section style="padding:112px 0 72px; background:${heroPattern(p)};"><div class="container narrow"><span class="chip">${content.badge}</span><h1 style="font-size:clamp(42px,7vw,76px); margin-top:22px;">${content.title}</h1><p class="lead" style="font-size:20px;">${content.lead}</p><a class="btn" href="#story">${content.nav[1]}</a></div></section>
<section id="story"><div class="container grid-2" style="align-items:center;"><div class="visual" style="min-height:360px; background:linear-gradient(155deg, ${p.accent}2d, ${p.accent}c0), ${heroPattern(p)};" role="img" aria-label="${content.storyTitle}"></div><div>${sectionHead(content.nav[1], content.storyTitle, content.story)}<p class="lead" style="margin-bottom:0;">${content.steps.map((step) => `<span>${step}</span>`).join(' · ')}</p></div></div></section>
<section id="collection" class="soft"><div class="container">${sectionHead(content.nav[0], content.sectionTitle, content.sectionLead)}${cardGrid(3, content.items)}</div></section>
${ctaBand(content.ctaTitle, content.ctaCopy, ['#contact', content.cta])}
${verticalFooter(t, content)}`)
}

function verticalBooking(p, name, profile) {
  const t = esc(name)
  const content = verticalContent(profile)
  const schedule = content.steps.map((step, index) => `<div class="card" style="padding:20px;"><span class="eyebrow">0${index + 1}</span><h3>${step}</h3></div>`).join('')
  return doc(p, t, `${t} | ${content.cta}`, `
${navbar(t, verticalNav(content), ['#contact', content.cta])}
${heroSplit(t, { pattern: heroPattern(p), badge: content.badge, title: content.title, sub: content.lead, cta: ['#contact', content.cta], cta2: ['#collection', content.nav[0]] })}
<section id="collection"><div class="container">${sectionHead(content.nav[0], content.sectionTitle, content.sectionLead)}<div class="grid-3">${schedule}</div></div></section>
<section id="story" class="soft"><div class="container grid-2" style="align-items:center;"><div>${sectionHead(content.nav[1], content.storyTitle, content.story)}</div><div>${cardGrid(1, content.items)}</div></div></section>
${ctaBand(content.ctaTitle, content.ctaCopy, ['#contact', content.cta])}
${verticalFooter(t, content)}`)
}

// ---------------------------------------------------------------------------
// Structurally different vertical families.
//
// The four above are siblings: sticky top bar, hero, three cards, split story,
// CTA band, footer — in a different order. Reskinning them in twelve palettes
// makes twelve of the same page, which is what made a 200-template gallery feel
// like ten. These five change the ARCHITECTURE instead: where navigation lives,
// whether there is a hero at all, cards versus rows, one column versus two.
// Each carries its own layout CSS so the other templates don't pay for it.
// ---------------------------------------------------------------------------

// Navigation as a full-height left rail — the silhouette no top-bar page has.
function verticalSidebar(p, name, profile) {
  const t = esc(name)
  const c = verticalContent(profile)
  const css = `
  .rail-page { display:grid; grid-template-columns:286px 1fr; min-height:100vh; }
  .rail { position:sticky; top:0; align-self:start; height:100vh; padding:38px 30px;
    background:var(--soft); border-right:1px solid var(--border); display:flex; flex-direction:column; }
  .rail .brand { font-size:22px; margin-bottom:10px; }
  .rail p { color:var(--muted); font-size:14.5px; }
  .rail nav { display:flex; flex-direction:column; gap:2px; margin:30px 0 auto; }
  .rail nav a { padding:11px 14px; border-radius:calc(var(--radius)/1.4 + 2px); color:var(--muted); font-weight:600; font-size:15px; }
  .rail nav a:hover { background:var(--card); color:var(--ink); }
  .rail nav a.on { background:var(--accent-soft); color:var(--accent); }
  .rail-main { min-width:0; }
  .rail-main section { padding:74px 0; }
  .rail-main .container { max-width:860px; margin:0; padding:0 56px; }
  .rail-hero { padding-top:96px !important; }
  .rail-hero h1 { font-size:clamp(38px,5vw,60px); }
  @media (max-width: 900px) {
    .rail-page { grid-template-columns:1fr; }
    .rail { position:static; height:auto; padding:26px 24px; border-right:0; border-bottom:1px solid var(--border); }
    .rail nav { flex-direction:row; flex-wrap:wrap; gap:6px; margin:20px 0 0; }
    .rail-main .container { padding:0 24px; max-width:none; }
    .rail-main section, .rail-hero { padding:52px 0 !important; }
  }`
  return doc(p, t, `${t} | ${c.sectionTitle}`, `
<div class="rail-page">
  <aside class="rail">
    <span class="brand">${t}<b>.</b></span>
    <p>${c.badge}</p>
    <nav>
      <a class="on" href="#top">${c.nav[0]}</a>
      <a href="#story">${c.nav[1]}</a>
      <a href="#steps">${c.sectionTitle}</a>
      <a href="#contact">${c.nav[2]}</a>
    </nav>
    <a class="btn" href="#contact" style="text-align:center;">${c.cta}</a>
  </aside>
  <main class="rail-main">
    <section id="top" class="rail-hero"><div class="container">
      <span class="chip">${c.badge}</span>
      <h1 style="margin-top:22px;">${c.title}</h1>
      <p class="lead">${c.lead}</p>
      <a class="btn" href="#steps">${c.nav[0]}</a>
    </div></section>
    <section id="steps" class="soft"><div class="container">
      ${sectionHead(c.nav[0], c.sectionTitle, c.sectionLead)}${cardGrid(2, c.items)}
    </div></section>
    <section id="story"><div class="container">
      ${sectionHead(c.nav[1], c.storyTitle, c.story)}${verticalSteps(c)}
    </div></section>
    <section id="contact" class="soft"><div class="container">
      <h2>${c.ctaTitle}</h2><p class="lead">${c.ctaCopy}</p><a class="btn" href="#contact">${c.cta}</a>
    </div></section>
  </main>
</div>`, css)
}

// A newspaper: masthead instead of a hero, a lead story, then a column river.
function verticalMagazine(p, name, profile) {
  const t = esc(name)
  const c = verticalContent(profile)
  const css = `
  .masthead { border-bottom:3px double var(--ink); padding:26px 0 16px; }
  .masthead .title { font-family:${p.head.fam}; font-size:clamp(30px,6vw,54px); font-weight:800;
    letter-spacing:-0.02em; text-align:center; }
  .masthead .meta { display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;
    color:var(--muted); font-size:12.5px; text-transform:uppercase; letter-spacing:0.1em; margin-top:14px; }
  .lead-story { padding:46px 0 34px; border-bottom:1px solid var(--border); }
  .lead-story h1 { font-size:clamp(34px,5.4vw,58px); max-width:15ch; }
  .lead-story .standfirst { font-size:19px; color:var(--muted); max-width:60ch; margin:0 0 26px; }
  .lead-visual { height:340px; border-radius:2px; }
  .river { display:grid; grid-template-columns:repeat(3,1fr); gap:0; }
  .river .col { padding:34px 26px; border-right:1px solid var(--border); }
  .river .col:last-child { border-right:0; }
  .river h3 { font-size:21px; margin-bottom:10px; }
  .river p { color:var(--muted); font-size:15px; margin:0; }
  .river .num { font-family:${p.head.fam}; font-size:13px; letter-spacing:0.14em; color:var(--accent); }
  .pull { font-family:${p.head.fam}; font-size:clamp(24px,3.4vw,36px); line-height:1.25;
    border-left:4px solid var(--accent); padding-left:26px; margin:0; max-width:26ch; }
  @media (max-width: 820px) {
    .river { grid-template-columns:1fr; }
    .river .col { border-right:0; border-bottom:1px solid var(--border); padding:26px 0; }
    .lead-visual { height:220px; }
  }`
  return doc(p, t, `${t} | ${c.storyTitle}`, `
<div class="container">
  <header class="masthead">
    <div class="title">${t}</div>
    <div class="meta"><span>${c.badge}</span><span>${c.nav.map((item) => `<span>${item}</span>`).join(' · ')}</span></div>
  </header>
  <section class="lead-story">
    <p class="eyebrow">${c.nav[1]}</p>
    <h1>${c.title}</h1>
    <p class="standfirst">${c.lead}</p>
    <div class="visual lead-visual" role="img" aria-label="${c.storyTitle}"></div>
  </section>
  <section id="collection" class="river" style="padding:0;">
    ${c.items.slice(0, 3).map((item, i) => `<div class="col"><span class="num">0${i + 1}</span><h3>${item.h}</h3><p>${item.p}</p></div>`).join('')}
  </section>
</div>
<section id="story" class="soft"><div class="container grid-2" style="align-items:center;">
  <blockquote class="pull">${c.story}</blockquote>
  <div>${sectionHead(c.nav[0], c.sectionTitle, c.sectionLead)}<a class="btn" href="#contact">${c.cta}</a></div>
</div></section>
<section id="contact"><div class="container narrow" style="text-align:center;">
  <h2>${c.ctaTitle}</h2><p class="lead" style="margin:0 auto 30px;">${c.ctaCopy}</p>
  <a class="btn" href="#contact">${c.cta}</a>
</div></section>
${verticalFooter(t, c)}`, css)
}

// Full-bleed alternating bands. No cards anywhere — the visuals carry the page.
function verticalShowcase(p, name, profile) {
  const t = esc(name)
  const c = verticalContent(profile)
  const css = `
  .show-hero { position:relative; min-height:78vh; display:grid; place-items:center; text-align:center;
    background:linear-gradient(160deg, ${p.accent}33, ${p.accent}c4), ${heroPattern(p)}; padding:120px 24px; }
  .show-hero h1 { font-size:clamp(40px,8vw,86px); max-width:14ch; margin:0 auto 18px; color:${p.dark ? '#fff' : p.ink}; }
  .show-hero p { font-size:19px; max-width:52ch; margin:0 auto 30px; color:${p.dark ? 'rgba(255,255,255,.86)' : p.muted}; }
  .zig { display:grid; grid-template-columns:1fr 1fr; align-items:stretch; }
  .zig > .pane { padding:88px 64px; display:flex; flex-direction:column; justify-content:center; }
  .zig > .art { min-height:460px; }
  .zig.flip > .art { order:-1; }
  .zig h2 { font-size:clamp(26px,3.4vw,42px); }
  .zig p { color:var(--muted); font-size:17px; margin:0; }
  .zig .num { font-family:${p.head.fam}; font-size:60px; line-height:1; color:var(--accent); opacity:.28; margin-bottom:14px; }
  @media (max-width: 900px) {
    .zig { grid-template-columns:1fr; }
    .zig > .pane { padding:52px 24px; }
    .zig > .art { min-height:240px; order:-1 !important; }
    .show-hero { min-height:auto; padding:88px 24px; }
  }`
  const bands = c.items.slice(0, 3).map((item, i) => `
<section class="zig${i % 2 ? ' flip' : ''}" style="padding:0;${i % 2 ? ' background:var(--soft);' : ''}">
  <div class="pane"><span class="num">0${i + 1}</span><h2>${item.h}</h2><p>${item.p}</p></div>
  <div class="art visual" style="border-radius:0;" role="img" aria-label="${item.h}"></div>
</section>`).join('')
  return doc(p, t, `${t} | ${c.sectionTitle}`, `
${navbar(t, verticalNav(c), ['#contact', c.cta])}
<section class="show-hero" style="padding-top:120px;">
  <div><span class="chip">${c.badge}</span>
  <h1 style="margin-top:20px;">${c.title}</h1>
  <p>${c.lead}</p>
  <a class="btn" href="#collection">${c.cta}</a></div>
</section>
<div id="collection">${bands}</div>
<section id="story"><div class="container narrow" style="text-align:center;">
  ${sectionHead(c.nav[1], c.storyTitle, c.story)}
  ${statRow(c.steps.map((step, i) => [`0${i + 1}`, step]))}
</div></section>
${ctaBand(c.ctaTitle, c.ctaCopy, ['#contact', c.cta])}
${verticalFooter(t, c)}`, css)
}

// A searchable index: filter chips and list rows instead of a grid of cards.
function verticalDirectory(p, name, profile) {
  const t = esc(name)
  const c = verticalContent(profile)
  const css = `
  .dir-top { padding:56px 0 34px; }
  .dir-top h1 { font-size:clamp(32px,4.6vw,52px); }
  .dir-search { display:flex; gap:10px; flex-wrap:wrap; margin:26px 0 18px; }
  .dir-search input { flex:1 1 260px; min-width:0; padding:14px 18px; font:inherit; font-size:15px;
    color:var(--ink); background:var(--card); border:1px solid var(--border);
    border-radius:calc(var(--radius)/1.2 + 4px); }
  .dir-search input::placeholder { color:var(--muted); }
  .filters { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
  .rows { border-top:1px solid var(--border); }
  .row { display:grid; grid-template-columns:64px 1fr auto; align-items:center; gap:18px;
    padding:22px 4px; border-bottom:1px solid var(--border); transition:background .15s; }
  .row:hover { background:var(--soft); }
  .row .idx { font-family:${p.head.fam}; color:var(--accent); font-size:15px; letter-spacing:0.08em; }
  .row h3 { margin:0 0 4px; font-size:19px; }
  .row p { margin:0; color:var(--muted); font-size:14.5px; }
  .row .go { color:var(--accent); font-weight:700; font-size:22px; }
  @media (max-width: 700px) {
    .row { grid-template-columns:44px 1fr; gap:12px; }
    .row .go { display:none; }
  }`
  const rows = c.items.map((item, i) => `
  <a class="row" href="#contact">
    <span class="idx">${String(i + 1).padStart(2, '0')}</span>
    <span><h3>${item.h}</h3><p>${item.p}</p></span>
    <span class="go" aria-hidden="true">→</span>
  </a>`).join('')
  return doc(p, t, `${t} | ${c.sectionTitle}`, `
${navbar(t, verticalNav(c), ['#contact', c.cta])}
<section class="dir-top"><div class="container">
  <span class="chip">${c.badge}</span>
  <h1 style="margin-top:18px;">${c.title}</h1>
  <p class="lead" style="margin-bottom:0;">${c.lead}</p>
  <div class="dir-search">
    <input type="search" placeholder="${c.sectionTitle}…" aria-label="${c.sectionTitle}" />
    <a class="btn" href="#collection">${c.cta}</a>
  </div>
  <div class="filters">${c.steps.map((s, i) => `<span class="chip"${i ? ' style="background:transparent;color:var(--muted);border-color:var(--border);"' : ''}>${s}</span>`).join('')}</div>
</div></section>
<section id="collection" style="padding-top:0;"><div class="container">
  <div class="rows">${rows}</div>
</div></section>
${verticalStory(p, c)}
${ctaBand(c.ctaTitle, c.ctaCopy, ['#contact', c.cta])}
${verticalFooter(t, c)}`, css)
}

// The long conversion scroll: section dots, pricing tiers, FAQ, closing CTA.
function verticalOnepage(p, name, profile) {
  const t = esc(name)
  const c = verticalContent(profile)
  const css = `
  .dots { position:fixed; right:20px; top:50%; transform:translateY(-50%); display:flex;
    flex-direction:column; gap:12px; z-index:30; }
  .dots a { width:9px; height:9px; border-radius:50%; background:var(--border); display:block; }
  .dots a:hover, .dots a.on { background:var(--accent); transform:scale(1.25); }
  .numbered h2 { display:flex; align-items:baseline; gap:14px; }
  .numbered h2 span { font-size:15px; color:var(--accent); font-family:${p.head.fam}; letter-spacing:0.12em; }
  .tiers { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:20px; align-items:stretch; }
  .tier { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:30px 26px; }
  .tier.pop { border-color:var(--accent); box-shadow:0 18px 46px ${p.dark ? 'rgba(0,0,0,.5)' : 'rgba(20,20,43,.10)'}; }
  .tier .price { font-family:${p.head.fam}; font-size:38px; margin:8px 0 6px; }
  .tier ul { list-style:none; margin:18px 0 24px; padding:0; }
  .tier li { color:var(--muted); font-size:15px; padding:7px 0 7px 24px; position:relative; }
  .tier li::before { content:'✓'; position:absolute; left:0; color:var(--accent); font-weight:700; }
  @media (max-width: 900px) { .dots { display:none; } }`
  const tiers = c.items.slice(0, 3).map((item, i) => `
  <div class="tier${i === 1 ? ' pop' : ''}">
    ${i === 1 ? `<span class="chip">${c.badge}</span>` : ''}
    <h3 style="margin-top:${i === 1 ? '14px' : '0'};">${item.h}</h3>
    <div class="price">${['€', '€€', '€€€'][i]}</div>
    <p style="color:var(--muted); margin:0;">${item.p}</p>
    <ul>${c.steps.slice(0, 3).map((s) => `<li>${s}</li>`).join('')}</ul>
    <a class="btn${i === 1 ? '' : ' btn-ghost'}" href="#contact" style="width:100%; text-align:center;">${c.cta}</a>
  </div>`).join('')
  return doc(p, t, `${t} | ${c.cta}`, `
${navbar(t, [['#collection', c.nav[0]], ['#pricing', c.sectionTitle], ['#faq', c.nav[1]]], ['#contact', c.cta])}
<nav class="dots" aria-label="${c.nav[0]}">
  <a class="on" href="#collection" aria-label="${c.nav[0]}"></a>
  <a href="#pricing" aria-label="${c.sectionTitle}"></a>
  <a href="#faq" aria-label="${c.nav[1]}"></a>
  <a href="#contact" aria-label="${c.nav[2]}"></a>
</nav>
${heroCentered(t, { pattern: heroPattern(p), badge: c.badge, title: c.title, sub: c.lead, cta: ['#pricing', c.cta], cta2: ['#collection', c.nav[0]] })}
<section id="collection" class="numbered"><div class="container">
  <h2><span>01</span>${c.sectionTitle}</h2>
  <p class="lead">${c.sectionLead}</p>
  ${cardGrid(3, c.items)}
</div></section>
<section id="pricing" class="soft numbered"><div class="container">
  <h2><span>02</span>${c.storyTitle}</h2>
  <p class="lead">${c.story}</p>
  <div class="tiers">${tiers}</div>
</div></section>
<section id="faq" class="numbered"><div class="container narrow">
  <h2><span>03</span>${c.nav[1]}</h2>
  <div class="faq" style="margin-top:26px;">
    ${c.items.slice(0, 4).map((item) => `<details><summary>${item.h}</summary><p>${item.p}</p></details>`).join('')}
  </div>
</div></section>
${ctaBand(c.ctaTitle, c.ctaCopy, ['#contact', c.cta])}
${verticalFooter(t, c, [['#collection', c.nav[0]], ['#pricing', c.sectionTitle], ['#faq', c.nav[1]], ['#contact', c.nav[2]]])}`, css)
}

// ---------------------------------------------------------------------------
// Second wave of page architectures.
//
// Same content model, ten more silhouettes. Each one answers a question the
// first nine do not: what if the page is a tiled canvas (bento), a fixed
// picture beside the words (split), a sequence of moments (chronicle), a
// poster (poster), a pile of cards (stack), a letter (letter), a table of
// options (compare), a picture book (lookbook), a single card (solo), or the
// product itself (appshell)?
// ---------------------------------------------------------------------------

// Fixed interface words a family prints on its own (a table heading, a search
// placeholder). They live beside the catalogue copy so Turkish is never missing.
const label = (key) => verticalCopy(FAMILY_LABELS[key])

// The first letter of the site name, escaped AFTER slicing so an ampersand in a
// title never leaves half an entity behind.
const initial = (name) => esc(String(name || 'My Site').trim().slice(0, 1) || 'M')

// A quote is optional seed data. Its text and author are separate nodes so the
// localiser can translate each one; the quotation marks are drawn in CSS.
const quoteBlock = (quote, className) => (quote
  ? `<blockquote class="${className}"><p>${quote.text}</p><cite>${quote.author}</cite></blockquote>`
  : '')

const shadow = (p, strength = 1) => (p.dark
  ? `0 ${24 * strength}px ${60 * strength}px rgba(0,0,0,.5)`
  : `0 ${24 * strength}px ${60 * strength}px rgba(20,20,43,.12)`)

// A tiled canvas: hero, figures and highlights share one grid.
function verticalBento(p, name, profile) {
  const t = esc(name)
  const c = verticalContent(profile)
  const css = `
  .bento-wrap { padding:40px 0 76px; }
  .bento { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); grid-auto-rows:minmax(150px,auto); gap:16px; }
  .tile { background:var(--card); border:1px solid var(--border); border-radius:calc(var(--radius) + 8px);
    padding:26px; display:flex; flex-direction:column; gap:10px; min-width:0; }
  .tile h3 { margin:0; font-size:19px; }
  .tile p { margin:0; color:var(--muted); font-size:15px; }
  .tile-hero { grid-column:span 2; grid-row:span 2; justify-content:center; padding:clamp(28px,4vw,48px);
    background:${heroPattern(p)}, var(--card); }
  .tile-hero h1 { font-size:clamp(34px,4.6vw,56px); margin:12px 0 10px; }
  .tile-hero .lead { margin:0 0 24px; }
  .tile-art { grid-column:span 2; grid-row:span 2; min-height:320px; padding:0; border:0; background:${artFill(p, 150)}; }
  .tile-stat { justify-content:flex-end; }
  .tile-stat b { font-family:${p.head.fam}; font-size:clamp(30px,3.4vw,46px); line-height:1; }
  .tile-stat span { color:var(--muted); font-size:14px; }
  .tile-accent { background:var(--accent); border-color:var(--accent); color:${onAccent(p)}; }
  .tile-accent span, .tile-accent p { color:${onAccent(p)}; opacity:.86; }
  .tile-wide { grid-column:span 2; }
  .tile .num { font-family:${p.head.fam}; color:var(--accent); font-size:13px; letter-spacing:.12em; }
  .tile blockquote { margin:0; }
  .tile blockquote p { font-family:${p.head.fam}; color:var(--ink); font-size:18px; line-height:1.4; }
  .tile blockquote p::before { content:'“'; color:var(--accent); }
  .tile blockquote p::after { content:'”'; color:var(--accent); }
  .tile cite { display:block; margin-top:10px; font-style:normal; color:var(--muted); font-size:14px; }
  .bento-actions { display:flex; gap:12px; flex-wrap:wrap; }
  .bento-steps { margin:0; padding-left:22px; display:grid; gap:10px; font-weight:600; }
  @media (max-width: 900px) {
    .bento { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .tile-art { min-height:240px; }
  }
  @media (max-width: 560px) {
    .bento { grid-template-columns:1fr; }
    .tile-hero, .tile-art, .tile-wide { grid-column:auto; grid-row:auto; }
  }`
  const fourth = c.quote
    ? `<div class="tile">${quoteBlock(c.quote, 'bento-quote')}</div>`
    : `<div class="tile"><span class="num">${c.nav[2]}</span><h3>${c.ctaTitle}</h3></div>`
  return doc(p, t, `${t} | ${c.sectionTitle}`, `
${navbar(t, verticalNav(c), ['#contact', c.cta])}
<section class="bento-wrap"><div class="container"><div class="bento">
  <div class="tile tile-hero">
    <span class="chip" style="align-self:flex-start;">${c.badge}</span>
    <h1>${c.title}</h1>
    <p class="lead">${c.lead}</p>
    <div class="bento-actions"><a class="btn" href="#contact">${c.cta}</a><a class="btn btn-ghost" href="#collection">${c.nav[0]}</a></div>
  </div>
  <div class="tile tile-art visual" role="img" aria-label="${c.storyTitle}"></div>
  ${c.stats.map(([value, text], i) => `<div class="tile tile-stat${i === 1 ? ' tile-accent' : ''}"><b>${value}</b><span>${text}</span></div>`).join('\n  ')}
  ${fourth}
</div></div></section>
<section id="collection" class="soft"><div class="container">
  ${sectionHead(c.nav[0], c.sectionTitle, c.sectionLead)}
  <div class="bento">
    ${c.items.map((item, i) => `<div class="tile${i === 0 ? ' tile-wide' : ''}"><span class="num">0${i + 1}</span><h3>${item.h}</h3><p>${item.p}</p></div>`).join('\n    ')}
    <div class="tile tile-wide" id="story"><span class="num">${c.nav[1]}</span><h3>${c.storyTitle}</h3><p>${c.story}</p></div>
    <div class="tile tile-wide tile-accent"><ol class="bento-steps">${c.steps.map((step) => `<li>${step}</li>`).join('')}</ol></div>
  </div>
</div></section>
${ctaBand(c.ctaTitle, c.ctaCopy, ['#collection', c.cta])}
${verticalFooter(t, c)}`, css)
}

// A fixed picture on one half, the words scrolling past on the other.
function verticalSplit(p, name, profile) {
  const t = esc(name)
  const c = verticalContent(profile)
  const css = `
  .split-screen { display:grid; grid-template-columns:minmax(0,5fr) minmax(0,6fr); min-height:100vh; }
  .split-art { position:sticky; top:0; height:100vh; display:flex; flex-direction:column; justify-content:space-between;
    gap:28px; padding:clamp(28px,4vw,48px); color:#fff;
    background:linear-gradient(180deg, rgba(0,0,0,.34), rgba(0,0,0,0) 42%, rgba(0,0,0,.5)),
      linear-gradient(150deg, ${art(p)}, ${p.dark ? p.soft : p.ink}); }
  .split-art .brand, .split-art .brand b { color:#fff; font-size:22px; }
  .split-art .chip { background:rgba(255,255,255,.16); color:#fff; border-color:rgba(255,255,255,.36); }
  .split-art-title { font-family:${p.head.fam}; font-size:clamp(26px,3vw,40px); line-height:1.15; max-width:16ch; margin:16px 0 0; }
  .split-body { min-width:0; padding:0 clamp(24px,5vw,72px); }
  .split-nav { display:flex; flex-wrap:wrap; gap:8px 22px; align-items:center; padding:26px 0; border-bottom:1px solid var(--border); }
  .split-nav a { color:var(--muted); font-weight:600; font-size:15px; }
  .split-nav a:hover { color:var(--ink); }
  .split-nav .btn { margin-left:auto; color:${onAccent(p)}; padding:10px 20px; }
  .split-body section { padding:64px 0; border-bottom:1px solid var(--border); }
  .split-body h1 { font-size:clamp(36px,4.8vw,60px); margin-top:14px; }
  .split-list { list-style:none; margin:28px 0 0; padding:0; }
  .split-list li { display:grid; grid-template-columns:56px 1fr; gap:4px 16px; padding:20px 0; border-top:1px solid var(--border); }
  .split-list .n { font-family:${p.head.fam}; color:var(--accent); font-size:22px; grid-row:span 2; }
  .split-list h3 { margin:0; font-size:19px; }
  .split-list p { margin:0; color:var(--muted); font-size:15px; }
  .split-foot { padding:28px 0 40px; color:var(--muted); font-size:14px; display:flex; flex-wrap:wrap; gap:8px 18px; justify-content:space-between; }
  @media (max-width: 900px) {
    .split-screen { grid-template-columns:1fr; }
    .split-art { position:relative; height:auto; min-height:46vh; }
    .split-nav .btn { margin-left:0; }
  }`
  return doc(p, t, `${t} | ${c.sectionTitle}`, `
<div class="split-screen">
  <aside class="split-art">
    <span class="brand">${t}<b>.</b></span>
    <div><span class="chip">${c.badge}</span><p class="split-art-title">${c.storyTitle}</p></div>
  </aside>
  <main class="split-body">
    <nav class="split-nav" aria-label="${t}">
      <a href="#collection">${c.nav[0]}</a>
      <a href="#story">${c.nav[1]}</a>
      <a class="btn" href="#contact">${c.cta}</a>
    </nav>
    <section id="top">
      <p class="eyebrow">${c.nav[0]}</p>
      <h1>${c.title}</h1>
      <p class="lead">${c.lead}</p>
      <a class="btn" href="#collection">${c.cta}</a>
    </section>
    <section id="collection">
      <h2>${c.sectionTitle}</h2>
      <p class="lead" style="margin-bottom:0;">${c.sectionLead}</p>
      <ol class="split-list">
        ${c.items.map((item, i) => `<li><span class="n">0${i + 1}</span><h3>${item.h}</h3><p>${item.p}</p></li>`).join('\n        ')}
      </ol>
    </section>
    <section id="story">
      <h2>${c.storyTitle}</h2>
      <p class="lead">${c.story}</p>
      ${verticalSteps(c)}
    </section>
    <section id="contact" style="border-bottom:0;">
      <h2>${c.ctaTitle}</h2>
      <p class="lead">${c.ctaCopy}</p>
      <a class="btn" href="mailto:hello@example.com">${c.cta}</a>
    </section>
    <footer class="split-foot"><span>© 2026 ${t}</span><span>${c.footer}</span></footer>
  </main>
</div>`, css)
}

// The offer told as a sequence of moments down a centred line.
function verticalChronicle(p, name, profile) {
  const t = esc(name)
  const c = verticalContent(profile)
  const css = `
  .chronicle { list-style:none; margin:44px 0 0; padding:0; position:relative; }
  .chronicle::before { content:''; position:absolute; left:50%; top:0; bottom:0; width:2px; background:var(--border); transform:translateX(-1px); }
  .chronicle li { position:relative; width:50%; padding:0 48px 56px 0; text-align:right; }
  .chronicle li:nth-child(even) { margin-left:50%; padding:0 0 56px 48px; text-align:left; }
  .chronicle li::after { content:''; position:absolute; top:6px; right:-10px; width:20px; height:20px; border-radius:50%;
    background:var(--bg); border:4px solid var(--accent); box-sizing:border-box; }
  .chronicle li:nth-child(even)::after { right:auto; left:-10px; }
  .chronicle .when { display:inline-block; font-size:13px; font-weight:700; letter-spacing:.1em; color:var(--accent); margin-bottom:6px; }
  .chronicle h3 { font-size:22px; margin:0 0 8px; }
  .chronicle p { margin:0; color:var(--muted); }
  .chronicle-quote { margin:0; padding:32px; border-radius:var(--radius); background:var(--soft); border:1px solid var(--border); }
  .chronicle-quote p { font-family:${p.head.fam}; font-size:clamp(22px,2.6vw,30px); line-height:1.35; margin:0; }
  .chronicle-quote p::before { content:'“'; color:var(--accent); }
  .chronicle-quote p::after { content:'”'; color:var(--accent); }
  .chronicle-quote cite { display:block; margin-top:16px; font-style:normal; font-size:15px; color:var(--muted); }
  .chronicle-tags { display:flex; flex-wrap:wrap; gap:8px; }
  @media (max-width: 760px) {
    .chronicle::before { left:10px; }
    .chronicle li, .chronicle li:nth-child(even) { width:100%; margin-left:0; padding:0 0 40px 42px; text-align:left; }
    .chronicle li::after, .chronicle li:nth-child(even)::after { left:0; right:auto; }
  }`
  const aside = c.quote
    ? quoteBlock(c.quote, 'chronicle-quote')
    : `<div class="visual" style="min-height:300px;" role="img" aria-label="${c.storyTitle}"></div>`
  return doc(p, t, `${t} | ${c.storyTitle}`, `
${navbar(t, verticalNav(c), ['#contact', c.cta])}
${heroCentered(t, { pattern: heroPattern(p), badge: c.badge, title: c.title, sub: c.lead, cta: ['#collection', c.cta], cta2: ['#story', c.nav[1]] })}
<section id="collection" class="soft"><div class="container narrow">
  ${sectionHead(c.nav[0], c.sectionTitle, c.sectionLead)}
  <ol class="chronicle">
    ${c.items.map((item, i) => `<li><span class="when">0${i + 1}</span><h3>${item.h}</h3><p>${item.p}</p></li>`).join('\n    ')}
  </ol>
</div></section>
<section id="story"><div class="container grid-2" style="align-items:center;">
  <div>${sectionHead(c.nav[1], c.storyTitle, c.story)}<div class="chronicle-tags">${c.steps.map((step) => `<span class="chip">${step}</span>`).join('')}</div></div>
  ${aside}
</div></section>
${ctaBand(c.ctaTitle, c.ctaCopy, ['#collection', c.cta])}
${verticalFooter(t, c)}`, css)
}

// A poster: the headline is the design.
function verticalPoster(p, name, profile) {
  const t = esc(name)
  const c = verticalContent(profile)
  const css = `
  .poster-top { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px 24px; padding:22px 0; }
  .poster-top nav { display:flex; flex-wrap:wrap; gap:6px 22px; }
  .poster-top nav a { font-weight:700; font-size:14px; letter-spacing:.06em; }
  .poster-top nav a:hover { color:var(--accent); }
  .poster { padding:40px 0 64px; border-bottom:2px solid var(--ink); }
  .poster h1 { font-size:clamp(46px,10vw,132px); line-height:.94; letter-spacing:-0.035em; margin:22px 0 30px; max-width:13ch; }
  .poster-foot { display:flex; flex-wrap:wrap; gap:24px; align-items:flex-end; justify-content:space-between; }
  .poster-foot .lead { margin:0; }
  .ticker { overflow:hidden; background:var(--accent); color:${onAccent(p)}; padding:16px 0; white-space:nowrap; }
  .ticker-track { display:inline-flex; gap:40px; animation:ticker 28s linear infinite; font-family:${p.head.fam}; font-size:clamp(20px,2.6vw,30px); }
  .ticker-track span::after { content:'✦'; margin-left:40px; }
  @keyframes ticker { to { transform:translateX(-50%); } }
  @media (prefers-reduced-motion: reduce) { .ticker-track { animation:none; } }
  .bignums { list-style:none; margin:0; padding:0; }
  .bignums li { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,2fr); gap:12px 40px; padding:34px 0; border-top:2px solid var(--ink); align-items:baseline; }
  .bignums .n { font-family:${p.head.fam}; font-size:clamp(56px,9vw,110px); line-height:.9; color:var(--accent); }
  .bignums h3 { font-size:clamp(22px,2.6vw,32px); margin:0 0 8px; }
  .bignums p { margin:0; color:var(--muted); font-size:17px; }
  .invert { background:var(--ink); color:var(--bg); }
  .invert .eyebrow { color:inherit; opacity:.7; }
  .invert-quote { font-family:${p.head.fam}; font-size:clamp(26px,3.6vw,46px); line-height:1.2; margin:0; max-width:24ch; }
  @media (max-width: 700px) { .bignums li { grid-template-columns:1fr; } }`
  const words = [...c.items.map((item) => item.h), ...c.steps]
  return doc(p, t, `${t} | ${c.sectionTitle}`, `
<div class="container">
  <header class="poster-top">
    <span class="brand">${t}<b>.</b></span>
    <nav aria-label="${t}"><a href="#collection">${c.nav[0]}</a><a href="#story">${c.nav[1]}</a><a href="#contact">${c.nav[2]}</a></nav>
  </header>
  <section class="poster">
    <span class="chip">${c.badge}</span>
    <h1>${c.title}</h1>
    <div class="poster-foot"><p class="lead">${c.lead}</p><a class="btn" href="#contact">${c.cta}</a></div>
  </section>
</div>
<div class="ticker" aria-hidden="true"><div class="ticker-track">${[...words, ...words].map((word) => `<span>${word}</span>`).join('')}</div></div>
<section id="collection"><div class="container">
  <p class="eyebrow">${c.nav[0]}</p>
  <h2 style="margin-bottom:30px;">${c.sectionTitle}</h2>
  <ol class="bignums">
    ${c.items.map((item, i) => `<li><span class="n">0${i + 1}</span><div><h3>${item.h}</h3><p>${item.p}</p></div></li>`).join('\n    ')}
  </ol>
</div></section>
<section id="story" class="invert"><div class="container">
  <p class="eyebrow">${c.storyTitle}</p>
  <p class="invert-quote">${c.story}</p>
</div></section>
${ctaBand(c.ctaTitle, c.ctaCopy, ['#collection', c.cta])}
${verticalFooter(t, c)}`, css)
}

// Cards that pile onto one another as the page scrolls.
function verticalStack(p, name, profile) {
  const t = esc(name)
  const c = verticalContent(profile)
  const css = `
  .stack-hero { padding:96px 0 72px; background:${heroPattern(p)}; }
  .stack-hero .container { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr); gap:48px; align-items:center; }
  .stack-hero h1 { font-size:clamp(38px,5.6vw,68px); max-width:16ch; margin-top:22px; }
  .pile { position:relative; min-height:370px; }
  .pile .sheet { position:absolute; left:8%; right:8%; padding:24px 26px; border-radius:calc(var(--radius) + 8px);
    background:var(--card); border:1px solid var(--border); box-shadow:${shadow(p, 0.7)}; display:grid; gap:6px; }
  .pile .sheet span { font-family:${p.head.fam}; color:var(--accent); font-size:13px; letter-spacing:.14em; }
  .pile .sheet b { font-family:${p.head.fam}; font-size:clamp(18px,2vw,24px); }
  .pile .sheet:nth-child(1) { top:0; transform:rotate(-4deg); }
  .pile .sheet:nth-child(2) { top:112px; transform:rotate(2.5deg); }
  .pile .sheet:nth-child(3) { top:224px; transform:rotate(-1.5deg); background:var(--accent); border-color:var(--accent); color:${onAccent(p)}; }
  .pile .sheet:nth-child(3) span { color:${onAccent(p)}; opacity:.8; }
  .stack { display:grid; gap:28px; margin-top:34px; }
  .stack-card { position:sticky; top:calc(84px + var(--i) * 18px); display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr);
    min-height:360px; background:var(--card); border:1px solid var(--border); border-radius:calc(var(--radius) + 10px);
    overflow:hidden; box-shadow:${shadow(p)}; }
  .stack-card .pane { padding:clamp(28px,4vw,52px); display:flex; flex-direction:column; justify-content:center; gap:12px; }
  .stack-card .num { font-family:${p.head.fam}; font-size:15px; letter-spacing:.14em; color:var(--accent); }
  .stack-card h3 { font-size:clamp(24px,3vw,36px); margin:0; }
  .stack-card p { margin:0; color:var(--muted); font-size:17px; }
  .stack-card .visual { border-radius:0; min-height:240px; }
  .stack-steps { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; }
  .center-head .lead { margin-left:auto; margin-right:auto; }
  @media (max-width: 800px) {
    .stack-card { grid-template-columns:1fr; position:relative; top:auto; }
    .stack-hero .container { grid-template-columns:1fr; }
    .pile { min-height:340px; }
  }`
  const cards = c.items.map((item, i) => `
    <article class="stack-card" style="--i:${i};">
      <div class="pane"><span class="num">0${i + 1}</span><h3>${item.h}</h3><p>${item.p}</p><a class="btn btn-ghost" href="#contact" style="align-self:flex-start; margin-top:10px;">${c.cta}</a></div>
      <div class="visual" style="background:linear-gradient(${140 + i * 40}deg, ${art(p)}2a, ${art(p)}c2), ${heroPattern(p)};" role="img" aria-label="${item.h}"></div>
    </article>`).join('')
  return doc(p, t, `${t} | ${c.sectionTitle}`, `
${navbar(t, verticalNav(c), ['#contact', c.cta])}
<section class="stack-hero"><div class="container">
  <div>
    <span class="chip">${c.badge}</span>
    <h1>${c.title}</h1>
    <p class="lead">${c.lead}</p>
    <div style="display:flex; gap:14px; flex-wrap:wrap;"><a class="btn" href="#collection">${c.cta}</a><a class="btn btn-ghost" href="#story">${c.nav[1]}</a></div>
  </div>
  <div class="pile" aria-hidden="true">${c.items.map((item, i) => `<div class="sheet"><span>0${i + 1}</span><b>${item.h}</b></div>`).join('')}</div>
</div></section>
<section id="collection" class="soft"><div class="container">
  ${sectionHead(c.nav[0], c.sectionTitle, c.sectionLead)}
  <div class="stack">${cards}
  </div>
</div></section>
<section id="story"><div class="container narrow center-head" style="text-align:center;">
  ${sectionHead(c.nav[1], c.storyTitle, c.story)}
  <div class="stack-steps">${c.steps.map((step) => `<span class="chip">${step}</span>`).join('')}</div>
</div></section>
${ctaBand(c.ctaTitle, c.ctaCopy, ['#collection', c.cta])}
${verticalFooter(t, c)}`, css)
}

// A letter: one narrow column of carefully set type and nothing else.
function verticalLetter(p, name, profile) {
  const t = esc(name)
  const c = verticalContent(profile)
  const css = `
  body { background:var(--soft); }
  .letter { max-width:760px; margin:0 auto; padding:clamp(28px,7vw,96px) 18px; }
  .letter-sheet { background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
    padding:clamp(26px,6vw,72px); box-shadow:${shadow(p, 0.8)}; }
  .letter-top { display:flex; flex-wrap:wrap; justify-content:space-between; gap:12px; align-items:baseline;
    padding-bottom:22px; border-bottom:1px solid var(--border); margin-bottom:40px; }
  .letter-top nav { display:flex; gap:16px; flex-wrap:wrap; font-size:14px; }
  .letter-top nav a { color:var(--muted); border-bottom:1px solid var(--border); }
  .letter-top nav a:hover { color:var(--ink); border-color:var(--ink); }
  .letter h1 { font-size:clamp(34px,5vw,52px); margin-top:20px; }
  .letter .opening { font-size:20px; line-height:1.6; color:var(--ink); }
  .letter p { font-size:17.5px; line-height:1.8; color:var(--muted); }
  .letter h2 { font-size:clamp(22px,2.6vw,28px); margin:48px 0 10px; }
  .letter dl { margin:0; }
  .letter dt { font-weight:700; font-family:${p.head.fam}; font-size:19px; margin-top:22px; }
  .letter dd { margin:4px 0 0; color:var(--muted); line-height:1.7; }
  .letter ol { padding-left:22px; font-size:17px; line-height:1.9; }
  .letter blockquote { margin:40px 0; padding:4px 0 4px 24px; border-left:3px solid var(--accent); }
  .letter blockquote p { font-family:${p.head.fam}; font-size:22px; line-height:1.45; color:var(--ink); margin:0; }
  .letter blockquote cite { display:block; margin-top:10px; font-style:normal; font-size:15px; color:var(--muted); }
  .letter-sign { margin-top:48px; padding-top:28px; border-top:1px solid var(--border); }
  .letter-foot { text-align:center; color:var(--muted); font-size:13.5px; margin-top:28px; }`
  return doc(p, t, `${t} | ${c.storyTitle}`, `
<main class="letter" id="top">
  <article class="letter-sheet">
    <header class="letter-top">
      <span class="brand">${t}<b>.</b></span>
      <nav aria-label="${t}"><a href="#collection">${c.nav[0]}</a><a href="#story">${c.nav[1]}</a><a href="#contact">${c.nav[2]}</a></nav>
    </header>
    <span class="chip">${c.badge}</span>
    <h1>${c.title}</h1>
    <p class="opening">${c.lead}</p>
    <h2 id="collection">${c.sectionTitle}</h2>
    <p>${c.sectionLead}</p>
    <dl>
      ${c.items.map((item) => `<dt>${item.h}</dt><dd>${item.p}</dd>`).join('\n      ')}
    </dl>
    <h2 id="story">${c.storyTitle}</h2>
    <p>${c.story}</p>
    <ol>${c.steps.map((step) => `<li>${step}</li>`).join('')}</ol>
    ${quoteBlock(c.quote, 'letter-quote')}
    <div class="letter-sign" id="contact">
      <h2 style="margin-top:0;">${c.ctaTitle}</h2>
      <p>${c.ctaCopy}</p>
      <a class="btn" href="mailto:hello@example.com">${c.cta}</a>
    </div>
  </article>
  <p class="letter-foot">© 2026 ${t} · <span>${c.footer}</span></p>
</main>`, css)
}

// Three options side by side in a real table.
function verticalCompare(p, name, profile) {
  const t = esc(name)
  const c = verticalContent(profile)
  const css = `
  .compare-wrap { overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius); background:var(--card); }
  .compare { width:100%; border-collapse:collapse; min-width:560px; }
  .compare th, .compare td { padding:18px 20px; text-align:left; border-bottom:1px solid var(--border); vertical-align:top; }
  .compare thead th { font-family:${p.head.fam}; font-size:19px; }
  .compare thead th small { display:block; font-family:${p.body.fam}; font-size:13.5px; color:var(--muted); font-weight:400; margin-top:6px; line-height:1.5; }
  .compare thead .chip { margin-bottom:10px; }
  .compare tbody th { font-weight:600; font-size:15px; }
  .compare .pick { background:var(--accent-soft); }
  .compare td.yes { color:var(--accent); font-weight:800; font-size:18px; }
  .compare td.no { color:var(--muted); }
  .compare .price { font-family:${p.head.fam}; font-size:28px; }
  .compare tfoot td, .compare tfoot th { border-bottom:0; }
  .compare tfoot .btn { padding:11px 18px; font-size:14.5px; }`
  const pick = (i) => (i === 1 ? ' class="pick"' : '')
  const head = c.items.map((item, i) => `<th${pick(i)}>${i === 1 ? `<span class="chip">${label('recommended')}</span><br/>` : ''}${item.h}<small>${item.p}</small></th>`).join('')
  const rows = c.steps.map((step, row) => `<tr><th scope="row">${step}</th>${c.items.map((_, col) => (row <= col
    ? `<td${col === 1 ? ' class="yes pick"' : ' class="yes"'}>✓</td>`
    : `<td${col === 1 ? ' class="no pick"' : ' class="no"'}>—</td>`)).join('')}</tr>`).join('\n        ')
  const links = [['#plans', c.nav[0]], ['#story', c.nav[1]], ['#contact', c.nav[2]]]
  return doc(p, t, `${t} | ${c.sectionTitle}`, `
${navbar(t, links, ['#contact', c.cta])}
${heroCentered(t, { pattern: heroPattern(p), badge: c.badge, title: c.title, sub: c.lead, cta: ['#plans', c.cta], cta2: ['#story', c.nav[1]] })}
<section id="plans" class="soft"><div class="container">
  ${sectionHead(c.nav[0], c.sectionTitle, c.sectionLead)}
  <div class="compare-wrap">
    <table class="compare">
      <thead><tr><th>${label('whatYouGet')}</th>${head}</tr></thead>
      <tbody>
        ${rows}
        <tr><th scope="row">${label('investment')}</th>${['€', '€€', '€€€'].map((price, i) => `<td${pick(i)}><span class="price">${price}</span></td>`).join('')}</tr>
      </tbody>
      <tfoot><tr><th></th>${c.items.map((_, i) => `<td${pick(i)}><a class="btn${i === 1 ? '' : ' btn-ghost'}" href="#contact">${c.cta}</a></td>`).join('')}</tr></tfoot>
    </table>
  </div>
</div></section>
<section id="story"><div class="container grid-2" style="align-items:start;">
  <div>${sectionHead(c.nav[1], c.storyTitle, c.story)}</div>
  <div>${verticalSteps(c)}</div>
</div></section>
${ctaBand(c.ctaTitle, c.ctaCopy, ['#plans', c.cta])}
${verticalFooter(t, c, links)}`, css)
}

// A picture book: big captioned visuals in an editorial grid.
function verticalLookbook(p, name, profile) {
  const t = esc(name)
  const c = verticalContent(profile)
  const css = `
  .look-hero { padding:84px 0 36px; }
  .look-hero .container { display:grid; grid-template-columns:minmax(0,1.3fr) minmax(0,1fr); gap:24px 56px; align-items:end; }
  .look-hero h1 { font-size:clamp(40px,6.4vw,84px); line-height:.98; margin:18px 0 0; }
  .look-hero .lead { margin:0 0 22px; }
  .lookbook { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:18px; }
  .lookbook figure { margin:0; min-width:0; }
  .lookbook .visual { border-radius:var(--radius); }
  .lookbook figcaption { display:flex; justify-content:space-between; gap:12px; padding:12px 2px 0; font-size:14.5px; }
  .lookbook figcaption b { font-family:${p.head.fam}; font-size:17px; font-weight:600; }
  .lookbook figcaption span { color:var(--muted); }
  .f-a { grid-column:span 4; } .f-a .visual { aspect-ratio:16/10; }
  .f-b { grid-column:span 2; } .f-b .visual { aspect-ratio:4/5; }
  .f-c, .f-d, .f-e { grid-column:span 2; } .f-c .visual, .f-d .visual, .f-e .visual { aspect-ratio:1/1; }
  .look-notes { margin:0; display:grid; gap:0; }
  .look-notes dt { font-family:${p.head.fam}; font-size:20px; font-weight:600; padding-top:18px; border-top:1px solid var(--border); }
  .look-notes dd { margin:6px 0 18px; color:var(--muted); }
  @media (max-width: 800px) {
    .look-hero .container { grid-template-columns:1fr; }
    .lookbook { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .lookbook figure { grid-column:span 1; }
    .lookbook .f-a { grid-column:1 / -1; }
  }`
  const captions = [...c.items.map((item) => item.h), c.storyTitle, c.ctaTitle]
  const figures = captions.map((caption, i) => `
    <figure class="f-${'abcde'[i]}"><div class="visual" style="background:linear-gradient(${120 + i * 37}deg, ${art(p)}${i % 2 ? '33' : '5c'}, ${art(p)}${i % 3 ? 'b0' : '80'}), ${heroPattern(p)};" role="img" aria-label="${caption}"></div><figcaption><b>${caption}</b><span>0${i + 1}</span></figcaption></figure>`).join('')
  return doc(p, t, `${t} | ${c.sectionTitle}`, `
${navbar(t, verticalNav(c), ['#contact', c.cta])}
<section class="look-hero"><div class="container">
  <div><span class="chip">${c.badge}</span><h1>${c.title}</h1></div>
  <div><p class="lead">${c.lead}</p><a class="btn" href="#collection">${c.cta}</a></div>
</div></section>
<section id="collection" style="padding-top:24px;"><div class="container"><div class="lookbook">${figures}
</div></div></section>
<section id="story" class="soft"><div class="container grid-2" style="align-items:start;">
  <div>${sectionHead(c.nav[1], c.storyTitle, c.story)}</div>
  <dl class="look-notes">${c.items.map((item) => `<dt>${item.h}</dt><dd>${item.p}</dd>`).join('')}</dl>
</div></section>
${ctaBand(c.ctaTitle, c.ctaCopy, ['#collection', c.cta])}
${verticalFooter(t, c)}`, css)
}

// One focused card on a quiet background — the sign-up is the page.
function verticalSolo(p, name, profile) {
  const t = esc(name)
  const c = verticalContent(profile)
  const css = `
  .solo-page { min-height:100vh; display:grid; place-items:center; padding:48px 16px; background:${heroPattern(p)}, var(--soft); }
  .solo { width:100%; max-width:600px; background:var(--card); border:1px solid var(--border);
    border-radius:calc(var(--radius) + 12px); padding:clamp(26px,5vw,52px); box-shadow:${shadow(p, 1.4)}; }
  .solo-head { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:28px; flex-wrap:wrap; }
  .solo h1 { font-size:clamp(30px,4.6vw,44px); margin:0 0 12px; }
  .solo .lead { margin:0 0 24px; font-size:17px; }
  .solo-form { display:flex; gap:10px; flex-wrap:wrap; }
  .solo-form input { flex:1 1 220px; min-width:0; padding:14px 16px; font:inherit; font-size:15px; color:var(--ink);
    background:var(--bg); border:1px solid var(--border); border-radius:calc(var(--radius)/1.2 + 4px); }
  .solo-list { list-style:none; margin:30px 0 0; padding:0; display:grid; gap:16px; }
  .solo-list li { display:grid; grid-template-columns:40px 1fr; gap:14px; align-items:start; }
  .solo-list .dot { margin:0; width:40px; height:40px; font-size:14px; font-weight:700; }
  .solo-list h3 { margin:0 0 2px; font-size:16.5px; }
  .solo-list p { margin:0; color:var(--muted); font-size:14.5px; }
  .solo-steps { display:flex; flex-wrap:wrap; gap:8px; margin-top:26px; padding-top:22px; border-top:1px solid var(--border); }
  .solo-foot { margin:22px 0 0; font-size:13px; color:var(--muted); text-align:center; }`
  return doc(p, t, `${t} | ${c.cta}`, `
<main class="solo-page">
  <div class="solo" id="contact">
    <div class="solo-head"><span class="brand">${t}<b>.</b></span><span class="chip">${c.badge}</span></div>
    <h1>${c.title}</h1>
    <p class="lead">${c.lead}</p>
    <div class="solo-form"><input type="email" placeholder="${label('emailPlaceholder')}" aria-label="${label('emailPlaceholder')}" /><a class="btn" href="mailto:hello@example.com">${c.cta}</a></div>
    <ul class="solo-list" id="collection">
      ${c.items.map((item, i) => `<li><span class="dot">0${i + 1}</span><div><h3>${item.h}</h3><p>${item.p}</p></div></li>`).join('\n      ')}
    </ul>
    <div class="solo-steps" id="story">${c.steps.map((step) => `<span class="chip">${step}</span>`).join('')}</div>
    <p class="solo-foot">© 2026 ${t} · <span>${c.footer}</span></p>
  </div>
</main>`, css)
}

// The product itself: a side menu, key figures and panels.
function verticalAppshell(p, name, profile) {
  const t = esc(name)
  const c = verticalContent(profile)
  const css = `
  body { background:var(--soft); }
  .appshell { display:grid; grid-template-columns:232px minmax(0,1fr); min-height:100vh; }
  .shell-side { position:sticky; top:0; height:100vh; background:var(--card); border-right:1px solid var(--border);
    padding:22px 14px; display:flex; flex-direction:column; gap:4px; }
  .shell-side .brand { padding:4px 10px 22px; font-size:19px; }
  .shell-side a.item { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; color:var(--muted); font-weight:600; font-size:14.5px; }
  .shell-side a.item:hover { background:var(--soft); color:var(--ink); }
  .shell-side a.item i { font-style:normal; width:26px; height:26px; border-radius:8px; display:grid; place-items:center;
    background:var(--soft); color:var(--accent); font-size:11px; font-weight:800; flex-shrink:0; }
  .shell-side a.item.on { background:var(--accent-soft); color:var(--ink); }
  .shell-side .btn { margin-top:auto; text-align:center; }
  .shell-main { min-width:0; padding:0 clamp(16px,3vw,36px) 36px; }
  .shell-bar { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:14px; padding:16px 0;
    background:var(--soft); border-bottom:1px solid var(--border); }
  .shell-bar input { flex:1 1 auto; min-width:0; max-width:420px; padding:11px 16px; font:inherit; font-size:14.5px;
    color:var(--ink); background:var(--card); border:1px solid var(--border); border-radius:999px; }
  .shell-bar .avatar { margin-left:auto; width:38px; height:38px; border-radius:50%; flex-shrink:0; display:grid; place-items:center;
    background:linear-gradient(135deg, ${art(p)}, ${art(p)}88); color:#fff; font-weight:800; }
  .panel { background:var(--card); border:1px solid var(--border); border-radius:calc(var(--radius) + 4px); padding:24px; min-width:0; }
  .panel.visual { background:${artFill(p, 150)}; border:0; }
  .shell-hero { margin:26px 0 18px; display:grid; grid-template-columns:minmax(0,1.4fr) minmax(0,1fr); gap:18px; }
  .shell-hero h1 { font-size:clamp(28px,3.4vw,42px); margin:14px 0 10px; }
  .shell-hero .lead { margin:0 0 20px; font-size:16.5px; }
  .kpis { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; margin-bottom:18px; }
  .kpi b { display:block; font-family:${p.head.fam}; font-size:32px; line-height:1.1; }
  .kpi span { color:var(--muted); font-size:14px; }
  .kpi .bar { margin-bottom:0; margin-top:14px; }
  .shell-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; margin-bottom:18px; }
  .shell-grid h3 { font-size:17px; margin:12px 0 6px; }
  .shell-grid p { margin:0; color:var(--muted); font-size:14.5px; }
  .status { display:inline-block; font-size:12px; font-weight:700; padding:3px 10px; border-radius:999px; background:var(--accent-soft); color:var(--accent); }
  .checks { list-style:none; margin:16px 0 0; padding:0; }
  .checks li { padding:11px 0 11px 30px; position:relative; border-top:1px solid var(--border); font-weight:600; }
  .checks li::before { content:'✓'; position:absolute; left:4px; color:var(--accent); font-weight:800; }
  .shell-foot { color:var(--muted); font-size:13.5px; padding:20px 0 0; margin:0; }
  @media (max-width: 960px) {
    .appshell { grid-template-columns:1fr; }
    .shell-side { position:static; height:auto; flex-direction:row; flex-wrap:wrap; align-items:center; border-right:0; border-bottom:1px solid var(--border); }
    .shell-side .brand { padding:4px 10px; }
    .shell-side .btn { margin-top:0; margin-left:auto; }
    .shell-hero, .kpis, .shell-grid { grid-template-columns:1fr; }
  }`
  const statuses = ['statusReady', 'statusPopular', 'statusNew'].map(label)
  return doc(p, t, `${t} | ${c.sectionTitle}`, `
<div class="appshell">
  <aside class="shell-side">
    <span class="brand">${t}<b>.</b></span>
    <a class="item on" href="#top"><i>01</i>${label('overview')}</a>
    <a class="item" href="#collection"><i>02</i>${c.nav[0]}</a>
    <a class="item" href="#story"><i>03</i>${c.nav[1]}</a>
    <a class="item" href="#contact"><i>04</i>${c.nav[2]}</a>
    <a class="btn" href="#contact">${c.cta}</a>
  </aside>
  <main class="shell-main">
    <div class="shell-bar"><input type="search" placeholder="${label('search')}" aria-label="${label('search')}" /><span class="avatar" aria-hidden="true">${initial(name)}</span></div>
    <section id="top" class="shell-hero" style="padding:0;">
      <div class="panel"><span class="chip">${c.badge}</span><h1>${c.title}</h1><p class="lead">${c.lead}</p><a class="btn" href="#contact">${c.cta}</a></div>
      <div class="panel visual" style="min-height:220px;" role="img" aria-label="${c.storyTitle}"></div>
    </section>
    <div class="kpis">
      ${c.stats.map(([value, text], i) => `<div class="panel kpi"><b>${value}</b><span>${text}</span><div class="bar"><i style="width:${[72, 48, 86][i % 3]}%"></i></div></div>`).join('\n      ')}
    </div>
    <section id="collection" style="padding:0;"><div class="shell-grid">
      ${c.items.map((item, i) => `<div class="panel"><span class="status">${statuses[i % 3]}</span><h3>${item.h}</h3><p>${item.p}</p></div>`).join('\n      ')}
    </div></section>
    <section id="story" style="padding:0;"><div class="panel" style="margin-bottom:18px;">
      <p class="eyebrow">${c.nav[1]}</p><h2>${c.storyTitle}</h2><p style="color:var(--muted); margin:0;">${c.story}</p>
      <ul class="checks">${c.steps.map((step) => `<li>${step}</li>`).join('')}</ul>
    </div></section>
    <section id="contact" class="panel" style="padding:32px; text-align:center;">
      <h2>${c.ctaTitle}</h2><p class="lead" style="margin:0 auto 22px;">${c.ctaCopy}</p><a class="btn" href="mailto:hello@example.com">${c.cta}</a>
    </section>
    <p class="shell-foot">© 2026 ${t} · <span>${c.footer}</span></p>
  </main>
</div>`, css)
}

const VERTICAL_BUILDERS = {
  catalog: verticalCatalog,
  service: verticalService,
  editorial: verticalEditorial,
  booking: verticalBooking,
  sidebar: verticalSidebar,
  magazine: verticalMagazine,
  showcase: verticalShowcase,
  directory: verticalDirectory,
  onepage: verticalOnepage,
  bento: verticalBento,
  split: verticalSplit,
  chronicle: verticalChronicle,
  poster: verticalPoster,
  stack: verticalStack,
  letter: verticalLetter,
  compare: verticalCompare,
  lookbook: verticalLookbook,
  solo: verticalSolo,
  appshell: verticalAppshell,
}

// The page architectures a vertical can be built from, and the one-liner that
// turns (category, variant) into a document — exported so the gallery's
// diversity can be asserted directly rather than inferred from ids. A starter
// may carry its own hero copy (badge, title, lead), layered over the category
// profile, so ten starters in one category do not open with the same sentence.
export const VERTICAL_FAMILY_IDS = Object.keys(VERTICAL_BUILDERS)
export const buildVerticalVariant = (seed, variant, title) =>
  VERTICAL_BUILDERS[variant.family](
    PACKS[variant.pack],
    title,
    variant.hero ? { ...seed.profile, ...variant.hero } : seed.profile,
  )
