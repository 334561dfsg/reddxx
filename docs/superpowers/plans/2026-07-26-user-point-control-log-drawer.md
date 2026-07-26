# User Point-Control Log Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the selected user's point-control logs in a second-layer Drawer from `/admin/users/list` while preserving the parent operation Drawer and the standalone log page.

**Architecture:** Move log normalization, filtering, labels, filters, and pagination into a reusable `UserControlLogContent.vue`. Keep route-query ownership in `UserControlLogPage.vue`, and add a lifecycle-compliant `UserControlLogDrawer.vue` that fixes the user ID and owns only Drawer state. `UserListPage.vue` opens the child Drawer directly from the action card and returns focus to that card after close.

**Tech Stack:** Vue 3 Composition API, Vue Router, Tailwind CSS, Node.js test runner, the existing Vue SFC harness, `useDialogLifecycle`, and `useAdminListPagination`.

## Global Constraints

- Preserve existing point-control data results, permissions, field meanings, pagination rules, error handling, and the `/admin/users/control-log` route.
- The operation Drawer remains mounted below the log Drawer and is isolated by the shared modal layer stack.
- Backdrop, drag, and swipe never close the log Drawer; close button and allowed Escape close only the top layer.
- The frame uses `overflow-hidden`; only the body uses `overflow-y-auto`; title and close control remain fixed.
- Opening is `200ms ease-out`; closing is `150ms ease-in`; reduced-motion removes translation and uses at most `50ms` fades.
- Mobile, tablet, desktop, low-height, 200% zoom, dynamic viewport, and safe-area layouts retain all filters, records, statuses, and actions.
- Do not modify or stage the user's unrelated changes in `UserWithdrawFlowLimitDialog.vue`, `userFundsRepository.js`, `userFundsComponents.test.js`, or `userFundsRepository.test.js`.

---

### Task 1: Reusable point-control log content

**Files:**
- Create: `src/admin/components/user-control/UserControlLogContent.vue`
- Modify: `src/pages/admin/user-control/UserControlLogPage.vue`
- Test: `test/userControlLogContent.test.js`

**Interfaces:**
- Consumes: `userControlState`, `USER_CONTROL_MODULES`, `filterUserControlLogsByDate`, `normalizeUserControlLogQuery`, `useAdminListPagination`.
- Produces: `UserControlLogContent` props `{ fixedUserId?: string, initialUserId?: string, initialModule?: string, showUserFilter?: boolean }`, event `clear-route-filters`, and `data-testid="user-control-log-content"`; the component emits no business mutation.

- [ ] **Step 1: Write the failing content behavior tests**

Add real SFC tests that seed `userControlState.value.operationLogs` and `.executionLogs`, mount the component, and assert literal outcomes:

```js
test('fixed-user log content combines only that user operation and execution rows', async (t) => {
  const harness = await mountContent({ fixedUserId: 'user_1001', showUserFilter: false })
  t.after(harness.cleanup)
  assert.match(harness.findByTestId('user-control-log-content').textContent, /batch-user-1001/)
  assert.match(harness.findByTestId('user-control-log-content').textContent, /order-user-1001/)
  assert.doesNotMatch(harness.findByTestId('user-control-log-content').textContent, /batch-user-2002/)
  assert.equal(harness.findByTestId('user-control-log-user-filter'), null)
})

test('clearing drawer filters retains the fixed user context', async (t) => {
  const harness = await mountContent({ fixedUserId: 'user_1001', initialModule: 'perpetual', showUserFilter: false })
  t.after(harness.cleanup)
  harness.findByText('清除筛选', 'button').click()
  await harness.flush()
  assert.match(harness.findByTestId('user-control-log-content').textContent, /batch-user-1001/)
  assert.doesNotMatch(harness.findByTestId('user-control-log-content').textContent, /batch-user-2002/)
})
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- test/userControlLogContent.test.js`

Expected: FAIL because `UserControlLogContent.vue` does not exist.

- [ ] **Step 3: Implement shared data and presentation**

Move the current page's label helpers and `unifiedLogs` projection into `UserControlLogContent.vue`. Initialize local filters from props and enforce the fixed user at the comparison boundary:

```js
const effectiveUserId = computed(() => props.fixedUserId || filters.userId)
const matchedRows = [...operationRows, ...executionRows].filter((log) => (
  (!effectiveUserId.value || log.userId === effectiveUserId.value)
  && (!filters.module || log.moduleKeys.includes(filters.module))
  && (!filters.source || log.source === filters.source)
  && (!filters.action || log.action === filters.action)
))

const clearFilters = () => {
  filters.userId = props.fixedUserId || ''
  filters.module = ''
  filters.source = ''
  filters.action = ''
  filters.dateFrom = ''
  filters.dateTo = ''
}
```

Keep the existing field labels, status chips, table columns, date behavior, and pagination component. Render the UID search only when `showUserFilter` is true. On narrow widths, keep the table in one controlled horizontal scroller inside the vertical body rather than removing columns.

- [ ] **Step 4: Convert the standalone page into a route-aware wrapper**

Keep `useRoute`, `useRouter`, and normalized query synchronization in `UserControlLogPage.vue`, and render:

```vue
<UserControlLogContent
  :key="`${route.query.userId || ''}:${route.query.module || ''}`"
  :initial-user-id="normalizedQuery.userId"
  :initial-module="normalizedQuery.module"
  show-user-filter
  @clear-route-filters="router.replace({ name: route.name, query: {} })"
/>
```

The shared component adds `initialUserId` and `clear-route-filters` solely for the page wrapper; fixed Drawer context continues to override editable input.

- [ ] **Step 5: Run focused and existing log tests and verify GREEN**

Run: `npm test -- test/userControlLogContent.test.js test/userControlUi.test.js test/userControlNavigation.test.js`

Expected: PASS with no warnings.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/admin/components/user-control/UserControlLogContent.vue src/pages/admin/user-control/UserControlLogPage.vue test/userControlLogContent.test.js
git commit -m "refactor: share point-control log content"
```

---

### Task 2: Lifecycle-compliant log Drawer

**Files:**
- Create: `src/admin/components/user-control/UserControlLogDrawer.vue`
- Test: `test/userControlLogDrawer.test.js`

**Interfaces:**
- Consumes: `UserControlLogContent`, `useDialogLifecycle`, props `{ visible: boolean, user: object | null, returnFocus: object | function | null }`.
- Produces: emits `close` when an intentional close is requested and `closed` after stable leave cleanup.

- [ ] **Step 1: Write failing Drawer behavior tests**

Mount the real Drawer and shared content, then assert user-visible and lifecycle behavior:

```js
test('log Drawer identifies the selected user and ignores backdrop clicks', async (t) => {
  const harness = await mountDrawer({ visible: true, user })
  t.after(harness.cleanup)
  await harness.finishTransitions()
  const drawer = harness.findByTestId('user-control-log-drawer')
  assert.equal(drawer.getAttribute('role'), 'dialog')
  assert.equal(drawer.getAttribute('aria-modal'), 'true')
  assert.match(drawer.textContent, /agent_wang · UID user_1001/)
  drawer.parent.click()
  await harness.flush()
  assert.equal(closeCount, 0)
})

test('intentional close unmounts before cleanup and returns focus once', async (t) => {
  // Click the aria-label="关闭" button, finish leave transitions, and assert
  // DOM removal < key listener release < background release < scroll release < focus.
})
```

Also cover Escape, focus trapping, a newer context surviving an old leave callback, one body scroller, safe-area declarations, and motion durations.

- [ ] **Step 2: Run the Drawer tests and verify RED**

Run: `npm test -- test/userControlLogDrawer.test.js`

Expected: FAIL because `UserControlLogDrawer.vue` does not exist.

- [ ] **Step 3: Implement the minimal Drawer**

Use the shared lifecycle and fixed-frame structure:

```js
const { rendered, phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = useDialogLifecycle({
  open: computed(() => props.visible),
  dialogRef: drawerRef,
  initialFocusRef: titleRef,
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => emit('close')
})
```

```vue
<Teleport to="body">
  <Transition name="user-control-log-drawer" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
    <div v-if="rendered" v-show="phase !== 'closing'" class="fixed inset-0 flex justify-end bg-slate-950/50" :style="layerStyle" role="presentation">
      <aside data-testid="user-control-log-drawer" class="user-control-log-drawer-panel flex h-[100vh] max-h-[100vh] w-full max-w-6xl flex-col overflow-hidden bg-white" role="dialog" aria-modal="true" aria-labelledby="user-control-log-drawer-title">
        <!-- fixed header with title, user identity, and aria-label="关闭" button -->
        <div data-testid="user-control-log-drawer-body" class="min-h-0 flex-1 overflow-y-auto">
          <UserControlLogContent :fixed-user-id="userId" :show-user-filter="false" />
        </div>
      </aside>
    </div>
  </Transition>
</Teleport>
```

Do not add a click listener to the presentation backdrop. Apply right-edge animation, reduced-motion override, `100vh`/`100dvh`, and all four safe-area paddings.

- [ ] **Step 4: Run the Drawer tests and verify GREEN**

Run: `npm test -- test/userControlLogDrawer.test.js test/dialogSfcBehavior.test.js`

Expected: PASS with no warnings.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/admin/components/user-control/UserControlLogDrawer.vue test/userControlLogDrawer.test.js
git commit -m "feat: add user point-control log drawer"
```

---

### Task 3: Open the child Drawer without navigation

**Files:**
- Modify: `src/pages/admin/user/UserListPage.vue`
- Test: `test/userControlLogDrawerIntegration.test.js`
- Modify: `test/userControlUi.test.js`

**Interfaces:**
- Consumes: `UserControlLogDrawer` props and events from Task 2; the existing action event `{ id, user, trigger }`.
- Produces: local refs `controlLogOpen`, `controlLogUser`, `controlLogReturnFocus`; handlers `closeControlLog` and `clearControlLog`.

- [ ] **Step 1: Write failing integration tests**

Exercise the mounted user list or its real action boundary and assert:

```js
test('point-control log action keeps the operation Drawer open and opens the child log Drawer', async (t) => {
  const harness = await mountUserList()
  t.after(harness.cleanup)
  // Open the selected user's operation Drawer and click its 点控日志 card.
  assert.ok(harness.findByTestId('user-operation-drawer'))
  assert.ok(harness.findByTestId('user-control-log-drawer'))
  assert.equal(routerPushes.length, 0)
})
```

Add a second assertion that closing the child leaves `user-operation-drawer` connected and returns focus to the clicked point-control card.

- [ ] **Step 2: Run the integration test and verify RED**

Run: `npm test -- test/userControlLogDrawerIntegration.test.js`

Expected: FAIL because the action still uses deferred parent close and router navigation.

- [ ] **Step 3: Wire the child Drawer**

Import `UserControlLogDrawer.vue`, add the three state refs, and replace the existing point-control-log branch before the deferred detail/assets branch:

```js
if (id === 'point-control-log') {
  controlLogUser.value = user
  controlLogReturnFocus.value = trigger
  controlLogOpen.value = true
  return
}

if (['detail', 'assets'].includes(id)) {
  deferredDrawerAction.value = { id, user }
  closeOperationDrawer()
  return
}
```

Remove the `point-control-log` router branch from `executeDeferredDrawerAction`. Render the child after `UserOperationDrawer` so the shared lifecycle registers it as the top layer:

```vue
<UserControlLogDrawer
  :visible="controlLogOpen"
  :user="controlLogUser"
  :return-focus="controlLogReturnFocus"
  @close="closeControlLog"
  @closed="clearControlLog"
/>
```

Clear user and return-focus only on `closed`, not when close begins.

- [ ] **Step 4: Run integration and point-control tests and verify GREEN**

Run: `npm test -- test/userControlLogDrawerIntegration.test.js test/userControlUi.test.js test/userOperationLayering.test.js test/userOperationEntryCenter.test.js`

Expected: PASS with no route push for the user-list log action and no regression in other deferred Drawer actions.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/pages/admin/user/UserListPage.vue test/userControlLogDrawerIntegration.test.js test/userControlUi.test.js
git commit -m "feat: open point-control logs from user drawer"
```

---

### Task 4: Regression and responsive verification

**Files:**
- Modify if failures require it: files created or modified in Tasks 1-3 only

**Interfaces:**
- Consumes: completed reusable content, Drawer, and page integration.
- Produces: verified feature with an explicit manual-check report.

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`

Expected: all tests pass with no warnings or unhandled rejections.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: Vite completes successfully with no compile errors.

- [ ] **Step 3: Perform browser checks where tooling permits**

At `/admin/users/list`, test `1440×900`, `1280×720`, `768×1024`, `390×844`, and a low-height landscape viewport. Check mouse and keyboard open/close, backdrop resistance, Escape, Tab loop, focus return, parent isolation, horizontal table access, 200% zoom, reduced motion, long username/UID, and viewport resize while open. Record any unavailable touch, virtual keyboard, dynamic chrome, safe-area, high-contrast, or assistive-technology checks as unverified rather than passed.

- [ ] **Step 4: Review the diff and unrelated changes**

Run:

```bash
git diff --check
git status --short
git diff -- src/admin/components/user-control/UserControlLogContent.vue src/admin/components/user-control/UserControlLogDrawer.vue src/pages/admin/user-control/UserControlLogPage.vue src/pages/admin/user/UserListPage.vue test/userControlLogContent.test.js test/userControlLogDrawer.test.js test/userControlLogDrawerIntegration.test.js test/userControlUi.test.js
```

Confirm the four unrelated pre-existing modified files remain unstaged and unchanged by this work.

- [ ] **Step 5: Commit any verification-only fixes**

If Task 4 required source or test changes, stage only the feature files and commit:

```bash
git add src/admin/components/user-control/UserControlLogContent.vue src/admin/components/user-control/UserControlLogDrawer.vue src/pages/admin/user-control/UserControlLogPage.vue src/pages/admin/user/UserListPage.vue test/userControlLogContent.test.js test/userControlLogDrawer.test.js test/userControlLogDrawerIntegration.test.js test/userControlUi.test.js
git commit -m "test: verify point-control log drawer"
```
