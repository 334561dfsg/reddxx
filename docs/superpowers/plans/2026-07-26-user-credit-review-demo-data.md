# User Credit Review Demo Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `user_1004` four stable credit-review records that demonstrate pending increase/decrease decisions and approved/rejected history from `/admin/users/list`.

**Architecture:** Keep the existing user-scoped repository as the single owner of review state. Expand only its deterministic initializer, then protect the consumer-visible ordering, status coverage, score arithmetic, and detached-copy behavior with the existing Node test suite.

**Tech Stack:** JavaScript ES modules, Node.js test runner, Vue 3 repository consumers.

## Global Constraints

- Do not change the Drawer, decision Dialog, MFA orchestration, permissions, validation, or global credit-score audit data.
- Keep all review IDs stable and unique.
- Keep `delta === proposedScore - beforeScore` for every row.
- Pending rows sort before processed rows; rows within each group sort by `appliedAt` descending.
- Preserve the repository's detached query results and one-time atomic decision behavior.
- Do not overwrite unrelated dirty-worktree changes.

---

### Task 1: Protect the credit-review demo dataset contract

**Files:**
- Modify: `test/userCreditMembershipRepository.test.js`

- [ ] Add a failing test asserting four rows, the literal status sequence `pending, pending, approved, rejected`, one positive and one negative pending delta, unique IDs, valid score arithmetic, per-group descending timestamps, and detached results.
- [ ] Run `node --test --test-name-pattern="credit review demo data" test/userCreditMembershipRepository.test.js`; confirm it fails with expected `4`, actual `1`.

### Task 2: Add the minimal stable mock records

**Files:**
- Modify: `src/admin/repositories/userCreditMembershipRepository.js`

- [ ] Keep the existing pending increase row and add a pending decrease row plus one complete approved and one complete rejected historical row for `user_1004`.
- [ ] Run the focused test and `node --test test/userCreditMembershipRepository.test.js`; confirm both pass.

### Task 3: Verify component contracts and final diff

- [ ] Run `node --test test/userCreditMembershipComponents.test.js test/userCreditMembershipLayering.test.js`.
- [ ] Run `git diff --check -- src/admin/repositories/userCreditMembershipRepository.js test/userCreditMembershipRepository.test.js`.
- [ ] Review the scoped diff and commit only the repository, test, and this plan.

