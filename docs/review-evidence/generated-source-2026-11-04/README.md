# Generated source review execution evidence

Target production code: 77a59e2. Main checkout at start: 180bc66 (the review plan only).
These files contain disposable fixtures, execution receipts and known failing
review probes. They are outside the ordinary test suite and are not fixes.

Run the JavaScript probes from `frontend/` so their relative production imports
resolve. For the JSX probes, temporarily copy one to
`frontend/src/test/generatedReview.test.jsx`, then run:

```sh
NODE_OPTIONS=--no-experimental-webstorage npm run test:run -- src/test/generatedReview.test.jsx
```

Remove only that temporary copy afterwards. A is expected to fail on missing ZIP
runtime. E has one passing text-safety check and one failing blocked-storage
check. C has two passing checks. The main review records the observations,
including which assertions intentionally describe a known failure.

`*-mutations.json` contains the exact source replacement, targeted test command,
exit status and summaries for every executed mutation. They ran in a temporary
archive, not the shared checkout; original bytes were restored after each case.
`source-restore.json` compares all 652 tracked frontend source files against the
main checkout after the mutations. Do not apply these changes to a running server.

`size.mjs` and `D-probe.mjs` also read an old source archive. Recreate that archive
before reproducing those probes:

```sh
# From the repository root; use an empty directory for the archive.
mkdir -p /tmp/generated-review-old
git archive 7b109fe frontend | tar -x -C /tmp/generated-review-old
```

The D probe writes a comparison HTML file under the original review's temporary
frontend directory; adapt that output path for another isolated test checkout.
The E speed script contains this checkout's absolute source path; adapt that
import if running elsewhere. Its timings are single-run measurements, not a
cross-machine benchmark.

For the native UI harness, put `ui-harness.html` and `ui-harness.jsx` in a
disposable frontend copy as `review-ui.html` and `review-ui.jsx`, then open it
through the normal Vite dev server. It composes unchanged production components.
The storage failure is deliberate fixture injection, not a change to browser
privacy settings. Use Restore preference before closing. The native test used
the in-app Chromium; no local Playwright E2E was run.

No production account, data, password, token or server response is included.
Screenshots and JSON distinguish native UI measurements from JSDOM/Node checks.
