import test from 'node:test'
import assert from 'node:assert/strict'
import {
  USER_CONTROL_MODULES,
  applyModuleControl,
  applyUnifiedControl,
  cancelModuleControl,
  cancelUnifiedControl,
  consumeModuleControl,
  createUserControlState,
  filterUserControlRows,
  summarizeUserControl
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

test('module override changes one child and marks the unified summary divergent', () => {
  const unified = applyUnifiedControl(createUserControlState(), {
    userId: '159', strategy: 'positive', duration: 'permanent', note: '统一带盈', now: '2026-07-25 14:30:00', batchId: 'b1'
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
    userId: '159', strategy: 'positive', duration: 'once', note: '统一带盈', now: '2026-07-25 14:30:00', batchId: 'b1'
  })
  const consumed = consumeModuleControl(unified, {
    userId: '159', moduleKey: 'delivery', businessId: 'delivery-1001',
    beforeValue: 'loss', afterValue: 'profit', now: '2026-07-25 14:40:00'
  })
  assert.equal(consumed.rules['159'].delivery.status, 'consumed')
  assert.deepEqual(summarizeUserControl(consumed, '159'), { kind: 'progress', consumed: 1, total: 6, label: '已执行 1/6' })
})

test('unified cancellation only cancels active or processing rules and records the prior rules', () => {
  const unified = applyUnifiedControl(createUserControlState(), {
    userId: '159', strategy: 'negative', duration: 'permanent', note: '统一控亏', now: '2026-07-25 14:30:00', batchId: 'b1'
  })
  const cancelled = cancelUnifiedControl(unified, {
    userId: '159', note: '撤销统一控盘', now: '2026-07-25 15:00:00', operationId: 'cancel-b1'
  })
  assert.ok(Object.values(cancelled.rules['159']).every((rule) => rule.status === 'cancelled'))
  assert.equal(cancelled.operationLogs[0].before.delivery.status, 'active')
  assert.equal(unified.rules['159'].delivery.status, 'active')
})

test('module cancellation preserves an absent child and records null before value', () => {
  const initial = createUserControlState()
  const cancelled = cancelModuleControl(initial, {
    userId: '159', moduleKey: 'spot', note: '撤销现货', now: '2026-07-25 15:00:00', operationId: 'cancel-spot'
  })
  assert.deepEqual(cancelled.rules['159'], {})
  assert.equal(cancelled.operationLogs[0].before, undefined)
})

test('a unified write failure rolls back all module changes', () => {
  const initial = {
    ...createUserControlState(),
    failureModule: 'spot',
    rules: { '159': { spot: { id: 'existing' } } }
  }
  const next = applyUnifiedControl(initial, {
    userId: '159', strategy: 'positive', duration: 'once', note: '客户带盈', now: '2026-07-25 14:30:00', batchId: 'b1'
  })
  assert.deepEqual(next.rules, initial.rules)
  assert.equal(next.lastError, '模块 spot 写入失败，六个模块均未更新')
})

test('filtering matches user details and rule fields', () => {
  const rows = [
    { userId: '159', username: 'Alice', email: 'alice@example.com', rule: { value: 'profit', status: 'active', source: 'global' } },
    { userId: '160', username: 'Bob', email: 'bob@example.com', rule: { value: 'loss', status: 'cancelled', source: 'module' } }
  ]
  assert.deepEqual(filterUserControlRows(rows, { query: 'ALICE', value: 'profit', status: 'active', source: 'global' }), [rows[0]])
})
