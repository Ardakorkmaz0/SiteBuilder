# Source draft recovery hardening — 19 October 2026

This round starts from `2ca96ee`. The last deployed commit remains `8b9e1f0`;
there is no deployment instruction for the changes in this report.

Later deployment note: after this report, the owner explicitly requested deployment.
Commit `c87bf56` was deployed after the `tests` workflow
[39168843573](https://github.com/Ardakorkmaz0/SiteBuilder/actions/runs/39168843573)
passed. The live server commit and `assets/index-D5wpNc1N.js` bundle were verified.
The opening paragraph records the situation when this report was first written;
it is not the current deployment status. Round 2 changes are not included in that
deployment.

## Reproduced source ownership failures

CI run [39041682089](https://github.com/Ardakorkmaz0/SiteBuilder/actions/runs/39041682089)
failed its first attempt on 17 October: the existing recovery test expected an
unapplied HTML source draft after Restore, but received the generated server
design. The same commit passed attempt 2 later on 17 October. Neither a passing
rerun nor a local Node 20 run rules out an intermittent race.

The old CodePanel acknowledged every mount without identifying a consumed
draft. A panel mounted without a recovery seed could send its passive callback
after Restore assigned a new seed, but before the replacement keyed panel
read that seed. EditorPage unconditionally cleared the pending reference.
A real Page regression forces Restore between the real panel's commit and
passive effects. This proves a legal callback ordering can lose a draft; it
does not establish the exact scheduler trace of the original CI failure.

Adjacent testing found a second ownership failure: the phone preview branch
unmounts desktop authoring tools. An unapplied component Source draft lived
only in the CodePanel, so desktop → phone → desktop discarded it. A source
recovery restored while already in phone preview had the opposite problem:
its seed waited for a panel that never mounted. A successful canvas save
looked only at the absent panel and erased the recovery record. Session-expiry
capture also omitted pending component source while the panel was absent.

EditorPage now owns component Source drafts through a controlled CodePanel.
The event handler updates both state and a synchronous reference, so save,
recovery, leave and history operations see the same draft even when the panel
is absent. This removes the mount acknowledgement protocol entirely.
Component source remains separate from the component design until Apply.

Effective pending drafts are compared with the current generated files and
HTML documents. A canvas Undo can make generated content match a source draft;
such a match must not keep a false unsaved indicator or recovery record alive.
The existing `EditorPage.recovery.test.jsx` assertions and timeouts remain
unchanged.

An in-flight save can also leave a History Load waiting in the save queue.
If the source panel unmounts for phone preview meanwhile, the history
checkpoint now applies the editor-owned pending source before saving it.
Previously that checkpoint saved only the component design and then loaded
the selected version, losing the unapplied source. The regression checks the
second save's HTML before allowing the restore to count as successful.

## Live HTML before phone preview

The same responsive unmount discarded HTML-page source edits and live iframe
typing that had not reached its dirty debounce. Both failed in real EditorPage
tests with the original production sources.

The media-query hook now accepts a synchronous handoff before notifying React.
EditorPage reads the live workspace through its existing `liveHtmlMap` and
`commitHtml` path before the authoring surface disappears. This records the
normal Undo step rather than creating a separate document history. No editor
tree is kept hidden in the phone preview.

Both the phone and narrow-screen subscriptions use this handoff and check the
current phone query. A test first changes both query snapshots, then delivers
the narrow event before the phone event in separate React commits. Handling
only the phone notification failed both HTML tests under that ordering. The
source test also verifies desktop re-entry and Undo/Redo. The iframe test
changes the actual document before its dirty debounce fires. Hook tests cover
handoff-before-notification, callback replacement and listener cleanup.

## Test inventory

| New coverage | Tests |
| --- | ---: |
| Controlled component Source panel | 5 |
| Real Page mount/recovery ordering | 1 |
| Component Source across phone preview, save, expiry, Undo and queued History | 5 |
| HTML source and live iframe handoff | 2 |
| Shared effective pending-source policy | 3 |
| Media-query handoff ordering and cleanup | 2 |
| **Total new Vitest tests** | **18** |

The original acknowledgement-only tests were replaced when editor ownership
removed that protocol. There is no unused seed acknowledgement API in the
final production code.

The final five controlled CodePanel tests and two media-query tests failed
against clean HEAD production sources in an isolated copy: seven assertion
failures, with no missing-module or collection failure. The original Page
race, three initial component-breakpoint cases, two HTML-breakpoint cases and
queued-history case were also reproduced red before their fixes. The helper
tests and real Page Undo guard were verified by mutations of the final code.

Useful author evidence includes `/tmp/sitebuilder-source-owner-final-target.log`,
`/tmp/sitebuilder-source-owner-final-contracts-red.log`,
`/tmp/sitebuilder-source-breakpoint-red.log`,
`/tmp/sitebuilder-html-breakpoint-audit-red.log`,
`/tmp/sitebuilder-html-narrow-first-red.log` and
`/tmp/sitebuilder-source-phone-history-red.log`.

## Review handoff

Independent Codex review checked the production changes and verified the
regressions with mutations. Claude CLI is unavailable in this environment;
this is not Claude approval. Claude should inspect component source ownership
in `components/editor/CodePanel.jsx` and `pages/EditorPage.jsx`, with
`CodePanel.drafts.test.jsx`, `EditorPage.recoveryRace.test.jsx` and
`EditorPage.sourceBreakpoint.test.jsx`. Also inspect
`utils/componentSourceDrafts.js`, `utils/useMediaQuery.js` and
`EditorPage.htmlBreakpoint.test.jsx` for the shared pending policy, queued
history checkpoint and responsive handoff.

Two independent reviewers ran isolated Node 20 suites: 35 tests covering
breakpoint/recovery/history/detached saves/site switching, and 30 tests
including two additional temporary StrictMode owner probes. No blocking
finding remained. Mutations caught each of these production regressions:

- Reading pending drafts from the absent panel instead of the editor owner.
- Failing to synchronously update the owner reference on an input event.
- Clearing recovery after a completed phone-mode save with pending source.
- Omitting HTML handoff, or binding it only to the phone query.
- Omitting source application before an offscreen history checkpoint.
- Keeping raw drafts dirty after generated content becomes equal.
- Failing to clear an applied file, or breaking standalone CodePanel state.

These mutation checks ran only in temporary copies. They did not replace the
author's changes or weaken existing tests. Review logs include
`/tmp/sitebuilder-source-owner-review-{green,unmounted-mutation,apply-mutation,effective-mutation,local-mutation}.log`.

## Final local validation

| Check | Result |
| --- | --- |
| Full frontend suite | 263 files, 2,414 passed; 94.22 seconds |
| Full backend suite | 817 passed; 147.97 seconds |
| Frontend lint | Passed, no warnings |
| Production build | Passed |
| `git diff --check` | Clean |

The final frontend run used Node 20.20.2, matching the CI major version:
`PATH=/tmp/node-v20.20.2-linux-x64/bin:$PATH npm run test:run -- --maxWorkers=4`.
The backend used `.venv-linux/bin/python -m pytest -q`. Existing large-chunk
and backend staticfiles warnings remain. The full frontend suite was rerun
after the ownership and HTML handoff changes; backend sources did not change.

Logs: `/tmp/sitebuilder-{vitest,lint,build}-final-2026-10-19.log` and
`/tmp/sitebuilder-backend-2026-10-19.log`. The pushed commit's exact-HEAD CI
result is recorded in the delivery message. No deployment is part of this
test round.

No backend endpoint, model, migration or API contract changes in this round.
No local browser or end-to-end spec was added. No development server was
started and no production data was used.
