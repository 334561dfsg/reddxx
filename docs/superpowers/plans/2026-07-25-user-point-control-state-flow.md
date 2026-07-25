# User Point-Control State Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every simplified user point-control state observable in the frontend Demo and provide a developer-facing state transition document.

**Architecture:** Keep current rules in the existing `rules` map and terminal outcomes in rule history or logs. Extend domain log outcomes only where required for failed atomic writes and failed one-time executions, then build deterministic seed scenarios through the public domain functions.

**Tech Stack:** Vue 3, JavaScript domain helpers, frontend Mock state, Node test runner, Vite.

## Global Constraints

- Current UI states are only 未设置、待执行、生效中.
- Historical outcomes are 已执行、已取消、已覆盖、失败.
- Do not generate new `processing` Demo data or add a processing UI entry.
- Unified write failure preserves all six prior rules.
- Frontend Demo only; no server API.
- Preserve dialog content and layout; comply with repository dialog rules for backdrop and overflow behavior.

---

### Task 1: Protect simplified domain transitions

**Files:**
- Modify: `test/userControlDomain.test.js`
- Modify: `src/features/user-control/userControl.js`

- [x] Add failing tests proving successful operation logs use `status: 'success'`, unified failure adds a failed log while preserving all rules, and failed one-time execution adds a failed execution log while leaving the rule active.
- [x] Run `node --test test/userControlDomain.test.js` and verify RED.
- [x] Implement the minimal log outcome behavior in `applyUnifiedControl`, `applyModuleControl`, `cancelUnifiedControl`, `cancelModuleControl`, and `consumeModuleControl`.
- [x] Run the focused domain test and verify GREEN.

### Task 2: Complete the Demo data matrix

**Files:**
- Modify: `test/userControlDomain.test.js`
- Modify: `src/admin/mock/userControl.js`

- [x] Add a failing seed test that checks active once, active permanent, consumed, cancelled, superseded, failed operation, failed execution, unified, divergent, partial execution, and users with no rules.
- [x] Run the focused test and verify RED.
- [x] Add deterministic seed users for unified cancellation, atomic write failure, and failed execution while retaining existing synchronized, divergent, and progressed examples.
- [x] Run the focused test and verify GREEN.

### Task 3: Simplify UI status vocabulary

**Files:**
- Modify: `test/userControlUi.test.js`
- Modify: `src/pages/admin/user-control/ModuleUserControlPage.vue`
- Modify: `src/pages/admin/user-control/UserControlLogPage.vue`

- [x] Add failing UI tests that the module filter omits `processing`, current active states map to 待执行 or 生效中, and unified operation logs bind their real success or failure status.
- [x] Run `node --test test/userControlUi.test.js` and verify RED.
- [x] Remove the processing filter and unused processing presentation branch; bind operation log status from log data.
- [x] Run the focused UI test and verify GREEN.

### Task 4: Write the developer state document

**Files:**
- Create: `docs/user-point-control-state-flow.md`

- [x] Document state definitions, transitions, trigger conditions, invariants, UI labels, module effects, priority, unified rollback, log requirements, and the Demo user matrix.
- [x] Cross-check every document state against an automated seed assertion and remove ambiguous or unsupported rules.

### Task 5: Verify and commit

- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run `git diff --check`.
- [x] Browser-check module state filters/detail examples and success/failure rows in 用户点控日志.
- [x] Commit with `git commit -m "feat: complete user point-control demo states"`.
