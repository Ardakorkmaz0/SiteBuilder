# Dark mode review evidence

These are review reproductions, outside the normal test suite. They are not production fixes.

## Panel keyboard failure

Copy `ColorModePanel.review.test.jsx` into `frontend/src/components/editor/` only if that destination does not already exist. From `frontend/`, run:

```sh
NODE_OPTIONS=--no-experimental-webstorage npx vitest run src/components/editor/ColorModePanel.review.test.jsx
```

On `9a7b2ec`, both tests fail: ArrowRight leaves Light focused and checked; Tab focuses unchecked Dark instead of leaving the group. Delete only the copied review file after reproducing. The same interaction was verified in the in-app Chromium browser against the real component in an isolated fixture with no API writes. `panel-keyboard.jpg` records the fixture after Tab.

## Runtime link coverage gap

Copy `runtime-link.review.test.js` into `frontend/src/utils/` only if that destination does not already exist. From `frontend/`, run:

```sh
NODE_OPTIONS=--no-experimental-webstorage npx vitest run src/utils/runtime-link.review.test.js
```

The reproduction passes in the original code. In `withPaletteParam`, change the unconditional `url.searchParams.set('pwb-theme', mode)` to delete the parameter when `mode` equals `data-pwb-theme-base`. The existing `colorMode.test.js` remains green; this reproduction fails. Restore only that temporary production edit and delete the copied review file afterward.

## Backend coverage gaps

From `backend/`, run:

```sh
.venv-linux/bin/python -m pytest -q -c pytest.ini ../docs/review-evidence/dark-mode-2026-11-03/backend-gaps.py
```

All three reproductions pass in the original code. Removing only `light` from `COLOR_MODE_STARTS` fails the first reproduction. Removing the global `html` scan from `_site_has_theme_switch` fails the other two. The existing `test_page_live.py` and `test_validators.py` files still pass with either mutation. Each mutation was restored before the normal suites were run.
