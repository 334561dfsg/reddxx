# User Point Control Unified Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the split operation/execution log UI with one “用户点控日志” table.

**Architecture:** Keep the existing operation and execution Mock arrays unchanged. Normalize both arrays into one page-level computed list with a shared display shape, apply the existing filters to that list, and sort it by timestamp descending.

**Tech Stack:** Vue 3 Composition API, Tailwind CSS, Node test runner, Vite.

## Global Constraints

- This is a frontend-only Demo change; do not add or change server APIs.
- Remove the Demo notice and both log tabs.
- Display settings, cancellation, and execution records in one table.

---

### Task 1: Unified log page

**Files:**
- Modify: `test/userControlUi.test.js`
- Modify: `src/pages/admin/user-control/UserControlLogPage.vue`

**Interfaces:**
- Consumes: `userControlState.value.operationLogs`, `userControlState.value.executionLogs`, `filterUserControlLogsByDate(rows, filters)`.
- Produces: `unifiedLogs`, a computed array whose rows expose `id`, `createdAt`, `operator`, `userId`, `moduleLabels`, `type`, `source`, `duration`, `referenceId`, `before`, `after`, `status`, and `note`.

- [x] **Step 1: Write the failing UI structure test**

Assert that the page includes `用户点控日志` and `unifiedLogs`, contains one `<table`, and omits `Demo 演示页`, `role="tablist"`, and `activeTab`.

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --test test/userControlUi.test.js`
Expected: FAIL because the old title, Demo card, tabs, and two tables still exist.

- [x] **Step 3: Implement normalized unified rows**

Map operation records to shared rows using the existing operation formatting helpers. Map execution records to the same shape using rule value, before/after value, business ID, and execution status. Filter by the existing UID/module/source/action/date inputs and sort descending by `createdAt`.

- [x] **Step 4: Implement the single-table template**

Rename the title, remove the Demo card and tabs, and render one table with the columns defined in the approved design. Render unavailable values as `—`.

- [x] **Step 5: Run focused and full verification**

Run: `node --test test/userControlUi.test.js`
Expected: PASS.

Run: `npm test`
Expected: all tests PASS.

Run: `npm run build`
Expected: Vite production build succeeds.

Run: `git diff --check`
Expected: no output.

- [x] **Step 6: Commit**

```bash
git add docs/superpowers/plans/2026-07-25-user-point-control-unified-log.md test/userControlUi.test.js src/pages/admin/user-control/UserControlLogPage.vue
git commit -m "style: unify user point control logs"
```
