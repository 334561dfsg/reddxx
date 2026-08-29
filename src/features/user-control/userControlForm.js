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
  Object.freeze({ value: 'positive', label: '盈利', description: '交割模块按有利价格偏移处理' }),
  Object.freeze({ value: 'negative', label: '亏损', description: '交割模块按不利价格偏移处理' })
])

const CONTROL_METHOD_OPTIONS = Object.freeze({
  positive: Object.freeze([
    Object.freeze({ value: 'profit', label: '默认盈利', description: '按模块默认盈利规则处理' }),
    Object.freeze({ value: 'highProfit', label: '做高盈利', description: '盈利金额按较高盈利区间处理' }),
    Object.freeze({ value: 'lowProfit', label: '做低盈利', description: '盈利金额按较低盈利区间处理' })
  ]),
  negative: Object.freeze([
    Object.freeze({ value: 'loss', label: '默认亏损', description: '按模块默认亏损规则处理' }),
    Object.freeze({ value: 'highLoss', label: '做高亏损', description: '亏损金额按较高亏损区间处理' }),
    Object.freeze({ value: 'lowLoss', label: '做低亏损', description: '亏损金额按较低亏损区间处理' })
  ])
})

const ADVANCED_CONTROL_METHODS = new Set(['highProfit', 'lowProfit', 'highLoss', 'lowLoss'])
const ADVANCED_CONTROL_MODULES = new Set(['delivery'])
const GLOBAL_ADVANCED_METHOD_NOTE = '仅针对交割合约生效'
const VALID_STRATEGIES = new Set(['positive', 'negative', 'normal'])
const VALID_DURATIONS = new Set(['once', 'permanent'])
const DEFAULT_DURATION = 'permanent'
const text = (value) => String(value ?? '').trim()
const DEFAULT_INTENSITY = Object.freeze({
  trade: Object.freeze({ mode: 'percentRange', min: 1, max: 10, unit: '%' }),
  finance: Object.freeze({ mode: 'percentRange', min: 1, max: 10, unit: '%' })
})

export const getModuleControlOptions = (family) => MODULE_CONTROL_OPTIONS[family] || []
export const getControlTypeOptions = () => CONTROL_TYPE_OPTIONS
export const supportsAdvancedControlMethod = (input = {}) => input.scope === 'global'
  || (input.scope === 'module' && ADVANCED_CONTROL_MODULES.has(input.moduleKey))
export const getControlMethodOptions = (strategy, input) => {
  const options = CONTROL_METHOD_OPTIONS[strategy] || []
  if (!input) return options
  if (input.scope === 'global') {
    return options.map((option) => ADVANCED_CONTROL_METHODS.has(option.value)
      ? { ...option, description: `${option.description}；${GLOBAL_ADVANCED_METHOD_NOTE}` }
      : option)
  }
  if (supportsAdvancedControlMethod(input)) return options
  return options.filter((option) => !ADVANCED_CONTROL_METHODS.has(option.value))
}
export const isControlMethodForStrategy = (strategy, method, input) => getControlMethodOptions(strategy, input).some((option) => option.value === method)
export const defaultControlMethod = (strategy, input) => getControlMethodOptions(strategy, input)[0]?.value || ''
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
  if (input.scope === 'global') return Boolean(intensity.trade)
  return Boolean(intensity[input.family])
}

const normalizeDuration = (duration) => VALID_DURATIONS.has(duration) ? duration : DEFAULT_DURATION
const normalizeModules = (modules) => {
  if (!Array.isArray(modules)) return undefined
  const values = [...new Set(modules.map((module) => text(module)).filter(Boolean))]
  return values.length ? values : undefined
}

export function isUserControlFormComplete(input = {}) {
  const noteRequired = input.noteRequired !== false
  if (!text(input.userId) || (noteRequired && !text(input.note)) || !VALID_DURATIONS.has(normalizeDuration(input.duration))) return false
  if (input.scope === 'global' && input.strategy === 'normal') return true
  if (input.scope === 'global') return VALID_STRATEGIES.has(input.strategy) && isControlMethodForStrategy(input.strategy, input.method, input)
  if (input.scope !== 'module') return false
  return VALID_STRATEGIES.has(input.strategy)
    && isControlMethodForStrategy(input.strategy, input.method, input)
    && getModuleControlOptions(input.family).some((option) => option.value === moduleValueForStrategy(input.strategy, input.family))
    && hasRequiredIntensity(input)
}

export function buildUserControlPayload(input = {}) {
  if (!isUserControlFormComplete(input)) throw new TypeError('user control form is incomplete')
  return {
    userId: text(input.userId),
    strategy: input.strategy,
    method: input.method,
    ...(input.scope === 'global' && normalizeModules(input.modules) ? { modules: normalizeModules(input.modules) } : {}),
    ...(input.scope === 'module' ? { value: moduleValueForStrategy(input.strategy, input.family) } : {}),
    intensity: normalizeIntensity(input),
    duration: normalizeDuration(input.duration),
    note: text(input.note)
  }
}
