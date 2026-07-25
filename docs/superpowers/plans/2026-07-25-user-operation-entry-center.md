# User Operation Entry Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact user-list action menu and a complete, grouped right-side operation Drawer that reuses existing actions and safely labels unimplemented entries.

**Architecture:** A pure configuration module is the single source of truth for action names, groups, states, and risk levels. A focused `UserOperationDrawer` renders that configuration and owns modal Drawer lifecycle behavior, while `UserListPage` only coordinates the selected user and routes action events into existing components.

**Tech Stack:** Vue 3 Composition API, Vue Router, Tailwind CSS, Node test runner, existing `useDialogLifecycle` shared layer system.

## Global Constraints

- This phase adds entry points and reuses existing behavior only; planned entries must not mutate data or fake successful operations.
- Backdrop, drag, and swipe must never close the Drawer.
- The viewport-fixed Drawer frame remains non-scrolling; only its content region scrolls and its header close button stays visible.
- Open with backdrop fade plus right-edge translation over `200ms ease-out`; close over `150ms ease-in`; reduced motion omits translation and uses at most `50ms` fades.
- Focus moves to the Drawer title, remains trapped in the top layer, and returns to the originating row action button after close.
- Use the existing shared layer system for scroll lock, background isolation, focus containment, and nested Dialog behavior.
- Every unexecuted interaction or viewport check must be reported as unverified with the exact required check.

---

### Task 1: User Operation Configuration

**Files:**
- Create: `src/admin/config/userOperations.js`
- Create: `test/userOperationEntryCenter.test.js`

**Interfaces:**
- Produces: `USER_OPERATION_GROUPS`, `USER_OPERATION_ENTRIES`, `USER_OPERATION_QUICK_IDS`, `getUserOperationEntry(id, user)`, and `getUserOperationGroups(user)`.
- Entry shape: `{ id, title, description, group, status, risk, handler }`, with status `available` or `planned` and risk `normal`, `sensitive`, or `danger`.

- [ ] **Step 1: Write the failing configuration test**

Assert that the quick IDs are exactly `detail`, `assets`, `deposit`, `adjust`, `freeze-account`, and `all`; assert all four group labels and every approved operation title; assert `freeze-funds` is planned while `deposit` is available; assert locked users resolve `freeze-account` to `解封` without changing its position.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test test/userOperationEntryCenter.test.js`

Expected: FAIL because `src/admin/config/userOperations.js` does not exist.

- [ ] **Step 3: Implement the configuration**

Create immutable group metadata and action definitions. Use a resolver only for user-dependent copy such as `封户` versus `解封`; do not put Vue state or side effects in this module.

- [ ] **Step 4: Run the focused test**

Run: `node --test test/userOperationEntryCenter.test.js`

Expected: PASS.

### Task 2: Accessible Right-Side Operation Drawer

**Files:**
- Create: `src/admin/components/user/UserOperationDrawer.vue`
- Modify: `test/userOperationEntryCenter.test.js`

**Interfaces:**
- Consumes: `visible: Boolean`, `user: Object|null`, `returnFocus: HTMLElement|Function|null`, and the configuration functions from Task 1.
- Produces events: `close` and `action` with payload `{ id, user }`.

- [ ] **Step 1: Extend the test with Drawer structure assertions**

Assert Teleport-to-body, `role="dialog"`, `aria-modal="true"`, title linkage, fixed overlay, non-scrolling frame, independently scrolling body, fixed accessible close button, four rendered groups, planned badges, no backdrop close handler, `useDialogLifecycle`, `200ms`/`150ms` transitions, and reduced-motion rules.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test test/userOperationEntryCenter.test.js`

Expected: FAIL because the Drawer component does not exist.

- [ ] **Step 3: Implement the Drawer**

Use `useDialogLifecycle` with the title as `initialFocusRef` and the row trigger as `returnFocusRef`. Render two columns from `sm` upward and one column below it. Planned actions remain focusable and emit `action`; after a planned click, show `该功能入口已预留，业务能力待接入` in an `aria-live="polite"` status region without closing or mutating data.

- [ ] **Step 4: Run focused tests**

Run: `node --test test/userOperationEntryCenter.test.js test/dialogLifecycle.test.js`

Expected: PASS.

### Task 3: User List Coordination and Existing Action Reuse

**Files:**
- Modify: `src/pages/admin/user/UserListPage.vue`
- Modify: `test/userOperationEntryCenter.test.js`
- Modify: `test/userControlUi.test.js`

**Interfaces:**
- Consumes Drawer event `{ id, user }`.
- Routes available IDs: `detail`/`assets` to `UserDetailDrawer`; `deposit`/`adjust`/`transfer`/`freeze-account` to `UserOperations.open`; `point-control` and `cancel-point-control` to existing point-control flows; `point-control-log` to the named route.

- [ ] **Step 1: Add failing integration-source tests**

Assert the compact quick menu contains only the five actions plus `全部操作…`; assert it no longer contains point-control shortcuts directly; assert `UserOperationDrawer` is mounted and its `action` event is routed through one coordinator; assert existing action methods remain reachable.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node --test test/userOperationEntryCenter.test.js test/userControlUi.test.js`

Expected: FAIL because the current menu still contains all legacy shortcuts and no Drawer.

- [ ] **Step 3: Implement page coordination**

Add selected-operation-user and Drawer-open state, preserve the action-button ref map, open the Drawer from `全部操作…`, and close it through its lifecycle before opening same-level Drawer/navigation flows. Existing Dialog actions may layer above the operation Drawer and must return focus to their action card.

- [ ] **Step 4: Update prior assertions to the approved compact menu**

Change the legacy test from requiring direct point-control menu items to requiring them in the full operation Drawer configuration, while retaining safeguards for point-control cancellation and existing dialogs.

- [ ] **Step 5: Run focused tests**

Run: `node --test test/userOperationEntryCenter.test.js test/userControlUi.test.js test/dialogLifecycle.test.js`

Expected: PASS.

### Task 4: Full Verification and Build

**Files:**
- Modify only files required to fix verified regressions within this feature scope.

**Interfaces:**
- Consumes the completed configuration, Drawer, and list integration.
- Produces a buildable project with passing automated tests and a documented manual-verification status.

- [ ] **Step 1: Run all automated tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: Vite completes successfully with no compilation errors.

- [ ] **Step 3: Run source-quality checks**

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 4: Manually verify supported browser interactions when tooling permits**

Check desktop, narrow mobile, low-height viewport, 200% zoom, reduced motion, backdrop/drag/swipe resistance, content-only scrolling, fixed close control, focus entry/trap/return, Escape, nested Dialog layering, page isolation, and cleanup. Record every check not actually performed as unverified.

- [ ] **Step 5: Review the final diff**

Confirm no planned entry mutates data, no existing unrelated behavior changed, and all operation labels match the approved design.
