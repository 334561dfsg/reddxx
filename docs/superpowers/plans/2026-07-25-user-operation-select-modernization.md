# User Operation Select Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace legacy Select controls in direct user-operation paths with visible choices or a standards-compliant searchable single-select Combobox while preserving business payloads.

**Architecture:** A reusable `PanelSingleSelect.vue` owns committed selection, draft query, active option, keyboard/ARIA behavior, orphaned values, and popup lifecycle. Small stable option sets remain native radio cards or segmented filter buttons. Business dialogs remain responsible for validation and payload construction.

**Tech Stack:** Vue 3 `<script setup>`, Tailwind CSS, Node test runner, Vue Test Utils, WAI-ARIA Combobox/Listbox patterns.

## Global Constraints

- New committed values only come from existing enabled options; query and active option never mutate the committed value.
- Non-submit close restores the committed display value and discards query/active draft state.
- Explicit `searchPlacement="panel"` is frozen for each open session; no modal backdrop is added.
- Stable IDs connect disclosure, inner Combobox, Listbox, and options; only one rendered active option has `aria-selected="true"`.
- Existing form payload shapes and repository semantics must remain unchanged.
- `UserDetailDrawer` embedded legacy forms are excluded from this batch.

---

### Task 1: Shared panel single-select Combobox

**Files:**
- Create: `src/admin/components/form/PanelSingleSelect.vue`
- Create: `test/panelSingleSelect.test.js`

**Interfaces:**
- Props: `modelValue`, `options`, `label`, `placeholder`, `searchLabel`, `required`, `disabled`, `readonly`, `invalid`, `errorId`, `idBase`
- Option: `{ value: string|number, label: string, searchText?: string, disabled?: boolean }`
- Emits: `update:modelValue`, `change`

- [ ] **Step 1: Write failing committed/draft tests**

Test opening from a committed option, immediate local filtering, no value change from typing/hover/Arrow navigation, explicit click/Enter commit, Escape/outside non-submit restoration, and query reset on reopen.

- [ ] **Step 2: Write failing keyboard and ARIA tests**

Test disclosure `aria-expanded`/stable controls ID, inner `role="combobox"` with `aria-autocomplete="list"`, stable Listbox/option IDs, unique active `aria-selected`, disabled option skipping, Arrow navigation, caret-preserving Home/End, Tab composite behavior, and focus return after close animation.

- [ ] **Step 3: Write failing state tests**

Test disabled cannot open, readonly can be read but not search/select, orphaned committed value retains cached label and exposes invalid state, empty results announce count, and option refresh does not auto-select.

- [ ] **Step 4: Verify RED**

Run: `node --test test/panelSingleSelect.test.js`

Expected: FAIL because `PanelSingleSelect.vue` does not exist.

- [ ] **Step 5: Implement minimal component**

Keep separate refs for `open`, `query`, `activeValue`, and a session snapshot. Filter by normalized `label + searchText`; reconcile active in the order existing active, committed enabled option, first enabled result, then null. Emit only from `commitOption`. Use 150ms open, 100ms close, and reduced-motion 50ms with no translation.

- [ ] **Step 6: Verify GREEN and commit**

Run: `node --test test/panelSingleSelect.test.js`

```bash
git add src/admin/components/form/PanelSingleSelect.vue test/panelSingleSelect.test.js
git commit -m "feat: add standards compliant panel select"
```

### Task 2: Parent and successor user selectors

**Files:**
- Modify: `src/admin/components/user/UserParentResetDialog.vue`
- Modify: `src/admin/components/user/UserAgentRoleDialog.vue`
- Modify: `test/userRelationshipOperations.test.js`

**Interfaces:**
- Consumes: `PanelSingleSelect` with candidate options `{ value: candidate.id, label: candidate.username, searchText: candidate.id }`
- Preserves payload fields: `parentId` and `successorParentId`

- [ ] **Step 1: Write failing component tests**

Assert both dialogs contain no `<select>`, `UserParentResetDialog` no longer contains a standalone `form.search` or “搜索新上级” input, the Combobox searches username, email, and UID, preserves the committed candidate until explicit selection, includes the enabled “无上级” option, retains exact submit payloads, and rejects orphaned/disabled candidates.

- [ ] **Step 2: Verify RED**

Run: `node --test test/userRelationshipOperations.test.js`

Expected: FAIL because both dialogs still render native `<select>`.

- [ ] **Step 3: Replace native selects**

Remove `form.search`, `searchRef`, the standalone search label/input, and candidate pre-filtering from `UserParentResetDialog`. Map every eligible candidate into stable options with email and UID in `searchText`, then bind `v-model` to the existing form fields. Use explicit `idBase` values per dialog, visible labels, required/invalid ownership on the outer field, and contextual inner search labels (“搜索新上级用户”, “搜索承接上级用户”).

- [ ] **Step 4: Verify GREEN and commit**

Run: `node --test test/panelSingleSelect.test.js test/userRelationshipOperations.test.js`

```bash
git add src/admin/components/user/UserParentResetDialog.vue src/admin/components/user/UserAgentRoleDialog.vue test/userRelationshipOperations.test.js
git commit -m "refactor: modernize parent user selectors"
```

### Task 3: Deposit and transfer visible choices

**Files:**
- Modify: `src/admin/components/user/UserDepositAction.vue`
- Modify: `src/admin/components/user/UserTransferAction.vue`
- Modify: existing deposit/transfer component tests or create `test/userFundsActionChoices.test.js`

**Interfaces:**
- Preserves deposit payload: existing target account field and amount fields.
- Preserves transfer payload: existing from-account, to-account, coin, and amount fields.

- [ ] **Step 1: Write failing payload and accessibility tests**

Assert no `<select>` remains, every group has a visible `fieldset`/`legend`, keyboard-selectable native radios emit the same payload, current selections are visible, and the selected transfer source is disabled as a destination without silently changing another committed field.

- [ ] **Step 2: Verify RED**

Run: `node --test test/userFundsActionChoices.test.js`

Expected: FAIL because native selects remain.

- [ ] **Step 3: Implement radio cards**

Render account and coin options as compact responsive radio-card grids. Keep the existing model fields and submit functions unchanged. Add textual disabled explanation for the same-account destination.

- [ ] **Step 4: Verify GREEN and commit**

Run: `node --test test/userFundsActionChoices.test.js`

```bash
git add src/admin/components/user/UserDepositAction.vue src/admin/components/user/UserTransferAction.vue test/userFundsActionChoices.test.js
git commit -m "refactor: expose funds action choices"
```

### Task 4: Relationship filters and legacy credit choices

**Files:**
- Modify: `src/admin/components/user/UserRelationshipDrawer.vue`
- Modify: `src/admin/components/user/UserAdjustAction.vue`
- Modify: `test/userRelationshipOperations.test.js`
- Create or modify: `test/userAdjustActionChoices.test.js`

**Interfaces:**
- Relationship filters preserve `status` and `role` values.
- VIP preserves numeric level; rule selectors preserve rule IDs.

- [ ] **Step 1: Write failing tests**

Assert relationship filters are visible `aria-pressed` segmented buttons with wrapping layout and unchanged filtering. Assert VIP is a labelled radio group. Assert earn/deduction rule selectors use `PanelSingleSelect`, search rule labels, do not commit on query, and preserve existing form payloads.

- [ ] **Step 2: Verify RED**

Run: `node --test test/userRelationshipOperations.test.js test/userAdjustActionChoices.test.js`

Expected: FAIL because legacy native selects remain.

- [ ] **Step 3: Implement visible filters and choices**

Replace relationship selects with two labelled segmented groups. Replace VIP with radio cards. Map rule objects to `PanelSingleSelect` options with rule label plus score/direction search text; retain the existing selection fields and validation.

- [ ] **Step 4: Verify GREEN and commit**

Run: `node --test test/panelSingleSelect.test.js test/userRelationshipOperations.test.js test/userAdjustActionChoices.test.js`

```bash
git add src/admin/components/user/UserRelationshipDrawer.vue src/admin/components/user/UserAdjustAction.vue test/userRelationshipOperations.test.js test/userAdjustActionChoices.test.js
git commit -m "refactor: modernize user operation choices"
```

### Task 5: Select modernization verification

**Files:**
- Verify the direct-operation component set; modify only defects exposed by checks.

- [ ] **Step 1: Audit native selects in scope**

Run:

```bash
rg -n "<select" src/admin/components/user/UserDepositAction.vue src/admin/components/user/UserTransferAction.vue src/admin/components/user/UserRelationshipDrawer.vue src/admin/components/user/UserAgentRoleDialog.vue src/admin/components/user/UserParentResetDialog.vue src/admin/components/user/UserAdjustAction.vue
```

Expected: no output.

- [ ] **Step 2: Run focused and full automated checks**

Run: `node --test test/panelSingleSelect.test.js test/userRelationshipOperations.test.js test/userFundsActionChoices.test.js test/userAdjustActionChoices.test.js`

Expected: zero failures.

Run: `npm test`

Expected: zero failures.

Run: `npm run build`

Expected: Vite exits with code 0.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 3: Browser interaction verification**

Verify mouse, touch, keyboard, screen-reader semantics, popup clipping, 200% zoom, narrow/low-height viewports, virtual keyboard, orphaned values, disabled options, repeated open/close, and reduced motion. Record every unavailable check as unverified with exact required follow-up.

- [ ] **Step 4: Commit verification fixes if any**

```bash
git add src/admin/components/form/PanelSingleSelect.vue src/admin/components/user/UserParentResetDialog.vue src/admin/components/user/UserAgentRoleDialog.vue src/admin/components/user/UserDepositAction.vue src/admin/components/user/UserTransferAction.vue src/admin/components/user/UserRelationshipDrawer.vue src/admin/components/user/UserAdjustAction.vue test/panelSingleSelect.test.js test/userRelationshipOperations.test.js test/userFundsActionChoices.test.js test/userAdjustActionChoices.test.js
git commit -m "fix: harden user operation selectors"
```
