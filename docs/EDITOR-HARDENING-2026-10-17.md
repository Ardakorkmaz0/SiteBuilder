# Editor hardening follow-up — 17 October 2026

Baseline: `ae9493f`, already deployed before this batch. This batch has no
deployment authorization and does not change production data, models or API
contracts. Work stays on `master` with the owner's author/committer identity.

## Fixed behavior

- **Phone styles versus imported CSS.** An imported ID selector with
  `!important` could beat the editor's saved phone font and gradient. Generated
  PC and phone rules now share the first `pwb-responsive-overrides` cascade
  layer. The phone media rule follows its PC counterpart. The generated sheet
  goes before authored stylesheets while preserving early metadata, including
  the charset declaration. Stylesheet link relations are case insensitive.
  Reset still removes the generated rules and restores the PC inline value.
- **Component exports with cascade layers.** CSS collection now traverses
  layer groups, retaining matching responsive rules, their variables, fonts
  and animations. It preserves layer-order statements and empty first layer
  declarations, since their position affects the cascade. Inherited variable
  lookup excludes unrelated elements and uses the live computed value when
  available. Scoped exports and shared-block HTML retain the generated
  responsive layer.
- **History restore on an already published site.** Version snapshots contain
  schema/HTML, but public addresses serve rendered `PublishedPage` documents.
  Loading a checkpoint now rebuilds those documents through the existing save
  queue. It uses the revision returned by restore, skips local disk writes and
  does not create an extra forced manual version. A failed sync leaves the
  restored document dirty for retry; a 409 retains the local restored draft.
  Unpublished restores do not perform the extra save.
- **Wide free-container content on a narrow canvas.** Paste, copy-to-page and
  reload can narrow the outer container while retaining child coordinates.
  Edit, View and exported runtime now derive the same inner design width and
  fit the whole scene, preserving text/font geometry. Copy-to-page applies the
  destination bounds immediately. Pointer movement, keyboard movement, default
  and explicit container heights, nested fitting and resize handling have
  regression coverage. Fitted children can move left and back right without
  being trapped at the previous right edge. Their coordinates and width remain
  inside the server limits (`x <= 5000`, `w <= 2000`).
- **Nested mobile editing.** Containers and tabs share child coordinates at
  both breakpoints; region children retain independent phone coordinates.
  Keyboard nudges, batch geometry writes and Properties panel readback now use
  that same policy. Quick scaling reads the actual displayed coordinate space,
  including mixed selections and region children on flow pages. For example,
  a shared child of width 120 with a stale phone width 200 now scales to 132,
  rather than 220.
- **Palette placement inside nested fitted containers.** The previous drag
  and armed-tap calculations divided by only the target's local fit, omitting
  fitted ancestors. A local drop at `(300,60)` could be stored as `(150,30)`.
  Both paths now use `dropCoordinates`: canvas zoom is applied once, all
  positive finite ancestor fits inside the canvas are combined, and markers
  outside the canvas are excluded. Armed placement still centers the snippet
  after converting the point into the target's coordinate space.

## Regression evidence and independent review

The test-only commit `c8ebb40` added two mobile CSS E2E cases and one published
history E2E case before the production fixes. GitHub Actions run
[38962265983](https://github.com/Ardakorkmaz0/SiteBuilder/actions/runs/38962265983)
failed those three cases against the old production source: phone font stayed
40 instead of 28, the gradient retained its old final color, and the public
home page retained its newer text after a checkpoint restore. An existing
workflow test retried successfully in that run; it is separate from the three
reproduced regressions. E2E runs only in CI; no local browser was started.

New frontend tests in this batch:

| Area | Tests |
| --- | ---: |
| Free-container UI, helper and store geometry | 31 |
| Nested mobile keyboard coordinates | 5 |
| Properties panel coordinate spaces | 7 |
| Published history restore | 5 |
| Override layer, metadata and stylesheet relations | 7 |
| Responsive component exports and layer scope/order | 4 |
| Nested palette drag/tap placement and coordinate helper | 14 |
| **Total Vitest additions** | **73** |

The focused regression runs were red before the relevant fixes; neighboring
guards remained green. Independent Codex reviewers also used isolated source
mutations rather than changing shared production files:

- Restoring the old container height policy, right-edge clamp, immediate-copy
  behavior or nested mobile key selection breaks the corresponding tests.
- Removing the fitted width cap breaks both single and batch resize tests.
- Restoring the old Properties panel breaks four cases; three neighboring
  coordinate-space guards still pass.
- Dropping an empty first layer breaks the order test; reverting variable
  collection breaks the inherited-color case. Prepending the generated sheet
  before metadata breaks four charset tests.
- Skipping published-document synchronization breaks four restore tests;
  enabling disk writes or clearing the dirty retry barrier breaks separate
  cases. Additional isolated queue/detached-editor probes passed.
- The nested placement EditorPage cases ran against the old handlers first:
  four regressions failed and two single-fit controls passed. They cover
  native and HTML drops, 50 percent canvas zoom and real Sidebar Solid-snippet
  selection followed by a tap. These tests drive the real page/canvas/store;
  drag cases capture the DndContext callback boundary and provide client
  rectangles because jsdom has no drag sensor or layout engine. Eight helper
  tests cover ancestor boundaries, plain wrappers and invalid scale values.
  A fresh independent 14-test run passed. Isolated mutations then broke 11
  tests when ancestor fits were skipped, nine when zoom was doubled, one
  when the old tap handler was restored and three with the old drag handler.

Claude CLI is unavailable. These independent Codex checks are not Claude
approval. Claude should review the changes and tests in:

- `frontend/src/utils/{htmlElementEdit,componentExport,containerFit}.js`
- `frontend/src/components/renderer/{ContainerCanvas,Renderer}.jsx`
- `frontend/src/components/editor/{FlowCanvasItem,PropertiesPanel}.jsx`
- `frontend/src/store/editorStore.js`
- `frontend/src/pages/EditorPage.jsx`
- `frontend/src/utils/{schemaToFiles,htmlRuntime}.js`
- `frontend/src/components/editor/Canvas.jsx` and
  `frontend/src/utils/dropCoordinates.js`
- Their new neighboring tests and the two E2E specs in commit `c8ebb40`.

## Practical limits and follow-up

No original container design-width metadata is added. Width is derived from
the current child edges, so moving the rightmost child inward can slightly
increase the fitted scale. Raw child coordinates remain the editing source;
Edit, View and export apply the same fit. Auto-layout containers keep their
existing behavior.

jsdom loses `!important` when serializing some `var()` declarations through
CSSOM. Unit tests check generated source, scope and structure; the CI mobile
spec reads real Chromium computed styles across save/reload/reset. jsdom
results alone are not evidence of the browser's CSS cascade.

The initially unconfirmed nested palette-drop candidate was reproduced while
the first fix commit's CI ran, and was fixed in the follow-up described above.

## Local validation

| Check | Result |
| --- | --- |
| Full frontend suite | 251 files, 2,352 passed; 80.95 seconds |
| Full backend suite | 817 passed; 129.26 seconds |
| Frontend lint | Passed |
| Production build | Passed |
| `git diff --check` | Clean |

Frontend used Node 26 with
`NODE_OPTIONS=--no-experimental-webstorage npm run test:run -- --maxWorkers=4`.
Backend used `.venv-linux/bin/python -m pytest -q`; backend source is unchanged
in this batch. Existing large-chunk/staticfiles warnings remain. The first
full frontend attempt caught a stale flow-region fixture expectation; its
expected initial phone width was corrected from 200 to 288 before the final
full green run.

Local frontend logs:
`/tmp/sitebuilder-hardening-{frontend-final,lint,build}.log`.
The backend result above predates the final frontend-only placement fix.

The first fix commit `08767a5` passed all three jobs in
[CI run 38970563934](https://github.com/Ardakorkmaz0/SiteBuilder/actions/runs/38970563934),
including all 97 E2E tests and the three regressions that failed on `c8ebb40`. The final
placement fix gets its own exact-HEAD CI run; its result is recorded in the
delivery message. A deployment still requires the owner's new authorization
and a green `tests` workflow for the exact HEAD.
