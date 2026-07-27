# User Operation Audit Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a searchable `用户操作日志` page under user management backed by one unified audit repository.

**Architecture:** Add constants and repository modules for normalized audit records, then render a read-only audit-log page with explicit filters, stable pagination, and inline details. Wire current demo user mutation flows to append records after successful protected user changes.

**Tech Stack:** Vue 3, Vue Router, local in-memory repositories, Node `node:test`, Vite.

## Global Constraints

- Include only changes to user profile, permissions, funds, membership or level, status, and risk-control result.
- Manual changes require a non-empty reason.
- Store before/after diffs for successful changes.
- System actions store matched rule or task reason.
- The log page is append-only and read-only.
- The audit table is `row-action`; selection, bulk action, export, column pinning, column resizing, and inline edit are disabled.
- Use explicit filter application and numbered pagination at 20 rows per page.
- Preserve dirty worktree changes that are unrelated to this feature.
- Verify with `npm test` and `npm run build`; report any runtime viewport or assistive checks not actually executed.

---

### Task 1: Audit Domain And Repository

**Files:**
- Create: `src/admin/constants/userAuditLog.js`
- Create: `src/admin/repositories/userAuditLogRepository.js`
- Test: `test/userAuditLogRepository.test.js`

**Interfaces:**
- Produces: `USER_AUDIT_CATEGORIES`, `USER_AUDIT_RESULTS`, `USER_AUDIT_SOURCES`, `USER_AUDIT_ACTIONS`
- Produces: `appendUserAuditLog(input)`, `queryUserAuditLogs(params)`, `resetUserAuditLogsForTests()`, `createUserAuditDiff(before, after, fields)`

- [ ] **Step 1: Write failing repository tests**

```js
import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import {
  appendUserAuditLog,
  createUserAuditDiff,
  queryUserAuditLogs,
  resetUserAuditLogsForTests,
} from '../src/admin/repositories/userAuditLogRepository.js'

describe('user audit log repository', () => {
  beforeEach(() => resetUserAuditLogsForTests())

  it('requires a reason for manual admin changes', () => {
    assert.throws(() => appendUserAuditLog({
      targetUser: { uid: 'U1001', name: 'Alice' },
      source: 'admin',
      operator: { id: 'A01', name: '运营一号' },
      category: 'profile',
      action: 'profile.update',
      result: 'success',
      before: { nickname: 'A' },
      after: { nickname: 'B' },
    }), /操作原因/)
  })

  it('creates normalized append-only records with diffs', () => {
    const record = appendUserAuditLog({
      targetUser: { uid: 'U1001', name: 'Alice', email: 'alice@example.com' },
      source: 'admin',
      operator: { id: 'A01', name: '运营一号' },
      category: 'profile',
      action: 'profile.update',
      result: 'success',
      reason: '用户提交实名资料修正',
      before: { nickname: 'Alice', phone: '13800138000' },
      after: { nickname: 'Alice Chen', phone: '13800138000' },
      related: { requestId: 'REQ-1' },
    })

    assert.equal(record.targetUser.uid, 'U1001')
    assert.equal(record.diff.length, 1)
    assert.equal(record.diff[0].field, 'nickname')
    assert.equal(record.related.requestId, 'REQ-1')
    assert.throws(() => { record.diff.push({ field: 'x' }) }, TypeError)
  })

  it('filters and paginates newest first with a stable id tie-breaker', () => {
    appendUserAuditLog({
      id: 'AUD-2',
      occurredAt: '2026-07-27T09:00:00.000Z',
      targetUser: { uid: 'U2001', name: 'Bob' },
      source: 'system',
      operator: { id: 'RULE-1', name: '登录风控规则' },
      category: 'risk',
      action: 'risk.review.update',
      result: 'success',
      reason: '命中异地登录规则',
      before: { riskLevel: 'low' },
      after: { riskLevel: 'medium' },
      related: { ruleId: 'RULE-1' },
    })
    appendUserAuditLog({
      id: 'AUD-3',
      occurredAt: '2026-07-27T09:00:00.000Z',
      targetUser: { uid: 'U1001', name: 'Alice' },
      source: 'admin',
      operator: { id: 'A01', name: '运营一号' },
      category: 'funds',
      action: 'funds.freeze',
      result: 'success',
      reason: '异常出金复核',
      before: { frozenUsdt: '0' },
      after: { frozenUsdt: '100' },
      related: { businessId: 'FUNDS-1' },
    })

    const result = queryUserAuditLogs({
      filters: {
        keyword: 'U1001',
        operatorKeyword: '运营',
        category: 'funds',
        reasonKeyword: '复核',
        relatedKeyword: 'FUNDS',
        result: 'success',
      },
      page: 1,
      pageSize: 20,
    })

    assert.equal(result.total, 1)
    assert.equal(result.rows[0].id, 'AUD-3')
  })
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- test/userAuditLogRepository.test.js`

Expected: fails because the repository file does not exist.

- [ ] **Step 3: Implement constants and repository**

Implement enum-like option arrays, seeded rows, validation, diff creation, immutable returned records, text/time filtering, stable sort, and numbered pagination.

- [ ] **Step 4: Run the focused test**

Run: `npm test -- test/userAuditLogRepository.test.js`

Expected: pass.

### Task 2: Route, Navigation, And Page UI

**Files:**
- Modify: `src/admin/config/nav.js`
- Modify: `src/router/modules/console.js`
- Create: `src/pages/admin/user/UserOperationLogPage.vue`
- Test: `test/userOperationAuditLogPage.test.js`

**Interfaces:**
- Consumes: `queryUserAuditLogs(params)` and constants from Task 1
- Produces: `/admin/users/operation-logs` route and `用户操作日志` menu entry

- [ ] **Step 1: Write failing navigation and page source tests**

```js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { consoleRoutes } from '../src/router/modules/console.js'
import nav from '../src/admin/config/nav.js'
import { readVueSfc } from './helpers/vueSfcHarness.js'

describe('user operation audit log page', () => {
  it('is registered under user management navigation and router', () => {
    const usersNav = nav.find((item) => item.label === '用户管理')
    assert.ok(usersNav.children.some((item) => item.label === '用户操作日志'))
    assert.ok(consoleRoutes.some((route) => route.path === 'users/operation-logs'))
  })

  it('renders explicit filters, visible applied filters, pagination, and inline details', () => {
    const source = readVueSfc('src/pages/admin/user/UserOperationLogPage.vue')
    assert.match(source, /用户操作日志/)
    assert.match(source, /applyFilters/)
    assert.match(source, /appliedFilters/)
    assert.match(source, /expandedLogId/)
    assert.match(source, /createPageNumbers/)
    assert.match(source, /aria-expanded/)
    assert.doesNotMatch(source, /showModal|showDrawer|role="dialog"/)
  })
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- test/userOperationAuditLogPage.test.js`

Expected: fails because the page and route do not exist.

- [ ] **Step 3: Implement route and navigation**

Add `用户操作日志` below `用户列表` in user management and route it to the new Vue page.

- [ ] **Step 4: Implement the Vue page**

Render page title, audit availability text, explicit filter form, applied filter chips with remove buttons, loading/error/empty states, desktop table, narrow card layout, inline detail expansion, and 20-row pagination.

- [ ] **Step 5: Run the focused test**

Run: `npm test -- test/userOperationAuditLogPage.test.js`

Expected: pass.

### Task 3: Wire Current Mutation Flows

**Files:**
- Modify: current user mutation repositories/pages identified by `rg "confirm|submit|save|update|freeze|vip|credit|risk|status" src/admin src/pages/admin/user src/features/user-control`
- Test: `test/userOperationAuditWiring.test.js`

**Interfaces:**
- Consumes: `appendUserAuditLog(input)`
- Produces: successful protected mutations append a unified audit log record

- [ ] **Step 1: Write failing wiring tests**

Write tests against the current repository or handler seams found in the files above. Cover at least funds, membership/level, status or point-control risk result, and profile where current seams exist.

- [ ] **Step 2: Run the focused test**

Run: `npm test -- test/userOperationAuditWiring.test.js`

Expected: fails before append calls are wired.

- [ ] **Step 3: Add append calls after successful mutations**

For each current demo mutation, capture before/after values, require or pass through the operation reason, set the correct category/action/result/source/operator, and store related request/business ids when available.

- [ ] **Step 4: Run wiring tests**

Run: `npm test -- test/userOperationAuditWiring.test.js`

Expected: pass.

### Task 4: Full Verification

**Files:**
- Existing source and tests touched in Tasks 1-3

**Interfaces:**
- Consumes: all previous tasks
- Produces: verified feature handoff

- [ ] **Step 1: Run all node tests**

Run: `npm test`

Expected: pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: pass.

- [ ] **Step 3: Check git status**

Run: `git status --short`

Expected: new feature files and intended modifications are visible; unrelated pre-existing dirty files remain untouched.

- [ ] **Step 4: Report verification boundary**

Report which automated checks passed. Mark browser, screen reader, touch, 200% zoom, virtual keyboard, high-contrast, safe-area, and real viewport checks as unverified unless they were actually run.
