const MODULE_CONTROL_OPTIONS = Object.freeze({
  trade: Object.freeze([
    Object.freeze({ value: 'profit', label: '盈利', description: '最终结算后的已实现净收益为正' }),
    Object.freeze({ value: 'loss', label: '亏损', description: '最终结算后的已实现净收益为负' })
  ]),
  finance: Object.freeze([
    Object.freeze({ value: 'highYield', label: '高收益', description: '使用产品允许范围内的较高收益档位' }),
    Object.freeze({ value: 'lowYield', label: '低收益', description: '使用产品允许范围内的较低收益档位' })
  ])
})

const VALID_STRATEGIES = new Set(['positive', 'negative'])
const VALID_DURATIONS = new Set(['once', 'permanent'])
const text = (value) => String(value ?? '').trim()

export const getModuleControlOptions = (family) => MODULE_CONTROL_OPTIONS[family] || []

export function isUserControlFormComplete(input = {}) {
  if (!text(input.userId) || !text(input.note) || !VALID_DURATIONS.has(input.duration)) return false
  if (input.scope === 'global') return VALID_STRATEGIES.has(input.strategy)
  if (input.scope !== 'module') return false
  return getModuleControlOptions(input.family).some((option) => option.value === input.value)
}

export function buildUserControlPayload(input = {}) {
  if (!isUserControlFormComplete(input)) throw new TypeError('user control form is incomplete')
  return {
    userId: text(input.userId),
    ...(input.scope === 'global' ? { strategy: input.strategy } : { value: input.value }),
    duration: input.duration,
    note: text(input.note)
  }
}
