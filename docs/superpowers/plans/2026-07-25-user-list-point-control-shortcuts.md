# User List Point-Control Shortcuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make “点控” and “取消点控” permanently available as simultaneous user-list shortcuts, with a safe empty cancellation state and matching product documentation.

**Architecture:** Keep the existing unified setting and cancellation domain actions. Change only the user-list menu rendering and unified cancellation dialog presentation: both shortcuts always open their flows, while the dialog derives cancelable modules from the latest shared rule state and blocks MFA when that list is empty.

**Tech Stack:** Vue 3, JavaScript, Node test runner, Tailwind CSS, Vite.

## Global Constraints

- “点控” and “取消点控” must both always be visible and clickable.
- “是否点控中” remains informational and must not control shortcut rendering.
- Cancellation must include active rules created from either unified or module-specific entry points.
- With zero active rules, show `当前没有可取消的模块`, disable the cancellation note, and disable `继续 MFA 验证`.
- With zero active rules, do not open MFA, write a cancellation log, or change rule state.
- Clicking the dialog backdrop must not close it.
- The dialog overlay must cover the viewport; the outer frame must not scroll; only the body may scroll.
- Do not change routes, other user actions, point-control priority, atomic write rules, or Mock seed data.

---

### Task 1: Implement simultaneous shortcuts and safe cancellation empty state

**Files:**
- Modify: `test/userControlUi.test.js`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Modify: `docs/user-point-control-product-requirements.md`

**Interfaces:**
- Consumes: `hasRules(user)`, `rulesOf(user)`, `getUnifiedControlCancelItems(rules)`, `selectControlSetting(user)`, and `selectControlCancel(user)`.
- Produces: two unconditional menu buttons and a cancellation dialog whose enabled state is `cancelControlItems.length > 0`.

- [x] **Step 1: Write failing UI source tests**

Replace the status-dependent menu assertions with exact unconditional-button assertions and add cancellation-empty-state and dialog-constraint assertions:

```js
assert.match(menu, /@click="selectControlSetting\(user\)"[^>]*>点控<\/button>/)
assert.match(menu, /@click="selectControlCancel\(user\)"[^>]*>取消点控<\/button>/)
assert.doesNotMatch(menu, /v-if="!hasRules\(user\)"/)
assert.doesNotMatch(menu, /v-else/)
assert.match(source, /当前没有可取消的模块/)
assert.match(source, /:disabled="!cancelControlItems\.length"/)
assert.doesNotMatch(source, /@mousedown\.self="closeControlCancel"/)
assert.match(source, /data-testid="unified-user-control-cancel-dialog"[^>]*overflow-hidden/)
assert.match(source, /data-testid="unified-user-control-cancel-body"[^>]*overflow-y-auto/)
```

Also assert the product document contains “始终同时展示” and no longer contains “互斥展示”.

- [x] **Step 2: Run focused tests and verify RED**

Run: `node --test test/userControlUi.test.js`

Expected: FAIL because the menu is conditional, there is no cancellation empty state, the backdrop closes the dialog, and the product document still specifies mutually exclusive actions.

- [x] **Step 3: Render both shortcut buttons unconditionally**

In `UserListPage.vue`, remove `v-if="!hasRules(user)"` and `v-else` from the two point-control buttons. Preserve the existing click handlers and styling:

```vue
<button type="button" class="..." @click="selectControlSetting(user)">点控</button>
<button type="button" class="..." @click="selectControlCancel(user)">取消点控</button>
```

Keep `hasRules(user)` unchanged for the “是否点控中” column.

- [x] **Step 4: Add the cancellation empty state and dialog safeguards**

In the unified cancellation dialog:

- Remove the backdrop `@mousedown.self` close handler.
- Add `max-h-[calc(100vh-2rem)] overflow-hidden` to the dialog frame.
- Add `data-testid="unified-user-control-cancel-body"` plus `overflow-y-auto` to the body.
- Render the current module list when `cancelControlItems.length > 0`.
- Otherwise render `当前没有可取消的模块`.
- Disable the cancellation note when the list is empty.
- Disable the MFA button unless both a cancelable module and a non-empty note exist.

```vue
<textarea :disabled="!cancelControlItems.length" ... />
<button :disabled="!cancelControlItems.length || !cancelNote.trim()" ...>
  继续 MFA 验证
</button>
```

Guard `confirmControlCancel` so a programmatic call with no cancelable modules returns before changing `pendingMfaAction` or opening MFA.

- [x] **Step 5: Synchronize the product document**

Update `docs/user-point-control-product-requirements.md` so it states:

- “点控”和“取消点控”始终同时展示并可点击。
- “是否点控中” is informational only.
- The cancellation shortcut checks all six current module rules regardless of source.
- With no effective rules, the dialog shows `当前没有可取消的模块` and cannot proceed to MFA.

Remove the old table and acceptance statements that make the two actions mutually exclusive.

- [x] **Step 6: Run focused tests and verify GREEN**

Run: `node --test test/userControlUi.test.js`

Expected: all UI tests pass.

- [ ] **Step 7: Verify the full project and actual interactions** (automated verification complete; actual browser interaction verification is unavailable in this environment)

Run: `npm test`

Expected: all tests pass with zero failures.

Run: `npm run build`

Expected: Vite production build exits with code 0.

Run: `git diff --check`

Expected: no output and exit code 0.

Browser verification at a desktop viewport and a narrow mobile viewport must confirm:

1. A user with rules and a user without rules both show “点控” and “取消点控”.
2. A user without rules opens the cancellation empty state and cannot continue to MFA.
3. A user with module rules lists the actual cancelable modules.
4. Clicking the backdrop does not close the dialog.
5. The overlay covers the viewport and the outer dialog has no scrollbar; long content scrolls only in the body.

- [x] **Step 8: Commit**

```bash
git add test/userControlUi.test.js src/pages/admin/user/UserListPage.vue docs/user-point-control-product-requirements.md docs/superpowers/plans/2026-07-25-user-list-point-control-shortcuts.md
git commit -m "feat: keep point-control shortcuts available"
```
