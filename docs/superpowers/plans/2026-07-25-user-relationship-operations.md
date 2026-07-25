# User Relationship Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the six user relationship operations and make every child Dialog or Drawer opened from the user operation center participate in one accessible shared layer stack.

**Architecture:** A focused relationship repository owns tree queries, validation, atomic mock mutations, audit records, and report aggregation. The user list page orchestrates a persistent first-layer operation Drawer and focused second-layer business components; every modal surface uses `useDialogLifecycle` so visual order, `inert`, Escape, focus return, and scroll lock follow registration order instead of fixed z-index values.

**Tech Stack:** Vue 3 Composition API, Vite, Tailwind CSS, Node `node:test`, existing `useDialogLifecycle` modal stack.

## Global Constraints

- Backdrop clicks, drag, and swipe must never close a Dialog or Drawer.
- Dialog open animation is 200ms ease-out from `scale(0.96)`; close is 150ms ease-in; reduced motion removes scale and lasts at most 50ms.
- Right Drawer open animation is 200ms ease-out from the right; close is 150ms ease-in; reduced motion removes translation and lasts at most 50ms.
- Modal frames use `overflow: hidden`; only body regions use `overflow-y: auto`; fixed headers retain an always-visible `aria-label="关闭"` button.
- Only the top registered layer is interactive. Lower layers and the page remain `inert`; Escape closes only the top layer and focus returns to the child trigger after the close animation.
- New modal layers use `useDialogLifecycle().layerStyle`; do not add fixed business-component modal z-index values.
- Sensitive mutations require a nonblank reason of at most 200 characters and write one local audit record.
- Relationship mutations must prevent self-parent and descendant-parent cycles and update related fields atomically.
- Existing user operation entry names and four-group order remain unchanged.

---

### Task 1: User relationship repository

**Files:**
- Create: `src/admin/repositories/userRelationshipRepository.js`
- Test: `test/userRelationshipRepository.test.js`

**Interfaces:**
- Consumes: mutable `usersList` objects from `src/admin/mock/user.js` and role/status constants.
- Produces: `getUserById(id)`, `getDirectReferrals(id)`, `getDescendants(id)`, `getParentCandidates(id)`, `validateProfile(input, userId)`, `updateProfile(userId, patch)`, `resetParent(input)`, `updateAgentRole(input)`, `getTeamReport(id)`, `getRelationshipAuditLog()` and `__resetRelationshipAuditLogForTests()`.

- [ ] **Step 1: Write failing repository tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getDirectReferrals,
  getDescendants,
  getParentCandidates,
  validateProfile,
  resetParent,
  updateAgentRole,
  getTeamReport,
  getRelationshipAuditLog,
  __resetRelationshipAuditLogForTests
} from '../src/admin/repositories/userRelationshipRepository.js'

test('returns direct children and breadth-first descendants with paths', () => {
  const directIds = getDirectReferrals('user_1001').map((row) => row.id)
  for (const id of ['user_1002', 'user_1003', 'user_1005', 'user_1007']) assert.ok(directIds.includes(id))
  assert.equal(new Set(directIds).size, directIds.length)
  const chen = getDescendants('user_1001').find((row) => row.id === 'user_1004')
  assert.equal(chen.depth, 2)
  assert.deepEqual(chen.path.map((row) => row.id), ['user_1001', 'user_1003', 'user_1004'])
})

test('parent candidates exclude self, descendants, current parent and banned users', () => {
  const ids = getParentCandidates('user_1003').map((row) => row.id)
  assert.equal(ids.includes('user_1003'), false)
  assert.equal(ids.includes('user_1004'), false)
  assert.equal(ids.includes('user_1001'), false)
  assert.equal(ids.includes('user_1008'), false)
})

test('profile validation reports duplicate and malformed fields', () => {
  const errors = validateProfile({ username: 'vip_zhang', email: 'bad', phone: '+86 13800001001', remark: '' }, 'user_1004')
  assert.equal(errors.username, '用户名已存在')
  assert.equal(errors.email, '邮箱格式不正确')
  assert.equal(errors.phone, '手机号已存在')
})

test('parent and agent mutations are atomic and audited', () => {
  __resetRelationshipAuditLogForTests()
  assert.throws(() => resetParent({ userId: 'user_1003', parentId: 'user_1004', reason: 'invalid' }), /不能选择自己的下级/)
  assert.equal(getRelationshipAuditLog().length, 0)
  updateAgentRole({ userId: 'user_1005', role: 'agent', reason: '业务升级' })
  assert.equal(getRelationshipAuditLog().at(-1).type, 'agent-role')
})

test('team report derives totals and direct branch summaries', () => {
  const report = getTeamReport('user_1001')
  assert.equal(report.directCount, getDirectReferrals('user_1001').length)
  assert.equal(report.memberCount, getDescendants('user_1001').length)
  assert.ok(report.branches.every((branch) => branch.memberCount >= 1))
})
```

- [ ] **Step 2: Run the repository tests and verify RED**

Run: `node --test test/userRelationshipRepository.test.js`

Expected: FAIL because `userRelationshipRepository.js` does not exist.

- [ ] **Step 3: Implement breadth-first queries, validation, atomic mutations, audit, and aggregation**

```js
const relationshipAuditLog = []
const idOf = (user) => String(user?.id ?? user?.userId ?? '')

export const getDescendants = (rootId) => {
  const root = getUserById(rootId)
  if (!root) return []
  const result = []
  const visited = new Set([idOf(root)])
  const queue = [{ user: root, depth: 0, path: [root] }]
  while (queue.length) {
    const current = queue.shift()
    for (const child of getDirectReferrals(idOf(current.user))) {
      if (visited.has(idOf(child))) continue
      visited.add(idOf(child))
      const item = { ...child, depth: current.depth + 1, path: [...current.path, child] }
      result.push(item)
      queue.push({ user: child, depth: item.depth, path: item.path })
    }
  }
  return result
}
```

Implement mutation functions by computing and validating every affected row before changing any object. Store `before`, `after`, `reason`, `affectedUserIds`, and an ISO timestamp in one audit record after a successful mutation.

- [ ] **Step 4: Run repository tests and full tests**

Run: `node --test test/userRelationshipRepository.test.js && npm test`

Expected: repository tests and the existing suite PASS.

- [ ] **Step 5: Commit repository work**

```bash
git add src/admin/repositories/userRelationshipRepository.js test/userRelationshipRepository.test.js
git commit -m "feat: add user relationship repository"
```

### Task 2: Shared child-layer migration

**Files:**
- Modify: `src/admin/components/user/UserDepositAction.vue`
- Modify: `src/admin/components/user/UserAdjustAction.vue`
- Modify: `src/admin/components/user/UserTransferAction.vue`
- Modify: `src/admin/components/user/UserFreezeAction.vue`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Test: `test/userOperationLayering.test.js`
- Test: `test/dialogSfcBehavior.test.js`

**Interfaces:**
- Consumes: `useDialogLifecycle({ open, dialogRef, initialFocusRef, returnFocusRef, requestClose, closeDisabled })`.
- Produces: each legacy action modal registers its root panel, binds `:style="layerStyle"` to its viewport overlay, closes through `requestDialogClose`, and emits completion only after its leave animation.

- [ ] **Step 1: Write failing layer-contract tests**

```js
test('legacy user action modals use the shared modal layer instead of fixed z-index', () => {
  for (const file of actionFiles) {
    const source = readFileSync(file, 'utf8')
    assert.match(source, /useDialogLifecycle/)
    assert.match(source, /:style="layerStyle"/)
    assert.doesNotMatch(source, /fixed inset-0 z-\[(?:50|60|70)\]|fixed inset-0 z-(?:50|60|70)/)
  }
})

test('operation Drawer can remain mounted while a child action becomes top layer', () => {
  assert.match(listSource, /operationChildReturnFocus/)
  assert.match(listSource, /:return-focus="operationChildReturnFocus"/)
})
```

- [ ] **Step 2: Run layer tests and verify RED**

Run: `node --test test/userOperationLayering.test.js test/dialogSfcBehavior.test.js`

Expected: FAIL on fixed z-index and missing lifecycle contracts.

- [ ] **Step 3: Migrate the four legacy action modals**

For each action component, add panel/title refs and shared lifecycle state:

```js
const panelRef = ref(null)
const titleRef = ref(null)
const returnFocusRef = ref(null)
const { rendered, phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = useDialogLifecycle({
  open: isOpen,
  dialogRef: panelRef,
  initialFocusRef: titleRef,
  returnFocusRef,
  requestClose: () => { isOpen.value = false },
  closeDisabled: submitting
})
const open = (returnFocus = null) => {
  if (phase.value !== 'closed') return false
  returnFocusRef.value = returnFocus
  resetForm()
  isOpen.value = true
  return true
}
```

Teleport the overlay to `body`, remove fixed z-index classes, apply `:style="layerStyle"`, prevent backdrop close, and retain the overlay through the 150ms leave transition.

- [ ] **Step 4: Pass the originating operation card to legacy actions**

```js
const operationChildReturnFocus = ref(null)
const handleOperationDrawerAction = async ({ id, user, trigger }) => {
  operationChildReturnFocus.value = trigger
  // keep operationDrawerOpen true for child modal actions
  if (regularActions[id]) await openRegularAction(user, regularActions[id], trigger)
}
```

Update `UserOperations.open(action, returnFocus)` to forward `returnFocus` to the selected child component.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test test/userOperationLayering.test.js test/dialogSfcBehavior.test.js test/userOperationEntryCenter.test.js && npm test`

Expected: all tests PASS.

- [ ] **Step 6: Commit shared layering migration**

```bash
git add src/admin/components/user/UserDepositAction.vue src/admin/components/user/UserAdjustAction.vue src/admin/components/user/UserTransferAction.vue src/admin/components/user/UserFreezeAction.vue src/pages/admin/user/UserListPage.vue test/userOperationLayering.test.js test/dialogSfcBehavior.test.js
git commit -m "fix: stack user operation dialogs above drawer"
```

### Task 3: Relationship member Drawer

**Files:**
- Create: `src/admin/components/user/UserRelationshipDrawer.vue`
- Modify: `src/admin/config/userOperations.js`
- Modify: `src/admin/components/user/UserOperationDrawer.vue`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Test: `test/userRelationshipComponents.test.js`

**Interfaces:**
- Consumes: `getDirectReferrals(userId)` and `getDescendants(userId)`.
- Produces: `<UserRelationshipDrawer :open :user :mode :return-focus @close @closed />`; operation action payload `{ id, user, trigger }`.

- [ ] **Step 1: Write failing entry and component tests**

```js
test('relationship entries are available and have dedicated handlers', () => {
  assert.equal(getUserOperationEntry('direct-referrals').handler, 'direct-referrals')
  assert.equal(getUserOperationEntry('all-referrals').handler, 'all-referrals')
  assert.equal(getUserOperationEntry('direct-referrals').status, 'available')
})

test('relationship Drawer uses one body scroller and shared layering', () => {
  assert.match(source, /useDialogLifecycle/)
  assert.match(source, /:style="layerStyle"/)
  assert.match(source, /data-testid="relationship-drawer-body"[^>]*overflow-y-auto/)
  assert.match(source, /aria-label="关闭"/)
})
```

- [ ] **Step 2: Run component tests and verify RED**

Run: `node --test test/userRelationshipComponents.test.js`

Expected: FAIL because entries remain planned and the component is absent.

- [ ] **Step 3: Emit the operation-card trigger**

```js
const selectEntry = (entry, event) => {
  if (phase.value !== 'open') return
  emit('action', { id: entry.id, user: props.user, trigger: event.currentTarget })
}
```

Bind cards with `@click="selectEntry(entry, $event)"` so every child layer has a stable return target.

- [ ] **Step 4: Implement the reusable Drawer**

Use a fixed header, fixed filter area, one scrolling body, empty-state copy, and rows showing username, UID, role, status, parent, level/path, balance, and registration time. `mode="direct"` calls `getDirectReferrals`; `mode="all"` calls `getDescendants`. Search username/email/UID and filter status/role in computed state.

- [ ] **Step 5: Wire both actions in the user list page**

Keep the operation Drawer open, set `{ mode, user, trigger }`, then open `UserRelationshipDrawer`. On child close, retain the parent Drawer and return focus to the trigger card.

- [ ] **Step 6: Run focused tests and commit**

Run: `node --test test/userRelationshipComponents.test.js test/userOperationEntryCenter.test.js && npm test`

```bash
git add src/admin/components/user/UserRelationshipDrawer.vue src/admin/config/userOperations.js src/admin/components/user/UserOperationDrawer.vue src/pages/admin/user/UserListPage.vue test/userRelationshipComponents.test.js
git commit -m "feat: add user relationship member drawer"
```

### Task 4: Edit profile Dialog

**Files:**
- Create: `src/admin/components/user/UserProfileEditDialog.vue`
- Modify: `src/admin/config/userOperations.js`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Test: `test/userRelationshipComponents.test.js`

**Interfaces:**
- Consumes: `validateProfile(input, userId)` and `updateProfile(userId, patch)`.
- Produces: `<UserProfileEditDialog :open :user :return-focus @close @saved />`, where `saved` emits the updated user.

- [ ] **Step 1: Add failing tests for form fields, errors, and layer behavior**

```js
test('profile editor validates identity fields and keeps errors readable', () => {
  assert.match(source, /编辑用户资料/)
  for (const model of ['username', 'email', 'phone', 'remark']) assert.match(source, new RegExp(`v-model="form\\.${model}"`))
  assert.match(source, /role="alert"/)
  assert.match(source, /aria-busy/)
  assert.match(source, /useDialogLifecycle/)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/userRelationshipComponents.test.js`

- [ ] **Step 3: Implement snapshot, validation, submit, and error focus**

On every open/user change, copy user fields into a fresh reactive form and clear `errors`, `submitError`, and `submitting`. Validate on submit, focus the error summary when validation or repository mutation fails, and emit `saved(updatedUser)` only after success.

- [ ] **Step 4: Make the entry available and wire the Dialog**

Set `edit-profile` to `{ status: 'available', handler: 'edit-profile' }`. Keep the parent operation Drawer mounted, update `operationDrawerUser` and the matching `users` row after save, and return focus to the card after leave.

- [ ] **Step 5: Run tests and commit**

Run: `node --test test/userRelationshipRepository.test.js test/userRelationshipComponents.test.js && npm test`

```bash
git add src/admin/components/user/UserProfileEditDialog.vue src/admin/config/userOperations.js src/pages/admin/user/UserListPage.vue test/userRelationshipComponents.test.js
git commit -m "feat: add user profile editor"
```

### Task 5: Reset parent Dialog

**Files:**
- Create: `src/admin/components/user/UserParentResetDialog.vue`
- Modify: `src/admin/config/userOperations.js`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Test: `test/userRelationshipComponents.test.js`

**Interfaces:**
- Consumes: `getParentCandidates(userId)` and `resetParent({ userId, parentId, reason })`.
- Produces: `<UserParentResetDialog :open :user :return-focus @close @saved />`.

- [ ] **Step 1: Add failing tests for candidate restrictions and confirmation**

```js
test('parent reset requires a reason and confirms the relationship impact', () => {
  assert.match(source, /当前上级/)
  assert.match(source, /新上级/)
  assert.match(source, /变更原因/)
  assert.match(source, /预计影响.*下级/)
  assert.match(source, /确认重设上级/)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/userRelationshipComponents.test.js`

- [ ] **Step 3: Implement searchable selection and an in-Dialog confirm phase**

Use one Dialog with `phaseName = 'form' | 'confirm'`, not a nested local overlay. The form phase selects a candidate or no parent and requires a trimmed reason. The confirm phase displays old parent, new parent, and `getDescendants(userId).length`; its least destructive action receives initial focus. Back returns to the preserved form.

- [ ] **Step 4: Execute repository validation again on final confirm**

Call `resetParent` only in the final confirm handler. On failure, remain open, return to form phase, display the repository error in `role="alert"`, and focus it.

- [ ] **Step 5: Wire, test, and commit**

Run: `node --test test/userRelationshipRepository.test.js test/userRelationshipComponents.test.js && npm test`

```bash
git add src/admin/components/user/UserParentResetDialog.vue src/admin/config/userOperations.js src/pages/admin/user/UserListPage.vue test/userRelationshipComponents.test.js
git commit -m "feat: add user parent reset flow"
```

### Task 6: Agent role Dialog

**Files:**
- Create: `src/admin/components/user/UserAgentRoleDialog.vue`
- Modify: `src/admin/config/userOperations.js`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Test: `test/userRelationshipComponents.test.js`

**Interfaces:**
- Consumes: `getDirectReferrals(userId)`, `getParentCandidates(userId)`, and `updateAgentRole({ userId, role, reason, successorParentId })`.
- Produces: `<UserAgentRoleDialog :open :user :return-focus @close @saved />`.

- [ ] **Step 1: Add failing tests for promotion and demotion states**

```js
test('agent role dialog requires a successor when demoting an agent with direct children', () => {
  assert.match(source, /设置为代理/)
  assert.match(source, /取消代理身份/)
  assert.match(source, /承接上级/)
  assert.match(source, /直属下级/)
  assert.match(source, /变更原因/)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/userRelationshipComponents.test.js`

- [ ] **Step 3: Implement role-specific fields and confirm phase**

For a normal user, offer promotion to agent and require only a reason. For an agent, offer demotion; when direct children exist, require `successorParentId` chosen from safe candidates or the explicit no-parent option. Show the exact affected child count and target parent in the confirm phase.

- [ ] **Step 4: Wire, test, and commit**

Run: `node --test test/userRelationshipRepository.test.js test/userRelationshipComponents.test.js && npm test`

```bash
git add src/admin/components/user/UserAgentRoleDialog.vue src/admin/config/userOperations.js src/pages/admin/user/UserListPage.vue test/userRelationshipComponents.test.js
git commit -m "feat: add user agent role flow"
```

### Task 7: Team report Drawer and end-to-end orchestration

**Files:**
- Create: `src/admin/components/user/UserTeamReportDrawer.vue`
- Modify: `src/admin/config/userOperations.js`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Test: `test/userRelationshipComponents.test.js`
- Test: `test/userOperationLayering.test.js`

**Interfaces:**
- Consumes: `getTeamReport(userId)`.
- Produces: `<UserTeamReportDrawer :open :user :return-focus @close @closed />`; all six relationship entries become available.

- [ ] **Step 1: Add failing report and orchestration tests**

```js
test('team report renders the approved metrics and branch details', () => {
  for (const label of ['团队总人数', '直属人数', '代理人数', '活跃人数', '总可用余额', '总冻结余额', '总交易量', '团队累计盈亏']) {
    assert.match(source, new RegExp(label))
  }
  assert.match(source, /分支明细/)
  assert.match(source, /useDialogLifecycle/)
})

test('all relationship entries are available after the first batch', () => {
  for (const id of ['edit-profile', 'direct-referrals', 'all-referrals', 'reset-parent', 'reset-agent', 'team-report']) {
    assert.equal(getUserOperationEntry(id).status, 'available')
  }
})
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test test/userRelationshipComponents.test.js test/userOperationLayering.test.js`

- [ ] **Step 3: Implement the report Drawer**

Render metric cards only when there are descendants. Render one branch row per direct child with member count, available/frozen balance, trading volume, and profit. Use locale number formatting and explicit positive/negative labels; do not rely on color alone.

- [ ] **Step 4: Complete entry mapping and stale-state cleanup**

Make `team-report` available, add all six handlers to the user list orchestrator, clear every child open/user/trigger state after its leave animation, and close children safely if the selected user disappears after a list refresh.

- [ ] **Step 5: Run the complete automated verification**

Run: `npm test && npm run build && git diff --check`

Expected: all tests PASS, Vite production build succeeds, and diff check produces no output.

- [ ] **Step 6: Run browser interaction verification**

At desktop and 390×700 viewports verify:

1. Each of the six relationship cards opens the correct child layer above the operation Drawer.
2. The operation Drawer is still mounted and `inert` while the child is open.
3. Backdrop click does not close either layer; Escape closes only the child.
4. Closing a child returns focus to its originating card.
5. Long member lists scroll only in the body while header and close remain fixed.
6. Invalid profile, parent, and role submissions remain open with readable focusable errors.
7. Deposit, adjustment, transfer, freeze, point-control, and cancellation surfaces appear above the operation Drawer.

Report 200% zoom, low-height beyond 700px, OS reduced motion, virtual keyboard, and safe-area device behavior as unverified unless they are actually exercised.

- [ ] **Step 7: Commit report and orchestration**

```bash
git add src/admin/components/user/UserTeamReportDrawer.vue src/admin/config/userOperations.js src/pages/admin/user/UserListPage.vue test/userRelationshipComponents.test.js test/userOperationLayering.test.js
git commit -m "feat: complete user relationship operations"
```
