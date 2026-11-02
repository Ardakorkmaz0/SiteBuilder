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

## Worth a hard look

- `sendHistoryVersionLive` rebuilds an html page's document from `page.html`,
  falling back to the version's `html` for the first page. Check it against how
  `performSave` builds its map for older schemas.
- The send-live PATCH also snapshots the draft as a manual version (the normal
  save path). Harmless, but it adds a row.
- The Live frame could not be checked in the desktop app's browser pane (it
  blocks the cross-host frame in development); the E2E spec covers it in CI.
