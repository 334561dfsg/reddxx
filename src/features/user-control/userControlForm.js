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
const DEFAULT_INTENSITY = Object.freeze({
  trade: Object.freeze({ mode: 'percentRange', min: 3, max: 8, unit: '%' }),
  finance: Object.freeze({ mode: 'percentRange', min: 1, max: 5, unit: '%' })
})

export const getModuleControlOptions = (family) => MODULE_CONTROL_OPTIONS[family] || []
export const getControlTypeOptions = () => CONTROL_TYPE_OPTIONS
export const getControlMethodOptions = (strategy) => CONTROL_METHOD_OPTIONS[strategy] || []
export const isControlMethodForStrategy = (strategy, method) => getControlMethodOptions(strategy).some((option) => option.value === method)
export const defaultControlMethod = (strategy) => getControlMethodOptions(strategy)[0]?.value || ''
export const controlMethodLabel = (method) => [...CONTROL_METHOD_OPTIONS.positive, ...CONTROL_METHOD_OPTIONS.negative]
  .find((option) => option.value === method)?.label || ''
export const defaultControlIntensity = (family) => ({ ...DEFAULT_INTENSITY[family] })
export const moduleValueForStrategy = (strategy, family) => {
  if (strategy === 'positive') return family === 'trade' ? 'profit' : 'highYield'
  if (strategy === 'negative') return family === 'trade' ? 'loss' : 'lowYield'
  return ''
}

const parsePercent = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const normalized = text(value).replace(/%/g, '')
  if (!normalized) return NaN
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : NaN
}

const normalizeIntensityItem = (item) => {
  const min = parsePercent(item?.min ?? item?.value ?? item)
  const max = parsePercent(item?.max ?? item?.value ?? item)
  if (!(min > 0) || !(max > 0) || max < min) return null
  return { mode: 'percentRange', min, max, unit: '%' }
}

const normalizeIntensity = (input = {}) => {
  const raw = input.intensity || {}
  const trade = normalizeIntensityItem(raw.trade)
  const finance = normalizeIntensityItem(raw.finance)
  return {
    ...(trade ? { trade } : {}),
    ...(finance ? { finance } : {})
  }
}

const hasRequiredIntensity = (input = {}) => {
  const intensity = normalizeIntensity(input)
  if (input.scope === 'global') return Boolean(intensity.trade && intensity.finance)
  return Boolean(intensity[input.family])
}

export function isUserControlFormComplete(input = {}) {
  if (!text(input.userId) || !text(input.note) || !VALID_DURATIONS.has(input.duration)) return false
  if (input.scope === 'global') return VALID_STRATEGIES.has(input.strategy) && isControlMethodForStrategy(input.strategy, input.method) && hasRequiredIntensity(input)
  if (input.scope !== 'module') return false
  return VALID_STRATEGIES.has(input.strategy)
    && isControlMethodForStrategy(input.strategy, input.method)
    && getModuleControlOptions(input.family).some((option) => option.value === moduleValueForStrategy(input.strategy, input.family))
    && hasRequiredIntensity(input)
}

export function buildUserControlPayload(input = {}) {
  if (!isUserControlFormComplete(input)) throw new TypeError('user control form is incomplete')
  return {
    userId: text(input.userId),
    strategy: input.strategy,
    method: input.method,
    ...(input.scope === 'module' ? { value: moduleValueForStrategy(input.strategy, input.family) } : {}),
    intensity: normalizeIntensity(input),
    duration: input.duration,
    note: text(input.note)
  }
}
