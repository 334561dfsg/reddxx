# User Control Modal No-Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fit the complete user point-control form in a common desktop viewport without an internal modal scrollbar.

**Architecture:** Preserve all form state and submission behavior in `UserControlModal.vue`. Reduce vertical density, use a slightly wider dialog, merge duplicated result information into direction choices, and validate the rendered modal at desktop viewport height.

**Tech Stack:** Vue 3, Tailwind CSS, Node test runner, Vite, in-app browser.

## Global Constraints

- Do not remove form fields, validation, warnings, or actions.
- Do not use `overflow-y-auto` on the dialog.
- Keep the dialog usable on smaller viewports without clipping content.

---

### Task 1: Compact modal structure

**Files:**
- Modify: `test/userControlUi.test.js`
- Modify: `src/admin/components/user-control/UserControlModal.vue`

- [x] Write failing structural tests for no internal overflow, wider dialog, integrated result copy, compact spacing, and a two-row note.
- [x] Run `node --test test/userControlUi.test.js` and verify RED.
- [x] Implement the compact layout while preserving all bindings and handlers.
- [x] Run focused tests and verify GREEN.

### Task 2: Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-07-25-user-control-modal-no-scroll.md`

- [x] Run `npm test`, `npm run build`, and `git diff --check`.
- [x] Preview the page and inspect the open modal at a common desktop viewport; confirm the modal has no internal vertical scrollbar and no clipped footer.
- [x] Commit with `git commit -m "style: remove user control modal scrolling"`.
