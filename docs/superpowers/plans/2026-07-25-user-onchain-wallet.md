# User On-chain Wallet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the final “链上钱包” user-operation entry as a read-only right Drawer above the existing operation Drawer.

**Architecture:** A focused repository owns deterministic per-user address records. `UserOnchainWalletDrawer.vue` owns presentation-only state such as address reveal and copy feedback. `UserListPage.vue` orchestrates the second layer without closing `UserOperationDrawer`.

**Tech Stack:** Vue 3 `<script setup>`, Tailwind CSS, Node test runner, Vue Test Utils, existing `useDialogLifecycle` layer stack.

## Global Constraints

- Backdrop, drag, and swipe never close the Drawer; only intentional in-Drawer actions and allowed Escape close it.
- Drawer uses `Teleport to="body"`, the shared dynamic layer stack, a fixed non-scrolling frame, and one `overflow-y-auto` body.
- Open animation is `200ms ease-out`; close is `150ms ease-in`; reduced motion removes translation and is at most `50ms`.
- The parent operation Drawer remains mounted and inert below the wallet Drawer; focus returns to the originating operation card after close animation.
- Wallet data is read-only and does not require MFA.

---

### Task 1: Read-only wallet repository

**Files:**
- Create: `src/admin/repositories/userOnchainWalletRepository.js`
- Create: `test/userOnchainWalletRepository.test.js`

**Interfaces:**
- Produces: `getUserOnchainWallet(userId: string): { userId: string, addresses: WalletAddress[] }`
- `WalletAddress`: `{ id, userId, kind, coin, network, address, label, status, firstUsedAt, lastUsedAt }`

- [ ] **Step 1: Write failing repository tests**

Test deterministic data for `user_1004`, assert both `deposit` and `withdrawal` records, stable IDs, required fields, unknown-user empty data, and deep-copy isolation by mutating the first result and comparing a second call.

- [ ] **Step 2: Verify RED**

Run: `node --test test/userOnchainWalletRepository.test.js`

Expected: FAIL because `userOnchainWalletRepository.js` does not exist.

- [ ] **Step 3: Implement deterministic records**

Create frozen seed data for `user_1004` and a deterministic fallback generator for known/unknown IDs. Normalize `userId` with `String`, validate non-empty IDs, and return `structuredClone`-equivalent JSON-safe copies.

- [ ] **Step 4: Verify GREEN**

Run: `node --test test/userOnchainWalletRepository.test.js`

Expected: all repository tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/repositories/userOnchainWalletRepository.js test/userOnchainWalletRepository.test.js
git commit -m "feat: add user onchain wallet repository"
```

### Task 2: Wallet Drawer behavior

**Files:**
- Create: `src/admin/components/user/UserOnchainWalletDrawer.vue`
- Create: `test/userOnchainWalletDrawer.test.js`

**Interfaces:**
- Consumes props: `visible: boolean`, `user: object|null`, `wallet: object|null`, `returnFocus: HTMLElement|Function|null`
- Emits: `close`, `closed`

- [ ] **Step 1: Write failing real-mount tests**

Mount the SFC with the existing Vue test helper. Assert the title and user identity, default deposit segment, intentional-only close, reveal/hide behavior, successful copy feedback, failed copy text alert, segment switch, empty state, leave-frame retention, and post-leave focus return.

- [ ] **Step 2: Write failing source-contract tests**

Assert `Teleport to="body"`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, fixed top-right `aria-label="关闭"`, one body scroller, `100vh` plus `100dvh`, safe-area padding, required 200/150/50ms motion, shared `useDialogLifecycle`, and absence of backdrop click/drag/swipe close handlers.

- [ ] **Step 3: Verify RED**

Run: `node --test test/userOnchainWalletDrawer.test.js`

Expected: FAIL because `UserOnchainWalletDrawer.vue` does not exist.

- [ ] **Step 4: Implement the Drawer**

Use two visible segment buttons (`deposit`, `withdrawal`) with `aria-pressed`. Keep `revealedIds`, `copyMessage`, and `copyError` local; reset them on every open and after leave. Mask addresses as first 8 and last 6 characters. Copy only after explicit reveal, keep errors visible with `role="alert"`, and focus the title on open.

- [ ] **Step 5: Verify GREEN and commit**

Run: `node --test test/userOnchainWalletDrawer.test.js`

```bash
git add src/admin/components/user/UserOnchainWalletDrawer.vue test/userOnchainWalletDrawer.test.js
git commit -m "feat: add user onchain wallet drawer"
```

### Task 3: Operation entry orchestration

**Files:**
- Modify: `src/admin/config/userOperations.js`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Modify: `test/userOperationEntryCenter.test.js`
- Create: `test/userOnchainWalletLayering.test.js`

**Interfaces:**
- Consumes: `getUserOnchainWallet(userId)` and `UserOnchainWalletDrawer`
- Produces operation handler: `onchain-wallet`

- [ ] **Step 1: Write failing integration tests**

Require the catalog entry to be `status: 'available'` and `handler: 'onchain-wallet'`. Assert `handleOperationDrawerAction` opens wallet state without calling `closeOperationDrawer`, passes the operation card as `returnFocus`, and renders the wallet Drawer after `UserOperationDrawer`.

- [ ] **Step 2: Verify RED**

Run: `node --test test/userOperationEntryCenter.test.js test/userOnchainWalletLayering.test.js`

Expected: FAIL because the entry is planned and orchestration is absent.

- [ ] **Step 3: Implement orchestration**

Add `onchainWalletOpen`, `onchainWalletUser`, `onchainWalletData`, and `onchainWalletReturnFocus` refs. Handle `id === 'onchain-wallet'` before deferred actions, retrieve repository data, and keep the parent Drawer open. Clear snapshot/user/trigger only from the child Drawer `closed` event.

- [ ] **Step 4: Verify GREEN and commit**

Run: `node --test test/userOperationEntryCenter.test.js test/userOnchainWalletLayering.test.js test/userOnchainWalletDrawer.test.js test/userOnchainWalletRepository.test.js`

```bash
git add src/admin/config/userOperations.js src/pages/admin/user/UserListPage.vue test/userOperationEntryCenter.test.js test/userOnchainWalletLayering.test.js
git commit -m "feat: integrate user onchain wallet operation"
```

### Task 4: Wallet verification

**Files:**
- Verify only; modify production files only if a failing check exposes a defect.

- [ ] **Step 1: Run full automated checks**

Run: `npm test`

Expected: zero failed tests.

Run: `npm run build`

Expected: Vite exits with code 0.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 2: Run browser interaction checks**

At desktop, narrow mobile, 200% zoom, and low-height viewports verify layering, backdrop resistance, one body scroller, close/Escape, focus entry/trap/return, address reveal/copy/error, safe-area reachability, repeated open cleanup, and reduced motion. Record every unavailable scenario as unverified with its required manual check.

- [ ] **Step 3: Commit verification fixes if any**

```bash
git add src/admin/repositories/userOnchainWalletRepository.js src/admin/components/user/UserOnchainWalletDrawer.vue src/admin/config/userOperations.js src/pages/admin/user/UserListPage.vue test/userOnchainWalletRepository.test.js test/userOnchainWalletDrawer.test.js test/userOnchainWalletLayering.test.js test/userOperationEntryCenter.test.js
git commit -m "fix: harden user wallet interactions"
```
