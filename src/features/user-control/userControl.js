export const USER_CONTROL_MODULES = Object.freeze([
  { key: 'delivery', label: '交割', family: 'trade', actionLabel: '用户控盘' },
  { key: 'perpetual', label: '永续', family: 'trade', actionLabel: '用户控盘' },
  { key: 'spot', label: '现货', family: 'trade', actionLabel: '用户控盘' },
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

export const createUserControlState = () => ({ rules: {}, operationLogs: [], executionLogs: [], failureModule: '' })

export function applyUnifiedControl(state, input) {
  const userId = requireText(input.userId, 'userId')
  const note = requireText(input.note, 'note')
  if (!['once', 'permanent'].includes(input.duration)) throw new TypeError('duration must be once or permanent')
  if (state.failureModule) return { ...state, lastError: `模块 ${state.failureModule} 写入失败，六个模块均未更新` }

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
    operationLogs: [{ id: `op-${input.batchId}`, userId, scope: 'global', action: 'apply',
      modules: USER_CONTROL_MODULES.map((item) => item.key), strategy: input.strategy,
      duration: input.duration, before, note, createdAt: input.now }, ...state.operationLogs],
    lastError: ''
  }
}

const moduleMeta = (moduleKey) => {
  const module = USER_CONTROL_MODULES.find((item) => item.key === moduleKey)
  if (!module) throw new TypeError('unknown moduleKey')
  return module
}

const validValues = { trade: ['profit', 'loss'], finance: ['highYield', 'lowYield'] }
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
  return { ...state, rules: { ...state.rules, [userId]: userRules }, operationLogs: [{
    id: `op-${input.ruleId}`, userId, scope: 'module', action: 'apply', modules: [module.key],
    before, after: userRules[module.key], note, createdAt: input.now
  }, ...state.operationLogs], lastError: '' }
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
    modules: USER_CONTROL_MODULES.map((item) => item.key), before, note, createdAt: input.now
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
    before, note, createdAt: input.now
  }, ...state.operationLogs] }
}

export function consumeModuleControl(state, input) {
  const userId = requireText(input.userId, 'userId')
  const userRules = cloneRules(state, userId)
  const rule = userRules[input.moduleKey]
  if (!rule || rule.status !== 'active' || rule.duration !== 'once') return state
  userRules[input.moduleKey] = { ...rule, status: 'consumed', consumedAt: input.now }
  return { ...state, rules: { ...state.rules, [userId]: userRules }, executionLogs: [{
    id: `exec-${input.businessId}`, userId, moduleKey: input.moduleKey, ruleId: rule.id,
    source: rule.source, duration: rule.duration, businessId: input.businessId,
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
