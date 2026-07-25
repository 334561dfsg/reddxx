# User Point-Control Dialog Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all five point-control dialog types comply with the complete project Dialog standard without changing point-control or MFA business behavior.

**Architecture:** Add one focused Vue composable that owns the shared modal lifecycle: delayed unmount, top-layer registration, focus containment/restoration, Escape handling, background isolation, scroll locking, and cleanup. Keep each dialog's markup and business events local, and connect the existing setting, cancel, detail, and MFA surfaces to the common lifecycle plus shared transition CSS.

**Tech Stack:** Vue 3 Composition API, Vue Teleport/Transition, Tailwind CSS, scoped CSS, Node.js built-in test runner, Vite.

## Global Constraints

- Cover `UserControlModal.vue`, the unified cancel dialog in `UserListPage.vue`, the module cancel dialog in `ModuleUserControlPage.vue`, `UserControlDetailDrawer.vue`, and `MfaVerificationModal.vue`.
- Do not change point-control direction, duration, status, precedence, six-module atomic writes, cancellation semantics, logs, routes, MFA code rules, or success callback meaning.
- Backdrop clicks never close or start closing a dialog.
- Opening is overlay fade plus dialog fade/`scale(0.96)` to `scale(1)` over `200ms ease-out`; closing reverses over `150ms ease-in` and unmounts afterward.
- Under `prefers-reduced-motion: reduce`, omit scaling and keep fades at or below `50ms`.
- Keep the outer frame non-scrolling; only the body uses `min-h-0 flex-1 overflow-y-auto`.
- Use `role="dialog"`, `aria-modal="true"`, a visible title with `aria-labelledby`, and a visible named internal action.
- Trap focus within the top dialog, restore focus after closing, isolate the background and lower layers, and let Escape close only the top layer unless work is uninterruptible.
- Prevent duplicate MFA verification, closing, and callback execution during loading; keep failures readable in the open dialog.
- Clear locks, `inert`, listeners, layer state, animation state, loading/error residue, and focus state on close, route change, unmount, and reopen.
- Preserve unrelated working-tree changes, including `docs/superpowers/plans/2026-07-25-user-point-control-module-rule-docs.md` if present.

---

### Task 1: Shared Dialog Lifecycle

**Files:**
- Create: `src/admin/composables/useDialogLifecycle.js`
- Create: `src/admin/styles/dialogMotion.css`
- Create: `test/dialogLifecycle.test.js`
- Modify: `src/main.js`

**Interfaces:**
- Produces: `useDialogLifecycle({ open, dialogRef, initialFocusRef, requestClose, closeDisabled? })`.
- Returns: `{ rendered, phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave }` where `rendered` remains true through closing, `phase` is `opening | open | closing | closed`, and `requestDialogClose()` returns `false` when the layer is not topmost, is moving, or closing is disabled.
- Produces: global `.dialog-overlay-*`, `.dialog-panel-*`, and `.dialog-drawer-*` Vue transition classes.
- Later tasks consume the returned refs and callbacks directly in templates.

- [ ] **Step 1: Write failing lifecycle tests**

Create `test/dialogLifecycle.test.js` with a minimal fake document/element harness and assertions for the exported testable helpers:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  __resetDialogLayersForTests,
  getFocusableElements,
  isTopDialogLayer,
  registerDialogLayer,
  unregisterDialogLayer
} from '../src/admin/composables/useDialogLifecycle.js'

test('dialog layers only expose the most recently registered layer as topmost', () => {
  __resetDialogLayersForTests()
  const first = registerDialogLayer({ setAttribute() {}, removeAttribute() {} })
  const second = registerDialogLayer({ setAttribute() {}, removeAttribute() {} })
  assert.equal(isTopDialogLayer(first), false)
  assert.equal(isTopDialogLayer(second), true)
  unregisterDialogLayer(second)
  assert.equal(isTopDialogLayer(first), true)
})

test('focus candidates exclude disabled, hidden, and negative-tabindex controls', () => {
  const enabled = { disabled: false, hidden: false, tabIndex: 0, getAttribute: () => null }
  const disabled = { ...enabled, disabled: true }
  const hidden = { ...enabled, hidden: true }
  const negative = { ...enabled, tabIndex: -1 }
  const root = { querySelectorAll: () => [enabled, disabled, hidden, negative] }
  assert.deepEqual(getFocusableElements(root), [enabled])
})
```

- [ ] **Step 2: Run the lifecycle test and verify RED**

Run: `node --test test/dialogLifecycle.test.js`

Expected: FAIL because `src/admin/composables/useDialogLifecycle.js` does not exist.

- [ ] **Step 3: Implement layer and focus helpers**

Create `useDialogLifecycle.js` with module-scoped layer state and these exact exports:

```js
const dialogLayers = []

export const registerDialogLayer = (element) => {
  const layer = { id: Symbol('dialog-layer'), element }
  dialogLayers.push(layer)
  syncLayerIsolation()
  return layer
}

export const unregisterDialogLayer = (layer) => {
  const index = dialogLayers.indexOf(layer)
  if (index >= 0) dialogLayers.splice(index, 1)
  syncLayerIsolation()
}

export const isTopDialogLayer = (layer) => dialogLayers.at(-1) === layer

export const getFocusableElements = (root) => [...(root?.querySelectorAll(
  'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])'
) || [])].filter((element) => (
  !element.disabled && !element.hidden && element.tabIndex >= 0 &&
  element.getAttribute?.('aria-hidden') !== 'true'
))

export const __resetDialogLayersForTests = () => {
  dialogLayers.splice(0)
}
```

Implement `syncLayerIsolation()` so every lower registered dialog element receives `inert` and `aria-hidden="true"`, while the top element has both removed. Keep page-background isolation and scroll-lock reference-counted so closing one of two layers does not unlock the page.

- [ ] **Step 4: Implement the Vue lifecycle composable**

Use `watch`, `nextTick`, and `onBeforeUnmount` to implement the documented interface. On open, capture `document.activeElement`, set `rendered`, register after the teleported element exists, lock `document.documentElement` and `document.body`, make non-dialog body children inert, add one document `keydown` listener, and focus `initialFocusRef` or the first candidate. On `Tab`, wrap first/last focus within the top layer; on `Escape`, call `requestDialogClose()` only for the top layer. On close request, set `phase = 'closing'` but defer unregister, unlock, cleanup, and focus restoration until `onAfterLeave`.

- [ ] **Step 5: Add exact shared transition CSS**

Create `src/admin/styles/dialogMotion.css`:

```css
.dialog-overlay-enter-active { transition: opacity 200ms ease-out; }
.dialog-overlay-leave-active { transition: opacity 150ms ease-in; }
.dialog-overlay-enter-from,
.dialog-overlay-leave-to { opacity: 0; }
.dialog-panel-enter-active { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.dialog-panel-leave-active { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.dialog-panel-enter-from,
.dialog-panel-leave-to { opacity: 0; transform: scale(0.96); }
.dialog-drawer-enter-active { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.dialog-drawer-leave-active { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.dialog-drawer-enter-from,
.dialog-drawer-leave-to { opacity: 0; transform: translateX(1rem) scale(0.96); }
@media (prefers-reduced-motion: reduce) {
  .dialog-overlay-enter-active,
  .dialog-overlay-leave-active,
  .dialog-panel-enter-active,
  .dialog-panel-leave-active,
  .dialog-drawer-enter-active,
  .dialog-drawer-leave-active { transition-duration: 50ms; }
  .dialog-panel-enter-from,
  .dialog-panel-leave-to,
  .dialog-drawer-enter-from,
  .dialog-drawer-leave-to { transform: none; }
}
```

Import it once from `src/main.js`.

- [ ] **Step 6: Run focused and full tests**

Run: `node --test test/dialogLifecycle.test.js`

Expected: PASS for top-layer and focus-candidate behavior.

Run: `npm test`

Expected: all existing tests PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add src/admin/composables/useDialogLifecycle.js src/admin/styles/dialogMotion.css src/main.js test/dialogLifecycle.test.js
git commit -m "feat: add accessible dialog lifecycle"
```

---

### Task 2: Point-Control Setting Dialog and Detail Drawer

**Files:**
- Modify: `src/admin/components/user-control/UserControlModal.vue`
- Modify: `src/admin/components/user-control/UserControlDetailDrawer.vue`
- Modify: `test/userControlUi.test.js`

**Interfaces:**
- Consumes: `useDialogLifecycle()` and global `dialog-overlay`, `dialog-panel`, and `dialog-drawer` transition classes from Task 1.
- Produces: setting and detail surfaces with delayed unmount, semantic titles, initial focus, focus containment, Escape, restoration, and cleanup.

- [ ] **Step 1: Add failing component contract tests**

Append assertions to `test/userControlUi.test.js` that require:

```js
assert.match(settingSource, /useDialogLifecycle/)
assert.match(settingSource, /aria-labelledby="user-control-dialog-title"/)
assert.match(settingSource, /id="user-control-dialog-title"/)
assert.match(settingSource, /ref="firstControlOption"/)
assert.match(settingSource, /v-if="rendered"/)
assert.match(settingSource, /name="dialog-overlay"/)
assert.match(settingSource, /name="dialog-panel"/)

assert.match(detailSource, /useDialogLifecycle/)
assert.match(detailSource, /aria-labelledby="user-control-detail-title"/)
assert.match(detailSource, /id="user-control-detail-title"[^>]*tabindex="-1"/)
assert.match(detailSource, /name="dialog-drawer"/)
```

Also assert both overlay templates have no `@click.self`, `@mousedown.self`, or `backdrop-click` binding.

- [ ] **Step 2: Run the UI contract test and verify RED**

Run: `node --test test/userControlUi.test.js`

Expected: FAIL on missing lifecycle, semantic-title, and transition contracts.

- [ ] **Step 3: Integrate the setting dialog**

In `UserControlModal.vue`, add `dialogRef` and `firstControlOption` refs. Connect `props.open` to `useDialogLifecycle` and route internal close buttons through `requestDialogClose`; keep successful submit controlled by the parent. Wrap the overlay and panel in nested transitions, render with `v-if="rendered"`, bind `ref="dialogRef"`, use `aria-labelledby="user-control-dialog-title"`, and place `id="user-control-dialog-title"` on the visible `h2`. Bind `ref="firstControlOption"` to the first enabled radio using the loop index.

- [ ] **Step 4: Integrate the detail drawer**

In `UserControlDetailDrawer.vue`, add `dialogRef` and `titleRef`, connect `props.open` and `emit('close')` to the lifecycle, render through nested overlay/drawer transitions, and put `id="user-control-detail-title" tabindex="-1" ref="titleRef"` on the visible heading. Preserve the full-height `overflow-hidden` frame and add `min-h-0` to the existing scroll body.

- [ ] **Step 5: Run focused tests and build**

Run: `node --test test/userControlUi.test.js test/dialogLifecycle.test.js`

Expected: PASS.

Run: `npm run build`

Expected: Vite production build succeeds without Vue template warnings.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/admin/components/user-control/UserControlModal.vue src/admin/components/user-control/UserControlDetailDrawer.vue test/userControlUi.test.js
git commit -m "fix: upgrade point-control dialogs"
```

---

### Task 3: Unified and Module Cancellation Dialogs

**Files:**
- Modify: `src/pages/admin/user/UserListPage.vue`
- Modify: `src/pages/admin/user-control/ModuleUserControlPage.vue`
- Modify: `test/userControlUi.test.js`

**Interfaces:**
- Consumes: `useDialogLifecycle()` from Task 1.
- Produces: both cancel dialogs with safe initial focus and consistent lifecycle behavior.

- [ ] **Step 1: Add failing cancellation tests**

Add source-contract assertions requiring each page to import/use `useDialogLifecycle`, render from the lifecycle `rendered` ref, use overlay/panel transitions, bind a dialog ref, label the dialog from a visible heading, and bind an initial-focus ref to the “返回” button. Preserve assertions for `max-h`, `overflow-hidden`, `min-h-0 flex-1 overflow-y-auto`, and absence of backdrop close handlers.

- [ ] **Step 2: Run the cancellation contracts and verify RED**

Run: `node --test test/userControlUi.test.js`

Expected: FAIL because the page-local cancel dialogs are still immediate `v-if` overlays.

- [ ] **Step 3: Upgrade the module cancellation dialog**

Create `moduleCancelDialogRef` and `moduleCancelReturnRef`. Connect `cancelOpen`, `closeCancel`, and lifecycle callbacks. Replace the direct overlay `v-if` with delayed rendering and nested transitions. Use `aria-labelledby="module-user-control-cancel-title"`, add that ID to the heading, and focus the return button. Keep the cancel note reset after the close animation so its content does not disappear during closing.

- [ ] **Step 4: Upgrade the unified cancellation dialog**

Create `unifiedCancelDialogRef` and `unifiedCancelReturnRef`. Connect `cancelControlOpen`, `closeControlCancel`, and lifecycle callbacks. Use `aria-labelledby="unified-user-control-cancel-title"`, add the heading ID, focus the return button, and use `100vh` plus `100dvh` maximum-height classes. When continuing to MFA, finish the cancel Dialog's close transition before opening MFA so layer registration, background isolation, and focus restoration remain deterministic.

- [ ] **Step 5: Run focused tests and build**

Run: `node --test test/userControlUi.test.js test/dialogLifecycle.test.js`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/pages/admin/user/UserListPage.vue src/pages/admin/user-control/ModuleUserControlPage.vue test/userControlUi.test.js
git commit -m "fix: harden point-control cancellation dialogs"
```

---

### Task 4: MFA Async Safety, Errors, and Full Verification

**Files:**
- Modify: `src/admin/components/MfaVerificationModal.vue`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Modify: `test/userControlUi.test.js`
- Modify: `test/dialogLifecycle.test.js`

**Interfaces:**
- Consumes: `useDialogLifecycle({ closeDisabled: computed(() => props.loading) })`.
- Produces: MFA dialog that emits `verify` at most once per loading cycle, exposes `aria-busy`, focuses validation errors, and cannot close while loading.

- [ ] **Step 1: Add failing MFA safety tests**

Add contract assertions requiring:

```js
assert.match(mfaSource, /useDialogLifecycle/)
assert.match(mfaSource, /aria-labelledby="mfa-dialog-title"/)
assert.match(mfaSource, /:aria-busy="loading"/)
assert.match(mfaSource, /ref="verificationInput"/)
assert.match(mfaSource, /ref="errorSummary"/)
assert.match(mfaSource, /role="alert"/)
assert.match(mfaSource, /aria-live="assertive"/)
assert.match(mfaSource, /if \(props\.loading \|\| verifyRequested\.value\) return/)
assert.match(mfaSource, /:aria-label="loading \? '验证并继续，验证中' : '验证并继续'"/)
```

Extend `dialogLifecycle.test.js` with a test proving a disabled close predicate makes `requestDialogClose()` return `false` without invoking its callback.

- [ ] **Step 2: Run MFA/lifecycle tests and verify RED**

Run: `node --test test/userControlUi.test.js test/dialogLifecycle.test.js`

Expected: FAIL on missing async guard, accessible error, and loading-close behavior.

- [ ] **Step 3: Integrate MFA lifecycle and semantics**

Replace `v-show` with lifecycle-delayed `v-if`, nested overlay/panel transitions, `aria-labelledby="mfa-dialog-title"`, and `:aria-busy="loading"`. Add `verificationInput`, `errorSummary`, and `verifyRequested` refs. Focus the input on open, reset code/error/request state on each reopen, and block `handleCancel`, close, Escape, and `handleVerify` while loading or already requested.

- [ ] **Step 4: Keep validation errors readable**

Render the error as:

```vue
<p
  v-if="errorMessage"
  ref="errorSummary"
  tabindex="-1"
  role="alert"
  aria-live="assertive"
  class="mt-2 text-center text-sm text-rose-600"
>
  {{ errorMessage }}
</p>
```

After setting an error, await `nextTick()` and focus `errorSummary`. Add `aria-describedby` from the input only to the short error/help IDs, not the full body.

- [ ] **Step 5: Preserve failure state in the parent flow**

In `UserListPage.vue`, keep `mfaOpen` true when verification rejects, set a textual error prop on `MfaVerificationModal`, and only clear it on reopen or successful completion. Do not auto-close before the error is readable.

- [ ] **Step 6: Run all automated verification**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: production build PASS.

Run: `rg -n "@click\\.self|@mousedown\\.self|backdrop-click" src/admin/components/user-control src/admin/components/MfaVerificationModal.vue src/pages/admin/user/UserListPage.vue src/pages/admin/user-control/ModuleUserControlPage.vue`

Expected: no matches in the five target surfaces.

- [ ] **Step 7: Perform browser interaction and viewport checks**

Start the app with `npm run dev`, then use the in-app browser to verify the checklist from the design in user management and one module page: backdrop, internal close, delayed unmount, initial focus, Tab/Shift+Tab wrap, Escape top-layer behavior, focus restoration, background isolation, body-only scrolling, rapid actions, MFA loading/error, repeated reopen, desktop, 390px mobile, low-height, 200% zoom, reduced motion, and the closest available virtual-keyboard emulation. Record any unavailable check as unverified in the final response.

- [ ] **Step 8: Commit Task 4**

```bash
git add src/admin/components/MfaVerificationModal.vue src/pages/admin/user/UserListPage.vue test/userControlUi.test.js test/dialogLifecycle.test.js
git commit -m "fix: complete point-control dialog accessibility"
```

- [ ] **Step 9: Final requirement audit**

Read `AGENTS.md`, `frontend-product-interaction-standards/references/dialogs.md`, the design spec, and the final diff. Map every one of the 27 Dialog rules to code, automated-test, build, or browser evidence. If any item lacks direct evidence, implement or verify it before declaring completion; otherwise report it explicitly as unverified where the project instructions permit a manual check to remain unavailable.
