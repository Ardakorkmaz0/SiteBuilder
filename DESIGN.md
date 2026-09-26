# Design: Sitebuilder

The locked design system for every Sitebuilder screen **except the editor**
(`/editor/:id` and `/code`). Every change to those screens reads this file
first; when a screen needs something this file does not allow, amend this
file, do not override it locally.

Implementation: `frontend/src/ui/app-surface.css`, applied under
`<html data-surface="app">` (set by `frontend/src/ui/surface.js`). The editor
keeps the studio theme in `frontend/src/index.css` untouched.

Direction chosen by the owner on 2026-09-26: a calm, technical production tool;
the logo's indigo as the one brand colour; the editor left out of scope.

```
Dial: ENERGY 1 / RHYTHM 2 / MOTION 1
Reading this as: a web app for people building their own sites, in a
restrained technical language, calm, with a few deliberate breaks.
```

## Genre

modern-minimal (Hallmark). Sans throughout, one restrained accent, flat
surfaces on hairline rules.

## Screen families

- **Front door** (login, register, password reset, review link, 404):
  Split Studio. The form on one side, real proof on the other: the first
  sites of the public feed (pinned first), each opening the live site. No
  drawn product mock-ups. The 404 keeps its Spider-Verse print effect and
  palette: the owner asked for it by name.
- **App** (home, community, favorites, search, profile, settings, admin):
  home is an Ecosystem Index (your latest project, then the public feed by
  category); lists of sites are a Portfolio Grid.
- **Viewer** (site preview top bar, public profile): chrome only; the site
  inside `[data-public-site-canvas]` is never styled by this system.

## Theme

One brand colour. Neutrals do the rest.

| Token | Light | Dark | Why |
|---|---|---|---|
| `--studio-accent-fill` | `#2e2b6c` | `#5550d6` | The logo's indigo. The dark value is lifted so white text on it still passes (5.99:1). |
| `--studio-accent-text` | `#2e2b6c` | `#aeabff` | Links and accent text; 11.68:1 and 9.42:1 on the page. |
| `--studio-accent-soft` | `#ecebf6` | `#1b1a38` | Quiet backgrounds for accent-coloured controls. |
| `--studio-shell` / `--studio-panel` | `#f5f6f8` | `#0b0b0e` | The page. Dark is lifted off `#000` so raised surfaces read by lightness. |
| `--studio-panel-raised` | `#ffffff` | `#131317` | Cards, fields, dialogs. |
| `--studio-control` / `-hover` | `#eceef2` / `#e3e6eb` | `#19191e` / `#222228` | Wells and hover. |
| `--studio-border` / `-strong` | `#dde1e7` / `#c3c9d2` | `#2c2c33` / `#45454e` | Hairlines; strong for field edges. |
| `--studio-text` | `#14151a` | `#f4f4f6` | |
| `--studio-text-muted` | `#555b69` | `#a9abb3` | 6.29:1 and 8.09:1 on their surfaces. |
| `--studio-text-faint` | `#5f6573` | `#93959d` | Still passes AA on hovered controls (4.67:1, 5.29:1). |

Status colours (danger, success, warning, info) are semantic and come from
the studio palette; they mark real state only.

Where the accent may appear: the primary action on a screen, focus, text
links, and the selection frame. Where you are (active nav item, active tab,
selected filter) is shown in ink, not in the accent.

## Typography

- Display (h1 to h3): **Instrument Sans** 500 to 700, tracking `-0.01em`.
  A compact grotesk: long Turkish words fit a heading line, and titles get a
  voice of their own without a second loud style.
- Interface text: **Inter** 400 to 700. Legible at the 12 to 14px sizes a
  tool lives on, with aligned figures (`tabular-nums` on numbers).
- Headings are always roman, never italic. No uppercase labels with wide
  tracking; labels are sentence case at reading size.
- Both faces are loaded from Google Fonts with the Latin Extended subset
  (Turkish glyphs verified).

## Shape and depth

- Radii: controls 8px, cards 12px, dialogs 16px. Round only for avatars and
  status chips.
- Cards sit flat on a 1px rule. Shadow is for what floats over the page:
  menus and dialogs.
- Blur: only the sticky header (content scrolls under it) and dialog
  backdrops.

## Identity motif

The editor's selection frame: a square hairline in the accent with four
corner handles. It appears on hover (fine pointers) and keyboard focus of
things that are yours to open and change (the latest project on home, your
project cards on the profile), and nowhere else. It ties every screen to the
act of editing. Class: `.sb-frame`.

## Motion

MOTION 1: hover and focus states only. No page entrance, no card stagger, no
scroll reveals, no endless loops (loading placeholders are static). A few
state transitions stay because they explain the change: menus opening, the
create wizard moving between steps. Easing: `--studio-motion-ease`, never the
browser default `ease`. `prefers-reduced-motion` turns the rest off.

## Microinteractions

- Silent success; toasts only for things you cannot see happen.
- Hover changes one thing (a border or a background), never lift plus shadow
  plus scale.
- Focus rings show instantly and are never animated.

## CTA voice

- Primary: solid accent fill, 8px radius, no shadow, no gradient. One per
  screen.
- Secondary: raised surface with a strong hairline.
- Destructive and approve actions in admin: outlined in the status colour.
- Arrows only where the action moves you somewhere: "Continue editing", the
  wizard's "Next", the "View" link on a site card.

## Content rules

- Numbers shown are real (site counts, views, favourites from the API) or
  not shown. Loading shows `…`.
- No em dash in interface text.
- No emoji as icons. Icons come from `components/icons.jsx` and must name
  their content; a generic sparkle does not.

## What screens must share

The wordmark and logo mark, the accent and where it goes, both typefaces,
the CTA voice, the radii, the figures style for numbers (`.dashboard-figure`).

## What screens may differ on

The layout within their family, the density of a list, whether a screen
has a proof column.

## Exports

### tokens.css (light; dark in `app-surface.css`)

```css
:root[data-surface="app"] {
  --font-display: "Instrument Sans", "Inter", "Segoe UI", system-ui, sans-serif;
  --font-ui: "Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
  --studio-accent-fill: #2e2b6c;
  --studio-accent-fill-hover: #3b388a;
  --studio-accent-text: #2e2b6c;
  --studio-accent-soft: #ecebf6;
  --studio-on-accent: #ffffff;
  --studio-shell: #f5f6f8;
  --studio-panel-raised: #ffffff;
  --studio-control: #eceef2;
  --studio-border: #dde1e7;
  --studio-border-strong: #c3c9d2;
  --studio-text: #14151a;
  --studio-text-muted: #555b69;
  --studio-text-faint: #5f6573;
  --studio-radius: 8px;
  --studio-radius-lg: 12px;
  --studio-radius-2xl: 16px;
}
```
