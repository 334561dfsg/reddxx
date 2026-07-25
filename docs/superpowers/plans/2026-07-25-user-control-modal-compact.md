# User Control Modal Compact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the vertical and horizontal density of user-control setting and cancellation dialogs while preserving all behavior, except removing the explicitly rejected module-scope helper sentence.

**Architecture:** Keep the existing shared `UserControlModal` and page-local cancellation dialogs. Make class-only layout changes, plus one intentional copy removal; do not introduce new components, state, or domain logic.

**Tech Stack:** Vue 3 SFC, Tailwind CSS utility classes, Node test runner.

## Global Constraints

- Only user-control dialog content changes; page bodies, tables, logs, detail drawers, routes, and domain rules stay unchanged.
- Keep username, UID, email, current-rule summary, direction, duration, affected modules, note validation, atomic-failure warning, and all actions.
- Remove `本次操作只影响当前模块，其他五个模块的用户规则保持不变。` from the shared setting modal.
- Do not add API, server, database, or real trading behavior.
- Preserve responsive stacking and keyboard semantics.

---

### Task 1: Compact all user-control operation dialogs

**Files:**
- Modify: `src/admin/components/user-control/UserControlModal.vue`
- Modify: `src/pages/admin/user-control/ModuleUserControlPage.vue`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Modify: `test/userControlUi.test.js`

**Interfaces:**
- Consumes: existing `UserControlModal` props/emits and page-local cancel state.
- Produces: the same props/emits and behavior with denser Tailwind classes; no new public interface.

- [ ] **Step 1: Add failing structural UI tests**

Add tests that extract the dialog nodes and assert:

```js
test('shared setting modal uses compact spacing and omits the rejected module helper', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')
  assert.match(source, /max-w-xl/)
  assert.match(source, /space-y-3 px-5 py-4/)
  assert.doesNotMatch(source, /本次操作只影响当前模块，其他五个模块的用户规则保持不变。/)
})

test('module and unified cancel dialogs use compact spacing', () => {
  const moduleSource = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')
  const userSource = read('../src/pages/admin/user/UserListPage.vue')
  assert.match(moduleSource, /data-testid="module-user-control-cancel-dialog"[\s\S]*?px-5 py-4/)
  assert.match(userSource, /data-testid="unified-user-control-cancel-dialog"[\s\S]*?px-5 py-4/)
})
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test test/userControlUi.test.js`

Expected: the new compact-spacing assertions fail because current dialogs use `max-w-2xl`, `space-y-5 px-6 py-5`, and have no cancel-dialog test IDs.

- [ ] **Step 3: Compact the shared setting modal**

In `UserControlModal.vue`:

- Change the panel to `max-w-xl`.
- Reduce header/body/footer padding to `px-5 py-4`, body grouping to `space-y-3`, option grids to `gap-2`, and option cards to `p-3`.
- Reduce secondary card and affected-module spacing without changing labels or form bindings.
- Render trading/finance effects as a compact two-column summary that still stacks on narrow screens.
- Remove only the rejected module-scope helper block.
- Keep the global atomic-failure warning and all validation attributes unchanged.

- [ ] **Step 4: Compact both cancellation dialogs**

In `ModuleUserControlPage.vue` and `UserListPage.vue`:

- Add stable `data-testid` attributes to each dialog section.
- Reduce header/body/footer padding from `px-6 py-5`/`px-6 py-4` to `px-5 py-4`/`px-5 py-3`.
- Reduce body spacing to `space-y-3`, module-list spacing where applicable, and note textareas from three rows to two.
- Keep warnings, module lists, validation, MFA flow, and button behavior unchanged.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test test/userControlUi.test.js`

Expected: all focused UI tests pass.

- [ ] **Step 6: Run complete verification**

Run: `npm test`

Expected: all tests pass with zero failures.

Run: `npm run build`

Expected: Vite production build exits 0.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 7: Commit the implementation**

```bash
git add src/admin/components/user-control/UserControlModal.vue src/pages/admin/user-control/ModuleUserControlPage.vue src/pages/admin/user/UserListPage.vue test/userControlUi.test.js
git commit -m "style: compact user control dialogs"
```
