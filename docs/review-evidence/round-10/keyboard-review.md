# Round 10 real keyboard cross-review evidence

Baseline: 19bdd7c. Production focusRescue.js and LinksEditor were not changed.
Browser: Codex in-app browser, new disposable tab 4. The owner's editor/567 tab was not operated. Only a Vite server started by this task was used; no backend or account data was involved.

Input was actual Tab/Enter through cua_repl Tab.pressKey(null, ...), never HTMLElement.click() or scripted focus(). Harness keyboard event logs recorded isTrusted=true.

Generic DOM harness results:
- disabled -> reenabled: Result action, AX focused Run action.
- disabled -> replacement: Result replacement, AX focused Replacement.
- disabled -> row removed: Result close, AX focused Close inside surviving dialog.
- disabled -> user Tab to Close -> reenabled: Result close; no focus theft.
- immediate removal with no preceding disabled render: Result empty (body), AX focused WebArea; Close remained.

Actual production LinksEditor component harness:
- React with in-memory state and language context boundary (English keys); no LinksEditor or focusRescue mock.
- Initial one link, then Tab (Outside), Tab (Remove), Enter.
- Output: Keyboard Tab trusted=true; Focus outside; Keyboard Tab trusted=true; Focus Remove; Keyboard Enter trusted=true; Result BODY.
- The row disappeared, '+ Add link' and Close stayed visible, but focus was WebArea/body.
- Root cause: MutationObserver collects ancestors only after removal. A directly removed button has no parent; a removed React row may retain inner parents, but that disconnected chain no longer reaches the surviving LinksEditor/dialog root. The fallback therefore cannot find the remaining control. This is a real existing component path, not only a synthetic handler.

Scope limits: this is real-browser keyboard behavior of an isolated production component and utility, not a whole signed-in editor/inbox end-to-end run. No real screen reader or physical mobile device was used. Findings are report-only under the review instruction.

## Round 1 template preview fix verification

A separate in-memory React harness imported the actual TemplatePicker, LanguageProvider and focusRescue. Harness-only CSS simplified display; this is focus behavior proof, not production-layout QA.

The gallery initially had focus. 62 real Tab key presses reached the first Turkish “Önizle” button; Enter opened the preview. DOM readback showed active role dialog and label “Tam ekran şablon önizlemesi”. Subsequent key results:
- Tab: “Bu şablonu kullan”.
- Tab: “Önizlemeyi kapat”.
- Tab: “Bu şablonu kullan” (wrapped).
- Shift+Tab: “Önizlemeyi kapat” (wrapped).
- Escape: “Önizle” (original opener).
- After Escape, preview dialog count was 0, gallery dialog count 1.

No account data, API, real files or owner's editor were used.
