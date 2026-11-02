# Draft and live are apart (2026-11-02)

Handoff from Claude to ChatGPT for review. The owner asked for: a Draft / Live
switch at the top of the editor, sending the draft live, and sending a saved
version live.

## What changed in behaviour

Before: every save of a published site, auto-saves included, sent
`published_pages` and rewrote what visitors get. Loading a history version of a
published site re-rendered the live pages too.

Now:

- A save changes the draft only. `performSave` sends `published_pages` only when
  `goLive` is set (`EditorPage.jsx`).
- Publishing an unpublished site, and the new header button "Send draft live",
  call `save(true, { goLive: true })`.
- Loading a version (History → Load) changes the draft only. The block that
  re-published after a load is gone.
- History → "Send live" (only while published) sends one saved version live and
  leaves the draft alone: `getVersionContent` → `publishedPagesFor` → PATCH with
  `live_from_version` (`sendHistoryVersionLive`).
- Header switch "Draft / Live" (only while published). Live shows
  `LiveVersionView.jsx`: the live `/s/<slug>/` page in a sandboxed frame, "Back to
  draft" and "Copy live to draft" (`POST /sites/<id>/live-to-draft/`, which keeps
  the draft in History as "before copying live").
- "Save mine anyway" after a 409 keeps a refused go-live (`useSiteConflict`
  `goLiveRef`, sticky like the publish choice, cleared by `resolve`).

## Backend

- `Site.live_schema`, `live_html`, `live_at` (migration 0028; its data step makes
  the current content of published sites their live version).
  `Site.live_content()` falls back to the draft while there is no live copy.
- `SiteSerializer.update`: pages present → `_go_live` copies the draft, or the
  version named by `live_from_version` (must belong to this site), into live and
  adds a `SiteVersion` with source `publish`. Fields `live_at`, `live_differs`.
- `PublicSiteSerializer` returns live content; the review link
  (`context['draft']`) returns the draft. `site_meta.share_image` reads live.
- Clone: another person's site copies live, your own copies the draft.
- `GET /sites/<id>/versions/<vid>/content/` (owner only).
- `published.py`: `/s/` responses now carry `frame-ancestors 'self' <FRONTEND_URL
  origin>` and are exempt from `X-Frame-Options: DENY`, so the editor can frame
  them. The CSP sandbox is unchanged (no `allow-same-origin`).

## Tests

- `backend/builder/test_live_version.py` (11), `test_published_pages.py`
  (frame-ancestors).
- `EditorPage.publishedHistory.test.jsx` rewritten for the new rules (8 cases),
  `useEditorSave.test.jsx`, `useSiteConflict.test.jsx`,
  `HistoryPanel.rowTitles.test.jsx`.
- `e2e/published-history.spec.js` rewritten: load keeps live, the Live switch
  frames the live page, "Send draft live" replaces the pages.
- Mutations checked: sending pages on every save, the header button without
  `goLive`, first publish without `goLive`, the frame header — each turned a test
  red.

## Later addition: a Live tab in History

`groupSiteVersions` returns `liveSaves` (source `publish`), shown on their own tab
and no longer among the recovery points. `SiteVersion._prune` caps them apart
(`MAX_LIVE_VERSIONS_PER_SITE`, 30), since they used to share the manual cap and a
run of saves could evict them. The five tabs sit on two rows.

## Later addition: each file goes live on its own

The owner asked for per-file publishing, Ctrl+Z on it, coloured files and a
right-click menu. All of the server logic is in `backend/builder/live_pages.py`.

- `PublishedPage.page_id` and `fingerprint` say which draft page a row came from
  and how it looked. `statuses()` compares fingerprints: `page_live` is
  `{id: 'live' | 'older'}`, no entry means not live. The fingerprint covers the
  page, everything in the schema but `pages` (a theme change turns every file
  blue) and, for the home page, `site.html`.
- `live_schema` now holds only pages that are live. The public API and clones read
  it, so a page never sent or hidden cannot be read from outside. This is the part
  most worth attacking.
- `Site.private_pages` ("Do not show in public"): a whole-site send leaves them
  out, older clients included. Not in the schema on purpose: undoing an edit or
  loading a version must not undo the choice. The home page cannot be hidden.
- `LiveSnapshot` holds what each live change replaced (last 10 per site). Restoring
  one stores the reverse, so `POST live-undo` is both undo and redo. A page-scoped
  restore merges, so it cannot disturb a page sent since from another tab.
- `POST page-live`, `page-visibility`, `live-undo`. They bump `revision`: another
  tab must not save a stale `published` over them. The editor follows the bump only
  when it is exactly +1, so a save by someone else still gives a 409.
- Editor: `undoStep` / `redoStep` in `EditorPage.jsx` pick the newest step across
  the store, the HTML stack and the live stack by stamp.
  `utils/pageLiveStates.js` turns unsaved edits blue. Menu: `PageFilesPanel.jsx`.
- Migration 0029 names existing rows (`align_rows`): same page order, skipping
  pages that did not render. When the counts disagree only the home row is named,
  and the site falls back to the old whole-version comparison.

Known corners, left as they are:

- Moving another page into first place and sending only it: the old home row keeps
  the address `''`, so the new one gets a suffix until the whole site is sent.
- A link to a page that is not live gives visitors a 404.
- A theme change sent with one page reaches `live_schema` for all pages, so the
  in-app viewer shows it on pages whose `/s/` document is older. Those show blue.
- Unpublishing from the header is not an undo step.

## Later fix: taking a site offline ends its live version

The browser sweep (`docs/QA-SWEEP-2026-11-03.md`) found hidden or offline pages coming back. Now:

- `forget_live_version` runs when a site goes offline, by the owner or a moderator (and on reinstating
  a blocked site): rows, `live_schema`, `live_html`, `live_at` and every `LiveSnapshot` go. History keeps
  the copies. Migration 0030 does the same for sites already offline. A save of a site that is already
  offline does not run it, so undoing the first send can still be redone.
- `restore_snapshot` no longer restores `private_pages` wholesale: a page-scoped snapshot moves only its
  own page's mark, and a whole-site one moves none and leaves out pages hidden since.
- The editor's `live-undo` sends `base_revision`, so a tab that is behind gets the 409 dialog.
- "Save mine anyway" leaves `published` out unless the refused save was an explicit choice.

## Worth a hard look

- `sendHistoryVersionLive` rebuilds an html page's document from `page.html`,
  falling back to the version's `html` for the first page. Check it against how
  `performSave` builds its map for older schemas.
- The send-live PATCH also snapshots the draft as a manual version (the normal
  save path). Harmless, but it adds a row.
- The Live frame could not be checked in the desktop app's browser pane (it
  blocks the cross-host frame in development); the E2E spec covers it in CI.
