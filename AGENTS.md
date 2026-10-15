# AGENTS.md

## Must-follow constraints

- Talk to the owner in Turkish. Code, comments and commit messages are in English.
- Two agents (Claude Code and ChatGPT/Codex) work in this same folder. Run `git status`
  before you start: changes you did not make may be another agent's work in progress.
  Never commit, revert, stash or delete them without asking the owner.
- `git pull` when you start. Commit and push when you stop.
- Commit straight to `master`; no branches, no PRs. One-line messages that start with
  `fix:`, `feat:`, `test:`, `chore:` or `docs:`. The owner is the author and committer
  (git config is already set). Add no `Co-Authored-By` or other agent trailer.
- The project is in a hardening phase: fix, test and polish. No new features unless the
  owner asks for one.
- Never deploy unless the owner says so ("canlıya al"). A go-ahead covers the work of that
  moment, not later commits.
- Deploy only with `bash deploy.sh`, and only when the local checks below pass and the
  GitHub Actions `tests` run for HEAD is green (`gh run list`). End-to-end tests run only
  in CI, so a green local run is not enough.
- Outside `deploy.sh` the production server is read-only: no edits, restarts or config
  changes. A Caddy config change needs the owner's OK.
- Never touch production data. Create test data locally, and delete it when you finish.
- Never read or print secrets: `.env` values, private keys under `~/.ssh`, tokens. When you
  grep a config file, filter secret lines out before printing, not after: a production
  database password once reached a tool output this way.
- Never type real passwords or API keys into forms.
- Start only the dev servers you need, stop the ones you started, and leave another
  agent's servers alone. Local ports: backend `8001`, frontend `5173`.
- On Linux the backend venv is `backend/.venv-linux` (`backend/.venv` is the Windows one).

## Validation before finishing

In `frontend/`:

- `npm run lint`
- `npm run test:run`. CI uses Node 20. On Node 26, run
  `NODE_OPTIONS=--no-experimental-webstorage npm run test:run`.
- `npm run build`

In `backend/`:

- `.venv-linux/bin/python -m pytest -q`
- If you changed a model, run `python manage.py makemigrations` and commit the migration.
  `python manage.py makemigrations --check --dry-run` must then report no changes; CI
  fails otherwise.

Also:

- `git diff --check`.
- If you added or changed an end-to-end spec, push it and read the CI run
  (`gh run view <id>`) before calling the work done. There are no local browsers.

## Testing

- Frontend tests sit next to the code: `foo.js` → `foo.test.js`. Editor page tests are
  split by topic: `pages/EditorPage.<topic>.test.jsx`. Stack: Vitest, jsdom and Testing
  Library; setup in `src/test/setup.js`.
- Import test globals explicitly: `import { describe, it, expect, vi } from 'vitest'`.
  Globals are enabled, but every test file imports them.
- Backend tests are `backend/builder/test_<topic>.py` (pytest-django).
- End-to-end specs are `frontend/e2e/*.spec.js` (Playwright, Chromium). Shared helpers are in
  `e2e/support.js`, and `e2e/session.setup.js` creates a fresh account for each run.

### When a change needs a test

Match the change to a layer. Most changes need exactly one.

| You changed | Write |
|---|---|
| A pure function in `frontend/src/utils/` | a unit test next to it |
| A store action in `store/editorStore.js` | a test in `store/` |
| Real logic in a hook (retries, focus, the Esc stack) | a hook test next to it |
| Editor saving, auto-save, leaving, recovery or undo | `pages/EditorPage.<topic>.test.jsx`, driving the real page with `api/sites.js` mocked |
| A Django endpoint, permission, throttle or serializer rule | `backend/builder/test_<topic>.py` |
| A model field | the migration and a backend test |
| A user-visible flow across more than one page | `frontend/e2e/<flow>.spec.js` |
| A user-visible string | its Turkish entry (see conventions) |
| Presentation only (styling, layout) | nothing; the guard tests still run in the normal suite |

Always write a test for a bug fix, at the layer where the bug lived. The test must fail
before the fix and pass after it. Prove it: set aside only the production change (for
example `git stash push <that file>`), watch the test go red, then restore the change.

For an endpoint, three cases are the minimum: an unauthenticated caller, a signed-in caller
who does not own the object, and the happy path. Assert the database row, not only the
status code: a refused write has to leave the row as it was.

### Ways a test can be worthless

- **A test that cannot fail.** Before you finish, name the change to the production code
  that your test would catch. If you cannot name one, delete the test.
- **A test whose expected values come from the code under test.** Write expected values by
  hand as literals.
- **A test whose subject is the mock.** If every dependency is stubbed, ask what is left
  that could be wrong.
- **A selector that matches nothing, or the wrong thing.** In end-to-end specs, find
  elements by role and accessible name, for example
  `getByRole('textbox', { name: 'Color', exact: true })`, never by DOM structure. Two specs
  once reached colour fields through a wrapping `<label>`. When the label was removed, CI
  stayed red for hours. When a spec intercepts requests, count what it intercepted and
  assert the count.

### Large changes get reviewed by the other agent

Whoever wrote a batch of tests, or a large change, does not sign it off. The other agent
reviews it: Claude reviews ChatGPT's work, and ChatGPT reviews Claude's. The reviewer asks
whether the tests deliver what they claim, and verifies by mutation rather than taking the
author's word. Findings go back to the author; the reviewer does not quietly rewrite. The
author treats findings as claims to check, not as instructions.

## Repo-specific conventions

Frontend:

- Every user-visible string goes through `t('English text')` from `useLanguage()`. The
  English text is the key, and `src/i18n/translations.js` holds its Turkish value.
  `i18n/translations.coverage.test.js` fails when one is missing. Turkish copy addresses the
  user formally ("siz").
- Server calls go through `src/api/*.js` (the axios client in `api/client.js`). Show a
  server error with `apiError(err)` from `utils/errors.js`. It turns the backend's `code`
  into a translated message; add a new code to `API_CODE_MESSAGES`.
- Dialogs and menus use `ui/useEscapeToClose.js` (Esc stack, focus returns to the opener)
  and `ui/useInitialDialogFocus.js`. A modal dialog keeps Tab inside itself. A button that
  shows only a symbol needs an `aria-label` (`ui/symbolButtonNames.test.js`).
- UI colours come from theme tokens such as `var(--studio-text)`, not hardcoded hex values.
  `ui/darkThemeCoverage.test.js` fails on a new hardcoded colour outside its allow-list.
- Lazy imports use `lazyChunk` from `utils/lazyChunk.js`, so a tab opened before a deploy
  can still load its chunks.
- Every editor write of a site goes through `save()` in `EditorPage.jsx`: one queue
  (`utils/saveQueue.js`). Never call `updateSite` from anywhere else. A save sends
  `base_revision`; when another tab or device saved in between, the server answers
  409 `site_changed` and the editor asks the user which version wins.

Backend:

- Refuse with `error_response(code, detail, status)` from `builder/api_errors.py`: a stable
  machine `code` and a human `detail`.
- Server code that changes a site's content must bump `site.revision`. The content fields
  are `SiteSerializer._CONTENT_FIELDS` (title, schema, html, published, published_pages,
  category, tags). Without the bump, an open editor silently overwrites the change.
- Published user sites (`/s/<slug>/`) are served with a CSP sandbox that has no
  `allow-same-origin` (`builder/published.py`). Never add it, and never run user HTML in
  the app's origin. In the frontend, no iframe gets both `allow-scripts` and
  `allow-same-origin`. Sanitize with `utils/sanitize.js`, and check a postMessage sender
  with `isPreviewMessageSource` (`utils/previewMessages.js`).
- Rate limits live in `builder/throttles.py`, upload size checks in
  `builder/upload_limits.py`.
- Multi-step writes go in `transaction.atomic()`. Where concurrent saves can race, lock rows
  with `select_for_update()`, as `SiteSerializer.update` does.

Values mirrored between frontend and backend (change both sides together):

- Guest site limit: `GUEST_SITE_LIMIT` in `backend/builder/guests.py` and
  `frontend/src/utils/useGuestGate.jsx`.
- Page addresses: `_published_path` in `backend/builder/validators.py` and
  `frontend/src/utils/pageSlug.js`.

## Important locations

- Editor: `frontend/src/pages/EditorPage.jsx`, `frontend/src/components/editor/`,
  `frontend/src/store/editorStore.js`.
- API: `backend/builder/views.py`, `serializers.py`, `models.py`, `urls.py`.
  Migrations: `backend/builder/migrations/`.
- Deploy: `deploy.sh` and `DEPLOY.md`. `deploy.sh` builds the frontend from
  `git archive HEAD`, so uncommitted work never ships.
- CI: `.github/workflows/test.yml` (lint, Vitest and build; the migration check and pytest;
  Playwright).
- Notes from one agent to the other: `docs/<TOPIC>-<YYYY-MM-DD>.md`, for example
  `docs/CLAUDE-HANDOFF-2026-10-15.md`.

## Change safety rules

- Keep API changes backward-compatible unless the owner asks otherwise. After a deploy,
  tabs still running the previous frontend keep calling the API, and `deploy.sh` keeps old
  assets for 14 days.
- A model change ships as a migration that works on existing rows (give new fields a
  default). The web container runs `migrate` when it starts.
