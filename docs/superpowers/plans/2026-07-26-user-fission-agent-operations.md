# User Fission and Agent Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate fission and agent operations, add a contextual user-level agent report, and paginate the four relationship report lists.

**Architecture:** Split operation catalog groups without adding navigation steps, add a focused deterministic agent-report repository and Drawer, and reuse one compact fixed-size pagination component across relationship surfaces. Existing relationship repository semantics and mutation payloads remain unchanged.

**Tech Stack:** Vue 3 Composition API, Tailwind CSS, Node test runner, local Vue SFC harness.

## Global Constraints

- Fission means the recursive parent/referral tree; agent reporting means first-level agent clients and commission only.
- All four list page sizes are exactly 10.
- Drawers retain viewport-fixed overlays, backdrop resistance, fixed frames, one scrolling body, safe close controls, shared layers and 200/150ms motion.
- Ordinary user operations remain one-click reachable; no relationship tabs are introduced.
- Existing unrelated worktree changes must be preserved.

---

### Task 1: Compact shared pagination

**Files:**
- Create: `src/admin/components/CompactPagination.vue`
- Create: `test/compactPagination.test.js`

**Interfaces:**
- Consumes props `{ currentPage: number, totalCount: number, pageSize?: number }`.
- Produces event `update:currentPage` and computed finite page buttons.

- [ ] **Step 1: Write failing component tests**

Test a 95-item list at page 5 and assert summary `共 95 条 · 第 5 / 10 页`, enabled previous/next buttons and a finite page-number set. Test 8 items and assert navigation is hidden while count remains. Test requested pages are clamped before emission.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/compactPagination.test.js`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the component**

Create a stateless component with default `pageSize: 10`, `totalPages = Math.max(1, Math.ceil(totalCount / pageSize))`, and a maximum five-page window centered on the current page. Emit only clamped integer pages. Use native buttons with visible focus and `aria-current="page"`; do not add a page-size select.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test test/compactPagination.test.js`

Expected: all pagination tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/CompactPagination.vue test/compactPagination.test.js
git commit -m "feat: add compact list pagination"
```

### Task 2: Operation catalog grouping and terminology

**Files:**
- Modify: `src/admin/config/userOperations.js`
- Modify: `test/userOperationEntryCenter.test.js`
- Modify: `src/admin/components/user/UserRelationshipDrawer.vue`
- Modify: `src/admin/components/user/UserParentResetDialog.vue`
- Modify: `src/admin/components/user/UserTeamReportDrawer.vue`
- Modify: `test/userRelationshipOperations.test.js`

**Interfaces:**
- Consumes: user role/isAgent context in `getUserOperationGroups(user)`.
- Produces groups `profile`, `fission`, `agent`, contextual `reset-agent`, and agent-only `agent-report`.

- [ ] **Step 1: Write failing catalog tests**

Assert group labels and order begin with `用户资料`, `裂变关系`, `代理管理`; assert fission entry titles are the four approved names; assert `agent-report` appears only for an agent user; assert the role action is `设置为代理` for ordinary users and `取消代理身份` for agents.

- [ ] **Step 2: Run catalog tests and verify RED**

Run: `node --test test/userOperationEntryCenter.test.js`

Expected: FAIL against the current single `用户与关系` group.

- [ ] **Step 3: Split the catalog**

Move `edit-profile` to `profile`; the three relationship actions plus renamed `team-report` to `fission`; and `reset-agent` plus new `{ id: 'agent-report', handler: 'agent-report' }` to `agent`. In `resolveEntry`, dynamically title `reset-agent` and filter `agent-report` from non-agent group results.

- [ ] **Step 4: Update all fission surface copy**

Use `裂变上级`, `裂变下级`, and `裂变团队报表` in visible titles, labels, descriptions, search labels, confirmation summaries, buttons, errors and empty states. Preserve identifiers and mutation payload fields such as `parentId`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test test/userOperationEntryCenter.test.js test/userRelationshipOperations.test.js`

Expected: zero failures.

- [ ] **Step 6: Commit**

```bash
git add src/admin/config/userOperations.js src/admin/components/user/UserRelationshipDrawer.vue src/admin/components/user/UserParentResetDialog.vue src/admin/components/user/UserTeamReportDrawer.vue test/userOperationEntryCenter.test.js test/userRelationshipOperations.test.js
git commit -m "refactor: separate fission and agent operations"
```

### Task 3: Paginate fission lists

**Files:**
- Modify: `src/admin/components/user/UserRelationshipDrawer.vue`
- Modify: `src/admin/components/user/UserTeamReportDrawer.vue`
- Modify: `test/userRelationshipOperations.test.js`

**Interfaces:**
- Consumes: `CompactPagination`, complete filtered member arrays and report branch arrays.
- Produces: `pagedMembers` and `pagedBranches` with page size 10.

- [ ] **Step 1: Write failing pagination behavior tests**

Provide more than 20 relationship members. Assert only ten cards render, navigate to page 2, then change search/status/role and assert page 1. Reopen with a different user or switch direct/all mode and assert page 1. For the report, provide more than ten branches and assert page 2 renders the next branch set.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/userRelationshipOperations.test.js`

Expected: FAIL because every filtered member and branch currently renders.

- [ ] **Step 3: Add relationship list pagination**

Add `currentPage = ref(1)`, `PAGE_SIZE = 10`, `totalPages`, and `pagedMembers = filteredMembers.slice((page - 1) * 10, page * 10)`. Watch keyword/status/role to reset page and clear `selectedMember`; watch total pages to clamp; reset on open, user and mode changes. Render `pagedMembers` and append `CompactPagination`.

- [ ] **Step 4: Add branch pagination**

Add equivalent state to `UserTeamReportDrawer`, reset on open/user changes, clamp against `report.branches.length`, render `pagedBranches`, and append the same pagination component.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test test/userRelationshipOperations.test.js`

Expected: zero failures.

- [ ] **Step 6: Commit**

```bash
git add src/admin/components/user/UserRelationshipDrawer.vue src/admin/components/user/UserTeamReportDrawer.vue test/userRelationshipOperations.test.js
git commit -m "feat: paginate fission relationship lists"
```

### Task 4: User-level agent report repository

**Files:**
- Create: `src/admin/repositories/userAgentReportRepository.js`
- Create: `test/userAgentReportRepository.test.js`

**Interfaces:**
- Produces: `getUserAgentReport(userId): { userId, summary, productLines, dailyRows }`.
- `summary`: `{ directClientCount, activeClientCount, totalVolume, totalCommission }`.
- `productLines`: `Array<{ key, label, volume, commission, orderCount }>`.
- `dailyRows`: `Array<{ date, volume, activeClients, newClients, orderCount, commission }>` sorted descending.

- [ ] **Step 1: Write failing repository tests**

Assert a stable agent user receives at least 21 descending daily rows, `summary.totalVolume` equals the sum of `productLines[].volume`, `summary.totalCommission` equals the sum of `productLines[].commission`, different user IDs produce isolated reports, returned objects are detached, and empty user IDs throw `用户 ID 必填`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/userAgentReportRepository.test.js`

Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement deterministic data generation**

Use a stable string hash of `userId`, fixed product line definitions, and fixed calendar dates. Generate values without `Math.random`, calculate summary fields from the generated rows, clone on every return, and never mutate global agent mocks.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test test/userAgentReportRepository.test.js`

Expected: all repository tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/admin/repositories/userAgentReportRepository.js test/userAgentReportRepository.test.js
git commit -m "feat: add user agent report data"
```

### Task 5: Agent report Drawer and orchestration

**Files:**
- Create: `src/admin/components/user/UserAgentReportDrawer.vue`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Create: `test/userAgentReportComponents.test.js`
- Modify: `test/userCreditMembershipLayering.test.js`

**Interfaces:**
- Consumes: props `{ visible, user, report, error, returnFocus }`, `CompactPagination`, and the shared Drawer lifecycle.
- Produces events `close`, `closed`; UserList opens it for `agent-report` and clears state only after close animation.

- [ ] **Step 1: Write failing Drawer tests**

Mount with 21 daily rows. Assert four summary cards, product-line rows, only ten daily rows on page 1, page 2 navigation, agent-specific empty/error copy, one body `overflow-y-auto`, fixed close button, shared layer style, and 200/150/50ms motion. Test backdrop pointer events do not emit close and intentional close does.

- [ ] **Step 2: Write failing orchestration tests**

Assert UserList handles `id === 'agent-report'`, gets report by user ID, keeps the operation Drawer mounted beneath it, passes the originating trigger as `returnFocus`, and renders `UserAgentReportDrawer` after the operation Drawer in deterministic layer order.

- [ ] **Step 3: Run tests and verify RED**

Run: `node --test test/userAgentReportComponents.test.js test/userCreditMembershipLayering.test.js`

Expected: FAIL because the Drawer and handler do not exist.

- [ ] **Step 4: Implement the Drawer**

Follow `UserTeamReportDrawer` structure with shared `useDialogLifecycle`, fixed header and close target, one scrolling body, summary/product/daily sections, and `CompactPagination` for `dailyRows`. Reset and clamp current page on open, user/report change. Keep product lines unpaginated because their fixed catalog is small.

- [ ] **Step 5: Wire UserList state and handler**

Add `agentReportOpen`, `agentReportUser`, `agentReportData`, `agentReportError`, `agentReportReturnFocus`, close/clear functions, and an `agent-report` action branch. Wrap `getUserAgentReport(userIdOf(user))` in `try/catch`; on failure keep the Drawer open and pass the caught message through `error`. Render the Drawer in the layered component sequence and clear data/error only from `@closed`.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node --test test/userAgentReportComponents.test.js test/userCreditMembershipLayering.test.js test/userOperationEntryCenter.test.js`

Expected: zero failures.

- [ ] **Step 7: Commit**

```bash
git add src/admin/components/user/UserAgentReportDrawer.vue src/pages/admin/user/UserListPage.vue test/userAgentReportComponents.test.js test/userCreditMembershipLayering.test.js
git commit -m "feat: add contextual agent report"
```

### Task 6: Full verification

**Files:**
- Verify all changed files.

**Interfaces:**
- Consumes: Tasks 1-5 and the membership selector plan.
- Produces: evidence for the complete approved scope.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: zero failures.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 3: Validate diffs and current state**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; status lists only intended implementation changes plus the pre-existing withdraw-flow files until those are committed separately.

- [ ] **Step 4: Perform browser interaction checks when available**

Verify desktop 1440×900 and 1280×720, narrow phone, low-height viewport and 200% zoom for one scrolling body, reachable pagination, backdrop resistance, focus return, Escape, reduced motion and long labels. Record any unavailable checks as unverified rather than passed.
