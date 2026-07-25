# User Funds Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement freeze-all, admin-unfreeze, available-funds deduction, and per-user withdrawal-turnover restriction from the user operation Drawer with safe three-layer MFA interaction.

**Architecture:** A focused repository owns all balance/rule validation, mutations, source tracking, and audit data. Two focused Dialog components collect and confirm commands; `UserListPage` coordinates those Dialogs with a dedicated `useMfaActionFlow` instance and refreshes the same user object after successful execution.

**Tech Stack:** Vue 3 Composition API, Tailwind CSS, existing `useDialogLifecycle` and `MfaVerificationModal`, Node test runner, Vite.

## Global Constraints

- Freeze moves all current `balance` to `frozenBalance` and increments only the tracked admin-frozen source.
- Admin unfreeze releases only the tracked admin-frozen source and never makes `frozenBalance` negative.
- Deduction permanently reduces available balance and creates an immutable transaction ID.
- User withdrawal turnover rules remain independent from global withdrawal amount policies.
- The visible stack is operation Drawer → business Dialog → MFA Dialog, with dynamic shared layers and only the top layer interactive.
- Backdrop, drag, and swipe never close a Dialog or Drawer.
- Dialog frame is `overflow-hidden`; only its body is `overflow-y-auto`; header close and footer actions remain fixed.
- Open uses `200ms ease-out`; close uses `150ms ease-in`; reduced motion removes scaling and uses at most `50ms` fades.
- All repository writes validate fully before mutation and append exactly one audit record on success.

---

### Task 1: Atomic Funds Repository

**Files:**
- Create: `src/admin/repositories/userFundsRepository.js`
- Create: `test/userFundsRepository.test.js`

**Interfaces:**
- Consumes: `usersList` from `src/admin/mock/user.js`.
- Produces: `getFundsSnapshot`, `freezeAllAvailable`, `unfreezeAdminFunds`, `deductAvailableFunds`, `getWithdrawFlowLimit`, `setWithdrawFlowLimit`, `removeWithdrawFlowLimit`, `getFundsAuditLog`, and `__resetUserFundsStateForTests`.

- [ ] **Step 1: Write failing repository tests**

Use a known user and restore its balances after each test. Cover these real calls:

```js
const frozen = freezeAllAvailable({ userId, reason: '风险排查', operatorId: 'admin_current' })
assert.equal(frozen.balance, 0)
assert.equal(frozen.adminFrozenAmount, balanceBefore)

const unfrozen = unfreezeAdminFunds({ userId, reason: '排查完成', operatorId: 'admin_current' })
assert.equal(unfrozen.balance, balanceBefore)
assert.equal(unfrozen.frozenBalance, originalFrozen)

const deducted = deductAvailableFunds({ userId, amount: 25.5, reason: '人工纠错', operatorId: 'admin_current' })
assert.equal(deducted.balance, balanceBefore - 25.5)
assert.match(deducted.transactionId, /^UF-/)
```

Also assert failure atomicity for zero balance, no tracked admin freeze, invalid precision, insufficient balance, invalid/expired flow dates, and missing reasons.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test test/userFundsRepository.test.js`

Expected: FAIL because the repository module does not exist.

- [ ] **Step 3: Implement validation and mutations**

Normalize money with:

```js
const parseMoney = (value, label) => {
  const raw = String(value ?? '').trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error(`${label}最多保留两位小数`)
  const amount = Number(raw)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`${label}必须大于 0`)
  return amount
}
```

Use private maps for admin-frozen amounts and flow limits plus a private audit array. Clone all snapshots returned to callers. Validate before any `Object.assign` or array push. Use `UF-${Date.now()}-${sequence}` for transaction IDs and `funds-${Date.now()}-${sequence}` for audit IDs.

- [ ] **Step 4: Run repository tests and verify GREEN**

Run: `node --test test/userFundsRepository.test.js`

Expected: all repository tests PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/admin/repositories/userFundsRepository.js test/userFundsRepository.test.js
git commit -m "feat: add atomic user funds repository"
```

---

### Task 2: Funds Mutation Dialog

**Files:**
- Create: `src/admin/components/user/UserFundsMutationDialog.vue`
- Create: `test/userFundsComponents.test.js`

**Interfaces:**
- Consumes props: `visible`, `user`, `mode: 'freeze' | 'unfreeze' | 'deduct'`, `snapshot`, `busy`, `returnFocus`.
- Produces events: `close`, `closed`, `request-mfa` with `{ type, payload, returnFocus }`.

- [ ] **Step 1: Write failing component-contract tests**

Assert the source uses `useDialogLifecycle`, `layerStyle`, `rendered`, fixed header/footer, one body scroller, `aria-modal`, `aria-labelledby`, close label, 200/150ms animations, reduced motion, edit/confirm stages, and mode-specific titles. Assert the request payload contains `userId`, `amount` only for deduction, and trimmed `reason`.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test test/userFundsComponents.test.js`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the two-stage Dialog**

Use `stage = ref('edit')`, `amount`, `reason`, and a focusable error summary. Compute before/after values from the passed snapshot without mutating it. In confirmation, focus a `ref` on the “返回修改” button. Emit:

```js
emit('request-mfa', {
  type: modeToType[props.mode],
  payload: { userId: userId.value, amount: parsedAmount.value, reason: reason.value.trim() },
  returnFocus: submitButtonRef.value
})
```

While `busy`, disable every close and submit path and pass `canClose: () => !props.busy` to `useDialogLifecycle`.

- [ ] **Step 4: Run component tests and verify GREEN**

Run: `node --test test/userFundsComponents.test.js`

Expected: mutation Dialog tests PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/admin/components/user/UserFundsMutationDialog.vue test/userFundsComponents.test.js
git commit -m "feat: add user funds mutation dialog"
```

---

### Task 3: Withdrawal Turnover Limit Dialog

**Files:**
- Create: `src/admin/components/user/UserWithdrawFlowLimitDialog.vue`
- Modify: `test/userFundsComponents.test.js`

**Interfaces:**
- Consumes props: `visible`, `user`, `limit`, `busy`, `returnFocus`.
- Produces events: `close`, `closed`, `request-mfa` with type `flow-limit-set` or `flow-limit-remove`.

- [ ] **Step 1: Write failing flow-limit Dialog tests**

Assert current status/remaining turnover appear, fields bind `requiredTurnover`, `completedTurnover`, `expiresAt`, and `reason`, and existing rules expose a separate removal confirmation. Assert set and remove requests both route through `request-mfa` and not a direct repository import.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test test/userFundsComponents.test.js`

Expected: FAIL because the flow-limit component does not exist.

- [ ] **Step 3: Implement the flow-limit Dialog**

Reset the form from `limit` on each closed→open transition. Validate numeric precision, `completedTurnover <= requiredTurnover`, future expiration, and required reason before showing a confirmation stage. Removal uses its own `removeReason` and confirmation copy. Keep the same lifecycle, focus, scroll, close, animation, and busy contracts as Task 2.

- [ ] **Step 4: Run component tests and verify GREEN**

Run: `node --test test/userFundsComponents.test.js`

Expected: all funds component tests PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/admin/components/user/UserWithdrawFlowLimitDialog.vue test/userFundsComponents.test.js
git commit -m "feat: add withdrawal turnover limit dialog"
```

---

### Task 4: Operation Drawer, Dedicated MFA, and User Refresh Integration

**Files:**
- Modify: `src/admin/config/userOperations.js`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Modify: `test/userOperationEntryCenter.test.js`
- Modify: `test/userOperationLayering.test.js`
- Modify: `test/userFundsComponents.test.js`

**Interfaces:**
- Consumes repository APIs from Task 1 and Dialog events from Tasks 2–3.
- Produces available handlers `freeze-funds`, `unfreeze-funds`, `deduct-funds`, `withdraw-flow-limit`, plus a dedicated funds MFA flow.

- [ ] **Step 1: Write failing integration tests**

Assert all four catalog entries have `status: 'available'` and matching handlers. Assert `UserListPage` imports both Dialogs and the repository, opens the correct second layer inside `handleOperationDrawerAction`, creates a second `useMfaActionFlow`, renders a funds `MfaVerificationModal`, updates `users`, `operationDrawerUser`, and active Dialog user after success, and preserves the parent operation Drawer.

- [ ] **Step 2: Run integration tests and verify RED**

Run: `node --test test/userOperationEntryCenter.test.js test/userOperationLayering.test.js test/userFundsComponents.test.js`

Expected: FAIL because entries remain planned and orchestration is absent.

- [ ] **Step 3: Activate catalog handlers**

Set each entry to `status: 'available'` and its handler equal to its ID. Keep existing risk levels and titles.

- [ ] **Step 4: Implement Dialog orchestration**

Add state for mutation mode/user/snapshot/return focus and flow-limit user/rule/return focus. In `handleOperationDrawerAction`, open the corresponding Dialog without closing `operationDrawerOpen`.

Create a dedicated funds MFA flow whose execute switch calls exactly one repository function:

```js
if (action.type === 'freeze-funds') return freezeAllAvailable({ ...action.payload, operatorId: 'admin_current' })
if (action.type === 'unfreeze-funds') return unfreezeAdminFunds({ ...action.payload, operatorId: 'admin_current' })
if (action.type === 'deduct-funds') return deductAvailableFunds({ ...action.payload, operatorId: 'admin_current' })
if (action.type === 'flow-limit-set') return setWithdrawFlowLimit({ ...action.payload, operatorId: 'admin_current' })
if (action.type === 'flow-limit-remove') return removeWithdrawFlowLimit({ ...action.payload, operatorId: 'admin_current' })
```

On success, replace matching rows with the latest repository snapshot, update `operationDrawerUser`, then close the active business Dialog. Canceling MFA only clears the pending MFA action and keeps the business form open.

- [ ] **Step 5: Render and wire all three layers**

Render both business Dialogs after `UserOperationDrawer`, then render a second `MfaVerificationModal` with `returnFocus` pointing to the originating business submit button. Pass `busy="fundsMfaOpen || fundsMfaLoading"` to both business Dialogs.

- [ ] **Step 6: Run integration tests and verify GREEN**

Run: `node --test test/userOperationEntryCenter.test.js test/userOperationLayering.test.js test/userFundsComponents.test.js test/mfaBehavior.test.js`

Expected: all integration and MFA regression tests PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/admin/config/userOperations.js src/pages/admin/user/UserListPage.vue test/userOperationEntryCenter.test.js test/userOperationLayering.test.js test/userFundsComponents.test.js
git commit -m "feat: integrate user funds controls with MFA"
```

---

### Task 5: Full Verification

**Files:**
- Modify only Task 1–4 files when verification finds a defect.

**Interfaces:**
- Consumes the complete funds-control batch.
- Produces fresh automated and interaction evidence.

- [ ] **Step 1: Run the full suite**

Run: `npm test`

Expected: zero failures.

- [ ] **Step 2: Run build and whitespace verification**

Run: `npm run build`

Expected: Vite exits successfully.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 3: Verify real layered interaction**

At desktop size, open operation Drawer → freeze Dialog → MFA. Verify parent and business layer remain mounted/inert, z-index increases per layer, backdrop click does not close, Escape closes only MFA, cancel preserves the business form, success refreshes balances, and closing the business Dialog returns focus to its operation card.

- [ ] **Step 4: Verify responsive behavior**

At `390×700` and a low-height viewport, verify only Dialog bodies scroll and fixed close/actions remain visible. Verify drag/swipe does not close. Check 200% zoom, long reason text, virtual keyboard, safe areas, and OS reduced motion; report every check not actually executed.

- [ ] **Step 5: Commit verification fixes if required**

```bash
git add src/admin/repositories/userFundsRepository.js src/admin/components/user/UserFundsMutationDialog.vue src/admin/components/user/UserWithdrawFlowLimitDialog.vue src/admin/config/userOperations.js src/pages/admin/user/UserListPage.vue test/userFundsRepository.test.js test/userFundsComponents.test.js test/userOperationEntryCenter.test.js test/userOperationLayering.test.js
git commit -m "fix: address user funds control verification"
```

Do not create an empty commit when verification requires no fixes.
