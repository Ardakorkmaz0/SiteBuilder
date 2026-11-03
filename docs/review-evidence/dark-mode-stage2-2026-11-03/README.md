# Dark mode stage 2 review evidence

These files are reproductions outside the normal suites, not production fixes.

## Editor radio event leakage

Copy `EditorPage.radioReview.test.jsx` into `frontend/src/pages/` only if that destination does not exist. From `frontend/`, run:

```sh
NODE_OPTIONS=--no-experimental-webstorage npx vitest run src/pages/EditorPage.radioReview.test.jsx
```

On `ce6ba20` the test fails: ArrowRight switches Draft to Live but also changes the selected heading's x coordinate from 20 to 21. It mounts the real editor and store, mocking only server APIs. A temporary diagnostic that stopped propagation in `moveInRadioGroup` made this reproduction pass; that diagnostic was reverted. Remove only the copied review test afterward.

## Cross-site navigation and query parsing

Copy `runtime-stage2.review.test.js` into `frontend/src/utils/` only if that destination does not exist. From `frontend/`, run:

```sh
NODE_OPTIONS=--no-experimental-webstorage npx vitest run src/utils/runtime-stage2.review.test.js
```

On `ce6ba20`, four reproductions fail and one storage-priority control passes. The failures show an automatic theme query on a different site's link, and three URLs whose first-visit palette disagrees with the real server cookie. These run the real head script in its own script tag and the real interactive runtime, without mocking either.

## Server and cookie evidence

From `backend/`, run:

```sh
.venv-linux/bin/python -m pytest -q -c pytest.ini ../docs/review-evidence/dark-mode-stage2-2026-11-03/backend-proof.py
```

All five controls pass on `ce6ba20`. They use real Site/PublishedPage rows and real responses. Python's standard CookieJar decides which cookies belong to each path. They verify the current server behavior, including B's saved Light changing to Dark after the URL produced by A's runtime, and independently verify Django's choices for the three query-parser reproductions. The backend is correct to apply an explicitly chosen query; the cross-site issue is that the runtime adds that query to a previously plain link.

The code writes two small JSON evidence files under `/tmp`. The databases are pytest test databases. These controls do not access production data.
