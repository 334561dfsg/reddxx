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
  unified153: '2026-07-25 15:30:00'
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

  return applyUnifiedControl(divergent158, {
    userId: '153',
    strategy: 'negative',
    duration: 'permanent',
    note: '演示：六模块已同步',
    now: TIMESTAMPS.unified153,
    batchId: 'demo-batch-153'
  })
}
