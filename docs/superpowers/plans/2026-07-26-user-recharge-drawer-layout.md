# User Recharge Drawer Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Widen the recharge Drawer, place cumulative recharge beside VIP progress, keep pagination fixed, and make only the record list scroll.

**Architecture:** Add an opt-in `alwaysShowNavigation` capability to the shared `CompactPagination` without changing its default behavior. Restructure `UserRechargeSummaryDrawer` as a fixed header, fixed overview, fixed record heading, flexible scrolling list, and fixed pagination footer.

**Tech Stack:** Vue 3 Composition API, Vue SFC, Tailwind CSS, Node.js test runner, existing Vue SFC harness.

## Global Constraints

- Drawer maximum width is approximately 672px and never exceeds the viewport.
- At usable widths, the overview is one row with an approximately 220px cumulative column and a flexible progress column; narrow layouts reflow vertically.
- The record list is the only `overflow-y-auto` region; header, overview, record heading, and pagination remain fixed.
- Pagination always renders its summary and navigation in this Drawer, including one-page and empty states; boundary controls are disabled.
- Page changes, user changes, and summary refresh reset the record list scroll position to the top as applicable.
- Existing Drawer lifecycle, modal semantics, intentional close paths, motion, focus, background isolation, page scroll lock, record ordering, totals, and empty-state semantics remain unchanged.
- Existing unrelated working-tree changes must not be modified, staged, or committed.
- Unperformed browser interaction checks must be reported as unverified.

---

### Task 1: Opt-in always-visible compact pagination navigation

**Files:**
- Modify: `src/admin/components/CompactPagination.vue`
- Modify: `test/compactPagination.test.js`

**Interfaces:**
- Produces prop `alwaysShowNavigation: boolean` with default `false`.
- Existing consumers retain current behavior; the recharge Drawer will pass `true` in Task 2.

- [ ] **Step 1: Write the failing component test**

Add a test that mounts the real pagination component with `currentPage: 1`, `totalCount: 0`, `pageSize: 5`, and `alwaysShowNavigation: true`. Assert the summary is `共 0 条 · 第 1 / 1 页`, button labels are `['上一页', '1', '下一页']`, both neighboring buttons are disabled, and page 1 has `aria-current="page"`.

- [ ] **Step 2: Run the new test and verify RED**

```bash
node --test --test-name-pattern="always shows disabled navigation" test/compactPagination.test.js
```

Expected: FAIL because the one-page navigation is currently not rendered.

- [ ] **Step 3: Implement the opt-in prop**

Add:

```js
alwaysShowNavigation: { type: Boolean, default: false }
```

Change the navigation condition to:

```vue
<nav v-if="alwaysShowNavigation || totalPages > 1" ...>
```

Do not change page calculation, button semantics, or default behavior.

- [ ] **Step 4: Run focused and component tests**

```bash
node --test --test-name-pattern="always shows disabled navigation" test/compactPagination.test.js
node --test test/compactPagination.test.js
```

Expected: focused test passes, then all pagination tests pass with zero warnings.

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/CompactPagination.vue test/compactPagination.test.js
git commit -m "feat: support persistent compact pagination"
```

---

### Task 2: Fixed recharge Drawer overview and pagination

**Files:**
- Modify: `src/admin/components/user/UserRechargeSummaryDrawer.vue`
- Modify: `test/userCreditMembershipComponents.test.js`

**Interfaces:**
- Consumes: `CompactPagination.alwaysShowNavigation` from Task 1.
- Produces: `recordListRef` and a page-change handler that resets list scrolling.

- [ ] **Step 1: Write failing behavior and structure tests**

Update the Drawer tests to assert:

- Drawer panel contains `max-w-2xl`.
- A fixed overview node identified by `data-testid="user-recharge-summary-overview"` uses a narrow-first responsive grid such as `grid-cols-1 min-[520px]:grid-cols-[220px_minmax(0,1fr)]`.
- `data-testid="user-recharge-record-list"` is the only node with `overflow-y-auto` and includes `min-h-0 flex-1`.
- The old body test ID no longer owns `overflow-y-auto`.
- `data-testid="user-recharge-pagination"` is outside the record-list node and is visible for a one-record summary.
- Its buttons are `上一页`, `1`, `下一页` and both neighboring controls are disabled.
- For seven records, set `recordList.scrollTop = 180`, click `下一页`, flush, and assert `scrollTop === 0`.

These tests catch incorrect width/proportions, a second scrolling ancestor, conditional pagination, pagination nested in the scroll region, and missing scroll reset.

- [ ] **Step 2: Run the Drawer tests and verify RED**

```bash
node --test --test-name-pattern="fixed overview|fixed pagination|scrolls only records" test/userCreditMembershipComponents.test.js
```

Expected: FAIL because the current body scrolls, panels are stacked, pagination is conditional and nested in the list.

- [ ] **Step 3: Implement the fixed layout**

In the script:

```js
const recordListRef = ref(null)
const scrollRecordsToTop = () => {
  if (recordListRef.value) recordListRef.value.scrollTop = 0
}
const setCurrentPage = (page) => {
  currentPage.value = page
  scrollRecordsToTop()
}
```

Call `scrollRecordsToTop()` from `captureSummary` after setting page 1. Replace the pagination `v-model` with `:current-page="currentPage"` and `@update:current-page="setCurrentPage"`.

Restructure the template:

- Panel: replace `max-w-xl` with `max-w-2xl`.
- Non-header content wrapper: `min-h-0 flex flex-1 flex-col overflow-hidden` with horizontal/top padding and safe-area-right handling, but no `overflow-y-auto`.
- Overview: `data-testid="user-recharge-summary-overview"`, `shrink-0`, responsive one-to-two-column grid with `220px minmax(0,1fr)` at a content-driven minimum width.
- Place cumulative card and either progress card or highest-level status in that same grid.
- Record section becomes `min-h-0 flex flex-1 flex-col`; heading is `shrink-0`.
- List/empty-state wrapper gets `ref="recordListRef"`, `data-testid="user-recharge-record-list"`, `min-h-0 flex-1 overflow-y-auto`, and suitable bottom spacing. It contains only record articles or the empty state.
- Pagination wrapper gets `data-testid="user-recharge-pagination"`, `shrink-0`, bottom safe-area padding, and contains `CompactPagination` unconditionally with `:always-show-navigation="true"`.

- [ ] **Step 4: Run focused and related tests**

```bash
node --test test/userCreditMembershipComponents.test.js test/compactPagination.test.js
```

Expected: all selected tests pass with no warnings.

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/user/UserRechargeSummaryDrawer.vue test/userCreditMembershipComponents.test.js
git commit -m "feat: fix recharge drawer pagination layout"
```

---

### Task 3: Full verification

**Files:**
- Verify only; no planned modifications.

- [ ] **Step 1: Run root tests**

```bash
node --test test/*.test.js
```

Expected: zero failures. Run `npm test` separately and report nested-worktree discovery failures if present.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: Vite exits 0.

- [ ] **Step 3: Inspect feature scope**

Run `git diff --check` and inspect the task commits. Confirm only the four planned source/test files changed and separately report pre-existing dirty files and concurrent commits.

- [ ] **Step 4: Report interaction status**

Report automated pagination, scrolling-structure, Drawer lifecycle, reduced-motion source checks, root tests, and build evidence actually run. Unless executed in a browser, mark desktop 1440×900/1280×720, tablet, narrow/landscape phone, low height, 200% zoom/text enlargement, keyboard, mouse, touch, virtual keyboard, dynamic viewport, safe areas, reduced-motion visual behavior, high contrast, long text, and assistive technology as unverified.
