# User Funds Overview Stacked Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the existing user detail Drawer on its assets tab above the still-open user operation Drawer when “资金概况” is selected.

**Architecture:** Keep `UserListPage` as the layer orchestrator and reuse `openUserDetail(user, initialTab, returnFocus)`. Change only the `assets` action branch so the shared dialog layer system registers `UserDetailDrawer` above `UserOperationDrawer`; preserve the existing deferred close behavior for `detail` and the direct row shortcut behavior.

**Tech Stack:** Vue 3 Composition API, JavaScript ES modules, Node.js test runner, existing shared Drawer lifecycle.

## Global Constraints

- Do not close, unmount, or rebuild `UserOperationDrawer` when `assets` is selected.
- Open `UserDetailDrawer` with `initialTab === 'assets'` and the originating action button as `returnFocus`.
- Keep `detail` and row-level “资金” shortcut behavior unchanged.
- Do not modify Drawer UI, animation, scroll, backdrop, responsive layout, data, validation, or permissions.
- Preserve top-layer-only interaction, background isolation, and exactly-once focus return through the existing shared lifecycle.
- Do not overwrite unrelated dirty-worktree files.

---

### Task 1: Protect stacked funds-overview orchestration

**Files:**
- Modify: `test/userOperationEntryCenter.test.js`
- Test: `test/userOperationEntryCenter.test.js`

**Interfaces:**
- Consumes: `handleOperationDrawerAction({ id, user, trigger })` orchestration in `UserListPage.vue`.
- Produces: A regression test proving `assets` directly opens the assets detail layer without closing the operation layer.

- [ ] **Step 1: Write the failing test**

Replace the combined deferred shortcut source assertion with a focused `assets` branch contract:

```js
test('funds overview opens the assets detail layer without closing the operation drawer', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')
  const assetsBranch = source.match(/if \(id === 'assets'\) \{([\s\S]*?)\n  \}/)?.[1] || ''

  assert.match(assetsBranch, /openUserDetail\(user, 'assets', trigger\)/)
  assert.doesNotMatch(assetsBranch, /closeOperationDrawer\(\)/)
  assert.doesNotMatch(assetsBranch, /deferredDrawerAction/)
})
```

Retain the existing assertions that `UserDetailDrawer` supports the assets tab and that the list-row shortcut calls `openUserDetail(user, 'assets', ...)`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-name-pattern="funds overview opens" test/userOperationEntryCenter.test.js`

Expected: FAIL because no dedicated `if (id === 'assets')` branch exists yet.

### Task 2: Open assets as a child Drawer

**Files:**
- Modify: `src/pages/admin/user/UserListPage.vue`
- Test: `test/userOperationEntryCenter.test.js`

**Interfaces:**
- Consumes: `openUserDetail(user, initialTab = 'overview', returnFocus = null)`.
- Produces: An `assets` action branch that opens the existing detail Drawer above the operation Drawer.

- [ ] **Step 1: Add the minimal orchestration branch**

Insert before the deferred `detail` branch:

```js
if (id === 'assets') {
  openUserDetail(user, 'assets', trigger)
  return
}

if (id === 'detail') {
  deferredDrawerAction.value = { id, user }
  closeOperationDrawer()
  return
}
```

- [ ] **Step 2: Run the focused and file-level tests to verify GREEN**

Run:

```bash
node --test --test-name-pattern="funds overview opens" test/userOperationEntryCenter.test.js
node --test test/userOperationEntryCenter.test.js
```

Expected: both commands PASS with no failures.

### Task 3: Verify layer lifecycle and scope

**Files:**
- Verify: `test/dialogLifecycle.test.js`
- Verify: `test/dialogSfcBehavior.test.js`
- Verify: `test/userCreditMembershipLayering.test.js`
- Verify: `src/pages/admin/user/UserListPage.vue`
- Verify: `test/userOperationEntryCenter.test.js`

**Interfaces:**
- Consumes: Shared `useDialogLifecycle` layer registration, inert handling, scroll locking, and focus restoration.
- Produces: Regression evidence that the existing nested Drawer lifecycle remains valid.

- [ ] **Step 1: Run relevant regression tests**

Run:

```bash
node --test test/dialogLifecycle.test.js test/dialogSfcBehavior.test.js test/userCreditMembershipLayering.test.js test/userOperationEntryCenter.test.js
```

Expected: all tests PASS.

- [ ] **Step 2: Run the main test directory and diff check**

Run:

```bash
node --test test
git diff --check -- src/pages/admin/user/UserListPage.vue test/userOperationEntryCenter.test.js docs/superpowers/plans/2026-07-26-user-funds-overview-stacked-detail.md
```

Expected: 0 failures and no diff-check output.

- [ ] **Step 3: Review and commit only scoped paths**

```bash
git add src/pages/admin/user/UserListPage.vue test/userOperationEntryCenter.test.js docs/superpowers/plans/2026-07-26-user-funds-overview-stacked-detail.md
git commit -m "fix: keep user operations open for funds overview"
```

