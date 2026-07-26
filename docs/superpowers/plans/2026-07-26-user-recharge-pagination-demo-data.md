# User Recharge Pagination Demo Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `user_1001` seven deterministic recharge records so the existing five-row Drawer pagination is visible in the demo.

**Architecture:** Extend only the repository's deterministic mock record factory. Keep the summary API and Drawer unchanged; existing aggregation and sorting derive their outputs from the new records.

**Tech Stack:** JavaScript ES modules, Node.js test runner, Vue 3 component regression suite, Vite.

## Global Constraints

- `user_1001` has exactly 7 recharge records; other users keep their current record counts.
- Record IDs and transaction IDs are unique, timestamps are valid, and returned records are newest first.
- Summary totals remain derived from record values rather than hard-coded.
- Existing unrelated working-tree changes must not be modified, staged, or committed.
- Unperformed browser interaction checks must be reported as unverified.

---

### Task 1: Add deterministic pagination demo records

**Files:**
- Modify: `test/userCreditMembershipRepository.test.js`
- Modify: `src/admin/repositories/userCreditMembershipRepository.js`

**Interfaces:**
- Consumes: `getUserRechargeSummary(userId)` returning `{ cumulativeRecharge, qualifyingRecharge, records }`.
- Produces: seven `user_1001` records in the unchanged summary shape.

- [ ] **Step 1: Write the failing repository test**

Add a test using literal expectations that calls `getUserRechargeSummary('user_1001')` and asserts:

```js
assert.equal(summary.records.length, 7)
assert.equal(new Set(summary.records.map((row) => row.id)).size, 7)
assert.equal(new Set(summary.records.map((row) => row.transactionId)).size, 7)
assert.deepEqual(
  summary.records.map((row) => row.createdAt),
  [...summary.records.map((row) => row.createdAt)].sort((a, b) => new Date(b) - new Date(a))
)
assert.equal(summary.cumulativeRecharge, 50000)
assert.equal(summary.qualifyingRecharge, 48000)
```

Use seven record amounts that sum to `50,000.00` and qualifying amounts that sum to `48,000.00`. This test catches missing rows, duplicate identifiers, wrong ordering, and aggregation disconnected from the record values.

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
node --test --test-name-pattern="user_1001 exposes enough recharge records" test/userCreditMembershipRepository.test.js
```

Expected: FAIL because the current factory returns one record for `user_1001`.

- [ ] **Step 3: Add the minimum deterministic mock data**

In `makeRechargeRecords`, add a `user_1001` branch before the existing `user_1004` branch. Return seven literal records with amounts totaling `50000` and qualifying amounts totaling `48000`, unique `RCG-user_1001-001` through `-007` IDs, unique `DEP-user_1001-001` through `-007` transaction IDs, mixed existing source labels (`链上充值`, `人工入金`), and descending 2026 timestamps.

- [ ] **Step 4: Run the focused test and verify GREEN**

```bash
node --test --test-name-pattern="user_1001 exposes enough recharge records" test/userCreditMembershipRepository.test.js
```

Expected: one selected test passes, zero failures.

- [ ] **Step 5: Run related regressions**

```bash
node --test test/userCreditMembershipRepository.test.js test/userCreditMembershipComponents.test.js test/compactPagination.test.js
```

Expected: all selected tests pass with zero failures and no warnings.

- [ ] **Step 6: Commit the tested change**

```bash
git add src/admin/repositories/userCreditMembershipRepository.js test/userCreditMembershipRepository.test.js
git commit -m "test: add recharge pagination demo records"
```

---

### Task 2: Verify project state

**Files:**
- Verify only; no planned modifications.

**Interfaces:**
- Consumes: the completed mock data and existing Drawer pagination.
- Produces: fresh root-suite, build, diff, and status evidence.

- [ ] **Step 1: Run the root project suite**

```bash
node --test test/*.test.js
```

Expected: zero failures. Also run `npm test` and report the known nested-worktree discovery failures separately if they persist.

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: Vite exits 0.

- [ ] **Step 3: Inspect scope**

```bash
git diff --check HEAD^ -- src/admin/repositories/userCreditMembershipRepository.js test/userCreditMembershipRepository.test.js
git show --stat --oneline HEAD
git status --short
```

Confirm the feature commit contains only the two planned files and report all unrelated dirty files separately.

- [ ] **Step 4: Report manual checks accurately**

Unless actually executed, mark real-browser desktop, tablet, phone, low-height, zoom, keyboard, mouse, touch, virtual-keyboard, safe-area, high-contrast, long-text, and assistive-technology checks as unverified.
