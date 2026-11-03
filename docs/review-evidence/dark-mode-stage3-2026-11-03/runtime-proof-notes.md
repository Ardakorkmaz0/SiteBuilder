# Runtime/store evidence

These are review evidence, not passing regression tests and not browser screenshots.
No secrets, credentials or real site data are included.

- `runtime-mutation-results.json`: results of 15 temporary production mutations. Each one failed a relevant existing test. Production files were restored byte-for-byte. The normal four-file suite passed all 91 tests before and after the mutations.
- `runtime-probe.review.test.jsx`: independent real-store/whole-PreviewPage probes. Only API calls and toolbar presentation are mocked. The iframe's generated head/runtime is executed in JSDOM. The test file normally lives outside the frontend root so its three known failing checks do not intentionally break the normal suite.
- `runtime-probe-results.txt`: actual output, with wrong vertical-navbar placement and two mixed canvas/HTML preference losses. The fourth, passing control checks direct store-state preservation and a single undo.
- `runtime-undo-history.txt`: historical source showing that general undo clearing selection already existed at `18759dd`; blame traces the single and multiple selection clears to May and July 2026. It is not introduced by dark-mode stage 3.

To reproduce the probe in a clean checkout, copy it temporarily to
`frontend/src/test/darkStage3.review.test.jsx`, run
`NODE_OPTIONS=--no-experimental-webstorage npm run test:run -- src/test/darkStage3.review.test.jsx`
from `frontend/`, then remove only that temporary copy. Expected current result:
three failing checks and one passing control. Do not promote those failures as
fixed guards without addressing the findings.

The actual browser evidence is separate: the manual JSON/JPEG files in this
folder and the CI attachments produced by `e2e/dark-mode-ui-review.spec.js`.
That spec's mixed-renderer and vertical-navbar tests are named diagnostic
measurements; they preserve the observed/expected differences in JSON and are
not claims that these two faults are fixed.
