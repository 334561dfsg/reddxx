# User List Unified Action Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore all regular user actions inside the user-list dropdown and make point-control actions status-dependent.

**Architecture:** Existing user-action components remain the single owners of their modals and forms. Each action exposes its existing `open()` method and can hide its original trigger; `UserOperations` forwards a named `open(action)` API that `UserListPage` calls from the unified dropdown.

**Tech Stack:** Vue 3 Composition API, Tailwind CSS, Node test runner, Vite.

## Global Constraints

- The unified dropdown includes user details, freeze/unfreeze, adjustment, deposit, transfer, point control/cancel point control, and point-control logs.
- “点控” and “取消点控” are mutually exclusive based on `hasRules(user)`.
- Existing action forms and point-control flows must be reused, not duplicated.

---

### Task 1: Expose reusable user-action launchers

**Files:**
- Modify: `src/admin/components/user/UserFreezeAction.vue`
- Modify: `src/admin/components/user/UserAdjustAction.vue`
- Modify: `src/admin/components/user/UserDepositAction.vue`
- Modify: `src/admin/components/user/UserTransferAction.vue`
- Modify: `src/admin/components/user/UserOperations.vue`
- Modify: `test/userControlUi.test.js`

- [x] Write a failing test requiring `showTrigger`, `defineExpose({ open })`, and `UserOperations.open(action)`.
- [x] Run `node --test test/userControlUi.test.js` and verify RED.
- [x] Add optional hidden-trigger support and expose the existing modal launchers.
- [x] Run the focused test and verify GREEN.

### Task 2: Complete unified dropdown behavior

**Files:**
- Modify: `src/pages/admin/user/UserListPage.vue`
- Modify: `test/userControlUi.test.js`

- [x] Write a failing test for all regular menu entries and mutually exclusive point-control entries.
- [x] Run the focused test and verify RED.
- [x] Mount a triggerless `UserOperations` instance for the selected row, wire direct modal launches, restore user details, and render conditional point-control entries.
- [x] Run focused tests, `npm test`, `npm run build`, and `git diff --check`; all must pass.
- [x] Commit with `git commit -m "fix: restore unified user action menu"`.
