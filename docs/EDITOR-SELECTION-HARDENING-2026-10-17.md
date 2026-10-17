# Selection, gesture lifetime and native tabs — 17 October 2026

This test round starts from `8b9e1f0`, which was deployed before the owner
asked to continue testing. New changes in this round require a fresh deploy
instruction. No production data, API contracts, models or migrations change.

## Reproduced and fixed

### Stale pointer gestures after leaving a canvas

Pointer listeners outlived their React owners. Starting a drag in document A,
unmounting it and opening document B with a matching component ID allowed the
next pointer move to overwrite B's coordinates. A deterministic case expected
`(600,700)` in B and instead received `(100,160)`. A PC drag could likewise
write into the phone layout after switching viewports. A stale marquee could
select items in the replacement document.

`ui/usePointerDrag.js` owns each active cancellation function. Layout cleanup
ends gestures on unmount, page change and viewport change, including edge
scrolling and the history gesture. Normal re-renders keep the gesture alive.
Free-canvas, flow/nested and marquee handlers use this hook. Explicit manual
cancellation now sends `pointercancel`; without that event, marquee cleanup
was interpreted as a completed click/selection.

Eight real component regressions and one pointer utility regression failed
before the fix; six existing utility guards passed. Six hook tests cover
scope changes, ordinary re-renders, natural completion and multiple pointers.
Independent review ran 21/21 tests successfully. Isolated mutations failed
12 tests without cleanup, three without context dependencies, four without
explicit cancellation, and eight with the old component wiring.

### Mobile alignment wrote into a different coordinate space

Container and tabs children share one design at both breakpoints. Region
children keep a separate phone design, including on flow pages. Group align
and distribute used a page-wide key instead; they could change an invisible
old phone layout, leave the displayed child unmoved and switch the page into
manual phone mode. Aligning a single region child on a phone changed its PC
coordinates instead.

`alignSelection`, `distributeSelection` and `alignComponent` now share the
same coordinate policy as pointer moves, nudges and size edits. Same-parent
selection filtering and structural-region exclusions remain. Eleven store
tests ran as nine failures and two guards before the fix, then passed.
The unused `distributeSiblings` action is outside this change.

### Multi-selection sizing skipped selected descendants and manual sizing

Selecting both a container and its child, then entering width 100 in the real
Properties panel, resized only the parent. Batch geometry stopped descending
when it encountered a selected ancestor. It also omitted native `fit: box`
and HTML `_boxManual` flags that single-item manual resizing already applies.

Batch sizing now visits selected descendants for explicit width/height edits,
uses their updated immediate parent for bounds, and shares the existing
single-item manual sizing policy. Explicit `fit: off` remains respected.
Selected descendants do not receive duplicate local position deltas when
their ancestor moves. Four real Canvas/Properties panel cases and four store
cases failed before the fix and passed afterwards. Neighboring guards cover
PC/mobile parent-child nudges and updated tabs-parent bounds.
Independent review passed all 19 new store/UI tests and four additional
isolated edge probes. Reverting the key policy broke nine tests; removing
the position guard broke two; omitting manual-sizing flags broke three;
and using old parent bounds broke one.

### Native tabs differed between Edit, View and export

In a 600 px tabs design, a child whose right edge is 600 fitted into a 320 px
phone panel in Edit, but remained 600 px wide in View/export. Two initial
geometry regressions failed before the fix.

Nonempty tab panels now reuse `ContainerCanvas` and its existing exported runtime
contract. The tab strip stays outside the fitted panel. Opening a hidden
panel refits it, including exported pages without ResizeObserver. No new
schema metadata is introduced. Empty panels keep their original markup and
spacing. Container fitting runs after each React render so a nested free
container also remeasures when its hidden ancestor opens. A focused test ran
as one failure and nine passing guards before that final correction.
Ten tests compare actual derived child
edges, font geometry and panel height; cover PC/mobile, tab activation,
nested fitting and auto-layout children; and run the real exported scripts
with only platform measurements supplied by the test.
Final independent review passed all ten tabs tests and the four existing
renderer sizing guards. Restoring the old effect dependencies broke the
nested hidden-panel case; removing empty-panel preservation broke the old
renderer sizing guard. Restoring the old runtime activation broke its refit
test. No proven finding remained in the reviewed scope.

## Test inventory

| New coverage | Tests |
| --- | ---: |
| Pointer component lifetime | 8 |
| Pointer hook ownership | 6 |
| Explicit pointer cancellation | 1 |
| Mobile alignment | 11 |
| Batch sizing store | 4 |
| Real Properties panel sizing | 4 |
| Native tabs geometry and activation | 10 |
| **Total new Vitest tests** | **44** |

No local browser or end-to-end spec was added. jsdom supplies platform
measurements; these tests are not presented as real browser geometry tests.
All new expectations use literal values. Regression runs fail for the
production behavior rather than a missing module or mock.

## Review handoff

Production authors did not sign off their own work. Other Codex agents
reviewed it and ran isolated mutations. Claude CLI is unavailable, so this
is not Claude approval. Claude should inspect:

- `frontend/src/ui/usePointerDrag.js` and `utils/pointerDrag.js`, their tests
  and the wiring in Canvas, FreeCanvasItem and FlowCanvasItem.
- The three alignment actions and `setLayoutMany` in
  `frontend/src/store/editorStore.js`, with the two new store suites and
  `PropertiesPanel.selectionSizing.test.jsx`.
- TabsRender/ContainerCanvas, exported tab panels and runtime activation,
  with `components/renderer/TabsRender.fit.test.jsx`.

The earlier dynamic free-container fit limit remains: design width is derived
from current child edges, so moving the rightmost child can alter the fit.
This round does not introduce original-design-width metadata.

## Final local validation

| Check | Result |
| --- | --- |
| Full frontend suite | 257 files, 2,396 passed; 75.10 seconds |
| Full backend suite | 817 passed; 133.39 seconds |
| Frontend lint | Passed |
| Production build | Passed |
| `git diff --check` | Clean |

Frontend used Node 26 with
`NODE_OPTIONS=--no-experimental-webstorage npm run test:run -- --maxWorkers=4`.
Backend used `.venv-linux/bin/python -m pytest -q`. Existing large-chunk and
staticfiles warnings remain. The first full frontend run caught the empty
tab-panel regression with an existing guard; the source was corrected and
the whole suite rerun. The guard was not weakened.

Logs: `/tmp/sitebuilder-selection-{frontend,backend,lint,build}.log`.
The pushed commit's exact-HEAD CI result is recorded in the delivery message.
These changes have not been deployed as part of this test round.
