import {
  applyModuleControl,
  applyUnifiedControl,
  consumeModuleControl,
  createUserControlState
} from '../../features/user-control/userControl.js'

const TIMESTAMPS = Object.freeze({
  unified159: '2026-07-25 14:30:00',
  consumed159: '2026-07-25 14:40:00',
  unified158: '2026-07-25 15:00:00',
  override158: '2026-07-25 15:10:00',
  unified153: '2026-07-25 15:30:00',
  unified1001: '2026-07-25 16:00:00',
  unified1002: '2026-07-25 16:10:00',
  consumed1002: '2026-07-25 16:20:00',
  unified1003: '2026-07-25 16:30:00',
  override1003: '2026-07-25 16:40:00'
})

export function createUserControlDemoSeed() {
  const unified159 = applyUnifiedControl(createUserControlState(), {
    userId: '159',
    strategy: 'positive',
    duration: 'once',
    note: '演示：统一带盈后交割已执行',
    now: TIMESTAMPS.unified159,
    batchId: 'demo-batch-159'
  })
  const consumed159 = consumeModuleControl(unified159, {
    userId: '159',
    moduleKey: 'delivery',
    businessId: 'demo-delivery-159-001',
    beforeValue: 'loss',
    afterValue: 'profit',
    now: TIMESTAMPS.consumed159
  })
  const unified158 = applyUnifiedControl(consumed159, {
    userId: '158',
    strategy: 'positive',
    duration: 'permanent',
    note: '演示：统一带盈后单模块覆盖',
    now: TIMESTAMPS.unified158,
    batchId: 'demo-batch-158'
  })
  const divergent158 = applyModuleControl(unified158, {
    userId: '158',
    moduleKey: 'perpetual',
    value: 'loss',
    duration: 'permanent',
    note: '演示：永续单独控亏',
    now: TIMESTAMPS.override158,
    ruleId: 'demo-rule-158-perpetual'
  })

  const unified153 = applyUnifiedControl(divergent158, {
    userId: '153',
    strategy: 'negative',
    duration: 'permanent',
    note: '演示：六模块已同步',
    now: TIMESTAMPS.unified153,
    batchId: 'demo-batch-153'
  })

  const unified1001 = applyUnifiedControl(unified153, {
    userId: 'user_1001',
    strategy: 'positive',
    duration: 'permanent',
    note: '演示：列表用户六模块已同步',
    now: TIMESTAMPS.unified1001,
    batchId: 'demo-batch-user-1001'
  })
  const unified1002 = applyUnifiedControl(unified1001, {
    userId: 'user_1002',
    strategy: 'positive',
    duration: 'once',
    note: '演示：列表用户统一带盈后交割已执行',
    now: TIMESTAMPS.unified1002,
    batchId: 'demo-batch-user-1002'
  })
  const progressed1002 = consumeModuleControl(unified1002, {
    userId: 'user_1002',
    moduleKey: 'delivery',
    businessId: 'demo-delivery-user-1002-001',
    beforeValue: 'loss',
    afterValue: 'profit',
    now: TIMESTAMPS.consumed1002
  })
  const unified1003 = applyUnifiedControl(progressed1002, {
    userId: 'user_1003',
    strategy: 'negative',
    duration: 'permanent',
    note: '演示：列表用户统一控亏后单模块覆盖',
    now: TIMESTAMPS.unified1003,
    batchId: 'demo-batch-user-1003'
  })

  return applyModuleControl(unified1003, {
    userId: 'user_1003',
    moduleKey: 'perpetual',
    value: 'profit',
    duration: 'permanent',
    note: '演示：列表用户永续单独控盈',
    now: TIMESTAMPS.override1003,
    ruleId: 'demo-rule-user-1003-perpetual'
  })
}
