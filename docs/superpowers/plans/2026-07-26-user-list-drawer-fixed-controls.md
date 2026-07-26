# User List Drawer Fixed Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep search/filter controls and pagination visible in user-management list Drawers while only their list/detail regions scroll.

**Architecture:** Preserve each existing modal Drawer frame and shared lifecycle, but split its current monolithic scrolling body into fixed context, bounded overview, flexible list, and fixed pagination regions. Reuse `CompactPagination` and existing computed pagination state; do not introduce new shared abstractions because the three Drawers have materially different content structures.

**Tech Stack:** Vue 3 Composition API, Tailwind CSS, Node test runner, the local Vue SFC harness, Vite.

## Global Constraints

- The Drawer frame remains `overflow-hidden`; title and close button remain fixed and use the existing shared modal lifecycle.
- Search/filter controls and pagination must be outside the primary list scroller.
- `PAGE_SIZE` remains exactly `10`; repository and report data structures do not change.
- The primary scroller uses `min-h-0 flex-1 overflow-y-auto overscroll-y-contain`.
- Report Drawers may have one bounded overview scroller plus one primary detail scroller; the member Drawer has exactly one scroller.
- Empty states occupy the primary content region and must not make fixed controls jump.
- Preserve current search, filter, page reset/clamp, focus, Escape, backdrop resistance, animation, layering, and close semantics.
- Preserve left, right, top, and bottom safe-area coverage and do not create required horizontal scrolling.
- Do not modify the user's existing uncommitted withdraw-flow files.

---

### Task 1: Fix relationship-member controls and pagination

**Files:**
- Modify: `src/admin/components/user/UserRelationshipDrawer.vue`
- Test: `test/userRelationshipOperations.test.js`
- Test: `test/userRelationshipComponents.test.js`

**Interfaces:**
- Consumes: existing `filteredMembers`, `pagedMembers`, `currentPage`, `PAGE_SIZE`, and `CompactPagination` APIs.
- Produces: `data-testid="relationship-drawer-controls"`, `data-testid="relationship-member-scroll"`, and `data-testid="relationship-drawer-pagination"` layout landmarks for behavioral and source-contract tests.

- [ ] **Step 1: Write failing layout tests**

Add mounted assertions that the search input and both filter fieldsets are descendants of `relationship-drawer-controls`, the member buttons/empty state are descendants of `relationship-member-scroll`, and `compact-pagination-summary` is a descendant of `relationship-drawer-pagination` but not the list scroller. Add source assertions that the old `relationship-drawer-body` is not the scrolling node and the new member scroller contains `min-h-0`, `flex-1`, `overflow-y-auto`, and `overscroll-y-contain`.

```js
const controls = harness.findByTestId('relationship-drawer-controls')
const list = harness.findByTestId('relationship-member-scroll')
const pagination = harness.findByTestId('relationship-drawer-pagination')
assert.equal(controls.contains(search), true)
assert.equal(list.contains(memberButtons(harness)[0]), true)
assert.equal(pagination.contains(harness.findByTestId('compact-pagination-summary')), true)
assert.equal(list.contains(harness.findByTestId('compact-pagination-summary')), false)
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test test/userRelationshipComponents.test.js test/userRelationshipOperations.test.js`

Expected: FAIL because the three new layout landmarks do not exist and pagination remains inside the scrolling body.

- [ ] **Step 3: Split the relationship Drawer into fixed controls, list, and pagination**

Keep the existing header. Replace the scrolling body with a `min-h-0 flex flex-1 flex-col overflow-hidden` content frame. Move the search/filter card into a `shrink-0` controls section, selected-member feedback into the list scroller, member/empty rendering into the primary scroller, and `CompactPagination` into a `shrink-0` footer with safe-area bottom/left/right padding.

```vue
<div data-testid="relationship-drawer-body" class="min-h-0 flex flex-1 flex-col overflow-hidden">
  <div data-testid="relationship-drawer-controls" class="shrink-0">...</div>
  <div data-testid="relationship-member-scroll" class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">...</div>
  <footer v-if="filteredMembers.length" data-testid="relationship-drawer-pagination" class="shrink-0 border-t"> 
    <CompactPagination ... />
  </footer>
</div>
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test test/userRelationshipComponents.test.js test/userRelationshipOperations.test.js`

Expected: all relationship tests PASS, including existing page reset and filter behavior.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/admin/components/user/UserRelationshipDrawer.vue test/userRelationshipComponents.test.js test/userRelationshipOperations.test.js
git commit -m "refactor: fix relationship list controls"
```

### Task 2: Bound the team overview and fix branch pagination

**Files:**
- Modify: `src/admin/components/user/UserTeamReportDrawer.vue`
- Test: `test/userRelationshipComponents.test.js`
- Test: `test/userRelationshipOperations.test.js`

**Interfaces:**
- Consumes: existing `metricCards`, `pagedBranches`, `branches`, `currentPage`, `PAGE_SIZE`, and `CompactPagination` APIs.
- Produces: `data-testid="team-report-overview-scroll"`, `data-testid="team-report-branch-header"`, `data-testid="team-report-branch-scroll"`, and `data-testid="team-report-pagination"` layout landmarks.

- [ ] **Step 1: Write failing team-report layout tests**

Assert that all eight overview cards remain in the bounded overview scroller, branch articles appear only in the branch scroller, the branch title is outside that scroller, and pagination is in its fixed footer and outside both scrollers. Keep the existing 22-row pagination assertions.

```js
assert.equal(harness.allNodes().filter((node) => overview.contains(node) && node.getAttribute?.('data-testid') === 'team-report-metric').length, 8)
assert.equal(branchScroll.contains(visibleBranchArticles[0]), true)
assert.equal(branchScroll.contains(paginationSummary), false)
assert.equal(pagination.contains(paginationSummary), true)
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test test/userRelationshipComponents.test.js test/userRelationshipOperations.test.js`

Expected: FAIL because the overview, branches, and pagination currently share one outer scroller.

- [ ] **Step 3: Implement the bounded overview and flexible branch region**

Convert `team-report-drawer-body` to a non-scrolling flex column. Put metrics in a bounded `max-h` overview scroller, place the branch heading in a fixed `shrink-0` region, place only current-page articles or the branch empty state in `team-report-branch-scroll`, and move pagination to `team-report-pagination`. For the whole-report empty state, use `min-h-0 flex-1 overflow-y-auto` and omit pagination.

```vue
<div data-testid="team-report-overview-scroll" class="max-h-[min(18rem,38vh)] shrink-0 overflow-y-auto overscroll-y-contain">...</div>
<div data-testid="team-report-branch-header" class="shrink-0">...</div>
<div data-testid="team-report-branch-scroll" class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">...</div>
<footer v-if="branches.length" data-testid="team-report-pagination" class="shrink-0 border-t">...</footer>
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test test/userRelationshipComponents.test.js test/userRelationshipOperations.test.js`

Expected: all relationship and team-report tests PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/admin/components/user/UserTeamReportDrawer.vue test/userRelationshipComponents.test.js test/userRelationshipOperations.test.js
git commit -m "refactor: fix team report pagination"
```

### Task 3: Bound agent overview and fix daily pagination

**Files:**
- Modify: `src/admin/components/user/UserAgentReportDrawer.vue`
- Test: `test/userAgentReportComponents.test.js`

**Interfaces:**
- Consumes: existing `summaryCards`, `productLines`, `pagedDailyRows`, `dailyRows`, `currentPage`, `PAGE_SIZE`, and `CompactPagination` APIs.
- Produces: `data-testid="agent-report-overview-scroll"`, `data-testid="agent-report-daily-header"`, `data-testid="agent-report-daily-scroll"`, and `data-testid="agent-report-pagination"` layout landmarks.

- [ ] **Step 1: Write failing agent-report layout tests**

Extend the mounted report test to prove that summary and product rows are inside the bounded overview scroller, daily rows are inside the primary daily scroller, the daily title remains outside it, and pagination is fixed outside both. Extend empty-state tests to prove whole-report errors/empty content omit pagination while a report with no daily rows keeps the overview and shows the daily empty state.

```js
assert.equal(overview.contains(summaryCards[0]), true)
assert.equal(overview.contains(productRows[0]), true)
assert.equal(dailyScroll.contains(dailyRows[0]), true)
assert.equal(dailyScroll.contains(paginationSummary), false)
assert.equal(pagination.contains(paginationSummary), true)
```

- [ ] **Step 2: Run the agent report tests and verify RED**

Run: `node --test test/userAgentReportComponents.test.js`

Expected: FAIL because all sections and pagination currently live in `user-agent-report-body`'s single scroller.

- [ ] **Step 3: Implement the agent report regions**

Make `user-agent-report-body` a non-scrolling flex column. Put business overview and product lines in the bounded overview scroller; keep the daily heading fixed; render current-page daily rows or daily empty state in `agent-report-daily-scroll`; and render `CompactPagination` in the fixed footer only when `dailyRows.length > 0`. Error and whole-report empty states take the flexible content region without a pagination footer.

```vue
<div data-testid="agent-report-overview-scroll" class="max-h-[min(22rem,42vh)] shrink-0 overflow-y-auto overscroll-y-contain">...</div>
<div data-testid="agent-report-daily-header" class="shrink-0">...</div>
<div data-testid="agent-report-daily-scroll" class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">...</div>
<footer v-if="dailyRows.length" data-testid="agent-report-pagination" class="shrink-0 border-t">...</footer>
```

- [ ] **Step 4: Run agent report tests and verify GREEN**

Run: `node --test test/userAgentReportComponents.test.js`

Expected: all agent report tests PASS, including page clamping, close ordering, error focus, queued reopen, safe areas, and motion contracts.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/admin/components/user/UserAgentReportDrawer.vue test/userAgentReportComponents.test.js
git commit -m "refactor: fix agent report pagination"
```

### Task 4: Cross-Drawer regression and production verification

**Files:**
- Verify: `src/admin/components/user/UserRelationshipDrawer.vue`
- Verify: `src/admin/components/user/UserTeamReportDrawer.vue`
- Verify: `src/admin/components/user/UserAgentReportDrawer.vue`
- Verify: `test/userRelationshipComponents.test.js`
- Verify: `test/userRelationshipOperations.test.js`
- Verify: `test/userAgentReportComponents.test.js`

**Interfaces:**
- Consumes: the layout landmarks produced by Tasks 1–3.
- Produces: verified fixed-control behavior without changing data or Drawer lifecycle contracts.

- [ ] **Step 1: Run all directly related suites**

Run:

```bash
node --test test/compactPagination.test.js test/userRelationshipComponents.test.js test/userRelationshipOperations.test.js test/userAgentReportComponents.test.js test/dialogLifecycle.test.js test/dialogSfcBehavior.test.js
```

Expected: all tests PASS.

- [ ] **Step 2: Run the complete suite**

Run: `npm test`

Expected: all tests PASS with no duplicate worktree test discovery.

- [ ] **Step 3: Build production assets**

Run: `npm run build`

Expected: Vite exits `0` and reports a successful production build.

- [ ] **Step 4: Check the diff and preserve unrelated work**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; the user's four pre-existing withdraw-flow files remain modified and are not staged or committed by this plan.

- [ ] **Step 5: Perform and report the manual viewport matrix**

Verify the three Drawers at `1440×900`, `1280×720`, tablet portrait/landscape, narrow and low-height phones, and 200% zoom. Check mouse wheel, keyboard scrolling and focus, touch scrolling, virtual keyboard, four safe-area directions, Reduced Motion, backdrop resistance, Escape, fixed close/search/filter/pagination, and that only designed list/overview regions scroll. Record any unavailable device or assistive-technology checks as unverified.
