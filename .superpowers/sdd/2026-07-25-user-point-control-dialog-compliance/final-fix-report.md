# Final Fix Report — User Point-Control Dialog Compliance

## Outcome

All six final-review findings (C1 and I1–I5) were fixed on `main` without changing point-control or MFA business rules.

- Base SHA: `dfc895e254940080c461a62008404d38671e85ac`
- Implementation and regression-test SHA: `3df184463eb0e7d3d3e383f18107672e35a7a49a`
- Implementation commit: `fix: resolve final point-control dialog findings`

The new tests compile and execute the real Vue SFC scripts/templates with a Vue custom renderer. They exercise transition classes and hooks, real component events, focus behavior, queued reopen state, and rapid duplicate submission. The viewport test runs the actual Tailwind/PostCSS compiler and inspects the generated CSS.

## Finding fixes and TDD evidence

### C1 — Initial nested transitions did not enter, and lifecycle hooks could remain stuck

Root cause: the panel/drawer `Transition` was created as part of the overlay's first conditional render. Without `appear`, Vue treated the nested surface as an initial render and did not apply its enter classes. On the setting and detail surfaces, lifecycle completion was also attached to that nested transition, so the dialog could remain in `opening`; internal close and Escape were then rejected by the phase guard.

Fix:

- Added `appear` to the overlay and nested panel/drawer transitions on all five target surfaces.
- Bound lifecycle `after-enter` and `after-leave` completion to the outer overlay transition, whose render lifecycle is authoritative.
- Preserved the required 200ms enter, 150ms leave, delayed unmount, reduced-motion CSS, overlay retention, focus containment, and scroll lock.

RED:

`node --test --test-concurrency=1 test/dialogSfcBehavior.test.js`

Initial result: 5 tests, 0 passed, 5 failed. The real compiled SFCs lacked the nested `*-enter-from` class; the setting dialog also could not use internal close/Escape after the expected enter period.

GREEN after the C1 implementation: 5 passed, 0 failed.

### I1 — `vh` fallback could override the `dvh` declaration

Root cause: two same-specificity arbitrary utility classes (`vh` and `dvh`) relied on Tailwind output ordering. Source order did not guarantee that a supporting browser would retain the dynamic viewport value.

Fix:

- Kept the unconditional `vh` maximum/minimum-height fallback.
- Moved each `dvh` value into `supports-[height:100dvh]:...`, generating an explicit `@supports (height:100dvh)` override after the fallback.
- Covered setting, MFA, module cancel, and unified cancel; the full-height detail drawer remains inside its viewport-fixed overlay and does not require `dvh`.

RED (combined I1/I5 run):

`node --test --test-concurrency=1 test/dialogViewportCss.test.js test/dialogSfcBehavior.test.js`

Initial result: 8 tests, 5 passed, 3 failed. The compiled-CSS assertion found no supported dynamic override, and the two long-header structural tests failed.

GREEN: 8 passed, 0 failed.

### I2 — Removed menu triggers and out-of-order layered closes could lose or steal focus

Root cause: opening point-control actions removed the clicked menu item from the DOM. The lifecycle retained that disconnected item as its captured trigger. It had no stable logical target, and a lower layer completing leave before the top layer could still run focus restoration.

Fix:

- Added optional logical `returnFocusRef` support to `useDialogLifecycle`.
- A return target may be an element/ref or a resolver callback; only a connected focusable target is used.
- Resolution order is the explicit logical target, the captured trigger, then a connected focusable control outside the closing dialog.
- Focus is restored only when the leaving/unmounting layer was still topmost; a lower layer finishing first discards its stale return request.
- User management stores each row's stable “操作” button and passes its resolver to setting, unified cancellation, and MFA.

RED:

`node --test --test-concurrency=1 test/dialogLifecycle.test.js test/dialogSfcBehavior.test.js`

Initial result: 21 tests, 18 passed, 3 failed:

1. disconnected trigger did not use a logical fallback;
2. a lower layer finishing first stole focus;
3. unified cancellation did not return to the stable row “操作” button after its menu item unmounted.

GREEN: 21 passed, 0 failed.

### I3 — Setting submit could emit twice during the 150ms leave

Root cause: `submit()` only checked form completeness. The button remains mounted through the close animation, so a second rapid activation could emit another submit after the parent set `open=false`.

Fix:

- `submit()` now requires `phase === 'open'` in addition to valid form data.
- The confirm control is disabled whenever the phase is not `open`.

RED (combined I3/I4 run):

`node --test --test-concurrency=1 test/dialogSfcBehavior.test.js`

Initial result: 10 tests, 8 passed, 2 failed. The rapid-close test observed two submit events instead of one; the queued-reopen test retained A's selection instead of B's.

GREEN: 10 passed, 0 failed.

### I4 — Immediate A-close/B-reopen reset the form from A's closing snapshot

Root cause: `resetForm()` read `currentModuleRule` and `moduleOptions`, which intentionally derive from the displayed closing snapshot. During a queued reopen, the form therefore reset from leaving record A while the incoming props already represented B.

Fix:

- `resetForm(data)` now derives the module family, options, and existing rule directly from the incoming `dialogData`.
- The open/data watcher passes that exact data object into the reset.
- Closing content still uses the snapshot, preserving coherent leave animation while the next open starts from B.

RED/GREEN evidence is the combined I3/I4 run above. The executable scenario closes spot user A (`profit`, `permanent`), immediately queues portfolio user B (`lowYield`, `once`), then verifies B's identity and selections after reopen.

### I5 — Long headers could squeeze or obscure the fixed close control

Root cause: header text containers lacked `min-w-0` and wrapping rules, while some close controls lacked explicit non-shrinking 44px targets.

Fix:

- Fixed headers now use `shrink-0`.
- Text regions use `min-w-0 flex-1`; titles and identifiers wrap, with email using `break-all`.
- Close controls remain `shrink-0` with at least `min-h-11 min-w-11`.
- Applied the same resilient header structure across setting, detail, MFA, module cancel, and unified cancel surfaces.

RED/GREEN evidence is the combined I1/I5 run above. Real SFC structure tests use 160-character names and 120-character email local parts.

## Final automated verification

All results below were run after the fixes and before the implementation commit:

- Focused regression:
  `node --test --test-concurrency=1 test/dialogLifecycle.test.js test/dialogSfcBehavior.test.js test/dialogViewportCss.test.js test/mfaBehavior.test.js test/userControlUi.test.js`
  — 70 passed, 0 failed.
- Full suite: `npm test`
  — 221 passed, 0 failed, 0 skipped/todo/cancelled.
- Production build: `npm run build`
  — Vite 5.4.21, 369 modules transformed, build completed successfully.
- `git diff --check`
  — exit 0.
- Target-surface backdrop-handler scan:
  `rg -n '@click\.self|@mousedown\.self|backdrop-click' src/admin/components/user-control src/admin/components/MfaVerificationModal.vue src/pages/admin/user/UserListPage.vue src/pages/admin/user-control/ModuleUserControlPage.vue`
  — no matches (expected `rg` exit 1).
- Compiled viewport CSS test proves each `vh` fallback is unconditional and the matching `dvh` value is inside a later `@supports (height:100dvh)` rule.

The existing point-control state, form, cancellation, MFA, logging, and UI contract tests all remain green. No point-control direction, duration, status, overwrite priority, six-module atomicity, cancellation, log, route, MFA-code, or success-callback semantics were changed.

## Dialog-standard status

The prior 28-rule audit remains applicable, with its six final-review implementation gaps now closed:

- Real Vue SFC behavior now covers first-render overlay/panel/drawer entry and phase activation.
- Delayed leave blocks duplicate setting submission.
- Logical and layered focus restoration has executable coverage.
- Queued close/reopen uses incoming data while retaining the closing snapshot.
- Tailwind-generated CSS proves the viewport fallback/override contract.
- Long-header structure protects a visible, focusable, 44px close target.

Static and executable checks also continue to cover no backdrop close, body-only scrolling, viewport-root teleport overlays, delayed cleanup, Escape/Tab behavior, layer isolation, modal naming, MFA duplicate/error handling, and reopen cleanup.

## Browser verification — explicitly unverified

This final-fix wave did not execute browser-runtime checks. The immediately preceding Task 4 report records that the in-app Browser skill returned no available browser backend (`agent.browsers.list() -> []`). No browser behavior is claimed here.

The following must still be checked in an available in-app browser on user management and one module point-control page:

- Actual 200ms enter and 150ms leave appearance/timing, including reduced motion.
- Backdrop clicks, internal close, delayed DOM removal, rapid open/close/submit, and layered setting-to-MFA transitions.
- Initial focus, Tab/Shift+Tab trapping, topmost Escape, menu-trigger restoration, and nested-dialog restoration.
- Pointer, keyboard, and accessibility-tree isolation of the page and lower dialog.
- Header/footer reachability and body-only scrolling at desktop, 390px mobile, low-height viewport, 200% zoom, and virtual-keyboard or closest supported emulation.
- Long translated titles, usernames, UIDs, and emails with the close target continuously visible.
- Route change, unmount, and repeated reopen with no stale overlay, scroll lock, `inert`, listener, loading, error, or closing state.

These are verification gaps only; the automated suite reports no remaining implementation failure.
