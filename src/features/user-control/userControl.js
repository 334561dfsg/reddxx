export const USER_CONTROL_MODULES = Object.freeze([
  { key: 'delivery', label: '交割', family: 'trade', actionLabel: '用户点控' },
  { key: 'perpetual', label: '永续', family: 'trade', actionLabel: '用户点控' },
  { key: 'spot', label: '现货', family: 'trade', actionLabel: '用户点控' },
  { key: 'aiQuant', label: 'AI量化', family: 'finance', actionLabel: '用户收益调节' },
  { key: 'liquidity', label: '流动性挖矿', family: 'finance', actionLabel: '用户收益调节' },
  { key: 'portfolio', label: '投资组合', family: 'finance', actionLabel: '用户收益调节' }
])

export const USER_CONTROL_STRATEGY = Object.freeze({ POSITIVE: 'positive', NEGATIVE: 'negative' })
export const USER_CONTROL_DURATION = Object.freeze({ ONCE: 'once', PERMANENT: 'permanent' })

const strategyValue = (strategy, family) => {
  if (strategy === 'positive') return family === 'trade' ? 'profit' : 'highYield'
  if (strategy === 'negative') return family === 'trade' ? 'loss' : 'lowYield'
  throw new TypeError('strategy must be positive or negative')
}

const requireText = (value, name) => {
  const text = String(value || '').trim()
  if (!text) throw new TypeError(`${name} is required`)
  return text
}

const operatorOf = (input) => String(input.operator || 'admin_demo')

const rulesDuration = (rules = {}) => {
  const durations = [...new Set(Object.values(rules).map((rule) => rule?.duration).filter(Boolean))]
  return durations.length > 1 ? 'mixed' : durations[0] || ''
}

export const createUserControlState = () => ({
  rules: {},
  ruleHistory: [],
  operationLogs: [],
  executionLogs: [],
  failureModule: ''
})

const supersedeRules = (rules, now) => Object.values(rules || {}).map((rule) => ({
  ...rule,
  status: 'superseded',
  supersededAt: now
}))

export function snapshotUserControlRules(state, userId) {
  const rules = state.rules[String(userId)] || {}
  return Object.fromEntries(USER_CONTROL_MODULES.map((module) => [
    module.key,
    rules[module.key] ? { ...rules[module.key] } : undefined
  ]))
}

export function applyUnifiedControl(state, input) {
  const userId = requireText(input.userId, 'userId')
  const note = requireText(input.note, 'note')
  if (!['once', 'permanent'].includes(input.duration)) throw new TypeError('duration must be once or permanent')
  if (state.failureModule) {
    const before = Object.fromEntries(Object.entries(state.rules[userId] || {}).map(([key, rule]) => [key, { ...rule }]))
    return {
      ...state,
      operationLogs: [{
        id: `op-${input.batchId}-failed`, userId, scope: 'global', action: 'apply',
        modules: USER_CONTROL_MODULES.map((item) => item.key), strategy: input.strategy,
        duration: input.duration, operator: operatorOf(input), batchId: input.batchId,
        before, note, status: 'failed', failedModule: state.failureModule,
        errorMessage: `模块 ${state.failureModule} 写入失败，六个模块均未更新`, createdAt: input.now
      }, ...state.operationLogs],
      lastError: `模块 ${state.failureModule} 写入失败，六个模块均未更新`
    }
  }

  const before = Object.fromEntries(Object.entries(state.rules[userId] || {}).map(([key, rule]) => [key, { ...rule }]))
  const rules = Object.fromEntries(USER_CONTROL_MODULES.map((module) => [module.key, {
    id: `${input.batchId}-${module.key}`, batchId: input.batchId, userId, moduleKey: module.key,
    family: module.family, value: strategyValue(input.strategy, module.family), strategy: input.strategy,
    duration: input.duration, status: 'active', source: 'global', note, updatedAt: input.now,
    consumedAt: '', supersededAt: '', cancelledAt: ''
  }]))

  return {
    ...state,
    rules: { ...state.rules, [userId]: rules },
    ruleHistory: [...supersedeRules(before, input.now), ...(state.ruleHistory || [])],
    operationLogs: [{ id: `op-${input.batchId}`, userId, scope: 'global', action: 'apply',
      modules: USER_CONTROL_MODULES.map((item) => item.key), strategy: input.strategy,
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
  if (!validValues[module.family].includes(input.value)) throw new TypeError('value does not match module family')
  if (!['once', 'permanent'].includes(input.duration)) throw new TypeError('duration must be once or permanent')
  const userRules = cloneRules(state, userId)
  const before = userRules[module.key] || null
  userRules[module.key] = { id: input.ruleId, batchId: '', userId, moduleKey: module.key,
    family: module.family, value: input.value, strategy: '', duration: input.duration,
    status: 'active', source: 'module', note, updatedAt: input.now,
    consumedAt: '', supersededAt: '', cancelledAt: '' }
  return {
    ...state,
    rules: { ...state.rules, [userId]: userRules },
    ruleHistory: [...supersedeRules(before ? { [module.key]: before } : {}, input.now), ...(state.ruleHistory || [])],
    operationLogs: [{
    id: `op-${input.ruleId}`, userId, scope: 'module', action: 'apply', modules: [module.key],
    duration: input.duration, operator: operatorOf(input), batchId: input.batchId || input.ruleId,
    before, after: userRules[module.key], note, status: 'success', createdAt: input.now
    }, ...state.operationLogs],
    lastError: ''
  }
}

export function cancelUnifiedControl(state, input) {
  const userId = requireText(input.userId, 'userId')
  const note = requireText(input.note, 'note')
  const before = cloneRules(state, userId)
  const cancelled = Object.fromEntries(Object.entries(before).map(([key, rule]) => [key,
    ['active', 'processing'].includes(rule.status) ? { ...rule, status: 'cancelled', cancelledAt: input.now } : rule
  ]))
  return { ...state, rules: { ...state.rules, [userId]: cancelled }, operationLogs: [{
    id: input.operationId, userId, scope: 'global', action: 'cancel',
    modules: USER_CONTROL_MODULES.map((item) => item.key), duration: rulesDuration(before),
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
      source: rule.source, value: rule.value, duration: rule.duration, businessId: input.businessId,
      beforeValue: input.beforeValue, afterValue: input.afterValue,
      status: 'failed', errorMessage: input.errorMessage || '执行失败', createdAt: input.now
    }, ...state.executionLogs] }
  }
  if (input.afterValue !== rule.value) return state
  userRules[input.moduleKey] = { ...rule, status: 'consumed', consumedAt: input.now }
  return { ...state, rules: { ...state.rules, [userId]: userRules }, executionLogs: [{
    id: `exec-${input.businessId}`, userId, moduleKey: input.moduleKey, ruleId: rule.id,
    source: rule.source, value: rule.value, duration: rule.duration, businessId: input.businessId,
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
  const rules = Object.values(state.rules[String(userId)] || {})
  const effective = rules.filter((rule) => ['active', 'processing'].includes(rule.status))
  const consumed = rules.filter((rule) => rule.status === 'consumed')
  if (!effective.length) return { kind: 'none', label: '未设置', total: 6 }
  const globalBatch = dominantUnifiedBatch(rules)
  const aligned = rules.filter((rule) => rule.batchId === globalBatch
    && ['active', 'processing', 'consumed'].includes(rule.status)).length
  const divergent = getUserControlDivergenceKeys(state.rules[String(userId)] || {}).length > 0
  if (divergent) return { kind: 'divergent', aligned, total: 6, label: `${aligned}/6 存在差异` }
  if (consumed.length) return { kind: 'progress', consumed: consumed.length, total: 6, label: `已执行 ${consumed.length}/6` }
  return { kind: 'synced', aligned: 6, total: 6, label: '6/6 已同步' }
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
      ? '正向控制'
      : globalRule?.strategy === 'negative'
        ? '负向控制'
        : '模块独立设置'

  return {
    hasCurrent: true,
    controlLabel,
    durationLabel: durations.length > 1 ? '混合' : durations[0] === 'permanent' ? '永久' : '一次性'
  }
}

export function getUnifiedControlCancelItems(rules = {}) {
  const effectiveRules = getEffectiveUserControlRules(rules)
  return USER_CONTROL_MODULES
    .filter((module) => effectiveRules[module.key])
    .map((module) => ({
      moduleKey: module.key,
      moduleLabel: module.label,
      value: effectiveRules[module.key].value,
      duration: effectiveRules[module.key].duration,
      status: effectiveRules[module.key].status
    }))
}

export function getUserControlDivergenceKeys(rules = {}) {
  const unifiedBatch = dominantUnifiedBatch(rules)

  return USER_CONTROL_MODULES
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
  return rows.filter((row) => (!query || `${row.userId} ${row.username} ${row.email}`.toLowerCase().includes(query))
    && (!filters.value || row.rule?.value === filters.value)
    && (!filters.status || row.rule?.status === filters.status)
    && (!filters.source || row.rule?.source === filters.source))
}
