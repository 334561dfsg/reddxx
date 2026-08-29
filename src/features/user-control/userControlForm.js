const MODULE_CONTROL_OPTIONS = Object.freeze({
  trade: Object.freeze([
    Object.freeze({ value: 'profit', label: '盈利', description: '最终结算后的已实现净收益为正' }),
    Object.freeze({ value: 'loss', label: '亏损', description: '最终结算后的已实现净收益为负' })
  ])
})

const VALID_STRATEGIES = new Set(['positive', 'negative', 'normal'])
const VALID_DURATIONS = new Set(['once', 'permanent'])
const DEFAULT_DURATION = 'permanent'
const text = (value) => String(value ?? '').trim()

export const getModuleControlOptions = (family) => MODULE_CONTROL_OPTIONS[family] || []
export const defaultControlMethod = (strategy) => {
  if (strategy === 'positive') return 'profit'
  if (strategy === 'negative') return 'loss'
  return ''
}
export const moduleValueForStrategy = (strategy, family) => {
  if (strategy === 'positive') return family === 'trade' ? 'profit' : 'highYield'
  if (strategy === 'negative') return family === 'trade' ? 'loss' : 'lowYield'
  return ''
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
  if (input.strategy === 'normal') return input.scope === 'global' || input.scope === 'module'
  if (input.scope === 'global') return VALID_STRATEGIES.has(input.strategy)
  if (input.scope !== 'module') return false
  return VALID_STRATEGIES.has(input.strategy)
    && getModuleControlOptions(input.family).some((option) => option.value === moduleValueForStrategy(input.strategy, input.family))
}

export function buildUserControlPayload(input = {}) {
  if (!isUserControlFormComplete(input)) throw new TypeError('user control form is incomplete')
  const method = defaultControlMethod(input.strategy)
  return {
    userId: text(input.userId),
    strategy: input.strategy,
    method,
    ...(input.scope === 'global' && normalizeModules(input.modules) ? { modules: normalizeModules(input.modules) } : {}),
    ...(input.scope === 'module' && input.strategy !== 'normal' ? { value: moduleValueForStrategy(input.strategy, input.family) } : {}),
    intensity: {},
    duration: normalizeDuration(input.duration),
    note: text(input.note)
  }
}
