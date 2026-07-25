# User Point-Control Dialog Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring all five user point-control dialogs and drawers into compliance with the project’s current overlay, close, frame, and scrolling rules without changing business behavior.

**Architecture:** Preserve every existing component and event interface. Normalize each component in place to a fixed root-level overlay, non-scrolling bounded frame, fixed header/footer, and single scrolling body, then protect the pattern with source-contract tests and actual browser interaction checks.

**Tech Stack:** Vue 3, JavaScript, Node test runner, Tailwind CSS, Vite.

## Global Constraints

- All five user point-control Dialog/drawer types are in scope.
- Every overlay must use `Teleport to="body"` and `fixed inset-0`.
- Clicking an overlay must never close its Dialog or drawer.
- A Dialog frame must be height-bounded and `overflow-hidden`; the frame must never scroll.
- Only the middle body may use `min-h-0 flex-1 overflow-y-auto`.
- Headers and footers/actions must remain outside the scrolling body.
- The detail drawer remains a full-height right-side drawer with only its content scrolling.
- Preserve all fields, button labels, emitted events, MFA behavior, point-control behavior, routes, logs, and Mock data.
- Do not create a new shared Dialog component.

---

### Task 1: Normalize the shared setting and MFA dialogs

**Files:**
- Modify: `test/userControlUi.test.js`
- Modify: `src/admin/components/user-control/UserControlModal.vue`
- Modify: `src/admin/components/MfaVerificationModal.vue`

**Interfaces:**
- Consumes: existing `open`, `close`, `submit`, `verify`, and `cancel` component contracts.
- Produces: unchanged business interfaces with compliant overlay/frame/body structure.

- [x] **Step 1: Add failing setting-dialog and MFA structure tests**

Add focused source assertions for `UserControlModal.vue`:

```js
assert.match(source, /<Teleport to="body">/)
assert.match(source, /fixed inset-0/)
assert.doesNotMatch(source, /@mousedown\.self|@click\.self/)
assert.doesNotMatch(source, /fixed inset-0[^"\n]*overflow-auto/)
assert.match(source, /data-testid="user-control-dialog-frame"[^>]*max-h-\[calc\(100dvh-1\.5rem\)\][^>]*overflow-hidden/)
assert.match(source, /data-testid="user-control-dialog-body"[^>]*min-h-0[^>]*flex-1[^>]*overflow-y-auto/)
```

Add equivalent assertions for `MfaVerificationModal.vue`:

```js
assert.doesNotMatch(mfaSource, /fixed inset-0[^"\n]*overflow-y-auto/)
assert.match(mfaSource, /data-testid="mfa-dialog-frame"[^>]*max-h-\[calc\(100dvh-2rem\)\][^>]*overflow-hidden/)
assert.match(mfaSource, /data-testid="mfa-dialog-body"[^>]*min-h-0[^>]*flex-1[^>]*overflow-y-auto/)
```

- [x] **Step 2: Run focused tests and verify RED**

Run: `node --test test/userControlUi.test.js`

Expected: FAIL because the setting overlay closes on backdrop and scrolls at the overlay, while MFA scrolls at its overlay and has no independently scrolling body.

- [x] **Step 3: Normalize `UserControlModal.vue`**

- Remove overlay `overflow-auto` and `@mousedown.self="close"`.
- Keep `Teleport to="body"` and `fixed inset-0`.
- Add `data-testid="user-control-dialog-frame"`, `flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden` to the frame.
- Keep the existing header and footer outside the body.
- Add `data-testid="user-control-dialog-body"`, `min-h-0 flex-1 overflow-y-auto` to the form body.
- Preserve close and submit buttons, emitted events, validation, fields, and compact spacing.

- [x] **Step 4: Normalize `MfaVerificationModal.vue`**

- Remove `overflow-y-auto` from the overlay.
- Add `data-testid="mfa-dialog-frame"`, `flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden` to the frame.
- Add `data-testid="mfa-dialog-body"`, `min-h-0 flex-1 overflow-y-auto` around the verification instructions, input, and error content.
- Keep the footer outside the scrolling body.
- Preserve all close, cancel, verify, loading, validation, focus, and transition behavior.

- [x] **Step 5: Run focused tests and verify GREEN**

Run: `node --test test/userControlUi.test.js`

Expected: all UI tests pass.

- [x] **Step 6: Commit Task 1**

```bash
git add test/userControlUi.test.js src/admin/components/user-control/UserControlModal.vue src/admin/components/MfaVerificationModal.vue
git commit -m "fix: normalize point-control setting dialogs"
```

---

### Task 2: Normalize cancel dialogs and lock the five-component contract

**Files:**
- Modify: `test/userControlUi.test.js`
- Modify: `src/pages/admin/user-control/ModuleUserControlPage.vue`
- Verify without behavior changes: `src/pages/admin/user/UserListPage.vue`
- Verify without behavior changes: `src/admin/components/user-control/UserControlDetailDrawer.vue`
- Modify: `docs/superpowers/plans/2026-07-25-user-point-control-dialog-compliance.md`

**Interfaces:**
- Consumes: Task 1’s compliant setting/MFA structures and existing module cancellation events.
- Produces: a compliant module cancellation Dialog plus automated coverage across all five Dialog/drawer types.

- [x] **Step 1: Add a failing module-cancel test and complete contract assertions**

Add module cancellation assertions:

```js
assert.doesNotMatch(moduleSource, /@mousedown\.self="closeCancel"|@click\.self="closeCancel"/)
assert.match(moduleSource, /data-testid="module-user-control-cancel-dialog"[^>]*max-h-\[calc\(100dvh-2rem\)\][^>]*overflow-hidden/)
assert.match(moduleSource, /data-testid="module-user-control-cancel-body"[^>]*min-h-0[^>]*flex-1[^>]*overflow-y-auto/)
```

Add or retain contract assertions for the already-compliant unified cancellation Dialog and detail drawer:

```js
assert.doesNotMatch(userListSource, /@mousedown\.self="closeControlCancel"|@click\.self="closeControlCancel"/)
assert.match(userListSource, /data-testid="unified-user-control-cancel-dialog"[^>]*overflow-hidden/)
assert.match(userListSource, /data-testid="unified-user-control-cancel-body"[^>]*min-h-0[^>]*flex-1[^>]*overflow-y-auto/)
assert.doesNotMatch(detailSource, /@mousedown\.self|@click\.self/)
assert.match(detailSource, /max-w-5xl[^>]*overflow-hidden/)
assert.match(detailSource, /flex-1[^>]*overflow-y-auto/)
```

- [x] **Step 2: Run focused tests and verify RED**

Run: `node --test test/userControlUi.test.js`

Expected: FAIL because the module cancellation overlay closes on backdrop and its frame/body do not implement the required scroll structure.

- [x] **Step 3: Normalize the module cancellation Dialog**

- Remove `@mousedown.self="closeCancel"` from the overlay.
- Keep `Teleport to="body"` and `fixed inset-0`.
- Add `flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden` to `module-user-control-cancel-dialog`.
- Add `data-testid="module-user-control-cancel-body"`, `min-h-0 flex-1 overflow-y-auto` to its body.
- Keep header and footer outside the body.
- Preserve note validation, cancel/confirm handlers, rule details, MFA flow, and button text.

- [x] **Step 4: Run focused tests and verify GREEN**

Run: `node --test test/userControlUi.test.js`

Expected: all UI tests pass.

- [x] **Step 5: Verify the full project**

Run: `npm test`

Expected: all tests pass with zero failures.

Run: `npm run build`

Expected: Vite production build exits with code 0.

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 6: Verify actual interactions**

> Unverified in this environment: the local Vite app started successfully, but no browser was available and no Playwright/Puppeteer dependency is installed. Desktop and narrow-viewport click, computed-style, and long-content scroll checks require a browser-enabled follow-up.

In the local app, verify the setting Dialog, unified cancel Dialog, module cancel Dialog, detail drawer, and MFA Dialog where reachable:

1. Clicking each overlay leaves the Dialog/drawer open.
2. Explicit close/cancel/return controls still close it.
3. Overlay bounds equal viewport bounds.
4. Frame computed overflow is `hidden`.
5. Body computed vertical overflow is `auto`.
6. Long content remains reachable through the body without scrolling the frame.
7. Verify desktop viewport. If the available browser cannot switch to a true narrow viewport, record narrow-viewport interaction as unverified instead of claiming success.

- [x] **Step 7: Commit Task 2**

```bash
git add test/userControlUi.test.js src/pages/admin/user-control/ModuleUserControlPage.vue docs/superpowers/plans/2026-07-25-user-point-control-dialog-compliance.md
git commit -m "fix: normalize point-control cancel dialogs"
```
