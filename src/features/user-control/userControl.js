import { appendUserAuditLog } from '../../admin/repositories/userAuditLogRepository.js'

export const USER_CONTROL_MODULES = Object.freeze([
  { key: 'delivery', label: '交割', family: 'trade', actionLabel: '用户点控' },
  { key: 'perpetual', label: '永续', family: 'trade', actionLabel: '用户点控' },
  { key: 'spot', label: '现货', family: 'trade', actionLabel: '用户点控' },
  { key: 'aiQuant', label: 'AI量化', family: 'finance', actionLabel: '用户点控' },
  { key: 'liquidity', label: '流动性挖矿', family: 'finance', actionLabel: '用户点控' },
  { key: 'portfolio', label: '投资组合', family: 'finance', actionLabel: '用户点控' }
])
export const USER_CONTROL_UNIFIED_MODULES = Object.freeze(
  USER_CONTROL_MODULES.filter((module) => module.family === 'trade')
)
const USER_CONTROL_UNIFIED_MODULE_KEYS = new Set(USER_CONTROL_UNIFIED_MODULES.map((module) => module.key))

export const USER_CONTROL_STRATEGY = Object.freeze({ POSITIVE: 'positive', NEGATIVE: 'negative' })
export const USER_CONTROL_DURATION = Object.freeze({ ONCE: 'once', PERMANENT: 'permanent' })
export const USER_CONTROL_METHOD = Object.freeze({
  PROFIT: 'profit',
  HIGH_PROFIT: 'highProfit',
  LOW_PROFIT: 'lowProfit',
  LOSS: 'loss',
  HIGH_LOSS: 'highLoss',
  LOW_LOSS: 'lowLoss'
})

const controlMethods = {
  positive: ['profit', 'highProfit', 'lowProfit'],
  negative: ['loss', 'highLoss', 'lowLoss']
}
const advancedControlMethods = new Set(['highProfit', 'lowProfit', 'highLoss', 'lowLoss'])
const advancedControlModules = new Set(['delivery', 'perpetual'])

const strategyValue = (strategy, family) => {
  if (strategy === 'positive') return family === 'trade' ? 'profit' : 'highYield'
  if (strategy === 'negative') return family === 'trade' ? 'loss' : 'lowYield'
  throw new TypeError('strategy must be positive or negative')
}

const strategyFromValue = (value) => (['loss', 'lowYield'].includes(value) ? 'negative' : 'positive')

const normalizeStrategy = (input = {}) => {
  if (input.strategy === 'positive' || input.strategy === 'negative') return input.strategy
  if (input.value) return strategyFromValue(input.value)
  throw new TypeError('strategy must be positive or negative')
}

const normalizeMethod = (input = {}) => {
  const strategy = normalizeStrategy(input)
  const moduleKey = String(input.moduleKey || '')
  const allowsAdvancedMethod = input.scope === 'global'
    || (input.scope === 'module' && advancedControlModules.has(moduleKey))
  if (controlMethods[strategy].includes(input.method) && (allowsAdvancedMethod || !advancedControlMethods.has(input.method))) return input.method
  return strategy === 'positive' ? 'profit' : 'loss'
}

const requireText = (value, name) => {
  const text = String(value || '').trim()
  if (!text) throw new TypeError(`${name} is required`)
  return text
}

const operatorOf = (input) => String(input.operator || 'admin_demo')
const cloneRule = (rule) => (rule ? { ...rule } : rule)
const cloneIntensity = (intensity) => {
  if (!intensity || typeof intensity !== 'object') return undefined
  return Object.fromEntries(Object.entries(intensity).map(([key, value]) => [
    key,
    value && typeof value === 'object' ? { ...value } : value
  ]))
}

const appendUnifiedUserControlAudit = ({ userId, action, operator, note, before, after, result = 'success', businessId, occurredAt }) => {
  appendUserAuditLog({
    targetUser: { uid: userId },
    source: 'admin',
    operator: { id: operator, name: operator },
    category: 'risk',
    action,
    result,
    reason: note,
    before,
    after,
    related: {
      businessId,
      requestId: businessId
    },
    occurredAt
  })
}

const rulesDuration = (rules = {}) => {
  const durations = [...new Set(Object.entries(rules)
    .filter(([key]) => USER_CONTROL_UNIFIED_MODULE_KEYS.has(key))
    .map(([, rule]) => rule?.duration)
    .filter(Boolean))]
  return durations.length > 1 ? 'mixed' : durations[0] || ''
}

export const createUserControlState = () => ({
  rules: {},
  ruleHistory: [],
  operationLogs: [],
  executionLogs: [],
  failureModule: ''
})

const supersedeRules = (rules, now) => Object.values(rules || {})
  .filter(Boolean)
  .map((rule) => ({
    ...rule,
    status: 'superseded',
    supersededAt: now
  }))

export function snapshotUserControlRules(state, userId) {
  const rules = state.rules[String(userId)] || {}
  return Object.fromEntries(USER_CONTROL_MODULES.map((module) => [
    module.key,
    cloneRule(rules[module.key]) || undefined
  ]))
}

export function applyUnifiedControl(state, input) {
  const userId = requireText(input.userId, 'userId')
  const note = requireText(input.note, 'note')
  const strategy = normalizeStrategy(input)
  const method = normalizeMethod({ ...input, strategy, scope: 'global' })
  const intensity = cloneIntensity(input.intensity)
  if (!['once', 'permanent'].includes(input.duration)) throw new TypeError('duration must be once or permanent')
  if (state.failureModule) {
    const before = Object.fromEntries(Object.entries(state.rules[userId] || {}).map(([key, rule]) => [key, { ...rule }]))
    return {
      ...state,
      operationLogs: [{
        id: `op-${input.batchId}-failed`, userId, scope: 'global', action: 'apply',
        modules: USER_CONTROL_UNIFIED_MODULES.map((item) => item.key), strategy, method,
        ...(intensity ? { intensity } : {}),
        duration: input.duration, operator: operatorOf(input), batchId: input.batchId,
        before, note, status: 'failed', failedModule: state.failureModule,
        errorMessage: `模块 ${state.failureModule} 写入失败，交易模块均未更新`, createdAt: input.now
      }, ...state.operationLogs],
      lastError: `模块 ${state.failureModule} 写入失败，交易模块均未更新`
    }
  }

  const before = Object.fromEntries(Object.entries(state.rules[userId] || {}).map(([key, rule]) => [key, { ...rule }]))
  const nextRules = cloneRules(state, userId)
  const overwrittenRules = {}
  USER_CONTROL_UNIFIED_MODULES.forEach((module) => {
    const moduleMethod = normalizeMethod({ ...input, strategy, method, scope: 'module', moduleKey: module.key })
    overwrittenRules[module.key] = nextRules[module.key]
    nextRules[module.key] = {
      id: `${input.batchId}-${module.key}`, batchId: input.batchId, userId, moduleKey: module.key,
      family: module.family, value: strategyValue(strategy, module.family), strategy, method: moduleMethod,
      ...(intensity?.[module.family] ? { intensity: { [module.family]: { ...intensity[module.family] } } } : {}),
      duration: input.duration, status: 'active', source: 'global', note, updatedAt: input.now,
      consumedAt: '', supersededAt: '', cancelledAt: ''
    }
  })
  appendUnifiedUserControlAudit({
    userId,
    action: 'risk.control.apply',
    operator: operatorOf(input),
    note,
    before,
    after: nextRules,
    businessId: input.batchId,
    occurredAt: input.now
  })

  return {
    ...state,
    rules: { ...state.rules, [userId]: nextRules },
    ruleHistory: [...supersedeRules(overwrittenRules, input.now), ...(state.ruleHistory || [])],
    operationLogs: [{ id: `op-${input.batchId}`, userId, scope: 'global', action: 'apply',
      modules: USER_CONTROL_UNIFIED_MODULES.map((item) => item.key), strategy, method,
      ...(intensity ? { intensity } : {}),
      duration: input.duration, operator: operatorOf(input), batchId: input.batchId,
      before, note, status: 'success', createdAt: input.now }, ...state.operationLogs],
    lastError: ''
  }
}

const moduleMeta = (moduleKey) => {
  const module = USER_CONTROL_MODULES.find((item) => item.key === moduleKey)
  if (!module) throw new TypeError('unknown moduleKey')
  return module
}

const validValues = { trade: ['profit', 'loss'], finance: ['highYield', 'lowYield'] }

export function isUserControlSimulationValue(moduleKey, value) {
  const module = USER_CONTROL_MODULES.find((item) => item.key === moduleKey)
  return Boolean(module && validValues[module.family].includes(value))
}

export function getUserControlSimulationValues(moduleKey, preferredAfterValue = '') {
  const module = moduleMeta(moduleKey)
  const values = validValues[module.family]
  const afterValue = values.includes(preferredAfterValue) ? preferredAfterValue : values[0]
  const beforeValue = values.find((value) => value !== afterValue) || values[0]
  return { beforeValue, afterValue }
}

const firstQueryValue = (value) => String(Array.isArray(value) ? value[0] || '' : value || '')

export function normalizeUserControlLogQuery(query = {}) {
  const userId = firstQueryValue(query.userId)
  const requestedModule = firstQueryValue(query.module)
  const module = USER_CONTROL_MODULES.some((item) => item.key === requestedModule) ? requestedModule : ''
  return { userId, module }
}

export function filterUserControlLogsByDate(logs = [], filters = {}) {
  const dateFrom = String(filters.dateFrom || '')
  const dateTo = String(filters.dateTo || '')
  const from = dateFrom ? `${dateFrom} 00:00:00` : ''
  const to = dateTo ? `${dateTo} 23:59:59` : ''

  return logs.filter((log) => {
    const createdAt = String(log.createdAt || '')
    if ((from || to) && !createdAt) return false
    return (!from || createdAt >= from) && (!to || createdAt <= to)
  })
}

const cloneRules = (state, userId) => ({ ...(state.rules[userId] || {}) })

export function applyModuleControl(state, input) {
  const userId = requireText(input.userId, 'userId')
  const note = requireText(input.note, 'note')
  const module = moduleMeta(input.moduleKey)
  const strategy = normalizeStrategy(input)
  const method = normalizeMethod({ ...input, strategy, scope: 'module', moduleKey: module.key })
  const value = input.value || strategyValue(strategy, module.family)
  const intensity = cloneIntensity(input.intensity)
  if (!validValues[module.family].includes(value)) throw new TypeError('value does not match module family')
  if (!['once', 'permanent'].includes(input.duration)) throw new TypeError('duration must be once or permanent')
  const userRules = cloneRules(state, userId)
  const before = userRules[module.key] || null
  userRules[module.key] = { id: input.ruleId, batchId: '', userId, moduleKey: module.key,
    family: module.family, value, strategy, method, duration: input.duration,
    ...(intensity?.[module.family] ? { intensity: { [module.family]: { ...intensity[module.family] } } } : {}),
    status: 'active', source: 'module', note, updatedAt: input.now,
    consumedAt: '', supersededAt: '', cancelledAt: '' }
  appendUnifiedUserControlAudit({
    userId,
    action: 'risk.control.apply',
    operator: operatorOf(input),
    note,
    before,
    after: userRules[module.key],
    businessId: input.batchId || input.ruleId,
    occurredAt: input.now
  })
  return {
    ...state,
    rules: { ...state.rules, [userId]: userRules },
    ruleHistory: [...supersedeRules(before ? { [module.key]: before } : {}, input.now), ...(state.ruleHistory || [])],
    operationLogs: [{
    id: `op-${input.ruleId}`, userId, scope: 'module', action: 'apply', modules: [module.key],
    strategy, method, ...(intensity ? { intensity } : {}), duration: input.duration, operator: operatorOf(input), batchId: input.batchId || input.ruleId,
    before, after: userRules[module.key], note, status: 'success', createdAt: input.now
    }, ...state.operationLogs],
    lastError: ''
  }
}

export function cancelUnifiedControl(state, input) {
  const userId = requireText(input.userId, 'userId')
  const note = requireText(input.note, 'note')
  const before = cloneRules(state, userId)
  if (!USER_CONTROL_UNIFIED_MODULES.some((module) => ['active', 'processing'].includes(before[module.key]?.status))) return state
  const cancelled = Object.fromEntries(Object.entries(before).map(([key, rule]) => [key,
    USER_CONTROL_UNIFIED_MODULE_KEYS.has(key) && ['active', 'processing'].includes(rule.status)
      ? { ...rule, status: 'cancelled', cancelledAt: input.now }
      : rule
  ]))
  appendUnifiedUserControlAudit({
    userId,
    action: 'risk.control.cancel',
    operator: operatorOf(input),
    note,
    before,
    after: cancelled,
    businessId: input.batchId || input.operationId,
    occurredAt: input.now
  })
  return { ...state, rules: { ...state.rules, [userId]: cancelled }, operationLogs: [{
    id: input.operationId, userId, scope: 'global', action: 'cancel',
    modules: USER_CONTROL_UNIFIED_MODULES.map((item) => item.key), duration: rulesDuration(before),
    operator: operatorOf(input), batchId: input.batchId || input.operationId,
    before, note, status: 'success', createdAt: input.now
  }, ...state.operationLogs] }
}

export function cancelModuleControl(state, input) {
  const userId = requireText(input.userId, 'userId')
  const note = requireText(input.note, 'note')
  moduleMeta(input.moduleKey)
  const userRules = cloneRules(state, userId)
  const before = userRules[input.moduleKey]
  if (before && ['active', 'processing'].includes(before.status)) {
    userRules[input.moduleKey] = { ...before, status: 'cancelled', cancelledAt: input.now }
    appendUnifiedUserControlAudit({
      userId,
      action: 'risk.control.cancel',
      operator: operatorOf(input),
      note,
      before,
      after: userRules[input.moduleKey],
      businessId: input.batchId || input.operationId,
      occurredAt: input.now
    })
  }
  return { ...state, rules: { ...state.rules, [userId]: userRules }, operationLogs: [{
    id: input.operationId, userId, scope: 'module', action: 'cancel', modules: [input.moduleKey],
    duration: before?.duration || '', operator: operatorOf(input),
    batchId: input.batchId || input.operationId, before, note, status: 'success', createdAt: input.now
  }, ...state.operationLogs] }
}

export function consumeModuleControl(state, input) {
  const userId = requireText(input.userId, 'userId')
  const userRules = cloneRules(state, userId)
  const rule = userRules[input.moduleKey]
  if (!rule || rule.status !== 'active' || rule.duration !== 'once') return state
  if (input.status === 'failed') {
    return { ...state, executionLogs: [{
      id: `exec-${input.businessId}`, userId, moduleKey: input.moduleKey, ruleId: rule.id,
      source: rule.source, value: rule.value, strategy: rule.strategy, method: rule.method,
      duration: rule.duration, businessId: input.businessId,
      beforeValue: input.beforeValue, afterValue: input.afterValue,
      status: 'failed', errorMessage: input.errorMessage || '执行失败', createdAt: input.now
    }, ...state.executionLogs] }
  }
  if (input.afterValue !== rule.value) return state
  userRules[input.moduleKey] = { ...rule, status: 'consumed', consumedAt: input.now }
  appendUnifiedUserControlAudit({
    userId,
    action: 'risk.control.consume',
    operator: 'system',
    note: rule.note,
    before: rule,
    after: userRules[input.moduleKey],
    businessId: input.businessId,
    occurredAt: input.now
  })
  return { ...state, rules: { ...state.rules, [userId]: userRules }, executionLogs: [{
    id: `exec-${input.businessId}`, userId, moduleKey: input.moduleKey, ruleId: rule.id,
    source: rule.source, value: rule.value, strategy: rule.strategy, method: rule.method,
    duration: rule.duration, businessId: input.businessId,
    beforeValue: input.beforeValue, afterValue: input.afterValue,
    status: 'success', createdAt: input.now
  }, ...state.executionLogs] }
}

const dominantUnifiedBatch = (rules) => {
  const batchCounts = Object.values(rules).reduce((counts, rule) => {
    if (rule.source === 'global' && rule.batchId) counts[rule.batchId] = (counts[rule.batchId] || 0) + 1
    return counts
  }, {})
  return Object.entries(batchCounts).sort((left, right) => right[1] - left[1])[0]?.[0] || ''
}

export function summarizeUserControl(state, userId) {
  const rules = USER_CONTROL_UNIFIED_MODULES
    .map((module) => state.rules[String(userId)]?.[module.key])
    .filter(Boolean)
  const effective = rules.filter((rule) => ['active', 'processing'].includes(rule.status))
  const consumed = rules.filter((rule) => rule.status === 'consumed')
  const total = USER_CONTROL_UNIFIED_MODULES.length
  if (!effective.length) return { kind: 'none', label: '未设置', total }
  const globalBatch = dominantUnifiedBatch(rules)
  const aligned = rules.filter((rule) => rule.batchId === globalBatch
    && ['active', 'processing', 'consumed'].includes(rule.status)).length
  const divergent = getUserControlDivergenceKeys(state.rules[String(userId)] || {}).length > 0
  if (divergent) return { kind: 'divergent', aligned, total, label: `${aligned}/${total} 存在差异` }
  if (consumed.length) return { kind: 'progress', consumed: consumed.length, total, label: `已执行 ${consumed.length}/${total}` }
  return { kind: 'synced', aligned: total, total, label: `${total}/${total} 已同步` }
}

export function getEffectiveUserControlRules(rules = {}) {
  return Object.fromEntries(Object.entries(rules).filter(([, rule]) => (
    ['active', 'processing'].includes(rule.status)
  )))
}

export function getUserControlListMeta(state, userId) {
  const effectiveRules = Object.values(getEffectiveUserControlRules(state.rules[String(userId)] || {}))
  if (!effectiveRules.length) {
    return { hasCurrent: false, controlLabel: '未设置', durationLabel: '—' }
  }

  const summary = summarizeUserControl(state, userId)
  const globalRule = effectiveRules.find((rule) => rule.source === 'global')
  const durations = [...new Set(effectiveRules.map((rule) => rule.duration).filter(Boolean))]
  const controlLabel = summary.kind === 'divergent'
    ? '存在模块差异'
    : globalRule?.strategy === 'positive'
      ? '盈利'
      : globalRule?.strategy === 'negative'
        ? '亏损'
        : '当前模块点控'

  return {
    hasCurrent: true,
    controlLabel,
    durationLabel: durations.length > 1 ? '混合' : durations[0] === 'permanent' ? '持续生效' : '只生效一次'
  }
}

export function getUnifiedControlCancelItems(rules = {}) {
  const effectiveRules = getEffectiveUserControlRules(rules)
  return USER_CONTROL_UNIFIED_MODULES
    .filter((module) => effectiveRules[module.key])
    .map((module) => ({
      moduleKey: module.key,
      moduleLabel: module.label,
      value: effectiveRules[module.key].value,
      method: effectiveRules[module.key].method,
      duration: effectiveRules[module.key].duration,
      status: effectiveRules[module.key].status
    }))
}

export function getUserControlDivergenceKeys(rules = {}) {
  const unifiedBatch = dominantUnifiedBatch(rules)

  return USER_CONTROL_UNIFIED_MODULES
    .filter((module) => {
      const rule = rules[module.key]
      if (!rule) return false
      return rule.source === 'module'
        || ['cancelled', 'superseded'].includes(rule.status)
        || Boolean(unifiedBatch && rule.batchId !== unifiedBatch)
    })
    .map((module) => module.key)
}

export function filterUserControlRows(rows, filters = {}) {
  const query = String(filters.query || '').trim().toLowerCase()
  return rows.filter((row) => (!query || `${row.userId} ${row.username} ${row.email} ${row.phone || ''}`.toLowerCase().includes(query))
    && (!filters.value || row.rule?.value === filters.value)
    && (!filters.status || row.rule?.status === filters.status)
    && (!filters.source || row.rule?.source === filters.source))
}
