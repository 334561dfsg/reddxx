# Trade User Point-Control Naming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the user-control feature in delivery, perpetual, and spot trading modules from “用户控盘” to “用户点控” everywhere users can see or tests define the terminology.

**Architecture:** Preserve all routes, components, state, and behavior. Update only the shared module metadata, navigation labels, route titles, page fallback label, and focused test expectations so the three trading modules use the same term as the finance modules.

**Tech Stack:** Vue 3, JavaScript configuration, Node test runner, Vite.

## Global Constraints

- The required label is exactly `用户点控`.
- Apply the label to delivery, perpetual, and spot modules.
- Do not change route paths, page layout, interactions, Mock data, logs, or business rules.
- Do not modify dialogs or form behavior.

---

### Task 1: Unify trading-module point-control labels

**Files:**
- Modify: `test/userControlNavigation.test.js`
- Modify: `test/userControlUi.test.js`
- Modify: `src/admin/config/nav.js`
- Modify: `src/router/modules/console.js`
- Modify: `src/features/user-control/userControl.js`
- Modify: `src/pages/admin/user-control/ModuleUserControlPage.vue`

**Interfaces:**
- Consumes: existing navigation configuration, route metadata, and `USER_CONTROL_MODULES` metadata.
- Produces: the exact label `用户点控` for delivery, perpetual, and spot without changing any path or component interface.

- [x] **Step 1: Change focused tests to require the unified label**

Update the three trading-module assertions in `test/userControlNavigation.test.js` to require `用户点控`. Add UI source assertions in `test/userControlUi.test.js` that the shared module metadata and fallback label no longer contain `用户控盘`.

```js
assert.ok(byTitle['永续合约'].children.some((item) => item.title === '用户点控'))
assert.ok(byTitle['交割合约'].children.some((item) => item.title === '用户点控'))
assert.ok(byTitle['现货交易'].children.some((item) => item.title === '用户点控'))
assert.doesNotMatch(moduleSource, /用户控盘/)
```

- [x] **Step 2: Run focused tests and verify RED**

Run: `node --test test/userControlNavigation.test.js test/userControlUi.test.js`

Expected: FAIL because navigation, route metadata, module metadata, and the page fallback still contain `用户控盘`.

- [x] **Step 3: Implement the minimal terminology change**

Replace the active trading-module labels only:

```js
{ title: '用户点控', path: '/admin/perpetual/user-control' }
{ title: '用户点控', path: '/admin/delivery/user-control' }
{ title: '用户点控', path: '/admin/spot/user-control' }
```

Update the corresponding route titles to `永续合约 / 用户点控`, `交割合约 / 用户点控`, and `现货交易 / 用户点控`. Change the three `actionLabel` values and the page fallback label to `用户点控`.

- [x] **Step 4: Run focused tests and verify GREEN**

Run: `node --test test/userControlNavigation.test.js test/userControlUi.test.js`

Expected: all focused tests pass.

- [x] **Step 5: Verify the full project**

Run: `npm test`

Expected: all tests pass with zero failures.

Run: `npm run build`

Expected: Vite production build exits with code 0.

Run: `rg -n "用户控盘" src test`

Expected: no active source or test matches.

Run: `git diff --check`

Expected: no output and exit code 0.

- [x] **Step 6: Commit**

```bash
git add test/userControlNavigation.test.js test/userControlUi.test.js src/admin/config/nav.js src/router/modules/console.js src/features/user-control/userControl.js src/pages/admin/user-control/ModuleUserControlPage.vue docs/superpowers/plans/2026-07-25-trade-user-point-control-naming.md
git commit -m "fix: unify trade user point-control naming"
```
