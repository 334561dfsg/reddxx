import test from 'node:test'
import assert from 'node:assert/strict'
import { nextTick, reactive } from 'vue'
import { createUserControlDemoSeed } from '../src/admin/mock/userControl.js'
import * as userControlStateHelpers from '../src/admin/state/userControlState.js'
import {
  cancelSingleModuleControl,
  resetUserControlDemo,
  setUnifiedUserControl,
  setUserControlFailureModule,
  simulateUserControlExecution,
  userControlState
} from '../src/admin/state/userControlState.js'
import * as userControlHelpers from '../src/features/user-control/userControl.js'
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

test('demo seed includes synchronized, divergent, and consumed examples', () => {
  const seed = createUserControlDemoSeed()

  assert.equal(summarizeUserControl(seed, '159').kind, 'progress')
  assert.equal(summarizeUserControl(seed, '158').kind, 'divergent')
  assert.equal(summarizeUserControl(seed, '153').kind, 'synced')
  assert.equal(summarizeUserControl(seed, 'user_1001').kind, 'synced')
  assert.equal(summarizeUserControl(seed, 'user_1002').kind, 'progress')
  assert.equal(summarizeUserControl(seed, 'user_1003').kind, 'divergent')
  assert.ok(seed.operationLogs.length >= 2)
  assert.ok(seed.executionLogs.length >= 1)
})

test('demo seed covers every simplified current and historical state', () => {
  const seed = createUserControlDemoSeed()
  const allRules = Object.values(seed.rules).flatMap((rules) => Object.values(rules))

  assert.ok(allRules.some((rule) => rule.status === 'active' && rule.duration === 'once'))
  assert.ok(allRules.some((rule) => rule.status === 'active' && rule.duration === 'permanent'))
  assert.ok(allRules.some((rule) => rule.status === 'consumed'))
  assert.ok(allRules.some((rule) => rule.status === 'cancelled'))
  assert.ok(seed.ruleHistory.some((rule) => rule.status === 'superseded'))
  assert.ok(seed.operationLogs.some((log) => log.status === 'failed'))
  assert.ok(seed.executionLogs.some((log) => log.status === 'failed'))
  assert.ok(Object.values(seed.rules.user_1005).every((rule) => (
    rule.batchId === 'demo-batch-user-1005-original' && rule.status === 'active'
  )))
  assert.equal(seed.rules.user_1006.delivery.status, 'active')
  assert.equal(seed.rules.user_1007, undefined)
})

test('log date filtering is inclusive and leaves source rows unchanged', () => {
  assert.equal(typeof userControlHelpers.filterUserControlLogsByDate, 'function')
  const rows = [
    { id: 'before', createdAt: '2026-07-24 23:59:59' },
    { id: 'start', createdAt: '2026-07-25 00:00:00' },
    { id: 'end', createdAt: '2026-07-26 23:59:59' },
    { id: 'after', createdAt: '2026-07-27 00:00:00' }
  ]

  assert.deepEqual(
    userControlHelpers.filterUserControlLogsByDate(rows, { dateFrom: '2026-07-25', dateTo: '2026-07-26' }).map((row) => row.id),
    ['start', 'end']
  )
  assert.deepEqual(userControlHelpers.filterUserControlLogsByDate(rows, {}), rows)
  assert.equal(rows.length, 4)
})

test('operation and execution logs retain frontend audit display fields', () => {
  const applied = applyUnifiedControl(createUserControlState(), {
    userId: 'audit-user', strategy: 'positive', duration: 'once', note: '审计字段',
    now: '2026-07-25 12:00:00', batchId: 'audit-batch-1', operator: 'risk_admin'
  })
  assert.deepEqual({
    operator: applied.operationLogs[0].operator,
    batchId: applied.operationLogs[0].batchId,
    duration: applied.operationLogs[0].duration,
    status: applied.operationLogs[0].status
  }, { operator: 'risk_admin', batchId: 'audit-batch-1', duration: 'once', status: 'success' })

  const executed = consumeModuleControl(applied, {
    userId: 'audit-user', moduleKey: 'delivery', businessId: 'audit-order-1',
    beforeValue: 'loss', afterValue: 'profit', now: '2026-07-25 12:05:00'
  })
  assert.deepEqual({
    value: executed.executionLogs[0].value,
    duration: executed.executionLogs[0].duration
  }, { value: 'profit', duration: 'once' })
})

test('list metadata only reflects active and processing rules', () => {
  const unified = applyUnifiedControl(createUserControlState(), {
    userId: 'user_1001', strategy: 'positive', duration: 'permanent', note: '统一带盈',
    now: '2026-07-25 16:00:00', batchId: 'list-b1'
  })
  const divergent = applyModuleControl(unified, {
    userId: 'user_1001', moduleKey: 'perpetual', value: 'loss', duration: 'permanent',
    note: '永续独立控亏', now: '2026-07-25 16:10:00', ruleId: 'list-perpetual-1'
  })
  assert.deepEqual(userControlHelpers.getUserControlListMeta(divergent, 'user_1001'), {
    hasCurrent: true,
    controlLabel: '存在模块差异',
    durationLabel: '永久'
  })

  const cancelled = cancelUnifiedControl(unified, {
    userId: 'user_1001', note: '取消', now: '2026-07-25 16:20:00', operationId: 'cancel-list-b1'
  })
  assert.deepEqual(userControlHelpers.getUserControlListMeta(cancelled, 'user_1001'), {
    hasCurrent: false,
    controlLabel: '未设置',
    durationLabel: '—'
  })

  const consumed = USER_CONTROL_MODULES.reduce((state, module, index) => consumeModuleControl(state, {
    userId: 'user_1004', moduleKey: module.key, businessId: `consumed-${index}`,
    beforeValue: module.family === 'trade' ? 'profit' : 'highYield',
    afterValue: state.rules['user_1004'][module.key].value,
    now: `2026-07-25 16:${30 + index}:00`
  }), applyUnifiedControl(createUserControlState(), {
    userId: 'user_1004', strategy: 'negative', duration: 'once', note: '全部执行',
    now: '2026-07-25 16:30:00', batchId: 'consumed-all-b1'
  }))
  assert.deepEqual(userControlHelpers.getUserControlListMeta(consumed, 'user_1004'), {
    hasCurrent: false,
    controlLabel: '未设置',
    durationLabel: '—'
  })
})

test('cancel items include only effective modules with their current rule content', () => {
  const unified = applyUnifiedControl(createUserControlState(), {
    userId: 'user_1002', strategy: 'negative', duration: 'once', note: '统一控亏',
    now: '2026-07-25 17:00:00', batchId: 'cancel-items-b1'
  })
  const progressed = consumeModuleControl(unified, {
    userId: 'user_1002', moduleKey: 'delivery', businessId: 'delivery-progress-1',
    beforeValue: 'profit', afterValue: 'loss', now: '2026-07-25 17:10:00'
  })
  const items = userControlHelpers.getUnifiedControlCancelItems(progressed.rules['user_1002'])

  assert.equal(items.length, 5)
  assert.equal(items.some((item) => item.moduleKey === 'delivery'), false)
  assert.deepEqual(items.find((item) => item.moduleKey === 'perpetual'), {
    moduleKey: 'perpetual', moduleLabel: '永续', value: 'loss', duration: 'once', status: 'active'
  })
  assert.deepEqual(items.find((item) => item.moduleKey === 'aiQuant'), {
    moduleKey: 'aiQuant', moduleLabel: 'AI量化', value: 'lowYield', duration: 'once', status: 'active'
  })
})

test('divergence keys identify the overridden module without flagging consumed progress', () => {
  const unified = applyUnifiedControl(createUserControlState(), {
    userId: 'user_1003', strategy: 'positive', duration: 'once', note: '统一带盈',
    now: '2026-07-25 18:00:00', batchId: 'difference-b1'
  })
  const progressed = consumeModuleControl(unified, {
    userId: 'user_1003', moduleKey: 'delivery', businessId: 'delivery-difference-1',
    beforeValue: 'loss', afterValue: 'profit', now: '2026-07-25 18:10:00'
  })
  assert.deepEqual(userControlHelpers.getUserControlDivergenceKeys(progressed.rules['user_1003']), [])

  const divergent = applyModuleControl(progressed, {
    userId: 'user_1003', moduleKey: 'perpetual', value: 'loss', duration: 'once',
    note: '永续独立控亏', now: '2026-07-25 18:20:00', ruleId: 'difference-perpetual-1'
  })
  assert.deepEqual(userControlHelpers.getUserControlDivergenceKeys(divergent.rules['user_1003']), ['perpetual'])

  const mixedDifferenceRules = {
    ...unified.rules['user_1003'],
    spot: { ...unified.rules['user_1003'].spot, status: 'cancelled' },
    aiQuant: { ...unified.rules['user_1003'].aiQuant, batchId: 'different-batch' },
    portfolio: { ...unified.rules['user_1003'].portfolio, status: 'superseded' }
  }
  assert.deepEqual(userControlHelpers.getUserControlDivergenceKeys(mixedDifferenceRules), ['spot', 'aiQuant', 'portfolio'])

  const splitBatchRules = {
    ...unified.rules['user_1003'],
    portfolio: { ...unified.rules['user_1003'].portfolio, batchId: 'different-batch' }
  }
  const splitBatchState = {
    ...unified,
    rules: { ...unified.rules, user_1003: splitBatchRules }
  }
  assert.deepEqual(summarizeUserControl(splitBatchState, 'user_1003'), {
    kind: 'divergent', aligned: 5, total: 6, label: '5/6 存在差异'
  })
  assert.equal(userControlHelpers.getUserControlListMeta(splitBatchState, 'user_1003').controlLabel, '存在模块差异')
  assert.deepEqual(userControlHelpers.getUserControlDivergenceKeys(splitBatchRules), ['portfolio'])
})

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

test('unified negative maps trading to loss and finance to low yield', () => {
  const next = applyUnifiedControl(createUserControlState(), {
    userId: '159', strategy: 'negative', duration: 'permanent', note: '客户控亏',
    now: '2026-07-25 14:30:00', batchId: 'batch-negative'
  })

  assert.equal(next.rules['159'].perpetual.value, 'loss')
  assert.equal(next.rules['159'].delivery.value, 'loss')
  assert.equal(next.rules['159'].spot.value, 'loss')
  assert.equal(next.rules['159'].aiQuant.value, 'lowYield')
  assert.equal(next.rules['159'].liquidity.value, 'lowYield')
  assert.equal(next.rules['159'].portfolio.value, 'lowYield')
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

test('a second unified write replaces a module override and restores six-module alignment', () => {
  const unified = applyUnifiedControl(createUserControlState(), {
    userId: '159', strategy: 'positive', duration: 'permanent', note: '统一带盈', now: '2026-07-25 14:30:00', batchId: 'b1'
  })
  const overridden = applyModuleControl(unified, {
    userId: '159', moduleKey: 'perpetual', value: 'loss', duration: 'permanent',
    note: '永续单独控亏', now: '2026-07-25 15:10:00', ruleId: 'r-perp-2'
  })
  const replaced = applyUnifiedControl(overridden, {
    userId: '159', strategy: 'negative', duration: 'once', note: '统一控亏', now: '2026-07-25 16:00:00', batchId: 'b2'
  })

  assert.equal(replaced.rules['159'].perpetual.source, 'global')
  assert.equal(replaced.rules['159'].perpetual.value, 'loss')
  assert.deepEqual(summarizeUserControl(replaced, '159'), { kind: 'synced', aligned: 6, total: 6, label: '6/6 已同步' })
})

test('overwrites retain superseded rules as displayable history without changing current rules', () => {
  const first = applyUnifiedControl(createUserControlState(), {
    userId: '159', strategy: 'positive', duration: 'permanent', note: '统一带盈',
    now: '2026-07-25 14:30:00', batchId: 'history-b1'
  })
  const overridden = applyModuleControl(first, {
    userId: '159', moduleKey: 'perpetual', value: 'loss', duration: 'permanent',
    note: '永续单独控亏', now: '2026-07-25 15:10:00', ruleId: 'history-perpetual-2'
  })

  assert.equal(overridden.rules['159'].perpetual.id, 'history-perpetual-2')
  assert.equal(overridden.rules['159'].perpetual.status, 'active')
  assert.deepEqual(overridden.ruleHistory, [{
    ...first.rules['159'].perpetual,
    status: 'superseded',
    supersededAt: '2026-07-25 15:10:00'
  }])

  const replaced = applyUnifiedControl(overridden, {
    userId: '159', strategy: 'negative', duration: 'once', note: '统一控亏',
    now: '2026-07-25 16:00:00', batchId: 'history-b2'
  })
  assert.equal(replaced.ruleHistory.length, USER_CONTROL_MODULES.length + 1)
  assert.ok(replaced.ruleHistory.slice(0, USER_CONTROL_MODULES.length).every((rule) => (
    rule.status === 'superseded' && rule.supersededAt === '2026-07-25 16:00:00'
  )))
  assert.ok(Object.values(replaced.rules['159']).every((rule) => (
    rule.batchId === 'history-b2' && rule.status === 'active' && rule.supersededAt === ''
  )))
})

test('unified apply operation log retains a snapshot of the prior six-module rules', () => {
  const first = applyUnifiedControl(createUserControlState(), {
    userId: '159', strategy: 'positive', duration: 'permanent', note: '统一带盈', now: '2026-07-25 14:30:00', batchId: 'b1'
  })
  const overridden = applyModuleControl(first, {
    userId: '159', moduleKey: 'perpetual', value: 'loss', duration: 'permanent',
    note: '永续单独控亏', now: '2026-07-25 15:10:00', ruleId: 'r-perp-2'
  })
  const replaced = applyUnifiedControl(overridden, {
    userId: '159', strategy: 'negative', duration: 'once', note: '统一控亏', now: '2026-07-25 16:00:00', batchId: 'b2'
  })

  assert.deepEqual(replaced.operationLogs[0].before, overridden.rules['159'])
  assert.notEqual(replaced.operationLogs[0].before, overridden.rules['159'])
  assert.equal(replaced.operationLogs[0].before.perpetual.source, 'module')
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

test('once consumption rejects a simulated outcome that differs from the active rule', () => {
  const configured = applyUnifiedControl(createUserControlState(), {
    userId: '159', strategy: 'positive', duration: 'once', note: '统一带盈',
    now: '2026-07-25 14:30:00', batchId: 'locked-outcome-b1'
  })
  const rejected = consumeModuleControl(configured, {
    userId: '159', moduleKey: 'delivery', businessId: 'delivery-wrong-result',
    beforeValue: 'profit', afterValue: 'loss', now: '2026-07-25 14:40:00'
  })

  assert.strictEqual(rejected, configured)
  assert.equal(rejected.rules['159'].delivery.status, 'active')
  assert.equal(rejected.executionLogs.length, 0)

  const accepted = consumeModuleControl(configured, {
    userId: '159', moduleKey: 'delivery', businessId: 'delivery-rule-result',
    beforeValue: 'loss', afterValue: 'profit', now: '2026-07-25 14:41:00'
  })
  assert.equal(accepted.rules['159'].delivery.status, 'consumed')
  assert.equal(accepted.executionLogs[0].afterValue, configured.rules['159'].delivery.value)
})

test('failed once execution keeps the rule active and records a failed execution log', () => {
  const configured = applyUnifiedControl(createUserControlState(), {
    userId: '159', strategy: 'positive', duration: 'once', note: '统一带盈',
    now: '2026-07-25 14:30:00', batchId: 'failed-execution-b1'
  })
  const failed = consumeModuleControl(configured, {
    userId: '159', moduleKey: 'delivery', businessId: 'delivery-failed-1',
    beforeValue: 'loss', afterValue: 'profit', status: 'failed',
    errorMessage: '最终结算写入失败', now: '2026-07-25 14:40:00'
  })

  assert.equal(failed.rules['159'].delivery.status, 'active')
  assert.equal(failed.executionLogs[0].status, 'failed')
  assert.equal(failed.executionLogs[0].errorMessage, '最终结算写入失败')
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
  const configured = applyUnifiedControl(createUserControlState(), {
    userId: '159', strategy: 'negative', duration: 'permanent', note: '旧的六模块配置',
    now: '2026-07-25 14:00:00', batchId: 'old-batch'
  })
  const initial = { ...configured, failureModule: 'spot' }
  const next = applyUnifiedControl(initial, {
    userId: '159', strategy: 'positive', duration: 'once', note: '客户带盈', now: '2026-07-25 14:30:00', batchId: 'b1'
  })
  assert.equal(Object.keys(initial.rules['159']).length, USER_CONTROL_MODULES.length)
  for (const module of USER_CONTROL_MODULES) {
    assert.deepEqual(next.rules['159'][module.key], initial.rules['159'][module.key])
  }
  assert.equal(next.operationLogs.length, initial.operationLogs.length + 1)
  assert.equal(next.operationLogs[0].status, 'failed')
  assert.equal(next.operationLogs[0].failedModule, 'spot')
  assert.deepEqual(next.operationLogs[0].before, initial.rules['159'])
  assert.deepEqual(next.ruleHistory, initial.ruleHistory)
  assert.equal(next.lastError, '模块 spot 写入失败，六个模块均未更新')
})

test('reactive six-module rules can be snapshotted as detached cloneable values', () => {
  assert.equal(typeof userControlHelpers.snapshotUserControlRules, 'function')
  const state = reactive(createUserControlDemoSeed())
  const snapshot = userControlHelpers.snapshotUserControlRules(state, '159')

  assert.deepEqual(Object.keys(snapshot).sort(), USER_CONTROL_MODULES.map((module) => module.key).sort())
  assert.doesNotThrow(() => structuredClone(snapshot))
  const priorStatus = snapshot.spot.status
  state.rules['159'].spot.status = 'cancelled'
  assert.equal(snapshot.spot.status, priorStatus)
})

test('simulation values reset to valid outcomes for the selected module family', () => {
  assert.equal(typeof userControlHelpers.getUserControlSimulationValues, 'function')
  assert.equal(typeof userControlHelpers.isUserControlSimulationValue, 'function')

  const trade = userControlHelpers.getUserControlSimulationValues('delivery', 'loss')
  assert.deepEqual(trade, { beforeValue: 'profit', afterValue: 'loss' })
  assert.equal(userControlHelpers.isUserControlSimulationValue('delivery', trade.beforeValue), true)
  assert.equal(userControlHelpers.isUserControlSimulationValue('delivery', trade.afterValue), true)

  const finance = userControlHelpers.getUserControlSimulationValues('aiQuant', trade.afterValue)
  assert.deepEqual(finance, { beforeValue: 'lowYield', afterValue: 'highYield' })
  assert.equal(userControlHelpers.isUserControlSimulationValue('aiQuant', finance.beforeValue), true)
  assert.equal(userControlHelpers.isUserControlSimulationValue('aiQuant', finance.afterValue), true)
  assert.equal(userControlHelpers.isUserControlSimulationValue('aiQuant', 'loss'), false)
})

test('simulation rule binding follows state replacement and clears an inactive rule', async () => {
  assert.equal(typeof userControlStateHelpers.watchUserControlSimulationRule, 'function')
  resetUserControlDemo()
  const simulation = reactive({
    userId: '159',
    moduleKey: 'spot',
    beforeValue: '',
    afterValue: ''
  })
  const stop = userControlStateHelpers.watchUserControlSimulationRule(simulation)

  try {
    await nextTick()
    assert.deepEqual({
      beforeValue: simulation.beforeValue,
      afterValue: simulation.afterValue
    }, { beforeValue: 'loss', afterValue: 'profit' })

    setUnifiedUserControl({
      userId: '159', strategy: 'negative', duration: 'once', note: '替换为控亏规则',
      now: '2026-07-25 18:00:00', batchId: 'reactive-replacement-b1'
    })
    await nextTick()
    assert.deepEqual({
      beforeValue: simulation.beforeValue,
      afterValue: simulation.afterValue
    }, { beforeValue: 'profit', afterValue: 'loss' })

    resetUserControlDemo()
    await nextTick()
    assert.equal(simulation.afterValue, 'profit')

    cancelSingleModuleControl({
      userId: '159', moduleKey: 'spot', note: '取消以验证清理',
      now: '2026-07-25 18:10:00', operationId: 'reactive-cancel-spot'
    })
    await nextTick()
    assert.equal(simulation.afterValue, '')
  } finally {
    stop()
    resetUserControlDemo()
  }
})

test('simulation rule binding preserves beforeValue across unrelated state replacements', async () => {
  resetUserControlDemo()
  const simulation = reactive({
    userId: '159',
    moduleKey: 'spot',
    beforeValue: '',
    afterValue: ''
  })
  const stop = userControlStateHelpers.watchUserControlSimulationRule(simulation)

  try {
    await nextTick()
    simulation.beforeValue = 'profit'

    setUserControlFailureModule('delivery')
    await nextTick()
    assert.equal(simulation.beforeValue, 'profit')

    setUserControlFailureModule('')
    setUnifiedUserControl({
      userId: 'unrelated-user', strategy: 'negative', duration: 'permanent', note: '无关用户操作日志',
      now: '2026-07-25 18:20:00', batchId: 'unrelated-state-b1'
    })
    await nextTick()
    assert.equal(simulation.beforeValue, 'profit')
  } finally {
    stop()
    resetUserControlDemo()
  }
})

test('log query normalization follows changed, array, invalid, and cleared route values', () => {
  assert.equal(typeof userControlHelpers.normalizeUserControlLogQuery, 'function')
  assert.deepEqual(userControlHelpers.normalizeUserControlLogQuery({ userId: '159', module: 'aiQuant' }), {
    userId: '159', module: 'aiQuant'
  })
  assert.deepEqual(userControlHelpers.normalizeUserControlLogQuery({ userId: ['158'], module: ['spot'] }), {
    userId: '158', module: 'spot'
  })
  assert.deepEqual(userControlHelpers.normalizeUserControlLogQuery({ userId: undefined, module: 'unknown' }), {
    userId: '', module: ''
  })
  assert.deepEqual(userControlHelpers.normalizeUserControlLogQuery({}), { userId: '', module: '' })
})

test('demo state actions consume once, retain failure toggle, and restore the seed', () => {
  resetUserControlDemo()
  try {
    const executionCount = userControlState.value.executionLogs.length
    const payload = {
      userId: '159', moduleKey: 'spot', beforeValue: 'loss', afterValue: 'profit',
      businessId: 'state-demo-spot-001', now: '2026-07-25 17:00:00'
    }
    simulateUserControlExecution(payload)
    simulateUserControlExecution({ ...payload, businessId: 'state-demo-spot-002' })
    assert.equal(userControlState.value.executionLogs.length, executionCount + 1)
    assert.equal(userControlState.value.rules['159'].spot.status, 'consumed')

    const before = Object.fromEntries(Object.entries(userControlState.value.rules['159']).map(([key, rule]) => [key, { ...rule }]))
    setUserControlFailureModule('spot')
    setUnifiedUserControl({
      userId: '159', strategy: 'negative', duration: 'once', note: '状态层原子失败测试',
      now: '2026-07-25 17:10:00', batchId: 'state-failure-001'
    })
    assert.equal(userControlState.value.failureModule, 'spot')
    assert.equal(userControlState.value.lastError, '模块 spot 写入失败，六个模块均未更新')
    for (const module of USER_CONTROL_MODULES) {
      assert.deepEqual(userControlState.value.rules['159'][module.key], before[module.key])
    }

    setUserControlFailureModule('')
    assert.equal(userControlState.value.failureModule, '')
  } finally {
    resetUserControlDemo()
  }
  assert.equal(userControlState.value.failureModule, '')
  assert.equal(userControlState.value.rules['159'].spot.status, 'active')
})

test('filtering matches user details and rule fields', () => {
  const rows = [
    { userId: '159', username: 'Alice', email: 'alice@example.com', rule: { value: 'profit', status: 'active', source: 'global' } },
    { userId: '160', username: 'Bob', email: 'bob@example.com', rule: { value: 'loss', status: 'cancelled', source: 'module' } }
  ]
  assert.deepEqual(filterUserControlRows(rows, { query: 'ALICE', value: 'profit', status: 'active', source: 'global' }), [rows[0]])
})
