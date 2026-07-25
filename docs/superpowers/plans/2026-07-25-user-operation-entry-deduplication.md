# User Operation Entry Deduplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove misleading or duplicate user-operation entries, give “详情” and “资金概况” distinct destinations, and preserve correct shared modal layering.

**Architecture:** Keep `userOperations.js` as the sole visible-entry catalog, remove the combined adjust action from the shared action orchestrator, and add an explicit `initialTab` contract to `UserDetailDrawer`. Migrate the detail Drawer to `useDialogLifecycle` so any future nested actions participate in the same layer stack instead of relying on fixed `z-index`.

**Tech Stack:** Vue 3 Composition API, Tailwind CSS, Node test runner, Vite, existing `useDialogLifecycle` composable.

## Global Constraints

- The funds group contains exactly: 资金概况、链上钱包、客服入金、账户间划转、冻结全部资金、解冻后台冻结、划扣可用资金、出金流水限制.
- “调账”“后台划扣记录”“手动上分地址” are not visible first-level operation entries.
- “详情” opens the overview tab; “资金概况” opens the assets tab.
- The operation Drawer remains mounted beneath child Dialogs; only the top layer is interactive.
- Backdrop click, drag, and swipe never close Dialogs or Drawers.
- Drawer frames use `overflow-hidden`; only their content region uses `overflow-y-auto`.
- Open animation is `200ms ease-out`, close animation is `150ms ease-in`; reduced motion is at most `50ms` without translation.
- Every ordinary Drawer has an always-visible top-right close button with `aria-label="关闭"`.
- Do not mark planned business capabilities as implemented during this entry-cleanup batch.

---

### Task 1: Clean Up the Visible Operation Catalog

**Files:**
- Modify: `src/admin/config/userOperations.js`
- Modify: `test/userOperationEntryCenter.test.js`

**Interfaces:**
- Consumes: `USER_OPERATION_ENTRIES`, `USER_OPERATION_QUICK_IDS`, `getUserOperationGroups(user)`.
- Produces: a funds group with eight entries and the renamed IDs `transfer` → title `账户间划转`, `unfreeze-funds` → title `解冻后台冻结`.

- [ ] **Step 1: Write the failing catalog test**

Replace the expected funds titles with:

```js
const funds = getUserOperationGroups({ status: 'active' })
  .find((group) => group.id === 'funds')

assert.deepEqual(funds.entries.map((entry) => entry.title), [
  '资金概况',
  '链上钱包',
  '客服入金',
  '账户间划转',
  '冻结全部资金',
  '解冻后台冻结',
  '划扣可用资金',
  '出金流水限制'
])
assert.doesNotMatch(JSON.stringify(funds.entries), /调账|后台划扣记录|手动上分地址/)
assert.match(getUserOperationEntry('transfer', {}).description, /总资产不变/)
assert.match(getUserOperationEntry('deduct-funds', {}).description, /减少用户可用资产/)
```

Also assert `USER_OPERATION_QUICK_IDS` no longer contains `adjust`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/userOperationEntryCenter.test.js`

Expected: FAIL because the old titles and extra entries remain.

- [ ] **Step 3: Implement the catalog cleanup**

In `userOperations.js`:

```js
export const USER_OPERATION_QUICK_IDS = Object.freeze([
  'detail', 'assets', 'deposit', 'freeze-account', 'all'
])
```

Remove the visible entries with IDs `adjust`, `deduction-records`, and `manual-credit-address`. Keep the stable `transfer` ID but set its title to `账户间划转` and description to `在用户内部账户之间移动资产，总资产不变`. Set `unfreeze-funds` title to `解冻后台冻结`. Set the deduction description to `永久减少用户可用资产并生成划扣记录`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test test/userOperationEntryCenter.test.js`

Expected: all catalog tests PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/admin/config/userOperations.js test/userOperationEntryCenter.test.js
git commit -m "refactor: simplify user operation catalog"
```

---

### Task 2: Remove the Combined VIP and Credit Adjustment Path

**Files:**
- Modify: `src/admin/components/user/UserOperations.vue`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Modify: `test/userControlUi.test.js`
- Modify: `test/userOperationEntryCenter.test.js`

**Interfaces:**
- Consumes: `UserOperations.open(action, returnFocus)` for `freeze`, `deposit`, and `transfer`.
- Produces: an orchestrator with no visible or programmatic `adjust` route; future `vip-level` and `credit-adjust` operations remain planned and independent.

- [ ] **Step 1: Write failing path-removal tests**

Add assertions:

```js
assert.doesNotMatch(userOperationsSource, /UserAdjustAction/)
assert.doesNotMatch(userOperationsSource, /adjustAction/)
assert.doesNotMatch(userListSource, /adjust:\s*'adjust'/)
assert.equal(getUserOperationEntry('vip-level', {}).status, 'planned')
assert.equal(getUserOperationEntry('credit-adjust', {}).status, 'planned')
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test test/userOperationEntryCenter.test.js test/userControlUi.test.js`

Expected: FAIL because `UserAdjustAction` and its handler mapping are still present.

- [ ] **Step 3: Remove the combined action from active paths**

Delete the `UserAdjustAction` import, ref, `open()` map entry, and template instance from `UserOperations.vue`. Remove `adjust: 'adjust'` from `regularActions` in `UserListPage.vue`. Do not delete `UserAdjustAction.vue` in this batch; keeping the file avoids breaking unknown imports while removing every visible and orchestrated path.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test test/userOperationEntryCenter.test.js test/userControlUi.test.js`

Expected: all focused tests PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/admin/components/user/UserOperations.vue src/pages/admin/user/UserListPage.vue test/userControlUi.test.js test/userOperationEntryCenter.test.js
git commit -m "refactor: remove combined user adjustment entry"
```

---

### Task 3: Give Detail and Funds Distinct Drawer Destinations

**Files:**
- Modify: `src/admin/components/user/UserDetailDrawer.vue`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Modify: `test/userOperationEntryCenter.test.js`
- Modify: `test/dialogSfcBehavior.test.js`

**Interfaces:**
- Consumes: `<UserDetailDrawer :visible :user :initial-tab :return-focus @close @closed />`.
- Produces: `initialTab: 'overview' | 'assets'`, with invalid values normalized to `overview`; `openUserDetail(user, initialTab, returnFocus)`.

- [ ] **Step 1: Write failing destination tests**

Add source-level assertions proving the explicit contract:

```js
assert.match(detailSource, /initialTab:\s*\{[^}]*default:\s*'overview'/s)
assert.match(detailSource, /\{ id: 'overview', label: '概览' \}/)
assert.match(listSource, /openUserDetail\(user, 'overview'/)
assert.match(listSource, /openUserDetail\(user, 'assets'/)
assert.match(listSource, /:initial-tab="detailInitialTab"/)
```

Add a mounted SFC test that opens the Drawer with `initialTab="overview"`, checks the overview content is visible, closes it, reopens with `initialTab="assets"`, and checks the asset heading is visible.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test test/userOperationEntryCenter.test.js test/dialogSfcBehavior.test.js`

Expected: FAIL because `initialTab` and the overview tab do not exist.

- [ ] **Step 3: Implement the explicit initial-tab contract**

Add to `UserDetailDrawer.vue`:

```js
initialTab: { type: String, default: 'overview' },
returnFocus: { type: [Object, Function], default: null }
```

Define `DETAIL_TABS`, normalize `props.initialTab`, initialize `activeTab` to `overview`, and reset it from `initialTab` whenever a new visible user opens. Add the first tab:

```js
{ id: 'overview', label: '概览' }
```

Render an overview body containing account identity, role, status, KYC, VIP level, credit score, parent, registration time, and last-login information. Keep the existing assets template under `activeTab === 'assets'`.

In `UserListPage.vue`, add `detailInitialTab = ref('overview')`; use `openUserDetail(user, 'overview')` for row and “详情” actions and `openUserDetail(user, 'assets')` for “资金” and `assets` operation actions. Bind `:initial-tab="detailInitialTab"`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test test/userOperationEntryCenter.test.js test/dialogSfcBehavior.test.js`

Expected: destination tests PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/admin/components/user/UserDetailDrawer.vue src/pages/admin/user/UserListPage.vue test/userOperationEntryCenter.test.js test/dialogSfcBehavior.test.js
git commit -m "feat: distinguish user overview and assets entry"
```

---

### Task 4: Migrate User Detail to the Shared Drawer Layer Lifecycle

**Files:**
- Modify: `src/admin/components/user/UserDetailDrawer.vue`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Modify: `src/pages/admin/customer-service/CustomerServiceWorkbenchPage.vue`
- Modify: `test/dialogSfcBehavior.test.js`
- Modify: `test/userOperationLayering.test.js`

**Interfaces:**
- Consumes: `useDialogLifecycle({ open, dialogRef, initialFocusRef, returnFocusRef, requestClose })`.
- Produces: dynamic `layerStyle`, `rendered`, `phase`, safe close behavior, and a `closed` event after the `150ms` leave animation.

- [ ] **Step 1: Write failing lifecycle and layering tests**

Assert the detail Drawer:

```js
assert.match(source, /useDialogLifecycle/)
assert.match(source, /:style="layerStyle"/)
assert.doesNotMatch(source, /fixed inset-0 z-50/)
assert.match(source, /role="dialog"/)
assert.match(source, /aria-modal="true"/)
assert.match(source, /data-testid="user-detail-drawer-body"[^>]*overflow-y-auto/)
assert.match(source, /drawer-detail-overlay-enter-active[^}]*200ms ease-out/)
assert.match(source, /drawer-detail-overlay-leave-active[^}]*150ms ease-in/)
```

Mount a parent operation Drawer and child detail Drawer through the lifecycle harness. Assert the child layer has a higher numeric `zIndex`, the parent becomes inert, Escape closes only the child, and focus returns after leave.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test test/dialogSfcBehavior.test.js test/userOperationLayering.test.js`

Expected: FAIL because the detail Drawer still uses fixed `z-50` and immediate unmounting.

- [ ] **Step 3: Implement shared lifecycle and compliant Drawer structure**

Use `rendered` and `phase` for deferred unmounting, apply `layerStyle` to a viewport-fixed `Teleport to="body"` overlay, and add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`. Keep the frame `overflow-hidden` and tag its single body scroller with `data-testid="user-detail-drawer-body"`. Wire the top-right close button and Escape through `createDialogCloseAction(requestDialogClose)`; emit `closed` from `onAfterLeave`.

Use overlay fades and a top-edge Drawer translation:

```css
.drawer-detail-overlay-enter-active { transition: opacity 200ms ease-out; }
.drawer-detail-overlay-leave-active { transition: opacity 150ms ease-in; }
.drawer-detail-panel-enter-active { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.drawer-detail-panel-leave-active { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.drawer-detail-panel-enter-from,
.drawer-detail-panel-leave-to { opacity: 0; transform: translateY(-100%); }
```

Under `prefers-reduced-motion: reduce`, use `50ms` fades and no translation. Do not add backdrop or gesture close handlers.

- [ ] **Step 4: Update both consumers**

Pass a stable `returnFocus` from the user-list row trigger when available. Keep customer-service behavior compatible by relying on the default `returnFocus = null`, and clear selected user state only from `@closed` so content remains stable through the closing animation.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test test/dialogSfcBehavior.test.js test/userOperationLayering.test.js test/customerServiceAdminNavigation.test.js`

Expected: all lifecycle, layering, and consumer tests PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add src/admin/components/user/UserDetailDrawer.vue src/pages/admin/user/UserListPage.vue src/pages/admin/customer-service/CustomerServiceWorkbenchPage.vue test/dialogSfcBehavior.test.js test/userOperationLayering.test.js test/customerServiceAdminNavigation.test.js
git commit -m "fix: add user detail drawer to shared layer stack"
```

---

### Task 5: Final Regression and Interaction Verification

**Files:**
- Modify only if a verification exposes a defect in files from Tasks 1–4.

**Interfaces:**
- Consumes: the completed visible catalog, distinct detail destinations, and shared lifecycle.
- Produces: verified entry structure and layer behavior without claiming planned operations are implemented.

- [ ] **Step 1: Run all automated tests**

Run: `npm test`

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run the production build and whitespace check**

Run: `npm run build`

Expected: Vite build succeeds.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 3: Verify the desktop flow in a browser**

Open user management, then verify:

1. “详情” opens “概览”.
2. “资金” opens “资产”.
3. The funds group shows eight first-level entries and no combined “调账”.
4. “账户间划转” opens above the operation Drawer; the parent remains mounted and inert.
5. Backdrop click does not close; Escape closes only the top layer; focus returns to the originating card after `150ms` leave.

- [ ] **Step 4: Verify responsive and reduced-motion behavior**

At `390×700`, verify the Drawer fits the viewport, the header close button stays visible, and only the body scrolls. Verify drag/swipe does not close. At 200% zoom and a low-height viewport, verify focusable controls remain reachable. With OS/browser reduced motion enabled, verify no translation and animation duration at most `50ms`.

- [ ] **Step 5: Commit verification fixes, if any**

```bash
git add src/admin/config/userOperations.js src/admin/components/user/UserOperations.vue src/admin/components/user/UserDetailDrawer.vue src/pages/admin/user/UserListPage.vue src/pages/admin/customer-service/CustomerServiceWorkbenchPage.vue test/userOperationEntryCenter.test.js test/userControlUi.test.js test/dialogSfcBehavior.test.js test/userOperationLayering.test.js test/customerServiceAdminNavigation.test.js
git commit -m "fix: address user operation entry verification"
```

If no fixes were required, do not create an empty commit.
