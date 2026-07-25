# User List Point Control Compact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce user-list point-control information to one status column and one three-item action dropdown.

**Architecture:** Reuse `hasRules(user)` for the binary status and the existing setting, cancellation, and log handlers. Add one row-scoped dropdown state in `UserListPage.vue`; do not change domain state or routes.

**Tech Stack:** Vue 3 Composition API, Tailwind CSS, Node test runner, Vite.

## Global Constraints

- The point-control status column is named “是否点控中” and displays only “是” or “否”.
- The dropdown contains only “点控”“取消点控”“点控日志”.
- Clicking a row continues to open user details.

---

### Task 1: Compact point-control columns and actions

**Files:**
- Modify: `test/userControlUi.test.js`
- Modify: `src/pages/admin/user/UserListPage.vue`

**Interfaces:**
- Consumes: `hasRules(user)`, `openControlSetting(user)`, `openControlCancel(user)`, and the `users-control-log` route.
- Produces: `openActionUserId: Ref<string>` and `toggleActionMenu(user): void` for one open row menu.

- [x] **Step 1: Write failing structural tests**

Assert one “是否点控中” header, “是/否” state labels, one row action trigger, exactly the three requested menu labels, and absence of the four old headers and old action labels.

- [x] **Step 2: Run focused test and verify RED**

Run `node --test test/userControlUi.test.js`; expect failure because the old columns and inline actions remain.

- [x] **Step 3: Implement status column and dropdown**

Remove obsolete status-format helpers, render the binary status column, add row-scoped dropdown state, and wire the three existing actions. Stop event propagation within the dropdown.

- [x] **Step 4: Verify**

Run `node --test test/userControlUi.test.js`, `npm test`, `npm run build`, and `git diff --check`; all must succeed.

- [x] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-07-25-user-list-point-control-compact.md test/userControlUi.test.js src/pages/admin/user/UserListPage.vue
git commit -m "style: compact user point control actions"
```
