# User Agent Subordinates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an agent-only “查看下级用户” operation on `/admin/users/list` that opens a searchable, filterable, paginated Drawer of the selected agent's first-level assigned customers.

**Architecture:** Add a deterministic repository dedicated to agent-assignment members, a focused modal Drawer component that owns only presentation/filter/pagination state, and page-level orchestration in `UserListPage.vue`. Reuse `CompactPagination` and `useDialogLifecycle` so the new layer follows the same focus, isolation, animation, and cleanup contract as the existing agent report Drawer.

**Tech Stack:** Vue 3 Composition API, Tailwind CSS, native `node:test`, the repository's Vue SFC harness, Vite.

## Global Constraints

- Agent subordinates are first-level customers assigned to the agent; never derive them from fission descendants and never recurse.
- Only users with `role === 'agent'` or fallback `isAgent === true` receive the entry.
- The parent user-operation Drawer stays mounted while the subordinate Drawer is open.
- The modal backdrop never closes the Drawer; only intentional in-Drawer actions and allowed Escape close it.
- The frame is non-scrolling; only the body scrolls, with fixed title and `aria-label="关闭"` control.
- Preserve `200ms ease-out` open, `150ms ease-in` close, and no more than `50ms` fade without translation for Reduced Motion.
- Search/filter changes reset to page 1; shrinking results clamp the current page; each page contains 10 rows.
- Desktop keeps two operation columns and narrow viewports one; the subordinate list itself uses cards without horizontal scrolling.
- Do not modify or stage unrelated existing changes in `UserWithdrawFlowLimitDialog.vue`, `userFundsRepository.js`, or their tests.
- Every production behavior follows RED → observed expected failure → minimal GREEN → passing verification.

---

### Task 1: Agent-only operation entry

**Files:**
- Modify: `src/admin/config/userOperations.js`
- Modify: `test/userOperationEntryCenter.test.js`

**Interfaces:**
- Consumes: `isAgentUser(user)` and `getUserOperationGroups(user)` already defined in `userOperations.js`.
- Produces: operation entry `{ id: 'agent-subordinates', title: '查看下级用户', description: '查看归属于该代理的直属客户', handler: 'agent-subordinates' }`.

- [ ] **Step 1: Write the failing catalog assertions**

Update the agent-context test to require the new middle entry and ordinary-user exclusion:

```js
assert.deepEqual(agent.entries.map((entry) => entry.id), [
  'reset-agent',
  'agent-subordinates',
  'agent-report'
])
assert.deepEqual(agent.entries.map((entry) => entry.title), [
  '取消代理身份',
  '查看下级用户',
  '查看代理报表'
])
assert.equal(agent.entries.find((entry) => entry.id === 'agent-subordinates').handler, 'agent-subordinates')
assert.equal(agent.entries.find((entry) => entry.id === 'agent-subordinates').description, '查看归属于该代理的直属客户')
assert.equal(
  getUserOperationGroups({ role: 'user' })
    .find((group) => group.id === 'agent')
    .entries.some((entry) => entry.id === 'agent-subordinates'),
  false
)
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/userOperationEntryCenter.test.js`

Expected: FAIL because the agent group is still `['reset-agent', 'agent-report']` and no subordinate handler exists.

- [ ] **Step 3: Add the minimal catalog entry and visibility rule**

Insert immediately before `agent-report`:

```js
{ id: 'agent-subordinates', title: '查看下级用户', description: '查看归属于该代理的直属客户', group: 'agent', status: 'available', risk: 'normal', handler: 'agent-subordinates' },
```

Replace the single report-only condition with an agent-only set:

```js
const AGENT_ONLY_ENTRY_IDS = new Set(['agent-subordinates', 'agent-report'])

// inside getUserOperationGroups
.filter((entry) => entry.group === group.id && (
  !AGENT_ONLY_ENTRY_IDS.has(entry.id) || isAgentUser(user)
))
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test test/userOperationEntryCenter.test.js`

Expected: PASS with no warnings.

- [ ] **Step 5: Commit the catalog behavior**

```bash
git add src/admin/config/userOperations.js test/userOperationEntryCenter.test.js
git commit -m "feat: add agent subordinate operation entry"
```

---

### Task 2: Deterministic subordinate repository

**Files:**
- Create: `src/admin/repositories/userAgentSubordinateRepository.js`
- Create: `test/userAgentSubordinateRepository.test.js`

**Interfaces:**
- Produces: `getUserAgentSubordinates(userId: unknown): Array<AgentSubordinate>`.
- `AgentSubordinate` fields: `{ id: string, uid: string, username: string, registeredAt: string, status: 'active' | 'suspended' | 'banned', totalVolume: number, commissionContribution: number }`.

- [ ] **Step 1: Write failing repository contract tests**

Create tests with literal field expectations and mutation checks:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { getUserAgentSubordinates } from '../src/admin/repositories/userAgentSubordinateRepository.js'

test('builds complete first-level agent subordinate records', () => {
  const rows = getUserAgentSubordinates('user_1001')
  assert.ok(rows.length >= 21)
  assert.deepEqual(Object.keys(rows[0]).sort(), [
    'commissionContribution', 'id', 'registeredAt', 'status',
    'totalVolume', 'uid', 'username'
  ])
  assert.ok(rows.every((row) => ['active', 'suspended', 'banned'].includes(row.status)))
  assert.ok(rows.every((row) => Number.isFinite(row.totalVolume) && row.totalVolume >= 0))
  assert.ok(rows.every((row) => Number.isFinite(row.commissionContribution) && row.commissionContribution >= 0))
})

test('isolates deterministic subordinate lists by agent ID', () => {
  const first = getUserAgentSubordinates('user_1001')
  assert.deepEqual(getUserAgentSubordinates('user_1001'), first)
  assert.notDeepEqual(getUserAgentSubordinates('user_1002'), first)
})

test('returns detached subordinate copies', () => {
  const rows = getUserAgentSubordinates('user_1001')
  rows[0].username = 'changed'
  assert.notEqual(getUserAgentSubordinates('user_1001')[0].username, 'changed')
})

test('requires a non-empty agent user ID', () => {
  for (const userId of [undefined, null, '', '   ']) {
    assert.throws(() => getUserAgentSubordinates(userId), { message: '用户 ID 必填' })
  }
})
```

- [ ] **Step 2: Run the repository test and verify RED**

Run: `node --test test/userAgentSubordinateRepository.test.js`

Expected: FAIL with module-not-found because the repository does not exist.

- [ ] **Step 3: Implement the minimal deterministic repository**

Use a local FNV-1a hash, generate 28 rows, clone before return, and validate the ID:

```js
const clone = (value) => JSON.parse(JSON.stringify(value))
const STATUSES = ['active', 'suspended', 'banned']

const requireUserId = (userId) => {
  const normalized = String(userId ?? '').trim()
  if (!normalized) throw new Error('用户 ID 必填')
  return normalized
}

const hashUserId = (userId) => {
  let hash = 2166136261
  for (let index = 0; index < userId.length; index += 1) {
    hash ^= userId.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const getUserAgentSubordinates = (userId) => {
  const normalizedUserId = requireUserId(userId)
  const seed = hashUserId(normalizedUserId)
  return clone(Array.from({ length: 28 }, (_, index) => ({
    id: `${normalizedUserId}-subordinate-${index + 1}`,
    uid: String(8000000 + ((seed + index * 7919) % 1999999)),
    username: `client_${String((seed + index * 37) % 10000).padStart(4, '0')}`,
    registeredAt: new Date(Date.UTC(2025, index % 12, 1 + ((seed + index) % 27))).toISOString().slice(0, 10),
    status: STATUSES[(seed + index * 5) % STATUSES.length],
    totalVolume: 25000 + ((seed + index * 104729) % 975000),
    commissionContribution: (35000 + ((seed + index * 3571) % 465000)) / 100
  })))
}
```

- [ ] **Step 4: Run the repository test and verify GREEN**

Run: `node --test test/userAgentSubordinateRepository.test.js`

Expected: PASS with no warnings.

- [ ] **Step 5: Commit the repository**

```bash
git add src/admin/repositories/userAgentSubordinateRepository.js test/userAgentSubordinateRepository.test.js
git commit -m "feat: add agent subordinate repository"
```

---

### Task 3: Searchable and paginated subordinate Drawer

**Files:**
- Create: `src/admin/components/user/UserAgentSubordinateDrawer.vue`
- Create: `test/userAgentSubordinateComponents.test.js`
- Reuse: `src/admin/components/CompactPagination.vue`
- Reuse: `src/admin/composables/useDialogLifecycle.js`

**Interfaces:**
- Consumes props: `visible`, `user`, `rows`, `error`, `loading`, `returnFocus`.
- Emits: `close`, `closed`, `retry`.
- Produces stable test hooks: `user-agent-subordinate-drawer`, `user-agent-subordinate-body`, `agent-subordinate-row`, `agent-subordinate-error`, and `agent-subordinate-retry`.

- [ ] **Step 1: Write failing component behavior tests**

Use the real Drawer and real `CompactPagination` with 21 literal-shaped fixtures. Cover these observable behaviors in separate tests:

```js
test('renders ten subordinate cards per page and exposes customer details', async () => {
  const harness = await openDrawer({ rows })
  const drawer = harness.findByTestId('user-agent-subordinate-drawer')
  assert.equal(drawer.getAttribute('role'), 'dialog')
  assert.equal(drawer.getAttribute('aria-modal'), 'true')
  assert.match(drawer.textContent, /代理下级用户/)
  assert.equal(harness.allNodes().filter((node) => node.getAttribute?.('data-testid') === 'agent-subordinate-row').length, 10)
  assert.match(drawer.textContent, /UID 8100001/)
  assert.match(drawer.textContent, /client_alpha/)
  assert.match(drawer.textContent, /2026-01-01/)
  assert.match(drawer.textContent, /活跃/)
  assert.match(drawer.textContent, /累计业务量/)
  assert.match(drawer.textContent, /佣金贡献/)
  assert.equal(harness.findByTestId('compact-pagination-summary').textContent.trim(), '共 21 条 · 第 1 / 3 页')
})

test('searches UID and username immediately and resets pagination', async () => {
  const harness = await openDrawer({ rows })
  harness.findByText('下一页', 'button').click()
  await harness.flush()
  const search = harness.allNodes().find((node) => node.getAttribute?.('aria-label') === '搜索下级用户')
  search.value = '8100021'
  search.dispatchEvent({ type: 'input', target: search })
  await harness.flush()
  assert.equal(harness.findByTestId('compact-pagination-summary').textContent.trim(), '共 1 条 · 第 1 / 1 页')
  assert.match(harness.findByTestId('agent-subordinate-row').textContent, /8100021/)
  search.value = 'CLIENT_ALPHA'
  search.dispatchEvent({ type: 'input', target: search })
  await harness.flush()
  assert.match(harness.findByTestId('agent-subordinate-row').textContent, /client_alpha/)
})

test('filters status and distinguishes empty-list from no-result copy', async () => {
  const harness = await openDrawer({ rows })
  const statusSelect = harness.allNodes().find((node) => node.getAttribute?.('aria-label') === '用户状态')
  statusSelect.value = 'suspended'
  statusSelect.dispatchEvent({ type: 'change', target: statusSelect })
  await harness.flush()
  const visibleRows = harness.allNodes().filter((node) => node.getAttribute?.('data-testid') === 'agent-subordinate-row')
  assert.ok(visibleRows.length > 0)
  assert.ok(visibleRows.every((node) => node.textContent.includes('暂停')))
  const empty = await openDrawer({ rows: [] })
  assert.match(empty.findByTestId('user-agent-subordinate-drawer').textContent, /该代理暂无下级用户/)
  const search = harness.allNodes().find((node) => node.getAttribute?.('aria-label') === '搜索下级用户')
  search.value = 'not-found'
  search.dispatchEvent({ type: 'input', target: search })
  await harness.flush()
  assert.match(harness.findByTestId('user-agent-subordinate-drawer').textContent, /没有符合当前条件的下级用户/)
})

test('clamps shrinking results and resets for a new agent context', async () => {
  const harness = await openDrawer({ rows })
  harness.findByText('下一页', 'button').click()
  harness.findByText('下一页', 'button').click()
  await harness.flush()
  harness.props.rows = rows.slice(0, 15)
  await harness.flush()
  assert.equal(harness.findByTestId('compact-pagination-summary').textContent.trim(), '共 15 条 · 第 2 / 2 页')
  harness.props.user = { id: 'agent_2', username: 'agent_beta', role: 'agent' }
  await harness.flush()
  assert.equal(harness.findByTestId('compact-pagination-summary').textContent.trim(), '共 15 条 · 第 1 / 2 页')
})

test('keeps failure visible and emits retry without closing', async () => {
  const harness = await openDrawer({ rows: [], error: '请求失败' })
  assert.equal(harness.findByTestId('agent-subordinate-error').getAttribute('role'), 'alert')
  harness.findByTestId('agent-subordinate-retry').click()
  await harness.flush()
  assert.equal(harness.emitted.filter(([name]) => name === 'onRetry').length, 1)
  assert.ok(harness.findByTestId('user-agent-subordinate-drawer'))
})

test('resists backdrop and closes through intentional paths with one focus return', async () => {
  const first = await openDrawer({ rows })
  const trigger = first.document.createElement('button')
  first.cleanup()
  let focusCount = 0
  trigger.addEventListener('focus', () => { focusCount += 1 })
  const harness = await openDrawer({ rows, returnFocus: trigger })
  harness.findByTestId('user-agent-subordinate-backdrop').click()
  assert.equal(harness.emitted.close, undefined)
  harness.allNodes().find((node) => node.getAttribute?.('aria-label') === '关闭').click()
  assert.equal(harness.emitted.filter(([name]) => name === 'onClose').length, 1)
  harness.props.visible = false
  await harness.flush()
  await harness.finishTransitions()
  assert.equal(harness.findByTestId('user-agent-subordinate-drawer'), null)
  assert.equal(focusCount, 1)
})
```

- [ ] **Step 2: Run the component test and verify RED**

Run: `node --test test/userAgentSubordinateComponents.test.js`

Expected: FAIL with module-not-found because the Drawer does not exist.

- [ ] **Step 3: Implement filtering and pagination state**

In the Drawer script, add:

```js
const PAGE_SIZE = 10
const query = ref('')
const status = ref('all')
const currentPage = ref(1)
const filteredRows = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()
  return props.rows.filter((row) => (
    (status.value === 'all' || row.status === status.value) &&
    (!normalizedQuery || row.uid.toLowerCase().includes(normalizedQuery) || row.username.toLowerCase().includes(normalizedQuery))
  ))
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / PAGE_SIZE)))
const pagedRows = computed(() => filteredRows.value.slice(
  (currentPage.value - 1) * PAGE_SIZE,
  currentPage.value * PAGE_SIZE
))

watch([query, status], () => { currentPage.value = 1 })
watch(totalPages, (pages) => { currentPage.value = Math.min(Math.max(1, currentPage.value), pages) })
watch(() => [props.visible, props.user?.id ?? props.user?.userId], ([visible]) => {
  if (!visible) return
  query.value = ''
  status.value = 'all'
  currentPage.value = 1
})
```

- [ ] **Step 4: Implement the modal Drawer markup and lifecycle**

Follow `UserAgentReportDrawer.vue`'s `Teleport`, `Transition`, `useDialogLifecycle`, `createDialogCloseAction`, fixed header, scroll-only body, layer style, close sequencing, and Reduced Motion CSS. Render card fields with labels; use a native labeled `<select>` for the finite status filter and a native `type="search"` input. Emit `retry` from a normal button outside the list options.

Status copy must be a fixed map:

```js
const STATUS_LABELS = {
  active: '活跃',
  suspended: '暂停',
  banned: '禁用'
}
```

The backdrop receives no click handler. The close button uses `aria-label="关闭"`; the error uses `role="alert"`, `tabindex="-1"`, and is the initial focus target when present.

- [ ] **Step 5: Run the component test and verify GREEN**

Run: `node --test test/userAgentSubordinateComponents.test.js`

Expected: PASS with no warnings.

- [ ] **Step 6: Run neighboring Drawer tests for regression**

Run: `node --test test/userAgentReportComponents.test.js test/userRelationshipComponents.test.js`

Expected: PASS with no warnings.

- [ ] **Step 7: Commit the Drawer**

```bash
git add src/admin/components/user/UserAgentSubordinateDrawer.vue test/userAgentSubordinateComponents.test.js
git commit -m "feat: add agent subordinate drawer"
```

---

### Task 4: Wire the Drawer into the user list

**Files:**
- Modify: `src/pages/admin/user/UserListPage.vue`
- Modify: `test/userCreditMembershipLayering.test.js`
- Modify: `test/userOperationEntryCenter.test.js`

**Interfaces:**
- Consumes: `getUserAgentSubordinates(userId)` and `UserAgentSubordinateDrawer`.
- Produces page state: `agentSubordinateOpen`, `agentSubordinateUser`, `agentSubordinateRows`, `agentSubordinateError`, `agentSubordinateLoading`, `agentSubordinateReturnFocus`.
- Produces handlers: `loadAgentSubordinates`, `closeAgentSubordinates`, `clearAgentSubordinates`.

- [ ] **Step 1: Write failing page-integration assertions**

Add assertions that catch a missing handler or accidental parent close:

```js
assert.match(source, /import UserAgentSubordinateDrawer/)
assert.match(source, /import \{ getUserAgentSubordinates \} from/)
assert.match(source, /id === 'agent-subordinates'/)
assert.match(source, /getUserAgentSubordinates\(userIdOf\(user\)\)/)
assert.match(source, /<UserAgentSubordinateDrawer[\s\S]*@retry="loadAgentSubordinates"/)
assert.match(source, /<UserAgentSubordinateDrawer[\s\S]*:return-focus="agentSubordinateReturnFocus"/)
assert.match(source, /<UserAgentSubordinateDrawer[\s\S]*@closed="clearAgentSubordinates"/)

const handler = source.match(/if \(id === 'agent-subordinates'\)[\s\S]*?\n  \}/)?.[0] || ''
assert.doesNotMatch(handler, /closeOperationDrawer\(\)/)
```

Also extend the operation Drawer action dispatch test to click “查看下级用户” and assert the emitted operation ID is `agent-subordinates`.

- [ ] **Step 2: Run the integration tests and verify RED**

Run: `node --test test/userCreditMembershipLayering.test.js test/userOperationEntryCenter.test.js`

Expected: FAIL because the new component, repository, page branch, and rendered Drawer are not wired.

- [ ] **Step 3: Add imports and isolated page state**

Add:

```js
import UserAgentSubordinateDrawer from '../../../admin/components/user/UserAgentSubordinateDrawer.vue'
import { getUserAgentSubordinates } from '../../../admin/repositories/userAgentSubordinateRepository.js'

const agentSubordinateOpen = ref(false)
const agentSubordinateUser = ref(null)
const agentSubordinateRows = ref([])
const agentSubordinateError = ref('')
const agentSubordinateLoading = ref(false)
const agentSubordinateReturnFocus = ref(null)
```

- [ ] **Step 4: Add load, open, retry, close, and cleanup behavior**

Implement one load function that is reused for initial open and retry:

```js
const loadAgentSubordinates = async () => {
  const user = agentSubordinateUser.value
  if (!user || agentSubordinateLoading.value) return
  agentSubordinateLoading.value = true
  agentSubordinateError.value = ''
  try {
    agentSubordinateRows.value = await Promise.resolve(getUserAgentSubordinates(userIdOf(user)))
  } catch (error) {
    agentSubordinateRows.value = []
    agentSubordinateError.value = error instanceof Error
      ? error.message
      : '代理下级用户加载失败，请稍后重试'
  } finally {
    agentSubordinateLoading.value = false
  }
}

const closeAgentSubordinates = () => { agentSubordinateOpen.value = false }
const clearAgentSubordinates = () => {
  agentSubordinateUser.value = null
  agentSubordinateRows.value = []
  agentSubordinateError.value = ''
  agentSubordinateLoading.value = false
  agentSubordinateReturnFocus.value = null
}
```

Add the operation branch without closing the parent Drawer:

```js
if (id === 'agent-subordinates') {
  agentSubordinateUser.value = user
  agentSubordinateRows.value = []
  agentSubordinateError.value = ''
  agentSubordinateReturnFocus.value = trigger
  agentSubordinateOpen.value = true
  await loadAgentSubordinates()
  return
}
```

- [ ] **Step 5: Render and connect the Drawer**

Place it beside `UserAgentReportDrawer`:

```vue
<UserAgentSubordinateDrawer
  :visible="agentSubordinateOpen"
  :user="agentSubordinateUser"
  :rows="agentSubordinateRows"
  :error="agentSubordinateError"
  :loading="agentSubordinateLoading"
  :return-focus="agentSubordinateReturnFocus"
  @retry="loadAgentSubordinates"
  @close="closeAgentSubordinates"
  @closed="clearAgentSubordinates"
/>
```

- [ ] **Step 6: Run integration and related tests and verify GREEN**

Run: `node --test test/userCreditMembershipLayering.test.js test/userOperationEntryCenter.test.js test/userAgentSubordinateRepository.test.js test/userAgentSubordinateComponents.test.js`

Expected: PASS with no warnings.

- [ ] **Step 7: Commit page integration**

```bash
git add src/pages/admin/user/UserListPage.vue test/userCreditMembershipLayering.test.js test/userOperationEntryCenter.test.js
git commit -m "feat: wire agent subordinate list into user operations"
```

---

### Task 5: Full verification and interaction audit

**Files:**
- Modify only if a verification failure identifies an in-scope defect.

**Interfaces:**
- Consumes all behavior produced by Tasks 1–4.
- Produces verified test/build results and an explicit unverified-browser checklist.

- [ ] **Step 1: Run all targeted tests**

Run:

```bash
node --test \
  test/userOperationEntryCenter.test.js \
  test/userAgentSubordinateRepository.test.js \
  test/userAgentSubordinateComponents.test.js \
  test/userAgentReportComponents.test.js \
  test/userRelationshipComponents.test.js \
  test/userCreditMembershipLayering.test.js
```

Expected: all targeted tests PASS with no warnings.

- [ ] **Step 2: Run the complete automated suite**

Run: `npm test`

Expected: all tests PASS. If unrelated pre-existing failures occur, record the exact test and confirm it also fails without the new files before attributing it to existing work.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: Vite exits 0 with production assets generated and no compile errors.

- [ ] **Step 4: Check diff integrity and scope**

Run:

```bash
git diff --check
git status --short
git diff -- src/admin/config/userOperations.js src/admin/repositories/userAgentSubordinateRepository.js src/admin/components/user/UserAgentSubordinateDrawer.vue src/pages/admin/user/UserListPage.vue test/userOperationEntryCenter.test.js test/userAgentSubordinateRepository.test.js test/userAgentSubordinateComponents.test.js test/userCreditMembershipLayering.test.js
```

Expected: no whitespace errors; only planned feature files are part of the feature diff; unrelated funds changes remain untouched and unstaged.

- [ ] **Step 5: Record manual browser verification status honestly**

If no real browser session was run, report these as unverified and required: `1440×900`, `1280×720`, tablet portrait/landscape, narrow and landscape phones, low-height viewport, 200% zoom, keyboard/mouse/touch, virtual keyboard, dynamic viewport and four safe areas, Reduced Motion, high contrast, long text/font enlargement, backdrop/drag/swipe resistance, focus trap/return, and live breakpoint changes while the nested Drawer is open and closing.

- [ ] **Step 6: Commit any in-scope verification fix**

Only if Step 1–4 required a feature fix:

```bash
git add src/admin/config/userOperations.js src/admin/repositories/userAgentSubordinateRepository.js src/admin/components/user/UserAgentSubordinateDrawer.vue src/pages/admin/user/UserListPage.vue test/userOperationEntryCenter.test.js test/userAgentSubordinateRepository.test.js test/userAgentSubordinateComponents.test.js test/userCreditMembershipLayering.test.js
git commit -m "fix: complete agent subordinate verification"
```
