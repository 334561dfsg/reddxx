# User Point-Control Log Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the user-management log menu to “用户点控日志” and paginate the filtered unified log list with the shared admin pagination bar.

**Architecture:** Keep `unifiedLogs` as the complete filtered and sorted computed list. Pass it to `useAdminListPagination`, render only `pagedRows`, and reset pagination from all filter fields while reusing `AdminListPaginationBar` for controls.

**Tech Stack:** Vue 3 Composition API, existing Tailwind UI components, Node test runner, Vite.

## Global Constraints

- Frontend Demo only; do not add server APIs.
- Preserve existing log merge, filtering, sorting, and table fields.
- Default page size is 10; selectable sizes are 5, 10, 20, and 50.
- Empty results keep the existing empty state and do not show pagination.

---

### Task 1: Menu wording and paginated log table

**Files:**
- Modify: `test/userControlUi.test.js`
- Modify: `src/admin/config/nav.js`
- Modify: `src/pages/admin/user-control/UserControlLogPage.vue`

**Interfaces:**
- Consumes: `useAdminListPagination(sourceRows, { pageSize, resetSources })` and `AdminListPaginationBar`.
- Produces: `pagedLogs`, `currentPage`, `pageSize`, `totalPages`, and `onPageSizeChange` bindings in the log page.

- [x] **Step 1: Write failing UI contract tests**

Add tests that assert the navigation item for `/admin/users/control-log` is named `用户点控日志`, the table iterates over `pagedLogs`, the shared pagination component receives the filtered total, and all six filters are supplied as reset sources.

- [x] **Step 2: Verify RED**

Run: `node --test test/userControlUi.test.js`

Expected: FAIL because the menu still says `用户控制日志` and the log page has no pagination bindings.

- [x] **Step 3: Implement the menu rename and pagination**

In `UserControlLogPage.vue`, import the shared pagination component and composable, derive pagination from `unifiedLogs`, render `pagedLogs`, and add the pagination bar below the horizontal table viewport. Supply these reset sources:

```js
[
  () => filters.userId,
  () => filters.module,
  () => filters.source,
  () => filters.action,
  () => filters.dateFrom,
  () => filters.dateTo
]
```

Bind `total-count` to `unifiedLogs.length`; the existing component already hides itself at zero rows.

- [x] **Step 4: Verify GREEN**

Run: `node --test test/userControlUi.test.js`

Expected: all focused tests pass.

### Task 2: Complete verification

**Files:**
- Modify: `docs/superpowers/plans/2026-07-25-user-point-control-log-pagination.md`

- [x] Run `npm test` and confirm all tests pass.
- [x] Run `npm run build` and confirm Vite builds successfully.
- [x] Run `git diff --check` and confirm no whitespace errors.
- [x] Preview `/admin/users/control-log`; confirm menu text, 10-row first page, page-size switching, next-page behavior, and filter reset to page 1.
- [x] Commit with `git commit -m "feat: paginate user point-control logs"`.
