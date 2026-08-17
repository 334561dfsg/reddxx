# Single-User Cross-Module Control Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vue admin UI demo where user management can apply one strategy across six modules and each module can independently override or cancel its own user rule.

**Architecture:** Keep business transitions in a pure JavaScript domain module, expose one shared Vue `ref` state for all admin pages, and render the six module entries through one configurable page component. User management maps positive/negative strategy to trading profit/loss and finance high/low yield; all operations remain front-end mock behavior with auditable demo logs.

**Tech Stack:** Vue 3 Composition API, Vue Router 4, Tailwind CSS, Node.js `node:test`, existing admin mock/state conventions.

## Global Constraints

- This repository remains an interface demo: do not add real APIs, databases, price feeds, settlement engines, or authentication services.
- Trading modules are `delivery`, `perpetual`, and `spot`; their values are `profit` and `loss`.
- Finance modules are `aiQuant`, `liquidity`, and `portfolio`; their values are `highYield` and `lowYield`.
- Unified `positive` maps to trading `profit` plus finance `highYield`; unified `negative` maps to trading `loss` plus finance `lowYield`.
- Both control families support `once` and `permanent` duration.
- A unified apply/cancel is all-or-nothing in demo state; a module apply/cancel changes only that module.
- Module writes may override one unified child rule; the next unified write overwrites all six modules again.
- Trading user control is settlement-only: never alter K-lines, global prices, mark/index prices, or real-time floating PnL.
- Trading priority copy must read: position/order control > user control > global control > natural result.
- Finance UI must say high yield/low yield, never profit/loss.
- Reuse existing visual conventions and `MfaVerificationModal.vue`; add no new runtime dependency.
- Specs: `docs/superpowers/specs/2026-07-25-user-control-ui-design.md` and `docs/superpowers/specs/2026-07-25-user-control-business-rules.md`.

---

## Planned File Structure

| File | Responsibility |
| --- | --- |
| `src/features/user-control/userControl.js` | Pure constants, validation, state transitions, summaries, filtering, and seed factory |
| `src/admin/state/userControlState.js` | Shared reactive demo state and thin action wrappers |
| `src/admin/components/user-control/UserControlModal.vue` | Unified and module-scoped setting/cancel form |
| `src/admin/components/user-control/UserControlDetailDrawer.vue` | Six-module status, source, progress, and execution details |
| `src/pages/admin/user-control/ModuleUserControlPage.vue` | Configurable trading/finance user-control list page used by all six routes |
| `src/pages/admin/user-control/UserControlLogPage.vue` | Unified operation/execution log and demo simulation controls |
| `src/pages/admin/user/UserListPage.vue` | Unified status columns and entry actions |
| `src/admin/config/nav.js` | Seven new menu entries: six module pages and one user-control log |
| `src/router/modules/console.js` | Seven corresponding routes |
| `test/userControlDomain.test.js` | Pure rule transition and summary coverage |
| `test/userControlNavigation.test.js` | Route/menu coverage |
| `test/userControlUi.test.js` | Source-level UI contract coverage matching existing test style |

### Task 1: Pure user-control domain model

**Files:**
- Create: `src/features/user-control/userControl.js`
- Create: `test/userControlDomain.test.js`

**Interfaces:**
- Produces: `USER_CONTROL_MODULES`, `USER_CONTROL_STRATEGY`, `USER_CONTROL_DURATION`, `createUserControlState()`, `applyUnifiedControl()`, `applyModuleControl()`, `cancelUnifiedControl()`, `cancelModuleControl()`, `consumeModuleControl()`, `summarizeUserControl()`, and `filterUserControlRows()`.
- All transition functions consume an immutable plain object and return a new immutable plain object.

- [ ] **Step 1: Write failing tests for constants and unified mapping**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  USER_CONTROL_MODULES,
  applyUnifiedControl,
  createUserControlState
} from '../src/features/user-control/userControl.js'

test('unified positive maps trading to profit and finance to high yield', () => {
  const initial = createUserControlState()
  const next = applyUnifiedControl(initial, {
    userId: '159', strategy: 'positive', duration: 'once', note: '客户带盈',
    now: '2026-07-25 14:30:00', batchId: 'batch-1'
  })

  assert.deepEqual(Object.keys(next.rules['159']).sort(), USER_CONTROL_MODULES.map((item) => item.key).sort())
  assert.equal(next.rules['159'].perpetual.value, 'profit')
  assert.equal(next.rules['159'].delivery.value, 'profit')
  assert.equal(next.rules['159'].spot.value, 'profit')
  assert.equal(next.rules['159'].aiQuant.value, 'highYield')
  assert.equal(next.rules['159'].liquidity.value, 'highYield')
  assert.equal(next.rules['159'].portfolio.value, 'highYield')
  assert.ok(Object.values(next.rules['159']).every((rule) => rule.source === 'global' && rule.status === 'active'))
})
```

- [ ] **Step 2: Run the domain test and verify the missing module failure**

Run: `node --test test/userControlDomain.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/features/user-control/userControl.js`.

- [ ] **Step 3: Implement constants, validation, cloning, and unified apply**

```js
export const USER_CONTROL_MODULES = Object.freeze([
  { key: 'delivery', label: '交割', family: 'trade', actionLabel: '用户控盘' },
  { key: 'perpetual', label: '永续', family: 'trade', actionLabel: '用户控盘' },
  { key: 'spot', label: '现货', family: 'trade', actionLabel: '用户控盘' },
  { key: 'aiQuant', label: 'AI量化', family: 'finance', actionLabel: '用户收益调节' },
  { key: 'liquidity', label: '流动性挖矿', family: 'finance', actionLabel: '用户收益调节' },
  { key: 'portfolio', label: '投资组合', family: 'finance', actionLabel: '用户收益调节' }
])

export const USER_CONTROL_STRATEGY = Object.freeze({ POSITIVE: 'positive', NEGATIVE: 'negative' })
export const USER_CONTROL_DURATION = Object.freeze({ ONCE: 'once', PERMANENT: 'permanent' })

const strategyValue = (strategy, family) => {
  if (strategy === 'positive') return family === 'trade' ? 'profit' : 'highYield'
  if (strategy === 'negative') return family === 'trade' ? 'loss' : 'lowYield'
  throw new TypeError('strategy must be positive or negative')
}

const requireText = (value, name) => {
  const text = String(value || '').trim()
  if (!text) throw new TypeError(`${name} is required`)
  return text
}

export const createUserControlState = () => ({ rules: {}, operationLogs: [], executionLogs: [], failureModule: '' })

export function applyUnifiedControl(state, input) {
  const userId = requireText(input.userId, 'userId')
  const note = requireText(input.note, 'note')
  if (!['once', 'permanent'].includes(input.duration)) throw new TypeError('duration must be once or permanent')
  if (state.failureModule) return { ...state, lastError: `模块 ${state.failureModule} 写入失败，六个模块均未更新` }

  const rules = Object.fromEntries(USER_CONTROL_MODULES.map((module) => [module.key, {
    id: `${input.batchId}-${module.key}`, batchId: input.batchId, userId, moduleKey: module.key,
    family: module.family, value: strategyValue(input.strategy, module.family), strategy: input.strategy,
    duration: input.duration, status: 'active', source: 'global', note, updatedAt: input.now,
    consumedAt: '', supersededAt: '', cancelledAt: ''
  }]))

  return {
    ...state,
    rules: { ...state.rules, [userId]: rules },
    operationLogs: [{ id: `op-${input.batchId}`, userId, scope: 'global', action: 'apply',
      modules: USER_CONTROL_MODULES.map((item) => item.key), strategy: input.strategy,
      duration: input.duration, note, createdAt: input.now }, ...state.operationLogs],
    lastError: ''
  }
}
```

- [ ] **Step 4: Add failing transition tests for override, cancel, consume, rollback, and summaries**

```js
test('module override changes one child and marks the unified summary divergent', () => {
  const unified = applyUnifiedControl(createUserControlState(), {
    userId: '159', strategy: 'positive', duration: 'permanent', note: '批次带盈', now: '2026-07-25 14:30:00', batchId: 'b1'
  })
  const changed = applyModuleControl(unified, {
    userId: '159', moduleKey: 'perpetual', value: 'loss', duration: 'permanent',
    note: '永续单独控亏', now: '2026-07-25 15:10:00', ruleId: 'r-perp-2'
  })
  assert.equal(changed.rules['159'].perpetual.source, 'module')
  assert.equal(changed.rules['159'].delivery.value, 'profit')
  assert.deepEqual(summarizeUserControl(changed, '159'), { kind: 'divergent', aligned: 5, total: 6, label: '5/6 存在差异' })
})

test('once consumption updates one module without creating a configuration difference', () => {
  const unified = applyUnifiedControl(createUserControlState(), {
    userId: '159', strategy: 'positive', duration: 'once', note: '批次带盈', now: '2026-07-25 14:30:00', batchId: 'b1'
  })
  const consumed = consumeModuleControl(unified, {
    userId: '159', moduleKey: 'delivery', businessId: 'delivery-1001',
    beforeValue: 'loss', afterValue: 'profit', now: '2026-07-25 14:40:00'
  })
  assert.equal(consumed.rules['159'].delivery.status, 'consumed')
  assert.deepEqual(summarizeUserControl(consumed, '159'), { kind: 'progress', consumed: 1, total: 6, label: '已执行 1/6' })
})
```

- [ ] **Step 5: Implement remaining immutable transitions and filtering**

Add these helpers and functions to `userControl.js`; preserve the previous rule in each operation log's `before` field:

```js
const moduleMeta = (moduleKey) => {
  const module = USER_CONTROL_MODULES.find((item) => item.key === moduleKey)
  if (!module) throw new TypeError('unknown moduleKey')
  return module
}
const validValues = { trade: ['profit', 'loss'], finance: ['highYield', 'lowYield'] }
const cloneRules = (state, userId) => ({ ...(state.rules[userId] || {}) })

export function applyModuleControl(state, input) {
  const userId = requireText(input.userId, 'userId')
  const note = requireText(input.note, 'note')
  const module = moduleMeta(input.moduleKey)
  if (!validValues[module.family].includes(input.value)) throw new TypeError('value does not match module family')
  if (!['once', 'permanent'].includes(input.duration)) throw new TypeError('duration must be once or permanent')
  const userRules = cloneRules(state, userId)
  const before = userRules[module.key] || null
  userRules[module.key] = { id: input.ruleId, batchId: '', userId, moduleKey: module.key,
    family: module.family, value: input.value, strategy: '', duration: input.duration,
    status: 'active', source: 'module', note, updatedAt: input.now,
    consumedAt: '', supersededAt: '', cancelledAt: '' }
  return { ...state, rules: { ...state.rules, [userId]: userRules }, operationLogs: [{
    id: `op-${input.ruleId}`, userId, scope: 'module', action: 'apply', modules: [module.key],
    before, after: userRules[module.key], note, createdAt: input.now
  }, ...state.operationLogs], lastError: '' }
}

export function cancelUnifiedControl(state, input) {
  const userId = requireText(input.userId, 'userId')
  const note = requireText(input.note, 'note')
  const before = cloneRules(state, userId)
  const cancelled = Object.fromEntries(Object.entries(before).map(([key, rule]) => [key,
    ['active', 'processing'].includes(rule.status) ? { ...rule, status: 'cancelled', cancelledAt: input.now } : rule
  ]))
  return { ...state, rules: { ...state.rules, [userId]: cancelled }, operationLogs: [{
    id: input.operationId, userId, scope: 'global', action: 'cancel',
    modules: USER_CONTROL_MODULES.map((item) => item.key), before, note, createdAt: input.now
  }, ...state.operationLogs] }
}

export function cancelModuleControl(state, input) {
  const userId = requireText(input.userId, 'userId')
  const note = requireText(input.note, 'note')
  moduleMeta(input.moduleKey)
  const userRules = cloneRules(state, userId)
  const before = userRules[input.moduleKey]
  if (before && ['active', 'processing'].includes(before.status)) {
    userRules[input.moduleKey] = { ...before, status: 'cancelled', cancelledAt: input.now }
  }
  return { ...state, rules: { ...state.rules, [userId]: userRules }, operationLogs: [{
    id: input.operationId, userId, scope: 'module', action: 'cancel', modules: [input.moduleKey],
    before, note, createdAt: input.now
  }, ...state.operationLogs] }
}

export function consumeModuleControl(state, input) {
  const userId = requireText(input.userId, 'userId')
  const userRules = cloneRules(state, userId)
  const rule = userRules[input.moduleKey]
  if (!rule || rule.status !== 'active' || rule.duration !== 'once') return state
  userRules[input.moduleKey] = { ...rule, status: 'consumed', consumedAt: input.now }
  return { ...state, rules: { ...state.rules, [userId]: userRules }, executionLogs: [{
    id: `exec-${input.businessId}`, userId, moduleKey: input.moduleKey, ruleId: rule.id,
    source: rule.source, duration: rule.duration, businessId: input.businessId,
    beforeValue: input.beforeValue, afterValue: input.afterValue,
    status: 'success', createdAt: input.now
  }, ...state.executionLogs] }
}

export function summarizeUserControl(state, userId) {
  const rules = Object.values(state.rules[String(userId)] || {})
  const effective = rules.filter((rule) => ['active', 'processing'].includes(rule.status))
  const consumed = rules.filter((rule) => rule.status === 'consumed')
  if (!effective.length) return { kind: 'none', label: '未设置', total: 6 }
  const globalBatch = rules.find((rule) => rule.batchId)?.batchId || ''
  const aligned = rules.filter((rule) => rule.batchId === globalBatch
    && ['active', 'processing', 'consumed'].includes(rule.status)).length
  const divergent = rules.some((rule) => rule.source === 'module'
    || ['cancelled', 'superseded'].includes(rule.status))
  if (divergent) return { kind: 'divergent', aligned, total: 6, label: `${aligned}/6 存在差异` }
  if (consumed.length) return { kind: 'progress', consumed: consumed.length, total: 6, label: `已执行 ${consumed.length}/6` }
  return { kind: 'synced', aligned: 6, total: 6, label: '6/6 已同步' }
}

export function filterUserControlRows(rows, filters = {}) {
  const query = String(filters.query || '').trim().toLowerCase()
  return rows.filter((row) => (!query || `${row.userId} ${row.username} ${row.email}`.toLowerCase().includes(query))
    && (!filters.value || row.rule?.value === filters.value)
    && (!filters.status || row.rule?.status === filters.status)
    && (!filters.source || row.rule?.source === filters.source))
}
```

- [ ] **Step 6: Run focused and full tests**

Run: `node --test test/userControlDomain.test.js`

Expected: all user-control domain tests PASS.

Run: `npm test`

Expected: existing suite and new domain tests PASS.

- [ ] **Step 7: Commit the domain model**

```bash
git add src/features/user-control/userControl.js test/userControlDomain.test.js
git commit -m "feat: add user control demo domain"
```

### Task 2: Shared reactive state and deterministic demo seed

**Files:**
- Create: `src/admin/state/userControlState.js`
- Create: `src/admin/mock/userControl.js`
- Modify: `test/userControlDomain.test.js`

**Interfaces:**
- Consumes: all pure transitions from Task 1.
- Produces: `userControlState`, `setUnifiedUserControl()`, `setModuleUserControl()`, `cancelUnifiedUserControl()`, `cancelSingleModuleControl()`, `simulateUserControlExecution()`, `setUserControlFailureModule()`, and `resetUserControlDemo()`.

- [ ] **Step 1: Add a failing seed/state contract test**

```js
import { createUserControlDemoSeed } from '../src/admin/mock/userControl.js'

test('demo seed includes synchronized, divergent, and consumed examples', () => {
  const seed = createUserControlDemoSeed()
  assert.equal(summarizeUserControl(seed, '159').kind, 'progress')
  assert.equal(summarizeUserControl(seed, '158').kind, 'divergent')
  assert.ok(seed.operationLogs.length >= 2)
  assert.ok(seed.executionLogs.length >= 1)
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test test/userControlDomain.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/admin/mock/userControl.js`.

- [ ] **Step 3: Create deterministic seed data and reactive wrappers**

`createUserControlDemoSeed()` must use fixed IDs and timestamps for users `159`, `158`, and `153`; it must not call `Date.now()` or `Math.random()`.

```js
import { ref } from 'vue'
import { createUserControlDemoSeed } from '../mock/userControl.js'
import { applyUnifiedControl, applyModuleControl, cancelUnifiedControl,
  cancelModuleControl, consumeModuleControl } from '../../features/user-control/userControl.js'

export const userControlState = ref(createUserControlDemoSeed())
export const setUnifiedUserControl = (payload) => { userControlState.value = applyUnifiedControl(userControlState.value, payload) }
export const setModuleUserControl = (payload) => { userControlState.value = applyModuleControl(userControlState.value, payload) }
export const cancelUnifiedUserControl = (payload) => { userControlState.value = cancelUnifiedControl(userControlState.value, payload) }
export const cancelSingleModuleControl = (payload) => { userControlState.value = cancelModuleControl(userControlState.value, payload) }
export const simulateUserControlExecution = (payload) => { userControlState.value = consumeModuleControl(userControlState.value, payload) }
export const setUserControlFailureModule = (moduleKey = '') => { userControlState.value = { ...userControlState.value, failureModule: moduleKey } }
export const resetUserControlDemo = () => { userControlState.value = createUserControlDemoSeed() }
```

- [ ] **Step 4: Run tests and commit**

Run: `node --test test/userControlDomain.test.js`

Expected: PASS.

```bash
git add src/admin/mock/userControl.js src/admin/state/userControlState.js test/userControlDomain.test.js
git commit -m "feat: seed shared user control state"
```

### Task 3: Navigation and routes for six modules plus logs

**Files:**
- Modify: `src/admin/config/nav.js`
- Modify: `src/router/modules/console.js`
- Create: `test/userControlNavigation.test.js`

**Interfaces:**
- Produces route prop `moduleKey` with one of the six exact module keys.
- Routes all six module entries to `src/pages/admin/user-control/ModuleUserControlPage.vue` and logs to `UserControlLogPage.vue`.

- [ ] **Step 1: Write failing menu and route tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { navTree } from '../src/admin/config/nav.js'
import { consoleRoutes } from '../src/router/modules/console.js'

const expected = [
  ['perpetual-user-control', 'perpetual/user-control', 'perpetual'],
  ['delivery-user-control', 'delivery/user-control', 'delivery'],
  ['spot-user-control', 'spot/user-control', 'spot'],
  ['ai-quant-user-yield-control', 'ai-quant/user-yield-control', 'aiQuant'],
  ['liquidity-user-yield-control', 'liquidity/locked/user-yield-control', 'liquidity'],
  ['portfolio-user-yield-control', 'portfolio/user-yield-control', 'portfolio']
]

test('registers all six module user-control routes with module props', () => {
  for (const [name, path, moduleKey] of expected) {
    const route = consoleRoutes.find((item) => item.name === name)
    assert.equal(route.path, path)
    assert.deepEqual(route.props, { moduleKey })
  }
})

test('registers the unified user-control log route', () => {
  const route = consoleRoutes.find((item) => item.name === 'users-control-log')
  assert.equal(route.path, 'users/control-log')
})

test('adds trading control and finance yield-control labels to module menus', () => {
  const byTitle = Object.fromEntries(navTree.map((item) => [item.title, item]))
  assert.ok(byTitle['永续合约'].children.some((item) => item.title === '用户控盘'))
  assert.ok(byTitle['交割合约'].children.some((item) => item.title === '用户控盘'))
  assert.ok(byTitle['现货交易'].children.some((item) => item.title === '用户控盘'))
  assert.ok(byTitle['AI量化交易'].children.some((item) => item.title === '用户收益调节'))
  assert.ok(byTitle['流动性挖矿'].children.some((item) => item.title === '用户收益调节'))
  assert.ok(byTitle['投资组合'].children.some((item) => item.title === '用户收益调节'))
})
```

- [ ] **Step 2: Run and verify route assertions fail**

Run: `node --test test/userControlNavigation.test.js`

Expected: FAIL because routes and menu children do not exist.

- [ ] **Step 3: Add exact menu entries and route definitions**

Add `用户控盘` after order management for the three trading menus and `用户收益调节` after order management for the three finance menus. Add `用户控制日志` under user management at `/admin/users/control-log`.

Use route definitions of this exact form:

```js
{
  path: 'perpetual/user-control',
  name: 'perpetual-user-control',
  component: () => import('../../pages/admin/user-control/ModuleUserControlPage.vue'),
  props: { moduleKey: 'perpetual' },
  meta: { title: '永续合约 / 用户控盘', desc: '仅在目标用户最终平仓结算时控制盈亏方向，不改变K线与实时浮盈亏。' }
}
```

Add the remaining five route objects using the exact `expected` test tuples. Their titles are `交割合约 / 用户控盘`, `现货交易 / 用户控盘`, `AI量化交易 / 用户收益调节`, `流动性挖矿 / 用户收益调节`, and `投资组合 / 用户收益调节`; finance descriptions must say `高收益/低收益`. Add `users-control-log` at `users/control-log`, loading `UserControlLogPage.vue` with title `用户管理 / 用户控制日志`.

- [ ] **Step 4: Run tests and commit**

Run: `node --test test/userControlNavigation.test.js`

Expected: PASS.

```bash
git add src/admin/config/nav.js src/router/modules/console.js test/userControlNavigation.test.js
git commit -m "feat: add user control admin navigation"
```

### Task 4: Shared setting modal and module page

**Files:**
- Create: `src/admin/components/user-control/UserControlModal.vue`
- Create: `src/pages/admin/user-control/ModuleUserControlPage.vue`
- Create: `test/userControlUi.test.js`

**Interfaces:**
- `UserControlModal` props: `open:Boolean`, `scope:'global'|'module'`, `moduleKey:String`, `user:Object|null`, `existingRules:Object`.
- Emits: `close` and `submit` with `{ userId, strategy?, value?, duration, note }`.
- `ModuleUserControlPage` prop: `moduleKey:String`; consumes `userControlState` and state actions from Task 2.

- [ ] **Step 1: Write failing source-contract tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('shared modal separates trading outcome from finance yield wording', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')
  assert.match(source, /正向控制/)
  assert.match(source, /负向控制/)
  assert.match(source, /盈利/)
  assert.match(source, /亏损/)
  assert.match(source, /高收益/)
  assert.match(source, /低收益/)
  assert.match(source, /一次性/)
  assert.match(source, /永久/)
  assert.match(source, /操作备注/)
})

test('module page explains settlement-only perpetual control and module-only scope', () => {
  const source = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')
  assert.match(source, /不改变K线/)
  assert.match(source, /实时浮盈亏/)
  assert.match(source, /本次操作只影响当前模块/)
  assert.match(source, /规则来源/)
})
```

- [ ] **Step 2: Run and verify component files are missing**

Run: `node --test test/userControlUi.test.js`

Expected: FAIL with `ENOENT` for `UserControlModal.vue`.

- [ ] **Step 3: Implement `UserControlModal.vue`**

Use computed module metadata from `USER_CONTROL_MODULES`. Render radios for global positive/negative or module profit/loss/highYield/lowYield, radios for once/permanent, a required textarea note, existing-rule summary, affected-module chips, validation message, cancel, and confirm. For global mode show both mappings:

```vue
<div v-if="scope === 'global'" class="grid gap-3 md:grid-cols-2">
  <div class="rounded-lg border border-slate-200 p-3">
    <p class="text-xs text-slate-500">交易类效果</p>
    <p class="font-medium text-slate-900">{{ form.strategy === 'positive' ? '盈利' : '亏损' }}</p>
  </div>
  <div class="rounded-lg border border-slate-200 p-3">
    <p class="text-xs text-slate-500">理财类效果</p>
    <p class="font-medium text-slate-900">{{ form.strategy === 'positive' ? '高收益' : '低收益' }}</p>
  </div>
</div>
```

Disable submit until user, selection, duration, and trimmed note are present. Do not mutate state inside the modal.

- [ ] **Step 4: Implement `ModuleUserControlPage.vue`**

Use module metadata to render title, description, summary cards, search and filters, rule table, source badge, set/modify/cancel/log actions, and the shared modal. For `perpetual`, render:

```vue
<div v-if="moduleKey === 'perpetual'" class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
  用户级控盘不改变K线、标记价格和实时浮盈亏，只在目标用户最终平仓结算时决定盈亏方向。
  优先级：单笔/持仓控制 &gt; 用户级控制 &gt; 全局场控 &gt; 自然结果。
</div>
```

All six modules must use this same page file. Convert form submission into Task 2 state action payloads with deterministic incremental IDs derived from current log length.

- [ ] **Step 5: Run UI tests and build**

Run: `node --test test/userControlUi.test.js`

Expected: PASS.

Run: `npm run build`

Expected: Vite build succeeds without unresolved imports or Vue template errors.

- [ ] **Step 6: Commit shared module UI**

```bash
git add src/admin/components/user-control/UserControlModal.vue src/pages/admin/user-control/ModuleUserControlPage.vue test/userControlUi.test.js
git commit -m "feat: add module user control pages"
```

### Task 5: User-management unified entry and six-module detail

**Files:**
- Create: `src/admin/components/user-control/UserControlDetailDrawer.vue`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Modify: `test/userControlUi.test.js`

**Interfaces:**
- Consumes `summarizeUserControl()`, shared state, `UserControlModal`, and MFA modal.
- `UserControlDetailDrawer` props: `open:Boolean`, `user:Object|null`, `rules:Object`, `operationLogs:Array`, `executionLogs:Array`; emits `close`.

- [ ] **Step 1: Add failing source-contract tests**

```js
test('user list exposes unified status and scoped actions', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')
  assert.match(source, /用户点控/)
  assert.match(source, /模块状态/)
  assert.match(source, /设置控制/)
  assert.match(source, /取消控制/)
  assert.match(source, /UserControlDetailDrawer/)
  assert.match(source, /MfaVerificationModal/)
})

test('detail drawer distinguishes progress from configuration divergence', () => {
  const source = read('../src/admin/components/user-control/UserControlDetailDrawer.vue')
  assert.match(source, /已执行/)
  assert.match(source, /存在差异/)
  assert.match(source, /规则来源/)
  assert.match(source, /最近执行/)
})
```

- [ ] **Step 2: Run and verify missing UI failures**

Run: `node --test test/userControlUi.test.js`

Expected: FAIL because list/detail contracts are absent.

- [ ] **Step 3: Build the detail drawer**

Render one row per `USER_CONTROL_MODULES` item with control label, duration, status, source, updated time, and last matching execution log. Render summary header using `summarizeUserControl()` and use neutral copy for consumed progress versus amber copy for actual divergence.

- [ ] **Step 4: Integrate unified controls into `UserListPage.vue`**

Add control status, duration, module status, and updated-time columns. Stop row click propagation on action buttons. Open `UserControlModal` in global mode for set/modify, `UserControlDetailDrawer` for detail, and `MfaVerificationModal` before permanent apply, overwrite, or unified cancel. On confirmed cancellation require a non-empty note and call `cancelUnifiedUserControl()`.

- [ ] **Step 5: Run focused tests and build**

Run: `node --test test/userControlUi.test.js test/userControlDomain.test.js`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit user-management UI**

```bash
git add src/admin/components/user-control/UserControlDetailDrawer.vue src/pages/admin/user/UserListPage.vue test/userControlUi.test.js
git commit -m "feat: add unified controls to user management"
```

### Task 6: Logs, simulation, and atomic-failure demo

**Files:**
- Create: `src/pages/admin/user-control/UserControlLogPage.vue`
- Modify: `src/pages/admin/user-control/ModuleUserControlPage.vue`
- Modify: `src/pages/admin/user/UserListPage.vue`
- Modify: `test/userControlUi.test.js`

**Interfaces:**
- Consumes operation and execution arrays plus `simulateUserControlExecution()`, `setUserControlFailureModule()`, and `resetUserControlDemo()`.
- Route already exists from Task 3 as `users-control-log` at `users/control-log`.

- [ ] **Step 1: Add failing log/simulation source tests**

```js
test('log page exposes operation, execution, filtering, and demo simulation', () => {
  const source = read('../src/pages/admin/user-control/UserControlLogPage.vue')
  assert.match(source, /操作日志/)
  assert.match(source, /执行日志/)
  assert.match(source, /模拟一次性执行/)
  assert.match(source, /模拟写入失败/)
  assert.match(source, /恢复演示数据/)
  assert.match(source, /自然\/全局结果/)
  assert.match(source, /用户最终结果/)
})
```

- [ ] **Step 2: Run and verify the page is missing**

Run: `node --test test/userControlUi.test.js`

Expected: FAIL with `ENOENT` for `UserControlLogPage.vue`.

- [ ] **Step 3: Implement filterable operation and execution tabs**

Render tabs, UID/module/source/action filters, timestamp, note, before/after values, business ID, and status. Trading execution rows label columns `自然/全局结果` and `用户最终结果`; finance rows label them `基础收益档位` and `用户收益档位`.

- [ ] **Step 4: Implement explicit demo simulation panel**

Provide selects for user, module, before result, after result, and buttons:

- `模拟一次性执行`: calls `simulateUserControlExecution()` only when the chosen rule is active and once.
- `模拟写入失败`: sets one failure module, attempts a unified write, shows `模块 X 写入失败，六个模块均未更新`, then clears the failure toggle only when the operator clicks clear.
- `恢复演示数据`: calls `resetUserControlDemo()` after confirmation.

Keep these controls visibly labeled `Demo 模拟工具`; do not mix them into production-looking row actions.

- [ ] **Step 5: Add route links from user and module pages**

Add `RouterLink` to `{ name: 'users-control-log', query: { userId } }` in user management and `{ name: 'users-control-log', query: { userId, module: moduleKey } }` in module pages.

- [ ] **Step 6: Verify and commit**

Run: `node --test test/userControlUi.test.js test/userControlNavigation.test.js test/userControlDomain.test.js`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

```bash
git add src/pages/admin/user-control/UserControlLogPage.vue src/pages/admin/user-control/ModuleUserControlPage.vue src/pages/admin/user/UserListPage.vue test/userControlUi.test.js
git commit -m "feat: add user control logs and simulations"
```

### Task 7: Full acceptance verification and documentation alignment

**Files:**
- Modify only if verification finds a mismatch: files created or modified in Tasks 1-6.
- Verify: `docs/superpowers/specs/2026-07-25-user-control-ui-design.md`
- Verify: `docs/superpowers/specs/2026-07-25-user-control-business-rules.md`

**Interfaces:**
- No new interfaces; this task proves the implemented demo matches the approved specs.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test`

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: Vite build completes successfully and emits `dist/`.

- [ ] **Step 3: Perform route-by-route browser acceptance**

Run: `npm run dev -- --host 127.0.0.1`

Verify these paths render without console errors:

```text
/admin/users/list
/admin/users/control-log
/admin/perpetual/user-control
/admin/delivery/user-control
/admin/spot/user-control
/admin/ai-quant/user-yield-control
/admin/liquidity/locked/user-yield-control
/admin/portfolio/user-yield-control
```

Verify one complete scenario: unified positive once → delivery simulated consumption → perpetual module loss override → summary `5/6 存在差异` → unified negative permanent → `6/6 已同步` → unified cancel.

- [ ] **Step 4: Verify settlement-only and finance wording invariants**

Confirm the perpetual page explicitly states that K-lines and real-time floating PnL do not change. Confirm the three finance pages contain high/low yield controls and no profit/loss radio labels.

- [ ] **Step 5: Inspect final diff and commit any verification fixes**

Run: `git diff --check`

Expected: no whitespace errors.

If Step 3 or 4 required fixes, stage only those exact files and commit:

```bash
git add src test
git commit -m "fix: align user control demo acceptance"
```

If no fixes were needed, do not create an empty commit.
