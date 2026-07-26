# User Onchain Wallet Demo Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `user_1004` to eight deterministic onchain wallet demo addresses covering four coin/network combinations in both deposit and withdrawal groups, with Chinese active/inactive status labels.

**Architecture:** Keep the existing repository as the single owner of deterministic address records and preserve deep-cloned reads. Add only repository records plus a small presentation mapping in the existing Drawer; protect the data contract and rendered inactive label through real repository and mounted component tests.

**Tech Stack:** JavaScript ES modules, Vue 3, Node.js test runner, existing Vue SFC harness.

## Global Constraints

- Keep `getUserOnchainWallet(userId)` and its `{ userId, addresses }` return shape unchanged.
- Keep unknown users empty and preserve deep-cloned results.
- Add no real credentials, private keys, address mutation, whitelist, aggregation, MFA, or network requests.
- Preserve masking, reveal-before-copy, segment state, layering, focus, Drawer animation, scrolling, backdrop, and responsive behavior.
- Map `active` to “启用” and `inactive` to “停用”; keep unknown status fallback behavior.
- Do not overwrite unrelated dirty-worktree files.

---

### Task 1: Protect the eight-address repository contract

**Files:**
- Modify: `test/userOnchainWalletRepository.test.js`
- Test: `test/userOnchainWalletRepository.test.js`

**Interfaces:**
- Consumes: `getUserOnchainWallet(userId)`.
- Produces: A regression contract for eight unique, complete, deterministic records split evenly by kind.

- [ ] **Step 1: Write the failing repository test**

Update the `user_1004` test to assert:

```js
assert.equal(result.addresses.length, 8)
assert.equal(result.addresses.filter((row) => row.kind === 'deposit').length, 4)
assert.equal(result.addresses.filter((row) => row.kind === 'withdrawal').length, 4)
assert.equal(new Set(result.addresses.map((row) => row.id)).size, 8)
assert.deepEqual(new Set(result.addresses.map((row) => `${row.coin}:${row.network}`)), new Set([
  'USDT:TRC20', 'USDT:ERC20', 'BTC:Bitcoin', 'ETH:Ethereum'
]))
assert.deepEqual(new Set(result.addresses.map((row) => row.status)), new Set(['active', 'inactive']))
```

Also assert each kind independently contains all four coin/network pairs and update the isolated-copy length expectation from `2` to `8`.

- [ ] **Step 2: Run and verify RED**

Run: `node --test test/userOnchainWalletRepository.test.js`

Expected: FAIL with actual address count `2` instead of `8`.

### Task 2: Add deterministic multi-network records

**Files:**
- Modify: `src/admin/repositories/userOnchainWalletRepository.js`
- Test: `test/userOnchainWalletRepository.test.js`

**Interfaces:**
- Consumes: Existing immutable `USER_1004_WALLET` fixture.
- Produces: Four deposit and four withdrawal address records with stable IDs and timestamps.

- [ ] **Step 1: Expand the immutable fixture**

Keep both existing TRC20 rows. Add deposit rows for USDT/ERC20, BTC/Bitcoin, and ETH/Ethereum; add withdrawal rows for USDT/ERC20, BTC/Bitcoin, and ETH/Ethereum. Use `inactive` for the ETH deposit and USDT/ERC20 withdrawal rows and `active` for all others.

- [ ] **Step 2: Run repository tests and verify GREEN**

Run: `node --test test/userOnchainWalletRepository.test.js`

Expected: all repository tests PASS.

### Task 3: Render inactive status in Chinese

**Files:**
- Modify: `test/userOnchainWalletDrawer.test.js`
- Modify: `src/admin/components/user/UserOnchainWalletDrawer.vue`
- Test: `test/userOnchainWalletDrawer.test.js`

**Interfaces:**
- Consumes: `address.status` values from the repository.
- Produces: `statusLabel(status)` returning `启用`, `停用`, the unknown raw value, or `未知`.

- [ ] **Step 1: Write the failing mounted component test**

Mount the real Drawer with one `inactive` deposit record and assert its visible text contains `停用` and does not contain the raw standalone `inactive` value.

- [ ] **Step 2: Run and verify RED**

Run: `node --test --test-name-pattern="inactive wallet status" test/userOnchainWalletDrawer.test.js`

Expected: FAIL because the component currently renders `inactive`.

- [ ] **Step 3: Add the minimal status mapping**

Add:

```js
const statusLabel = (status) => ({ active: '启用', inactive: '停用' }[status] || status || '未知')
```

Render `{{ statusLabel(address.status) }}` in the badge without changing the badge layout or behavior.

- [ ] **Step 4: Run Drawer tests and verify GREEN**

Run: `node --test test/userOnchainWalletDrawer.test.js`

Expected: all Drawer tests PASS.

### Task 4: Verify integration and full regression

**Files:**
- Verify: `test/userOnchainWalletLayering.test.js`
- Verify: `test/userOperationEntryCenter.test.js`
- Verify: all changed production and test paths.

- [ ] **Step 1: Run focused wallet regression tests**

```bash
node --test test/userOnchainWalletRepository.test.js test/userOnchainWalletDrawer.test.js test/userOnchainWalletLayering.test.js test/userOperationEntryCenter.test.js
```

- [ ] **Step 2: Run the main test directory and diff check**

```bash
node --test test
git diff --check -- src/admin/repositories/userOnchainWalletRepository.js src/admin/components/user/UserOnchainWalletDrawer.vue test/userOnchainWalletRepository.test.js test/userOnchainWalletDrawer.test.js
```

- [ ] **Step 3: Commit scoped paths only**

```bash
git add src/admin/repositories/userOnchainWalletRepository.js src/admin/components/user/UserOnchainWalletDrawer.vue test/userOnchainWalletRepository.test.js test/userOnchainWalletDrawer.test.js docs/superpowers/plans/2026-07-26-user-onchain-wallet-demo-data.md
git commit -m "feat: expand onchain wallet demo data"
```

