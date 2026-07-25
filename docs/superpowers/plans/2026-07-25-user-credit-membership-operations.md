# User Credit and Membership Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the five user-scoped credit and membership operation entries with atomic data changes, complete audit records, and correctly ordered two-, three-, and four-layer modal flows.

**Architecture:** A focused repository owns credit reviews, recharge history, VIP changes, rebates, and all mutations to the existing user rows. Focused Vue surfaces consume detached repository snapshots and emit intent events; `UserListPage` owns selection, dynamic layer orchestration, one dedicated MFA flow, and refreshes every live user copy after success.

**Tech Stack:** Vue 3 Composition API, Tailwind CSS, existing `useDialogLifecycle` and `useMfaActionFlow`, Node.js built-in test runner, Vite.

## Global Constraints

- Keep `UserOperationDrawer` mounted and open while every child surface is active.
- Layer order is dynamic: operation Drawer → business Drawer/Dialog → review decision Dialog when applicable → MFA Dialog.
- Every modal surface teleports to `body`, uses the shared layer stack, and has no local fixed `z-index`.
- Backdrop clicks, drag, and swipe never close Dialogs or Drawers.
- Frames use `overflow-hidden`; only body regions use `overflow-y-auto`; fixed headers retain a visible `aria-label="关闭"` button unless MFA is actively blocking exit.
- Dialog animation is `200ms ease-out` open and `150ms ease-in` close with `scale(0.96)`; right Drawer animation uses the same timings with right-edge translation. Reduced motion removes transform and lasts at most `50ms`.
- Preserve focus trap, topmost-only Escape, inert lower layers, scroll lock, and return focus until the closing animation completes.
- Write operations validate before mutation, are atomic, require MFA, prevent duplicate execution, and append an audit row. Failures keep the active surface open and focus a textual error.
- Support `vh` fallback plus dynamic viewport units, safe-area padding, narrow single-column forms, low-height viewports, virtual keyboards, and 200% zoom.
- Use test-first RED → GREEN cycles. Do not modify production files before the corresponding failing test is observed.

---

### Task 1: Atomic Credit and Membership Repository

**Files:**
- Create: `src/admin/repositories/userCreditMembershipRepository.js`
- Create: `test/userCreditMembershipRepository.test.js`

**Interfaces:**
- Consumes: `usersList` from `src/admin/mock/user.js`, `getActiveVipLevels()` from `src/admin/mock/vip.js`.
- Produces: `getCreditMembershipSnapshot(userId)`, `getUserCreditReviews(userId)`, `getUserRechargeSummary(userId)`, `getUserMembershipAuditLog({ userId?, type? })`, `adjustUserCredit({ userId, direction, points, reason, operatorId })`, `setUserVipLevel({ userId, vipLevel, reason, operatorId })`, `decideUserCreditReview({ userId, reviewId, decision, note, operatorId })`, `grantUserRebate({ userId, amount, reason, operatorId })`, and `__resetUserCreditMembershipStateForTests()`.

- [ ] **Step 1: Write failing query and mutation tests**

```js
test('credit adjustment validates the exact result and records one audit', () => {
  const before = getCreditMembershipSnapshot('user_1004')
  const result = adjustUserCredit({ userId: 'user_1004', direction: 'increase', points: 12, reason: '风险复核完成', operatorId: 'admin_current' })
  assert.equal(result.user.creditScore, before.user.creditScore + 12)
  assert.equal(getUserMembershipAuditLog({ userId: 'user_1004', type: 'credit-adjust' }).length, 1)
})

test('review approval is owned, one-time, and atomic with its score change', () => {
  const [review] = getUserCreditReviews('user_1004').filter((row) => row.status === 'pending')
  const result = decideUserCreditReview({ userId: 'user_1004', reviewId: review.id, decision: 'approve', note: '材料有效', operatorId: 'admin_current' })
  assert.equal(result.review.status, 'approved')
  assert.equal(result.user.creditScore, review.proposedScore)
  assert.throws(() => decideUserCreditReview({ userId: 'user_1004', reviewId: review.id, decision: 'reject', note: '重复', operatorId: 'admin_current' }), /已处理/)
})

test('VIP and rebate commands update coherent user fields and financial IDs', () => {
  const vip = setUserVipLevel({ userId: 'user_1004', vipLevel: 2, reason: '运营调整', operatorId: 'admin_current' })
  assert.equal(vip.user.vipLevel, 2)
  assert.equal(vip.user.isVip, true)
  const rebate = grantUserRebate({ userId: 'user_1004', amount: '25.50', reason: '活动返利', operatorId: 'admin_current' })
  assert.match(rebate.transactionId, /^REB-/)
  assert.equal(rebate.user.balance, vip.user.balance + 25.5)
})
```

Also assert detached query results, deterministic recharge totals/progress, integer credit points, score range, enabled VIP targets, same-level rejection, two-decimal rebate validation, review ownership, missing reasons/notes, and no state or audit changes after every failure.

- [ ] **Step 2: Run the repository test and verify RED**

Run: `node --test test/userCreditMembershipRepository.test.js`  
Expected: FAIL because `userCreditMembershipRepository.js` does not exist.

- [ ] **Step 3: Implement the repository**

Use private seed factories rather than exported mutable arrays. Seed one pending review and several recharge rows for `user_1004`, plus deterministic recharge rows for every current demo user. Clone all query and command results. Validate all arguments before changing `usersList`, review state, or audit state. Use score bounds `0..1000`, `MEM-${Date.now()}-${sequence}` audit IDs, and `REB-${Date.now()}-${sequence}` rebate transaction IDs. On approved reviews, set the score to the review’s stored `proposedScore`; rejection leaves the score unchanged.

- [ ] **Step 4: Run repository tests and verify GREEN**

Run: `node --test test/userCreditMembershipRepository.test.js`  
Expected: all repository tests PASS.

- [ ] **Step 5: Commit the repository**

```bash
git add src/admin/repositories/userCreditMembershipRepository.js test/userCreditMembershipRepository.test.js
git commit -m "feat: add user credit membership repository"
```

---

### Task 2: Read-Only Cumulative Recharge Drawer

**Files:**
- Create: `src/admin/components/user/UserRechargeSummaryDrawer.vue`
- Create: `test/userCreditMembershipComponents.test.js`

**Interfaces:**
- Consumes props: `visible`, `user`, `summary`, `returnFocus`.
- Produces events: `close`, `closed`.

- [ ] **Step 1: Write failing Drawer contract tests**

Read the SFC source and assert it imports `useDialogLifecycle`, teleports to `body`, binds `rendered` and `layerStyle`, renders `role="dialog"`, `aria-modal="true"`, `aria-labelledby="user-recharge-summary-title"`, a fixed header close with `aria-label="关闭"`, an `overflow-hidden` frame, exactly one body marked `data-testid="user-recharge-summary-body"` with `overflow-y-auto`, cumulative/qualifying/next-level fields, recharge record fields, no submit footer, 200/150ms right-edge animation, reduced-motion 50ms/no transform, `vh` plus `dvh`, and safe-area classes or styles.

- [ ] **Step 2: Run the component test and verify RED**

Run: `node --test test/userCreditMembershipComponents.test.js`  
Expected: FAIL because `UserRechargeSummaryDrawer.vue` does not exist.

- [ ] **Step 3: Implement the Drawer**

Use a fixed full-viewport overlay and a right-aligned flex frame. Focus the title on open because the content is read-only and potentially long. Render progress with text plus a visual bar, then a compact record list/card layout that preserves amount, qualifying amount, source, transaction ID, and time on narrow screens. No backdrop, drag, or swipe handler may mutate `visible`.

- [ ] **Step 4: Run component tests and verify GREEN**

Run: `node --test test/userCreditMembershipComponents.test.js`  
Expected: recharge Drawer tests PASS.

- [ ] **Step 5: Commit the Drawer**

```bash
git add src/admin/components/user/UserRechargeSummaryDrawer.vue test/userCreditMembershipComponents.test.js
git commit -m "feat: add user recharge summary drawer"
```

---

### Task 3: Credit, VIP, and Rebate Mutation Dialog

**Files:**
- Create: `src/admin/components/user/UserMembershipMutationDialog.vue`
- Modify: `test/userCreditMembershipComponents.test.js`

**Interfaces:**
- Consumes props: `visible`, `user`, `mode: 'credit' | 'vip' | 'rebate'`, `snapshot`, `busy`, `returnFocus`.
- Produces events: `close`, `closed`, `request-mfa` with `{ type, payload, returnFocus }`, where type is `credit-adjust`, `vip-level-set`, or `rebate-grant`.

- [ ] **Step 1: Write failing two-stage Dialog tests**

Assert the SFC uses the shared lifecycle and dynamic layer, fixed-frame semantics, accessible title/close/error, required animation/reduced-motion rules, `stage = ref('edit')`, “下一步”, “返回修改”, and “提交并验证”. Assert credit mode uses direction and integer points and previews `creditScore`; VIP mode lists enabled levels, rejects the current level, displays benefits, and previews upgrade/downgrade; rebate mode uses a two-decimal amount and previews `balance`. Assert emitted payloads trim reasons and return `submitButtonRef.value` for MFA focus restoration.

- [ ] **Step 2: Run the component test and verify RED**

Run: `node --test test/userCreditMembershipComponents.test.js`  
Expected: FAIL on the missing mutation Dialog assertions.

- [ ] **Step 3: Implement the mode-driven Dialog**

Keep form reset, validation, preview calculation, and mode copy in small computed helpers. Use `closeDisabled = computed(() => props.busy)`. Initial focus is direction for credit, the target-level control for VIP, and amount for rebate. Confirmation focuses the non-destructive “返回修改” control. Do not import or call the repository from the component.

- [ ] **Step 4: Run component tests and verify GREEN**

Run: `node --test test/userCreditMembershipComponents.test.js`  
Expected: mutation Dialog tests PASS.

- [ ] **Step 5: Commit the Dialog**

```bash
git add src/admin/components/user/UserMembershipMutationDialog.vue test/userCreditMembershipComponents.test.js
git commit -m "feat: add user membership mutation dialog"
```

---

### Task 4: User Credit Review Drawer

**Files:**
- Create: `src/admin/components/user/UserCreditReviewDrawer.vue`
- Modify: `test/userCreditMembershipComponents.test.js`

**Interfaces:**
- Consumes props: `visible`, `user`, `reviews`, `busy`, `returnFocus`.
- Produces events: `close`, `closed`, `select-review` with `{ review, returnFocus }`.

- [ ] **Step 1: Write failing review Drawer tests**

Assert shared Drawer lifecycle, right-edge motion, body-only scrolling, fixed accessible header/close, pending count, status filter buttons, pending-before-history ordering copy, empty state, compact review identity/delta/reason/time/status fields, and a pending-only “处理审核” button that emits its DOM element as `returnFocus`.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test test/userCreditMembershipComponents.test.js`  
Expected: FAIL because the review Drawer does not exist.

- [ ] **Step 3: Implement the review Drawer**

Use `useDialogLifecycle` and focus its title on open. Keep filter state local and reset it after leave. Sort detached input without mutating the prop. While `busy`, disable closing and review selection. Preserve long reasons and identity text without hiding the action at narrow widths.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test test/userCreditMembershipComponents.test.js`  
Expected: review Drawer tests PASS.

- [ ] **Step 5: Commit the review Drawer**

```bash
git add src/admin/components/user/UserCreditReviewDrawer.vue test/userCreditMembershipComponents.test.js
git commit -m "feat: add user credit review drawer"
```

---

### Task 5: Credit Review Decision Dialog

**Files:**
- Create: `src/admin/components/user/UserCreditReviewDecisionDialog.vue`
- Modify: `test/userCreditMembershipComponents.test.js`

**Interfaces:**
- Consumes props: `visible`, `user`, `review`, `busy`, `returnFocus`.
- Produces events: `close`, `closed`, `request-mfa` with `{ type: 'credit-review-decide', payload: { userId, reviewId, decision, note }, returnFocus }`.

- [ ] **Step 1: Write failing decision Dialog tests**

Assert it shows before/proposed score, signed delta, application reason/operator/time, explicit approve/reject selection, required note, two-stage confirmation, textual error focus, shared lifecycle and dynamic layer, fixed frame, motion rules, busy guards, and an MFA event whose return focus is the submit button.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test test/userCreditMembershipComponents.test.js`  
Expected: FAIL because the decision Dialog does not exist.

- [ ] **Step 3: Implement the decision Dialog**

Default to no decision selected so an irreversible choice is never assumed. Require a trimmed note of 1–200 characters. Confirmation copy clearly distinguishes approval changing the score from rejection preserving it. Keep the Dialog mounted and non-closeable while MFA is open/loading.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test test/userCreditMembershipComponents.test.js`  
Expected: all membership component tests PASS.

- [ ] **Step 5: Commit the decision Dialog**

```bash
git add src/admin/components/user/UserCreditReviewDecisionDialog.vue test/userCreditMembershipComponents.test.js
git commit -m "feat: add user credit review decision dialog"
```

---

### Task 6: Operation Entries, Four-Layer Orchestration, and MFA

**Files:**
- Modify: `src/admin/config/userOperations.js`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Modify: `test/userOperationEntryCenter.test.js`
- Create: `test/userCreditMembershipLayering.test.js`

**Interfaces:**
- Consumes all Task 1 repository APIs and Task 2–5 components.
- Produces available handlers: `credit-review`, `credit-adjust`, `vip-level`, `vip-deposit-total`, `rebate-reward`, plus a dedicated membership MFA flow.

- [ ] **Step 1: Write failing operation and orchestration tests**

Assert all five catalog entries use `status: 'available'` and a matching handler. Assert `UserListPage` imports every new component and repository command, opens each second-layer surface inside `handleOperationDrawerAction` without calling `closeOperationDrawer`, opens the review decision without closing the review Drawer, renders the business components after `UserOperationDrawer`, creates a separate `useMfaActionFlow`, renders a separate `MfaVerificationModal`, passes `busy` to the originating second/third layer, and refreshes `users`, `operationDrawerUser`, and each active snapshot after success.

- [ ] **Step 2: Run orchestration tests and verify RED**

Run: `node --test test/userOperationEntryCenter.test.js test/userCreditMembershipLayering.test.js`  
Expected: FAIL because entries remain planned and orchestration is absent.

- [ ] **Step 3: Integrate state and open/close handlers**

Add separate state for review Drawer, decision Dialog, recharge Drawer, mutation Dialog, repository snapshots, and every return-focus target. Branch by entry ID before legacy actions. Opening a child must never write `operationDrawerOpen = false`. Clearing selected data happens only from each child’s `closed` event after leave.

- [ ] **Step 4: Implement the dedicated MFA dispatcher**

```js
if (action.type === 'credit-adjust') return adjustUserCredit({ ...action.payload, operatorId: 'admin_current' })
if (action.type === 'vip-level-set') return setUserVipLevel({ ...action.payload, operatorId: 'admin_current' })
if (action.type === 'rebate-grant') return grantUserRebate({ ...action.payload, operatorId: 'admin_current' })
if (action.type === 'credit-review-decide') return decideUserCreditReview({ ...action.payload, operatorId: 'admin_current' })
```

Capture the affected user ID before `useMfaActionFlow` clears its pending action. On success, call a single refresh helper that replaces the matching `users` row, `operationDrawerUser`, active business users, repository snapshots, review rows, and recharge summary. Close only the completed business path; for review decisions, close the decision Dialog but keep the review Drawer open with refreshed history. MFA cancellation leaves the originating form and layer open.

- [ ] **Step 5: Render in deterministic stack order**

Render `UserOperationDrawer`, then second-layer Drawers/Dialogs, then `UserCreditReviewDecisionDialog`, then the membership `MfaVerificationModal`. Pass the originating submit control as MFA `returnFocus`. Let `useDialogLifecycle` assign z-index from registration order rather than CSS constants.

- [ ] **Step 6: Run integration tests and build**

Run: `node --test test/userOperationEntryCenter.test.js test/userCreditMembershipRepository.test.js test/userCreditMembershipComponents.test.js test/userCreditMembershipLayering.test.js && npm run build`  
Expected: all targeted tests PASS and Vite build exits 0.

- [ ] **Step 7: Commit integration**

```bash
git add src/admin/config/userOperations.js src/pages/admin/user/UserListPage.vue test/userOperationEntryCenter.test.js test/userCreditMembershipLayering.test.js
git commit -m "feat: integrate user credit membership operations"
```

---

### Task 7: Full Verification and Remediation

**Files:**
- Modify only files implicated by verification failures.
- Test: all files under `test/`.

**Interfaces:**
- Consumes the completed credit and membership batch.
- Produces verified automated behavior and an explicit manual-verification report.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`  
Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run production and diff checks**

Run: `npm run build`  
Expected: Vite exits 0.  
Run: `git diff --check`  
Expected: no output.

- [ ] **Step 3: Verify runtime layer behavior where browser tooling is available**

At 1440×900 and 390×700, verify operation Drawer → review Drawer → decision Dialog → MFA. Confirm increasing dynamic z-index, only MFA interactive, backdrop clicks do nothing, one Escape closes only MFA, cancel returns focus to the decision submit button without clearing its form, then decision close returns focus to its review row. Verify mutation Dialog → MFA similarly. Check long content body-only scrolling and fixed close/actions.

- [ ] **Step 4: Verify responsive and accessibility states**

Check 1280×720, low-height landscape, 200% zoom, keyboard-only focus loops, touch targets, virtual keyboard, four safe areas, reduced motion, long translated text, async duplicate submission, repository/MFA errors, rapid reopen, route change, and unmount cleanup. Record every unavailable check as unverified with the exact manual action required.

- [ ] **Step 5: Fix any observed failure with a new RED → GREEN test**

For each failure, add a test that fails for that exact behavior, observe RED, patch the smallest production unit, rerun the targeted test to GREEN, then rerun Steps 1 and 2.

- [ ] **Step 6: Commit verification fixes if any**

If Step 5 changed files, inspect `git status --short`, stage each reported credit/membership implementation or test path explicitly, and run `git commit -m "fix: address credit membership verification"`. If Step 5 made no changes, skip this commit.
