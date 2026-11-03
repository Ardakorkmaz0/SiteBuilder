# Pixel fixture: absent page background

No production or test files were changed by this check. The temporary store spec was removed after it ran.

## Executed evidence

1. A raw canvas schema with `theme.backgroundColor='#ffffff'`, `colorMode.start='dark'` and no `page.background` was passed to the real backend `validate_and_clean_schema`. It was accepted, and the result contained `background='#ffffff'` and `backgroundMobile='#ffffff'`.
2. The raw schema and that backend-cleaned schema were each passed to the real `colorModeFor`, `withColorModePage`, `schemaToSingleHtml` and `publishedPagesFor`.
3. A temporary Vitest spec drove the real store's `loadSchema` and `importSchema` with absent backgrounds, then called the real writer. Both tests passed: the page backgrounds were added and the emitted body used the alternate-palette variable.

| Input passed to the writer | Palette after its real head script | Mapped page background | Final emitted body declaration |
| --- | --- | --- | --- |
| Raw, background missing | dark | missing | `background: #ffffff` |
| Backend-normalized | dark | `var(--pwb-alt-bg, #ffffff)` | `background: var(--pwb-alt-bg, #ffffff)` |
| Real editor load/import | dark mode config | `var(--pwb-alt-bg, #ffffff)` in emitted output | variable declaration, as asserted by two passing tests |

The raw document really has a white body: JSDOM's CSSOM lists the earlier `var(--site-bg, #ffffff)` body rule followed by the later white rule, and computes raw body background as `rgb(255,255,255)`. JSDOM did not resolve the cleaned document's custom-property color (it reported transparent), so that is not presented as a native pixel result.

## Source points

- Backend accepts omitted background but defaults it: `backend/builder/validators.py:774–775`, through `sanitize_color` at `:637–641`. The serializer invokes that cleaner at `backend/builder/serializers.py:714–715`.
- Both normal frontend load and project import call schema normalization. `frontend/src/store/editorStore.js:1219–1220` fill absent/empty backgrounds; `loadSchema` calls normalization around `:1638`; `importSchema` around `:1678` does too. Fresh pages already have explicit defaults at `:51–52`.
- `frontend/src/utils/colorMode.js:432–436` maps only a supplied nonempty page background.
- `frontend/src/utils/schemaToFiles.js:942–943` supply a white fallback later, after that mapping. `:972–974` write it onto body/viewport. Hence the fallback itself is unthemed when the raw input omitted it.

## Classification

An absent background is valid **request input**, but it is normalized before becoming ordinary editor state or a newly saved backend schema. A published fixture that generates HTML directly from the raw input before this normalization bypasses the normal editor publish path; its white page is therefore not evidence that the iframe `color-scheme` rule is broken. Giving the pixel fixture an explicit background is the correct way to isolate that iframe rule.

There is a real low-level writer fallback limitation for raw, unnormalized schemas: the default white is inserted too late to be recolored. This check does not establish a normal owner UI path to it, and it is not a newly demonstrated Stage 3 regression. It should be kept separate from the two real UI findings. The API deliberately accepts client-rendered publication HTML, so it can retain that mismatch if a custom/API client renders before normalizing; that is exactly what this fixture did.

Evidence files:

- `/tmp/sitebuilder-dark-background-raw.json`
- `/tmp/sitebuilder-dark-background-clean.json`
- `/tmp/sitebuilder-dark-background-writer-proof.json`
- `/tmp/sitebuilder-dark-background-raw.html`
- `/tmp/sitebuilder-dark-background-clean.html`
- `/tmp/sitebuilder-dark-background-store.review.test.jsx`
- `/tmp/sitebuilder-dark-background-store-proof.log` — **2 passed**, no mutation.
