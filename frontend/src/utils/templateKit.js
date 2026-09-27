// Shared building blocks of the template library: font pairings, design packs
// (palette + type + radius), the token-driven base stylesheet, and the small
// HTML-string builders every page architecture is composed from.
//
// Split out of templateLibrary.js so the page architectures (templateFamilies.js)
// and the catalogue assembly (templateLibrary.js) can share them without one
// module importing the other.
//
// No external images: visuals are CSS gradients/patterns, so every template
// renders fully offline and never shows a broken-image icon.

export const esc = (t) =>
  String(t || 'My Site').replace(/[<&>]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' }[c]))

// ---------------------------------------------------------------------------
// Design packs — each is a complete, coherent look.
// ---------------------------------------------------------------------------
export const F = {
  inter: { fam: "'Inter', sans-serif", q: 'Inter:wght@400;500;600;700;800' },
  playfair: { fam: "'Playfair Display', serif", q: 'Playfair+Display:ital,wght@0,500;0,700;1,500' },
  sourcesans: { fam: "'Source Sans 3', sans-serif", q: 'Source+Sans+3:wght@400;600;700' },
  poppins: { fam: "'Poppins', sans-serif", q: 'Poppins:wght@400;500;600;700;800' },
  dmserif: { fam: "'DM Serif Display', serif", q: 'DM+Serif+Display' },
  dmsans: { fam: "'DM Sans', sans-serif", q: 'DM+Sans:wght@400;500;700' },
  grotesk: { fam: "'Space Grotesk', sans-serif", q: 'Space+Grotesk:wght@400;500;700' },
  baskerville: { fam: "'Libre Baskerville', serif", q: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400' },
  lato: { fam: "'Lato', sans-serif", q: 'Lato:wght@400;700;900' },
  montserrat: { fam: "'Montserrat', sans-serif", q: 'Montserrat:wght@400;600;700;800' },
  opensans: { fam: "'Open Sans', sans-serif", q: 'Open+Sans:wght@400;600;700' },
  fraunces: { fam: "'Fraunces', serif", q: 'Fraunces:opsz,wght@9..144,500;9..144,700' },
  mono: { fam: "'JetBrains Mono', monospace", q: 'JetBrains+Mono:wght@400;600;700' },
  lora: { fam: "'Lora', serif", q: 'Lora:ital,wght@0,500;0,600;1,500' },
  // Added with the second template wave. Every face here ships a Latin
  // Extended subset, so Turkish (ğ, ş, ı, İ) renders in the face itself rather
  // than falling back mid-word.
  manrope: { fam: "'Manrope', sans-serif", q: 'Manrope:wght@400;500;600;700;800' },
  outfit: { fam: "'Outfit', sans-serif", q: 'Outfit:wght@400;500;600;700;800' },
  sora: { fam: "'Sora', sans-serif", q: 'Sora:wght@400;600;700;800' },
  syne: { fam: "'Syne', sans-serif", q: 'Syne:wght@500;600;700;800' },
  cormorant: { fam: "'Cormorant Garamond', serif", q: 'Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500' },
  bricolage: { fam: "'Bricolage Grotesque', sans-serif", q: 'Bricolage+Grotesque:wght@400;600;800' },
  jakarta: { fam: "'Plus Jakarta Sans', sans-serif", q: 'Plus+Jakarta+Sans:wght@400;500;600;700;800' },
  worksans: { fam: "'Work Sans', sans-serif", q: 'Work+Sans:wght@400;500;600;700' },
  plexsans: { fam: "'IBM Plex Sans', sans-serif", q: 'IBM+Plex+Sans:wght@400;500;600;700' },
  plexmono: { fam: "'IBM Plex Mono', monospace", q: 'IBM+Plex+Mono:wght@400;500;600' },
  nunito: { fam: "'Nunito', sans-serif", q: 'Nunito:wght@400;600;700;800' },
  archivo: { fam: "'Archivo', sans-serif", q: 'Archivo:wght@400;600;700;800' },
  merriweather: { fam: "'Merriweather', serif", q: 'Merriweather:wght@400;700;900' },
  newsreader: { fam: "'Newsreader', serif", q: 'Newsreader:wght@400;500;600;700' },
  karla: { fam: "'Karla', sans-serif", q: 'Karla:wght@400;600;700' },
  figtree: { fam: "'Figtree', sans-serif", q: 'Figtree:wght@400;500;600;700;800' },
  unbounded: { fam: "'Unbounded', sans-serif", q: 'Unbounded:wght@500;700' },
  epilogue: { fam: "'Epilogue', sans-serif", q: 'Epilogue:wght@400;600;700;800' },
  instrument: { fam: "'Instrument Serif', serif", q: 'Instrument+Serif:ital@0;1' },
  quicksand: { fam: "'Quicksand', sans-serif", q: 'Quicksand:wght@400;500;600;700' },
}

const mkPack = (p) => ({ accentSoft: p.dark ? 'rgba(255,255,255,0.08)' : `${p.accent}14`, ...p })

// Button text, body text and accent text on every pack clear WCAG AA (4.5:1)
// against the surfaces they sit on.
export const PACKS = {
  indigo: mkPack({ id: 'indigo', dark: false, accent: '#4f46e5', ink: '#171723', muted: '#62636f',
    bg: '#ffffff', soft: '#f4f4fb', card: '#ffffff', border: '#e7e7f2', radius: '14px',
    head: F.inter, body: F.inter }),
  ivory: mkPack({ id: 'ivory', dark: false, accent: '#8a5a3f', ink: '#2c2520', muted: '#6f655b',
    bg: '#faf7f2', soft: '#f1ebe1', card: '#fffdf9', border: '#e8dfd2', radius: '4px',
    head: F.playfair, body: F.sourcesans }),
  slate: mkPack({ id: 'slate', dark: true, accent: '#38bdf8', ink: '#e8edf4', muted: '#94a3b8',
    bg: '#0b1220', soft: '#101a2e', card: '#0f1828', border: '#1e2a44', radius: '12px',
    head: F.grotesk, body: F.inter }),
  forest: mkPack({ id: 'forest', dark: false, accent: '#166534', ink: '#1a2e1f', muted: '#5c6f61',
    bg: '#fbfdf9', soft: '#eef4ec', card: '#ffffff', border: '#dde8da', radius: '10px',
    head: F.fraunces, body: F.dmsans }),
  coral: mkPack({ id: 'coral', dark: false, accent: '#c93b27', ink: '#27201e', muted: '#766a66',
    bg: '#fffaf7', soft: '#fcefe9', card: '#ffffff', border: '#f3ded5', radius: '18px',
    head: F.poppins, body: F.poppins }),
  noir: mkPack({ id: 'noir', dark: true, accent: '#eab308', ink: '#f1efe9', muted: '#a6a195',
    bg: '#121110', soft: '#1a1917', card: '#181614', border: '#2c2a24', radius: '2px',
    head: F.dmserif, body: F.dmsans }),
  ocean: mkPack({ id: 'ocean', dark: false, accent: '#0e7490', ink: '#102a33', muted: '#5b7480',
    bg: '#ffffff', soft: '#f0f7f9', card: '#ffffff', border: '#dcebef', radius: '12px',
    head: F.montserrat, body: F.opensans }),
  plum: mkPack({ id: 'plum', dark: false, accent: '#86198f', ink: '#241627', muted: '#73637a',
    bg: '#fefcff', soft: '#f8f0fa', card: '#ffffff', border: '#ecdcf0', radius: '16px',
    head: F.dmserif, body: F.inter }),
  mono: mkPack({ id: 'mono', dark: false, accent: '#111111', ink: '#111111', muted: '#6f6f6f',
    bg: '#ffffff', soft: '#f5f5f5', card: '#ffffff', border: '#e5e5e5', radius: '0px',
    head: F.mono, body: F.inter }),
  midnight: mkPack({ id: 'midnight', dark: true, accent: '#a78bfa', ink: '#ece9f8', muted: '#9b95b4',
    bg: '#0e0a1f', soft: '#171130', card: '#150f2b', border: '#272046', radius: '16px',
    head: F.poppins, body: F.inter }),
  press: mkPack({ id: 'press', dark: false, accent: '#b91c1c', ink: '#1c1917', muted: '#6d655f',
    bg: '#fffdf8', soft: '#f6f1e7', card: '#fffdf8', border: '#e9e1d2', radius: '2px',
    head: F.baskerville, body: F.lora }),
  sky: mkPack({ id: 'sky', dark: false, accent: '#2563eb', ink: '#0f1c33', muted: '#5a6b85',
    bg: '#f7faff', soft: '#ebf1fc', card: '#ffffff', border: '#dbe6f6', radius: '12px',
    head: F.lato, body: F.lato }),
  // Second wave. `art` (optional) is the colour the decorative visuals are
  // painted in when it should differ from the button colour — a black button
  // on a lemon page wants lemon artwork, not grey.
  sand: mkPack({ id: 'sand', dark: false, accent: '#a4462a', ink: '#2b211b', muted: '#6f6155',
    bg: '#fbf6ef', soft: '#f3e9dc', card: '#fffaf3', border: '#eadccb', radius: '8px',
    head: F.instrument, body: F.manrope }),
  rose: mkPack({ id: 'rose', dark: false, accent: '#be185d', ink: '#2a1620', muted: '#765866',
    bg: '#fff8fa', soft: '#fdecf2', card: '#ffffff', border: '#f5d7e2', radius: '20px',
    head: F.cormorant, body: F.karla }),
  mint: mkPack({ id: 'mint', dark: false, accent: '#047857', ink: '#10241d', muted: '#526b63',
    bg: '#f7fcfa', soft: '#e7f6f0', card: '#ffffff', border: '#d3ebe2', radius: '14px',
    head: F.outfit, body: F.outfit }),
  citrus: mkPack({ id: 'citrus', dark: false, accent: '#c2410c', ink: '#1c1917', muted: '#665d56',
    bg: '#fffdf5', soft: '#fef6dc', card: '#ffffff', border: '#f3e8c4', radius: '24px',
    head: F.syne, body: F.manrope, art: '#f59e0b' }),
  lavender: mkPack({ id: 'lavender', dark: false, accent: '#6d28d9', ink: '#1e1633', muted: '#665f80',
    bg: '#fbfaff', soft: '#f1edfd', card: '#ffffff', border: '#e3dcf7', radius: '18px',
    head: F.jakarta, body: F.jakarta }),
  graphite: mkPack({ id: 'graphite', dark: true, accent: '#a3e635', ink: '#ecefe8', muted: '#9ba196',
    bg: '#111312', soft: '#181b19', card: '#161917', border: '#2a2f2b', radius: '6px',
    head: F.plexmono, body: F.plexsans }),
  navy: mkPack({ id: 'navy', dark: true, accent: '#fbbf24', ink: '#eef2fb', muted: '#a3b3cf',
    bg: '#0b1630', soft: '#101f40', card: '#0f1d3b', border: '#1f3160', radius: '10px',
    head: F.playfair, body: F.sourcesans }),
  emerald: mkPack({ id: 'emerald', dark: true, accent: '#34d399', ink: '#e8f5ef', muted: '#98bcad',
    bg: '#07170f', soft: '#0c2218', card: '#0b1f16', border: '#183a2b', radius: '14px',
    head: F.dmserif, body: F.figtree }),
  sunset: mkPack({ id: 'sunset', dark: false, accent: '#be123c', ink: '#2b1a14', muted: '#79605a',
    bg: '#fff7f0', soft: '#ffe9dc', card: '#ffffff', border: '#fbd9c6', radius: '22px',
    head: F.bricolage, body: F.figtree, art: '#f97316' }),
  paper: mkPack({ id: 'paper', dark: false, accent: '#14532d', ink: '#1b1b18', muted: '#615f57',
    bg: '#f7f4ec', soft: '#efe9dc', card: '#fbf9f3', border: '#ddd6c6', radius: '0px',
    head: F.newsreader, body: F.karla }),
  neon: mkPack({ id: 'neon', dark: true, accent: '#f472b6', ink: '#f5f3ff', muted: '#a9a7c5',
    bg: '#07060d', soft: '#0f0d1a', card: '#0d0b17', border: '#26213d', radius: '14px',
    head: F.unbounded, body: F.inter, art: '#22d3ee' }),
  olive: mkPack({ id: 'olive', dark: false, accent: '#4d5b1f', ink: '#23261a', muted: '#666a53',
    bg: '#f8f7ef', soft: '#eeeddd', card: '#fdfcf6', border: '#dfdcc6', radius: '6px',
    head: F.merriweather, body: F.worksans }),
  arctic: mkPack({ id: 'arctic', dark: false, accent: '#0369a1', ink: '#0c1a24', muted: '#536c7b',
    bg: '#f8fcff', soft: '#e9f5fc', card: '#ffffff', border: '#d5e9f5', radius: '16px',
    head: F.sora, body: F.sora }),
  cocoa: mkPack({ id: 'cocoa', dark: true, accent: '#e0a96d', ink: '#f6ece2', muted: '#bba896',
    bg: '#1b120d', soft: '#241811', card: '#211610', border: '#3a2a1f', radius: '4px',
    head: F.cormorant, body: F.manrope }),
  steel: mkPack({ id: 'steel', dark: false, accent: '#334155', ink: '#0f172a', muted: '#566072',
    bg: '#f6f7f9', soft: '#eceff3', card: '#ffffff', border: '#dde2e8', radius: '4px',
    head: F.archivo, body: F.plexsans, art: '#64748b' }),
  lemon: mkPack({ id: 'lemon', dark: false, accent: '#1c1917', ink: '#1c1917', muted: '#5f5a4d',
    bg: '#fffbea', soft: '#fff3b0', card: '#fffef7', border: '#f0e3a0', radius: '16px',
    head: F.epilogue, body: F.epilogue, art: '#eab308' }),
  teal: mkPack({ id: 'teal', dark: true, accent: '#2dd4bf', ink: '#e6fbf8', muted: '#93bcb6',
    bg: '#061a1d', soft: '#0a2428', card: '#092226', border: '#153b40', radius: '20px',
    head: F.outfit, body: F.nunito }),
  ink: mkPack({ id: 'ink', dark: true, accent: '#f5f5f5', ink: '#f5f5f5', muted: '#a3a3a3',
    bg: '#0a0a0a', soft: '#141414', card: '#111111', border: '#262626', radius: '0px',
    head: F.instrument, body: F.inter }),
  bubble: mkPack({ id: 'bubble', dark: false, accent: '#2563eb', ink: '#1e1b4b', muted: '#5f5d85',
    bg: '#fdfcff', soft: '#eef2ff', card: '#ffffff', border: '#dfe3fb', radius: '28px',
    head: F.quicksand, body: F.nunito, art: '#a855f7' }),
  terra: mkPack({ id: 'terra', dark: true, accent: '#fb923c', ink: '#fbeee4', muted: '#c2a898',
    bg: '#1f1310', soft: '#2a1a15', card: '#261713', border: '#43291f', radius: '12px',
    head: F.fraunces, body: F.worksans }),
}

export const fontLinks = (p) => {
  const fams = [...new Set([p.head.q, p.body.q])]
  return `<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fams.map((f) => `family=${f}`).join('&')}&display=swap" />`
}

// The colour decorative artwork is painted in, and the text colour that sits
// on a solid accent fill (a light accent on a dark pack needs dark text).
export const art = (p) => p.art || p.accent
export const onAccent = (p) => (p.dark ? '#0c0c14' : '#fff')

// The standard decorative fill, for surfaces whose own background rule would
// otherwise win over .visual (a bento tile, a dashboard panel).
export const artFill = (p, angle = 135) =>
  `linear-gradient(${angle}deg, ${art(p)}29, ${art(p)}b8), ${heroPattern(p)}`

// Decorative CSS-only background pattern for heroes/visuals — varies with pack.
export const heroPattern = (p) =>
  p.dark
    ? `radial-gradient(900px 420px at 85% -10%, ${art(p)}33, transparent 60%), radial-gradient(600px 320px at -10% 110%, ${art(p)}22, transparent 60%)`
    : `radial-gradient(900px 420px at 88% -20%, ${art(p)}1f, transparent 55%), radial-gradient(620px 320px at -8% 115%, ${art(p)}14, transparent 60%)`

// ---------------------------------------------------------------------------
// Shared component stylesheet, driven entirely by pack tokens.
// ---------------------------------------------------------------------------
export function baseCss(p) {
  return `
  :root { --accent:${p.accent}; --accent-soft:${p.accentSoft}; --ink:${p.ink}; --muted:${p.muted};
    --bg:${p.bg}; --soft:${p.soft}; --card:${p.card}; --border:${p.border}; --radius:${p.radius}; }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  html, body { overflow-x: hidden; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:${p.body.fam};
    line-height:1.65; font-size:16.5px; }
  h1,h2,h3,h4 { font-family:${p.head.fam}; line-height:1.12; margin:0 0 14px; letter-spacing:-0.015em; }
  img { max-width:100%; height:auto; display:block; }
  a { color:inherit; text-decoration:none; }
  .container { width:100%; max-width:1120px; margin:0 auto; padding:0 24px; }
  .narrow { max-width:780px; }
  section { padding:92px 0; }
  .soft { background:var(--soft); }
  .eyebrow { display:inline-block; font-size:12.5px; font-weight:700; letter-spacing:0.12em;
    text-transform:uppercase; color:var(--accent); margin:0 0 12px; font-family:${p.body.fam}; }
  h2 { font-size:clamp(27px,3.8vw,40px); }
  .lead { font-size:18px; color:var(--muted); max-width:640px; margin:0 0 42px; }
  .btn { display:inline-block; background:var(--accent); color:${p.dark ? '#0c0c14' : '#fff'};
    padding:14px 28px; border-radius:calc(var(--radius)/1.2 + 6px); font-weight:600; font-size:15.5px;
    border:1.5px solid var(--accent); transition:transform .15s, filter .15s; }
  .btn:hover { filter:brightness(1.1); transform:translateY(-1px); }
  .btn-ghost { background:transparent; color:var(--ink); border-color:var(--border); }
  .btn-ghost:hover { border-color:var(--ink); filter:none; }
  .chip { display:inline-block; background:var(--accent-soft); color:var(--accent);
    border:1px solid ${p.dark ? p.accent + '44' : p.accent + '33'}; font-size:13px; font-weight:600;
    padding:5px 14px; border-radius:999px; }
  header.site { position:sticky; top:0; z-index:20; background:${p.dark ? 'rgba(10,12,22,0.82)' : 'rgba(255,255,255,0.86)'};
    backdrop-filter:blur(12px); border-bottom:1px solid var(--border); }
  .nav { display:flex; align-items:center; justify-content:space-between; height:64px; gap:16px; position:relative; }
  .brand { font-weight:800; font-size:19px; font-family:${p.head.fam}; }
  .brand b { color:var(--accent); }
  .nav-toggle { display:none; }
  .nav-burger { display:none; flex-direction:column; gap:5px; cursor:pointer; padding:8px; }
  .nav-burger span { width:22px; height:2px; background:var(--ink); border-radius:2px; }
  .nav-links { display:flex; align-items:center; gap:26px; }
  .nav-links a { color:var(--muted); font-weight:500; font-size:15px; }
  .nav-links a:hover { color:var(--ink); }
  .nav-links .btn { color:${p.dark ? '#0c0c14' : '#fff'}; padding:10px 20px; }
  .grid-2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:26px; }
  .grid-3 { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:22px; }
  .grid-4 { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:18px; }
  .grid-1 { display:grid; grid-template-columns:minmax(0,1fr); gap:16px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
    padding:28px; transition:transform .15s, box-shadow .15s; }
  .card:hover { transform:translateY(-3px); box-shadow:0 12px 30px ${p.dark ? 'rgba(0,0,0,0.45)' : 'rgba(20,20,43,0.08)'}; }
  .card h3 { font-size:19px; margin-bottom:8px; }
  .card p { margin:0; color:var(--muted); font-size:15px; }
  .dot { width:44px; height:44px; border-radius:12px; background:var(--accent-soft); color:var(--accent);
    display:grid; place-items:center; font-size:21px; margin-bottom:16px; }
  .stats { display:flex; flex-wrap:wrap; gap:46px; padding-top:30px; border-top:1px solid var(--border); }
  .stats b { display:block; font-size:28px; font-family:${p.head.fam}; }
  .stats span { color:var(--muted); font-size:14px; }
  .visual { border-radius:var(--radius); background:linear-gradient(135deg, ${art(p)}29, ${art(p)}b8), ${heroPattern(p)}; }
  .tl { list-style:none; margin:0; padding:0; position:relative; }
  .tl::before { content:''; position:absolute; left:7px; top:6px; bottom:6px; width:2px; background:var(--border); }
  .tl li { position:relative; padding:0 0 34px 36px; }
  .tl li::before { content:''; position:absolute; left:0; top:7px; width:16px; height:16px; border-radius:50%;
    background:var(--bg); border:3px solid var(--accent); }
  .tl .when { font-size:13px; font-weight:700; color:var(--accent); letter-spacing:0.06em; text-transform:uppercase; }
  .tl h3 { margin:6px 0 2px; font-size:19px; }
  .tl .org { color:var(--muted); font-weight:600; font-size:14.5px; margin-bottom:6px; }
  .tl p { margin:0; color:var(--muted); font-size:15px; }
  .bar { height:8px; border-radius:999px; background:var(--soft); overflow:hidden; margin:7px 0 16px; border:1px solid var(--border); }
  .bar i { display:block; height:100%; background:var(--accent); border-radius:999px; }
  .faq details { border:1px solid var(--border); border-radius:var(--radius); background:var(--card);
    padding:18px 22px; margin-bottom:12px; }
  .faq summary { font-weight:600; cursor:pointer; font-size:16px; }
  .faq p { color:var(--muted); margin:12px 0 0; }
  footer.site { background:${p.dark ? '#07080f' : '#14141d'}; color:#b9b9c4; padding:62px 0 0; font-size:14px; }
  .f-grid { display:grid; grid-template-columns:2fr 1fr 1fr; gap:40px; padding-bottom:44px; }
  .f-grid h4 { color:#fff; font-size:15px; margin-bottom:14px; }
  .f-grid a { display:block; margin-bottom:10px; color:#b9b9c4; }
  .f-grid a:hover { color:#fff; }
  .f-brand { color:#fff; font-weight:800; font-size:18px; margin:0 0 12px; font-family:${p.head.fam}; }
  .f-bottom { border-top:1px solid rgba(255,255,255,0.12); padding:20px 0; display:flex;
    justify-content:space-between; flex-wrap:wrap; gap:8px; }
  @media (max-width: 768px) {
    section { padding:60px 0; }
    .nav-burger { display:flex; }
    .nav-links { position:absolute; top:64px; left:0; right:0; flex-direction:column;
      align-items:flex-start; gap:0; background:${p.dark ? '#0d1020' : '#fff'};
      border-bottom:1px solid var(--border); max-height:0; overflow:hidden; transition:max-height .25s ease; }
    .nav-links a { width:100%; padding:14px 24px; }
    .nav-links .btn { margin:8px 24px 16px; width:auto; }
    .nav-toggle:checked ~ .nav-links { max-height:420px; }
    .f-grid { grid-template-columns:1fr; gap:28px; }
    .stats { gap:26px; }
  }`
}

// ---------------------------------------------------------------------------
// Blocks — each returns an HTML string. `t` = escaped site title.
// ---------------------------------------------------------------------------
export const navbar = (t, links, cta) => `
<header class="site"><div class="container nav">
  <span class="brand">${t}<b>.</b></span>
  <input id="nav-t" class="nav-toggle" type="checkbox" aria-label="Open menu" />
  <label class="nav-burger" for="nav-t" aria-hidden="true"><span></span><span></span><span></span></label>
  <nav class="nav-links">
    ${links.map(([href, label]) => `<a href="${href}">${label}</a>`).join('\n    ')}
    ${cta ? `<a class="btn" href="${cta[0]}">${cta[1]}</a>` : ''}
  </nav>
</div></header>`

export const footerCols = (t, links, blurb) => `
<footer class="site"><div class="container">
  <div class="f-grid">
    <div><p class="f-brand">${t}</p><p style="margin:0;max-width:320px;">${blurb}</p></div>
    <div><h4>Site</h4>${links.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}</div>
    <div><h4>Elsewhere</h4><a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a><a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a><a href="https://x.com" target="_blank" rel="noopener noreferrer">X / Twitter</a></div>
  </div>
  <div class="f-bottom"><span>© 2026 ${t}. All rights reserved.</span><span>Built with care.</span></div>
</div></footer>`

export const sectionHead = (eyebrow, title, lead) => `
  <p class="eyebrow">${eyebrow}</p>
  <h2>${title}</h2>
  ${lead ? `<p class="lead">${lead}</p>` : ''}`

export const cardGrid = (cols, items) => `
<div class="grid-${cols}">
  ${items.map((i) => `<div class="card">${i.icon ? `<div class="dot">${i.icon}</div>` : ''}<h3>${i.h}</h3><p>${i.p}</p></div>`).join('\n  ')}
</div>`

export const heroCentered = (t, opts) => `
<section style="padding:108px 0 88px; background:${opts.pattern}; text-align:center;">
  <div class="container narrow">
    <span class="chip">${opts.badge}</span>
    <h1 style="font-size:clamp(38px,6.4vw,64px); margin-top:22px;">${opts.title}</h1>
    <p class="lead" style="margin:0 auto 34px;">${opts.sub}</p>
    <div style="display:flex; gap:14px; justify-content:center; flex-wrap:wrap;">
      <a class="btn" href="${opts.cta[0]}">${opts.cta[1]}</a>
      ${opts.cta2 ? `<a class="btn btn-ghost" href="${opts.cta2[0]}">${opts.cta2[1]}</a>` : ''}
    </div>
  </div>
</section>`

export const heroSplit = (t, opts) => `
<section style="padding:96px 0 84px; background:${opts.pattern};">
  <div class="container" style="display:grid; grid-template-columns:1.1fr 0.9fr; gap:56px; align-items:center;">
    <div>
      <span class="chip">${opts.badge}</span>
      <h1 style="font-size:clamp(36px,5.6vw,58px); margin-top:22px;">${opts.title}</h1>
      <p class="lead" style="margin-bottom:32px;">${opts.sub}</p>
      <div style="display:flex; gap:14px; flex-wrap:wrap;">
        <a class="btn" href="${opts.cta[0]}">${opts.cta[1]}</a>
        ${opts.cta2 ? `<a class="btn btn-ghost" href="${opts.cta2[0]}">${opts.cta2[1]}</a>` : ''}
      </div>
    </div>
    <div class="visual" style="aspect-ratio:4/3;" role="img" aria-label="Decorative visual"></div>
  </div>
</section>
<style>@media (max-width:768px){ section .container[style*="grid-template-columns:1.1fr"] { grid-template-columns:1fr !important; } }</style>`

export const statRow = (stats) => `
<div class="container"><div class="stats" style="margin-top:-22px; margin-bottom:60px;">
  ${stats.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('')}
</div></div>`

export const ctaBand = (title, sub, cta) => `
<section id="contact">
  <div class="container">
    <div class="card" style="text-align:center; padding:clamp(30px,5vw,58px);">
      <h2>${title}</h2>
      <p class="lead" style="margin:0 auto 28px;">${sub}</p>
      <a class="btn" href="${cta[0]}">${cta[1]}</a>
    </div>
  </div>
</section>`

// Square-ish gallery tiles from gradients — masonry feel via aspect ratios.
export const gallery = (p, n, label) => {
  const ratios = ['1/1', '4/5', '3/4', '1/1', '4/3', '1/1', '3/4', '4/5', '1/1']
  const tiles = Array.from({ length: n }, (_, i) => {
    const ang = 100 + i * 40
    return `<div class="visual" style="aspect-ratio:${ratios[i % ratios.length]}; background:linear-gradient(${ang}deg, ${p.accent}${i % 2 ? '2e' : '55'}, ${p.accent}${i % 3 ? 'a8' : '70'}), ${heroPattern(p)};" role="img" aria-label="${label} ${i + 1}"></div>`
  }).join('\n  ')
  return `<div style="columns:3 240px; column-gap:18px;">${tiles.replaceAll('<div class="visual"', '<div style="break-inside:avoid; margin-bottom:18px;"><div class="visual"').replaceAll('></div>', '></div></div>')}</div>`
}

// `extraCss` lets one family ship its own layout without putting that weight on
// the other 199 templates.
export const doc = (p, t, title, body, extraCss = '') => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
${fontLinks(p)}
<style>${baseCss(p)}${extraCss}</style>
</head>
<body>
${body}
</body>
</html>`
