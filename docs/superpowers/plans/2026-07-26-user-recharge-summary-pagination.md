# User Recharge Summary Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the redundant qualifying-recharge summary card and paginate recharge records five at a time inside the existing Drawer.

**Architecture:** Keep `getUserRechargeSummary` unchanged and paginate its complete, already sorted `records` array inside `UserRechargeSummaryDrawer`. Reuse `CompactPagination` so pagination behavior and keyboard/touch affordances match the rest of the admin UI.

**Tech Stack:** Vue 3 Composition API, Vue SFC, Tailwind CSS, Node.js test runner, existing Vue SFC harness.

## Global Constraints

- Preserve the existing Drawer lifecycle, intentional close paths, focus containment/return, background isolation, scroll lock, motion, and one-body-scroller structure.
- Recharge records display 5 rows per page and retain repository order.
- A different user or a new summary starts on page 1.
- Existing workspace changes outside the files listed below must remain untouched.
- Unperformed viewport or input checks must be reported as unverified.

---

### Task 1: Recharge summary presentation and local pagination

**Files:**
- Modify: `test/userCreditMembershipComponents.test.js`
- Modify: `src/admin/components/user/UserRechargeSummaryDrawer.vue`

**Interfaces:**
- Consumes: `CompactPagination` props `currentPage: number`, `totalCount: number`, `pageSize: number`, and event `update:currentPage`.
- Produces: `currentPage` local state and `pagedRecords` computed records for the existing record articles.

- [ ] **Step 1: Write the failing component test**

Add a test that loads the real `CompactPagination` dependency, supplies 7 literal records (`DEP-001` through `DEP-007`), and asserts these user-visible behaviors:

```js
test('recharge Drawer removes the duplicate summary card and paginates records five at a time', async (t) => {
  const component = await loadVueSfc(rechargeDrawerFile, {
    vueImports: { [compactPaginationFile]: loadVueSfcModuleUrl(compactPaginationFile) }
  })
  const records = Array.from({ length: 7 }, (_, index) => ({
    id: `r${index + 1}`,
    amount: 100 + index,
    qualifyingAmount: 100 + index,
    source: '链上充值',
    transactionId: `DEP-00${index + 1}`,
    createdAt: `2026-07-${String(20 - index).padStart(2, '0')}T08:00:00.000Z`
  }))
  const harness = await createSfcHarness(component, {
    visible: true,
    user,
    summary: { ...summary, records }
  })
  t.after(harness.cleanup)

  const drawer = harness.findByTestId('user-recharge-summary-drawer')
  assert.doesNotMatch(drawer.textContent, /计入会员等级/)
  assert.match(drawer.textContent, /共 7 笔/)
  assert.match(drawer.textContent, /DEP-001/)
  assert.match(drawer.textContent, /DEP-005/)
  assert.doesNotMatch(drawer.textContent, /DEP-006/)

  harness.findByText('下一页', 'button').click()
  await harness.flush()
  assert.doesNotMatch(drawer.textContent, /DEP-001/)
  assert.match(drawer.textContent, /DEP-006/)
  assert.match(drawer.textContent, /DEP-007/)

  harness.props.summary = { ...summary, records: records.slice(0, 6) }
  await harness.flush()
  assert.match(drawer.textContent, /DEP-001/)
  assert.doesNotMatch(drawer.textContent, /DEP-006/)
})
```

Define `compactPaginationFile` beside the other component paths. This test catches a missing card removal, wrong page size, failure to paginate, and stale page state after refreshed data.

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
node --test --test-name-pattern="removes the duplicate summary card" test/userCreditMembershipComponents.test.js
```

Expected: FAIL because “计入会员等级” remains visible and all 7 records render.

- [ ] **Step 3: Implement the minimum component change**

In `UserRechargeSummaryDrawer.vue`:

```js
import CompactPagination from '../CompactPagination.vue'

const PAGE_SIZE = 5
const currentPage = ref(1)
const records = computed(() => displaySummary.value?.records || [])
const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return records.value.slice(start, start + PAGE_SIZE)
})

const captureSummary = () => {
  displaySummary.value = props.summary ? JSON.parse(JSON.stringify(props.summary)) : null
  currentPage.value = 1
}
```

Remove the second summary card, replace the two-column summary grid with a full-width section, render `pagedRecords` in the record `v-for`, and add:

```vue
<CompactPagination
  v-if="records.length > PAGE_SIZE"
  v-model:current-page="currentPage"
  class="mt-3 rounded-xl border border-slate-200"
  :total-count="records.length"
  :page-size="PAGE_SIZE"
/>
```

Keep the existing “共 N 笔” label based on the full record count and keep the current empty state.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
node --test --test-name-pattern="removes the duplicate summary card" test/userCreditMembershipComponents.test.js
```

Expected: PASS with one test selected and zero failures.

- [ ] **Step 5: Run the component regression suite**

Run:

```bash
node --test test/userCreditMembershipComponents.test.js test/compactPagination.test.js
```

Expected: all selected tests pass with zero failures and no warnings.

- [ ] **Step 6: Commit the tested feature**

```bash
git add src/admin/components/user/UserRechargeSummaryDrawer.vue test/userCreditMembershipComponents.test.js
git commit -m "feat: paginate user recharge records"
```

---

### Task 2: Full verification

**Files:**
- Verify only; no planned modifications.

**Interfaces:**
- Consumes: the completed Drawer and pagination component integration.
- Produces: fresh evidence for test, build, diff, and interaction-status reporting.

- [ ] **Step 1: Run the complete automated test suite**

```bash
npm test
```

Expected: zero failed tests.

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: Vite exits with code 0.

- [ ] **Step 3: Inspect the scoped diff and whitespace**

```bash
git diff --check HEAD^ -- src/admin/components/user/UserRechargeSummaryDrawer.vue test/userCreditMembershipComponents.test.js
git diff HEAD^ -- src/admin/components/user/UserRechargeSummaryDrawer.vue test/userCreditMembershipComponents.test.js
git status --short
```

Confirm only the intended Drawer/test changes belong to this feature and separately report the user's pre-existing modified files.

- [ ] **Step 4: Report interaction verification accurately**

Report the automated Drawer lifecycle, pagination behavior, reduced-motion source checks, and build evidence that were actually run. Mark desktop `1440×900`/`1280×720`, tablet, narrow/landscape phone, low-height, 200% zoom, mouse, touch, virtual keyboard, dynamic viewport, safe-area, high-contrast, long-text, and real assistive-technology checks as unverified unless they were manually executed in a browser.
