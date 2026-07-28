const MODULE_CONTROL_OPTIONS = Object.freeze({
  trade: Object.freeze([
    Object.freeze({ value: 'profit', label: '盈利', description: '最终结算后的已实现净收益为正' }),
    Object.freeze({ value: 'loss', label: '亏损', description: '最终结算后的已实现净收益为负' })
  ]),
  finance: Object.freeze([
    Object.freeze({ value: 'highYield', label: '高收益', description: '按订单所属产品的高收益区间计算' }),
    Object.freeze({ value: 'lowYield', label: '低收益', description: '按订单所属产品的低收益区间计算' })
  ])
})

const CONTROL_TYPE_OPTIONS = Object.freeze([
  Object.freeze({ value: 'positive', label: '控赢', description: '交易模块按有利价格偏移；理财模块按收益率提升处理' }),
  Object.freeze({ value: 'negative', label: '控输', description: '交易模块按不利价格偏移；理财模块按收益率降低处理' })
])

const CONTROL_METHOD_OPTIONS = Object.freeze({
  positive: Object.freeze([
    Object.freeze({ value: 'profit', label: '盈利', description: '按模块默认盈利规则处理' }),
    Object.freeze({ value: 'highProfit', label: '做高盈利', description: '盈利金额按较高盈利区间处理' }),
    Object.freeze({ value: 'lowProfit', label: '做低盈利', description: '盈利金额按较低盈利区间处理' })
  ]),
  negative: Object.freeze([
    Object.freeze({ value: 'loss', label: '亏损', description: '按模块默认亏损规则处理' }),
    Object.freeze({ value: 'highLoss', label: '做高亏损', description: '亏损金额按较高亏损区间处理' }),
    Object.freeze({ value: 'lowLoss', label: '做低亏损', description: '亏损金额按较低亏损区间处理' })
  ])
})

const VALID_STRATEGIES = new Set(['positive', 'negative'])
const VALID_DURATIONS = new Set(['once', 'permanent'])
const text = (value) => String(value ?? '').trim()

export const getModuleControlOptions = (family) => MODULE_CONTROL_OPTIONS[family] || []
export const getControlTypeOptions = () => CONTROL_TYPE_OPTIONS
export const getControlMethodOptions = (strategy) => CONTROL_METHOD_OPTIONS[strategy] || []
export const isControlMethodForStrategy = (strategy, method) => getControlMethodOptions(strategy).some((option) => option.value === method)
export const defaultControlMethod = (strategy) => getControlMethodOptions(strategy)[0]?.value || ''
export const controlMethodLabel = (method) => [...CONTROL_METHOD_OPTIONS.positive, ...CONTROL_METHOD_OPTIONS.negative]
  .find((option) => option.value === method)?.label || ''
export const moduleValueForStrategy = (strategy, family) => {
  if (strategy === 'positive') return family === 'trade' ? 'profit' : 'highYield'
  if (strategy === 'negative') return family === 'trade' ? 'loss' : 'lowYield'
  return ''
}

export function isUserControlFormComplete(input = {}) {
  if (!text(input.userId) || !text(input.note) || !VALID_DURATIONS.has(input.duration)) return false
  if (input.scope === 'global') return VALID_STRATEGIES.has(input.strategy) && isControlMethodForStrategy(input.strategy, input.method)
  if (input.scope !== 'module') return false
  return VALID_STRATEGIES.has(input.strategy)
    && isControlMethodForStrategy(input.strategy, input.method)
    && getModuleControlOptions(input.family).some((option) => option.value === moduleValueForStrategy(input.strategy, input.family))
}

export function buildUserControlPayload(input = {}) {
  if (!isUserControlFormComplete(input)) throw new TypeError('user control form is incomplete')
  return {
    userId: text(input.userId),
    strategy: input.strategy,
    method: input.method,
    ...(input.scope === 'module' ? { value: moduleValueForStrategy(input.strategy, input.family) } : {}),
    duration: input.duration,
    note: text(input.note)
  }
}
